"""Add persistent verification email resend limits.

Revision ID: 8c1f5a3d7e20
Revises: 4b7d9e2a1c60
Create Date: 2026-10-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8c1f5a3d7e20"
down_revision: Union[str, Sequence[str], None] = "4b7d9e2a1c60"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("verification_email_last_attempt_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "users",
        sa.Column("verification_email_window_started_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("verification_email_send_count", sa.Integer(), server_default="0", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("users", "verification_email_send_count")
    op.drop_column("users", "verification_email_window_started_at")
    op.drop_column("users", "verification_email_last_attempt_at")
