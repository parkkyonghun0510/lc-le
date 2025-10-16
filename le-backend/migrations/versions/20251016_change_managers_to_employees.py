"""Change portfolio and line manager to reference employees

Revision ID: 20251016_managers_to_employees
Revises: 20251015_add_employee_assignment_system
Create Date: 2025-10-16 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251016_managers_to_employees'
down_revision = 'add_employee_assignment_system'
branch_labels = None
depends_on = None


def upgrade():
    # Drop existing foreign key constraints
    op.drop_constraint('users_portfolio_id_fkey', 'users', type_='foreignkey')
    op.drop_constraint('users_line_manager_id_fkey', 'users', type_='foreignkey')
    
    # Clear invalid portfolio_id and line_manager_id values that don't exist in employees table
    # This is necessary because we're changing the foreign key reference from users to employees
    op.execute("""
        UPDATE users 
        SET portfolio_id = NULL 
        WHERE portfolio_id IS NOT NULL 
        AND portfolio_id NOT IN (SELECT id FROM employees)
    """)
    
    op.execute("""
        UPDATE users 
        SET line_manager_id = NULL 
        WHERE line_manager_id IS NOT NULL 
        AND line_manager_id NOT IN (SELECT id FROM employees)
    """)
    
    # Add new foreign key constraints pointing to employees table
    op.create_foreign_key(
        'users_portfolio_id_fkey',
        'users', 'employees',
        ['portfolio_id'], ['id'],
        ondelete='SET NULL'
    )
    
    op.create_foreign_key(
        'users_line_manager_id_fkey',
        'users', 'employees',
        ['line_manager_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade():
    # Drop new foreign key constraints
    op.drop_constraint('users_portfolio_id_fkey', 'users', type_='foreignkey')
    op.drop_constraint('users_line_manager_id_fkey', 'users', type_='foreignkey')
    
    # Restore original foreign key constraints pointing to users table
    op.create_foreign_key(
        'users_portfolio_id_fkey',
        'users', 'users',
        ['portfolio_id'], ['id'],
        ondelete='SET NULL'
    )
    
    op.create_foreign_key(
        'users_line_manager_id_fkey',
        'users', 'users',
        ['line_manager_id'], ['id'],
        ondelete='SET NULL'
    )
