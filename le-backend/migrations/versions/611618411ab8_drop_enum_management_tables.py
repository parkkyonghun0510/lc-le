"""drop_enum_management_tables

Revision ID: 611618411ab8
Revises: 388c4c7e11ca
Create Date: 2025-09-11 07:30:19.728260

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '611618411ab8'
down_revision = '388c4c7e11ca'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop enum tables in correct order (child tables first)
    op.drop_table('enum_localizations')
    op.drop_table('enum_values')
    op.drop_table('enum_types')


def downgrade() -> None:
    # Recreate enum tables if needed to rollback
    # Note: This is a destructive migration, data will be lost
    op.create_table('enum_types',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    op.create_table('enum_values',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('enum_type_id', sa.String(), nullable=False),
        sa.Column('key', sa.String(), nullable=False),
        sa.Column('value', sa.String(), nullable=False),
        sa.Column('value_khmer', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, default=0),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['enum_type_id'], ['enum_types.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('enum_type_id', 'key')
    )
    
    op.create_table('enum_localizations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('enum_value_id', sa.String(), nullable=False),
        sa.Column('language_code', sa.String(length=5), nullable=False),
        sa.Column('localized_value', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['enum_value_id'], ['enum_values.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('enum_value_id', 'language_code')
    )