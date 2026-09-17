"""update_application_models

Revision ID: 60e35809a281
Revises: 9a992dc75eac
Create Date: 2026-09-09 23:56:01.101020

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '60e35809a281'
down_revision: Union[str, Sequence[str], None] = '9a992dc75eac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new values to applicationstatus enum
    op.execute("ALTER TYPE applicationstatus ADD VALUE IF NOT EXISTS 'draft'")
    op.execute("ALTER TYPE applicationstatus ADD VALUE IF NOT EXISTS 'submitted'")
    op.execute("ALTER TYPE applicationstatus ADD VALUE IF NOT EXISTS 'pending_review'")
    op.execute("ALTER TYPE applicationstatus ADD VALUE IF NOT EXISTS 'under_review'")

    # Add columns to applications
    op.add_column('applications', sa.Column('application_number', sa.String(length=50), nullable=True))
    op.create_index(op.f('ix_applications_application_number'), 'applications', ['application_number'], unique=True)
    
    op.add_column('applications', sa.Column('dob', sa.Date(), nullable=True))
    op.add_column('applications', sa.Column('gender', sa.String(length=20), nullable=True))
    op.add_column('applications', sa.Column('phone', sa.String(length=50), nullable=True))
    op.add_column('applications', sa.Column('state_of_origin', sa.String(length=100), nullable=True))
    op.add_column('applications', sa.Column('lga', sa.String(length=100), nullable=True))
    op.add_column('applications', sa.Column('town', sa.String(length=100), nullable=True))
    op.add_column('applications', sa.Column('residential_address', sa.Text(), nullable=True))
    
    op.add_column('applications', sa.Column('academic_status', sa.String(length=50), nullable=True))
    op.add_column('applications', sa.Column('school_name', sa.String(length=255), nullable=True))
    op.add_column('applications', sa.Column('current_class', sa.String(length=50), nullable=True))
    op.add_column('applications', sa.Column('graduation_year', sa.Integer(), nullable=True))
    
    op.add_column('applications', sa.Column('intended_jamb_year', sa.Integer(), nullable=True))
    op.add_column('applications', sa.Column('intended_course', sa.String(length=255), nullable=True))
    op.add_column('applications', sa.Column('preferred_institution', sa.String(length=255), nullable=True))
    op.add_column('applications', sa.Column('selected_subjects', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    
    op.add_column('applications', sa.Column('parent_name', sa.String(length=255), nullable=True))
    op.add_column('applications', sa.Column('parent_relationship', sa.String(length=100), nullable=True))
    op.add_column('applications', sa.Column('parent_phone', sa.String(length=50), nullable=True))
    op.add_column('applications', sa.Column('parent_email', sa.String(length=255), nullable=True))
    op.add_column('applications', sa.Column('parent_address', sa.Text(), nullable=True))

    # Create documenttype enum
    documenttype = postgresql.ENUM('PROFILE_PICTURE', 'OLEVEL_RESULT', 'REPORT_CARD', name='documenttype')
    documenttype.create(op.get_bind())

    # Create application_documents table
    op.create_table('application_documents',
    sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('application_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('document_type', postgresql.ENUM('PROFILE_PICTURE', 'OLEVEL_RESULT', 'REPORT_CARD', name='documenttype', create_type=False), nullable=False),
    sa.Column('file_url', sa.String(length=1024), nullable=False),
    sa.Column('original_filename', sa.String(length=255), nullable=False),
    sa.Column('mime_type', sa.String(length=100), nullable=False),
    sa.Column('file_size', sa.Integer(), nullable=False),
    sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )

    # Create olevelexamtype enum
    olevelexamtype = postgresql.ENUM('WAEC', 'NECO', 'NABTEB', name='olevelexamtype')
    olevelexamtype.create(op.get_bind())

    # Create olevel_results table
    op.create_table('olevel_results',
    sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('application_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('examination_type', postgresql.ENUM('WAEC', 'NECO', 'NABTEB', name='olevelexamtype', create_type=False), nullable=False),
    sa.Column('examination_year', sa.Integer(), nullable=False),
    sa.Column('examination_number', sa.String(length=100), nullable=False),
    sa.Column('candidate_number', sa.String(length=100), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )

    # Create olevel_subject_results table
    op.create_table('olevel_subject_results',
    sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('olevel_result_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('subject', sa.String(length=100), nullable=False),
    sa.Column('grade', sa.String(length=10), nullable=False),
    sa.ForeignKeyConstraint(['olevel_result_id'], ['olevel_results.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )

def downgrade() -> None:
    op.drop_table('olevel_subject_results')
    op.drop_table('olevel_results')
    op.drop_table('application_documents')
    
    op.execute("DROP TYPE documenttype")
    op.execute("DROP TYPE olevelexamtype")
    
    columns_to_drop = [
        'parent_address', 'parent_email', 'parent_phone', 'parent_relationship', 'parent_name',
        'selected_subjects', 'preferred_institution', 'intended_course', 'intended_jamb_year',
        'graduation_year', 'current_class', 'school_name', 'academic_status',
        'residential_address', 'town', 'lga', 'state_of_origin', 'phone', 'gender', 'dob'
    ]
    for col in columns_to_drop:
        op.drop_column('applications', col)
    
    op.drop_index(op.f('ix_applications_application_number'), table_name='applications')
    op.drop_column('applications', 'application_number')
