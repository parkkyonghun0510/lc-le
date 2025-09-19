"""
Database Cleanup Service for System Stability Improvements

This service provides comprehensive database cleanup functionality for duplicate folders,
with rollback capabilities and automated maintenance features.

Requirements addressed: 4.1, 4.2, 4.3, 4.4, 4.5
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from uuid import UUID
from dataclasses import dataclass
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, text, and_
from sqlalchemy.orm import selectinload

from app.models import Folder, File, CustomerApplication
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


class CleanupStatus(Enum):
    """Status of cleanup operations"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


@dataclass
class FolderCleanupResult:
    """Result of folder cleanup operation for a single application"""
    application_id: UUID
    folders_removed: int
    files_moved: int
    child_folders_merged: int
    status: CleanupStatus
    error_message: Optional[str] = None
    rollback_id: Optional[str] = None


@dataclass
class CleanupReport:
    """Comprehensive cleanup report"""
    total_applications: int
    successful_cleanups: int
    failed_cleanups: int
    total_folders_removed: int
    total_files_moved: int
    total_child_folders_merged: int
    start_time: datetime
    end_time: Optional[datetime] = None
    results: List[FolderCleanupResult] = None
    
    def __post_init__(self):
        if self.results is None:
            self.results = []
    
    def add_result(self, result: FolderCleanupResult):
        """Add a cleanup result to the report"""
        self.results.append(result)
        if result.status == CleanupStatus.COMPLETED:
            self.successful_cleanups += 1
            self.total_folders_removed += result.folders_removed
            self.total_files_moved += result.files_moved
            self.total_child_folders_merged += result.child_folders_merged
        else:
            self.failed_cleanups += 1
    
    def finalize(self):
        """Finalize the report with end time"""
        self.end_time = datetime.now(timezone.utc)


@dataclass
class RollbackData:
    """Data structure for rollback operations"""
    rollback_id: str
    application_id: UUID
    original_folders: List[Dict]
    original_file_associations: List[Dict]
    created_at: datetime


