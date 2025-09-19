"""
Automated Cleanup Service for System Stability Improvements

This service provides automated, scheduled cleanup operations for ongoing maintenance
of database integrity, specifically targeting duplicate folder issues.

Requirements addressed: 4.4, 4.5
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum

from app.services.database_cleanup_service import cleanup_service, CleanupReport
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


class ScheduleType(Enum):
    """Types of cleanup schedules"""
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MANUAL = "manual"


@dataclass
class CleanupSchedule:
    """Configuration for automated cleanup schedules"""
    schedule_type: ScheduleType
    enabled: bool = True
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    max_applications_per_run: int = 10
    dry_run_first: bool = True
    alert_on_failure: bool = True
    alert_threshold: int = 5  # Alert if more than N applications need cleanup


class AutomatedCleanupService:
    """
    Service for automated database cleanup operations
    """
    
    def __init__(self):
        self.schedules: Dict[str, CleanupSchedule] = {
            'consistency_check': CleanupSchedule(
                schedule_type=ScheduleType.HOURLY,
                enabled=True,
                max_applications_per_run=5,
                dry_run_first=True
            ),
            'full_cleanup': CleanupSchedule(
                schedule_type=ScheduleType.DAILY,
                enabled=True,
                max_applications_per_run=20,
                dry_run_first=False
            ),
            'integrity_verification': CleanupSchedule(
                schedule_type=ScheduleType.WEEKLY,
                enabled=True,
                max_applications_per_run=0,  # No limit for verification
                dry_run_first=False
            )
        }
        self.running = False
        self.cleanup_stats = {
            'total_runs': 0,
            'successful_runs': 0,
            'failed_runs': 0,
            'last_run_time': None,
            'applications_cleaned': 0,
            'folders_removed': 0,
            'files_moved': 0
        }
    
    def calculate_next_run(self, schedule: CleanupSchedule) -> datetime:
        """
        Calculate the next run time for a schedule
        
        Args:
            schedule: Cleanup schedule configuration
            
        Returns:
            Next scheduled run time
        """
        now = datetime.now(timezone.utc)
        
        if schedule.schedule_type == ScheduleType.HOURLY:
            return now + timedelta(hours=1)
        elif schedule.schedule_type == ScheduleType.DAILY:
            # Run at 2 AM UTC daily
            next_run = now.replace(hour=2, minute=0, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(days=1)
            return next_run
        elif schedule.schedule_type == ScheduleType.WEEKLY:
            # Run on Sunday at 3 AM UTC
            days_until_sunday = (6 - now.weekday()) % 7
            if days_until_sunday == 0 and now.hour >= 3:
                days_until_sunday = 7
            next_run = now + timedelta(days=days_until_sunday)
            next_run = next_run.replace(hour=3, minute=0, second=0, microsecond=0)
            return next_run
        else:
            # Manual schedule - no automatic next run
            return now + timedelta(days=365)  # Far future
    
    async def run_consistency_check(self) -> Dict[str, Any]:
        """
        Run a consistency check to identify potential issues
        
        Returns:
            Dictionary with check results
        """
        logger.info("Running automated consistency check")
        
        try:
            async with AsyncSessionLocal() as db:
                # Find applications with duplicate folders
                duplicate_apps = await cleanup_service.find_applications_with_duplicate_folders(db)
                
                # Run integrity verification
                verification_results = await cleanup_service.verify_cleanup_integrity(db)
                
                results = {
                    'check_time': datetime.now(timezone.utc),
                    'duplicate_applications_found': len(duplicate_apps),
                    'duplicate_applications': [str(app_id) for app_id, _ in duplicate_apps],
                    'integrity_verification': verification_results,
                    'needs_cleanup': len(duplicate_apps) > 0 or not verification_results['verification_passed'],
                    'alert_threshold_exceeded': len(duplicate_apps) > self.schedules['consistency_check'].alert_threshold
                }
                
                if results['needs_cleanup']:
                    logger.warning(f"Consistency check found {len(duplicate_apps)} applications needing cleanup")
                    if results['alert_threshold_exceeded']:
                        logger.error(f"Alert threshold exceeded: {len(duplicate_apps)} applications need cleanup")
                else:
                    logger.info("Consistency check passed - no issues found")
                
                return results
                
        except Exception as e:
            logger.error(f"Error during consistency check: {e}")
            return {
                'check_time': datetime.now(timezone.utc),
                'error': str(e),
                'needs_cleanup': False,
                'alert_threshold_exceeded': False
            }
    
    async def run_automated_cleanup(
        self, schedule_name: str, max_applications: Optional[int] = None
    ) -> CleanupReport:
        """
        Run automated cleanup for a specific schedule
        
        Args:
            schedule_name: Name of the schedule to run
            max_applications: Override for maximum applications to process
            
        Returns:
            CleanupReport with results
        """
        schedule = self.schedules.get(schedule_name)
        if not schedule or not schedule.enabled:
            logger.warning(f"Schedule '{schedule_name}' not found or disabled")
            return None
        
        logger.info(f"Running automated cleanup for schedule: {schedule_name}")
        
        try:
            async with AsyncSessionLocal() as db:
                # Determine if this should be a dry run
                dry_run = schedule.dry_run_first and schedule.last_run is None
                
                if dry_run:
                    logger.info("Running initial dry run for schedule")
                
                # Run the cleanup
                report = await cleanup_service.cleanup_all_duplicate_folders(db, dry_run=dry_run)
                
                # Update schedule tracking
                schedule.last_run = datetime.now(timezone.utc)
                schedule.next_run = self.calculate_next_run(schedule)
                
                # Update statistics
                self.cleanup_stats['total_runs'] += 1
                if report.failed_cleanups == 0:
                    self.cleanup_stats['successful_runs'] += 1
                else:
                    self.cleanup_stats['failed_runs'] += 1
                
                self.cleanup_stats['last_run_time'] = schedule.last_run
                self.cleanup_stats['applications_cleaned'] += report.successful_cleanups
                self.cleanup_stats['folders_removed'] += report.total_folders_removed
                self.cleanup_stats['files_moved'] += report.total_files_moved
                
                # Log results
                if dry_run:
                    logger.info(f"Dry run completed: would clean {report.total_applications} applications")
                else:
                    logger.info(f"Cleanup completed: {report.successful_cleanups}/{report.total_applications} successful")
                    if report.failed_cleanups > 0:
                        logger.warning(f"Cleanup had {report.failed_cleanups} failures")
                
                return report
                
        except Exception as e:
            logger.error(f"Error during automated cleanup '{schedule_name}': {e}")
            self.cleanup_stats['failed_runs'] += 1
            raise
    
    async def run_integrity_verification(self) -> Dict[str, Any]:
        """
        Run comprehensive integrity verification
        
        Returns:
            Dictionary with verification results
        """
        logger.info("Running automated integrity verification")
        
        try:
            async with AsyncSessionLocal() as db:
                verification_results = await cleanup_service.verify_cleanup_integrity(db)
                
                verification_results['verification_time'] = datetime.now(timezone.utc)
                
                if verification_results['verification_passed']:
                    logger.info("Integrity verification passed")
                else:
                    logger.warning("Integrity verification found issues")
                    logger.warning(f"Duplicate parent folders: {verification_results['duplicate_parent_folders']}")
                    logger.warning(f"Orphaned files: {verification_results['orphaned_files']}")
                    logger.warning(f"Orphaned folders: {verification_results['orphaned_folders']}")
                
                return verification_results
                
        except Exception as e:
            logger.error(f"Error during integrity verification: {e}")
            return {
                'verification_time': datetime.now(timezone.utc),
                'error': str(e),
                'verification_passed': False
            }
    
    async def start_automated_service(self):
        """
        Start the automated cleanup service
        """
        if self.running:
            logger.warning("Automated cleanup service is already running")
            return
        
        self.running = True
        logger.info("Starting automated cleanup service")
        
        # Initialize next run times
        for schedule_name, schedule in self.schedules.items():
            if schedule.enabled and schedule.next_run is None:
                schedule.next_run = self.calculate_next_run(schedule)
                logger.info(f"Schedule '{schedule_name}' next run: {schedule.next_run}")
        
        # Main service loop
        while self.running:
            try:
                await self._process_scheduled_tasks()
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Error in automated cleanup service loop: {e}")
                await asyncio.sleep(300)  # Wait 5 minutes on error
    
    async def _process_scheduled_tasks(self):
        """
        Process any scheduled tasks that are due
        """
        now = datetime.now(timezone.utc)
        
        for schedule_name, schedule in self.schedules.items():
            if not schedule.enabled or schedule.next_run is None:
                continue
            
            if now >= schedule.next_run:
                logger.info(f"Running scheduled task: {schedule_name}")
                
                try:
                    if schedule_name == 'consistency_check':
                        await self.run_consistency_check()
                    elif schedule_name == 'full_cleanup':
                        await self.run_automated_cleanup(schedule_name)
                    elif schedule_name == 'integrity_verification':
                        await self.run_integrity_verification()
                    
                    # Update next run time
                    schedule.next_run = self.calculate_next_run(schedule)
                    logger.info(f"Next run for '{schedule_name}': {schedule.next_run}")
                    
                except Exception as e:
                    logger.error(f"Error running scheduled task '{schedule_name}': {e}")
                    # Schedule retry in 30 minutes
                    schedule.next_run = now + timedelta(minutes=30)
    
    def stop_automated_service(self):
        """
        Stop the automated cleanup service
        """
        logger.info("Stopping automated cleanup service")
        self.running = False
    
    def get_service_status(self) -> Dict[str, Any]:
        """
        Get current status of the automated cleanup service
        
        Returns:
            Dictionary with service status information
        """
        return {
            'running': self.running,
            'schedules': {
                name: {
                    'enabled': schedule.enabled,
                    'schedule_type': schedule.schedule_type.value,
                    'last_run': schedule.last_run,
                    'next_run': schedule.next_run,
                    'max_applications_per_run': schedule.max_applications_per_run
                }
                for name, schedule in self.schedules.items()
            },
            'statistics': self.cleanup_stats
        }
    
    def update_schedule(
        self, schedule_name: str, enabled: Optional[bool] = None,
        max_applications: Optional[int] = None
    ) -> bool:
        """
        Update a cleanup schedule configuration
        
        Args:
            schedule_name: Name of schedule to update
            enabled: Whether to enable/disable the schedule
            max_applications: Maximum applications to process per run
            
        Returns:
            True if update successful, False otherwise
        """
        if schedule_name not in self.schedules:
            logger.error(f"Schedule '{schedule_name}' not found")
            return False
        
        schedule = self.schedules[schedule_name]
        
        if enabled is not None:
            schedule.enabled = enabled
            if enabled and schedule.next_run is None:
                schedule.next_run = self.calculate_next_run(schedule)
            logger.info(f"Schedule '{schedule_name}' {'enabled' if enabled else 'disabled'}")
        
        if max_applications is not None:
            schedule.max_applications_per_run = max_applications
            logger.info(f"Schedule '{schedule_name}' max applications set to {max_applications}")
        
        return True


# Singleton instance for global use
automated_cleanup_service = AutomatedCleanupService()