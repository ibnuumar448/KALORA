import sys
import os
from sqlalchemy import func

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.user import User
from app.models.rbac import Role, UserRole
from app.models.organization import Cohort
from app.models.admission import Application, ApplicationStatus, AdmissionNumber
from app.models.mentorship import MentorAssignment
from app.services.auth import pwd_context


def seed_users():
    db = SessionLocal()
    try:
        for role_name in ["admin", "super_admin", "mentor", "student"]:
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                role = Role(name=role_name, description=f"{role_name.replace('_', ' ').title()} Role")
                db.add(role)
        db.commit()

        admin_role = db.query(Role).filter(Role.name == "admin").first()
        super_admin_role = db.query(Role).filter(Role.name == "super_admin").first()
        mentor_role = db.query(Role).filter(Role.name == "mentor").first()
        student_role = db.query(Role).filter(Role.name == "student").first()

        cohort = db.query(Cohort).filter(Cohort.name == "Cohort 1").first()
        if not cohort:
            print("Run seed.py first to create the KALORA pilot cohort.")
            return

        admin = db.query(User).filter(User.email == "saminu@gmail.com").first()
        if not admin:
            admin = User(
                email="saminu@gmail.com",
                full_name="Saminu Umar",
                password_hash=pwd_context.hash("admin123"),
                is_email_verified=True,
                email_verified_at=func.now(),
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print("Created Admin: saminu@gmail.com")

        for role_obj in [admin_role, super_admin_role]:
            existing = db.query(UserRole).filter(
                UserRole.user_id == admin.id,
                UserRole.role_id == role_obj.id
            ).first()
            if not existing:
                db.add(UserRole(user_id=admin.id, role_id=role_obj.id))

        mentor = db.query(User).filter(User.email == "ismail@gmail.com").first()
        if not mentor:
            mentor = User(
                email="ismail@gmail.com",
                full_name="Ismail Usman Abdullahi",
                whatsapp_link="https://wa.me/2348000000000",
                password_hash=pwd_context.hash("mentor123"),
                is_email_verified=True,
                email_verified_at=func.now(),
            )
            db.add(mentor)
            db.commit()
            db.refresh(mentor)
            print("Created Mentor: ismail@gmail.com")

        existing_mentor_role = db.query(UserRole).filter(
            UserRole.user_id == mentor.id,
            UserRole.role_id == mentor_role.id
        ).first()
        if not existing_mentor_role:
            db.add(UserRole(user_id=mentor.id, role_id=mentor_role.id))

        student_data = [
            ("Yushau Umar", "yushau@gmail.com"),
            ("Aisha Aliyu", "aisha@gmail.com"),
            ("Mansur Ahmad", "mansur@gmail.com")
        ]

        sequence = 1
        for name, email in student_data:
            student = db.query(User).filter(User.email == email).first()
            if not student:
                student = User(
                    email=email,
                    full_name=name,
                    whatsapp_link="https://wa.me/2348000000000",
                    password_hash=pwd_context.hash("student123"),
                    is_email_verified=True,
                    email_verified_at=func.now(),
                )
                db.add(student)
                db.commit()
                db.refresh(student)
                print(f"Created Student: {email}")

            existing_student_role = db.query(UserRole).filter(
                UserRole.user_id == student.id,
                UserRole.role_id == student_role.id
            ).first()
            if not existing_student_role:
                db.add(UserRole(user_id=student.id, role_id=student_role.id))

            app = db.query(Application).filter(
                Application.user_id == student.id,
                Application.cohort_id == cohort.id
            ).first()
            if not app:
                app = Application(
                    user_id=student.id,
                    cohort_id=cohort.id,
                    status=ApplicationStatus.accepted
                )
                db.add(app)
                db.commit()
                db.refresh(app)

            admission = db.query(AdmissionNumber).filter(AdmissionNumber.student_id == student.id).first()
            if not admission:
                admission_number = f"KL/26/{sequence:04d}"
                admission = AdmissionNumber(
                    student_id=student.id,
                    cohort_id=cohort.id,
                    admission_number=admission_number,
                    sequence_val=sequence
                )
                db.add(admission)
                print(f"Generated admission number for {student.full_name}: {admission_number}")

            assignment = db.query(MentorAssignment).filter(
                MentorAssignment.mentor_id == mentor.id,
                MentorAssignment.student_id == student.id,
                MentorAssignment.cohort_id == cohort.id
            ).first()
            if not assignment:
                assignment = MentorAssignment(
                    mentor_id=mentor.id,
                    student_id=student.id,
                    cohort_id=cohort.id,
                    is_active=True,
                )
                db.add(assignment)

            sequence += 1

        db.commit()
        print("Pilot users and accepted student assignments seeded successfully.")

    finally:
        db.close()


if __name__ == "__main__":
    seed_users()
