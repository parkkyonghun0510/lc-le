"""Add employee assignment system

Revision ID: add_employee_assignment_system
Revises: merge_soft_delete_and_existing
Create Date: 2025-10-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_employee_assignment_system'
down_revision = 'merge_soft_delete_and_existing'
branch_labels = None
depends_on = None


def upgrade():
    # Tables already exist from a previous partial migration
    # Just add the missing column to customer_applications
    
    # Add portfolio_officer_migrated field to customer_applications table
    op.add_column(
        'customer_applications',
        sa.Column('portfolio_officer_migrated', sa.Boolean(), nullable=False, server_default='false')
    )
    
    # Create index for portfolio_officer_migrated
    op.create_index('ix_applications_portfolio_officer_migrated', 'customer_applications', ['portfolio_officer_migrated'])


def downgrade():
    # Drop index from customer_applications
    op.drop_index('ix_applications_portfolio_officer_migrated', table_name='customer_applications')
    
    # Drop column from customer_applications
    op.drop_column('customer_applications', 'portfolio_officer_migrated')
    
    # Drop indexes from application_employee_assignments
    op.drop_index('ix_unique_assignment', table_name='application_employee_assignments')
    op.drop_index('ix_assignments_is_active', table_name='application_employee_assignments')
    op.drop_index('ix_assignments_assignment_role', table_name='application_employee_assignments')
    op.drop_index('ix_assignments_employee_id', table_name='application_employee_assignments')
    op.drop_index('ix_assignments_application_id', table_name='application_employee_assignments')
    
    # Drop foreign key constraints from application_employee_assignments
    op.drop_constraint('fk_assignments_assigned_by', 'application_employee_assignments', type_='foreignkey')
    op.drop_constraint('fk_assignments_employee_id', 'application_employee_assignments', type_='foreignkey')
    op.drop_constraint('fk_assignments_application_id', 'application_employee_assignments', type_='foreignkey')
    
    # Drop application_employee_assignments table
    op.drop_table('application_employee_assignments')
    
    # Drop indexes from employees
    op.drop_index('ix_employees_user_id', table_name='employees')
    op.drop_index('ix_employees_is_active', table_name='employees')
    op.drop_index('ix_employees_branch_id', table_name='employees')
    op.drop_index('ix_employees_department_id', table_name='employees')
    op.drop_index('ix_employees_employee_code', table_name='employees')
    
    # Drop foreign key constraints from employees
    op.drop_constraint('fk_employees_updated_by', 'employees', type_='foreignkey')
    op.drop_constraint('fk_employees_created_by', 'employees', type_='foreignkey')
    op.drop_constraint('fk_employees_user_id', 'employees', type_='foreignkey')
    op.drop_constraint('fk_employees_branch_id', 'employees', type_='foreignkey')
    op.drop_constraint('fk_employees_department_id', 'employees', type_='foreignkey')
    
    # Drop employees table
    op.drop_table('employees')
