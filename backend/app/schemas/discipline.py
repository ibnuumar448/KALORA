from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from uuid import UUID

class DefaultResponse(BaseModel):
    id: UUID
    student_id: UUID
    reason: str
    is_excused: bool
    excused_reason: Optional[str]
    created_at: datetime
    acknowledged_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class WarningResponse(BaseModel):
    id: UUID
    student_id: UUID
    level: str
    reason: str
    created_at: datetime
    acknowledged_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SuspensionResponse(BaseModel):
    id: UUID
    student_id: UUID
    reason: str
    is_active: bool
    started_at: datetime
    ended_at: Optional[datetime]
    acknowledged_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class RiskFlagResponse(BaseModel):
    id: UUID
    student_id: UUID
    flag_level: str  # green, yellow, red
    reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class StudentDisciplinaryStatus(BaseModel):
    """Summary of student's disciplinary record"""
    student_id: UUID
    total_defaults: int
    excused_defaults: int
    warning_count: int
    active_suspensions: int
    current_risk_level: str
    recent_defaults: list[DefaultResponse]
    recent_warnings: list[WarningResponse]
    active_suspension: Optional[SuspensionResponse]
    
    class Config:
        from_attributes = True

class LogDefaultRequest(BaseModel):
    reason: str
    is_excused: bool = False
    excused_reason: Optional[str] = None

class LogWarningRequest(BaseModel):
    level: str  # "first" or "final"
    reason: str

class LogSuspensionRequest(BaseModel):
    reason: str

class RecordSuspensionEndRequest(BaseModel):
    """End an active suspension"""
    reason: Optional[str] = None
