from fastapi import APIRouter, status

from app.schemas.contact import ContactSubmission
from app.services.contact import ContactService


router = APIRouter(prefix="/contact", tags=["contact"])


@router.post("", status_code=status.HTTP_200_OK)
def submit_contact_message(submission: ContactSubmission):
    ContactService().submit(submission)
    return {"message": "Your message has been sent successfully."}