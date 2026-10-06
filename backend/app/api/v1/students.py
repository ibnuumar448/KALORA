from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.admission import AdmissionNumberLookupResponse
from app.services.admission import AdmissionService
from app.services.mentorship import MentorshipService
from app.api.deps import get_current_user, RequireRole
from app.models.user import User
from app.schemas.mentorship import (
    StudentMentorshipHistoryResponse, SupportRequestCreate, SupportRequestResponse
)
from typing import List

router = APIRouter(prefix="/students", tags=["students"])

@router.get("/lookup", response_model=AdmissionNumberLookupResponse)
def lookup_admission_number(
    admission_number: str,
    db: Session = Depends(get_db)
):
    """
    Publicly accessible endpoint to verify an admission number.
    Returns basic student info without requiring authentication.
    """
    service = AdmissionService(db)
    return service.lookup_admission_number(admission_number)

@router.get("/me/mentor", response_model=StudentMentorshipHistoryResponse)
def get_my_mentor(
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["student"]))
):
    """
    Get current mentor and mentorship history for the logged-in student.
    """
    service = MentorshipService(db)
    return service.get_student_mentorship_history(current_user.id)

@router.post("/me/support-requests", response_model=SupportRequestResponse)
def create_support_request(
    request: SupportRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["student"]))
):
    service = MentorshipService(db)
    return service.create_support_request(current_user.id, request.category, request.message)

@router.get("/me/support-requests", response_model=List[SupportRequestResponse])
def get_my_support_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["student"]))
):
    service = MentorshipService(db)
    return service.get_support_requests(current_user.id, is_mentor=False)
