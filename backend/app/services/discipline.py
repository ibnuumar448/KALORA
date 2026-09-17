from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
from app.models.discipline import Default, Warning, Suspension, RiskFlag, WarningLevel, RiskLevel
from app.models.incentive import Scholarship, Certificate, Incentive, ScholarshipLevel, CertificateStatus
from app.models.progress import TopicMastery
from app.schemas.discipline import (
    LogDefaultRequest, LogWarningRequest, LogSuspensionRequest,
    StudentDisciplinaryStatus, DefaultResponse, WarningResponse, SuspensionResponse
)
from app.schemas.incentive import StudentIncentivesSummary, IncentiveResponse

class DisciplineService:
    """Service for managing student discipline records"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def log_default(self, student_id: UUID, cohort_id: UUID, request: LogDefaultRequest) -> DefaultResponse:
        """Record a default/infraction for a student"""
        default = Default(
            student_id=student_id,
            cohort_id=cohort_id,
            reason=request.reason,
            is_excused=request.is_excused,
            excused_reason=request.excused_reason
        )
        self.db.add(default)
        self.db.commit()
        self.db.refresh(default)
        
        # Update risk flag if needed
        self._update_risk_flag(student_id, cohort_id)
        
        return DefaultResponse.from_orm(default)
    
    def log_warning(self, student_id: UUID, cohort_id: UUID, request: LogWarningRequest) -> WarningResponse:
        """Issue a warning to a student"""
        warning = Warning(
            student_id=student_id,
            cohort_id=cohort_id,
            level=request.level,
            reason=request.reason
        )
        self.db.add(warning)
        self.db.commit()
        self.db.refresh(warning)
        
        # Update risk flag if this is a final warning
        if request.level == "final":
            self._update_risk_flag(student_id, cohort_id, level=RiskLevel.red)
        
        return WarningResponse.from_orm(warning)
    
    def log_suspension(self, student_id: UUID, cohort_id: UUID, request: LogSuspensionRequest) -> SuspensionResponse:
        """Record a suspension for a student"""
        suspension = Suspension(
            student_id=student_id,
            cohort_id=cohort_id,
            reason=request.reason,
            is_active=True
        )
        self.db.add(suspension)
        self.db.commit()
        self.db.refresh(suspension)
        
        # Update risk flag to red
        self._update_risk_flag(student_id, cohort_id, level=RiskLevel.red)
        
        return SuspensionResponse.from_orm(suspension)
    
    def end_suspension(self, suspension_id: UUID) -> SuspensionResponse:
        """End an active suspension"""
        suspension = self.db.query(Suspension).filter(Suspension.id == suspension_id).first()
        if not suspension:
            raise ValueError("Suspension not found")
        
        suspension.is_active = False
        suspension.ended_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(suspension)
        
        return SuspensionResponse.from_orm(suspension)
    
    def _update_risk_flag(self, student_id: UUID, cohort_id: UUID, level: RiskLevel = None):
        """Update a student's risk flag based on their disciplinary record"""
        # Count recent issues
        defaults_count = self.db.query(Default).filter(
            Default.student_id == student_id,
            Default.cohort_id == cohort_id
        ).count()
        
        warnings_count = self.db.query(Warning).filter(
            Warning.student_id == student_id,
            Warning.cohort_id == cohort_id
        ).count()
        
        suspensions_count = self.db.query(Suspension).filter(
            Suspension.student_id == student_id,
            Suspension.cohort_id == cohort_id,
            Suspension.is_active == True
        ).count()
        
        # Determine risk level
        if level is None:
            if suspensions_count > 0:
                level = RiskLevel.red
            elif warnings_count >= 2 or defaults_count >= 5:
                level = RiskLevel.red
            elif warnings_count >= 1 or defaults_count >= 2:
                level = RiskLevel.yellow
            else:
                level = RiskLevel.green
        
        # Update or create risk flag
        risk_flag = self.db.query(RiskFlag).filter(
            RiskFlag.student_id == student_id,
            RiskFlag.cohort_id == cohort_id
        ).first()
        
        if risk_flag:
            risk_flag.flag_level = level
        else:
            risk_flag = RiskFlag(
                student_id=student_id,
                cohort_id=cohort_id,
                flag_level=level
            )
            self.db.add(risk_flag)
        
        self.db.commit()
    
    def get_student_disciplinary_status(self, student_id: UUID, cohort_id: UUID) -> StudentDisciplinaryStatus:
        """Get complete disciplinary summary for a student"""
        defaults = self.db.query(Default).filter(
            Default.student_id == student_id,
            Default.cohort_id == cohort_id
        ).order_by(Default.created_at.desc()).all()
        
        warnings = self.db.query(Warning).filter(
            Warning.student_id == student_id,
            Warning.cohort_id == cohort_id
        ).order_by(Warning.created_at.desc()).all()
        
        suspensions = self.db.query(Suspension).filter(
            Suspension.student_id == student_id,
            Suspension.cohort_id == cohort_id,
            Suspension.is_active == True
        ).first()
        
        risk_flag = self.db.query(RiskFlag).filter(
            RiskFlag.student_id == student_id,
            RiskFlag.cohort_id == cohort_id
        ).order_by(RiskFlag.created_at.desc()).first()
        
        return StudentDisciplinaryStatus(
            student_id=student_id,
            total_defaults=len(defaults),
            excused_defaults=sum(1 for d in defaults if d.is_excused),
            warning_count=len(warnings),
            active_suspensions=1 if suspensions else 0,
            current_risk_level=risk_flag.flag_level if risk_flag else RiskLevel.green,
            recent_defaults=[DefaultResponse.from_orm(d) for d in defaults[:5]],
            recent_warnings=[WarningResponse.from_orm(w) for w in warnings[:5]],
            active_suspension=SuspensionResponse.from_orm(suspensions) if suspensions else None
        )


