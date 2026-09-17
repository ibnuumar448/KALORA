from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from uuid import UUID

class ScholarshipResponse(BaseModel):
    id: UUID
    student_id: UUID
    level: str
    amount: float
    reason: str
    is_active: bool
    awarded_at: datetime
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True

class CertificateResponse(BaseModel):
    id: UUID
    student_id: UUID
    certificate_type: str
    status: str
    description: Optional[str]
    issued_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class IncentiveResponse(BaseModel):
    id: UUID
    student_id: UUID
    incentive_type: str
    points: int
    description: Optional[str]
    earned_at: datetime

    class Config:
        from_attributes = True

class StudentIncentivesSummary(BaseModel):
    """Summary of student's disciplinary status and incentives"""
    student_id: UUID
    total_points: int
    active_scholarships: int
    total_certificates: int
    recent_incentives: list[IncentiveResponse]
    scholarship_level: Optional[str]
    
    class Config:
        from_attributes = True
