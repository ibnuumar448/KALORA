from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Any, Optional

class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    message: str
    type: str
    data: Optional[dict[str, Any]] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
