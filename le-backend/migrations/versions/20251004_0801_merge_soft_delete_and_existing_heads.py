"""merge soft delete and existing heads

Revision ID: merge_soft_delete_and_existing
Revises: add_soft_delete_users, 4f322d15e2d3
Create Date: 2025-10-04 08:01:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'merge_soft_delete_and_existing'
down_revision = ('add_soft_delete_users', '4f322d15e2d3')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass