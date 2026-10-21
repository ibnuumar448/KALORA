"""Add expiring email verification tokens and grandfather existing accounts.

Revision ID: 4b7d9e2a1c60
Revises: e91c4a7d2f60
Create Date: 2026-10-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4b7d9e2a1c60"
down_revision: Union[str, Sequence[str], None] = "e91c4a7d2f60"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("verification_token_hash", sa.String(length=64), nullable=True))
    op.add_column(
        "users",
        sa.Column("verification_token_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column("users", sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(
        "ix_users_verification_token_hash",
        "users",
        ["verification_token_hash"],
        unique=True,
    )

    # Accounts present when this migration runs are grandfathered to prevent
    # verification enforcement from locking out existing users.
    op.execute(
        """
        UPDATE users
        SET is_email_verified = TRUE,
            email_verified_at = COALESCE(email_verified_at, now()),
            verification_token = NULL,
            verification_token_hash = NULL,
            verification_token_expires_at = NULL
        """
    )


def downgrade() -> None:
    op.drop_index("ix_users_verification_token_hash", table_name="users")
    op.drop_column("users", "email_verified_at")
    op.drop_column("users", "verification_token_expires_at")
    op.drop_column("users", "verification_token_hash")
