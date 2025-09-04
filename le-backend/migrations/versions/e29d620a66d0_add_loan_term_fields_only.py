"""Add loan term fields only

Revision ID: e29d620a66d0
Revises: 9aabdcfcb415
Create Date: 2025-09-03 22:04:17.408196

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e29d620a66d0'
down_revision = 'audit_logs_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add loan term fields to customer_applications table
    op.add_column('customer_applications', sa.Column('loan_term_duration', sa.String(length=10), nullable=True))
    op.add_column('customer_applications', sa.Column('loan_term_frequency', sa.String(length=20), nullable=True))


def downgrade() -> None:
    # Remove loan term fields from customer_applications table
    op.drop_column('customer_applications', 'loan_term_frequency')
    op.drop_column('customer_applications', 'loan_term_duration')