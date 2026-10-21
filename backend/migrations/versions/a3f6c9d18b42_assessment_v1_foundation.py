"""Add backward-compatible assessment lifecycle fields.

Revision ID: a3f6c9d18b42
Revises: 7f7ff4577f55
Create Date: 2026-10-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "a3f6c9d18b42"
down_revision: Union[str, Sequence[str], None] = "7f7ff4577f55"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "assessments",
        sa.Column("status", sa.String(length=20), nullable=False, server_default="published"),
    )
    op.add_column("assessments", sa.Column("subject_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_assessments_subject_id_subjects",
        "assessments",
        "subjects",
        ["subject_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.add_column("question_bank", sa.Column("topic_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_question_bank_topic_id_topics",
        "question_bank",
        "topics",
        ["topic_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.add_column(
        "assessment_attempts",
        sa.Column("is_makeup", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_table(
        "assessment_topics",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("assessment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("topic_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["assessment_id"], ["assessments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("assessment_id", "topic_id", name="uq_assessment_topics_assessment_topic"),
    )

    op.execute(
        """UPDATE assessments AS a
        SET subject_id = m.subject_id
        FROM topics AS t
        JOIN modules AS m ON m.id = t.module_id
        WHERE a.topic_id = t.id AND a.subject_id IS NULL"""
    )
    op.execute(
        """UPDATE assessments AS a
        SET subject_id = (
            SELECT qb.subject_id
            FROM assessment_questions AS aq
            JOIN question_bank AS qb ON qb.id = aq.question_id
            WHERE aq.assessment_id = a.id
            ORDER BY aq.order_index
            LIMIT 1
        )
        WHERE a.subject_id IS NULL"""
    )
    op.execute(
        """INSERT INTO assessment_topics (id, assessment_id, topic_id, order_index)
        SELECT gen_random_uuid(), id, topic_id, 0
        FROM assessments
        WHERE topic_id IS NOT NULL
        ON CONFLICT (assessment_id, topic_id) DO NOTHING"""
    )
    op.execute("UPDATE assessments SET status = 'closed' WHERE is_active = false")
    op.alter_column("assessments", "status", server_default="draft")
    op.execute("ALTER TYPE attemptstatus ADD VALUE IF NOT EXISTS 'auto_submitted'")


def downgrade() -> None:
    op.drop_table("assessment_topics")
    op.drop_constraint("fk_question_bank_topic_id_topics", "question_bank", type_="foreignkey")
    op.drop_column("question_bank", "topic_id")
    op.drop_constraint("fk_assessments_subject_id_subjects", "assessments", type_="foreignkey")
    op.drop_column("assessments", "subject_id")
    op.drop_column("assessments", "status")
    op.drop_column("assessment_attempts", "is_makeup")