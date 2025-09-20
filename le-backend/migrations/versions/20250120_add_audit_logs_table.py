"""Add audit logs table for comprehensive security tracking

Revision ID: 20250120_add_audit_logs
Revises: previous_revision
Create Date: 2025-01-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250120_add_audit_logs_table'
down_revision = '0bf32b9cdbe2'  # Latest working revision
branch_labels = None
depends_on = None

def upgrade():
    # Create enum for audit event types (if it doesn't exist)
    # Check if enum exists first
    connection = op.get_bind()
    result = connection.execute(sa.text("""
        SELECT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'auditeventtype'
        )
    """))
    enum_exists = result.scalar()
    
    # Define the enum type
    audit_event_type = postgresql.ENUM(
        'user_action',
        'system_event', 
        'security',
        'access_control',
        'file_operation',
        'data_change',
        'validation',
        'error',
        name='auditeventtype'
    )
    
    if not enum_exists:
        audit_event_type.create(op.get_bind())
    
    # Create audit_logs table
    op.create_table('audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('event_type', audit_event_type, nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.String(length=255), nullable=True),
        sa.Column('user_id', sa.String(length=255), nullable=True),
        sa.Column('session_id', sa.String(length=255), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('request_id', sa.String(length=255), nullable=True),
        sa.Column('success', sa.String(length=10), nullable=False, server_default='true'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('duration_ms', sa.String(length=20), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for performance
    op.create_index('ix_audit_logs_event_type', 'audit_logs', ['event_type'])
    op.create_index('ix_audit_logs_entity_type', 'audit_logs', ['entity_type'])
    op.create_index('ix_audit_logs_entity_id', 'audit_logs', ['entity_id'])
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('ix_audit_logs_ip_address', 'audit_logs', ['ip_address'])
    op.create_index('ix_audit_logs_timestamp', 'audit_logs', ['timestamp'])
    
    # Create composite indexes for common queries
    op.create_index('ix_audit_logs_entity_type_id', 'audit_logs', ['entity_type', 'entity_id'])
    op.create_index('ix_audit_logs_user_timestamp', 'audit_logs', ['user_id', 'timestamp'])
    op.create_index('ix_audit_logs_event_timestamp', 'audit_logs', ['event_type', 'timestamp'])

def downgrade():
    # Drop indexes
    op.drop_index('ix_audit_logs_event_timestamp', table_name='audit_logs')
    op.drop_index('ix_audit_logs_user_timestamp', table_name='audit_logs')
    op.drop_index('ix_audit_logs_entity_type_id', table_name='audit_logs')
    op.drop_index('ix_audit_logs_timestamp', table_name='audit_logs')
    op.drop_index('ix_audit_logs_ip_address', table_name='audit_logs')
    op.drop_index('ix_audit_logs_action', table_name='audit_logs')
    op.drop_index('ix_audit_logs_user_id', table_name='audit_logs')
    op.drop_index('ix_audit_logs_entity_id', table_name='audit_logs')
    op.drop_index('ix_audit_logs_entity_type', table_name='audit_logs')
    op.drop_index('ix_audit_logs_event_type', table_name='audit_logs')
    
    # Drop table
    op.drop_table('audit_logs')
    
    # Drop enum
    audit_event_type = postgresql.ENUM(name='auditeventtype')
    audit_event_type.drop(op.get_bind())