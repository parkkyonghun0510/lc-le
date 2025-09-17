#!/usr/bin/env python3
"""
Database cleanup script to fix duplicate parent folders issue.
This script will:
1. Find applications with multiple parent folders
2. Consolidate them into a single parent folder
3. Move all child folders and files to the consolidated parent
4. Remove duplicate parent folders
"""

import asyncio
import sys
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

# Add the app directory to the path so we can import our models
sys.path.append('/app')

from app.database import get_db_session
from app.models import Folder, File, CustomerApplication

async def find_applications_with_duplicate_parents():
    """Find all applications that have multiple parent folders."""
    async with get_db_session() as db:
        # Query to find applications with multiple parent folders
        query = select(
            Folder.application_id,
            func.count(Folder.id).label('parent_count')
        ).where(
            Folder.parent_id.is_(None)
        ).group_by(
            Folder.application_id
        ).having(
            func.count(Folder.id) > 1
        )
        
        result = await db.execute(query)
        duplicates = result.all()
        
        print(f"Found {len(duplicates)} applications with duplicate parent folders:")
        for app_id, count in duplicates:
            print(f"  Application {app_id}: {count} parent folders")
        
        return [app_id for app_id, count in duplicates]

async def cleanup_duplicate_folders_for_application(db: AsyncSession, application_id: UUID):
    """Clean up duplicate parent folders for a specific application."""
    print(f"\nCleaning up application {application_id}...")
    
    # Get all parent folders for this application
    parent_folders_q = await db.execute(
        select(Folder).where(
            Folder.application_id == application_id,
            Folder.parent_id.is_(None)
        ).order_by(Folder.created_at)  # Keep the oldest one
    )
    parent_folders = parent_folders_q.scalars().all()
    
    if len(parent_folders) <= 1:
        print(f"  No duplicate parent folders found for application {application_id}")
        return
    
    # Keep the first (oldest) parent folder
    main_parent = parent_folders[0]
    duplicate_parents = parent_folders[1:]
    
    print(f"  Keeping parent folder: {main_parent.id} ('{main_parent.name}')")
    print(f"  Removing {len(duplicate_parents)} duplicate parent folders")
    
    # Process each duplicate parent folder
    for duplicate_parent in duplicate_parents:
        print(f"    Processing duplicate parent: {duplicate_parent.id} ('{duplicate_parent.name}')")
        
        # Get all child folders of this duplicate parent
        child_folders_q = await db.execute(
            select(Folder).where(Folder.parent_id == duplicate_parent.id)
        )
        child_folders = child_folders_q.scalars().all()
        
        print(f"      Found {len(child_folders)} child folders")
        
        # Process each child folder
        for child_folder in child_folders:
            print(f"        Processing child folder: {child_folder.name}")
            
            # Check if a folder with the same name already exists under the main parent
            existing_child_q = await db.execute(
                select(Folder).where(
                    Folder.application_id == application_id,
                    Folder.parent_id == main_parent.id,
                    Folder.name == child_folder.name
                )
            )
            existing_child = existing_child_q.scalar_one_or_none()
            
            if existing_child:
                print(f"          Merging with existing folder: {existing_child.id}")
                
                # Move all files from the duplicate child to the existing child
                files_q = await db.execute(
                    select(File).where(File.folder_id == child_folder.id)
                )
                files = files_q.scalars().all()
                
                print(f"          Moving {len(files)} files")
                for file in files:
                    file.folder_id = existing_child.id
                
                # Delete the duplicate child folder
                await db.delete(child_folder)
                print(f"          Deleted duplicate child folder: {child_folder.id}")
                
            else:
                print(f"          Moving child folder to main parent")
                # Move the child folder to the main parent
                child_folder.parent_id = main_parent.id
        
        # Check for any files directly attached to the duplicate parent
        files_q = await db.execute(
            select(File).where(File.folder_id == duplicate_parent.id)
        )
        files = files_q.scalars().all()
        
        if files:
            print(f"      Moving {len(files)} files from duplicate parent to main parent")
            for file in files:
                file.folder_id = main_parent.id
        
        # Delete the duplicate parent folder
        await db.delete(duplicate_parent)
        print(f"      Deleted duplicate parent folder: {duplicate_parent.id}")
    
    # Commit all changes for this application
    await db.commit()
    print(f"  ✅ Cleanup completed for application {application_id}")

async def main():
    """Main cleanup function."""
    print("🧹 Starting duplicate folder cleanup...")
    
    # Find applications with duplicate parent folders
    duplicate_app_ids = await find_applications_with_duplicate_parents()
    
    if not duplicate_app_ids:
        print("✅ No duplicate parent folders found. Database is clean!")
        return
    
    print(f"\n🔧 Cleaning up {len(duplicate_app_ids)} applications...")
    
    # Clean up each application
    async with get_db_session() as db:
        for app_id in duplicate_app_ids:
            try:
                await cleanup_duplicate_folders_for_application(db, app_id)
            except Exception as e:
                print(f"❌ Error cleaning up application {app_id}: {e}")
                await db.rollback()
    
    print("\n🎉 Cleanup completed!")
    
    # Verify the cleanup worked
    print("\n🔍 Verifying cleanup...")
    remaining_duplicates = await find_applications_with_duplicate_parents()
    
    if not remaining_duplicates:
        print("✅ All duplicate parent folders have been cleaned up!")
    else:
        print(f"⚠️  {len(remaining_duplicates)} applications still have duplicate parent folders")

if __name__ == "__main__":
    asyncio.run(main())