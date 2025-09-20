"""merge portfolio and display_name branches

Revision ID: 68d8e56878b3
Revises: folder_constraints_001, 3c76b368, 768c789caf2d
Create Date: 2025-09-20 00:31:15.789387

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '68d8e56878b3'
down_revision = ('folder_constraints_001', '3c76b368', '768c789caf2d')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass