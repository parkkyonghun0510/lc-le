"""Add position_id to users table

Revision ID: 1b9af58a72d2
Revises: 20250807_add_positions_and_user_position_fk
Create Date: 2025-08-07 16:22:39.287792

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1b9af58a72d2'
down_revision = '20250807_add_positions_and_user_position_fk'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add position_id to users with index and FK
    op.add_column('users', sa.Column('position_id', sa.UUID(as_uuid=True), nullable=True))
    op.create_index('ix_users_position_id', 'users', ['position_id'], unique=False)
    op.create_foreign_key(
        'fk_users_position_id_positions',
        source_table='users',
        referent_table='positions',
        local_cols=['position_id'],
        remote_cols=['id'],
        ondelete=None
    )


def downgrade() -> None:
    # Drop FK and column from users
    op.drop_constraint('fk_users_position_id_positions', 'users', type_='foreignkey')
    op.drop_index('ix_users_position_id', table_name='users')
    op.drop_column('users', 'position_id')