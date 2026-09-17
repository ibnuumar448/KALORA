from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.admission import AdmissionNumberLookupResponse
from app.services.admission import AdmissionService

router = APIRouter(prefix="/students", tags=["students"])

@router.get("/lookup", response_model=AdmissionNumberLookupResponse)
def lookup_admission_number(
    admission_number: str,
    db: Session = Depends(get_db)
):
    """
    Publicly accessible endpoint to verify an admission number.
    Returns basic student info without requiring authentication.
    """
    service = AdmissionService(db)
    return service.lookup_admission_number(admission_number)
