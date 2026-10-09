from fastapi import APIRouter, Depends, status, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from uuid import UUID
from app.core.database import get_db
from app.api.deps import get_current_user, RequireRole
from app.models.user import User
from app.models.admission import DocumentType, Application
from app.schemas.admission import ApplicationCreate, ApplicationUpdate, ApplicationSubmit, ApplicationResponse, ApplicationStatusUpdate, ApplicationDocumentSchema
from app.services.admission import AdmissionService
from typing import List
from fastapi.responses import FileResponse
import os
from app.services.storage import StorageService

router = APIRouter(prefix="/applications", tags=["applications"])

@router.post("/draft", response_model=ApplicationResponse, status_code=status.HTTP_200_OK)
def save_draft(
    cohort_id: UUID,
    update_data: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = AdmissionService(db)
    return service.create_or_update_draft(current_user.id, cohort_id, update_data)

@router.post("/{id}/documents", response_model=ApplicationDocumentSchema)
async def upload_document(
    id: UUID,
    document_type: DocumentType = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = AdmissionService(db)
    return await service.upload_document(id, current_user.id, document_type, file)

@router.post("/{id}/submit", response_model=ApplicationResponse)
def submit_application(
    id: UUID,
    submit_data: ApplicationSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = AdmissionService(db)
    return service.submit_application(id, current_user.id, submit_data)

@router.get("/me", response_model=List[ApplicationResponse])
def get_my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = AdmissionService(db)
    apps = db.query(Application).filter(Application.user_id == current_user.id).order_by(Application.created_at.desc()).all()
    from app.models.admission import AdmissionNumber
    results = []
    for app in apps:
        admission = db.query(AdmissionNumber).filter(
            AdmissionNumber.student_id == app.user_id,
            AdmissionNumber.cohort_id == app.cohort_id
        ).first()
        
        # Using model_validate allows Pydantic to trigger the lazy-loads
        app_model = ApplicationResponse.model_validate(app)
        app_model.admission_number = admission.admission_number if admission else app.application_number
        results.append(app_model)
    return results

@router.get("/me/{cohort_id}", response_model=ApplicationResponse)
def get_my_application(
    cohort_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = AdmissionService(db)
    app = service.get_user_application(current_user.id, cohort_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app

@router.get("", response_model=List[ApplicationResponse])
def list_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin"]))
):
    service = AdmissionService(db)
    apps = service.list_all_applications()
    from app.models.admission import AdmissionNumber
    results = []
    for app in apps:
        admission = db.query(AdmissionNumber).filter(
            AdmissionNumber.student_id == app.user_id,
            AdmissionNumber.cohort_id == app.cohort_id
        ).first()
        
        app_model = ApplicationResponse.model_validate(app)
        app_model.admission_number = admission.admission_number if admission else app.application_number
        results.append(app_model)
    return results

@router.get("/documents/{file_key:path}")
def serve_document(
    file_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Here we would verify if the user is the owner of the document or an admin
    # Since file_key might just be applications/{app_id}/{uuid}.pdf we can extract app_id
    parts = file_key.split('/')
    if len(parts) >= 2 and parts[0] == 'applications':
        try:
            app_id = UUID(parts[1])
            service = AdmissionService(db)
            app = service.get_application(app_id)
            is_admin = any(role.name in ["admin", "super_admin"] for role in current_user.roles)
            if app.user_id != current_user.id and not is_admin:
                raise HTTPException(status_code=403, detail="Not authorized")
        except ValueError:
            pass # Invalid UUID

    file_path = StorageService.get_file_path(file_key)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

@router.get("/{id}", response_model=ApplicationResponse)
def get_application_status(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = AdmissionService(db)
    app = service.get_application(id)
    
    # Check if the user is the owner or an admin
    is_admin = any(role.name in ["admin", "super_admin"] for role in current_user.roles)
    if app.user_id != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to view this application")
        
    return app

@router.patch("/{id}/status", response_model=ApplicationResponse)
def update_application_status(
    id: UUID,
    update_data: ApplicationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin"]))
):
    service = AdmissionService(db)
    return service.update_application_status(id, update_data, current_user.id)
    return service.update_application_status(id, update_data, current_user.id)
