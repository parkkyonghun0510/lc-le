"""Add advanced performance indexes for user management queries

Revision ID: 20250127_add_advanced_performance_indexes
Revises: 20250826_add_performance_indexes
Create Date: 2025-01-27 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250127_add_advanced_performance_indexes'
down_revision = '20250826_add_performance_indexes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add indexes for user activity and login tracking
    op.create_index('ix_users_last_login_at', 'users', ['last_login_at'])
    op.create_index('ix_users_created_at', 'users', ['created_at'])
    op.create_index('ix_users_updated_at', 'users', ['updated_at'])
    op.create_index('ix_users_last_activity_at', 'users', ['last_activity_at'])
    op.create_index('ix_users_login_count', 'users', ['login_count'])
    op.create_index('ix_users_failed_login_attempts', 'users', ['failed_login_attempts'])
    
    # Add compound indexes for common user filtering combinations
    op.create_index('ix_users_status_created_at', 'users', ['status', 'created_at'])
    op.create_index('ix_users_status_last_login_at', 'users', ['status', 'last_login_at'])
    op.create_index('ix_users_role_status', 'users', ['role', 'status'])
    op.create_index('ix_users_department_status', 'users', ['department_id', 'status'])
    op.create_index('ix_users_branch_status', 'users', ['branch_id', 'status'])
    op.create_index('ix_users_position_status', 'users', ['position_id', 'status'])
    
    # Add indexes for activity level filtering
    op.create_index('ix_users_activity_level', 'users', ['status', 'last_login_at', 'created_at'])
    op.create_index('ix_users_dormant_detection', 'users', ['status', 'last_login_at'])
    
    # Add indexes for sorting operations
    op.create_index('ix_users_created_at_desc', 'users', [sa.text('created_at DESC')])
    op.create_index('ix_users_last_login_at_desc', 'users', [sa.text('last_login_at DESC NULLS LAST')])
    op.create_index('ix_users_username_asc', 'users', [sa.text('username ASC')])
    op.create_index('ix_users_email_asc', 'users', [sa.text('email ASC')])
    
    # Add indexes for search operations
    op.create_index('ix_users_first_name_trgm', 'users', [sa.text('first_name gin_trgm_ops')], postgresql_using='gin')
    op.create_index('ix_users_last_name_trgm', 'users', [sa.text('last_name gin_trgm_ops')], postgresql_using='gin')
    op.create_index('ix_users_full_name_search', 'users', [sa.text('(first_name || \' \' || last_name) gin_trgm_ops')], postgresql_using='gin')
    
    # Add indexes for user management relationships
    op.create_index('ix_users_portfolio_id', 'users', ['portfolio_id'])
    op.create_index('ix_users_line_manager_id', 'users', ['line_manager_id'])
    op.create_index('ix_users_status_changed_by', 'users', ['status_changed_by'])
    
    # Add indexes for audit and lifecycle tracking
    op.create_index('ix_users_status_changed_at', 'users', ['status_changed_at'])
    op.create_index('ix_users_onboarding_completed', 'users', ['onboarding_completed'])
    op.create_index('ix_users_onboarding_completed_at', 'users', ['onboarding_completed_at'])
    
    # Add partial indexes for active users (most common queries)
    op.create_index('ix_users_active_created_at', 'users', ['created_at'], postgresql_where=sa.text("status = 'active'"))
    op.create_index('ix_users_active_last_login', 'users', ['last_login_at'], postgresql_where=sa.text("status = 'active'"))
    op.create_index('ix_users_active_department', 'users', ['department_id'], postgresql_where=sa.text("status = 'active'"))
    op.create_index('ix_users_active_branch', 'users', ['branch_id'], postgresql_where=sa.text("status = 'active'"))
    
    # Add indexes for bulk operations and CSV export
    op.create_index('ix_users_export_sort', 'users', ['created_at', 'username', 'email'])
    op.create_index('ix_users_bulk_operations', 'users', ['status', 'role', 'department_id', 'branch_id'])
    
    # Add indexes for analytics queries
    op.create_index('ix_users_analytics_activity', 'users', ['last_activity_at', 'login_count', 'status'])
    op.create_index('ix_users_analytics_org', 'users', ['department_id', 'branch_id', 'role', 'status'])
    op.create_index('ix_users_analytics_trends', 'users', ['created_at', 'last_login_at', 'status'])
    
    # Add indexes for notification and lifecycle management
    op.create_index('ix_users_notification_eligible', 'users', ['status', 'last_login_at', 'onboarding_completed'])
    op.create_index('ix_users_lifecycle_tracking', 'users', ['created_at', 'onboarding_completed', 'status'])
    
    # Add indexes for security and failed login tracking
    op.create_index('ix_users_security_failed_logins', 'users', ['failed_login_attempts', 'last_login_at'])
    op.create_index('ix_users_security_lockout', 'users', ['status', 'failed_login_attempts', 'last_activity_at'])
    
    # Add indexes for reference data tables to improve join performance
    op.create_index('ix_departments_active', 'departments', ['is_active', 'name'])
    op.create_index('ix_branches_active', 'branches', ['is_active', 'name'])
    op.create_index('ix_positions_active', 'positions', ['is_active', 'name'])
    
    # Add indexes for audit logs (if they exist)
    try:
        op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'])
        op.create_index('ix_audit_logs_table_record', 'audit_logs', ['table_name', 'record_id'])
        op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])
        op.create_index('ix_audit_logs_action', 'audit_logs', ['action', 'created_at'])
    except Exception:
        # Audit logs table might not exist yet, skip these indexes
        pass


def downgrade() -> None:
    # Drop indexes in reverse order
    try:
        op.drop_index('ix_audit_logs_action', table_name='audit_logs')
        op.drop_index('ix_audit_logs_created_at', table_name='audit_logs')
        op.drop_index('ix_audit_logs_table_record', table_name='audit_logs')
        op.drop_index('ix_audit_logs_user_id', table_name='audit_logs')
    except Exception:
        pass
    
    op.drop_index('ix_positions_active', table_name='positions')
    op.drop_index('ix_branches_active', table_name='branches')
    op.drop_index('ix_departments_active', table_name='departments')
    
    op.drop_index('ix_users_security_lockout', table_name='users')
    op.drop_index('ix_users_security_failed_logins', table_name='users')
    op.drop_index('ix_users_lifecycle_tracking', table_name='users')
    op.drop_index('ix_users_notification_eligible', table_name='users')
    op.drop_index('ix_users_analytics_trends', table_name='users')
    op.drop_index('ix_users_analytics_org', table_name='users')
    op.drop_index('ix_users_analytics_activity', table_name='users')
    op.drop_index('ix_users_bulk_operations', table_name='users')
    op.drop_index('ix_users_export_sort', table_name='users')
    
    op.drop_index('ix_users_active_branch', table_name='users')
    op.drop_index('ix_users_active_department', table_name='users')
    op.drop_index('ix_users_active_last_login', table_name='users')
    op.drop_index('ix_users_active_created_at', table_name='users')
    
    op.drop_index('ix_users_onboarding_completed_at', table_name='users')
    op.drop_index('ix_users_onboarding_completed', table_name='users')
    op.drop_index('ix_users_status_changed_at', table_name='users')
    op.drop_index('ix_users_status_changed_by', table_name='users')
    op.drop_index('ix_users_line_manager_id', table_name='users')
    op.drop_index('ix_users_portfolio_id', table_name='users')
    
    op.drop_index('ix_users_full_name_search', table_name='users')
    op.drop_index('ix_users_last_name_trgm', table_name='users')
    op.drop_index('ix_users_first_name_trgm', table_name='users')
    
    op.drop_index('ix_users_email_asc', table_name='users')
    op.drop_index('ix_users_username_asc', table_name='users')
    op.drop_index('ix_users_last_login_at_desc', table_name='users')
    op.drop_index('ix_users_created_at_desc', table_name='users')
    
    op.drop_index('ix_users_dormant_detection', table_name='users')
    op.drop_index('ix_users_activity_level', table_name='users')
    op.drop_index('ix_users_position_status', table_name='users')
    op.drop_index('ix_users_branch_status', table_name='users')
    op.drop_index('ix_users_department_status', table_name='users')
    op.drop_index('ix_users_role_status', table_name='users')
    op.drop_index('ix_users_status_last_login_at', table_name='users')
    op.drop_index('ix_users_status_created_at', table_name='users')
    
    op.drop_index('ix_users_failed_login_attempts', table_name='users')
    op.drop_index('ix_users_login_count', table_name='users')
    op.drop_index('ix_users_last_activity_at', table_name='users')
    op.drop_index('ix_users_updated_at', table_name='users')
    op.drop_index('ix_users_created_at', table_name='users')
    op.drop_index('ix_users_last_login_at', table_name='users')
