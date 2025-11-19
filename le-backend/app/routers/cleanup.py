"""
Cleanup Management API Router

Provides REST API endpoints for database cleanup operations.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional
from uuid import UUID

from app.database import get_db
from app.core.security import get_current_user
from app.models import User
from app.services.database_cleanup_service import cleanup_service
from app.services.automated_cleanup_service import automated_cleanup_service

router = APIRouter(prefix="/api/cleanup", tags=["cleanup"])


@router.get("/status")
async def get_cleanup_status(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get automated cleanup service status"""
    # if current_user.role not in ["admin", "manager"]:
    #     raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    return automated_cleanup_service.get_service_status()


@router.post("/check")
async def run_consistency_check(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Run consistency check to identify issues"""
    # if current_user.role not in ["admin", "manager"]:
    #     raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    return await automated_cleanup_service.run_consistency_check()


@router.post("/verify")
async def verify_integrity(
    application_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Verify database integrity"""
    # if current_user.role not in ["admin", "manager"]:
    #     raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    return await cleanup_service.verify_cleanup_integrity(db, application_id)


@router.post("/cleanup")
async def run_cleanup(
    dry_run: bool = False,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Run database cleanup operation"""
    # if current_user.role != "admin":
    #     raise HTTPException(status_code=403, detail="Admin access required")
    
    if dry_run:
        # Run dry run synchronously
        report = await cleanup_service.cleanup_all_duplicate_folders(db, dry_run=True)
        return {
            "dry_run": True,
            "applications_found": report.total_applications,
            "report": report.__dict__
        }
    else:
        # Run actual cleanup in background
        background_tasks.add_task(
            cleanup_service.cleanup_all_duplicate_folders, db, False
        )
        return {"message": "Cleanup started in background", "dry_run": False}


@router.post("/rollback/{rollback_id}")
async def rollback_cleanup(
    rollback_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    """Rollback a cleanup operation"""
    # if current_user.role != "admin":
    #     raise HTTPException(status_code=403, detail="Admin access required")
    
    success = await cleanup_service.rollback_cleanup(db, rollback_id)
    
    if success:
        return {"message": "Rollback completed successfully", "rollback_id": rollback_id}
    else:
        raise HTTPException(status_code=400, detail="Rollback failed")