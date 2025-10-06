"""add_comprehensive_sql_constraints

Revision ID: a8e596d25ea1
Revises: 20251004_0801_merge_soft_delete_and_existing_heads
Create Date: 2025-10-06 17:58:30.042980

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a8e596d25ea1'
down_revision = 'merge_soft_delete_and_existing'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add comprehensive SQL constraints for data validation and business logic."""

    # 1. Check Constraints for Status Fields
    # User.status validation (active, inactive, suspended, pending)
    op.create_check_constraint(
        'ck_users_status_valid',
        'users',
        sa.text("status IN ('active', 'inactive', 'suspended', 'pending')")
    )

    # CustomerApplication.status validation (draft, submitted, approved, rejected, disbursed)
    op.create_check_constraint(
        'ck_customer_applications_status_valid',
        'customer_applications',
        sa.text("status IN ('draft', 'submitted', 'approved', 'rejected', 'disbursed')")
    )

    # 2. Business Logic Constraints
    # Loan date relationships (loan_start_date <= loan_end_date)
    op.create_check_constraint(
        'ck_loan_dates_valid',
        'customer_applications',
        sa.text('loan_start_date <= loan_end_date')
    )

    # Interest rate range validation (0-100)
    op.create_check_constraint(
        'ck_interest_rate_range',
        'customer_applications',
        sa.text('interest_rate >= 0 AND interest_rate <= 100')
    )

    # Minimum age validation (18+ years for date_of_birth)
    op.create_check_constraint(
        'ck_minimum_age',
        'customer_applications',
        sa.text("EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth)) >= 18")
    )

    # 3. Enhanced Unique Constraints
    # Composite unique constraint for customer identification (id_card_type, id_number)
    op.create_unique_constraint(
        'uq_customer_identification',
        'customer_applications',
        ['id_card_type', 'id_number']
    )

    # Unique constraint for file paths to prevent duplicates
    op.create_unique_constraint(
        'uq_file_paths',
        'files',
        ['file_path']
    )

    # 4. Additional Business Logic Constraints
    # Ensure loan amounts are positive
    op.create_check_constraint(
        'ck_requested_amount_positive',
        'customer_applications',
        sa.text('requested_amount > 0')
    )

    # Ensure monthly income is positive when provided
    op.create_check_constraint(
        'ck_monthly_income_positive',
        'customer_applications',
        sa.text('monthly_income IS NULL OR monthly_income > 0')
    )

    # Ensure desired loan term is positive
    op.create_check_constraint(
        'ck_desired_loan_term_positive',
        'customer_applications',
        sa.text('desired_loan_term IS NULL OR desired_loan_term > 0')
    )

    # 5. Data Consistency Constraints (removed workflow consistency constraint due to existing data issues)
    # Note: Workflow status consistency constraint removed due to existing data violations
    # This can be added later after data cleanup if needed

    # 6. Performance Indexes for Constraints
    # Index for status lookups
    op.create_index(
        'ix_users_status',
        'users',
        ['status'],
        postgresql_where=sa.text('is_deleted = false')
    )

    op.create_index(
        'ix_customer_applications_status',
        'customer_applications',
        ['status']
    )

    # Index for date range queries
    op.create_index(
        'ix_customer_applications_date_range',
        'customer_applications',
        ['loan_start_date', 'loan_end_date']
    )

    # Index for customer identification lookups
    op.create_index(
        'ix_customer_applications_identification',
        'customer_applications',
        ['id_card_type', 'id_number']
    )

    # Index for file path lookups
    op.create_index(
        'ix_files_path',
        'files',
        ['file_path']
    )


def downgrade() -> None:
    """Remove all comprehensive SQL constraints."""

    # Drop indexes first
    op.drop_index('ix_files_path', table_name='files')
    op.drop_index('ix_customer_applications_identification', table_name='customer_applications')
    op.drop_index('ix_customer_applications_date_range', table_name='customer_applications')
    op.drop_index('ix_customer_applications_status', table_name='customer_applications')
    op.drop_index('ix_users_status', table_name='users')

    # Drop unique constraints
    op.drop_constraint('uq_file_paths', 'files', type_='unique')
    op.drop_constraint('uq_customer_identification', 'customer_applications', type_='unique')

    # Drop check constraints
    op.drop_constraint('ck_desired_loan_term_positive', 'customer_applications', type_='check')
    op.drop_constraint('ck_monthly_income_positive', 'customer_applications', type_='check')
    op.drop_constraint('ck_requested_amount_positive', 'customer_applications', type_='check')
    op.drop_constraint('ck_minimum_age', 'customer_applications', type_='check')
    op.drop_constraint('ck_interest_rate_range', 'customer_applications', type_='check')
    op.drop_constraint('ck_loan_dates_valid', 'customer_applications', type_='check')
    op.drop_constraint('ck_customer_applications_status_valid', 'customer_applications', type_='check')
    op.drop_constraint('ck_users_status_valid', 'users', type_='check')