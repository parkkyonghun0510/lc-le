"""Add permission audit trail table

Revision ID: 20250119_permission_audit_trail
Revises: 20251016_managers_to_employees
Create Date: 2025-01-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250119_permission_audit_trail'
down_revision = '20251016_managers_to_employees'
branch_labels = None
depends_on = None


def upgrade():
    """Create permission_audit_trail table with all necessary columns and indexes."""
    
    # Create permission_audit_trail table
    op.create_table(
        'permission_audit_trail',
        sa.Column('id', sa.BigInteger(), nullable=False, autoincrement=True),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('target_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('target_role_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('permission_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create foreign key constraints
    op.create_foreign_key(
        'fk_audit_user_id',
        'permission_audit_trail', 'users',
        ['user_id'], ['id'],
        ondelete='SET NULL'
    )
    
    op.create_foreign_key(
        'fk_audit_target_user_id',
        'permission_audit_trail', 'users',
        ['target_user_id'], ['id'],
        ondelete='SET NULL'
    )
    
    op.create_foreign_key(
        'fk_audit_target_role_id',
        'permission_audit_trail', 'roles',
        ['target_role_id'], ['id'],
        ondelete='SET NULL'
    )
    
    op.create_foreign_key(
        'fk_audit_permission_id',
        'permission_audit_trail', 'permissions',
        ['permission_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # Create indexes for performance
    op.create_index(
        'ix_audit_action',
        'permission_audit_trail',
        ['action']
    )
    
    op.create_index(
        'ix_audit_entity',
        'permission_audit_trail',
        ['entity_type', 'entity_id']
    )
    
    op.create_index(
        'ix_audit_user_id',
        'permission_audit_trail',
        ['user_id']
    )
    
    op.create_index(
        'ix_audit_timestamp',
        'permission_audit_trail',
        ['timestamp']
    )


def downgrade():
    """Drop permission_audit_trail table and all associated indexes and constraints."""
    
    # Drop indexes
    op.drop_index('ix_audit_timestamp', table_name='permission_audit_trail')
    op.drop_index('ix_audit_user_id', table_name='permission_audit_trail')
    op.drop_index('ix_audit_entity', table_name='permission_audit_trail')
    op.drop_index('ix_audit_action', table_name='permission_audit_trail')
    
    # Drop foreign key constraints
    op.drop_constraint('fk_audit_permission_id', 'permission_audit_trail', type_='foreignkey')
    op.drop_constraint('fk_audit_target_role_id', 'permission_audit_trail', type_='foreignkey')
    op.drop_constraint('fk_audit_target_user_id', 'permission_audit_trail', type_='foreignkey')
    op.drop_constraint('fk_audit_user_id', 'permission_audit_trail', type_='foreignkey')
    
    # Drop table
    op.drop_table('permission_audit_trail')
