"""Add alert logs table for system monitoring

Revision ID: 20250120_add_alert_logs_table
Revises: 20250120_add_audit_logs_table
Create Date: 2025-01-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250120_add_alert_logs_table'
down_revision = '20250120_add_audit_logs_table'
branch_labels = None
depends_on = None

def upgrade():
    # Create alert_logs table
    op.create_table('alert_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('alert_id', sa.String(255), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('severity', sa.String(20), nullable=False),
        sa.Column('component', sa.String(100), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('resolved', sa.Boolean(), nullable=False, default=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_by', sa.String(255), nullable=True),
        sa.Column('acknowledgments', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for better query performance
    op.create_index('idx_alert_logs_alert_id', 'alert_logs', ['alert_id'])
    op.create_index('idx_alert_logs_severity', 'alert_logs', ['severity'])
    op.create_index('idx_alert_logs_component', 'alert_logs', ['component'])
    op.create_index('idx_alert_logs_timestamp', 'alert_logs', ['timestamp'])
    op.create_index('idx_alert_logs_resolved', 'alert_logs', ['resolved'])
    op.create_index('idx_alert_logs_created_at', 'alert_logs', ['created_at'])

def downgrade():
    # Drop indexes
    op.drop_index('idx_alert_logs_created_at', table_name='alert_logs')
    op.drop_index('idx_alert_logs_resolved', table_name='alert_logs')
    op.drop_index('idx_alert_logs_timestamp', table_name='alert_logs')
    op.drop_index('idx_alert_logs_component', table_name='alert_logs')
    op.drop_index('idx_alert_logs_severity', table_name='alert_logs')
    op.drop_index('idx_alert_logs_alert_id', table_name='alert_logs')
    
    # Drop table
    op.drop_table('alert_logs')