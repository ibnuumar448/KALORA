from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class MentorAssignment(Base):
    __tablename__ = "mentor_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    mentor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    programme_id = Column(UUID(as_uuid=True), ForeignKey("programmes.id", ondelete="CASCADE"), nullable=True)
    cohort_id = Column(UUID(as_uuid=True), ForeignKey("cohorts.id", ondelete="CASCADE"), nullable=False)
    
    status = Column(String(20), default="active", nullable=False) # 'active' or 'ended'
    
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    assigned_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    ended_at = Column(DateTime(timezone=True), nullable=True)
    ended_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    end_reason = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    mentor = relationship("User", foreign_keys=[mentor_id])
    student = relationship("User", foreign_keys=[student_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])
    ended_by = relationship("User", foreign_keys=[ended_by_id])
    programme = relationship("Programme")
    cohort = relationship("Cohort")

class MentorNote(Base):
    """
    Append-only log of interventions and contact attempts by a mentor.
    """
    __tablename__ = "mentor_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    mentor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    contact_attempt = Column(Boolean, default=True, nullable=False)
    reason = Column(String(255), nullable=False)
    support_given = Column(Text, nullable=True)
    follow_up_date = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    mentor = relationship("User", foreign_keys=[mentor_id])
    student = relationship("User", foreign_keys=[student_id])
