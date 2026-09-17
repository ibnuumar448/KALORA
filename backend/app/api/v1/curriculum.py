from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_user, RequireRole
from app.models.user import User
from app.schemas.curriculum import SubjectCreate, SubjectResponse, ResourceCreate, ResourceSlotResponse
from app.services.curriculum import CurriculumService

router = APIRouter(prefix="/curriculum", tags=["curriculum"])

@router.get("/programmes")
def list_programmes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.curriculum import Programme
    return db.query(Programme).all()

@router.get("/cohorts")
def list_cohorts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.organization import Cohort
    return db.query(Cohort).all()

@router.get("/subjects", response_model=List[SubjectResponse])
def list_all_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.curriculum import Subject
    return db.query(Subject).order_by(Subject.order_index).all()

@router.get("/programmes/{programme_id}/subjects", response_model=List[SubjectResponse])
def list_subjects(
    programme_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = CurriculumService(db)
    return service.list_subjects_for_programme(programme_id)

@router.get("/subjects/{subject_id}/tree", response_model=SubjectResponse)
def get_subject_curriculum(
    subject_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = CurriculumService(db)
    return service.get_subject_tree(subject_id)

@router.post("/admin/subjects", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(
    subject_in: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin", "academic_coordinator"]))
):
    service = CurriculumService(db)
    return service.create_subject(subject_in)

@router.post("/admin/resource-slots/{slot_id}/swap", response_model=ResourceSlotResponse)
def swap_resource(
    slot_id: UUID,
    resource_in: ResourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin", "academic_coordinator"]))
):
    service = CurriculumService(db)
    return service.swap_resource(slot_id, resource_in, current_user.id)

from pydantic import BaseModel

class YouTubeResourceRequest(BaseModel):
    youtube_url: str

@router.post("/admin/topics/{topic_id}/youtube-resource")
def add_youtube_resource_to_topic(
    topic_id: UUID,
    request: YouTubeResourceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin"]))
):
    service = CurriculumService(db)
    return service.add_youtube_resource_to_topic(topic_id, request.youtube_url, current_user.id)
