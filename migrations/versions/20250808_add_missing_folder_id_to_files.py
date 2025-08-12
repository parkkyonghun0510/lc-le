"""add missing folder_id to files if not exists

Revision ID: 20250808_add_missing_folder_id
Revises: 20250808_merge_heads
Create Date: 2025-08-08 00:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250808_add_missing_folder_id'
down_revision = '20250808_merge_heads'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col['name'] for col in inspector.get_columns('files')]
    if 'folder_id' not in columns:
        op.add_column('files', sa.Column('folder_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True))
        # Add FK if folders table exists
        tables = inspector.get_table_names()
        if 'folders' in tables:
            op.create_foreign_key('fk_files_folder', 'files', 'folders', ['folder_id'], ['id'])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col['name'] for col in inspector.get_columns('files')]
    if 'folder_id' in columns:
        # Drop FK if present
        fkeys = inspector.get_foreign_keys('files')
        for fk in fkeys:
            if fk.get('referred_table') == 'folders' and fk.get('constrained_columns') == ['folder_id']:
                op.drop_constraint(fk['name'], 'files', type_='foreignkey')
                break
        op.drop_column('files', 'folder_id')


