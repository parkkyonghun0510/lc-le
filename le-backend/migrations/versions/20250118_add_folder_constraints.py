"""Add folder constraints to prevent duplicates

Revision ID: folder_constraints_001
Revises: previous_revision
Create Date: 2025-01-18 10:00:00.000000

This migration adds database constraints to prevent duplicate parent folders
and ensures referential integrity for the folder system.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers
revision = 'folder_constraints_001'
down_revision = None  # Replace with actual previous revision
branch_labels = None
depends_on = None


def upgrade():
    """Add constraints to prevent duplicate folders"""
    
    # First, clean up any existing duplicates using the cleanup service
    print("Cleaning up existing duplicate folders before adding constraints...")
    
    # Clean up duplicate parent folders
    op.execute(text("""
        -- Create temporary table to identify applications with duplicate parent folders
        CREATE TEMP TABLE duplicate_parent_apps AS
        SELECT application_id, 
               array_agg(id ORDER BY created_at) as folder_ids,
               array_agg(name ORDER BY created_at) as folder_names
        FROM folders 
        WHERE parent_id IS NULL 
        AND application_id IS NOT NULL
        GROUP BY application_id 
        HAVING count(*) > 1;
        
        -- Move child folders from duplicate parents to the primary parent
        UPDATE folders 
        SET parent_id = (
            SELECT folder_ids[1] 
            FROM duplicate_parent_apps 
            WHERE folders.application_id = duplicate_parent_apps.application_id
        )
        WHERE parent_id IN (
            SELECT unnest(folder_ids[2:]) 
            FROM duplicate_parent_apps
        );
        
        -- Move files from duplicate parents to the primary parent
        UPDATE files 
        SET folder_id = (
            SELECT folder_ids[1] 
            FROM duplicate_parent_apps 
            WHERE files.application_id = duplicate_parent_apps.application_id
        )
        WHERE folder_id IN (
            SELECT unnest(folder_ids[2:]) 
            FROM duplicate_parent_apps
        );
        
        -- Handle duplicate child folders by merging files
        WITH duplicate_children AS (
            SELECT 
                application_id,
                parent_id,
                name,
                array_agg(id ORDER BY created_at) as child_ids
            FROM folders 
            WHERE parent_id IS NOT NULL
            GROUP BY application_id, parent_id, name
            HAVING count(*) > 1
        )
        UPDATE files 
        SET folder_id = (
            SELECT child_ids[1] 
            FROM duplicate_children 
            WHERE files.folder_id = ANY(child_ids[2:])
        )
        WHERE folder_id IN (
            SELECT unnest(child_ids[2:]) 
            FROM duplicate_children
        );
        
        -- Delete duplicate child folders
        WITH duplicate_children AS (
            SELECT 
                application_id,
                parent_id,
                name,
                array_agg(id ORDER BY created_at) as child_ids
            FROM folders 
            WHERE parent_id IS NOT NULL
            GROUP BY application_id, parent_id, name
            HAVING count(*) > 1
        )
        DELETE FROM folders 
        WHERE id IN (
            SELECT unnest(child_ids[2:]) 
            FROM duplicate_children
        );
        
        -- Delete duplicate parent folders
        DELETE FROM folders 
        WHERE id IN (
            SELECT unnest(folder_ids[2:]) 
            FROM duplicate_parent_apps
        );
        
        -- Clean up temporary table
        DROP TABLE duplicate_parent_apps;
    """))
    
    print("Duplicate cleanup completed. Adding constraints...")
    
    # Add unique constraint for parent folders per application
    # This prevents multiple parent folders for the same application
    op.create_index(
        'idx_unique_application_parent_folder',
        'folders',
        ['application_id'],
        unique=True,
        postgresql_where=sa.text('parent_id IS NULL AND application_id IS NOT NULL')
    )
    
    # Add unique constraint for child folder names within the same parent
    # This prevents duplicate child folder names under the same parent
    op.create_index(
        'idx_unique_child_folder_name',
        'folders',
        ['parent_id', 'name', 'application_id'],
        unique=True,
        postgresql_where=sa.text('parent_id IS NOT NULL')
    )
    
    # Add check constraint to ensure folder belongs to same application as parent
    op.create_check_constraint(
        'check_folder_application_consistency',
        'folders',
        sa.text("""
            parent_id IS NULL OR 
            application_id = (
                SELECT application_id 
                FROM folders 
                WHERE id = folders.parent_id
            )
        """)
    )
    
    # Add check constraint to ensure files belong to same application as folder
    op.create_check_constraint(
        'check_file_folder_application_consistency',
        'files',
        sa.text("""
            folder_id IS NULL OR 
            application_id = (
                SELECT application_id 
                FROM folders 
                WHERE id = files.folder_id
            )
        """)
    )
    
    # Add indexes for better performance
    op.create_index(
        'idx_folders_application_parent',
        'folders',
        ['application_id', 'parent_id']
    )
    
    op.create_index(
        'idx_folders_parent_name',
        'folders',
        ['parent_id', 'name']
    )
    
    op.create_index(
        'idx_files_folder_application',
        'files',
        ['folder_id', 'application_id']
    )
    
    print("Constraints and indexes added successfully!")


def downgrade():
    """Remove the constraints"""
    
    # Remove indexes
    op.drop_index('idx_files_folder_application', table_name='files')
    op.drop_index('idx_folders_parent_name', table_name='folders')
    op.drop_index('idx_folders_application_parent', table_name='folders')
    
    # Remove check constraints
    op.drop_constraint('check_file_folder_application_consistency', 'files', type_='check')
    op.drop_constraint('check_folder_application_consistency', 'folders', type_='check')
    
    # Remove unique indexes
    op.drop_index('idx_unique_child_folder_name', table_name='folders')
    op.drop_index('idx_unique_application_parent_folder', table_name='folders')
    
    print("Constraints and indexes removed successfully!")