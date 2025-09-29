"""merge_multiple_heads_final

Revision ID: 4f322d15e2d3
Revises: 20250127_add_advanced_performance_indexes, 40aa48a7ff86, add_permission_system
Create Date: 2025-09-29 17:01:05.701508

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4f322d15e2d3'
down_revision = ('20250127_add_advanced_performance_indexes', '40aa48a7ff86', 'add_permission_system')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass