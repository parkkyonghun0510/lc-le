"""
Data Synchronization API Router

Provides endpoints for data consistency verification, cache invalidation,
real-time updates, and manual refresh capabilities.
"""

from typing import Dict, List, Optional, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.database import get_db
from app.core.security import get_current_user
from app.models import User
from app.services.cache_invalidation_service import (
    cache_invalidation_service,
    CacheScope,
    InvalidationReason
)
from app.services.realtime_update_service import (
    realtime_update_service,
    UpdateType
)
from app.services.data_sync_verification_service import (
    data_sync_verification_service,
    SyncVerificationResult
)
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()


# Pydantic models for request/response
class CacheInvalidationRequest(BaseModel):
    scope: str = Field(..., description="Cache scope to invalidate")
    reason: str = Field(default="manual_refresh", description="Reason for invalidation")
    entity_id: Optional[str] = Field(None, description="Specific entity ID to invalidate")
    related_ids: List[str] = Field(default_factory=list, description="Related entity IDs")


class ManualRefreshRequest(BaseModel):
    scopes: List[str] = Field(..., description="Cache scopes to refresh")
    application_id: Optional[str] = Field(None, description="Specific application to refresh")
    force_full_refresh: bool = Field(default=False, description="Force full data refresh")


class SSEConnectionRequest(BaseModel):
    subscribed_scopes: Optional[List[str]] = Field(None, description="Scopes to subscribe to")
    application_filters: Optional[List[str]] = Field(None, description="Application IDs to filter by")


class VerificationRequest(BaseModel):
    scopes: Optional[List[str]] = Field(None, description="Specific scopes to verify")
    application_id: Optional[str] = Field(None, description="Specific application to verify")
    auto_fix: bool = Field(default=False, description="Automatically fix issues if possible")


