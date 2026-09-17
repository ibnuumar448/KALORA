from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from uuid import UUID
import os
from datetime import datetime
from app.models.admission import Application, ApplicationStatusHistory, ApplicationStatus, AdmissionNumberConfig, AdmissionNumber, DocumentType, ApplicationDocument, OLevelResult, OLevelSubjectResult, OLevelExamType
from app.schemas.admission import ApplicationCreate, ApplicationUpdate, ApplicationSubmit, ApplicationStatusUpdate
from sqlalchemy import func
from app.services.storage import StorageService

class AdmissionService:
    def __init__(self, db: Session):
        self.db = db

    def create_or_update_draft(self, user_id: UUID, cohort_id: UUID, update_data: ApplicationUpdate) -> Application:
        # Check if active application already exists
        app = self.db.query(Application).filter(
            Application.user_id == user_id, 
            Application.cohort_id == cohort_id
        ).first()

        if app:
            if app.status not in [ApplicationStatus.draft, ApplicationStatus.applied, ApplicationStatus.submitted]:
                raise HTTPException(status_code=400, detail="Application cannot be modified at this stage")
        else:
            app = Application(
                user_id=user_id,
                cohort_id=cohort_id,
                status=ApplicationStatus.draft
            )
            self.db.add(app)
            self.db.flush()

        # Update fields
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(app, key, value)

        self.db.commit()
        self.db.refresh(app)
        return app

    async def upload_document(self, application_id: UUID, user_id: UUID, doc_type: DocumentType, file: UploadFile) -> ApplicationDocument:
        app = self.get_application(application_id)
        if app.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        if app.status not in [ApplicationStatus.draft, ApplicationStatus.applied, ApplicationStatus.submitted]:
             raise HTTPException(status_code=400, detail="Cannot upload documents at this stage")

        # Validate file size (e.g. 5MB)
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
        if file_size > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large (max 5MB)")

        # Validate mime type
        valid_mimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
        if file.content_type not in valid_mimes:
            raise HTTPException(status_code=400, detail="Invalid file type")

        # Specific validations
        if doc_type == DocumentType.PROFILE_PICTURE and file.content_type == 'application/pdf':
            raise HTTPException(status_code=400, detail="Profile picture cannot be a PDF")

        # Remove old document of same type if exists
        existing_doc = self.db.query(ApplicationDocument).filter(
            ApplicationDocument.application_id == application_id,
            ApplicationDocument.document_type == doc_type
        ).first()
        if existing_doc:
            self.db.delete(existing_doc)
            self.db.flush()

        file_url = await StorageService.save_file(file, directory=f"applications/{application_id}")

        new_doc = ApplicationDocument(
            application_id=application_id,
            document_type=doc_type,
            file_url=file_url,
            original_filename=file.filename,
            mime_type=file.content_type,
            file_size=file_size
        )
        self.db.add(new_doc)
        self.db.commit()
        self.db.refresh(new_doc)
        return new_doc

    def submit_application(self, application_id: UUID, user_id: UUID, submit_data: ApplicationSubmit) -> Application:
        app = self.get_application(application_id)
        if app.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
            
        if app.status not in [ApplicationStatus.draft, ApplicationStatus.applied, ApplicationStatus.submitted]:
            raise HTTPException(status_code=400, detail="Application cannot be submitted at this stage")

        # Validation: Profile Picture
        profile_pic = self.db.query(ApplicationDocument).filter(
            ApplicationDocument.application_id == application_id,
            ApplicationDocument.document_type == DocumentType.PROFILE_PICTURE
        ).first()
        if not profile_pic:
            raise HTTPException(status_code=400, detail="Profile picture is required")

        # Validation: OLevel
        if app.academic_status == 'secondary_graduate':
            olevel_doc = self.db.query(ApplicationDocument).filter(
                ApplicationDocument.application_id == application_id,
                ApplicationDocument.document_type == DocumentType.OLEVEL_RESULT
            ).first()
            if not olevel_doc:
                raise HTTPException(status_code=400, detail="OLevel result document is required for graduates")
            
            if not submit_data.olevel_results:
                raise HTTPException(status_code=400, detail="OLevel details are required for graduates")

        # Save OLevel details if provided
        if submit_data.olevel_results:
            # delete existing if any
            self.db.query(OLevelResult).filter(OLevelResult.application_id == application_id).delete()
            self.db.flush()

            ol_data = submit_data.olevel_results
            new_ol = OLevelResult(
                application_id=application_id,
                examination_type=ol_data.examination_type,
                examination_year=ol_data.examination_year,
                examination_number=ol_data.examination_number,
                candidate_number=ol_data.candidate_number
            )
            self.db.add(new_ol)
            self.db.flush()

            for subj in ol_data.subjects:
                new_subj = OLevelSubjectResult(
                    olevel_result_id=new_ol.id,
                    subject=subj.subject,
                    grade=subj.grade
                )
                self.db.add(new_subj)

        # Generate Application Number if not already generated
        if not app.application_number:
            year_str = str(datetime.now().year)
            # Find max seq for year
            max_app = self.db.query(Application).filter(Application.application_number.like(f"KAL-APP-{year_str}-%")).order_by(Application.application_number.desc()).first()
            if max_app and max_app.application_number:
                try:
                    seq = int(max_app.application_number.split('-')[-1]) + 1
                except:
                    seq = 1
            else:
                seq = 1
            
            app.application_number = f"KAL-APP-{year_str}-{seq:04d}"
        app.status = ApplicationStatus.submitted

        self.db.commit()
        self.db.refresh(app)

        # Log history
        history = ApplicationStatusHistory(
            application_id=app.id,
            status=ApplicationStatus.submitted,
            notes="Application submitted"
        )
        self.db.add(history)
        self.db.commit()

        return app

    def get_application(self, app_id: UUID) -> Application:
        app = self.db.query(Application).filter(Application.id == app_id).first()
        if not app:
            raise HTTPException(status_code=404, detail="Application not found")
        return app
        
    def get_user_application(self, user_id: UUID, cohort_id: UUID) -> Application:
        return self.db.query(Application).filter(
            Application.user_id == user_id, 
            Application.cohort_id == cohort_id
        ).first()

    def list_all_applications(self):
        return self.db.query(Application).order_by(Application.created_at.desc()).all()

    def update_application_status(self, app_id: UUID, update_data: ApplicationStatusUpdate, admin_id: UUID) -> Application:
        app = self.get_application(app_id)
        
        if app.status == update_data.status:
            return app

        app.status = update_data.status
        self.db.commit()
        self.db.refresh(app)

        history = ApplicationStatusHistory(
            application_id=app.id,
            status=update_data.status,
            notes=update_data.notes,
            created_by=admin_id
        )
        self.db.add(history)
        self.db.commit()

        # Generate admission number on acceptance, NOT trigging assessment
        if update_data.status == ApplicationStatus.accepted:
            self._generate_admission_number(app)

        return app

    def _generate_admission_number(self, application: Application):
        # Check if one already exists
        existing = self.db.query(AdmissionNumber).filter(
            AdmissionNumber.student_id == application.user_id,
            AdmissionNumber.cohort_id == application.cohort_id
        ).first()
        if existing:
            return

        # Fetch config for cohort, fallback to global
        config = self.db.query(AdmissionNumberConfig).filter(AdmissionNumberConfig.cohort_id == application.cohort_id).first()
        if not config:
            config = self.db.query(AdmissionNumberConfig).filter(AdmissionNumberConfig.cohort_id == None).first()

        if not config:
            # Create a default fallback config if none exists
            config = AdmissionNumberConfig(cohort_id=None)
            self.db.add(config)
            self.db.commit()
            self.db.refresh(config)

        # Find max sequence value based on reset_scope
        query = self.db.query(func.max(AdmissionNumber.sequence_val))
        if config.reset_scope == "cohort":
            query = query.filter(AdmissionNumber.cohort_id == application.cohort_id)
        
        max_seq = query.scalar()
        next_seq = (max_seq or 0) + 1

        # Format number: PREFIX/YEAR/0001
        padded_seq = str(next_seq).zfill(config.sequence_padding)
        admin_num_str = f"{config.prefix}{config.separator}{config.year_code}{config.separator}{padded_seq}"

        adm_num = AdmissionNumber(
            student_id=application.user_id,
            cohort_id=application.cohort_id,
            admission_number=admin_num_str,
            sequence_val=next_seq
        )
        self.db.add(adm_num)
        self.db.commit()

    def lookup_admission_number(self, number: str):
        from app.models.user import User
        from app.models.organization import Cohort
        
        adm_num = self.db.query(AdmissionNumber).filter(AdmissionNumber.admission_number == number).first()
        if not adm_num:
            raise HTTPException(status_code=404, detail="Admission number not found")

        student = self.db.query(User).filter(User.id == adm_num.student_id).first()
        cohort = self.db.query(Cohort).filter(Cohort.id == adm_num.cohort_id).first()
        
        # Verify they are accepted
        app = self.db.query(Application).filter(
            Application.user_id == adm_num.student_id,
            Application.cohort_id == adm_num.cohort_id
        ).first()

        return {
            "admission_number": adm_num.admission_number,
            "student_name": student.full_name,
            "cohort_name": cohort.name,
            "status": app.status.value if app else "unknown"
        }
