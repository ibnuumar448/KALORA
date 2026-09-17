from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_user, RequireRole
from app.models.user import User
from app.services.mentorship import MentorshipService
from app.schemas.mentorship import (
    MentorshipStatsResponse, MentorListResponse, AssignedStudentResponse,
    UnassignedStudentResponse, AssignmentHistoryResponse, AssignStudentsRequest,
    ReassignStudentRequest, EndAssignmentRequest
)

router = APIRouter(prefix="/mentorship", tags=["mentorship"])

@router.get("/stats", response_model=MentorshipStatsResponse)
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    service = MentorshipService(db)
    return service.get_stats()

@router.get("/mentors", response_model=List[MentorListResponse])
def get_mentors(db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    service = MentorshipService(db)
    return service.list_mentors()

@router.get("/students/unassigned", response_model=List[UnassignedStudentResponse])
def get_unassigned(db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    service = MentorshipService(db)
    return service.list_unassigned_students()

@router.get("/students/assigned", response_model=List[AssignedStudentResponse])
def get_assigned(db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    service = MentorshipService(db)
    return service.list_assigned_students()

@router.get("/history", response_model=List[AssignmentHistoryResponse])
def get_history(db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    service = MentorshipService(db)
    return service.list_history()

@router.post("/assign")
def assign_students(
    request: AssignStudentsRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(RequireRole(["super_admin", "admin"]))
):
    service = MentorshipService(db)
    service.assign_students(request.student_ids, request.mentor_id, current_user.id)
    return {"message": "Assigned successfully"}

@router.post("/assignments/{assignment_id}/reassign")
def reassign_student(
    assignment_id: UUID,
    request: ReassignStudentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["super_admin", "admin"]))
):
    service = MentorshipService(db)
    service.reassign_student(assignment_id, request.new_mentor_id, request.reason, request.notes or "", current_user.id)
    return {"message": "Reassigned successfully"}

@router.post("/assignments/{assignment_id}/end")
def end_assignment(
    assignment_id: UUID,
    request: EndAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["super_admin", "admin"]))
):
    service = MentorshipService(db)
    service.end_assignment(assignment_id, request.reason, request.notes or "", current_user.id)
    return {"message": "Ended successfully"}
