from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.notification import NotificationService
from app.schemas.notification import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = NotificationService(db)
    return service.get_my_notifications(current_user.id)

@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = NotificationService(db)
    return {"unread_count": service.get_unread_count(current_user.id)}

@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_as_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = NotificationService(db)
    return service.mark_as_read(notification_id, current_user.id)

@router.post("/read-all")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = NotificationService(db)
    service.mark_all_as_read(current_user.id)
    return {"message": "All notifications marked as read"}

@router.post("/read-type")
def mark_type_as_read(
    type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = NotificationService(db)
    service.mark_type_as_read(current_user.id, type)
    return {"message": f"Notifications of type {type} marked as read"}
