"""Add subject-level curriculum PDF documents.

Revision ID: e91c4a7d2f60
Revises: d28c7a9e4b61
Create Date: 2026-10-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e91c4a7d2f60"
down_revision: Union[str, Sequence[str], None] = "d28c7a9e4b61"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "curriculum_documents",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("subject_id", sa.UUID(), nullable=False),
        sa.Column("section", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("file_key", sa.String(length=512), nullable=False),
        sa.Column("is_published", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "section IN ('textbooks', 'jamb_past_questions')",
            name="ck_curriculum_documents_section",
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_curriculum_documents_subject_section",
        "curriculum_documents",
        ["subject_id", "section"],
    )


def downgrade() -> None:
    op.drop_index("ix_curriculum_documents_subject_section", table_name="curriculum_documents")
    op.drop_table("curriculum_documents")
