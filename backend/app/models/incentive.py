from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, Text, Integer, Enum as SQLEnum, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base

class ScholarshipLevel(str, enum.Enum):
    bronze = "bronze"      # 50-60% average
    silver = "silver"      # 60-75% average
    gold = "gold"          # 75-90% average
    platinum = "platinum"  # 90%+ average

class CertificateStatus(str, enum.Enum):
    pending = "pending"
    issued = "issued"
    revoked = "revoked"

class Scholarship(Base):
    """
    Records scholarship eligibility and awards for students based on performance.
    """
    __tablename__ = "scholarships"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    cohort_id = Column(UUID(as_uuid=True), ForeignKey("cohorts.id", ondelete="CASCADE"), nullable=True)
    
    level = Column(SQLEnum(ScholarshipLevel), nullable=False)
    amount = Column(Float, nullable=False)  # In local currency
    reason = Column(Text, nullable=False)
    
    is_active = Column(Boolean, default=True, nullable=False)
    awarded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    student = relationship("User")

class Certificate(Base):
    """
    Records certificates issued to students upon completion of milestones.
    """
    __tablename__ = "certificates"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    certificate_type = Column(String(255), nullable=False)  # e.g., "Mastery: Algebra", "Module Completion: Math 101"
    status = Column(SQLEnum(CertificateStatus), default=CertificateStatus.pending, nullable=False)
    
    description = Column(Text, nullable=True)
    issued_at = Column(DateTime(timezone=True), nullable=True)
    issued_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    student = relationship("User", foreign_keys=[student_id])
    issuer = relationship("User", foreign_keys=[issued_by])

class Incentive(Base):
    """
    Records various incentives and rewards earned by students.
    """
    __tablename__ = "incentives"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    incentive_type = Column(String(255), nullable=False)  # e.g., "Perfect Attendance", "Perfect Assessment Score", "Peer Help"
    points = Column(Integer, default=0, nullable=False)
    description = Column(Text, nullable=True)
    
    earned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    student = relationship("User")
