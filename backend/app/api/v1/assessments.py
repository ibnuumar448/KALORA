from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.api.deps import RequireRole, get_current_user
from app.core.database import get_db
from app.models.assessment import Assessment, AssessmentQuestion, AssessmentStatus, MakeupRequest, QuestionBank, StudentAssessment
from app.models.curriculum import Subject, Topic, Module
from app.models.user import User
from app.schemas.assessment import (
    AssessmentCreateBase,
    AnswerSaveRequest,
    AssessmentSubmitRequest,
    MakeupRequestCreate,
    MakeupRequestReview,
    QuestionCreate,
    QuestionUpdate,
)
from app.services.assessment import AssessmentService

router = APIRouter(prefix="", tags=["assessments"])


def _service(db: Session) -> AssessmentService:
    return AssessmentService(db)


@router.get("/question-bank")
def list_question_bank(subject_id: Optional[UUID] = None, topic_id: Optional[UUID] = None,
                      db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    query = db.query(QuestionBank).options(joinedload(QuestionBank.subject), joinedload(QuestionBank.topic))
    if subject_id:
        query = query.filter(QuestionBank.subject_id == subject_id)
    if topic_id:
        query = query.filter(QuestionBank.topic_id == topic_id)
    return [{"id": q.id, "text": q.text, "options": q.options, "correct_answer": q.correct_answer,
             "explanation": q.explanation, "difficulty": q.difficulty, "subject_id": q.subject_id,
             "subject_name": q.subject.name if q.subject else None, "topic_id": q.topic_id,
             "topic_name": q.topic.name if q.topic else None} for q in query.order_by(QuestionBank.created_at.desc()).all()]


@router.post("/question-bank", status_code=status.HTTP_201_CREATED)
def create_question(data: QuestionCreate, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    return _save_question(db, data)


def _save_question(db: Session, data):
    subject = db.query(Subject).filter(Subject.id == data.subject_id).first()
    if not subject:
        raise HTTPException(status_code=400, detail="Subject not found")
    topic = None
    if data.topic_id:
        topic = db.query(Topic).join(Module).filter(Topic.id == data.topic_id, Module.subject_id == data.subject_id).first()
        if not topic:
            raise HTTPException(status_code=400, detail="Topic must belong to the selected subject")
    ids = [option.id for option in data.options]
    if len(ids) != len(set(ids)) or data.correct_answer not in ids:
        raise HTTPException(status_code=400, detail="Options must have unique IDs and include the correct answer")
    question = QuestionBank(subject_id=data.subject_id, topic_id=data.topic_id, text=data.text.strip(),
                            options=[option.model_dump() for option in data.options], correct_answer=data.correct_answer,
                            explanation=data.explanation, difficulty=data.difficulty)
    db.add(question)
    db.commit()
    db.refresh(question)
    return {"id": question.id, "message": "Question saved"}


@router.put("/question-bank/{question_id}")
def update_question(question_id: UUID, data: QuestionUpdate, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    # Questions linked to published assessments are immutable to preserve historical scoring.
    published_link = db.query(AssessmentQuestion).join(Assessment).filter(
        AssessmentQuestion.question_id == question_id, Assessment.status != AssessmentStatus.draft.value
    ).first()
    if published_link:
        raise HTTPException(status_code=409, detail="Questions used in published assessments cannot be edited")
    subject = db.query(Subject).filter(Subject.id == data.subject_id).first()
    if not subject:
        raise HTTPException(status_code=400, detail="Subject not found")
    if data.topic_id and not db.query(Topic).join(Module).filter(Topic.id == data.topic_id, Module.subject_id == data.subject_id).first():
        raise HTTPException(status_code=400, detail="Topic must belong to the selected subject")
    option_ids = [option.id for option in data.options]
    if len(option_ids) != len(set(option_ids)) or data.correct_answer not in option_ids:
        raise HTTPException(status_code=400, detail="Options must have unique IDs and include the correct answer")
    question.subject_id, question.topic_id, question.text = data.subject_id, data.topic_id, data.text.strip()
    question.options = [option.model_dump() for option in data.options]
    question.correct_answer, question.explanation, question.difficulty = data.correct_answer, data.explanation, data.difficulty
    db.commit()
    return {"id": question.id, "message": "Question updated"}


class BulkQuestionItem(BaseModel):
    subject: str
    text: str
    options: list[dict]
    correct_answer: str
    difficulty: Optional[str] = "medium"
    topic: Optional[str] = None


class BulkUploadRequest(BaseModel):
    questions: list[BulkQuestionItem]


@router.post("/question-bank/bulk-upload", status_code=status.HTTP_201_CREATED)
def bulk_upload_questions(data: BulkUploadRequest, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    subjects = {subject.name.casefold(): subject for subject in db.query(Subject).all()}
    questions = []
    for row_number, item in enumerate(data.questions, start=1):
        subject = subjects.get(item.subject.casefold())
        if not subject:
            raise HTTPException(status_code=400, detail=f"Row {row_number}: unknown subject '{item.subject}'")
        options = item.options
        if len(options) < 2 or any(not option.get("id") or not option.get("text") for option in options):
            raise HTTPException(status_code=400, detail=f"Row {row_number}: every option needs an id and text")
        option_ids = [str(option["id"]) for option in options]
        if len(option_ids) != len(set(option_ids)) or item.correct_answer not in option_ids:
            raise HTTPException(status_code=400, detail=f"Row {row_number}: correct answer must match one unique option id")
        topic = None
        if item.topic:
            topic = db.query(Topic).join(Module).filter(Topic.name.ilike(item.topic), Module.subject_id == subject.id).first()
            if not topic:
                raise HTTPException(status_code=400, detail=f"Row {row_number}: topic not found for subject")
        questions.append(QuestionBank(subject_id=subject.id, topic_id=topic.id if topic else None,
                                      text=item.text.strip(), options=options, correct_answer=item.correct_answer,
                                      difficulty=item.difficulty))
    db.add_all(questions)
    db.commit()
    return {"message": f"Successfully uploaded {len(questions)} questions"}


class BulkDeleteRequest(BaseModel):
    question_ids: Optional[list[UUID]] = None
    subject_id: Optional[UUID] = None
    delete_all: bool = False


@router.post("/question-bank/bulk-delete")
def bulk_delete_questions(data: BulkDeleteRequest, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    query = db.query(QuestionBank)
    if data.delete_all:
        pass
    elif data.subject_id:
        query = query.filter(QuestionBank.subject_id == data.subject_id)
    elif data.question_ids:
        query = query.filter(QuestionBank.id.in_(data.question_ids))
    else:
        return {"message": "No delete criteria provided"}
    linked = db.query(AssessmentQuestion).join(Assessment).filter(
        AssessmentQuestion.question_id.in_(query.with_entities(QuestionBank.id)), Assessment.status != AssessmentStatus.draft.value
    ).first()
    if linked:
        raise HTTPException(status_code=409, detail="Questions used in published assessments cannot be deleted")
    count = query.delete(synchronize_session=False)
    db.commit()
    return {"message": f"Successfully deleted {count} questions"}


@router.delete("/question-bank/{question_id}")
def delete_question(question_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    return bulk_delete_questions(BulkDeleteRequest(question_ids=[question_id]), db, current_user)


@router.get("/assessments")
def list_assessments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if any(role.name in ["admin", "super_admin"] for role in current_user.roles):
        rows = db.query(Assessment).order_by(Assessment.created_at.desc()).all()
        return [{"id": row.id, "name": row.name, "type": row.type, "status": row.status,
                 "passing_score": row.passing_score, "duration_minutes": row.duration_minutes,
                 "subject_id": row.subject_id, "subject_name": row.subject.name if row.subject else None,
                 "cohort_id": row.cohort_id,
                 "release_results_at": row.release_results_at,
                 "question_count": len(row.questions)} for row in rows]
    if any(role.name == "student" for role in current_user.roles):
        return _service(db).list_assignments(current_user.id)
    return []


@router.post("/assessments", status_code=status.HTTP_201_CREATED)
def create_assessment(data: AssessmentCreateBase, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    assessment = _service(db).create_assessment(data)
    return {"id": assessment.id, "status": assessment.status, "message": "Assessment draft saved"}


@router.get("/assessments/{assessment_id}/current-attempt")
def get_current_attempt(assessment_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["student"]))):
    attempt = _service(db).get_current_attempt(current_user.id, assessment_id)
    if not attempt:
        return {"attempt": None}
    return {"attempt": _service(db).get_attempt_payload(attempt)}


@router.put("/assessments/{assessment_id}")
def update_assessment(assessment_id: UUID, data: AssessmentCreateBase, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    assessment = _service(db).update_assessment(assessment_id, data)
    return {"id": assessment.id, "status": assessment.status, "message": "Draft updated"}


@router.post("/assessments/{assessment_id}/publish")
def publish_assessment(assessment_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    assessment = _service(db).publish_assessment(assessment_id)
    return {"id": assessment.id, "status": assessment.status, "message": "Assessment published"}


@router.post("/assessments/{assessment_id}/release-results")
def release_results(assessment_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    service = _service(db)
    assessment = service._get_assessment(assessment_id)
    if assessment.status == AssessmentStatus.draft.value:
        raise HTTPException(status_code=409, detail="Publish the assessment before releasing results")
    assessment.release_results_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Results released", "release_results_at": assessment.release_results_at}


@router.post("/assessments/{assessment_id}/close")
def close_assessment(assessment_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    assessment = _service(db).close_assessment(assessment_id)
    return {"id": assessment.id, "status": assessment.status, "message": "Assessment closed"}


@router.get("/assessments/my-assignments")
def get_my_assignments(db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["student"]))):
    return _service(db).list_assignments(current_user.id)


@router.post("/assessments/{assessment_id}/mark-missed")
def mark_missed_assessments(assessment_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    _service(db).mark_missed_assignments(assessment_id)
    return {"message": "Expired not-started assignments marked missed"}


@router.get("/assessments/makeup-requests")
def list_makeup_requests(db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    rows = db.query(MakeupRequest).options(joinedload(MakeupRequest.student_assessment).joinedload(StudentAssessment.student),
                                           joinedload(MakeupRequest.student_assessment).joinedload(StudentAssessment.assessment)).order_by(MakeupRequest.requested_at.desc()).all()
    return [{"id": row.id, "student_name": row.student_assessment.student.full_name,
             "student_admission_no": getattr(row.student_assessment.student, "admission_number", None) or "N/A",
             "assessment_name": row.student_assessment.assessment.name, "requested_at": row.requested_at,
             "reason": row.reason, "status": row.status, "makeup_start_at": row.student_assessment.makeup_start_at,
             "makeup_end_at": row.student_assessment.makeup_end_at} for row in rows]


@router.get("/assessments/{assessment_id}")
def get_assessment(assessment_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    return _service(db).assessment_details(assessment_id)


@router.delete("/assessments/{assessment_id}")
def delete_assessment(assessment_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    service = _service(db)
    assessment = service._get_assessment(assessment_id)
    if assessment.status != AssessmentStatus.draft.value:
        raise HTTPException(status_code=409, detail="Published assessments cannot be deleted; close them to preserve results")
    if db.query(StudentAssessment).filter(StudentAssessment.assessment_id == assessment_id).first():
        raise HTTPException(status_code=409, detail="Draft has student records and cannot be deleted")
    db.delete(assessment)
    db.commit()
    return {"message": "Draft deleted"}


@router.post("/assessments/{assessment_id}/makeup-request")
def request_makeup(assessment_id: UUID, data: MakeupRequestCreate, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["student"]))):
    request = _service(db).request_makeup(current_user.id, assessment_id, data)
    return {"id": request.id, "message": "Makeup request submitted"}


@router.post("/assessments/makeup-requests/{request_id}/review")
def review_makeup_request(request_id: UUID, data: MakeupRequestReview, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    request = _service(db).review_makeup_request(request_id, current_user.id, data)
    return {"id": request.id, "message": f"Makeup request {data.status}"}


@router.get("/assessments/{assessment_id}/performance")
def get_assessment_performance(assessment_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["admin", "super_admin"]))):
    assessment = _service(db)._get_assessment(assessment_id)
    rows = db.query(StudentAssessment).options(joinedload(StudentAssessment.student)).filter(StudentAssessment.assessment_id == assessment_id).all()
    scored = [row.score for row in rows if row.score is not None]
    return {"assessment_name": assessment.name, "total_students": len(rows), "scored_students": len(scored),
            "average_score": sum(scored) / len(scored) if scored else 0,
            "pass_rate": sum(score >= assessment.passing_score for score in scored) / len(scored) * 100 if scored else 0,
            "release_results_at": assessment.release_results_at,
            "students": [{"student_assessment_id": row.id, "student_id": row.student_id,
                          "student_name": row.student.full_name if row.student else "Unknown",
                          "admission_number": getattr(row.student, "admission_number", "N/A"),
                          "cohort_id": assessment.cohort_id,
                          "status": row.status, "score": row.score,
                          "passed": row.score is not None and row.score >= assessment.passing_score,
                          "result": "Passed" if row.score is not None and row.score >= assessment.passing_score else "Failed" if row.score is not None else None} for row in rows]}


class AttemptStartRequest(BaseModel):
    is_makeup: bool = False


@router.post("/assessments/{assessment_id}/attempts")
def start_attempt(assessment_id: UUID, data: AttemptStartRequest, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["student"]))):
    service = _service(db)
    attempt = service.get_or_start_attempt(current_user.id, assessment_id, is_makeup=data.is_makeup)
    return service.get_attempt_payload(attempt)


@router.get("/attempts/{attempt_id}")
def get_attempt(attempt_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["student"]))):
    service = _service(db)
    attempt = service.get_attempt_for_student(attempt_id, current_user.id)
    return service.get_attempt_payload(attempt)


@router.put("/attempts/{attempt_id}/answers/{question_id}")
def save_answer(attempt_id: UUID, question_id: UUID, data: AnswerSaveRequest, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["student"]))):
    service = _service(db)
    attempt = service.save_answer(attempt_id, current_user.id, question_id, data.selected_answer)
    return {"attempt_id": attempt.id, "question_id": question_id, "saved": True}


@router.post("/attempts/{attempt_id}/submit")
def submit_attempt(attempt_id: UUID, data: AssessmentSubmitRequest, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["student"]))):
    service = _service(db)
    attempt = service.submit_attempt(attempt_id, current_user.id, data.answers)
    return service.get_attempt_payload(attempt)


@router.get("/assessments/{assessment_id}/results")
def get_student_result(assessment_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["student"]))):
    return _service(db).student_result(current_user.id, assessment_id)


@router.get("/assessments/mentors/me/assessment-results")
def get_my_mentee_assessments(db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["mentor"]))):
    return _service(db).mentor_students(current_user.id)


@router.get("/assessments/mentors/me/students/{student_id}/assessment-history")
def get_mentee_assessment_history(student_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(RequireRole(["mentor"]))):
    return _service(db).mentor_student_history(current_user.id, student_id)
