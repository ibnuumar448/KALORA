from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.admission import AdmissionNumberLookupResponse
from app.services.admission import AdmissionService
from app.services.mentorship import MentorshipService
from app.api.deps import get_current_user, RequireRole
from app.models.user import User
from app.schemas.mentorship import StudentMentorshipHistoryResponse

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

