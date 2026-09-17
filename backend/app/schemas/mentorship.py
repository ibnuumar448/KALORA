from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class MentorshipStatsResponse(BaseModel):
    active_mentors: int
    assigned_students: int
    unassigned_students: int
    at_risk_students: int

class MentorListResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    assigned_count: int
    capacity: int
    available_capacity: int
    status: str

    model_config = ConfigDict(from_attributes=True)

class AssignedStudentResponse(BaseModel):
    id: UUID
    full_name: str
    admission_number: Optional[str]
    cohort_name: str
    progress: int
    assessment_average: float
    status: str
    mentor_id: UUID
    mentor_name: str
    assignment_id: UUID
    assigned_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UnassignedStudentResponse(BaseModel):
    id: UUID
    full_name: str
    admission_number: Optional[str]
    cohort_id: UUID
    cohort_name: str
    status: str

    model_config = ConfigDict(from_attributes=True)

class AssignStudentsRequest(BaseModel):
    student_ids: List[UUID]
    mentor_id: UUID

class ReassignStudentRequest(BaseModel):
    new_mentor_id: UUID
    reason: str
    notes: Optional[str] = None

class EndAssignmentRequest(BaseModel):
    reason: str
    notes: Optional[str] = None

class AssignmentHistoryResponse(BaseModel):
    id: UUID
    student_name: str
    mentor_name: str
    cohort_name: str
    assigned_at: datetime
    ended_at: Optional[datetime]
    status: str
    end_reason: Optional[str]
    model_config = ConfigDict(from_attributes=True)

class MentorNoteCreate(BaseModel):
    contact_attempt: bool = True
    reason: str
    support_given: Optional[str] = None
    follow_up_date: Optional[datetime] = None

class MentorNoteResponse(BaseModel):
    id: UUID
    mentor_id: UUID
    student_id: UUID
    contact_attempt: bool
    reason: str
    support_given: Optional[str]
    follow_up_date: Optional[datetime]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
