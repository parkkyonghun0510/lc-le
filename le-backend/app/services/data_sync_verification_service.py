"""
Data Synchronization Verification Service

This service provides tools to verify data consistency between different
parts of the system and detect synchronization issues.
"""

from typing import Dict, List, Optional, Set, Any, Tuple
from uuid import UUID
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, and_, or_
from app.models import File, Folder, CustomerApplication
from app.core.logging import get_logger
from app.services.cache_invalidation_service import CacheScope, InvalidationReason

logger = get_logger(__name__)


class SyncIssueType(Enum):
    """Types of synchronization issues"""
    ORPHANED_FILE = "orphaned_file"
    MISSING_FOLDER = "missing_folder"
    DUPLICATE_FOLDER = "duplicate_folder"
    INCONSISTENT_COUNTS = "inconsistent_counts"
    STALE_CACHE = "stale_cache"
    BROKEN_HIERARCHY = "broken_hierarchy"
    MISSING_APPLICATION = "missing_application"


class SyncIssueSeverity(Enum):
    """Severity levels for synchronization issues"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class SyncIssue:
    """Represents a data synchronization issue"""
    issue_type: SyncIssueType
    severity: SyncIssueSeverity
    entity_id: str
    entity_type: str
    description: str
    affected_scopes: Set[CacheScope] = field(default_factory=set)
    metadata: Dict[str, Any] = field(default_factory=dict)
    detected_at: datetime = field(default_factory=datetime.utcnow)
    auto_fixable: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert issue to dictionary"""
        return {
            "issue_type": self.issue_type.value,
            "severity": self.severity.value,
            "entity_id": self.entity_id,
            "entity_type": self.entity_type,
            "description": self.description,
            "affected_scopes": [scope.value for scope in self.affected_scopes],
            "metadata": self.metadata,
            "detected_at": self.detected_at.isoformat(),
            "auto_fixable": self.auto_fixable
        }


