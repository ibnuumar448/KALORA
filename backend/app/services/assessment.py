from sqlalchemy.orm import Session
from fastapi import HTTPException
from uuid import UUID
from typing import List
from datetime import datetime, timezone
from app.models.assessment import Assessment, AssessmentAttempt, AttemptAnswer, QuestionBank, AssessmentQuestion, AttemptStatus, StudentAssessment, StudentAssessmentStatus, MakeupRequest, MakeupRequestStatus
from app.models.progress import TopicMastery
from app.models.admission import Application, ApplicationStatus
from app.schemas.assessment import AssessmentSubmitRequest, AssessmentCreateBase, MakeupRequestCreate, MakeupRequestReview

class AssessmentService:
    def __init__(self, db: Session):
        self.db = db

    def create_assessment(self, data: AssessmentCreateBase) -> Assessment:
        a = Assessment(
            name=data.name,
            type=data.type,
            passing_score=data.passing_score,
            duration_minutes=data.duration_minutes,
            topic_id=data.topic_id,
            module_id=data.module_id,
            cohort_id=data.cohort_id,
            start_date=data.start_date,
            end_date=data.end_date,
            release_results_at=data.release_results_at,
            is_active=True
        )
        self.db.add(a)
        self.db.flush() # flush to get the assessment id

        # Add questions
        for idx, qid in enumerate(data.question_ids):
            aq = AssessmentQuestion(
                assessment_id=a.id,
                question_id=qid,
                order_index=idx
            )
            self.db.add(aq)

        # Enrol students based on cohort
        app_query = self.db.query(Application).filter(Application.status == ApplicationStatus.accepted)
        if data.cohort_id:
            app_query = app_query.filter(Application.cohort_id == data.cohort_id)
            
        apps = app_query.all()
        enrolled_student_ids = set()
        
        for app in apps:
            if app.user_id in enrolled_student_ids:
                continue
            enrolled_student_ids.add(app.user_id)
            
            sa = StudentAssessment(
                student_id=app.user_id,
                assessment_id=a.id,
                status=StudentAssessmentStatus.not_started
            )
            self.db.add(sa)
        
        self.db.commit()
        self.db.refresh(a)
        return a

    def start_attempt(self, student_id: UUID, assessment_id: UUID) -> AssessmentAttempt:
        assessment = self.db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")

        # Enforce single attempt rule
        existing_attempt = self.db.query(AssessmentAttempt).filter(
            AssessmentAttempt.student_id == student_id,
            AssessmentAttempt.assessment_id == assessment_id
        ).first()
        
        if existing_attempt:
            raise HTTPException(status_code=400, detail="You have already started or completed this assessment.")

        # Create attempt
        attempt = AssessmentAttempt(
            student_id=student_id,
            assessment_id=assessment_id,
            status=AttemptStatus.in_progress
        )
        self.db.add(attempt)
        self.db.commit()
        self.db.refresh(attempt)

        return attempt

    def get_attempt(self, attempt_id: UUID) -> AssessmentAttempt:
        attempt = self.db.query(AssessmentAttempt).filter(AssessmentAttempt.id == attempt_id).first()
        if not attempt:
            raise HTTPException(status_code=404, detail="Attempt not found")
        return attempt

    def submit_attempt(self, attempt_id: UUID, submission: AssessmentSubmitRequest, student_id: UUID) -> AssessmentAttempt:
        attempt = self.get_attempt(attempt_id)
        if attempt.student_id != student_id:
            raise HTTPException(status_code=403, detail="Not authorized to submit this attempt")
        if attempt.status != AttemptStatus.in_progress:
            raise HTTPException(status_code=400, detail="Attempt is already completed or abandoned")

        correct_count = 0
        total_questions = len(submission.answers)

        for ans in submission.answers:
            # Check correct answer from question bank
            question = self.db.query(QuestionBank).filter(QuestionBank.id == ans.question_id).first()
            if not question:
                continue

            is_correct = (question.correct_answer == ans.selected_answer)
            if is_correct:
                correct_count += 1

            attempt_ans = AttemptAnswer(
                attempt_id=attempt.id,
                question_id=ans.question_id,
                selected_answer=ans.selected_answer,
                is_correct=is_correct
            )
            self.db.add(attempt_ans)

        # Calculate score
        score = (correct_count / total_questions * 100) if total_questions > 0 else 0.0

        attempt.score = score
        attempt.status = AttemptStatus.completed
        attempt.completed_at = datetime.now(timezone.utc)
        
        # Sync to StudentAssessment
        student_assessment = self.db.query(StudentAssessment).filter(
            StudentAssessment.student_id == student_id,
            StudentAssessment.assessment_id == attempt.assessment_id
        ).first()
        if student_assessment:
            student_assessment.score = score
            student_assessment.status = StudentAssessmentStatus.submitted
            
        self.db.commit()
        self.db.refresh(attempt)

        # Update Topic Mastery if assessment is linked to a topic
        if attempt.assessment.topic_id:
            self._update_topic_mastery(student_id, attempt.assessment.topic_id, score)

        return attempt

    def _update_topic_mastery(self, student_id: UUID, topic_id: UUID, latest_score: float):
        mastery = self.db.query(TopicMastery).filter(
            TopicMastery.student_id == student_id,
            TopicMastery.topic_id == topic_id
        ).first()

        if not mastery:
            mastery = TopicMastery(
                student_id=student_id,
                topic_id=topic_id,
                mastery_score=latest_score,
                last_assessed_at=datetime.now(timezone.utc)
            )
            self.db.add(mastery)
        else:
            # Simple moving average for MVP
            mastery.mastery_score = (mastery.mastery_score + latest_score) / 2
            mastery.last_assessed_at = datetime.now(timezone.utc)
        self.db.commit()

    def request_makeup(self, student_id: UUID, assessment_id: UUID, data: MakeupRequestCreate) -> MakeupRequest:
        sa = self.db.query(StudentAssessment).filter(
            StudentAssessment.student_id == student_id,
            StudentAssessment.assessment_id == assessment_id
        ).first()
        
        if not sa:
            raise HTTPException(status_code=404, detail="Student is not assigned to this assessment")
            
        if sa.status != StudentAssessmentStatus.missed:
            raise HTTPException(status_code=400, detail="Can only request makeup for missed assessments")
            
        # Check if pending already exists
        existing = self.db.query(MakeupRequest).filter(
            MakeupRequest.student_assessment_id == sa.id,
            MakeupRequest.status == MakeupRequestStatus.pending
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="A makeup request is already pending")
            
        req = MakeupRequest(
            student_assessment_id=sa.id,
            reason=data.reason,
            status=MakeupRequestStatus.pending
        )
        self.db.add(req)
        self.db.commit()
        self.db.refresh(req)
        return req

    def review_makeup_request(self, request_id: UUID, admin_id: UUID, data: MakeupRequestReview) -> MakeupRequest:
        req = self.db.query(MakeupRequest).filter(MakeupRequest.id == request_id).first()
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
            
        if req.status != MakeupRequestStatus.pending:
            raise HTTPException(status_code=400, detail="Request is already reviewed")
            
        req.status = data.status
        req.reviewed_by_id = admin_id
        req.reviewed_at = datetime.now(timezone.utc)
        
        if data.status == MakeupRequestStatus.approved:
            if not data.makeup_start_at or not data.makeup_end_at:
                raise HTTPException(status_code=400, detail="Must provide makeup window when approving")
                
            sa = req.student_assessment
            sa.status = StudentAssessmentStatus.makeup_approved
            sa.makeup_start_at = data.makeup_start_at
            sa.makeup_end_at = data.makeup_end_at
            
        self.db.commit()
        self.db.refresh(req)
        return req
