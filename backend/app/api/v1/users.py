import mimetypes
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.api.deps import get_current_user
from app.models.user import User
from app.services.storage import StorageService, stream_storage_file

router = APIRouter(prefix="/users", tags=["users"])

@router.patch("/me", response_model=UserResponse)
def update_user_profile(
    update_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if update_data.full_name is not None:
        current_user.full_name = update_data.full_name
    if update_data.phone is not None:
        current_user.phone = update_data.phone
    if update_data.whatsapp_link is not None:
        current_user.whatsapp_link = update_data.whatsapp_link
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/me/profile-picture", response_model=UserResponse)
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await StorageService.validate_upload(
        file,
        allowed_mime_types={"image/jpeg", "image/png", "image/webp"},
        max_size_bytes=5 * 1024 * 1024,
    )
    file_url = await StorageService.save_file(file, directory=f"profiles/{current_user.id}")
    current_user.profile_picture_url = file_url
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/profile-pictures/{file_key:path}")
def serve_profile_picture(
    file_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify the user is requesting their own profile picture or an admin/mentor is requesting it
    parts = file_key.split('/')
    if len(parts) != 3 or parts[0] != "profiles":
        raise HTTPException(status_code=404, detail="File not found")
    try:
        target_user_id = UUID(parts[1])
    except ValueError:
        raise HTTPException(status_code=404, detail="File not found")

    is_admin = any(role.name in ["admin", "super_admin"] for role in current_user.roles)
    is_mentor = any(role.name == "mentor" for role in current_user.roles)
    if target_user_id != current_user.id and not (is_admin or is_mentor):
        raise HTTPException(status_code=403, detail="Not authorized")

    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user or target_user.profile_picture_url != file_key:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        stored_file = StorageService.open_file(file_key)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")

    media_type = mimetypes.guess_type(file_key)[0] or "application/octet-stream"
    return StreamingResponse(
        stream_storage_file(stored_file),
        media_type=media_type,
    )
