from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, Text, Integer, Float, Enum as SQLEnum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base

class AssessmentType(str, enum.Enum):
    entry = "entry"
    diagnostic = "diagnostic"
    quiz = "quiz"
    weekly = "weekly"
    monthly = "monthly"
    mock = "mock"
    final = "final"

class AssessmentStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    closed = "closed"

class AttemptStatus(str, enum.Enum):
    in_progress = "in_progress"
    completed = "completed"
    auto_submitted = "auto_submitted"
    abandoned = "abandoned"

class StudentAssessmentStatus(str, enum.Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    submitted = "submitted"
    auto_submitted = "auto_submitted"
    missed = "missed"
    makeup_approved = "makeup_approved"
    makeup_in_progress = "makeup_in_progress"
    makeup_submitted = "makeup_submitted"

class MakeupRequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    expired = "expired"
    completed = "completed"

class QuestionBank(Base):
    __tablename__ = "question_bank"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    topic_id = Column(UUID(as_uuid=True), ForeignKey("topics.id", ondelete="SET NULL"), nullable=True)
    
    text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False) # e.g. ["A", "B", "C", "D"] or [{"id": "A", "text": "Option A"}]
    correct_answer = Column(String(255), nullable=False)
    explanation = Column(Text, nullable=True)
    difficulty = Column(String(50), nullable=True) # easy, medium, hard
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    subject = relationship("Subject")
    topic = relationship("Topic")

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    name = Column(String(255), nullable=False)
    type = Column(SQLEnum(AssessmentType), nullable=False)
    status = Column(String(20), nullable=False, default=AssessmentStatus.draft.value)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    
    # Target Audience
    cohort_id = Column(UUID(as_uuid=True), ForeignKey("cohorts.id", ondelete="SET NULL"), nullable=True)

    # Scoping: can be linked to a specific topic or module, or nullable for full course mocks
    topic_id = Column(UUID(as_uuid=True), ForeignKey("topics.id", ondelete="CASCADE"), nullable=True)
    module_id = Column(UUID(as_uuid=True), ForeignKey("modules.id", ondelete="CASCADE"), nullable=True)
    
    passing_score = Column(Float, nullable=False, default=50.0)
    duration_minutes = Column(Integer, nullable=True) # Null = untimed
    
    # Scheduling
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    release_results_at = Column(DateTime(timezone=True), nullable=True)

    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    cohort = relationship("Cohort")
    subject = relationship("Subject")
    topic = relationship("Topic")
    module = relationship("Module")
    questions = relationship("AssessmentQuestion", back_populates="assessment", cascade="all, delete-orphan", order_by="AssessmentQuestion.order_index")
    topics = relationship("AssessmentTopic", back_populates="assessment", cascade="all, delete-orphan", order_by="AssessmentTopic.order_index")
    student_assessments = relationship("StudentAssessment", back_populates="assessment", cascade="all, delete-orphan")

class StudentAssessment(Base):
    __tablename__ = "student_assessments"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    
    status = Column(SQLEnum(StudentAssessmentStatus), default=StudentAssessmentStatus.not_started, nullable=False)
    score = Column(Float, nullable=True)
    
    makeup_start_at = Column(DateTime(timezone=True), nullable=True)
    makeup_end_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    student = relationship("User")
    assessment = relationship("Assessment", back_populates="student_assessments")
    makeup_requests = relationship("MakeupRequest", back_populates="student_assessment", cascade="all, delete-orphan")

class MakeupRequest(Base):
    __tablename__ = "makeup_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    student_assessment_id = Column(UUID(as_uuid=True), ForeignKey("student_assessments.id", ondelete="CASCADE"), nullable=False)
    
    reason = Column(Text, nullable=False)
    status = Column(SQLEnum(MakeupRequestStatus), default=MakeupRequestStatus.pending, nullable=False)
    
    requested_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    student_assessment = relationship("StudentAssessment", back_populates="makeup_requests")
    reviewed_by = relationship("User")

class AssessmentQuestion(Base):
    __tablename__ = "assessment_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("question_bank.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, default=0, nullable=False)

    assessment = relationship("Assessment", back_populates="questions")
    question = relationship("QuestionBank")

class AssessmentTopic(Base):
    __tablename__ = "assessment_topics"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    topic_id = Column(UUID(as_uuid=True), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, default=0, nullable=False)

    assessment = relationship("Assessment", back_populates="topics")
    topic = relationship("Topic")

class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    is_makeup = Column(Boolean, nullable=False, default=False)
    
    status = Column(SQLEnum(AttemptStatus), default=AttemptStatus.in_progress, nullable=False)
    score = Column(Float, nullable=True) # Populated on completion
    
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    student = relationship("User")
    assessment = relationship("Assessment")
    answers = relationship("AttemptAnswer", back_populates="attempt", cascade="all, delete-orphan")

class AttemptAnswer(Base):
    __tablename__ = "attempt_answers"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    attempt_id = Column(UUID(as_uuid=True), ForeignKey("assessment_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("question_bank.id", ondelete="CASCADE"), nullable=False)
    
    selected_answer = Column(String(255), nullable=True)
    is_correct = Column(Boolean, nullable=True) # Scored at completion
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    attempt = relationship("AssessmentAttempt", back_populates="answers")
    question = relationship("QuestionBank")
