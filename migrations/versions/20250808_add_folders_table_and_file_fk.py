"""add folders table and file folder_id fk

Revision ID: 20250808_add_folders
Revises: 48f8d5284a84
Create Date: 2025-08-08 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250808_add_folders'
down_revision = '48f8d5284a84'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'folders',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('parent_id', sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey('folders.id'), nullable=True),
        sa.Column('application_id', sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey('customer_applications.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )

    # Add folder_id to files
    op.add_column('files', sa.Column('folder_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_files_folder', 'files', 'folders', ['folder_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_files_folder', 'files', type_='foreignkey')
    op.drop_column('files', 'folder_id')
    op.drop_table('folders')


