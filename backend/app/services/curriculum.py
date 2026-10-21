from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile
from uuid import UUID
import os
from app.models.curriculum import Subject, Module, Topic, Subtopic, ResourceSlot, Resource, CurriculumDocument
from app.schemas.curriculum import SubjectCreate, ResourceCreate
from app.services.storage import StorageService

DOCUMENT_SECTIONS = {"textbooks", "jamb_past_questions"}

class CurriculumService:
    def __init__(self, db: Session):
        self.db = db

    def get_subject_tree(self, subject_id: UUID) -> Subject:
        subject = self.db.query(Subject).filter(Subject.id == subject_id).first()
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        return subject

    def list_subjects_for_programme(self, programme_id: UUID):
        return self.db.query(Subject).filter(
            Subject.programme_id == programme_id,
            Subject.is_active == True
        ).order_by(Subject.order_index).all()

    def create_subject(self, subject_in: SubjectCreate) -> Subject:
        subject = Subject(
            programme_id=subject_in.programme_id,
            name=subject_in.name,
            description=subject_in.description,
            order_index=subject_in.order_index
        )
        self.db.add(subject)
        self.db.commit()
        self.db.refresh(subject)
        
        # Implement nested creation for rapid syllabus building
        if subject_in.modules:
            for mod_in in subject_in.modules:
                module = Module(subject_id=subject.id, name=mod_in.name, description=mod_in.description, order_index=mod_in.order_index)
                self.db.add(module)
                self.db.flush()
                if mod_in.topics:
                    for top_in in mod_in.topics:
                        topic = Topic(module_id=module.id, name=top_in.name, description=top_in.description, order_index=top_in.order_index)
                        self.db.add(topic)
                        self.db.flush()
                        if top_in.subtopics:
                            for sub_in in top_in.subtopics:
                                subtopic = Subtopic(topic_id=topic.id, name=sub_in.name, order_index=sub_in.order_index)
                                self.db.add(subtopic)
                                self.db.flush()
                                if sub_in.resource_slots:
                                    for slot_in in sub_in.resource_slots:
                                        slot = ResourceSlot(subtopic_id=subtopic.id, name=slot_in.name, order_index=slot_in.order_index)
                                        self.db.add(slot)
                                        self.db.flush()
                                        res = Resource(
                                            slot_id=slot.id, 
                                            youtube_video_id=slot_in.resource.youtube_video_id,
                                            title=slot_in.resource.title,
                                            version=1
                                        )
                                        self.db.add(res)
                                        self.db.flush()
                                        slot.active_resource_id = res.id
                                        self.db.flush()

        self.db.commit()
        self.db.refresh(subject)
        return subject

    def swap_resource(self, slot_id: UUID, new_resource_data: ResourceCreate, admin_id: UUID) -> ResourceSlot:
        slot = self.db.query(ResourceSlot).filter(ResourceSlot.id == slot_id).first()
        if not slot:
            raise HTTPException(status_code=404, detail="Resource slot not found")

        # Determine next version
        current_active = slot.active_resource
        next_version = current_active.version + 1 if current_active else 1

        new_resource = Resource(
            slot_id=slot.id,
            youtube_video_id=new_resource_data.youtube_video_id,
            title=new_resource_data.title,
            description=new_resource_data.description,
            duration_seconds=new_resource_data.duration_seconds,
            thumbnail_url=new_resource_data.thumbnail_url,
            version=next_version,
            created_by=admin_id
        )
        
        self.db.add(new_resource)
        self.db.commit()
        self.db.refresh(new_resource)

        # Update slot to point to new active resource
        slot.active_resource_id = new_resource.id
        self.db.commit()
        self.db.refresh(slot)

        return slot

    import requests
    import re
    
    def add_youtube_resource_to_topic(self, topic_id: UUID, youtube_url: str, admin_id: UUID):
        import urllib.parse
        
        # Extract ID
        video_id = None
        if "youtu.be/" in youtube_url:
            video_id = youtube_url.split("youtu.be/")[1].split("?")[0]
        elif "youtube.com/watch" in youtube_url:
            parsed = urllib.parse.urlparse(youtube_url)
            qs = urllib.parse.parse_qs(parsed.query)
            video_id = qs.get("v", [None])[0]
            
        if not video_id:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")
            
        # Call oEmbed
        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        try:
            import requests
            resp = requests.get(oembed_url, timeout=5)
            resp.raise_for_status()
            data = resp.json()
            title = data.get("title", f"Video {video_id}")
            thumbnail_url = data.get("thumbnail_url", f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg")
        except Exception:
            title = f"Video {video_id}"
            thumbnail_url = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
            
        # Ensure subtopic exists for this topic
        subtopic = self.db.query(Subtopic).filter(Subtopic.topic_id == topic_id).first()
        if not subtopic:
            subtopic = Subtopic(topic_id=topic_id, name="General Resources", order_index=1)
            self.db.add(subtopic)
            self.db.commit()
            self.db.refresh(subtopic)
            
        # Create Resource Slot
        slot = ResourceSlot(subtopic_id=subtopic.id, name=title, order_index=1)
        self.db.add(slot)
        self.db.commit()
        self.db.refresh(slot)
        
        # Create Resource
        resource = Resource(
            slot_id=slot.id,
            youtube_video_id=video_id,
            title=title,
            thumbnail_url=thumbnail_url,
            version=1,
            created_by=admin_id
        )
        self.db.add(resource)
        self.db.commit()
        self.db.refresh(resource)
        
        # Activate resource
        slot.active_resource_id = resource.id
        self.db.commit()
        
        return {"message": "Success", "title": title, "thumbnail_url": thumbnail_url}

    def delete_resource_slot(self, slot_id: UUID):
        slot = self.db.query(ResourceSlot).filter(ResourceSlot.id == slot_id).first()
        if not slot:
            raise HTTPException(status_code=404, detail="Resource slot not found")

        # Unset active_resource_id first to break the circular foreign key dependency
        slot.active_resource_id = None
        self.db.commit()

        # Delete all resources tied to this slot
        self.db.query(Resource).filter(Resource.slot_id == slot_id).delete(synchronize_session=False)

        subtopic_id = slot.subtopic_id

        # Delete the resource slot itself
        self.db.delete(slot)
        self.db.commit()

        # Clean up empty auto-generated 'General Resources' subtopic if no slots remain
        remaining_slots = self.db.query(ResourceSlot).filter(ResourceSlot.subtopic_id == subtopic_id).count()
        if remaining_slots == 0:
            subtopic = self.db.query(Subtopic).filter(Subtopic.id == subtopic_id).first()
            if subtopic and subtopic.name == "General Resources":
                self.db.delete(subtopic)
                self.db.commit()

        return {"message": "Resource deleted successfully"}

    async def upload_document(
        self,
        subject_id: UUID,
        section: str,
        file: UploadFile,
        title: str | None,
        admin_id: UUID,
    ) -> CurriculumDocument:
        if section not in DOCUMENT_SECTIONS:
            raise HTTPException(status_code=400, detail="Invalid curriculum document section")

        filename = os.path.basename((file.filename or "").replace("\\", "/"))
        if not filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        if len(filename) > 255:
            raise HTTPException(status_code=400, detail="The uploaded filename is too long")

        header = await file.read(5)
        await file.seek(0)
        if header != b"%PDF-":
            raise HTTPException(status_code=400, detail="The uploaded file is not a valid PDF")

        subject = self.db.query(Subject).filter(Subject.id == subject_id).first()
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")

        document_title = title.strip() if title and title.strip() else os.path.splitext(filename)[0]
        if not document_title or len(document_title) > 255:
            raise HTTPException(status_code=400, detail="Title must be between 1 and 255 characters")

        file_key = await StorageService.save_file(file, directory=f"curriculum/{subject_id}/{section}")
        document = CurriculumDocument(
            subject_id=subject_id,
            section=section,
            title=document_title,
            original_filename=filename,
            file_key=file_key,
            created_by=admin_id,
        )
        try:
            self.db.add(document)
            self.db.commit()
            self.db.refresh(document)
        except Exception:
            self.db.rollback()
            StorageService.delete_file(file_key)
            raise
        return document

    def update_document_title(self, document_id: UUID, title: str) -> CurriculumDocument:
        document = self.db.query(CurriculumDocument).filter(CurriculumDocument.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Curriculum document not found")
        clean_title = title.strip()
        if not clean_title or len(clean_title) > 255:
            raise HTTPException(status_code=400, detail="Title must be between 1 and 255 characters")
        document.title = clean_title
        self.db.commit()
        self.db.refresh(document)
        return document

    def delete_document(self, document_id: UUID) -> None:
        document = self.db.query(CurriculumDocument).filter(CurriculumDocument.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Curriculum document not found")
        file_key = document.file_key
        self.db.delete(document)
        self.db.commit()
        StorageService.delete_file(file_key)
