from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.models.assessment import AssessmentType, AttemptStatus, StudentAssessmentStatus, MakeupRequestStatus

class AnswerSubmission(BaseModel):
    question_id: UUID
    selected_answer: str

class AssessmentSubmitRequest(BaseModel):
    answers: List[AnswerSubmission] = Field(default_factory=list)

class AnswerSaveRequest(BaseModel):
    selected_answer: str

class AttemptAnswerResponse(BaseModel):
    question_id: UUID
    selected_answer: Optional[str]
    is_correct: Optional[bool]
    
    class Config:
        from_attributes = True

class AssessmentAttemptResponse(BaseModel):
    id: UUID
    student_id: UUID
    assessment_id: UUID
    status: AttemptStatus
    score: Optional[float]
    started_at: datetime
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class QuestionBankResponse(BaseModel):
    id: UUID
    text: str
    options: List[Dict[str, Any]]
    difficulty: Optional[str]
    # Do not include correct_answer here!

    class Config:
        from_attributes = True

class AssessmentAttemptDetailResponse(AssessmentAttemptResponse):
    questions: List[QuestionBankResponse] = []
    answers: List[AttemptAnswerResponse] = []

class TopicMasteryResponse(BaseModel):
    topic_id: UUID
    mastery_score: float
    last_assessed_at: Optional[datetime]

    class Config:
        from_attributes = True

class AssessmentCreateBase(BaseModel):
    name: str
    type: AssessmentType
    passing_score: float = 50.0
    duration_minutes: Optional[int] = None
    subject_id: Optional[UUID] = None
    topic_id: Optional[UUID] = None
    topic_ids: List[UUID] = Field(default_factory=list)
    module_id: Optional[UUID] = None
    cohort_id: Optional[UUID] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    release_results_at: Optional[datetime] = None
    question_ids: List[UUID] = Field(default_factory=list)

class QuestionOptionInput(BaseModel):
    id: str
    text: str

class QuestionCreate(BaseModel):
    subject_id: UUID
    topic_id: Optional[UUID] = None
    text: str
    options: List[QuestionOptionInput] = Field(min_length=2)
    correct_answer: str
    explanation: Optional[str] = None
    difficulty: Optional[str] = "medium"

class QuestionUpdate(QuestionCreate):
    pass

class MakeupRequestCreate(BaseModel):
    reason: str

class MakeupRequestReview(BaseModel):
    status: MakeupRequestStatus
    makeup_start_at: Optional[datetime] = None
    makeup_end_at: Optional[datetime] = None
