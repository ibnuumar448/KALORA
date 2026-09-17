from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base

class GlobalSetting(Base):
    __tablename__ = "global_settings"

    key = Column(String(255), primary_key=True)
    value = Column(String(1024), nullable=True)
