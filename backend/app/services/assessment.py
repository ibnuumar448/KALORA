from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.admission import Application, ApplicationStatus
from app.models.assessment import (
    Assessment,
    AssessmentAttempt,
    AssessmentQuestion,
    AssessmentStatus,
    AssessmentTopic,
    AttemptAnswer,
    AttemptStatus,
    MakeupRequest,
    MakeupRequestStatus,
    QuestionBank,
    StudentAssessment,
    StudentAssessmentStatus,
)
from app.models.curriculum import Module, Subject, Topic
from app.models.mentorship import MentorAssignment
from app.models.progress import TopicMastery
from app.models.rbac import Role, UserRole
from app.models.user import User
from app.schemas.assessment import AssessmentCreateBase, MakeupRequestCreate, MakeupRequestReview


class AssessmentService:
    def __init__(self, db: Session):
        self.db = db

    def _now(self) -> datetime:
        return datetime.now(timezone.utc)

    def _get_assessment(self, assessment_id: UUID) -> Assessment:
        assessment = self.db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        return assessment

    def _assignment(self, student_id: UUID, assessment_id: UUID) -> StudentAssessment:
        assignment = self.db.query(StudentAssessment).filter(
            StudentAssessment.student_id == student_id,
            StudentAssessment.assessment_id == assessment_id,
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="Assessment is not assigned to this student")
        return assignment

    def _scheduled_window(self, assessment: Assessment, assignment: StudentAssessment, is_makeup: bool = False):
        now = self._now()
        if assessment.status != AssessmentStatus.published.value or not assessment.is_active:
            raise HTTPException(status_code=403, detail="Assessment is not available")
        start_at = assignment.makeup_start_at if is_makeup else assessment.start_date
        end_at = assignment.makeup_end_at if is_makeup else assessment.end_date
        if is_makeup and (start_at is None or end_at is None):
            raise HTTPException(status_code=403, detail="No approved makeup window")
        if start_at and now < start_at:
            raise HTTPException(status_code=403, detail="Assessment is not available yet")
        if end_at and now >= end_at:
            raise HTTPException(status_code=403, detail="Assessment availability window has closed")

    def create_assessment(self, data: AssessmentCreateBase) -> Assessment:
        if not data.cohort_id:
            raise HTTPException(status_code=400, detail="Select a target cohort")
        question_ids = list(dict.fromkeys(data.question_ids))
        if len(question_ids) != len(data.question_ids):
            raise HTTPException(status_code=400, detail="Question selection contains duplicates")
        questions = self.db.query(QuestionBank).filter(QuestionBank.id.in_(question_ids)).all() if question_ids else []
        if len(questions) != len(question_ids):
            raise HTTPException(status_code=400, detail="One or more selected questions do not exist")

        subject_id = data.subject_id
        if subject_id:
            subject = self.db.query(Subject).filter(Subject.id == subject_id).first()
            if not subject:
                raise HTTPException(status_code=400, detail="Subject not found")
        elif questions:
            subject_id = questions[0].subject_id

        if any(question.subject_id != subject_id for question in questions):
            raise HTTPException(status_code=400, detail="All questions must belong to the selected subject")

        topic_ids = list(dict.fromkeys(data.topic_ids or ([data.topic_id] if data.topic_id else [])))
        topics = self.db.query(Topic).join(Module).filter(
            Topic.id.in_(topic_ids), Module.subject_id == subject_id
        ).all() if topic_ids else []
        if len(topics) != len(topic_ids):
            raise HTTPException(status_code=400, detail="Topics must belong to the selected subject")
        if topic_ids and any(question.topic_id not in topic_ids for question in questions):
            raise HTTPException(status_code=400, detail="Selected questions must match the assessment topics")
        if data.start_date and data.end_date and data.end_date <= data.start_date:
            raise HTTPException(status_code=400, detail="End time must be after start time")
        if data.end_date and data.release_results_at and data.release_results_at < data.end_date:
            raise HTTPException(status_code=400, detail="Results cannot be scheduled before the assessment closes")
        if not 0 <= data.passing_score <= 100:
            raise HTTPException(status_code=400, detail="Passing score must be between 0 and 100")
        if data.duration_minutes is not None and data.duration_minutes < 1:
            raise HTTPException(status_code=400, detail="Duration must be at least one minute")

        assessment = Assessment(
            name=data.name.strip(), type=data.type, passing_score=data.passing_score,
            duration_minutes=data.duration_minutes, subject_id=subject_id,
            topic_id=topic_ids[0] if topic_ids else None, module_id=data.module_id,
            cohort_id=data.cohort_id, start_date=data.start_date, end_date=data.end_date,
            release_results_at=data.release_results_at, status=AssessmentStatus.draft.value,
            is_active=True,
        )
        self.db.add(assessment)
        self.db.flush()
        for index, question_id in enumerate(question_ids):
            self.db.add(AssessmentQuestion(assessment_id=assessment.id, question_id=question_id, order_index=index))
        for index, topic_id in enumerate(topic_ids):
            self.db.add(AssessmentTopic(assessment_id=assessment.id, topic_id=topic_id, order_index=index))
        self.db.commit()
        self.db.refresh(assessment)
        return assessment

    def update_assessment(self, assessment_id: UUID, data: AssessmentCreateBase) -> Assessment:
        assessment = self._get_assessment(assessment_id)
        if assessment.status != AssessmentStatus.draft.value:
            raise HTTPException(status_code=409, detail="Only draft assessments can be edited")
        if not data.cohort_id:
            raise HTTPException(status_code=400, detail="Select a target cohort")
        question_ids = list(dict.fromkeys(data.question_ids))
        questions = self.db.query(QuestionBank).filter(QuestionBank.id.in_(question_ids)).all() if question_ids else []
        if len(questions) != len(question_ids):
            raise HTTPException(status_code=400, detail="One or more selected questions do not exist")
        subject_id = data.subject_id or (questions[0].subject_id if questions else None)
        if any(question.subject_id != subject_id for question in questions):
            raise HTTPException(status_code=400, detail="All questions must belong to the selected subject")
        topic_ids = list(dict.fromkeys(data.topic_ids or ([data.topic_id] if data.topic_id else [])))
        topics = self.db.query(Topic).join(Module).filter(Topic.id.in_(topic_ids), Module.subject_id == subject_id).all() if topic_ids else []
        if len(topics) != len(topic_ids):
            raise HTTPException(status_code=400, detail="Topics must belong to the selected subject")
        if topic_ids and any(question.topic_id not in topic_ids for question in questions):
            raise HTTPException(status_code=400, detail="Selected questions must match the assessment topics")
        if data.start_date and data.end_date and data.end_date <= data.start_date:
            raise HTTPException(status_code=400, detail="End time must be after start time")
        if data.end_date and data.release_results_at and data.release_results_at < data.end_date:
            raise HTTPException(status_code=400, detail="Results cannot be scheduled before the assessment closes")
        if not 0 <= data.passing_score <= 100 or (data.duration_minutes is not None and data.duration_minutes < 1):
            raise HTTPException(status_code=400, detail="Invalid passing score or duration")

        for field in ("name", "type", "passing_score", "duration_minutes", "subject_id", "module_id", "cohort_id", "start_date", "end_date", "release_results_at"):
            setattr(assessment, field, getattr(data, field))
        assessment.name = data.name.strip()
        assessment.subject_id = subject_id
        assessment.topic_id = topic_ids[0] if topic_ids else None
        assessment.questions.clear()
        assessment.topics.clear()
        self.db.flush()
        for index, question_id in enumerate(question_ids):
            self.db.add(AssessmentQuestion(assessment_id=assessment.id, question_id=question_id, order_index=index))
        for index, topic_id in enumerate(topic_ids):
            self.db.add(AssessmentTopic(assessment_id=assessment.id, topic_id=topic_id, order_index=index))
        self.db.commit()
        self.db.refresh(assessment)
        return assessment

    def publish_assessment(self, assessment_id: UUID) -> Assessment:
        assessment = self.db.query(Assessment).filter(Assessment.id == assessment_id).with_for_update().first()
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        if assessment.status != AssessmentStatus.draft.value:
            raise HTTPException(status_code=409, detail="Only draft assessments can be published")
        if not assessment.questions:
            raise HTTPException(status_code=400, detail="Add at least one question before publishing")
        if not assessment.subject_id:
            raise HTTPException(status_code=400, detail="Select a subject before publishing")
        if not assessment.duration_minutes or assessment.duration_minutes < 1:
            raise HTTPException(status_code=400, detail="Set a valid duration before publishing")
        if not assessment.cohort_id:
            raise HTTPException(status_code=400, detail="Select a target cohort")
        if assessment.start_date and assessment.end_date and assessment.end_date <= assessment.start_date:
            raise HTTPException(status_code=400, detail="End time must be after start time")
        if assessment.end_date and assessment.release_results_at and assessment.release_results_at < assessment.end_date:
            raise HTTPException(status_code=400, detail="Results cannot be scheduled before the assessment closes")

        query = self.db.query(Application).filter(Application.status == ApplicationStatus.accepted)
        if assessment.cohort_id:
            query = query.filter(Application.cohort_id == assessment.cohort_id)
        students = {app.user_id for app in query.all() if app.user_id}
        existing = {row[0] for row in self.db.query(StudentAssessment.student_id).filter(StudentAssessment.assessment_id == assessment.id).all()}
        for student_id in students - existing:
            self.db.add(StudentAssessment(student_id=student_id, assessment_id=assessment.id, status=StudentAssessmentStatus.not_started))
        assessment.status = AssessmentStatus.published.value
        assessment.is_active = True
        self.db.commit()
        self.db.refresh(assessment)
        return assessment

    def close_assessment(self, assessment_id: UUID) -> Assessment:
        assessment = self._get_assessment(assessment_id)
        assessment.status = AssessmentStatus.closed.value
        assessment.is_active = False
        self.db.commit()
        return assessment

    def _finalize_attempt(self, attempt: AssessmentAttempt, auto: bool = False) -> AssessmentAttempt:
        assignment = self._assignment(attempt.student_id, attempt.assessment_id)
        questions = self.db.query(AssessmentQuestion).filter(AssessmentQuestion.assessment_id == attempt.assessment_id).all()
        question_ids = {item.question_id for item in questions}
        answers = self.db.query(AttemptAnswer).filter(AttemptAnswer.attempt_id == attempt.id).all()
        answer_by_question = {answer.question_id: answer for answer in answers}
        correct = 0
        for link in questions:
            answer = answer_by_question.get(link.question_id)
            if not answer:
                continue
            question = self.db.query(QuestionBank).filter(QuestionBank.id == link.question_id).first()
            answer.is_correct = bool(question and question.correct_answer == answer.selected_answer)
            correct += int(answer.is_correct)
        count = len(question_ids)
        score = (correct / count * 100) if count else 0.0
        now = self._now()
        attempt.score = score
        attempt.status = AttemptStatus.auto_submitted if auto else AttemptStatus.completed
        attempt.completed_at = now
        assignment.score = score
        assignment.status = StudentAssessmentStatus.makeup_submitted if attempt.is_makeup else (
            StudentAssessmentStatus.auto_submitted if auto else StudentAssessmentStatus.submitted
        )
        self.db.commit()
        self.db.refresh(attempt)
        if attempt.assessment.topic_id:
            mastery = self.db.query(TopicMastery).filter(
                TopicMastery.student_id == attempt.student_id,
                TopicMastery.topic_id == attempt.assessment.topic_id,
            ).first()
            if not mastery:
                mastery = TopicMastery(student_id=attempt.student_id, topic_id=attempt.assessment.topic_id, mastery_score=score, last_assessed_at=now)
                self.db.add(mastery)
            else:
                mastery.mastery_score = (mastery.mastery_score + score) / 2
                mastery.last_assessed_at = now
            self.db.commit()
        return attempt

    def _expire_if_needed(self, attempt: AssessmentAttempt) -> AssessmentAttempt:
        if attempt.status != AttemptStatus.in_progress:
            return attempt
        assessment = attempt.assessment
        now = self._now()
        deadline = attempt.started_at + timedelta(minutes=assessment.duration_minutes) if assessment.duration_minutes else None
        if attempt.is_makeup and attempt.student_id:
            assignment = self.db.query(StudentAssessment).filter(
                StudentAssessment.student_id == attempt.student_id,
                StudentAssessment.assessment_id == attempt.assessment_id,
            ).first()
            if assignment and assignment.makeup_end_at and (deadline is None or assignment.makeup_end_at < deadline):
                deadline = assignment.makeup_end_at
        if deadline and now >= deadline:
            return self._finalize_attempt(attempt, auto=True)
        return attempt

    def get_or_start_attempt(self, student_id: UUID, assessment_id: UUID, is_makeup: bool = False) -> AssessmentAttempt:
        assessment = self._get_assessment(assessment_id)
        assignment = self.db.query(StudentAssessment).filter(
            StudentAssessment.student_id == student_id,
            StudentAssessment.assessment_id == assessment_id,
        ).with_for_update().first()
        if not assignment:
            raise HTTPException(status_code=403, detail="Assessment is not assigned to this student")
        existing = self.db.query(AssessmentAttempt).filter(
            AssessmentAttempt.student_id == student_id,
            AssessmentAttempt.assessment_id == assessment_id,
            AssessmentAttempt.is_makeup == is_makeup,
        ).order_by(AssessmentAttempt.started_at.desc()).first()
        if existing:
            existing = self._expire_if_needed(existing)
            if existing.status == AttemptStatus.in_progress:
                return existing
            raise HTTPException(status_code=409, detail="This assessment attempt is already complete")
        if is_makeup:
            if assignment.status != StudentAssessmentStatus.makeup_approved:
                raise HTTPException(status_code=403, detail="No approved makeup attempt is available")
        elif assignment.status != StudentAssessmentStatus.not_started:
            raise HTTPException(status_code=409, detail="Assessment has already been attempted")
        self._scheduled_window(assessment, assignment, is_makeup)
        if not assessment.duration_minutes:
            raise HTTPException(status_code=400, detail="Assessment duration must be configured")
        attempt = AssessmentAttempt(student_id=student_id, assessment_id=assessment_id, status=AttemptStatus.in_progress, is_makeup=is_makeup)
        assignment.status = StudentAssessmentStatus.makeup_in_progress if is_makeup else StudentAssessmentStatus.in_progress
        self.db.add(attempt)
        self.db.commit()
        self.db.refresh(attempt)
        return attempt

    def get_current_attempt(self, student_id: UUID, assessment_id: UUID) -> Optional[AssessmentAttempt]:
        self._assignment(student_id, assessment_id)
        attempt = self.db.query(AssessmentAttempt).filter(
            AssessmentAttempt.student_id == student_id,
            AssessmentAttempt.assessment_id == assessment_id,
        ).order_by(AssessmentAttempt.started_at.desc()).first()
        if attempt:
            attempt = self._expire_if_needed(attempt)
            if attempt.status == AttemptStatus.in_progress:
                self._assignment(student_id, assessment_id)
        return attempt

    def get_attempt_for_student(self, attempt_id: UUID, student_id: UUID) -> AssessmentAttempt:
        attempt = self.db.query(AssessmentAttempt).filter(AssessmentAttempt.id == attempt_id).with_for_update().first()
        if not attempt:
            raise HTTPException(status_code=404, detail="Attempt not found")
        if attempt.student_id != student_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this attempt")
        self._assignment(student_id, attempt.assessment_id)
        return self._expire_if_needed(attempt)

    def get_attempt_payload(self, attempt: AssessmentAttempt, include_review: bool = False):
        attempt = self._expire_if_needed(attempt)
        links = self.db.query(AssessmentQuestion).filter(AssessmentQuestion.assessment_id == attempt.assessment_id).order_by(AssessmentQuestion.order_index).all()
        answers = {answer.question_id: answer for answer in attempt.answers}
        assessment = attempt.assessment
        now = self._now()
        deadline = attempt.started_at + timedelta(minutes=assessment.duration_minutes) if assessment.duration_minutes else None
        if attempt.is_makeup and attempt.student_id:
            assignment = self.db.query(StudentAssessment).filter(
                StudentAssessment.student_id == attempt.student_id,
                StudentAssessment.assessment_id == attempt.assessment_id,
            ).first()
            if assignment and assignment.makeup_end_at and (deadline is None or assignment.makeup_end_at < deadline):
                deadline = assignment.makeup_end_at
        released = not assessment.release_results_at or assessment.release_results_at <= now
        return {
            "id": attempt.id,
            "student_id": attempt.student_id,
            "assessment_id": attempt.assessment_id,
            "status": attempt.status,
            "score": attempt.score if released else None,
            "started_at": attempt.started_at,
            "completed_at": attempt.completed_at,
            "deadline_at": deadline,
            "remaining_seconds": max(0, int((deadline - now).total_seconds())) if deadline else None,
            "is_makeup": attempt.is_makeup,
            "questions": [
                {
                    "id": link.question.id,
                    "text": link.question.text,
                    "options": link.question.options,
                    "difficulty": link.question.difficulty,
                    "selected_answer": answers[link.question_id].selected_answer if link.question_id in answers and (attempt.status == AttemptStatus.in_progress or include_review) else None,
                    "is_correct": answers[link.question_id].is_correct if include_review and released and link.question_id in answers else None,
                    "correct_answer": link.question.correct_answer if include_review and released else None,
                    "explanation": link.question.explanation if include_review and released else None,
                } for link in links
            ],
        }

    def save_answer(self, attempt_id: UUID, student_id: UUID, question_id: UUID, selected_answer: str) -> AssessmentAttempt:
        attempt = self.get_attempt_for_student(attempt_id, student_id)
        if attempt.status != AttemptStatus.in_progress:
            raise HTTPException(status_code=409, detail="Attempt is no longer in progress")
        link = self.db.query(AssessmentQuestion).filter(
            AssessmentQuestion.assessment_id == attempt.assessment_id,
            AssessmentQuestion.question_id == question_id,
        ).first()
        if not link:
            raise HTTPException(status_code=400, detail="Question does not belong to this assessment")
        question = link.question
        valid_values = {str(option.get("id")) if isinstance(option, dict) else str(option) for option in (question.options or [])}
        if selected_answer not in valid_values:
            raise HTTPException(status_code=400, detail="Selected answer is not a valid option")
        answer = self.db.query(AttemptAnswer).filter(AttemptAnswer.attempt_id == attempt.id, AttemptAnswer.question_id == question_id).first()
        if answer:
            answer.selected_answer = selected_answer
            answer.is_correct = None
        else:
            self.db.add(AttemptAnswer(attempt_id=attempt.id, question_id=question_id, selected_answer=selected_answer))
        self.db.commit()
        return attempt

    def submit_attempt(self, attempt_id: UUID, student_id: UUID, answers: Optional[list] = None) -> AssessmentAttempt:
        attempt = self.get_attempt_for_student(attempt_id, student_id)
        if attempt.status != AttemptStatus.in_progress:
            if answers is None and attempt.status in (AttemptStatus.completed, AttemptStatus.auto_submitted):
                return attempt
            raise HTTPException(status_code=409, detail="Attempt is no longer available")
        if answers is not None:
            expected_ids = {row[0] for row in self.db.query(AssessmentQuestion.question_id).filter(AssessmentQuestion.assessment_id == attempt.assessment_id).all()}
            submitted_ids = [answer.question_id for answer in answers]
            if len(submitted_ids) != len(set(submitted_ids)):
                raise HTTPException(status_code=400, detail="Duplicate answers are not allowed")
            if set(submitted_ids) - expected_ids:
                raise HTTPException(status_code=400, detail="Submission contains a question outside this assessment")
            questions = {question.id: question for question in self.db.query(QuestionBank).filter(QuestionBank.id.in_(submitted_ids)).all()}
            for answer in answers:
                question = questions.get(answer.question_id)
                if not question:
                    raise HTTPException(status_code=400, detail="Submitted question does not exist")
                valid_values = {str(option.get("id")) if isinstance(option, dict) else str(option) for option in (question.options or [])}
                if answer.selected_answer not in valid_values:
                    raise HTTPException(status_code=400, detail="Selected answer is not a valid option")
            for answer in answers:
                saved = self.db.query(AttemptAnswer).filter(AttemptAnswer.attempt_id == attempt.id, AttemptAnswer.question_id == answer.question_id).first()
                if saved:
                    saved.selected_answer = answer.selected_answer
                    saved.is_correct = None
                else:
                    self.db.add(AttemptAnswer(attempt_id=attempt.id, question_id=answer.question_id, selected_answer=answer.selected_answer))
        return self._finalize_attempt(attempt)

    def list_assignments(self, student_id: UUID):
        assignments = self.db.query(StudentAssessment).options(joinedload(StudentAssessment.assessment), joinedload(StudentAssessment.makeup_requests)).filter(StudentAssessment.student_id == student_id).all()
        now = self._now()
        result = []
        for assignment in assignments:
            assessment = assignment.assessment
            if assignment.status == StudentAssessmentStatus.not_started and assessment.end_date and now >= assessment.end_date and assessment.status == AssessmentStatus.published.value:
                assignment.status = StudentAssessmentStatus.missed
            status = assignment.status.value if hasattr(assignment.status, "value") else assignment.status
            if status == StudentAssessmentStatus.not_started.value and assessment.end_date and now >= assessment.end_date and assessment.status == AssessmentStatus.published.value:
                status = StudentAssessmentStatus.missed.value
            latest_attempt = self.db.query(AssessmentAttempt).filter(
                AssessmentAttempt.student_id == student_id,
                AssessmentAttempt.assessment_id == assessment.id,
            ).order_by(AssessmentAttempt.started_at.desc()).first()
            if latest_attempt:
                latest_attempt = self._expire_if_needed(latest_attempt)
                if latest_attempt.status == AttemptStatus.in_progress:
                    status = StudentAssessmentStatus.makeup_in_progress.value if latest_attempt.is_makeup else StudentAssessmentStatus.in_progress.value
                elif latest_attempt.status in (AttemptStatus.completed, AttemptStatus.auto_submitted):
                    status = assignment.status.value if hasattr(assignment.status, "value") else assignment.status
            if assessment.status == AssessmentStatus.closed.value:
                display_status = "closed"
            elif status == StudentAssessmentStatus.not_started.value and assessment.start_date and now < assessment.start_date:
                display_status = "upcoming"
            elif status == StudentAssessmentStatus.not_started.value and assessment.status == AssessmentStatus.published.value:
                display_status = "available"
            else:
                display_status = status
            result.append({
                "id": assessment.id, "student_assessment_id": assignment.id, "name": assessment.name,
                "type": assessment.type, "subject_id": assessment.subject_id,
                "subject_name": assessment.subject.name if assessment.subject else None,
                "topic_id": assessment.topic_id, "topic_names": [item.topic.name for item in assessment.topics],
                "question_count": len(assessment.questions), "duration_minutes": assessment.duration_minutes,
                "passing_score": assessment.passing_score, "status": status, "display_status": display_status,
                "lifecycle_status": assessment.status,
                "attempt_id": latest_attempt.id if latest_attempt else None,
                "attempt_status": latest_attempt.status if latest_attempt else None,
                "score": assignment.score if not assessment.release_results_at or assessment.release_results_at <= now else None,
                "release_results_at": assessment.release_results_at,
                "start_date": assessment.start_date, "end_date": assessment.end_date,
                "makeup_start_at": assignment.makeup_start_at, "makeup_end_at": assignment.makeup_end_at,
                "makeup_request": {"status": assignment.makeup_requests[-1].status} if assignment.makeup_requests else None,
            })
        self.db.commit()
        return result

    def student_result(self, student_id: UUID, assessment_id: UUID):
        assignment = self._assignment(student_id, assessment_id)
        assessment = assignment.assessment
        now = self._now()
        attempt = self.db.query(AssessmentAttempt).filter(
            AssessmentAttempt.student_id == student_id, AssessmentAttempt.assessment_id == assessment_id,
        ).order_by(AssessmentAttempt.started_at.desc()).first()
        if not attempt or attempt.status == AttemptStatus.in_progress:
            raise HTTPException(status_code=409, detail="Assessment result is not available")
        if assessment.release_results_at and assessment.release_results_at > now:
            return {"released": False, "assessment_name": assessment.name, "release_results_at": assessment.release_results_at}
        payload = self.get_attempt_payload(attempt, include_review=True)
        answers = self.db.query(AttemptAnswer).filter(AttemptAnswer.attempt_id == attempt.id).all()
        correct = sum(bool(answer.is_correct) for answer in answers)
        question_count = self.db.query(AssessmentQuestion).filter(AssessmentQuestion.assessment_id == assessment_id).count()
        return {
            "released": True, "assessment_name": assessment.name, "passing_score": assessment.passing_score,
            "score": attempt.score, "passed": (attempt.score or 0) >= assessment.passing_score,
            "question_count": question_count, "answered_count": len(answers), "correct_count": correct,
            "incorrect_count": question_count - correct, "submitted_at": attempt.completed_at,
            "questions": payload["questions"],
        }

    def assessment_details(self, assessment_id: UUID):
        assessment = self._get_assessment(assessment_id)
        return {
            "id": assessment.id, "name": assessment.name, "type": assessment.type,
            "status": assessment.status, "subject_id": assessment.subject_id,
            "subject_name": assessment.subject.name if assessment.subject else None,
            "topic_ids": [item.topic_id for item in assessment.topics],
            "topic_names": [item.topic.name for item in assessment.topics],
            "cohort_id": assessment.cohort_id, "passing_score": assessment.passing_score,
            "duration_minutes": assessment.duration_minutes, "start_date": assessment.start_date,
            "end_date": assessment.end_date, "release_results_at": assessment.release_results_at,
            "question_ids": [item.question_id for item in assessment.questions],
            "questions": [{"id": item.question.id, "text": item.question.text, "options": item.question.options, "correct_answer": item.question.correct_answer} for item in assessment.questions],
            "question_count": len(assessment.questions),
        }

    def mark_missed_assignments(self, assessment_id: UUID):
        assessment = self._get_assessment(assessment_id)
        if assessment.status != AssessmentStatus.published.value or not assessment.end_date or self._now() < assessment.end_date:
            return
        self.db.query(StudentAssessment).filter(
            StudentAssessment.assessment_id == assessment_id,
            StudentAssessment.status == StudentAssessmentStatus.not_started,
        ).update({"status": StudentAssessmentStatus.missed}, synchronize_session="fetch")
        self.db.commit()

    def request_makeup(self, student_id: UUID, assessment_id: UUID, data: MakeupRequestCreate) -> MakeupRequest:
        assignment = self._assignment(student_id, assessment_id)
        if assignment.status == StudentAssessmentStatus.not_started and assignment.assessment.status == AssessmentStatus.published.value and assignment.assessment.end_date and self._now() >= assignment.assessment.end_date:
            assignment.status = StudentAssessmentStatus.missed
            self.db.commit()
        if assignment.status != StudentAssessmentStatus.missed:
            raise HTTPException(status_code=400, detail="Can only request makeup for missed assessments")
        existing = self.db.query(MakeupRequest).filter(MakeupRequest.student_assessment_id == assignment.id, MakeupRequest.status == MakeupRequestStatus.pending).first()
        if existing:
            raise HTTPException(status_code=400, detail="A makeup request is already pending")
        request = MakeupRequest(student_assessment_id=assignment.id, reason=data.reason, status=MakeupRequestStatus.pending)
        self.db.add(request)
        self.db.commit()
        self.db.refresh(request)
        return request

    def review_makeup_request(self, request_id: UUID, admin_id: UUID, data: MakeupRequestReview) -> MakeupRequest:
        request = self.db.query(MakeupRequest).filter(MakeupRequest.id == request_id).first()
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")
        if request.status != MakeupRequestStatus.pending:
            raise HTTPException(status_code=400, detail="Request is already reviewed")
        if data.status == MakeupRequestStatus.approved:
            if not data.makeup_start_at or not data.makeup_end_at or data.makeup_end_at <= data.makeup_start_at:
                raise HTTPException(status_code=400, detail="A valid makeup window is required")
            if request.student_assessment.assessment.status != AssessmentStatus.published.value:
                raise HTTPException(status_code=409, detail="Assessment is not published")
            request.student_assessment.status = StudentAssessmentStatus.makeup_approved
            request.student_assessment.makeup_start_at = data.makeup_start_at
            request.student_assessment.makeup_end_at = data.makeup_end_at
        request.status = data.status
        request.reviewed_by_id = admin_id
        request.reviewed_at = self._now()
        self.db.commit()
        self.db.refresh(request)
        return request

    def mentor_students(self, mentor_id: UUID):
        assignments = self.db.query(MentorAssignment).filter(MentorAssignment.mentor_id == mentor_id, MentorAssignment.status == "active").all()
        students = []
        for assignment in assignments:
            user = assignment.student
            rows = self.db.query(StudentAssessment).join(Assessment).filter(
                StudentAssessment.student_id == user.id,
                Assessment.type == "weekly",
                Assessment.status.in_([AssessmentStatus.published.value, AssessmentStatus.closed.value]),
            ).order_by(Assessment.start_date.desc().nullslast(), Assessment.created_at.desc()).all()
            latest = rows[0] if rows else None
            students.append({"student_id": user.id, "student_name": user.full_name, "latest_assessment": self._mentor_assignment_summary(latest) if latest else None})
        return students

    def _mentor_assignment_summary(self, assignment: StudentAssessment):
        if assignment.status == StudentAssessmentStatus.not_started and assignment.assessment.end_date and self._now() >= assignment.assessment.end_date and assignment.assessment.status == AssessmentStatus.published.value:
            assignment.status = StudentAssessmentStatus.missed
            self.db.commit()
        assessment = assignment.assessment
        result_released = not assessment.release_results_at or assessment.release_results_at <= self._now()
        score = assignment.score if result_released else None
        return {
            "assessment_id": assessment.id, "assessment_name": assessment.name,
            "status": assignment.status, "score": score,
            "passed": score >= assessment.passing_score if score is not None else None,
            "result_released": result_released,
            "submitted_at": self.db.query(AssessmentAttempt.completed_at).filter(
                AssessmentAttempt.student_id == assignment.student_id,
                AssessmentAttempt.assessment_id == assessment.id,
                AssessmentAttempt.completed_at.isnot(None),
            ).order_by(AssessmentAttempt.completed_at.desc()).limit(1).scalar(),
        }

    def mentor_student_history(self, mentor_id: UUID, student_id: UUID):
        active = self.db.query(MentorAssignment).filter(
            MentorAssignment.mentor_id == mentor_id, MentorAssignment.student_id == student_id,
            MentorAssignment.status == "active",
        ).first()
        if not active:
            raise HTTPException(status_code=404, detail="Assigned mentee not found")
        assignments = self.db.query(StudentAssessment).join(Assessment).filter(
            StudentAssessment.student_id == student_id, Assessment.type == "weekly",
            Assessment.status.in_([AssessmentStatus.published.value, AssessmentStatus.closed.value]),
        ).order_by(Assessment.start_date.asc().nullslast(), Assessment.created_at.asc()).all()
        return {"student_id": student_id, "student_name": active.student.full_name, "assessments": [self._mentor_assignment_summary(row) for row in assignments]}
