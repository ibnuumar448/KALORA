import os
from fastapi import APIRouter, Depends, status, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_user, RequireRole
from app.models.user import User
from app.models.curriculum import CurriculumDocument, Subject
from app.schemas.curriculum import (
    SubjectCreate,
    SubjectResponse,
    ResourceCreate,
    ResourceSlotResponse,
    CurriculumDocumentResponse,
    CurriculumDocumentTitleUpdate,
)
from app.services.curriculum import CurriculumService, DOCUMENT_SECTIONS
from app.services.storage import StorageService

router = APIRouter(prefix="/curriculum", tags=["curriculum"])

@router.get("/programmes")
def list_programmes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.curriculum import Programme
    return db.query(Programme).all()

@router.get("/cohorts")
def list_cohorts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.organization import Cohort
    return db.query(Cohort).all()

@router.get("/subjects", response_model=List[SubjectResponse])
def list_all_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.curriculum import Subject
    return db.query(Subject).order_by(Subject.order_index).all()

@router.get("/programmes/{programme_id}/subjects", response_model=List[SubjectResponse])
def list_subjects(
    programme_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = CurriculumService(db)
    return service.list_subjects_for_programme(programme_id)

@router.get("/subjects/{subject_id}/tree", response_model=SubjectResponse)
def get_subject_curriculum(
    subject_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = CurriculumService(db)
    return service.get_subject_tree(subject_id)

@router.post("/admin/subjects", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(
    subject_in: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin", "academic_coordinator"]))
):
    service = CurriculumService(db)
    return service.create_subject(subject_in)

@router.post("/admin/resource-slots/{slot_id}/swap", response_model=ResourceSlotResponse)
def swap_resource(
    slot_id: UUID,
    resource_in: ResourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin", "academic_coordinator"]))
):
    service = CurriculumService(db)
    return service.swap_resource(slot_id, resource_in, current_user.id)

from pydantic import BaseModel

class YouTubeResourceRequest(BaseModel):
    youtube_url: str

@router.post("/admin/topics/{topic_id}/youtube-resource")
def add_youtube_resource_to_topic(
    topic_id: UUID,
    request: YouTubeResourceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin"]))
):
    service = CurriculumService(db)
    return service.add_youtube_resource_to_topic(topic_id, request.youtube_url, current_user.id)

@router.delete("/admin/resource-slots/{slot_id}")
def delete_resource_slot(
    slot_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin", "academic_coordinator"]))
):
    service = CurriculumService(db)
    return service.delete_resource_slot(slot_id)


@router.post(
    "/admin/subjects/{subject_id}/documents",
    response_model=CurriculumDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_curriculum_document(
    subject_id: UUID,
    section: str = Form(...),
    title: str | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin", "academic_coordinator"])),
):
    if section not in DOCUMENT_SECTIONS:
        raise HTTPException(status_code=400, detail="Invalid curriculum document section")
    service = CurriculumService(db)
    return await service.upload_document(subject_id, section, file, title, current_user.id)


@router.patch(
    "/admin/documents/{document_id}",
    response_model=CurriculumDocumentResponse,
)
def update_curriculum_document(
    document_id: UUID,
    request: CurriculumDocumentTitleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin", "academic_coordinator"])),
):
    service = CurriculumService(db)
    return service.update_document_title(document_id, request.title)


@router.delete("/admin/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_curriculum_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["admin", "super_admin", "academic_coordinator"])),
):
    service = CurriculumService(db)
    service.delete_document(document_id)


@router.get("/documents/{document_id}/file")
def get_curriculum_document_file(
    document_id: UUID,
    download: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = (
        db.query(CurriculumDocument)
        .join(Subject)
        .filter(
            CurriculumDocument.id == document_id,
            CurriculumDocument.is_published.is_(True),
            Subject.is_active.is_(True),
        )
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Curriculum document not found")

    try:
        file_path = StorageService.get_file_path(document.file_key)
    except ValueError:
        raise HTTPException(status_code=404, detail="Curriculum document not found")
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Curriculum document file not found")

    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=document.original_filename,
        content_disposition_type="attachment" if download else "inline",
    )
