from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    whatsapp_link = Column(String(255), nullable=True)
    profile_picture_url = Column(String(1024), nullable=True)
    is_email_verified = Column(Boolean, default=False, server_default='false', nullable=False)
    verification_token = Column(String(255), nullable=True)
    verification_token_hash = Column(String(64), nullable=True, unique=True, index=True)
    verification_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    verification_email_last_attempt_at = Column(DateTime(timezone=True), nullable=True)
    verification_email_window_started_at = Column(DateTime(timezone=True), nullable=True)
    verification_email_send_count = Column(Integer, default=0, server_default="0", nullable=False)
    reset_password_token = Column(String(255), nullable=True)
    reset_password_expires = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    roles = relationship("Role", secondary="user_roles", back_populates="users")
    auth_identities = relationship("AuthIdentity", back_populates="user", cascade="all, delete-orphan")


class AuthIdentity(Base):
    __tablename__ = "auth_identities"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False) # e.g. "local", "google"
    provider_user_id = Column(String(255), nullable=True) # e.g. Google user ID
    email = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="auth_identities")