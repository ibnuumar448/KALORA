from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from uuid import UUID
from datetime import datetime, timezone
from fastapi import HTTPException, status
from app.models.mentorship import MentorAssignment, MentorshipMessage, SupportRequest
from app.models.user import User
from app.models.rbac import Role, UserRole
from app.models.admission import Application
from app.models.organization import Cohort, Programme
from app.models.settings import GlobalSetting
from app.schemas.mentorship import (
    MentorshipStatsResponse, MentorListResponse, AssignedStudentResponse,
    UnassignedStudentResponse, AssignmentHistoryResponse, StudentMentorResponse,
    StudentMentorshipHistoryResponse, MentorshipMessageResponse,
    SupportRequestResponse
)
from app.services.notification import NotificationService

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
        
        # Unassigned students (all accepted applications minus those with active assignments)
        subquery = self.db.query(MentorAssignment.student_id).filter(MentorAssignment.status == "active").subquery()
        unassigned_students = self.db.query(Application.user_id).filter(
            Application.status == "accepted",
            ~Application.user_id.in_(subquery)
        ).distinct().count()
        
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
        from app.models.admission import AdmissionNumber
        # Find students who do NOT have an active assignment
        subquery = self.db.query(MentorAssignment.student_id).filter(MentorAssignment.status == "active").subquery()
        
        accepted_apps = self.db.query(Application).join(User).filter(
            Application.status == "accepted",
            ~Application.user_id.in_(subquery)
        ).all()
        
        res = []
        processed_users = set()
        for app in accepted_apps:
            s = app.user
            if s.id in processed_users:
                continue
            processed_users.add(s.id)
            
            cohort_name = app.cohort.name if app.cohort else "N/A"
            cohort_id = app.cohort_id
            
            if not cohort_id:
                cohort = self.db.query(Cohort).first()
                if cohort:
                    cohort_id = cohort.id
                    cohort_name = cohort.name
                else:
                    continue
                    
            # Try to get admission number
            admission_record = self.db.query(AdmissionNumber).filter(AdmissionNumber.student_id == s.id).first()
            admin_num = admission_record.admission_number if admission_record else None
                    
            res.append(UnassignedStudentResponse(
                id=s.id,
                full_name=s.full_name,
                admission_number=admin_num,
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

    def get_student_mentorship_history(self, student_id: UUID) -> StudentMentorshipHistoryResponse:
        assignments = self.db.query(MentorAssignment).filter(
            MentorAssignment.student_id == student_id
        ).order_by(MentorAssignment.assigned_at.desc()).all()
        
        current_mentor = None
        history = []
        
        for a in assignments:
            if a.status == "active":
                current_mentor = StudentMentorResponse(
                    assignment_id=a.id,
                    mentor_id=a.mentor_id,
                    mentor_name=a.mentor.full_name if a.mentor else "Unknown",
                    assigned_at=a.assigned_at,
                    status=a.status
                )
            
            history.append(AssignmentHistoryResponse(
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
            
        return StudentMentorshipHistoryResponse(
            current_mentor=current_mentor,
            history=history
        )

    def get_messages(self, assignment_id: UUID, user_id: UUID) -> list[MentorshipMessageResponse]:
        assignment = self.db.query(MentorAssignment).filter(MentorAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
            
        if user_id != assignment.student_id and user_id != assignment.mentor_id:
            # Check if user is admin
            user_roles = self.db.query(Role.name).join(UserRole).filter(UserRole.user_id == user_id).all()
            roles = [r[0] for r in user_roles]
            if "admin" not in roles and "super_admin" not in roles:
                raise HTTPException(status_code=403, detail="Not authorized to view these messages")
                
        messages = self.db.query(MentorshipMessage).filter(
            MentorshipMessage.assignment_id == assignment_id
        ).order_by(MentorshipMessage.created_at.asc()).all()
        
        return [
            MentorshipMessageResponse(
                id=m.id,
                assignment_id=m.assignment_id,
                sender_id=m.sender_id,
                sender_name=m.sender.full_name if m.sender else "Unknown",
                content=m.content,
                created_at=m.created_at,
                read_at=m.read_at
            ) for m in messages
        ]
        
    def send_message(self, assignment_id: UUID, sender_id: UUID, content: str) -> MentorshipMessageResponse:
        assignment = self.db.query(MentorAssignment).filter(MentorAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
            
        if sender_id != assignment.student_id and sender_id != assignment.mentor_id:
            raise HTTPException(status_code=403, detail="Not authorized to send messages in this assignment")
            
        if assignment.status == "ended":
            raise HTTPException(status_code=403, detail="Cannot send messages to an ended assignment")
            
        new_msg = MentorshipMessage(
            assignment_id=assignment_id,
            sender_id=sender_id,
            content=content,
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(new_msg)
        self.db.commit()
        self.db.refresh(new_msg)
        
        # Trigger Notification
        notif_svc = NotificationService(self.db)
        recipient_id = assignment.student_id if sender_id == assignment.mentor_id else assignment.mentor_id
        sender_name = new_msg.sender.full_name if new_msg.sender else "Someone"
        notif_svc.create_notification(
            user_id=recipient_id,
            title="New Message",
            message=f"You have a new message from {sender_name}",
            type="mentorship_message"
        )
        
        return MentorshipMessageResponse(
            id=new_msg.id,
            assignment_id=new_msg.assignment_id,
            sender_id=new_msg.sender_id,
            sender_name=new_msg.sender.full_name if new_msg.sender else "Unknown",
            content=new_msg.content,
            created_at=new_msg.created_at,
            read_at=new_msg.read_at
        )

    def create_support_request(self, student_id: UUID, category: str, message: str) -> SupportRequestResponse:
        assignment = self.db.query(MentorAssignment).filter(
            MentorAssignment.student_id == student_id,
            MentorAssignment.status == "active"
        ).first()
        
        if not assignment:
            raise HTTPException(status_code=400, detail="You do not have an active mentor assignment.")
            
        new_req = SupportRequest(
            assignment_id=assignment.id,
            student_id=student_id,
            category=category,
            message=message,
            status="open",
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(new_req)
        self.db.commit()
        self.db.refresh(new_req)
        
        # Trigger Notification
        notif_svc = NotificationService(self.db)
        notif_svc.create_notification(
            user_id=assignment.mentor_id,
            title="New Support Request",
            message=f"{new_req.student.full_name if new_req.student else 'A student'} needs help: {category}",
            type="support_request"
        )
        
        return SupportRequestResponse(
            id=new_req.id,
            assignment_id=new_req.assignment_id,
            student_id=new_req.student_id,
            student_name=new_req.student.full_name if new_req.student else "Unknown",
            category=new_req.category,
            message=new_req.message,
            status=new_req.status,
            created_at=new_req.created_at,
            resolved_at=new_req.resolved_at
        )
        
    def get_support_requests(self, user_id: UUID, is_mentor: bool = False) -> list[SupportRequestResponse]:
        query = self.db.query(SupportRequest).join(MentorAssignment)
        
        if is_mentor:
            query = query.filter(MentorAssignment.mentor_id == user_id)
        else:
            query = query.filter(SupportRequest.student_id == user_id)
            
        requests = query.order_by(SupportRequest.created_at.desc()).all()
        
        return [
            SupportRequestResponse(
                id=r.id,
                assignment_id=r.assignment_id,
                student_id=r.student_id,
                student_name=r.student.full_name if r.student else "Unknown",
                category=r.category,
                message=r.message,
                status=r.status,
                created_at=r.created_at,
                resolved_at=r.resolved_at
            ) for r in requests
        ]