class IncentiveService:
    """Service for managing student incentives, scholarships, and certificates"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_scholarship_eligibility(self, student_id: UUID, cohort_id: UUID = None) -> tuple[ScholarshipLevel, float]:
        """Calculate scholarship eligibility based on assessment performance"""
        # Get average score from topic mastery
        mastery_records = self.db.query(TopicMastery).filter(
            TopicMastery.student_id == student_id
        ).all()
        
        if not mastery_records:
            return None, 0.0
        
        avg_score = sum(m.mastery_score for m in mastery_records) / len(mastery_records)
        
        # Determine scholarship level based on average
        if avg_score >= 90:
            level = ScholarshipLevel.platinum
            amount = 1000.0  # Amount in local currency - customize as needed
        elif avg_score >= 75:
            level = ScholarshipLevel.gold
            amount = 750.0
        elif avg_score >= 60:
            level = ScholarshipLevel.silver
            amount = 500.0
        elif avg_score >= 50:
            level = ScholarshipLevel.bronze
            amount = 250.0
        else:
            return None, 0.0
        
        return level, amount
    
    def award_scholarship(self, student_id: UUID, cohort_id: UUID = None) -> Scholarship:
        """Award a scholarship to a student based on eligibility"""
        level, amount = self.calculate_scholarship_eligibility(student_id, cohort_id)
        
        if level is None:
            raise ValueError("Student is not eligible for scholarship")
        
        # Check if student already has an active scholarship at this level
        existing = self.db.query(Scholarship).filter(
            Scholarship.student_id == student_id,
            Scholarship.level == level,
            Scholarship.is_active == True
        ).first()
        
        if existing:
            return existing
        
        scholarship = Scholarship(
            student_id=student_id,
            cohort_id=cohort_id,
            level=level,
            amount=amount,
            reason=f"Based on {level} performance (avg score: {sum(m.mastery_score for m in self.db.query(TopicMastery).filter(TopicMastery.student_id == student_id).all()) / len(self.db.query(TopicMastery).filter(TopicMastery.student_id == student_id).all())}%)"
        )
        self.db.add(scholarship)
        self.db.commit()
        self.db.refresh(scholarship)
        
        return scholarship
    
    def issue_certificate(self, student_id: UUID, certificate_type: str, description: str = None, issued_by: UUID = None) -> Certificate:
        """Issue a certificate to a student"""
        certificate = Certificate(
            student_id=student_id,
            certificate_type=certificate_type,
            status=CertificateStatus.issued,
            description=description,
            issued_at=datetime.utcnow(),
            issued_by=issued_by
        )
        self.db.add(certificate)
        self.db.commit()
        self.db.refresh(certificate)
        
        return certificate
    
    def award_incentive(self, student_id: UUID, incentive_type: str, points: int, description: str = None) -> Incentive:
        """Award incentive points to a student"""
        incentive = Incentive(
            student_id=student_id,
            incentive_type=incentive_type,
            points=points,
            description=description
        )
        self.db.add(incentive)
        self.db.commit()
        self.db.refresh(incentive)
        
        return incentive
    
    def get_student_incentives_summary(self, student_id: UUID) -> StudentIncentivesSummary:
        """Get complete incentives summary for a student"""
        scholarships = self.db.query(Scholarship).filter(
            Scholarship.student_id == student_id,
            Scholarship.is_active == True
        ).all()
        
        certificates = self.db.query(Certificate).filter(
            Certificate.student_id == student_id,
            Certificate.status == CertificateStatus.issued
        ).all()
        
        incentives = self.db.query(Incentive).filter(
            Incentive.student_id == student_id
        ).order_by(Incentive.earned_at.desc()).limit(10).all()
        
        total_points = sum(i.points for i in self.db.query(Incentive).filter(
            Incentive.student_id == student_id
        ).all())
        
        # Determine scholarship level
        level, _ = self.calculate_scholarship_eligibility(student_id)
        
        return StudentIncentivesSummary(
            student_id=student_id,
            total_points=total_points,
            active_scholarships=len(scholarships),
            total_certificates=len(certificates),
            recent_incentives=[IncentiveResponse.from_orm(i) for i in incentives],
            scholarship_level=level if level else None
        )
