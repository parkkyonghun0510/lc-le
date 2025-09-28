"""
Background Job Processing Service
Handles asynchronous processing of bulk operations and long-running tasks.
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, timezone
from enum import Enum
from dataclasses import dataclass
from uuid import UUID
import json

from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import BulkOperation
from app.core.config import settings

logger = logging.getLogger(__name__)

class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class JobPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

@dataclass
class JobResult:
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class BackgroundJob:
    """Represents a background job with metadata and execution context"""
    
    def __init__(
        self,
        job_id: str,
        job_type: str,
        payload: Dict[str, Any],
        priority: JobPriority = JobPriority.NORMAL,
        max_retries: int = 3,
        timeout: int = 3600  # 1 hour default
    ):
        self.job_id = job_id
        self.job_type = job_type
        self.payload = payload
        self.priority = priority
        self.max_retries = max_retries
        self.timeout = timeout
        self.status = JobStatus.PENDING
        self.created_at = datetime.now(timezone.utc)
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.retry_count = 0
        self.result: Optional[JobResult] = None
        self.error_message: Optional[str] = None

class BackgroundJobService:
    """Service for managing and executing background jobs"""
    
    def __init__(self):
        self.jobs: Dict[str, BackgroundJob] = {}
        self.job_processors: Dict[str, Callable] = {}
        self.is_running = False
        self.worker_tasks: List[asyncio.Task] = []
        
    def register_processor(self, job_type: str, processor_func: Callable):
        """Register a job processor function for a specific job type"""
        self.job_processors[job_type] = processor_func
        logger.info(f"Registered processor for job type: {job_type}")
    
    async def start_workers(self, num_workers: int = 3):
        """Start background job workers"""
        if self.is_running:
            logger.warning("Background job service is already running")
            return
            
        self.is_running = True
        logger.info(f"Starting {num_workers} background job workers")
        
        for i in range(num_workers):
            task = asyncio.create_task(self._worker(f"worker-{i}"))
            self.worker_tasks.append(task)
    
    async def stop_workers(self):
        """Stop all background job workers"""
        self.is_running = False
        logger.info("Stopping background job workers")
        
        for task in self.worker_tasks:
            task.cancel()
        
        await asyncio.gather(*self.worker_tasks, return_exceptions=True)
        self.worker_tasks.clear()
    
    async def submit_job(
        self,
        job_type: str,
        payload: Dict[str, Any],
        priority: JobPriority = JobPriority.NORMAL,
        max_retries: int = 3,
        timeout: int = 3600
    ) -> str:
        """Submit a new background job"""
        job_id = f"{job_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{len(self.jobs)}"
        
        job = BackgroundJob(
            job_id=job_id,
            job_type=job_type,
            payload=payload,
            priority=priority,
            max_retries=max_retries,
            timeout=timeout
        )
        
        self.jobs[job_id] = job
        logger.info(f"Submitted job {job_id} of type {job_type} with priority {priority}")
        
        return job_id
    
    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a specific job"""
        job = self.jobs.get(job_id)
        if not job:
            return None
        
        return {
            "job_id": job.job_id,
            "job_type": job.job_type,
            "status": job.status,
            "priority": job.priority,
            "created_at": job.created_at.isoformat(),
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "retry_count": job.retry_count,
            "result": {
                "success": job.result.success if job.result else None,
                "message": job.result.message if job.result else None,
                "error": job.error_message
            } if job.result or job.error_message else None
        }
    
    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a pending or processing job"""
        job = self.jobs.get(job_id)
        if not job:
            return False
        
        if job.status in [JobStatus.PENDING, JobStatus.PROCESSING]:
            job.status = JobStatus.CANCELLED
            job.completed_at = datetime.now(timezone.utc)
            logger.info(f"Cancelled job {job_id}")
            return True
        
        return False
    
    async def _worker(self, worker_name: str):
        """Background worker that processes jobs"""
        logger.info(f"Started worker {worker_name}")
        
        while self.is_running:
            try:
                # Get next job to process
                job = await self._get_next_job()
                if not job:
                    await asyncio.sleep(1)  # No jobs available, wait
                    continue
                
                # Process the job
                await self._process_job(job, worker_name)
                
            except asyncio.CancelledError:
                logger.info(f"Worker {worker_name} cancelled")
                break
            except Exception as e:
                logger.error(f"Worker {worker_name} error: {e}")
                await asyncio.sleep(5)  # Wait before retrying
        
        logger.info(f"Worker {worker_name} stopped")
    
    async def _get_next_job(self) -> Optional[BackgroundJob]:
        """Get the next job to process based on priority"""
        pending_jobs = [
            job for job in self.jobs.values()
            if job.status == JobStatus.PENDING
        ]
        
        if not pending_jobs:
            return None
        
        # Sort by priority and creation time
        priority_order = {
            JobPriority.URGENT: 0,
            JobPriority.HIGH: 1,
            JobPriority.NORMAL: 2,
            JobPriority.LOW: 3
        }
        
        pending_jobs.sort(
            key=lambda j: (priority_order.get(j.priority, 2), j.created_at)
        )
        
        return pending_jobs[0]
    
    async def _process_job(self, job: BackgroundJob, worker_name: str):
        """Process a single job"""
        job.status = JobStatus.PROCESSING
        job.started_at = datetime.now(timezone.utc)
        
        logger.info(f"Worker {worker_name} processing job {job.job_id}")
        
        try:
            # Get the processor for this job type
            processor = self.job_processors.get(job.job_type)
            if not processor:
                raise ValueError(f"No processor registered for job type: {job.job_type}")
            
            # Execute the job with timeout
            result = await asyncio.wait_for(
                processor(job.payload),
                timeout=job.timeout
            )
            
            # Job completed successfully
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.now(timezone.utc)
            job.result = JobResult(
                success=True,
                message="Job completed successfully",
                data=result
            )
            
            logger.info(f"Job {job.job_id} completed successfully")
            
        except asyncio.TimeoutError:
            await self._handle_job_failure(job, f"Job timed out after {job.timeout} seconds")
        except Exception as e:
            await self._handle_job_failure(job, str(e))
    
    async def _handle_job_failure(self, job: BackgroundJob, error_message: str):
        """Handle job failure with retry logic"""
        job.retry_count += 1
        job.error_message = error_message
        
        if job.retry_count < job.max_retries:
            # Retry the job
            job.status = JobStatus.PENDING
            job.started_at = None
            logger.warning(f"Job {job.job_id} failed, retrying ({job.retry_count}/{job.max_retries}): {error_message}")
        else:
            # Max retries exceeded, mark as failed
            job.status = JobStatus.FAILED
            job.completed_at = datetime.now(timezone.utc)
            job.result = JobResult(
                success=False,
                message=f"Job failed after {job.max_retries} retries",
                error=error_message
            )
            logger.error(f"Job {job.job_id} failed permanently: {error_message}")
    
    async def get_job_statistics(self) -> Dict[str, Any]:
        """Get statistics about job processing"""
        total_jobs = len(self.jobs)
        status_counts = {}
        
        for job in self.jobs.values():
            status = job.status
            status_counts[status] = status_counts.get(status, 0) + 1
        
        return {
            "total_jobs": total_jobs,
            "status_counts": status_counts,
            "workers_running": len(self.worker_tasks),
            "is_running": self.is_running
        }

# Global job service instance
job_service = BackgroundJobService()

# Job processors for different job types
async def bulk_status_update_processor(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Process bulk status update jobs"""
    user_ids = payload.get("user_ids", [])
    new_status = payload.get("status")
    reason = payload.get("reason", "")
    performed_by = payload.get("performed_by")
    
    # This would integrate with the existing bulk status update logic
    # For now, return a mock result
    return {
        "processed_users": len(user_ids),
        "status": new_status,
        "reason": reason
    }

async def csv_import_processor(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Process CSV import jobs"""
    file_path = payload.get("file_path")
    import_mode = payload.get("import_mode", "create_and_update")
    performed_by = payload.get("performed_by")
    
    # This would integrate with the existing CSV import logic
    # For now, return a mock result
    return {
        "file_path": file_path,
        "import_mode": import_mode,
        "processed_rows": 100  # Mock value
    }

async def csv_export_processor(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Process CSV export jobs"""
    filters = payload.get("filters", {})
    performed_by = payload.get("performed_by")
    
    # This would integrate with the existing CSV export logic
    # For now, return a mock result
    return {
        "exported_records": 500,  # Mock value
        "filters_applied": filters
    }

# Register job processors
job_service.register_processor("bulk_status_update", bulk_status_update_processor)
job_service.register_processor("csv_import", csv_import_processor)
job_service.register_processor("csv_export", csv_export_processor)
