"""Add optional notification metadata.

Revision ID: d28c7a9e4b61
Revises: c51d2a8e7f34
Create Date: 2026-10-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d28c7a9e4b61"
down_revision: Union[str, Sequence[str], None] = "c51d2a8e7f34"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("notifications", sa.Column("data", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("notifications", "data")
