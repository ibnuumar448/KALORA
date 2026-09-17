from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime, date
from typing import Optional, List
from app.models.admission import ApplicationStatus, DocumentType, OLevelExamType

class ApplicationCreate(BaseModel):
    cohort_id: UUID

class OLevelSubjectResultSchema(BaseModel):
    subject: str
    grade: str
    
    class Config:
        from_attributes = True

class OLevelResultSchema(BaseModel):
    id: Optional[UUID] = None
    examination_type: OLevelExamType
    examination_year: int
    examination_number: str
    candidate_number: Optional[str] = None
    subjects: List[OLevelSubjectResultSchema] = []
    
    class Config:
        from_attributes = True

class ApplicationDocumentSchema(BaseModel):
    id: UUID
    document_type: DocumentType
    file_url: str
    original_filename: str
    mime_type: str
    file_size: int
    uploaded_at: datetime
    
    class Config:
        from_attributes = True

class ApplicationUpdate(BaseModel):
    # Personal Info
    dob: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    state_of_origin: Optional[str] = None
    lga: Optional[str] = None
    town: Optional[str] = None
    residential_address: Optional[str] = None

    # Academic Info
    academic_status: Optional[str] = None
    school_name: Optional[str] = None
    current_class: Optional[str] = None
    graduation_year: Optional[int] = None

    # Programme Selection
    intended_jamb_year: Optional[int] = None
    intended_course: Optional[str] = None
    preferred_institution: Optional[str] = None
    selected_subjects: Optional[List[str]] = None

    # Parent/Guardian
    parent_name: Optional[str] = None
    parent_relationship: Optional[str] = None
    parent_phone: Optional[str] = None
    parent_email: Optional[str] = None
    parent_address: Optional[str] = None

class ApplicationSubmit(BaseModel):
    # OLevel results might be submitted as part of the final payload
    olevel_results: Optional[OLevelResultSchema] = None

class UserBasic(BaseModel):
    id: UUID
    full_name: str
    email: str
    class Config:
        from_attributes = True

class CohortBasic(BaseModel):
    id: UUID
    name: str
    class Config:
        from_attributes = True

class ApplicationResponse(BaseModel):
    id: UUID
    user_id: UUID
    cohort_id: UUID
    status: ApplicationStatus
    application_number: Optional[str] = None
    admission_number: Optional[str] = None
    
    dob: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    state_of_origin: Optional[str] = None
    lga: Optional[str] = None
    town: Optional[str] = None
    residential_address: Optional[str] = None
    
    academic_status: Optional[str] = None
    school_name: Optional[str] = None
    current_class: Optional[str] = None
    graduation_year: Optional[int] = None
    
    intended_jamb_year: Optional[int] = None
    intended_course: Optional[str] = None
    preferred_institution: Optional[str] = None
    selected_subjects: Optional[List[str]] = None
    
    parent_name: Optional[str] = None
    parent_relationship: Optional[str] = None
    parent_phone: Optional[str] = None
    parent_email: Optional[str] = None
    parent_address: Optional[str] = None

    created_at: datetime
    updated_at: datetime
    
    user: Optional[UserBasic] = None
    cohort: Optional[CohortBasic] = None
    documents: List[ApplicationDocumentSchema] = []
    olevel_results: List[OLevelResultSchema] = []

    class Config:
        from_attributes = True

class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
    notes: Optional[str] = None

class AdmissionNumberConfigCreate(BaseModel):
    cohort_id: Optional[UUID] = None
    prefix: str
    year_code: str
    sequence_padding: int
    separator: str
    reset_scope: str

class AdmissionNumberLookupResponse(BaseModel):
    admission_number: str
    student_name: str
    cohort_name: str
    status: str
