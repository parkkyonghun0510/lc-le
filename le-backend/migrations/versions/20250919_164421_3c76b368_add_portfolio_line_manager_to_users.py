"""Add portfolio_id and line_manager_id to users

Revision ID: 3c76b368
Revises: 
Create Date: 2025-09-19 16:44:21.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '3c76b368'
down_revision = '20250826_add_performance_indexes'
branch_labels = None
depends_on = None


def upgrade():
    # Add portfolio_id and line_manager_id columns to users table
    op.add_column('users', sa.Column('portfolio_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('users', sa.Column('line_manager_id', postgresql.UUID(as_uuid=True), nullable=True))
    
    # Add foreign key constraints
    op.create_foreign_key(
        'fk_users_portfolio_id', 
        'users', 
        'users', 
        ['portfolio_id'], 
        ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_users_line_manager_id', 
        'users', 
        'users', 
        ['line_manager_id'], 
        ['id'],
        ondelete='SET NULL'
    )
    
    # Add indexes for better query performance
    op.create_index('ix_users_portfolio_id', 'users', ['portfolio_id'])
    op.create_index('ix_users_line_manager_id', 'users', ['line_manager_id'])


def downgrade():
    # Drop indexes
    op.drop_index('ix_users_line_manager_id', table_name='users')
    op.drop_index('ix_users_portfolio_id', table_name='users')
    
    # Drop foreign key constraints
    op.drop_constraint('fk_users_line_manager_id', 'users', type_='foreignkey')
    op.drop_constraint('fk_users_portfolio_id', 'users', type_='foreignkey')
    
    # Drop columns
    op.drop_column('users', 'line_manager_id')
    op.drop_column('users', 'portfolio_id')