from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, Text, Integer, UniqueConstraint, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    programme_id = Column(UUID(as_uuid=True), ForeignKey("programmes.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    programme = relationship("Programme")
    modules = relationship("Module", back_populates="subject", cascade="all, delete-orphan", order_by="Module.order_index")
    documents = relationship("CurriculumDocument", back_populates="subject", cascade="all, delete-orphan", order_by="CurriculumDocument.created_at")

class Module(Base):
    __tablename__ = "modules"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    subject = relationship("Subject", back_populates="modules")
    topics = relationship("Topic", back_populates="module", cascade="all, delete-orphan", order_by="Topic.order_index")

class Topic(Base):
    __tablename__ = "topics"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    module_id = Column(UUID(as_uuid=True), ForeignKey("modules.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    module = relationship("Module", back_populates="topics")
    subtopics = relationship("Subtopic", back_populates="topic", cascade="all, delete-orphan", order_by="Subtopic.order_index")

class Subtopic(Base):
    __tablename__ = "subtopics"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    topic_id = Column(UUID(as_uuid=True), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    order_index = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    topic = relationship("Topic", back_populates="subtopics")
    resource_slots = relationship("ResourceSlot", back_populates="subtopic", cascade="all, delete-orphan", order_by="ResourceSlot.order_index")

class ResourceSlot(Base):
    __tablename__ = "resource_slots"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    subtopic_id = Column(UUID(as_uuid=True), ForeignKey("subtopics.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False) # e.g. "Introduction Video"
    order_index = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True)
    
    # The active resource version
    active_resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", use_alter=True, name="fk_active_resource"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    subtopic = relationship("Subtopic", back_populates="resource_slots")
    resources = relationship("Resource", back_populates="slot", foreign_keys="[Resource.slot_id]")
    active_resource = relationship("Resource", foreign_keys=[active_resource_id], post_update=True)

class Resource(Base):
    __tablename__ = "resources"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    slot_id = Column(UUID(as_uuid=True), ForeignKey("resource_slots.id", ondelete="CASCADE"), nullable=False)
    
    # YouTube specific metadata
    youtube_video_id = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    thumbnail_url = Column(String(512), nullable=True)
    
    version = Column(Integer, default=1, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    slot = relationship("ResourceSlot", back_populates="resources", foreign_keys=[slot_id])
    creator = relationship("User")


class CurriculumDocument(Base):
    __tablename__ = "curriculum_documents"
    __table_args__ = (
        CheckConstraint("section IN ('textbooks', 'jamb_past_questions')", name="ck_curriculum_documents_section"),
        Index("ix_curriculum_documents_subject_section", "subject_id", "section"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    section = Column(String(32), nullable=False)
    title = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_key = Column(String(512), nullable=False)
    is_published = Column(Boolean, default=True, server_default="true", nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    subject = relationship("Subject", back_populates="documents")
    creator = relationship("User")
