from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.api.deps import RequireRole
from app.models.user import User
from app.models.rbac import Role, UserRole
from app.models.organization import Cohort
from app.models.admission import Application, ApplicationStatus
from app.models.mentorship import MentorAssignment
from app.services.auth import pwd_context
from app.schemas.user import AdminUserCreate, AdminUserResponse

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/overview")
def get_admin_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["super_admin", "admin"]))
):
    student_role = db.query(Role).filter(Role.name == "student").first()
    # Count unique users who have an accepted application
    total_students = db.query(Application.user_id).filter(Application.status == ApplicationStatus.accepted).distinct().count()

    mentor_role = db.query(Role).filter(Role.name == "mentor").first()
    active_mentors = db.query(UserRole).filter(UserRole.role_id == mentor_role.id).count() if mentor_role else 0

    pending_applications = db.query(Application).filter(Application.status == ApplicationStatus.applied).count()
    
    # Fake at_risk until disciplinary models are fully integrated
    at_risk_students = 0 
    
    # Fetch recent pending applications
    recent_apps = db.query(Application).filter(
        Application.status == ApplicationStatus.applied
    ).order_by(Application.created_at.desc()).limit(5).all()

    recent_apps_data = []
    for app in recent_apps:
        recent_apps_data.append({
            "id": app.id,
            "student_name": app.user.full_name if app.user else "Unknown",
            "applied_date": app.created_at,
            "status": app.status
        })

    # Disciplinary actions (empty for now)
    disciplinary_actions = []

    return {
        "stats": {
            "total_students": total_students,
            "active_mentors": active_mentors or 0,
            "pending_applications": pending_applications,
            "at_risk_students": at_risk_students
        },
        "recent_applications": recent_apps_data,
        "disciplinary_actions": disciplinary_actions
    }


@router.get("/users", response_model=list[AdminUserResponse])
def list_users(
    role: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["super_admin", "admin"]))
):
    query = db.query(User)
    if role:
        query = query.join(User.roles).filter(Role.name == role)
    users = query.all()
    from app.models.admission import AdmissionNumber
    results = []
    for user in users:
        roles = [role.name for role in user.roles]
        admission = db.query(AdmissionNumber).filter(AdmissionNumber.student_id == user.id).first()
        results.append({
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "created_at": user.created_at,
            "roles": roles,
            "admission_number": admission.admission_number if admission else None
        })
    return results


@router.post("/users", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["super_admin"]))
):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with that email already exists")

    role_name = user_in.role.strip().lower()
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        raise HTTPException(status_code=400, detail=f"Role '{role_name}' does not exist")

    new_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        password_hash=pwd_context.hash(user_in.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    user_role = db.query(UserRole).filter(
        UserRole.user_id == new_user.id,
        UserRole.role_id == role.id,
    ).first()
    if not user_role:
        db.add(UserRole(user_id=new_user.id, role_id=role.id))
        db.commit()

    return {
        "id": new_user.id,
        "email": new_user.email,
        "full_name": new_user.full_name,
        "created_at": new_user.created_at,
        "roles": [role.name],
    }

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["super_admin"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Simple hard delete for now (cascade will handle relationships if configured properly)
    db.delete(user)
    db.commit()
    return None
