from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_user, RequireRole
from app.models.user import User
from app.schemas.discipline import (
    StudentDisciplinaryStatus, DefaultResponse, WarningResponse,
    LogDefaultRequest, LogWarningRequest, LogSuspensionRequest
)
from app.schemas.incentive import StudentIncentivesSummary, ScholarshipResponse, CertificateResponse
from app.services.discipline import DisciplineService, IncentiveService

router = APIRouter(prefix="", tags=["discipline"])

# ==================== Discipline Endpoints ====================

@router.get("/students/{student_id}/discipline")
def get_student_discipline(
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin", "mentor", "academic_coordinator"]))
):
    """Get disciplinary status for a student"""
    # For now, use a default cohort id. In a real app we'd query the student's cohort.
    cohort_id = UUID('00000000-0000-0000-0000-000000000000')
    
    service = DisciplineService(db)
    return service.get_student_disciplinary_status(student_id, cohort_id)

@router.post("/students/{student_id}/discipline/defaults", response_model=DefaultResponse, status_code=status.HTTP_201_CREATED)
def log_student_default(
    student_id: UUID,
    request: LogDefaultRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin", "mentor"]))
):
    """Log a default/infraction for a student"""
    cohort_id = UUID('00000000-0000-0000-0000-000000000000')
    
    service = DisciplineService(db)
    return service.log_default(student_id, cohort_id, request)

@router.post("/students/{student_id}/discipline/warnings", response_model=WarningResponse, status_code=status.HTTP_201_CREATED)
def log_student_warning(
    student_id: UUID,
    request: LogWarningRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin"]))
):
    """Issue a warning to a student"""
    cohort_id = UUID('00000000-0000-0000-0000-000000000000')
    
    service = DisciplineService(db)
    return service.log_warning(student_id, cohort_id, request)

@router.post("/students/{student_id}/discipline/suspensions", status_code=status.HTTP_201_CREATED)
def log_student_suspension(
    student_id: UUID,
    request: LogSuspensionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin"]))
):
    """Record a suspension for a student"""
    cohort_id = UUID('00000000-0000-0000-0000-000000000000')
    
    service = DisciplineService(db)
    return service.log_suspension(student_id, cohort_id, request)

@router.put("/suspensions/{suspension_id}/end")
def end_suspension(
    suspension_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin"]))
):
    """End an active suspension"""
    service = DisciplineService(db)
    return service.end_suspension(suspension_id)

# ==================== Incentive Endpoints ====================

@router.get("/students/{student_id}/incentives", response_model=StudentIncentivesSummary)
def get_student_incentives(
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["student", "admin", "super_admin", "mentor"]))
):
    """Get incentives summary for a student"""
    # Students can only see their own incentives
    if any(r.name == 'student' for r in current_user.roles) and str(current_user.id) != str(student_id):
        raise PermissionError("Cannot view other student's incentives")
    
    service = IncentiveService(db)
    return service.get_student_incentives_summary(student_id)

@router.post("/students/{student_id}/scholarships", response_model=ScholarshipResponse, status_code=status.HTTP_201_CREATED)
def award_scholarship(
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin"]))
):
    """Award a scholarship to a student based on eligibility"""
    service = IncentiveService(db)
    return service.award_scholarship(student_id)

@router.post("/students/{student_id}/certificates", response_model=CertificateResponse, status_code=status.HTTP_201_CREATED)
def issue_certificate(
    student_id: UUID,
    certificate_type: str,
    description: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin", "mentor"]))
):
    """Issue a certificate to a student"""
    service = IncentiveService(db)
    return service.issue_certificate(student_id, certificate_type, description, current_user.id)

@router.post("/students/{student_id}/incentives", status_code=status.HTTP_201_CREATED)
def award_incentive(
    student_id: UUID,
    incentive_type: str,
    points: int,
    description: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin", "mentor"]))
):
    """Award incentive points to a student"""
    service = IncentiveService(db)
    return service.award_incentive(student_id, incentive_type, points, description)
