from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, Text, Integer, UniqueConstraint, Enum as SQLEnum, Date
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base

class ApplicationStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    pending_review = "pending_review"
    under_review = "under_review"
    shortlisted = "shortlisted"
    accepted = "accepted"
    waitlisted = "waitlisted"
    rejected = "rejected"
    withdrawn = "withdrawn"
    applied = "applied" # Keeping for backward compatibility

class DocumentType(str, enum.Enum):
    PROFILE_PICTURE = "PROFILE_PICTURE"
    OLEVEL_RESULT = "OLEVEL_RESULT"
    REPORT_CARD = "REPORT_CARD"

class OLevelExamType(str, enum.Enum):
    WAEC = "WAEC"
    NECO = "NECO"
    NABTEB = "NABTEB"

class Application(Base):
    __tablename__ = "applications"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    cohort_id = Column(UUID(as_uuid=True), ForeignKey("cohorts.id", ondelete="CASCADE"), nullable=False)
    status = Column(SQLEnum(ApplicationStatus), default=ApplicationStatus.draft, nullable=False)
    
    # Generated on submission
    application_number = Column(String(50), unique=True, index=True, nullable=True)

    # Personal Information
    dob = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)
    phone = Column(String(50), nullable=True)
    state_of_origin = Column(String(100), nullable=True)
    lga = Column(String(100), nullable=True)
    town = Column(String(100), nullable=True)
    residential_address = Column(Text, nullable=True)

    # Academic Information
    academic_status = Column(String(50), nullable=True) # 'secondary_student' or 'secondary_graduate'
    school_name = Column(String(255), nullable=True)
    current_class = Column(String(50), nullable=True)
    graduation_year = Column(Integer, nullable=True)

    # Programme Selection
    intended_jamb_year = Column(Integer, nullable=True)
    intended_course = Column(String(255), nullable=True)
    preferred_institution = Column(String(255), nullable=True)
    selected_subjects = Column(JSONB, nullable=True) # E.g., ["Mathematics", "English"]

    # Parent/Guardian Information
    parent_name = Column(String(255), nullable=True)
    parent_relationship = Column(String(100), nullable=True)
    parent_phone = Column(String(50), nullable=True)
    parent_email = Column(String(255), nullable=True)
    parent_address = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint('user_id', 'cohort_id', name='_user_cohort_uc'),)

    user = relationship("User")
    cohort = relationship("Cohort")
    status_history = relationship("ApplicationStatusHistory", back_populates="application", cascade="all, delete-orphan")
    documents = relationship("ApplicationDocument", back_populates="application", cascade="all, delete-orphan")
    olevel_results = relationship("OLevelResult", back_populates="application", cascade="all, delete-orphan")


class ApplicationDocument(Base):
    __tablename__ = "application_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    document_type = Column(SQLEnum(DocumentType), nullable=False)
    file_url = Column(String(1024), nullable=False)
    original_filename = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    application = relationship("Application", back_populates="documents")


class OLevelResult(Base):
    __tablename__ = "olevel_results"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    examination_type = Column(SQLEnum(OLevelExamType), nullable=False)
    examination_year = Column(Integer, nullable=False)
    examination_number = Column(String(100), nullable=False)
    candidate_number = Column(String(100), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    application = relationship("Application", back_populates="olevel_results")
    subjects = relationship("OLevelSubjectResult", back_populates="olevel_result", cascade="all, delete-orphan")


class OLevelSubjectResult(Base):
    __tablename__ = "olevel_subject_results"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    olevel_result_id = Column(UUID(as_uuid=True), ForeignKey("olevel_results.id", ondelete="CASCADE"), nullable=False)
    subject = Column(String(100), nullable=False)
    grade = Column(String(10), nullable=False)

    olevel_result = relationship("OLevelResult", back_populates="subjects")


class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_history"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    status = Column(SQLEnum(ApplicationStatus), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    application = relationship("Application", back_populates="status_history")

class AdmissionNumberConfig(Base):
    __tablename__ = "admission_number_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    cohort_id = Column(UUID(as_uuid=True), ForeignKey("cohorts.id", ondelete="CASCADE"), nullable=True) # Nullable for org-wide default
    prefix = Column(String(10), nullable=False, default="KL")
    year_code = Column(String(10), nullable=False, default="24")
    sequence_padding = Column(Integer, nullable=False, default=4)
    separator = Column(String(5), nullable=False, default="/")
    reset_scope = Column(String(20), nullable=False, default="cohort") # 'cohort' or 'platform'
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    cohort = relationship("Cohort")

class AdmissionNumber(Base):
    __tablename__ = "admission_numbers"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    cohort_id = Column(UUID(as_uuid=True), ForeignKey("cohorts.id", ondelete="CASCADE"), nullable=False)
    admission_number = Column(String(50), unique=True, index=True, nullable=False)
    sequence_val = Column(Integer, nullable=False) # Store the integer to easily find next
    issued_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    student = relationship("User")
    cohort = relationship("Cohort")