class DatabaseCleanupService:
    """
    Comprehensive database cleanup service for folder duplicates
    """
    
    def __init__(self):
        self.rollback_storage: Dict[str, RollbackData] = {}
    
    async def find_applications_with_duplicate_folders(
        self, db: AsyncSession
    ) -> List[Tuple[UUID, int]]:
        """
        Find all applications that have multiple parent folders
        
        Returns:
            List of tuples (application_id, parent_folder_count)
        """
        query = select(
            Folder.application_id,
            func.count(Folder.id).label('parent_count')
        ).where(
            Folder.parent_id.is_(None),
            Folder.application_id.is_not(None)
        ).group_by(
            Folder.application_id
        ).having(
            func.count(Folder.id) > 1
        ).order_by(
            func.count(Folder.id).desc()
        )
        
        result = await db.execute(query)
        duplicates = result.all()
        
        logger.info(f"Found {len(duplicates)} applications with duplicate parent folders")
        for app_id, count in duplicates:
            logger.info(f"Application {app_id}: {count} parent folders")
        
        return [(app_id, count) for app_id, count in duplicates]
    
    async def create_rollback_point(
        self, db: AsyncSession, application_id: UUID
    ) -> str:
        """
        Create a rollback point before cleanup operations
        
        Args:
            db: Database session
            application_id: Application to create rollback point for
            
        Returns:
            Rollback ID for later use
        """
        rollback_id = f"rollback_{application_id}_{int(datetime.now().timestamp())}"
        
        # Get current folder structure
        folders_query = await db.execute(
            select(Folder).where(
                Folder.application_id == application_id
            ).options(selectinload(Folder.files))
        )
        folders = folders_query.scalars().all()
        
        # Store original folder data
        original_folders = []
        for folder in folders:
            original_folders.append({
                'id': folder.id,
                'name': folder.name,
                'parent_id': folder.parent_id,
                'application_id': folder.application_id,
                'created_at': folder.created_at,
                'updated_at': folder.updated_at
            })
        
        # Get current file associations
        files_query = await db.execute(
            select(File).where(
                File.application_id == application_id
            )
        )
        files = files_query.scalars().all()
        
        original_file_associations = []
        for file in files:
            original_file_associations.append({
                'id': file.id,
                'folder_id': file.folder_id,
                'application_id': file.application_id
            })
        
        # Store rollback data
        rollback_data = RollbackData(
            rollback_id=rollback_id,
            application_id=application_id,
            original_folders=original_folders,
            original_file_associations=original_file_associations,
            created_at=datetime.now(timezone.utc)
        )
        
        self.rollback_storage[rollback_id] = rollback_data
        
        logger.info(f"Created rollback point {rollback_id} for application {application_id}")
        return rollback_id
    
    async def rollback_cleanup(
        self, db: AsyncSession, rollback_id: str
    ) -> bool:
        """
        Rollback cleanup operations to a previous state
        
        Args:
            db: Database session
            rollback_id: Rollback point identifier
            
        Returns:
            True if rollback successful, False otherwise
        """
        if rollback_id not in self.rollback_storage:
            logger.error(f"Rollback point {rollback_id} not found")
            return False
        
        rollback_data = self.rollback_storage[rollback_id]
        
        try:
            async with db.begin():
                # Delete all current folders for the application
                await db.execute(
                    text("DELETE FROM folders WHERE application_id = :app_id"),
                    {"app_id": rollback_data.application_id}
                )
                
                # Recreate original folders
                for folder_data in rollback_data.original_folders:
                    folder = Folder(
                        id=folder_data['id'],
                        name=folder_data['name'],
                        parent_id=folder_data['parent_id'],
                        application_id=folder_data['application_id'],
                        created_at=folder_data['created_at'],
                        updated_at=folder_data['updated_at']
                    )
                    db.add(folder)
                
                # Restore file associations
                for file_data in rollback_data.original_file_associations:
                    await db.execute(
                        text("UPDATE files SET folder_id = :folder_id WHERE id = :file_id"),
                        {
                            "folder_id": file_data['folder_id'],
                            "file_id": file_data['file_id']
                        }
                    )
                
                await db.commit()
                
            logger.info(f"Successfully rolled back cleanup for application {rollback_data.application_id}")
            
            # Clean up rollback data
            del self.rollback_storage[rollback_id]
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to rollback cleanup {rollback_id}: {e}")
            await db.rollback()
            return False
    
    async def consolidate_duplicate_folders(
        self, db: AsyncSession, application_id: UUID
    ) -> FolderCleanupResult:
        """
        Consolidate duplicate parent folders for a specific application
        
        Args:
            db: Database session
            application_id: Application to clean up
            
        Returns:
            FolderCleanupResult with operation details
        """
        result = FolderCleanupResult(
            application_id=application_id,
            folders_removed=0,
            files_moved=0,
            child_folders_merged=0,
            status=CleanupStatus.PENDING
        )
        
        try:
            # Create rollback point
            rollback_id = await self.create_rollback_point(db, application_id)
            result.rollback_id = rollback_id
            result.status = CleanupStatus.IN_PROGRESS
            
            async with db.begin():
                # Get all parent folders for this application
                parent_folders_query = await db.execute(
                    select(Folder).where(
                        and_(
                            Folder.application_id == application_id,
                            Folder.parent_id.is_(None)
                        )
                    ).order_by(Folder.created_at)
                )
                parent_folders = parent_folders_query.scalars().all()
                
                if len(parent_folders) <= 1:
                    result.status = CleanupStatus.COMPLETED
                    logger.info(f"No duplicate parent folders found for application {application_id}")
                    return result
                
                # Keep the oldest parent folder
                primary_folder = parent_folders[0]
                duplicate_folders = parent_folders[1:]
                
                logger.info(f"Consolidating {len(duplicate_folders)} duplicate parent folders for application {application_id}")
                logger.info(f"Keeping primary folder: {primary_folder.id} ('{primary_folder.name}')")
                
                # Process each duplicate parent folder
                for duplicate_folder in duplicate_folders:
                    logger.info(f"Processing duplicate folder: {duplicate_folder.id} ('{duplicate_folder.name}')")
                    
                    # Handle child folders
                    child_folders_query = await db.execute(
                        select(Folder).where(Folder.parent_id == duplicate_folder.id)
                    )
                    child_folders = child_folders_query.scalars().all()
                    
                    for child_folder in child_folders:
                        merged = await self._merge_child_folder(
                            db, child_folder, primary_folder, application_id
                        )
                        if merged:
                            result.child_folders_merged += 1
                    
                    # Handle files directly attached to duplicate parent
                    files_moved = await self._move_files_to_folder(
                        db, duplicate_folder.id, primary_folder.id
                    )
                    result.files_moved += files_moved
                    
                    # Delete the duplicate parent folder
                    await db.delete(duplicate_folder)
                    result.folders_removed += 1
                    
                    logger.info(f"Removed duplicate folder: {duplicate_folder.id}")
                
                await db.commit()
                result.status = CleanupStatus.COMPLETED
                
                logger.info(f"Successfully consolidated folders for application {application_id}")
                logger.info(f"Removed {result.folders_removed} folders, moved {result.files_moved} files, merged {result.child_folders_merged} child folders")
                
        except Exception as e:
            logger.error(f"Error consolidating folders for application {application_id}: {e}")
            result.status = CleanupStatus.FAILED
            result.error_message = str(e)
            await db.rollback()
            
            # Attempt rollback if we have a rollback point
            if result.rollback_id:
                rollback_success = await self.rollback_cleanup(db, result.rollback_id)
                if rollback_success:
                    result.status = CleanupStatus.ROLLED_BACK
        
        return result
    
    async def _merge_child_folder(
        self, db: AsyncSession, child_folder: Folder, 
        primary_parent: Folder, application_id: UUID
    ) -> bool:
        """
        Merge a child folder with existing folder of same name or move to primary parent
        
        Returns:
            True if folder was merged, False if just moved
        """
        # Check if folder with same name exists under primary parent
        existing_child_query = await db.execute(
            select(Folder).where(
                and_(
                    Folder.application_id == application_id,
                    Folder.parent_id == primary_parent.id,
                    Folder.name == child_folder.name
                )
            )
        )
        existing_child = existing_child_query.scalar_one_or_none()
        
        if existing_child:
            # Merge folders by moving files
            files_moved = await self._move_files_to_folder(
                child_folder.id, existing_child.id
            )
            
            # Delete the duplicate child folder
            await db.delete(child_folder)
            
            logger.info(f"Merged child folder '{child_folder.name}' with existing folder, moved {files_moved} files")
            return True
        else:
            # Move child folder to primary parent
            child_folder.parent_id = primary_parent.id
            logger.info(f"Moved child folder '{child_folder.name}' to primary parent")
            return False
    
    async def _move_files_to_folder(
        self, db: AsyncSession, from_folder_id: UUID, to_folder_id: UUID
    ) -> int:
        """
        Move all files from one folder to another
        
        Returns:
            Number of files moved
        """
        files_query = await db.execute(
            select(File).where(File.folder_id == from_folder_id)
        )
        files = files_query.scalars().all()
        
        files_moved = 0
        for file in files:
            file.folder_id = to_folder_id
            files_moved += 1
        
        return files_moved
    
    async def cleanup_all_duplicate_folders(
        self, db: AsyncSession, dry_run: bool = False
    ) -> CleanupReport:
        """
        Clean up all applications with duplicate parent folders
        
        Args:
            db: Database session
            dry_run: If True, only report what would be done without making changes
            
        Returns:
            CleanupReport with comprehensive results
        """
        start_time = datetime.now(timezone.utc)
        
        # Find applications with duplicates
        duplicate_apps = await self.find_applications_with_duplicate_folders(db)
        
        report = CleanupReport(
            total_applications=len(duplicate_apps),
            successful_cleanups=0,
            failed_cleanups=0,
            total_folders_removed=0,
            total_files_moved=0,
            total_child_folders_merged=0,
            start_time=start_time
        )
        
        if not duplicate_apps:
            logger.info("No applications with duplicate parent folders found")
            report.finalize()
            return report
        
        if dry_run:
            logger.info(f"DRY RUN: Would clean up {len(duplicate_apps)} applications")
            for app_id, count in duplicate_apps:
                logger.info(f"  Application {app_id}: {count} parent folders")
            report.finalize()
            return report
        
        logger.info(f"Starting cleanup of {len(duplicate_apps)} applications")
        
        # Process each application
        for app_id, _ in duplicate_apps:
            try:
                result = await self.consolidate_duplicate_folders(db, app_id)
                report.add_result(result)
                
                if result.status == CleanupStatus.COMPLETED:
                    logger.info(f"✅ Successfully cleaned up application {app_id}")
                else:
                    logger.error(f"❌ Failed to clean up application {app_id}: {result.error_message}")
                    
            except Exception as e:
                logger.error(f"❌ Unexpected error cleaning up application {app_id}: {e}")
                error_result = FolderCleanupResult(
                    application_id=app_id,
                    folders_removed=0,
                    files_moved=0,
                    child_folders_merged=0,
                    status=CleanupStatus.FAILED,
                    error_message=str(e)
                )
                report.add_result(error_result)
        
        report.finalize()
        
        logger.info(f"Cleanup completed in {(report.end_time - report.start_time).total_seconds():.2f} seconds")
        logger.info(f"Results: {report.successful_cleanups} successful, {report.failed_cleanups} failed")
        logger.info(f"Total: {report.total_folders_removed} folders removed, {report.total_files_moved} files moved")
        
        return report
    
    async def verify_cleanup_integrity(
        self, db: AsyncSession, application_id: Optional[UUID] = None
    ) -> Dict[str, any]:
        """
        Verify database integrity after cleanup operations
        
        Args:
            db: Database session
            application_id: Specific application to verify, or None for all
            
        Returns:
            Dictionary with verification results
        """
        verification_results = {
            'duplicate_parent_folders': 0,
            'orphaned_files': 0,
            'orphaned_folders': 0,
            'inconsistent_applications': [],
            'verification_passed': True
        }
        
        # Check for remaining duplicate parent folders
        if application_id:
            duplicate_query = select(
                Folder.application_id,
                func.count(Folder.id).label('count')
            ).where(
                and_(
                    Folder.parent_id.is_(None),
                    Folder.application_id == application_id
                )
            ).group_by(Folder.application_id).having(func.count(Folder.id) > 1)
        else:
            duplicate_query = select(
                Folder.application_id,
                func.count(Folder.id).label('count')
            ).where(
                Folder.parent_id.is_(None)
            ).group_by(Folder.application_id).having(func.count(Folder.id) > 1)
        
        duplicate_result = await db.execute(duplicate_query)
        duplicates = duplicate_result.all()
        
        verification_results['duplicate_parent_folders'] = len(duplicates)
        if duplicates:
            verification_results['verification_passed'] = False
            verification_results['inconsistent_applications'].extend([str(app_id) for app_id, _ in duplicates])
        
        # Check for orphaned files (files pointing to non-existent folders)
        orphaned_files_query = await db.execute(
            text("""
                SELECT COUNT(*) 
                FROM files f 
                LEFT JOIN folders fo ON f.folder_id = fo.id 
                WHERE f.folder_id IS NOT NULL AND fo.id IS NULL
            """)
        )
        orphaned_files_count = orphaned_files_query.scalar()
        verification_results['orphaned_files'] = orphaned_files_count
        
        if orphaned_files_count > 0:
            verification_results['verification_passed'] = False
        
        # Check for orphaned folders (folders pointing to non-existent parents)
        orphaned_folders_query = await db.execute(
            text("""
                SELECT COUNT(*) 
                FROM folders f 
                LEFT JOIN folders p ON f.parent_id = p.id 
                WHERE f.parent_id IS NOT NULL AND p.id IS NULL
            """)
        )
        orphaned_folders_count = orphaned_folders_query.scalar()
        verification_results['orphaned_folders'] = orphaned_folders_count
        
        if orphaned_folders_count > 0:
            verification_results['verification_passed'] = False
        
        return verification_results


# Singleton instance for global use
cleanup_service = DatabaseCleanupService()