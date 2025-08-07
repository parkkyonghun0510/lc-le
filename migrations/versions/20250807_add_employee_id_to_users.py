"""add employee_id to users table

Revision ID: 20250807_add_employee_id
Revises: 48f8d5284a84
Create Date: 2025-08-07 10:20:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250807_add_employee_id'
down_revision = '48f8d5284a84'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('users', sa.Column('employee_id', sa.String(length=4), unique=True, nullable=True, comment='4-digit HR employee ID'))

def downgrade() -> None:
    op.drop_column('users', 'employee_id')