@dataclass
class SyncVerificationResult:
    """Result of a synchronization verification"""
    scope: CacheScope
    issues: List[SyncIssue] = field(default_factory=list)
    total_entities_checked: int = 0
    verification_duration: float = 0.0
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    @property
    def has_issues(self) -> bool:
        return len(self.issues) > 0
    
    @property
    def critical_issues_count(self) -> int:
        return len([i for i in self.issues if i.severity == SyncIssueSeverity.CRITICAL])
    
    @property
    def auto_fixable_issues_count(self) -> int:
        return len([i for i in self.issues if i.auto_fixable])
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary"""
        return {
            "scope": self.scope.value,
            "issues": [issue.to_dict() for issue in self.issues],
            "total_entities_checked": self.total_entities_checked,
            "verification_duration": self.verification_duration,
            "timestamp": self.timestamp.isoformat(),
            "has_issues": self.has_issues,
            "critical_issues_count": self.critical_issues_count,
            "auto_fixable_issues_count": self.auto_fixable_issues_count
        }


class DataSyncVerificationService:
    """Service for verifying data synchronization and consistency"""
    
    def __init__(self):
        self._verification_history: List[SyncVerificationResult] = []
        self._max_history_size = 100
    
    async def verify_file_folder_consistency(self, db: AsyncSession) -> SyncVerificationResult:
        """Verify consistency between files and folders"""
        start_time = datetime.utcnow()
        result = SyncVerificationResult(scope=CacheScope.FILES)
        
        try:
            # Check for orphaned files (files referencing non-existent folders)
            orphaned_files_query = await db.execute(
                select(File)
                .outerjoin(Folder, File.folder_id == Folder.id)
                .where(
                    and_(
                        File.folder_id.isnot(None),
                        Folder.id.is_(None)
                    )
                )
            )
            orphaned_files = orphaned_files_query.scalars().all()
            
            for file in orphaned_files:
                result.issues.append(SyncIssue(
                    issue_type=SyncIssueType.ORPHANED_FILE,
                    severity=SyncIssueSeverity.HIGH,
                    entity_id=str(file.id),
                    entity_type="file",
                    description=f"File '{file.filename}' references non-existent folder {file.folder_id}",
                    affected_scopes={CacheScope.FILES, CacheScope.FOLDERS},
                    metadata={
                        "filename": file.filename,
                        "folder_id": str(file.folder_id) if file.folder_id else None,
                        "application_id": str(file.application_id) if file.application_id else None
                    },
                    auto_fixable=True
                ))
            
            # Check for files with missing applications
            files_missing_apps_query = await db.execute(
                select(File)
                .outerjoin(CustomerApplication, File.application_id == CustomerApplication.id)
                .where(
                    and_(
                        File.application_id.isnot(None),
                        CustomerApplication.id.is_(None)
                    )
                )
            )
            files_missing_apps = files_missing_apps_query.scalars().all()
            
            for file in files_missing_apps:
                result.issues.append(SyncIssue(
                    issue_type=SyncIssueType.MISSING_APPLICATION,
                    severity=SyncIssueSeverity.CRITICAL,
                    entity_id=str(file.id),
                    entity_type="file",
                    description=f"File '{file.filename}' references non-existent application {file.application_id}",
                    affected_scopes={CacheScope.FILES, CacheScope.APPLICATIONS},
                    metadata={
                        "filename": file.filename,
                        "application_id": str(file.application_id) if file.application_id else None
                    },
                    auto_fixable=False
                ))
            
            # Count total files checked
            total_files_query = await db.execute(select(func.count(File.id)))
            result.total_entities_checked = total_files_query.scalar() or 0
            
        except Exception as e:
            logger.error(f"Error during file-folder consistency verification: {e}")
            result.issues.append(SyncIssue(
                issue_type=SyncIssueType.STALE_CACHE,
                severity=SyncIssueSeverity.MEDIUM,
                entity_id="verification_error",
                entity_type="system",
                description=f"Verification failed: {str(e)}",
                affected_scopes={CacheScope.FILES}
            ))
        
        finally:
            result.verification_duration = (datetime.utcnow() - start_time).total_seconds()
            self._add_to_history(result)
        
        return result
    
    async def verify_folder_hierarchy_consistency(self, db: AsyncSession) -> SyncVerificationResult:
        """Verify folder hierarchy consistency"""
        start_time = datetime.utcnow()
        result = SyncVerificationResult(scope=CacheScope.FOLDERS)
        
        try:
            # Check for duplicate parent folders per application
            duplicate_parents_query = await db.execute(
                select(
                    Folder.application_id,
                    func.count(Folder.id).label('count')
                )
                .where(Folder.parent_id.is_(None))
                .group_by(Folder.application_id)
                .having(func.count(Folder.id) > 1)
            )
            duplicate_parents = duplicate_parents_query.all()
            
            for app_id, count in duplicate_parents:
                result.issues.append(SyncIssue(
                    issue_type=SyncIssueType.DUPLICATE_FOLDER,
                    severity=SyncIssueSeverity.HIGH,
                    entity_id=str(app_id),
                    entity_type="application",
                    description=f"Application has {count} parent folders (should have 1)",
                    affected_scopes={CacheScope.FOLDERS, CacheScope.FILES},
                    metadata={
                        "application_id": str(app_id),
                        "duplicate_count": count
                    },
                    auto_fixable=True
                ))
            
            # Check for broken folder hierarchy (folders referencing non-existent parents)
            broken_hierarchy_query = await db.execute(
                select(Folder)
                .outerjoin(Folder.parent.of_type(Folder), Folder.parent_id == Folder.parent.property.mapper.class_.id)
                .where(
                    and_(
                        Folder.parent_id.isnot(None),
                        Folder.parent.property.mapper.class_.id.is_(None)
                    )
                )
            )
            broken_folders = broken_hierarchy_query.scalars().all()
            
            for folder in broken_folders:
                result.issues.append(SyncIssue(
                    issue_type=SyncIssueType.BROKEN_HIERARCHY,
                    severity=SyncIssueSeverity.HIGH,
                    entity_id=str(folder.id),
                    entity_type="folder",
                    description=f"Folder '{folder.name}' references non-existent parent {folder.parent_id}",
                    affected_scopes={CacheScope.FOLDERS},
                    metadata={
                        "folder_name": folder.name,
                        "parent_id": str(folder.parent_id) if folder.parent_id else None,
                        "application_id": str(folder.application_id) if folder.application_id else None
                    },
                    auto_fixable=True
                ))
            
            # Count total folders checked
            total_folders_query = await db.execute(select(func.count(Folder.id)))
            result.total_entities_checked = total_folders_query.scalar() or 0
            
        except Exception as e:
            logger.error(f"Error during folder hierarchy verification: {e}")
            result.issues.append(SyncIssue(
                issue_type=SyncIssueType.STALE_CACHE,
                severity=SyncIssueSeverity.MEDIUM,
                entity_id="verification_error",
                entity_type="system",
                description=f"Verification failed: {str(e)}",
                affected_scopes={CacheScope.FOLDERS}
            ))
        
        finally:
            result.verification_duration = (datetime.utcnow() - start_time).total_seconds()
            self._add_to_history(result)
        
        return result
    
    async def verify_file_counts_consistency(self, db: AsyncSession) -> SyncVerificationResult:
        """Verify file count consistency between folders and actual files"""
        start_time = datetime.utcnow()
        result = SyncVerificationResult(scope=CacheScope.FILES)
        
        try:
            # Get folders with their actual file counts
            folders_with_counts_query = await db.execute(
                select(
                    Folder.id,
                    Folder.name,
                    Folder.application_id,
                    func.count(File.id).label('actual_file_count')
                )
                .outerjoin(File, File.folder_id == Folder.id)
                .group_by(Folder.id, Folder.name, Folder.application_id)
            )
            folders_with_counts = folders_with_counts_query.all()
            
            for folder_id, folder_name, app_id, actual_count in folders_with_counts:
                # Note: If we had a cached file_count field in Folder model, 
                # we would compare it here. For now, we just verify the count is reasonable.
                if actual_count > 1000:  # Arbitrary threshold for suspiciously high counts
                    result.issues.append(SyncIssue(
                        issue_type=SyncIssueType.INCONSISTENT_COUNTS,
                        severity=SyncIssueSeverity.MEDIUM,
                        entity_id=str(folder_id),
                        entity_type="folder",
                        description=f"Folder '{folder_name}' has unusually high file count: {actual_count}",
                        affected_scopes={CacheScope.FILES, CacheScope.FOLDERS},
                        metadata={
                            "folder_name": folder_name,
                            "actual_file_count": actual_count,
                            "application_id": str(app_id) if app_id else None
                        },
                        auto_fixable=False
                    ))
            
            result.total_entities_checked = len(folders_with_counts)
            
        except Exception as e:
            logger.error(f"Error during file count verification: {e}")
            result.issues.append(SyncIssue(
                issue_type=SyncIssueType.STALE_CACHE,
                severity=SyncIssueSeverity.MEDIUM,
                entity_id="verification_error",
                entity_type="system",
                description=f"Verification failed: {str(e)}",
                affected_scopes={CacheScope.FILES}
            ))
        
        finally:
            result.verification_duration = (datetime.utcnow() - start_time).total_seconds()
            self._add_to_history(result)
        
        return result
    
    async def verify_application_data_consistency(
        self, 
        db: AsyncSession,
        application_id: Optional[UUID] = None
    ) -> SyncVerificationResult:
        """Verify data consistency for specific application(s)"""
        start_time = datetime.utcnow()
        result = SyncVerificationResult(scope=CacheScope.APPLICATIONS)
        
        try:
            # Build query for applications to check
            app_query = select(CustomerApplication)
            if application_id:
                app_query = app_query.where(CustomerApplication.id == application_id)
            
            apps_result = await db.execute(app_query)
            applications = apps_result.scalars().all()
            
            for app in applications:
                # Check for files without folders in this application
                orphaned_files_query = await db.execute(
                    select(File)
                    .where(
                        and_(
                            File.application_id == app.id,
                            File.folder_id.is_(None)
                        )
                    )
                )
                orphaned_files = orphaned_files_query.scalars().all()
                
                if orphaned_files:
                    result.issues.append(SyncIssue(
                        issue_type=SyncIssueType.ORPHANED_FILE,
                        severity=SyncIssueSeverity.MEDIUM,
                        entity_id=str(app.id),
                        entity_type="application",
                        description=f"Application has {len(orphaned_files)} files without folders",
                        affected_scopes={CacheScope.FILES, CacheScope.APPLICATIONS},
                        metadata={
                            "application_id": str(app.id),
                            "orphaned_files_count": len(orphaned_files),
                            "orphaned_file_ids": [str(f.id) for f in orphaned_files[:10]]  # Limit to first 10
                        },
                        auto_fixable=True
                    ))
                
                # Check for empty folders in this application
                empty_folders_query = await db.execute(
                    select(Folder)
                    .outerjoin(File, File.folder_id == Folder.id)
                    .where(
                        and_(
                            Folder.application_id == app.id,
                            File.id.is_(None)
                        )
                    )
                )
                empty_folders = empty_folders_query.scalars().all()
                
                # Only report as issue if there are many empty folders (might indicate sync issue)
                if len(empty_folders) > 5:
                    result.issues.append(SyncIssue(
                        issue_type=SyncIssueType.INCONSISTENT_COUNTS,
                        severity=SyncIssueSeverity.LOW,
                        entity_id=str(app.id),
                        entity_type="application",
                        description=f"Application has {len(empty_folders)} empty folders",
                        affected_scopes={CacheScope.FOLDERS, CacheScope.APPLICATIONS},
                        metadata={
                            "application_id": str(app.id),
                            "empty_folders_count": len(empty_folders)
                        },
                        auto_fixable=False
                    ))
            
            result.total_entities_checked = len(applications)
            
        except Exception as e:
            logger.error(f"Error during application data verification: {e}")
            result.issues.append(SyncIssue(
                issue_type=SyncIssueType.STALE_CACHE,
                severity=SyncIssueSeverity.MEDIUM,
                entity_id="verification_error",
                entity_type="system",
                description=f"Verification failed: {str(e)}",
                affected_scopes={CacheScope.APPLICATIONS}
            ))
        
        finally:
            result.verification_duration = (datetime.utcnow() - start_time).total_seconds()
            self._add_to_history(result)
        
        return result
    
    async def run_comprehensive_verification(self, db: AsyncSession) -> Dict[str, SyncVerificationResult]:
        """Run all verification checks"""
        logger.info("Starting comprehensive data synchronization verification")
        
        results = {}
        
        # Run all verification checks
        results["file_folder_consistency"] = await self.verify_file_folder_consistency(db)
        results["folder_hierarchy_consistency"] = await self.verify_folder_hierarchy_consistency(db)
        results["file_counts_consistency"] = await self.verify_file_counts_consistency(db)
        results["application_data_consistency"] = await self.verify_application_data_consistency(db)
        
        # Log summary
        total_issues = sum(len(result.issues) for result in results.values())
        critical_issues = sum(result.critical_issues_count for result in results.values())
        
        logger.info(f"Verification complete: {total_issues} total issues, {critical_issues} critical")
        
        return results
    
    async def auto_fix_issues(
        self, 
        db: AsyncSession, 
        verification_result: SyncVerificationResult
    ) -> Dict[str, Any]:
        """Attempt to automatically fix issues that are marked as auto-fixable"""
        fixed_issues = []
        failed_fixes = []
        
        for issue in verification_result.issues:
            if not issue.auto_fixable:
                continue
            
            try:
                if issue.issue_type == SyncIssueType.ORPHANED_FILE:
                    await self._fix_orphaned_file(db, issue)
                    fixed_issues.append(issue.entity_id)
                
                elif issue.issue_type == SyncIssueType.DUPLICATE_FOLDER:
                    await self._fix_duplicate_folders(db, issue)
                    fixed_issues.append(issue.entity_id)
                
                elif issue.issue_type == SyncIssueType.BROKEN_HIERARCHY:
                    await self._fix_broken_hierarchy(db, issue)
                    fixed_issues.append(issue.entity_id)
                
            except Exception as e:
                logger.error(f"Failed to auto-fix issue {issue.entity_id}: {e}")
                failed_fixes.append({
                    "entity_id": issue.entity_id,
                    "error": str(e)
                })
        
        if fixed_issues:
            await db.commit()
            logger.info(f"Auto-fixed {len(fixed_issues)} issues")
        
        return {
            "fixed_issues": fixed_issues,
            "failed_fixes": failed_fixes,
            "total_fixed": len(fixed_issues),
            "total_failed": len(failed_fixes)
        }
    
    def get_verification_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent verification history"""
        recent_results = self._verification_history[-limit:][::-1]
        return [result.to_dict() for result in recent_results]
    
    async def _fix_orphaned_file(self, db: AsyncSession, issue: SyncIssue) -> None:
        """Fix orphaned file by creating appropriate folder or removing folder reference"""
        file_id = UUID(issue.entity_id)
        file_query = await db.execute(select(File).where(File.id == file_id))
        file = file_query.scalar_one_or_none()
        
        if not file:
            return
        
        # Remove the folder reference to make the file application-level
        file.folder_id = None
        logger.info(f"Fixed orphaned file {file_id} by removing folder reference")
    
    async def _fix_duplicate_folders(self, db: AsyncSession, issue: SyncIssue) -> None:
        """Fix duplicate folders by consolidating them"""
        from app.services.folder_service import EnhancedFolderService
        
        application_id = UUID(issue.entity_id)
        
        # Get duplicate parent folders
        parent_folders_query = await db.execute(
            select(Folder).where(
                and_(
                    Folder.application_id == application_id,
                    Folder.parent_id.is_(None)
                )
            )
        )
        parent_folders = parent_folders_query.scalars().all()
        
        if len(parent_folders) > 1:
            await EnhancedFolderService._consolidate_duplicate_parent_folders(
                db, parent_folders
            )
            logger.info(f"Fixed duplicate folders for application {application_id}")
    
    async def _fix_broken_hierarchy(self, db: AsyncSession, issue: SyncIssue) -> None:
        """Fix broken folder hierarchy by removing invalid parent reference"""
        folder_id = UUID(issue.entity_id)
        folder_query = await db.execute(select(Folder).where(Folder.id == folder_id))
        folder = folder_query.scalar_one_or_none()
        
        if not folder:
            return
        
        # Remove the invalid parent reference
        folder.parent_id = None
        logger.info(f"Fixed broken hierarchy for folder {folder_id} by removing parent reference")
    
    def _add_to_history(self, result: SyncVerificationResult) -> None:
        """Add verification result to history"""
        self._verification_history.append(result)
        
        # Trim history if it gets too large
        if len(self._verification_history) > self._max_history_size:
            self._verification_history = self._verification_history[-self._max_history_size//2:]


# Global data sync verification service instance
data_sync_verification_service = DataSyncVerificationService()