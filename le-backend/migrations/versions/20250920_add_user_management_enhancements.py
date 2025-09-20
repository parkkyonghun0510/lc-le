"""Add user management enhancements - new tables and user fields

Revision ID: 20250920_add_user_management_enhancements
Revises: 20250919_164421_3c76b368_add_portfolio_line_manager_to_users
Create Date: 2025-09-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'user_mgmt_enhance'
down_revision = '3c76b368'
branch_labels = None
depends_on = None

def upgrade():
    # Add new fields to users table
    op.add_column('users', sa.Column('status_reason', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('last_activity_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('login_count', sa.Integer(), nullable=True, server_default='0'))
    op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), nullable=True, server_default='0'))
    op.add_column('users', sa.Column('onboarding_completed', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('users', sa.Column('onboarding_completed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('offboarding_initiated_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('offboarding_completed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('notification_preferences', sa.JSON(), nullable=True))
    op.add_column('users', sa.Column('ui_preferences', sa.JSON(), nullable=True))
    
    # Create user_activities table
    op.create_table('user_activities',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('activity_type', sa.String(length=50), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('session_id', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create bulk_operations table
    op.create_table('bulk_operations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('operation_type', sa.String(length=50), nullable=False),
        sa.Column('performed_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('target_criteria', sa.JSON(), nullable=True),
        sa.Column('changes_applied', sa.JSON(), nullable=True),
        sa.Column('total_records', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('successful_records', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('failed_records', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('error_details', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True, server_default='pending'),
        sa.Column('file_path', sa.String(length=500), nullable=True),
        sa.Column('progress_percentage', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('estimated_completion', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['performed_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create user_status_history table
    op.create_table('user_status_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('old_status', sa.String(length=20), nullable=True),
        sa.Column('new_status', sa.String(length=20), nullable=False),
        sa.Column('reason_code', sa.String(length=50), nullable=True),
        sa.Column('reason_comment', sa.Text(), nullable=True),
        sa.Column('changed_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('changed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('effective_date', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create notifications table
    op.create_table('notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('data', sa.JSON(), nullable=True),
        sa.Column('priority', sa.String(length=20), nullable=True, server_default='normal'),
        sa.Column('is_read', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('is_dismissed', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('dismissed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for user_activities
    op.create_index('ix_user_activities_user_id', 'user_activities', ['user_id'])
    op.create_index('ix_user_activities_activity_type', 'user_activities', ['activity_type'])
    op.create_index('ix_user_activities_created_at', 'user_activities', ['created_at'])
    op.create_index('ix_user_activities_user_created', 'user_activities', ['user_id', 'created_at'])
    
    # Create indexes for bulk_operations
    op.create_index('ix_bulk_operations_performed_by', 'bulk_operations', ['performed_by'])
    op.create_index('ix_bulk_operations_operation_type', 'bulk_operations', ['operation_type'])
    op.create_index('ix_bulk_operations_status', 'bulk_operations', ['status'])
    op.create_index('ix_bulk_operations_created_at', 'bulk_operations', ['created_at'])
    
    # Create indexes for user_status_history
    op.create_index('ix_user_status_history_user_id', 'user_status_history', ['user_id'])
    op.create_index('ix_user_status_history_changed_by', 'user_status_history', ['changed_by'])
    op.create_index('ix_user_status_history_changed_at', 'user_status_history', ['changed_at'])
    op.create_index('ix_user_status_history_new_status', 'user_status_history', ['new_status'])
    
    # Create indexes for notifications
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_type', 'notifications', ['type'])
    op.create_index('ix_notifications_is_read', 'notifications', ['is_read'])
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])
    op.create_index('ix_notifications_user_unread', 'notifications', ['user_id', 'is_read'])
    
    # Create additional performance indexes for users table
    op.create_index('ix_users_status', 'users', ['status'])
    op.create_index('ix_users_last_activity_at', 'users', ['last_activity_at'])
    op.create_index('ix_users_onboarding_completed', 'users', ['onboarding_completed'])
    op.create_index('ix_users_status_activity', 'users', ['status', 'last_activity_at'])


def downgrade():
    # Drop indexes for users table
    op.drop_index('ix_users_status_activity', table_name='users')
    op.drop_index('ix_users_onboarding_completed', table_name='users')
    op.drop_index('ix_users_last_activity_at', table_name='users')
    op.drop_index('ix_users_status', table_name='users')
    
    # Drop indexes for notifications
    op.drop_index('ix_notifications_user_unread', table_name='notifications')
    op.drop_index('ix_notifications_created_at', table_name='notifications')
    op.drop_index('ix_notifications_is_read', table_name='notifications')
    op.drop_index('ix_notifications_type', table_name='notifications')
    op.drop_index('ix_notifications_user_id', table_name='notifications')
    
    # Drop indexes for user_status_history
    op.drop_index('ix_user_status_history_new_status', table_name='user_status_history')
    op.drop_index('ix_user_status_history_changed_at', table_name='user_status_history')
    op.drop_index('ix_user_status_history_changed_by', table_name='user_status_history')
    op.drop_index('ix_user_status_history_user_id', table_name='user_status_history')
    
    # Drop indexes for bulk_operations
    op.drop_index('ix_bulk_operations_created_at', table_name='bulk_operations')
    op.drop_index('ix_bulk_operations_status', table_name='bulk_operations')
    op.drop_index('ix_bulk_operations_operation_type', table_name='bulk_operations')
    op.drop_index('ix_bulk_operations_performed_by', table_name='bulk_operations')
    
    # Drop indexes for user_activities
    op.drop_index('ix_user_activities_user_created', table_name='user_activities')
    op.drop_index('ix_user_activities_created_at', table_name='user_activities')
    op.drop_index('ix_user_activities_activity_type', table_name='user_activities')
    op.drop_index('ix_user_activities_user_id', table_name='user_activities')
    
    # Drop tables
    op.drop_table('notifications')
    op.drop_table('user_status_history')
    op.drop_table('bulk_operations')
    op.drop_table('user_activities')
    
    # Drop columns from users table
    op.drop_column('users', 'ui_preferences')
    op.drop_column('users', 'notification_preferences')
    op.drop_column('users', 'offboarding_completed_at')
    op.drop_column('users', 'offboarding_initiated_at')
    op.drop_column('users', 'onboarding_completed_at')
    op.drop_column('users', 'onboarding_completed')
    op.drop_column('users', 'failed_login_attempts')
    op.drop_column('users', 'login_count')
    op.drop_column('users', 'last_activity_at')
    op.drop_column('users', 'status_reason')