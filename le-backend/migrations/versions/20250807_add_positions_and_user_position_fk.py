"""Create positions table and add users.position_id

Revision ID: 20250807_add_positions_and_user_position_fk
Revises: 20250807_add_employee_id
Create Date: 2025-08-07 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250807_add_positions_and_user_position_fk'
down_revision = '20250807_add_employee_id'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create positions table
    op.create_table(
        'positions',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('title', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('level', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default=sa.text('true')),
        sa.Column('department_id', sa.UUID(as_uuid=True), sa.ForeignKey('departments.id'), nullable=False),
        sa.Column('branch_id', sa.UUID(as_uuid=True), sa.ForeignKey('branches.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    # Create index on positions.is_active (consistent ix_ naming)
    op.create_index('ix_positions_is_active', 'positions', ['is_active'], unique=False)

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

    # Drop positions table and its index
    op.drop_index('ix_positions_is_active', table_name='positions')
    op.drop_table('positions')