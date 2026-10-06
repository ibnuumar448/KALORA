from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_user, RequireRole
from app.models.user import User
from app.schemas.mentorship import (
    MentorNoteCreate, MentorNoteResponse, AssignedStudentResponse,
    SupportRequestResponse
)
from app.services.mentorship import MentorshipService

router = APIRouter(prefix="/mentors", tags=["mentorship"])

@router.get("/me/students", response_model=List[AssignedStudentResponse])
def get_my_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["mentor"]))
):
    service = MentorshipService(db)
    return service.get_assigned_students(current_user.id)

@router.post("/me/students/{student_id}/notes", response_model=MentorNoteResponse, status_code=status.HTTP_201_CREATED)
def log_student_intervention(
    student_id: UUID,
    note_in: MentorNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["mentor"]))
):
    service = MentorshipService(db)
    return service.log_intervention(current_user.id, student_id, note_in)

@router.get("/me/support-requests", response_model=List[SupportRequestResponse])
def get_my_support_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["mentor"]))
):
    service = MentorshipService(db)
    return service.get_support_requests(current_user.id, is_mentor=True)
