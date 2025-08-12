"""add account_id to customer_applications

Revision ID: 20250809_add_account_id
Revises: 20250808_add_missing_folder_id
Create Date: 2025-08-09 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250809_add_account_id'
down_revision = '20250808_add_missing_folder_id'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col['name'] for col in inspector.get_columns('customer_applications')]
    if 'account_id' not in columns:
        op.add_column('customer_applications', sa.Column('account_id', sa.String(length=100), nullable=True))
    # Index for faster filtering by account_id
    existing_indexes = [idx['name'] for idx in inspector.get_indexes('customer_applications')]
    if 'ix_customer_applications_account_id' not in existing_indexes:
        op.create_index('ix_customer_applications_account_id', 'customer_applications', ['account_id'])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_indexes = [idx['name'] for idx in inspector.get_indexes('customer_applications')]
    if 'ix_customer_applications_account_id' in existing_indexes:
        op.drop_index('ix_customer_applications_account_id', table_name='customer_applications')
    columns = [col['name'] for col in inspector.get_columns('customer_applications')]
    if 'account_id' in columns:
        op.drop_column('customer_applications', 'account_id')


