"""
Performance Monitoring and Benchmarking API Endpoints
Provides endpoints for monitoring system performance and running benchmarks.
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import Dict, Any, List, Optional
import asyncio

from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user
from app.services.background_job_service import job_service
from app.services.connection_pool_monitor import connection_monitor
from app.services.performance_benchmark_service import benchmark_service
from app.services.database_monitoring_service import DatabaseMonitoringService

router = APIRouter(prefix="/performance", tags=["performance"])

@router.get("/status")
async def get_performance_status(
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get overall system performance status"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view performance status"
        )
    
    try:
        # Get connection pool stats
        pool_stats = await connection_monitor.get_current_stats()
        
        # Get database monitoring stats
        monitoring_service = DatabaseMonitoringService(db)
        db_stats = await monitoring_service.get_database_stats()
        
        # Get job service stats
        job_stats = await job_service.get_job_statistics()
        
        return {
            "status": "healthy",
            "timestamp": pool_stats.get("timestamp"),
            "connection_pool": pool_stats.get("pool_stats", {}),
            "database": db_stats,
            "background_jobs": job_stats,
            "monitoring_active": connection_monitor.monitoring_active
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get performance status: {str(e)}"
        )

@router.get("/connection-pool/stats")
async def get_connection_pool_stats(
    current_user: User = Depends(get_current_user)
):
    """Get current connection pool statistics"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view connection pool stats"
        )
    
    try:
        stats = await connection_monitor.get_current_stats()
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get connection pool stats: {str(e)}"
        )

@router.get("/connection-pool/history")
async def get_connection_pool_history(
    hours: int = 24,
    current_user: User = Depends(get_current_user)
):
    """Get historical connection pool statistics"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view connection pool history"
        )
    
    try:
        history = await connection_monitor.get_historical_stats(hours)
        return history
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get connection pool history: {str(e)}"
        )

@router.get("/connection-pool/recommendations")
async def get_connection_pool_recommendations(
    current_user: User = Depends(get_current_user)
):
    """Get connection pool optimization recommendations"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view connection pool recommendations"
        )
    
    try:
        recommendations = await connection_monitor.get_optimization_recommendations()
        return {"recommendations": recommendations}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get connection pool recommendations: {str(e)}"
        )

@router.post("/connection-pool/monitoring/start")
async def start_connection_pool_monitoring(
    interval: int = 30,
    current_user: User = Depends(get_current_user)
):
    """Start connection pool monitoring"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to start connection pool monitoring"
        )
    
    try:
        await connection_monitor.start_monitoring(interval)
        return {"message": f"Connection pool monitoring started with {interval}s interval"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start connection pool monitoring: {str(e)}"
        )

@router.post("/connection-pool/monitoring/stop")
async def stop_connection_pool_monitoring(
    current_user: User = Depends(get_current_user)
):
    """Stop connection pool monitoring"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to stop connection pool monitoring"
        )
    
    try:
        await connection_monitor.stop_monitoring()
        return {"message": "Connection pool monitoring stopped"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop connection pool monitoring: {str(e)}"
        )

@router.post("/benchmarks/run")
async def run_performance_benchmarks(
    suite: str = "comprehensive",
    iterations: int = 3,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: User = Depends(get_current_user)
):
    """Run performance benchmarks"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to run performance benchmarks"
        )
    
    try:
        if suite == "comprehensive":
            # Run all benchmark suites
            background_tasks.add_task(
                benchmark_service.run_comprehensive_benchmark,
                iterations
            )
            return {"message": f"Comprehensive benchmark started with {iterations} iterations per suite"}
        elif suite in ["database", "caching", "api"]:
            # Run specific benchmark suite
            background_tasks.add_task(
                benchmark_service.run_benchmark_suite,
                suite,
                iterations
            )
            return {"message": f"{suite} benchmark started with {iterations} iterations"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid benchmark suite: {suite}. Must be one of: database, caching, api, comprehensive"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start benchmark: {str(e)}"
        )

@router.get("/benchmarks/results")
async def get_benchmark_results(
    hours: int = 24,
    current_user: User = Depends(get_current_user)
):
    """Get benchmark results"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view benchmark results"
        )
    
    try:
        history = await benchmark_service.get_benchmark_history(hours)
        summary = await benchmark_service.get_performance_summary()
        
        return {
            "history": history,
            "summary": summary
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get benchmark results: {str(e)}"
        )

@router.get("/background-jobs/status")
async def get_background_jobs_status(
    current_user: User = Depends(get_current_user)
):
    """Get background job service status"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view background job status"
        )
    
    try:
        stats = await job_service.get_job_statistics()
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get background job status: {str(e)}"
        )

@router.post("/background-jobs/start")
async def start_background_jobs(
    num_workers: int = 3,
    current_user: User = Depends(get_current_user)
):
    """Start background job workers"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to start background jobs"
        )
    
    try:
        await job_service.start_workers(num_workers)
        return {"message": f"Background job workers started with {num_workers} workers"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start background jobs: {str(e)}"
        )

@router.post("/background-jobs/stop")
async def stop_background_jobs(
    current_user: User = Depends(get_current_user)
):
    """Stop background job workers"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to stop background jobs"
        )
    
    try:
        await job_service.stop_workers()
        return {"message": "Background job workers stopped"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop background jobs: {str(e)}"
        )

@router.post("/background-jobs/submit")
async def submit_background_job(
    job_type: str,
    payload: Dict[str, Any],
    priority: str = "normal",
    max_retries: int = 3,
    timeout: int = 3600,
    current_user: User = Depends(get_current_user)
):
    """Submit a background job"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to submit background jobs"
        )
    
    try:
        from app.services.background_job_service import JobPriority
        
        priority_enum = JobPriority(priority.lower())
        
        job_id = await job_service.submit_job(
            job_type=job_type,
            payload=payload,
            priority=priority_enum,
            max_retries=max_retries,
            timeout=timeout
        )
        
        return {
            "message": "Background job submitted successfully",
            "job_id": job_id
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid priority: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit background job: {str(e)}"
        )

@router.get("/background-jobs/{job_id}")
async def get_background_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get status of a specific background job"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view job status"
        )
    
    try:
        status = await job_service.get_job_status(job_id)
        if not status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        return status
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get job status: {str(e)}"
        )

@router.post("/background-jobs/{job_id}/cancel")
async def cancel_background_job(
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    """Cancel a background job"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to cancel jobs"
        )
    
    try:
        success = await job_service.cancel_job(job_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Job cannot be cancelled (not pending or processing)"
            )
        return {"message": "Job cancelled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel job: {str(e)}"
        )
