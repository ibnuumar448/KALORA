from fastapi import HTTPException, status

from app.schemas.contact import ContactSubmission
from app.services.email import EmailDeliveryError, EmailService


class ContactService:
    def __init__(self):
        self.email_service = EmailService()

    def submit(self, submission: ContactSubmission) -> None:
        try:
            self.email_service.send_contact_email(
                name=submission.name,
                email=str(submission.email),
                subject=submission.subject,
                message=submission.message,
            )
        except EmailDeliveryError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to send your message right now. Please try again later.",
            ) from exc