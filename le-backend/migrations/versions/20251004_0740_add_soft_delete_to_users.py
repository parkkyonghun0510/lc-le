"""Add soft delete fields to users table

Revision ID: add_soft_delete_users
Revises: 20250919_164421_3c76b368
Create Date: 2025-10-04 07:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_soft_delete_users'
down_revision = '20250826_add_performance_indexes'
branch_labels = None
depends_on = None


def upgrade():
    # Add soft delete fields to users table
    op.add_column('users', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('deleted_by', postgresql.UUID(as_uuid=True), nullable=True))

    # Add foreign key constraint for deleted_by
    op.create_foreign_key(
        'fk_users_deleted_by',
        'users',
        'users',
        ['deleted_by'],
        ['id'],
        ondelete='SET NULL'
    )

    # Add index for better query performance on soft delete queries
    op.create_index('ix_users_is_deleted', 'users', ['is_deleted'])
    op.create_index('ix_users_deleted_at', 'users', ['deleted_at'])


def downgrade():
    # Drop indexes
    op.drop_index('ix_users_deleted_at', table_name='users')
    op.drop_index('ix_users_is_deleted', table_name='users')

    # Drop foreign key constraint
    op.drop_constraint('fk_users_deleted_by', 'users', type_='foreignkey')

    # Drop columns
    op.drop_column('users', 'deleted_by')
    op.drop_column('users', 'deleted_at')
    op.drop_column('users', 'is_deleted')