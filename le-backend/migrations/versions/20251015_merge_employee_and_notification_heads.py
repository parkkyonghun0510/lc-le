"""merge employee and notification heads

Revision ID: merge_employee_notification
Revises: add_employee_assignment_system, cc3f3f59ab5b
Create Date: 2025-10-15 00:01:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'merge_employee_notification'
down_revision = ('add_employee_assignment_system', 'cc3f3f59ab5b')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
