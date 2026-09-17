"""
Seed script for Phase 6: Discipline & Incentives
Creates discipline records, warnings, scholarships, certificates, and incentives
"""

import os
import sys
from datetime import datetime, timedelta
from uuid import UUID

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.discipline import Default, Warning, Suspension, RiskFlag, WarningLevel, RiskLevel
from app.models.incentive import Scholarship, Certificate, Incentive, ScholarshipLevel, CertificateStatus
from app.core.database import Base
from app.models.user import User
from app.models.organization import Cohort

# Using the same credentials from docker-compose
DATABASE_URL = "postgresql://kalora_user:kalora_password@localhost:5432/kalora_db"

# Database setup
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def seed_discipline_and_incentives():
    session = Session()
    
    try:
        # Fetch actual users and cohort
        admin_user = session.query(User).filter(User.email == "saminu@gmail.com").first()
        student1 = session.query(User).filter(User.email == "yushau@gmail.com").first()
        student2 = session.query(User).filter(User.email == "aisha@gmail.com").first()
        student3 = session.query(User).filter(User.email == "mansur@gmail.com").first()
        cohort = session.query(Cohort).filter(Cohort.name == "Cohort 1").first()

        if not all([admin_user, student1, student2, student3, cohort]):
            print("Required users or cohort not found. Please run previous seeds first.")
            return

        admin_id = admin_user.id
        student1_id = student1.id
        student2_id = student2.id
        student3_id = student3.id
        cohort_id = cohort.id
        
        print("\U0001f393 Seeding Phase 6: Discipline & Incentives Data")
        print("=" * 60)
        
        # ==================== DEFAULTS / INFRACTIONS ====================
        print("\n📋 Creating Defaults (Infractions)...")
        
        defaults_data = [
            {
                "student_id": student1_id,
                "reason": "Missed assessment deadline for Algebra Quiz",
                "is_excused": False,
            },
            {
                "student_id": student2_id,
                "reason": "Late submission of curriculum assignment",
                "is_excused": True,
                "excused_reason": "Family emergency",
            },
            {
                "student_id": student3_id,
                "reason": "Incomplete homework: Kinematics problems",
                "is_excused": False,
            },
        ]
        
        for data in defaults_data:
            default = Default(
                student_id=data["student_id"],
                cohort_id=cohort_id,
                reason=data["reason"],
                is_excused=data["is_excused"],
                excused_reason=data.get("excused_reason")
            )
            session.add(default)
            print(f"  ✓ Created Default: {data['reason'][:50]}...")
        
        session.commit()
        
        # ==================== WARNINGS ====================
        print("\n⚠️  Creating Warnings...")
        
        warnings_data = [
            {
                "student_id": student1_id,
                "level": WarningLevel.first,
                "reason": "First warning: Multiple missed deadlines",
            },
            {
                "student_id": student3_id,
                "level": WarningLevel.first,
                "reason": "First warning: Low assessment scores in Kinematics",
            },
        ]
        
        for data in warnings_data:
            warning = Warning(
                student_id=data["student_id"],
                cohort_id=cohort_id,
                level=data["level"],
                reason=data["reason"]
            )
            session.add(warning)
            print(f"  ✓ Created Warning ({data['level']}): {data['reason'][:50]}...")
        
        session.commit()
        
        # ==================== SUSPENSIONS ====================
        print("\n🚫 Creating Suspensions...")
        
        # Student 3 gets a suspension (after final warning)
        suspension = Suspension(
            student_id=student3_id,
            cohort_id=cohort_id,
            reason="Final warning escalated to suspension due to continued non-compliance",
            is_active=True,
            confirmed_by=admin_id,
            started_at=datetime.utcnow()
        )
        session.add(suspension)
        print(f"  ✓ Created Suspension: Student {student3_id} suspended")
        
        session.commit()
        
        # ==================== RISK FLAGS ====================
        print("\n🚩 Creating Risk Flags...")
        
        risk_data = [
            {
                "student_id": student1_id,
                "flag_level": RiskLevel.yellow,
                "reason": "Multiple infractions: at-risk for escalation",
            },
            {
                "student_id": student2_id,
                "flag_level": RiskLevel.green,
                "reason": "Good standing: one excused absence",
            },
            {
                "student_id": student3_id,
                "flag_level": RiskLevel.red,
                "reason": "Suspended: critical risk level",
            },
        ]
        
        for data in risk_data:
            risk_flag = RiskFlag(
                student_id=data["student_id"],
                cohort_id=cohort_id,
                flag_level=data["flag_level"],
                reason=data["reason"]
            )
            session.add(risk_flag)
            print(f"  ✓ Created Risk Flag ({data['flag_level']}): {data['reason'][:50]}...")
        
        session.commit()
        
        # ==================== SCHOLARSHIPS ====================
        print("\n🏆 Creating Scholarships...")
        
        scholarship_data = [
            {
                "student_id": student1_id,
                "level": ScholarshipLevel.gold,
                "amount": 750.0,
                "reason": "Academic Excellence: Achieved 82% average across all assessments",
            },
            {
                "student_id": student2_id,
                "level": ScholarshipLevel.platinum,
                "amount": 1000.0,
                "reason": "Outstanding Achievement: Achieved 94% average across all topics",
            },
        ]
        
        for data in scholarship_data:
            scholarship = Scholarship(
                student_id=data["student_id"],
                cohort_id=cohort_id,
                level=data["level"],
                amount=data["amount"],
                reason=data["reason"],
                is_active=True
            )
            session.add(scholarship)
            print(f"  ✓ Created Scholarship ({data['level']}): {data['amount']} currency units")
        
        session.commit()
        
        # ==================== CERTIFICATES ====================
        print("\n📜 Creating Certificates...")
        
        certificate_data = [
            {
                "student_id": student1_id,
                "certificate_type": "Module Completion: Algebra Fundamentals",
                "description": "Successfully completed all Algebra modules with 85% average",
                "issued_by": admin_id,
            },
            {
                "student_id": student2_id,
                "certificate_type": "Topic Mastery: Calculus",
                "description": "Achieved mastery (>80%) in Calculus topic",
                "issued_by": admin_id,
            },
            {
                "student_id": student2_id,
                "certificate_type": "Perfect Attendance",
                "description": "Perfect attendance throughout the program",
                "issued_by": admin_id,
            },
            {
                "student_id": student1_id,
                "certificate_type": "Assessment Excellence: Weekly Quiz Winner",
                "description": "Achieved top score in weekly assessment",
                "issued_by": admin_id,
            },
        ]
        
        for data in certificate_data:
            certificate = Certificate(
                student_id=data["student_id"],
                certificate_type=data["certificate_type"],
                status=CertificateStatus.issued,
                description=data["description"],
                issued_by=data["issued_by"],
                issued_at=datetime.utcnow()
            )
            session.add(certificate)
            print(f"  ✓ Created Certificate: {data['certificate_type']}")
        
        session.commit()
        
        # ==================== INCENTIVES ====================
        print("\n⭐ Creating Incentives...")
        
        incentive_data = [
            {"student_id": student1_id, "type": "Perfect Week Score", "points": 50, "desc": "Scored 100% in all weekly quizzes"},
            {"student_id": student2_id, "type": "Peer Tutor", "points": 75, "desc": "Helped 3 students with curriculum topics"},
            {"student_id": student1_id, "type": "Early Assignment Submission", "points": 25, "desc": "Submitted assignments 2 days early"},
            {"student_id": student2_id, "type": "Milestone Achievement", "points": 100, "desc": "Completed 10 topics with mastery"},
            {"student_id": student1_id, "type": "Classroom Participation", "points": 30, "desc": "Active participation in 5 virtual sessions"},
        ]
        
        for data in incentive_data:
            incentive = Incentive(
                student_id=data["student_id"],
                incentive_type=data["type"],
                points=data["points"],
                description=data["desc"]
            )
            session.add(incentive)
            print(f"  ✓ Created Incentive: {data['type']} ({data['points']} points)")
        
        session.commit()
        
        print("\n" + "=" * 60)
        print("✅ Phase 6 Discipline & Incentives Seeding Complete!")
        print("=" * 60)
        print("\n📊 Summary:")
        print(f"  • Defaults created: {len(defaults_data)}")
        print(f"  • Warnings created: {len(warnings_data)}")
        print(f"  • Suspensions created: 1")
        print(f"  • Risk flags created: {len(risk_data)}")
        print(f"  • Scholarships created: {len(scholarship_data)}")
        print(f"  • Certificates created: {len(certificate_data)}")
        print(f"  • Incentives created: {len(incentive_data)}")
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    seed_discipline_and_incentives()
