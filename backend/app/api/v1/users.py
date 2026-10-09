from fastapi import APIRouter, Depends, status, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.api.deps import get_current_user
from app.models.user import User
import os
import shutil
from uuid import uuid4, UUID

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

from app.services.storage import StorageService
from fastapi.responses import FileResponse

@router.post("/me/profile-picture", response_model=UserResponse)
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
        
    file_url = await StorageService.save_file(file, directory=f"profiles/{current_user.id}")
    current_user.profile_picture_url = file_url
    
    db.commit()
    db.refresh(current_user)
    return current_user

from app.core.security import SECRET_KEY, ALGORITHM
from app.schemas.token import TokenPayload
import jwt
from jwt.exceptions import InvalidTokenError

@router.get("/profile-pictures/{file_key:path}")
def serve_profile_picture(
    file_key: str,
    token: str = None,
    db: Session = Depends(get_db)
):
    # Authenticate via token query param
    if not token:
        raise HTTPException(status_code=401, detail="Token required to view image")
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_data = TokenPayload(**payload)
        current_user = db.query(User).filter(User.id == token_data.sub).first()
        if not current_user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Verify the user is requesting their own profile picture or an admin/mentor is requesting it
    parts = file_key.split('/')
    if len(parts) >= 2 and parts[0] == 'profiles':
        try:
            target_user_id = UUID(parts[1])
            is_admin = any(role.name in ["admin", "super_admin"] for role in current_user.roles)
            if target_user_id != current_user.id and not is_admin:
                pass # Allow anyone authenticated to view profile pics? Or restrict? 
                # Let's restrict for now unless it's their own or admin/mentor.
                is_mentor = any(role.name == "mentor" for role in current_user.roles)
                if not is_mentor:
                    raise HTTPException(status_code=403, detail="Not authorized")
        except ValueError:
            pass

    file_path = StorageService.get_file_path(file_key)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)
