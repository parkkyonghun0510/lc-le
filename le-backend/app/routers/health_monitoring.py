"""
Health Monitoring Router

This router provides comprehensive system health monitoring endpoints
including health checks, metrics, alerts, and monitoring dashboard data.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.system_health_service import system_health_service, HealthStatus
from app.services.metrics_service import metrics_service
from app.services.alerting_service import alerting_service, AlertSeverity
from app.core.security import get_current_user
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/health/comprehensive")
async def comprehensive_health_check(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Perform comprehensive system health check including all components
    """
    try:
        # Perform health check
        health_result = await system_health_service.perform_comprehensive_health_check()
        
        # Prepare system data for alert evaluation
        system_data = {
            "database_status": next(
                (c.status.value for c in health_result.components if c.name == "database"),
                "unknown"
            ),
            "storage_status": next(
                (c.status.value for c in health_result.components if c.name == "storage"),
                "unknown"
            ),
            "total_inconsistencies": next(
                (c.details.get("total_issues", 0) for c in health_result.components if c.name == "data_consistency"),
                0
            ),
            "avg_response_time_ms": health_result.check_duration_ms,
            "memory_usage_mb": health_result.metrics.memory_usage_mb,
            "db_connections": health_result.metrics.database_connections,
            "component": "system_health"
        }
        
        # Add database connection details
        db_component = next((c for c in health_result.components if c.name == "database"), None)
        if db_component and db_component.details:
            pool_info = db_component.details.get("connection_pool", {})
            system_data.update({
                "checked_out": pool_info.get("checked_out", 0),
                "pool_size": pool_info.get("size", 10)
            })
        
        # Evaluate alerts in background
        background_tasks.add_task(alerting_service.evaluate_alerts, system_data)
        
        # Convert health result to dict for JSON response
        response_data = {
            "overall_status": health_result.overall_status.value,
            "timestamp": health_result.timestamp.isoformat(),
            "check_duration_ms": health_result.check_duration_ms,
            "components": [
                {
                    "name": c.name,
                    "status": c.status.value,
                    "message": c.message,
                    "details": c.details,
                    "response_time_ms": c.response_time_ms,
                    "last_check": c.last_check.isoformat() if c.last_check else None
                }
                for c in health_result.components
            ],
            "metrics": {
                "total_files": health_result.metrics.total_files,
                "total_folders": health_result.metrics.total_folders,
                "total_applications": health_result.metrics.total_applications,
                "total_users": health_result.metrics.total_users,
                "storage_usage_bytes": health_result.metrics.storage_usage_bytes,
                "database_connections": health_result.metrics.database_connections,
                "uptime_seconds": health_result.metrics.uptime_seconds,
                "memory_usage_mb": health_result.metrics.memory_usage_mb,
                "cpu_usage_percent": health_result.metrics.cpu_usage_percent
            },
            "alerts": health_result.alerts
        }
        
        return response_data
        
    except Exception as e:
        logger.error(f"Comprehensive health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "overall_status": "unhealthy",
                "error": "Health check failed",
                "message": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

@router.get("/health/quick")
async def quick_health_check() -> Dict[str, Any]:
    """
    Quick health check for load balancers and basic monitoring
    """
    try:
        # Get last comprehensive health check if available
        last_check = system_health_service.get_last_health_check()
        
        if last_check:
            # Use cached result if recent (within 5 minutes)
            age_minutes = (datetime.now(timezone.utc) - last_check.timestamp).total_seconds() / 60
            if age_minutes <= 5:
                return {
                    "status": last_check.overall_status.value,
                    "timestamp": last_check.timestamp.isoformat(),
                    "cached": True,
                    "age_minutes": round(age_minutes, 1)
                }
        
        # Perform minimal health check
        from app.core.database_health import check_database_health
        db_health = await check_database_health()
        
        status = "healthy" if db_health["status"] == "healthy" else "degraded"
        
        return {
            "status": status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "database": db_health["status"],
            "cached": False
        }
        
    except Exception as e:
        logger.error(f"Quick health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

@router.get("/health/history")
async def get_health_history(
    hours: int = Query(24, ge=1, le=168),  # 1 hour to 7 days
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get health check history for the specified number of hours
    """
    try:
        history = system_health_service.get_health_history(hours=hours)
        
        return {
            "history": [
                {
                    "timestamp": check.timestamp.isoformat(),
                    "overall_status": check.overall_status.value,
                    "check_duration_ms": check.check_duration_ms,
                    "component_count": len(check.components),
                    "alert_count": len(check.alerts),
                    "components": [
                        {
                            "name": c.name,
                            "status": c.status.value,
                            "response_time_ms": c.response_time_ms
                        }
                        for c in check.components
                    ]
                }
                for check in history
            ],
            "period_hours": hours,
            "total_checks": len(history)
        }
        
    except Exception as e:
        logger.error(f"Failed to get health history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics/dashboard")
async def get_dashboard_metrics(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get metrics formatted for dashboard display
    """
    try:
        dashboard_metrics = metrics_service.get_dashboard_metrics()
        performance_metrics = metrics_service.get_performance_metrics()
        
        return {
            "dashboard": dashboard_metrics,
            "performance": performance_metrics,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get dashboard metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics/operations")
async def get_operation_metrics(
    operation: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get metrics for specific operations or all operations
    """
    try:
        if operation:
            metrics = metrics_service.collector.get_operation_metrics(operation)
            if not metrics:
                raise HTTPException(status_code=404, detail=f"No metrics found for operation: {operation}")
            return {"operation": operation, "metrics": metrics.__dict__}
        else:
            all_metrics = metrics_service.collector.get_all_operation_metrics()
            return {
                "operations": [m.__dict__ for m in all_metrics],
                "total_operations": len(all_metrics)
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get operation metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/alerts/active")
async def get_active_alerts(
    severity: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get active alerts, optionally filtered by severity
    """
    try:
        severity_filter = None
        if severity:
            try:
                severity_filter = AlertSeverity(severity.lower())
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid severity: {severity}")
        
        active_alerts = alerting_service.get_active_alerts(severity=severity_filter)
        
        return {
            "alerts": [
                {
                    "id": alert.id,
                    "title": alert.title,
                    "message": alert.message,
                    "severity": alert.severity.value,
                    "component": alert.component,
                    "timestamp": alert.timestamp.isoformat(),
                    "acknowledgments": alert.acknowledgments,
                    "details": alert.details
                }
                for alert in active_alerts
            ],
            "total_active": len(active_alerts),
            "severity_filter": severity
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get active alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/alerts/history")
async def get_alert_history(
    hours: int = Query(24, ge=1, le=168),
    severity: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get alert history for the specified period
    """
    try:
        severity_filter = None
        if severity:
            try:
                severity_filter = AlertSeverity(severity.lower())
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid severity: {severity}")
        
        alert_history = alerting_service.get_alert_history(hours=hours, severity=severity_filter)
        alert_stats = alerting_service.get_alert_statistics(hours=hours)
        
        return {
            "alerts": [
                {
                    "id": alert.id,
                    "title": alert.title,
                    "message": alert.message,
                    "severity": alert.severity.value,
                    "component": alert.component,
                    "timestamp": alert.timestamp.isoformat(),
                    "resolved": alert.resolved,
                    "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
                    "resolved_by": alert.resolved_by
                }
                for alert in alert_history
            ],
            "statistics": alert_stats,
            "period_hours": hours,
            "severity_filter": severity
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get alert history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Acknowledge an active alert
    """
    try:
        success = alerting_service.acknowledge_alert(alert_id, current_user.username)
        
        if success:
            return {
                "message": f"Alert {alert_id} acknowledged",
                "acknowledged_by": current_user.username,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        else:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found or already resolved")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to acknowledge alert {alert_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Resolve an active alert
    """
    try:
        success = alerting_service.resolve_alert(alert_id, current_user.username)
        
        if success:
            return {
                "message": f"Alert {alert_id} resolved",
                "resolved_by": current_user.username,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        else:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resolve alert {alert_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/monitoring/dashboard")
async def get_monitoring_dashboard(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get comprehensive monitoring dashboard data
    """
    try:
        # Get latest health check
        health_result = system_health_service.get_last_health_check()
        
        # Get metrics
        dashboard_metrics = metrics_service.get_dashboard_metrics()
        performance_metrics = metrics_service.get_performance_metrics()
        
        # Get alerts
        active_alerts = alerting_service.get_active_alerts()
        alert_stats = alerting_service.get_alert_statistics(hours=24)
        
        # Prepare dashboard data
        dashboard_data = {
            "system_status": {
                "overall_status": health_result.overall_status.value if health_result else "unknown",
                "last_check": health_result.timestamp.isoformat() if health_result else None,
                "components": [
                    {
                        "name": c.name,
                        "status": c.status.value,
                        "message": c.message
                    }
                    for c in health_result.components
                ] if health_result else []
            },
            "metrics": {
                "operations": dashboard_metrics["overview"],
                "performance": {
                    "avg_response_time_ms": performance_metrics["average_response_time_ms"],
                    "slowest_operations": performance_metrics["slowest_operations"][:5]
                },
                "system": {
                    "uptime_seconds": health_result.metrics.uptime_seconds if health_result else 0,
                    "memory_usage_mb": health_result.metrics.memory_usage_mb if health_result else None,
                    "total_files": health_result.metrics.total_files if health_result else 0,
                    "total_applications": health_result.metrics.total_applications if health_result else 0
                }
            },
            "alerts": {
                "active_count": len(active_alerts),
                "critical_count": len([a for a in active_alerts if a.severity == AlertSeverity.CRITICAL]),
                "statistics": alert_stats,
                "recent_alerts": [
                    {
                        "title": alert.title,
                        "severity": alert.severity.value,
                        "timestamp": alert.timestamp.isoformat()
                    }
                    for alert in active_alerts[:5]
                ]
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        return dashboard_data
        
    except Exception as e:
        logger.error(f"Failed to get monitoring dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/monitoring/trigger-health-check")
async def trigger_health_check(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Manually trigger a comprehensive health check
    """
    try:
        # Trigger health check in background
        background_tasks.add_task(system_health_service.perform_comprehensive_health_check)
        
        return {
            "message": "Health check triggered",
            "triggered_by": current_user.username,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to trigger health check: {e}")
        raise HTTPException(status_code=500, detail=str(e))