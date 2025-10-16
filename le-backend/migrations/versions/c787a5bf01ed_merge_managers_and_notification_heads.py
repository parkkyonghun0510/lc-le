"""merge_managers_and_notification_heads

Revision ID: c787a5bf01ed
Revises: merge_employee_notification, 20251016_managers_to_employees
Create Date: 2025-10-16 16:34:17.527813

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c787a5bf01ed'
down_revision = ('merge_employee_notification', '20251016_managers_to_employees')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass