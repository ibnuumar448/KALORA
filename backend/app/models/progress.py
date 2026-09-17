from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, Float, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base

class ProgressLevel(str, enum.Enum):
    subject = "subject"
    module = "module"
    topic = "topic"
    resource = "resource"

class ProgressStatus(str, enum.Enum):
    started = "started"
    completed = "completed"

class ProgressRecord(Base):
    """
    Immutable track of when a student started or completed a specific entity.
    """
    __tablename__ = "progress_records"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    level = Column(SQLEnum(ProgressLevel), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False) # ID of the subject, module, topic, or resource slot
    
    status = Column(SQLEnum(ProgressStatus), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    student = relationship("User")

class TopicMastery(Base):
    """
    Materialized rollup of how a student is performing in a given topic,
    computed from assessment attempts.
    """
    __tablename__ = "topic_mastery"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic_id = Column(UUID(as_uuid=True), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    
    # 0 to 100 representing mastery percentage
    mastery_score = Column(Float, nullable=False, default=0.0)
    
    last_assessed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    student = relationship("User")
    topic = relationship("Topic")
