from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.api.deps import get_current_user, RequireRole
from app.models.user import User
from app.models.assessment import Assessment, AssessmentQuestion, QuestionBank
from app.schemas.assessment import AssessmentAttemptResponse, AssessmentSubmitRequest, AssessmentAttemptDetailResponse, AssessmentCreateBase, MakeupRequestCreate, MakeupRequestReview
from app.services.assessment import AssessmentService

router = APIRouter(prefix="", tags=["assessments"])

@router.get("/question-bank")
def list_question_bank(
    subject_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin"]))
):
    from sqlalchemy.orm import joinedload
    query = db.query(QuestionBank).options(joinedload(QuestionBank.subject))
    if subject_id:
        query = query.filter(QuestionBank.subject_id == subject_id)
        
    questions = query.all()
    return [
        {
            "id": q.id,
            "text": q.text,
            "difficulty": q.difficulty,
            "subject_id": q.subject_id,
            "subject_name": q.subject.name if q.subject else "Unknown"
        }
        for q in questions
    ]

class QuestionCreate(BaseModel):
    subject_id: UUID
    text: str
    options: List[dict] = []
    correct_answer: str
    explanation: Optional[str] = None
    difficulty: Optional[str] = "medium"

@router.post("/question-bank", status_code=status.HTTP_201_CREATED)
def create_question(
    data: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin"]))
):
    q = QuestionBank(
        subject_id=data.subject_id,
        text=data.text,
        options=data.options,
        correct_answer=data.correct_answer,
        explanation=data.explanation,
        difficulty=data.difficulty
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return {"id": q.id, "message": "Question added to bank"}

class BulkQuestionItem(BaseModel):
    subject: str
    text: str
    options: List[dict]
    correct_answer: str
    difficulty: Optional[str] = "medium"

class BulkUploadRequest(BaseModel):
    questions: List[BulkQuestionItem]

@router.post("/question-bank/bulk-upload", status_code=status.HTTP_201_CREATED)
def bulk_upload_questions(
    data: BulkUploadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin"]))
):
    from app.models.curriculum import Subject
    from fastapi import HTTPException
    
    # Load all subjects in a dictionary for quick case-insensitive lookup
    all_subjects = db.query(Subject).all()
    subject_map = {s.name.lower(): s.id for s in all_subjects}
    
    questions_to_add = []
    
    for i, item in enumerate(data.questions):
        subject_id = subject_map.get(item.subject.lower())
        if not subject_id:
            raise HTTPException(
                status_code=400, 
                detail=f"Row {i+1}: Subject '{item.subject}' is not available in the system. Please create it first."
            )
            
        q = QuestionBank(
            subject_id=subject_id,
            text=item.text,
            options=item.options,
            correct_answer=item.correct_answer,
            difficulty=item.difficulty
        )
        questions_to_add.append(q)
        
    db.add_all(questions_to_add)
    db.commit()
    return {"message": f"Successfully uploaded {len(questions_to_add)} questions."}

class BulkDeleteRequest(BaseModel):
    question_ids: Optional[List[UUID]] = None
    subject_id: Optional[UUID] = None
    delete_all: bool = False

@router.post("/question-bank/bulk-delete")
def bulk_delete_questions(
    data: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin"]))
):
    query = db.query(QuestionBank)
    
    if data.delete_all:
        pass # don't filter, delete all
    elif data.subject_id:
        query = query.filter(QuestionBank.subject_id == data.subject_id)
    elif data.question_ids:
        query = query.filter(QuestionBank.id.in_(data.question_ids))
    else:
        return {"message": "No delete criteria provided"}
        
    count = query.delete(synchronize_session=False)
    db.commit()
    return {"message": f"Successfully deleted {count} questions."}

@router.delete("/question-bank/{id}")
def delete_question(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin"]))
):
    from fastapi import HTTPException
    q = db.query(QuestionBank).filter(QuestionBank.id == id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(q)
    db.commit()
    return {"message": "Question deleted"}

@router.get("/assessments", response_model=List[dict])
def list_assessments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assessments = db.query(Assessment).filter(Assessment.is_active == True).all()
    return [
        {
            "id": a.id,
            "name": a.name,
            "type": a.type,
            "passing_score": a.passing_score,
            "duration_minutes": a.duration_minutes,
            "topic_id": a.topic_id,
            "question_count": len(a.questions)
        }
        for a in assessments
    ]

@router.post("/assessments", status_code=status.HTTP_201_CREATED)
def create_assessment(
    data: AssessmentCreateBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin"]))
):
    service = AssessmentService(db)
    a = service.create_assessment(data)
    return {"id": a.id, "message": "Assessment created"}

@router.post("/assessments/{id}/makeup-request")
def request_makeup(
    id: UUID,
    data: MakeupRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["student"]))
):
    service = AssessmentService(db)
    req = service.request_makeup(current_user.id, id, data)
    return {"id": req.id, "message": "Makeup request submitted"}

@router.post("/assessments/makeup-requests/{request_id}/review")
def review_makeup_request(
    request_id: UUID,
    data: MakeupRequestReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin"]))
):
    service = AssessmentService(db)
    req = service.review_makeup_request(request_id, current_user.id, data)
    return {"id": req.id, "message": f"Makeup request {data.status}"}

