"""merge_multiple_heads

Revision ID: 4e3a0d3ed7ff
Revises: folder_constraints_001, 3c76b368, 768c789caf2d
Create Date: 2025-09-26 20:30:17.148874

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4e3a0d3ed7ff'
down_revision = ('folder_constraints_001', '3c76b368', '768c789caf2d')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass