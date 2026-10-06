from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, timezone
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse
from fastapi import HTTPException

class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def get_my_notifications(self, user_id: UUID) -> list[NotificationResponse]:
        notifications = self.db.query(Notification).filter(
            Notification.user_id == user_id
        ).order_by(Notification.created_at.desc()).all()
        return notifications

    def get_unread_count(self, user_id: UUID) -> int:
        return self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()

    def mark_as_read(self, notification_id: UUID, user_id: UUID) -> NotificationResponse:
        notif = self.db.query(Notification).filter(Notification.id == notification_id).first()
        if not notif:
            raise HTTPException(status_code=404, detail="Notification not found")
        if notif.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
            
        notif.is_read = True
        self.db.commit()
        self.db.refresh(notif)
        return notif

    def mark_all_as_read(self, user_id: UUID):
        self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({"is_read": True})
        self.db.commit()

    def mark_type_as_read(self, user_id: UUID, notif_type: str):
        self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.type == notif_type,
            Notification.is_read == False
        ).update({"is_read": True})
        self.db.commit()

    def create_notification(self, user_id: UUID, title: str, message: str, type: str) -> Notification:
        new_notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(new_notif)
        self.db.commit()
        self.db.refresh(new_notif)
        return new_notif
