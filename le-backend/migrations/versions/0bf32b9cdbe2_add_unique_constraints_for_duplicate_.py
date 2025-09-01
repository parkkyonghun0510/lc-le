"""add_unique_constraints_for_duplicate_prevention

Revision ID: 0bf32b9cdbe2
Revises: c54dc9b06c0a
Create Date: 2025-09-01 14:59:46.598968

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0bf32b9cdbe2'
down_revision = 'c54dc9b06c0a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add unique constraints for critical fields to prevent duplicates
    
    # Users table - already has unique constraints on username and email
    # Add unique constraint on employee_id
    op.create_unique_constraint(
        'uq_users_employee_id', 'users', ['employee_id']
    )
    
    # Customer Applications - Add unique constraints for critical identification fields
    # Unique constraint on id_number per id_card_type
    op.create_unique_constraint(
        'uq_customer_applications_id_number_type', 'customer_applications', 
        ['id_number', 'id_card_type']
    )
    
    # Unique constraint on phone number
    op.create_unique_constraint(
        'uq_customer_applications_phone', 'customer_applications', ['phone']
    )
    
    # Departments - Add unique constraint on code (already exists but ensure it's there)
    # Branches - Add unique constraint on code (already exists but ensure it's there)
    
    # Add indexes for performance on frequently queried duplicate-check fields
    op.create_index('ix_customer_applications_id_number', 'customer_applications', ['id_number'])
    op.create_index('ix_customer_applications_phone', 'customer_applications', ['phone'])
    op.create_index('ix_customer_applications_full_name_latin', 'customer_applications', ['full_name_latin'])
    op.create_index('ix_customer_applications_guarantor_id_number', 'customer_applications', ['guarantor_id_number'])
    op.create_index('ix_users_employee_id', 'users', ['employee_id'])


def downgrade() -> None:
    # Remove indexes
    op.drop_index('ix_users_employee_id', 'users')
    op.drop_index('ix_customer_applications_guarantor_id_number', 'customer_applications')
    op.drop_index('ix_customer_applications_full_name_latin', 'customer_applications')
    op.drop_index('ix_customer_applications_phone', 'customer_applications')
    op.drop_index('ix_customer_applications_id_number', 'customer_applications')
    
    # Remove unique constraints
    op.drop_constraint('uq_customer_applications_phone', 'customer_applications', type_='unique')
    op.drop_constraint('uq_customer_applications_id_number_type', 'customer_applications', type_='unique')
    op.drop_constraint('uq_users_employee_id', 'users', type_='unique')