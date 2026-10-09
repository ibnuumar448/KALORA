from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import List, Optional

# Validates incoming data when a user registers
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "student"

class UserRoleSummary(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True

# Shapes the data we send back out (never returning the password hash!)
class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    whatsapp_link: Optional[str] = None
    profile_picture_url: Optional[str] = None
    created_at: datetime
    roles: List[UserRoleSummary] = []
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp_link: Optional[str] = None

class AdminUserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    created_at: datetime
    roles: List[str] = []
    admission_number: Optional[str] = None

    class Config:
        from_attributes = True

class GoogleAuthRequest(BaseModel):
    code: str