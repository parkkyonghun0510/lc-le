"""Add performance indexes for common queries

Revision ID: 20250826_add_performance_indexes
Revises: ce3939ec2771
Create Date: 2025-08-26 14:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250826_add_performance_indexes'
down_revision = 'ce3939ec2771'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add indexes for frequently queried fields in customer_applications
    op.create_index('ix_customer_applications_status', 'customer_applications', ['status'])
    op.create_index('ix_customer_applications_user_id', 'customer_applications', ['user_id'])
    op.create_index('ix_customer_applications_created_at', 'customer_applications', ['created_at'])
    op.create_index('ix_customer_applications_loan_status', 'customer_applications', ['loan_status'])
    op.create_index('ix_customer_applications_risk_category', 'customer_applications', ['risk_category'])
    op.create_index('ix_customer_applications_product_type', 'customer_applications', ['product_type'])
    op.create_index('ix_customer_applications_priority_level', 'customer_applications', ['priority_level'])
    op.create_index('ix_customer_applications_assigned_reviewer', 'customer_applications', ['assigned_reviewer'])
    
    # Add compound indexes for common filter combinations
    op.create_index('ix_customer_applications_status_user_id', 'customer_applications', ['status', 'user_id'])
    op.create_index('ix_customer_applications_status_created_at', 'customer_applications', ['status', 'created_at'])
    
    # Add indexes for user table frequent lookups
    op.create_index('ix_users_username', 'users', ['username'])
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_employee_id', 'users', ['employee_id'])
    op.create_index('ix_users_role', 'users', ['role'])
    op.create_index('ix_users_department_id', 'users', ['department_id'])
    op.create_index('ix_users_branch_id', 'users', ['branch_id'])
    op.create_index('ix_users_position_id', 'users', ['position_id'])
    op.create_index('ix_users_status', 'users', ['status'])
    
    # Add indexes for files table
    op.create_index('ix_files_application_id', 'files', ['application_id'])
    op.create_index('ix_files_folder_id', 'files', ['folder_id'])
    op.create_index('ix_files_uploaded_by', 'files', ['uploaded_by'])
    op.create_index('ix_files_created_at', 'files', ['created_at'])
    
    # Add indexes for folders table
    op.create_index('ix_folders_application_id', 'folders', ['application_id'])
    op.create_index('ix_folders_parent_id', 'folders', ['parent_id'])
    
    # Add indexes for departments table
    op.create_index('ix_departments_name', 'departments', ['name'])
    op.create_index('ix_departments_code', 'departments', ['code'])
    op.create_index('ix_departments_is_active', 'departments', ['is_active'])
    op.create_index('ix_departments_manager_id', 'departments', ['manager_id'])
    
    # Add indexes for branches table
    op.create_index('ix_branches_name', 'branches', ['name'])
    op.create_index('ix_branches_code', 'branches', ['code'])
    op.create_index('ix_branches_is_active', 'branches', ['is_active'])
    op.create_index('ix_branches_manager_id', 'branches', ['manager_id'])
    
    # Add indexes for positions table
    op.create_index('ix_positions_name', 'positions', ['name'])
    op.create_index('ix_positions_is_active', 'positions', ['is_active'])
    
    # Add indexes for settings table
    op.create_index('ix_settings_key', 'settings', ['key'])
    op.create_index('ix_settings_category', 'settings', ['category'])
    op.create_index('ix_settings_is_public', 'settings', ['is_public'])


def downgrade() -> None:
    # Drop all the indexes in reverse order
    op.drop_index('ix_settings_is_public', table_name='settings')
    op.drop_index('ix_settings_category', table_name='settings')
    op.drop_index('ix_settings_key', table_name='settings')
    
    op.drop_index('ix_positions_is_active', table_name='positions')
    op.drop_index('ix_positions_name', table_name='positions')
    
    op.drop_index('ix_branches_manager_id', table_name='branches')
    op.drop_index('ix_branches_is_active', table_name='branches')
    op.drop_index('ix_branches_code', table_name='branches')
    op.drop_index('ix_branches_name', table_name='branches')
    
    op.drop_index('ix_departments_manager_id', table_name='departments')
    op.drop_index('ix_departments_is_active', table_name='departments')
    op.drop_index('ix_departments_code', table_name='departments')
    op.drop_index('ix_departments_name', table_name='departments')
    
    op.drop_index('ix_folders_parent_id', table_name='folders')
    op.drop_index('ix_folders_application_id', table_name='folders')
    
    op.drop_index('ix_files_created_at', table_name='files')
    op.drop_index('ix_files_uploaded_by', table_name='files')
    op.drop_index('ix_files_folder_id', table_name='files')
    op.drop_index('ix_files_application_id', table_name='files')
    
    op.drop_index('ix_users_status', table_name='users')
    op.drop_index('ix_users_position_id', table_name='users')
    op.drop_index('ix_users_branch_id', table_name='users')
    op.drop_index('ix_users_department_id', table_name='users')
    op.drop_index('ix_users_role', table_name='users')
    op.drop_index('ix_users_employee_id', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_index('ix_users_username', table_name='users')
    
    op.drop_index('ix_customer_applications_status_created_at', table_name='customer_applications')
    op.drop_index('ix_customer_applications_status_user_id', table_name='customer_applications')
    
    op.drop_index('ix_customer_applications_assigned_reviewer', table_name='customer_applications')
    op.drop_index('ix_customer_applications_priority_level', table_name='customer_applications')
    op.drop_index('ix_customer_applications_product_type', table_name='customer_applications')
    op.drop_index('ix_customer_applications_risk_category', table_name='customer_applications')
    op.drop_index('ix_customer_applications_loan_status', table_name='customer_applications')
    op.drop_index('ix_customer_applications_created_at', table_name='customer_applications')
    op.drop_index('ix_customer_applications_user_id', table_name='customer_applications')
    op.drop_index('ix_customer_applications_status', table_name='customer_applications')