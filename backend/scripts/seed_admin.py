import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.user import User
from app.models.rbac import Role, UserRole
from app.services.auth import pwd_context


def seed_admin():
    db = SessionLocal()
    try:
        for role_name in ["admin", "super_admin"]:
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                role = Role(name=role_name, description=f"{role_name.replace('_', ' ').title()} Role")
                db.add(role)
        db.commit()

        admin_role = db.query(Role).filter(Role.name == "admin").first()
        super_admin_role = db.query(Role).filter(Role.name == "super_admin").first()

        admin_user = db.query(User).filter(User.email == "saminu@gmail.com").first()
        if not admin_user:
            admin_user = User(
                email="saminu@gmail.com",
                full_name="Saminu Umar",
                password_hash=pwd_context.hash("admin123")
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            print("Created pilot admin: saminu@gmail.com / admin123")

        for role_obj in [admin_role, super_admin_role]:
            existing = db.query(UserRole).filter(
                UserRole.user_id == admin_user.id,
                UserRole.role_id == role_obj.id
            ).first()
            if not existing:
                db.add(UserRole(user_id=admin_user.id, role_id=role_obj.id))

        db.commit()
        print("Granted admin and super_admin roles to Saminu Umar")

    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
