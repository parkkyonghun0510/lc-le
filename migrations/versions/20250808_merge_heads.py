"""merge heads: folders and positions branches

Revision ID: 20250808_merge_heads
Revises: dee9dfea44a2, 20250808_add_folders
Create Date: 2025-08-08 00:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250808_merge_heads'
down_revision = ('dee9dfea44a2', '20250808_add_folders')
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This is a merge migration; no operations needed.
    pass


def downgrade() -> None:
    # No downgrade for merge marker.
    pass


