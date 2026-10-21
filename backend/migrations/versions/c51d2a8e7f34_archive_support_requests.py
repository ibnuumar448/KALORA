"""Archive legacy support requests.

Revision ID: c51d2a8e7f34
Revises: a3f6c9d18b42
Create Date: 2026-10-13

"""
from typing import Sequence, Union

from alembic import op


revision: str = "c51d2a8e7f34"
down_revision: Union[str, Sequence[str], None] = "a3f6c9d18b42"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.rename_table("support_requests", "support_requests_archived")


def downgrade() -> None:
    op.rename_table("support_requests_archived", "support_requests")
