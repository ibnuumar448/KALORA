from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.api.deps import get_current_user, RequireRole
from app.models.user import User
from app.schemas.assessment import TopicMasteryResponse
from app.models.progress import TopicMastery
from app.models.assessment import AssessmentAttempt, Assessment
from app.models.curriculum import Topic, Module, Subject

router = APIRouter(prefix="/students/me/progress", tags=["progress"])

@router.get("", response_model=List[TopicMasteryResponse])
def get_my_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["student"]))
):
    mastery_records = db.query(TopicMastery).filter(TopicMastery.student_id == current_user.id).all()
    return mastery_records

class RecentAssessmentSchema(BaseModel):
    name: str
    score: Optional[float] = None
    date: str

class UpNextSchema(BaseModel):
    name: str
    type: str

class DashboardOverviewResponse(BaseModel):
    modules_completed: int
    total_modules: int
    average_score: float
    study_time_hours: int
    rank: str
    recent_assessments: List[RecentAssessmentSchema]
    up_next: Optional[UpNextSchema]

@router.get("/overview", response_model=DashboardOverviewResponse)
def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["student"]))
):
    # Calculate average score from TopicMastery
    mastery = db.query(func.avg(TopicMastery.mastery_score)).filter(TopicMastery.student_id == current_user.id).scalar()
    avg_score = round(mastery, 1) if mastery else 0.0

    # Total modules calculation
    total_modules = db.query(func.count(Module.id)).scalar() or 48
    
    # Calculate modules completed based on mastery > 80.0 (mock logic)
    completed = db.query(func.count(TopicMastery.id)).filter(
        TopicMastery.student_id == current_user.id, 
        TopicMastery.mastery_score >= 80.0
    ).scalar() or 0

    # Recent assessments
    attempts = db.query(AssessmentAttempt).join(Assessment).filter(
        AssessmentAttempt.student_id == current_user.id
    ).order_by(AssessmentAttempt.started_at.desc()).limit(3).all()

    recent_assessments = []
    for att in attempts:
        recent_assessments.append({
            "name": att.assessment.name,
            "score": att.score,
            "date": att.started_at.strftime("%b %d, %Y")
        })

    return {
        "modules_completed": completed,
        "total_modules": total_modules,
        "average_score": avg_score,
        "study_time_hours": 34, # hardcoded for MVP
        "rank": "Top 15%", # hardcoded for MVP
        "recent_assessments": recent_assessments,
        "up_next": {
            "name": "Continue Curriculum",
            "type": "Video Resource"
        }
    }