# Cache invalidation endpoints
@router.post("/cache/invalidate")
async def invalidate_cache(
    request: CacheInvalidationRequest,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Manually invalidate cache for specific scope"""
    try:
        scope = CacheScope(request.scope)
        reason = InvalidationReason(request.reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid scope or reason: {e}")
    
    try:
        from app.services.cache_invalidation_service import CacheInvalidationEvent
        
        event = CacheInvalidationEvent(
            scope=scope,
            reason=reason,
            entity_id=request.entity_id,
            related_ids=set(request.related_ids),
            metadata={"user_id": str(current_user.id), "manual": True}
        )
        
        await cache_invalidation_service.invalidate(event)
        
        logger.info(f"Cache invalidated by user {current_user.id}: {scope.value}")
        
        return {
            "success": True,
            "message": f"Cache invalidated for scope: {scope.value}",
            "scope": scope.value,
            "reason": reason.value,
            "timestamp": event.timestamp.isoformat()
        }
    
    except Exception as e:
        logger.error(f"Cache invalidation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Cache invalidation failed: {e}")


@router.post("/cache/refresh")
async def manual_refresh(
    request: ManualRefreshRequest,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Trigger manual refresh for multiple scopes"""
    refreshed_scopes = []
    
    for scope_str in request.scopes:
        try:
            scope = CacheScope(scope_str)
            await cache_invalidation_service.manual_refresh_request(
                scope=scope,
                entity_id=request.application_id,
                user_id=str(current_user.id)
            )
            refreshed_scopes.append(scope_str)
        except ValueError:
            logger.warning(f"Invalid scope in refresh request: {scope_str}")
    
    logger.info(f"Manual refresh triggered by user {current_user.id} for scopes: {refreshed_scopes}")
    
    return {
        "success": True,
        "message": f"Manual refresh triggered for {len(refreshed_scopes)} scopes",
        "refreshed_scopes": refreshed_scopes,
        "application_id": request.application_id,
        "force_full_refresh": request.force_full_refresh
    }


@router.get("/cache/history")
async def get_cache_invalidation_history(
    scope: Optional[str] = Query(None, description="Filter by cache scope"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of events to return"),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get cache invalidation history"""
    try:
        cache_scope = CacheScope(scope) if scope else None
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid scope: {scope}")
    
    history = cache_invalidation_service.get_invalidation_history(
        scope=cache_scope,
        limit=limit
    )
    
    return {
        "history": history,
        "total_events": len(history),
        "scope_filter": scope,
        "limit": limit
    }


# Real-time updates endpoints
@router.post("/realtime/connect")
async def create_realtime_connection(
    request: SSEConnectionRequest,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Create a new real-time update connection"""
    connection_id = await realtime_update_service.create_connection(
        user_id=str(current_user.id),
        subscribed_scopes=request.subscribed_scopes,
        application_filters=request.application_filters
    )
    
    return {
        "connection_id": connection_id,
        "user_id": str(current_user.id),
        "subscribed_scopes": request.subscribed_scopes or [scope.value for scope in CacheScope],
        "application_filters": request.application_filters or []
    }


@router.get("/realtime/stream/{connection_id}")
async def realtime_stream(
    connection_id: str,
    current_user: User = Depends(get_current_user)
) -> StreamingResponse:
    """Server-Sent Events stream for real-time updates"""
    
    async def event_stream():
        async for data in realtime_update_service.get_connection_stream(connection_id):
            yield data
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )


@router.get("/realtime/stats")
async def get_realtime_stats(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get real-time connection statistics"""
    stats = realtime_update_service.get_connection_stats()
    return {
        "stats": stats,
        "timestamp": "2024-01-01T00:00:00Z"  # Current timestamp would be added in real implementation
    }


@router.get("/realtime/history")
async def get_realtime_history(
    scope: Optional[str] = Query(None, description="Filter by scope"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of updates to return"),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get real-time update history"""
    try:
        cache_scope = CacheScope(scope) if scope else None
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid scope: {scope}")
    
    history = realtime_update_service.get_update_history(
        scope=cache_scope,
        limit=limit
    )
    
    return {
        "history": history,
        "total_updates": len(history),
        "scope_filter": scope,
        "limit": limit
    }


# Data verification endpoints
@router.post("/verification/run")
async def run_data_verification(
    request: VerificationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Run data synchronization verification"""
    logger.info(f"Data verification requested by user {current_user.id}")
    
    try:
        if request.scopes:
            # Run specific verifications
            results = {}
            
            for scope_str in request.scopes:
                if scope_str == "files":
                    results["file_folder_consistency"] = await data_sync_verification_service.verify_file_folder_consistency(db)
                elif scope_str == "folders":
                    results["folder_hierarchy_consistency"] = await data_sync_verification_service.verify_folder_hierarchy_consistency(db)
                elif scope_str == "applications":
                    app_id = UUID(request.application_id) if request.application_id else None
                    results["application_data_consistency"] = await data_sync_verification_service.verify_application_data_consistency(db, app_id)
        else:
            # Run comprehensive verification
            results = await data_sync_verification_service.run_comprehensive_verification(db)
        
        # Auto-fix issues if requested
        auto_fix_results = {}
        if request.auto_fix:
            for verification_name, verification_result in results.items():
                if verification_result.auto_fixable_issues_count > 0:
                    fix_result = await data_sync_verification_service.auto_fix_issues(db, verification_result)
                    auto_fix_results[verification_name] = fix_result
        
        # Convert results to dict format
        results_dict = {name: result.to_dict() for name, result in results.items()}
        
        return {
            "verification_results": results_dict,
            "auto_fix_results": auto_fix_results,
            "total_issues": sum(len(result.issues) for result in results.values()),
            "critical_issues": sum(result.critical_issues_count for result in results.values()),
            "auto_fixable_issues": sum(result.auto_fixable_issues_count for result in results.values()),
            "requested_by": str(current_user.id)
        }
    
    except Exception as e:
        logger.error(f"Data verification failed: {e}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {e}")


@router.get("/verification/history")
async def get_verification_history(
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results to return"),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get data verification history"""
    history = data_sync_verification_service.get_verification_history(limit=limit)
    
    return {
        "history": history,
        "total_results": len(history),
        "limit": limit
    }


# System health and sync status endpoints
@router.get("/sync/status")
async def get_sync_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get overall system synchronization status"""
    try:
        # Run quick verification checks
        file_result = await data_sync_verification_service.verify_file_folder_consistency(db)
        folder_result = await data_sync_verification_service.verify_folder_hierarchy_consistency(db)
        
        total_issues = len(file_result.issues) + len(folder_result.issues)
        critical_issues = file_result.critical_issues_count + folder_result.critical_issues_count
        
        # Get real-time connection stats
        realtime_stats = realtime_update_service.get_connection_stats()
        
        # Determine overall status
        if critical_issues > 0:
            status = "critical"
        elif total_issues > 0:
            status = "warning"
        else:
            status = "healthy"
        
        return {
            "status": status,
            "total_issues": total_issues,
            "critical_issues": critical_issues,
            "realtime_connections": realtime_stats["total_connections"],
            "last_verification": {
                "file_consistency": {
                    "issues": len(file_result.issues),
                    "duration": file_result.verification_duration,
                    "timestamp": file_result.timestamp.isoformat()
                },
                "folder_consistency": {
                    "issues": len(folder_result.issues),
                    "duration": folder_result.verification_duration,
                    "timestamp": folder_result.timestamp.isoformat()
                }
            }
        }
    
    except Exception as e:
        logger.error(f"Sync status check failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "total_issues": -1,
            "critical_issues": -1
        }


@router.post("/sync/force-refresh")
async def force_system_refresh(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Force a complete system data refresh"""
    logger.info(f"Force system refresh requested by user {current_user.id}")
    
    # Invalidate all caches
    refreshed_scopes = []
    for scope in CacheScope:
        try:
            await cache_invalidation_service.manual_refresh_request(
                scope=scope,
                user_id=str(current_user.id)
            )
            refreshed_scopes.append(scope.value)
        except Exception as e:
            logger.error(f"Failed to refresh scope {scope.value}: {e}")
    
    # Send sync required notifications
    for scope in CacheScope:
        await realtime_update_service.send_sync_required(
            scope=scope,
            reason="Force system refresh requested",
            application_id=None
        )
    
    return {
        "success": True,
        "message": "System refresh initiated",
        "refreshed_scopes": refreshed_scopes,
        "requested_by": str(current_user.id),
        "timestamp": "2024-01-01T00:00:00Z"  # Current timestamp would be added in real implementation
    }