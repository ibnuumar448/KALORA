from sqlalchemy.orm import Session
from fastapi import HTTPException
from uuid import UUID
from app.models.curriculum import Subject, Module, Topic, Subtopic, ResourceSlot, Resource
from app.schemas.curriculum import SubjectCreate, ResourceCreate

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
