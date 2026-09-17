from pydantic import BaseModel, HttpUrl
from uuid import UUID
from datetime import datetime
from typing import Optional, List

# --- Resource ---
class ResourceBase(BaseModel):
    youtube_video_id: str
    title: str
    description: Optional[str] = None
    duration_seconds: Optional[int] = None
    thumbnail_url: Optional[str] = None

class ResourceCreate(ResourceBase):
    pass

class ResourceResponse(ResourceBase):
    id: UUID
    version: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Resource Slot ---
class ResourceSlotCreate(BaseModel):
    name: str
    order_index: int = 0
    resource: ResourceCreate

class ResourceSlotResponse(BaseModel):
    id: UUID
    name: str
    order_index: int
    is_active: bool
    active_resource: Optional[ResourceResponse]

    class Config:
        from_attributes = True

# --- Subtopic ---
class SubtopicCreate(BaseModel):
    name: str
    order_index: int = 0
    # Optional nested creation
    resource_slots: Optional[List[ResourceSlotCreate]] = []

class SubtopicResponse(BaseModel):
    id: UUID
    name: str
    order_index: int
    is_active: bool
    resource_slots: List[ResourceSlotResponse] = []

    class Config:
        from_attributes = True

# --- Topic ---
class TopicCreate(BaseModel):
    name: str
    description: Optional[str] = None
    order_index: int = 0
    subtopics: Optional[List[SubtopicCreate]] = []

class TopicResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    order_index: int
    is_active: bool
    subtopics: List[SubtopicResponse] = []

    class Config:
        from_attributes = True

# --- Module ---
class ModuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    order_index: int = 0
    topics: Optional[List[TopicCreate]] = []

class ModuleResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    order_index: int
    is_active: bool
    topics: List[TopicResponse] = []

    class Config:
        from_attributes = True

# --- Subject ---
class SubjectCreate(BaseModel):
    programme_id: UUID
    name: str
    description: Optional[str] = None
    order_index: int = 0
    modules: Optional[List[ModuleCreate]] = []

class SubjectResponse(BaseModel):
    id: UUID
    programme_id: UUID
    name: str
    description: Optional[str] = None
    order_index: int
    is_active: bool
    # We might not want to return the whole nested tree by default, 
    # but for curriculum fetch we do.
    modules: List[ModuleResponse] = []

    class Config:
        from_attributes = True