@router.get("/assessments/makeup-requests")
def list_makeup_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin"]))
):
    from app.models.assessment import MakeupRequest, StudentAssessment, Assessment
    from sqlalchemy.orm import joinedload
    
    requests = db.query(MakeupRequest).options(
        joinedload(MakeupRequest.student_assessment).joinedload(StudentAssessment.student),
        joinedload(MakeupRequest.student_assessment).joinedload(StudentAssessment.assessment)
    ).order_by(MakeupRequest.requested_at.desc()).all()
    
    return [
        {
            "id": r.id,
            "student_name": r.student_assessment.student.full_name,
            "student_admission_no": getattr(r.student_assessment.student, 'admission_number', None) or 'N/A',
            "assessment_name": r.student_assessment.assessment.name,
            "requested_at": r.requested_at,
            "reason": r.reason,
            "status": r.status,
            "makeup_start_at": r.student_assessment.makeup_start_at,
            "makeup_end_at": r.student_assessment.makeup_end_at
        }
        for r in requests
    ]

@router.get("/assessments/my-assignments")
def get_my_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["student"]))
):
    from app.models.assessment import StudentAssessment, MakeupRequest
    from sqlalchemy.orm import joinedload
    sas = db.query(StudentAssessment).options(joinedload(StudentAssessment.assessment), joinedload(StudentAssessment.makeup_requests)).filter(
        StudentAssessment.student_id == current_user.id
    ).all()
    
    return [
        {
            "id": sa.assessment.id,
            "student_assessment_id": sa.id,
            "name": sa.assessment.name,
            "type": sa.assessment.type,
            "question_count": len(sa.assessment.questions),
            "duration_minutes": sa.assessment.duration_minutes,
            "passing_score": sa.assessment.passing_score,
            "status": sa.status,
            "score": sa.score,
            "release_results_at": sa.assessment.release_results_at,
            "makeup_request": {
                "status": sa.makeup_requests[0].status if sa.makeup_requests else None
            } if sa.makeup_requests else None,
            "makeup_start_at": sa.makeup_start_at,
            "makeup_end_at": sa.makeup_end_at
        }
        for sa in sas
    ]

@router.delete("/assessments/{assessment_id}")
def delete_assessment(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin"]))
):
    from fastapi import HTTPException
    a = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # cascade delete will handle related StudentAssessment, MakeupRequest, etc. if foreign keys have CASCADE
    # let's just delete the assessment
    db.delete(a)
    db.commit()
    return {"message": "Assessment deleted"}

@router.get("/assessments/{assessment_id}/performance")
def get_assessment_performance(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin"]))
):
    from app.models.assessment import StudentAssessment, Assessment
    from sqlalchemy.orm import joinedload
    
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    student_assessments = db.query(StudentAssessment).options(joinedload(StudentAssessment.student)).filter(
        StudentAssessment.assessment_id == assessment_id
    ).all()
    
    results = []
    total_score = 0
    scored_count = 0
    passed_count = 0
    
    for sa in student_assessments:
        if sa.score is not None:
            total_score += sa.score
            scored_count += 1
            if sa.score >= assessment.passing_score:
                passed_count += 1
                
        results.append({
            "student_assessment_id": sa.id,
            "student_id": sa.student_id,
            "student_name": sa.student.full_name if sa.student else "Unknown",
            "admission_number": getattr(sa.student, 'admission_number', 'N/A'),
            "status": sa.status,
            "score": sa.score,
        })
        
    return {
        "assessment_name": assessment.name,
        "total_students": len(student_assessments),
        "scored_students": scored_count,
        "average_score": (total_score / scored_count) if scored_count > 0 else 0,
        "pass_rate": (passed_count / scored_count * 100) if scored_count > 0 else 0,
        "release_results_at": assessment.release_results_at,
        "students": results
    }

@router.post("/assessments/{assessment_id}/publish")
def publish_results(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin"]))
):
    from datetime import datetime, timezone
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    assessment.release_results_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Results published successfully"}

@router.get("/assessments/{assessment_id}/questions")
def get_assessment_questions(
    assessment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["student"]))
):
    assessment_questions = db.query(AssessmentQuestion).filter(
        AssessmentQuestion.assessment_id == assessment_id
    ).all()
    
    questions = []
    for aq in assessment_questions:
        question = aq.question
        questions.append({
            "id": question.id,
            "text": question.text,
            "options": question.options,
            "difficulty": question.difficulty,
            "explanation": question.explanation
        })
    
    return questions

@router.post("/assessments/{id}/attempts", response_model=AssessmentAttemptResponse, status_code=status.HTTP_201_CREATED)
def start_assessment_attempt(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["student"]))
):
    service = AssessmentService(db)
    return service.start_attempt(current_user.id, id)

@router.get("/attempts/{attempt_id}", response_model=AssessmentAttemptDetailResponse)
def get_attempt_details(
    attempt_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["student", "mentor", "admin", "super_admin", "academic_coordinator"]))
):
    service = AssessmentService(db)
    return service.get_attempt(attempt_id)

@router.post("/attempts/{attempt_id}/submit", response_model=AssessmentAttemptResponse)
def submit_assessment_attempt(
    attempt_id: UUID,
    submission: AssessmentSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["student"]))
):
    service = AssessmentService(db)
    return service.submit_attempt(attempt_id, submission, current_user.id)
