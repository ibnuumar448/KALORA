"""Add phone and profile_picture_url to User

Revision ID: 9a2dd0986a1a
Revises: 3e16be3a3edc
Create Date: 2026-10-09 01:59:40.951713

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9a2dd0986a1a'
down_revision: Union[str, Sequence[str], None] = '3e16be3a3edc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('phone', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('profile_picture_url', sa.String(length=1024), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'profile_picture_url')
    op.drop_column('users', 'phone')
