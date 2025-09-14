"""add_display_name_to_files

Revision ID: 768c789caf2d
Revises: 52ee6f15ef31
Create Date: 2025-09-14 16:42:20.674715

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '768c789caf2d'
down_revision = '52ee6f15ef31'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add display_name column to files table
    op.add_column('files', sa.Column('display_name', sa.String(255), nullable=True))
    
    # Update existing records to set display_name from original_filename
    op.execute("UPDATE files SET display_name = original_filename WHERE display_name IS NULL")


def downgrade() -> None:
    # Remove display_name column from files table
    op.drop_column('files', 'display_name')