from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from uuid import UUID
from datetime import datetime, timezone
from fastapi import HTTPException, status
from app.models.mentorship import MentorAssignment
from app.models.user import User
from app.models.rbac import Role, UserRole
from app.models.admission import Application
from app.models.organization import Cohort, Programme
from app.models.settings import GlobalSetting
from app.schemas.mentorship import (
    MentorshipStatsResponse, MentorListResponse, AssignedStudentResponse,
    UnassignedStudentResponse, AssignmentHistoryResponse
)

class MentorshipService:
    def __init__(self, db: Session):
        self.db = db

    def _get_capacity_settings(self):
        cap_setting = self.db.query(GlobalSetting).filter(GlobalSetting.key == "mentor_capacity").first()
        policy_setting = self.db.query(GlobalSetting).filter(GlobalSetting.key == "capacity_enforcement_policy").first()
        
        capacity = int(cap_setting.value) if cap_setting and cap_setting.value.isdigit() else 10
        policy = policy_setting.value if policy_setting else "warning"
        return capacity, policy

    def get_stats(self) -> MentorshipStatsResponse:
        # Active mentors
        active_mentors = self.db.query(User).join(UserRole).join(Role).filter(Role.name == "mentor").count()
        
        # Assigned students
        assigned_students = self.db.query(MentorAssignment).filter(MentorAssignment.status == "active").count()
        
        # Unassigned students (all active students minus those with active assignments)
        total_students = self.db.query(User).join(UserRole).join(Role).filter(Role.name == "student").count()
        unassigned_students = max(0, total_students - assigned_students)
        
        return MentorshipStatsResponse(
            active_mentors=active_mentors,
            assigned_students=assigned_students,
            unassigned_students=unassigned_students,
            at_risk_students=0 # Placeholder for now
        )

    def list_mentors(self) -> list[MentorListResponse]:
        mentors = self.db.query(User).join(UserRole).join(Role).filter(Role.name == "mentor").all()
        capacity, _ = self._get_capacity_settings()
        
        res = []
        for m in mentors:
            assigned = self.db.query(MentorAssignment).filter(
                MentorAssignment.mentor_id == m.id,
                MentorAssignment.status == "active"
            ).count()
            
            avail = max(0, capacity - assigned)
            status_str = "Full" if avail <= 0 else f"{avail} Available"
            
            res.append(MentorListResponse(
                id=m.id,
                full_name=m.full_name,
                email=m.email,
                assigned_count=assigned,
                capacity=capacity,
                available_capacity=avail,
                status=status_str
            ))
        return res

    def list_unassigned_students(self) -> list[UnassignedStudentResponse]:
        # Find students who do NOT have an active assignment
        subquery = self.db.query(MentorAssignment.student_id).filter(MentorAssignment.status == "active").subquery()
        
        students = self.db.query(User).join(UserRole).join(Role).filter(
            Role.name == "student",
            ~User.id.in_(subquery)
        ).all()
        
        res = []
        for s in students:
            # Get cohort and admission number
            app = self.db.query(Application).filter(Application.user_id == s.id, Application.status == "accepted").first()
            cohort_name = app.cohort.name if app and app.cohort else "N/A"
            cohort_id = app.cohort_id if app else None
            
            # If no cohort, we can't easily assign them, but let's list them anyway
            if not cohort_id:
                cohort = self.db.query(Cohort).first()
                if cohort:
                    cohort_id = cohort.id
                    cohort_name = cohort.name
                else:
                    continue
                    
            res.append(UnassignedStudentResponse(
                id=s.id,
                full_name=s.full_name,
                admission_number=None,
                cohort_id=cohort_id,
                cohort_name=cohort_name,
                status="Unassigned"
            ))
        return res

    def assign_students(self, student_ids: list[UUID], mentor_id: UUID, by_user_id: UUID):
        capacity, policy = self._get_capacity_settings()
        current_assigned = self.db.query(MentorAssignment).filter(
            MentorAssignment.mentor_id == mentor_id,
            MentorAssignment.status == "active"
        ).count()
        
        if policy == "strict" and current_assigned + len(student_ids) > capacity:
            raise HTTPException(status_code=400, detail="Assignment would exceed mentor capacity limit.")
            
        for sid in student_ids:
            # Check if student already has active
            existing = self.db.query(MentorAssignment).filter(
                MentorAssignment.student_id == sid,
                MentorAssignment.status == "active"
            ).first()
            if existing:
                continue # Skip or raise? Let's skip safely.
                
            # Get cohort dynamically
            app = self.db.query(Application).filter(Application.user_id == sid, Application.status == "accepted").first()
            cohort_id = app.cohort_id if app else None
            if not cohort_id:
                cohort = self.db.query(Cohort).first()
                if cohort:
                    cohort_id = cohort.id
                else:
                    raise HTTPException(status_code=400, detail="No cohort available to assign.")
                
            new_assign = MentorAssignment(
                student_id=sid,
                mentor_id=mentor_id,
                cohort_id=cohort_id,
                programme_id=None,
                status="active",
                assigned_by_id=by_user_id,
                assigned_at=datetime.now(timezone.utc)
            )
            self.db.add(new_assign)
            
        self.db.commit()

    def list_history(self) -> list[AssignmentHistoryResponse]:
        assignments = self.db.query(MentorAssignment).order_by(MentorAssignment.assigned_at.desc()).all()
        res = []
        for a in assignments:
            res.append(AssignmentHistoryResponse(
                id=a.id,
                student_name=a.student.full_name if a.student else "Unknown",
                mentor_name=a.mentor.full_name if a.mentor else "Unknown",
                cohort_name=a.cohort.name if a.cohort else "Unknown",
                assigned_at=a.assigned_at,
                ended_at=a.ended_at,
                status=a.status,
                end_reason=a.end_reason,
                assigned_by_name=a.assigned_by.full_name if a.assigned_by else None
            ))
        return res

    def list_assigned_students(self) -> list[AssignedStudentResponse]:
        assignments = self.db.query(MentorAssignment).filter(MentorAssignment.status == "active").all()
        res = []
        for a in assignments:
            app = self.db.query(Application).filter(Application.user_id == a.student_id, Application.status == "accepted").first()
            res.append(AssignedStudentResponse(
                id=a.student_id,
                full_name=a.student.full_name,
                admission_number=None,
                cohort_name=a.cohort.name if a.cohort else "Unknown",
                progress=0, # Placeholder
                assessment_average=0.0, # Placeholder
                status="Active",
                mentor_id=a.mentor_id,
                mentor_name=a.mentor.full_name,
                assignment_id=a.id,
                assigned_at=a.assigned_at
            ))
        return res

    def end_assignment(self, assignment_id: UUID, reason: str, notes: str, by_user_id: UUID):
        assignment = self.db.query(MentorAssignment).filter(MentorAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
            
        assignment.status = "ended"
        assignment.ended_at = datetime.now(timezone.utc)
        assignment.ended_by_id = by_user_id
        assignment.end_reason = reason
        assignment.notes = notes
        self.db.commit()

    def reassign_student(self, assignment_id: UUID, new_mentor_id: UUID, reason: str, notes: str, by_user_id: UUID):
        assignment = self.db.query(MentorAssignment).filter(MentorAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
            
        # Capacity check for new mentor
        capacity, policy = self._get_capacity_settings()
        current_assigned = self.db.query(MentorAssignment).filter(
            MentorAssignment.mentor_id == new_mentor_id,
            MentorAssignment.status == "active"
        ).count()
        
        if policy == "strict" and current_assigned + 1 > capacity:
            raise HTTPException(status_code=400, detail="Assignment would exceed mentor capacity limit.")
            
        # End old
        assignment.status = "ended"
        assignment.ended_at = datetime.now(timezone.utc)
        assignment.ended_by_id = by_user_id
        assignment.end_reason = reason
        assignment.notes = notes
        
        # Start new
        new_assign = MentorAssignment(
            student_id=assignment.student_id,
            mentor_id=new_mentor_id,
            cohort_id=assignment.cohort_id,
            programme_id=assignment.programme_id,
            status="active",
            assigned_by_id=by_user_id,
            assigned_at=datetime.now(timezone.utc)
        )
        self.db.add(new_assign)
        self.db.commit()

    def get_assigned_students(self, mentor_id: UUID) -> list[AssignedStudentResponse]:
        assignments = self.db.query(MentorAssignment).filter(
            MentorAssignment.mentor_id == mentor_id,
            MentorAssignment.status == "active"
        ).all()
        res = []
        for a in assignments:
            res.append(AssignedStudentResponse(
                id=a.student_id,
                full_name=a.student.full_name,
                admission_number=None,
                cohort_name=a.cohort.name if a.cohort else "Unknown",
                progress=0,
                assessment_average=0.0,
                status="Active",
                mentor_id=a.mentor_id,
                mentor_name=a.mentor.full_name,
                assignment_id=a.id,
                assigned_at=a.assigned_at
            ))
        return res

