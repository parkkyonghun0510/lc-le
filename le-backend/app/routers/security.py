"""
Security Monitoring API Endpoints
Provides endpoints for security monitoring, rate limiting, and threat detection.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user
from app.services.rate_limiting_service import rate_limiting_service
from app.services.security_monitoring_service import (
    security_monitoring_service,
    SecurityEventType,
    ThreatLevel
)

router = APIRouter(prefix="/security", tags=["security"])

@router.get("/status")
async def get_security_status(
    current_user: User = Depends(get_current_user)
):
    """Get overall security status"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view security status"
        )
    
    try:
        # Get security statistics
        security_stats = await security_monitoring_service.get_security_statistics()
        
        # Get rate limiting statistics
        rate_limit_stats = await rate_limiting_service.get_rate_limit_statistics()
        
        return {
            "status": "monitoring_active",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "security_statistics": security_stats,
            "rate_limiting_statistics": rate_limit_stats
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get security status: {str(e)}"
        )

@router.get("/events")
async def get_security_events(
    hours: int = 24,
    threat_level: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    """Get security events"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view security events"
        )
    
    try:
        # Convert string parameters to enums
        threat_level_enum = ThreatLevel(threat_level) if threat_level else None
        event_type_enum = SecurityEventType(event_type) if event_type else None
        
        events = await security_monitoring_service.get_security_events(
            hours=hours,
            threat_level=threat_level_enum,
            event_type=event_type_enum,
            limit=limit
        )
        
        return {
            "events": events,
            "total_count": len(events),
            "filters": {
                "hours": hours,
                "threat_level": threat_level,
                "event_type": event_type,
                "limit": limit
            }
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid parameter: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get security events: {str(e)}"
        )

@router.get("/alerts")
async def get_security_alerts(
    hours: int = 24,
    threat_level: Optional[str] = None,
    resolved: Optional[bool] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """Get security alerts"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view security alerts"
        )
    
    try:
        # Convert string parameter to enum
        threat_level_enum = ThreatLevel(threat_level) if threat_level else None
        
        alerts = await security_monitoring_service.get_security_alerts(
            hours=hours,
            threat_level=threat_level_enum,
            resolved=resolved,
            limit=limit
        )
        
        return {
            "alerts": alerts,
            "total_count": len(alerts),
            "filters": {
                "hours": hours,
                "threat_level": threat_level,
                "resolved": resolved,
                "limit": limit
            }
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid parameter: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get security alerts: {str(e)}"
        )

@router.post("/alerts/{alert_id}/resolve")
async def resolve_security_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user)
):
    """Resolve a security alert"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to resolve security alerts"
        )
    
    try:
        success = await security_monitoring_service.resolve_alert(
            alert_id=alert_id,
            resolved_by=current_user.username
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        return {"message": "Alert resolved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resolve alert: {str(e)}"
        )

@router.post("/ip/block")
async def block_ip_address(
    ip_address: str,
    duration_hours: int = 24,
    current_user: User = Depends(get_current_user)
):
    """Block an IP address"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to block IP addresses"
        )
    
    try:
        success = await security_monitoring_service.block_ip(
            ip_address=ip_address,
            duration_hours=duration_hours
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid IP address or failed to block"
            )
        
        return {
            "message": f"IP address {ip_address} blocked for {duration_hours} hours"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to block IP address: {str(e)}"
        )

@router.post("/ip/unblock")
async def unblock_ip_address(
    ip_address: str,
    current_user: User = Depends(get_current_user)
):
    """Unblock an IP address"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to unblock IP addresses"
        )
    
    try:
        success = await security_monitoring_service.unblock_ip(ip_address=ip_address)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to unblock IP address"
            )
        
        return {"message": f"IP address {ip_address} unblocked"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unblock IP address: {str(e)}"
        )

@router.get("/rate-limits/status")
async def get_rate_limit_status(
    identifier: str,
    rule_name: str,
    current_user: User = Depends(get_current_user)
):
    """Get rate limit status for an identifier"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view rate limit status"
        )
    
    try:
        status = await rate_limiting_service.get_rate_limit_status(
            identifier=identifier,
            rule_name=rule_name
        )
        
        return status
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get rate limit status: {str(e)}"
        )

@router.get("/rate-limits/violations")
async def get_rate_limit_violations(
    hours: int = 24,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    """Get rate limit violations"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view rate limit violations"
        )
    
    try:
        violations = await rate_limiting_service.get_violations(
            hours=hours,
            limit=limit
        )
        
        return {
            "violations": violations,
            "total_count": len(violations),
            "filters": {
                "hours": hours,
                "limit": limit
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get rate limit violations: {str(e)}"
        )

@router.post("/rate-limits/block")
async def block_identifier(
    identifier: str,
    rule_name: str,
    duration_seconds: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """Block an identifier for rate limiting"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to block identifiers"
        )
    
    try:
        success = await rate_limiting_service.block_identifier(
            identifier=identifier,
            rule_name=rule_name,
            duration_seconds=duration_seconds
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to block identifier"
            )
        
        return {
            "message": f"Identifier {identifier} blocked for rule {rule_name}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to block identifier: {str(e)}"
        )

@router.post("/rate-limits/unblock")
async def unblock_identifier(
    identifier: str,
    rule_name: str,
    current_user: User = Depends(get_current_user)
):
    """Unblock an identifier"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to unblock identifiers"
        )
    
    try:
        success = await rate_limiting_service.unblock_identifier(
            identifier=identifier,
            rule_name=rule_name
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to unblock identifier"
            )
        
        return {
            "message": f"Identifier {identifier} unblocked for rule {rule_name}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unblock identifier: {str(e)}"
        )

@router.get("/rate-limits/rules")
async def get_rate_limit_rules(
    current_user: User = Depends(get_current_user)
):
    """Get rate limiting rules"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view rate limiting rules"
        )
    
    try:
        stats = await rate_limiting_service.get_rate_limit_statistics()
        return {
            "rules": stats.get("rules", {}),
            "total_rules": stats.get("total_rules", 0),
            "active_rules": stats.get("active_rules", 0)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get rate limiting rules: {str(e)}"
        )

# Middleware for automatic security monitoring
# Note: This should be added to the main FastAPI app, not to the router
async def security_monitoring_middleware(request: Request, call_next):
    """Middleware to automatically monitor security events"""
    start_time = datetime.now(timezone.utc)
    
    # Get client IP
    client_ip = request.client.host
    if "x-forwarded-for" in request.headers:
        client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
    
    # Check if IP is blocked
    is_blocked = await security_monitoring_service.is_ip_blocked(client_ip)
    if is_blocked:
        await security_monitoring_service.log_security_event(
            event_type=SecurityEventType.UNAUTHORIZED_ACCESS,
            description=f"Blocked IP attempted access: {client_ip}",
            threat_level=ThreatLevel.HIGH,
            ip_address=client_ip,
            endpoint=request.url.path
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: IP address is blocked"
        )
    
    # Process request
    response = await call_next(request)
    
    # Log security events based on response
    if response.status_code >= 400:
        threat_level = ThreatLevel.HIGH if response.status_code >= 500 else ThreatLevel.MEDIUM
        
        await security_monitoring_service.log_security_event(
            event_type=SecurityEventType.UNAUTHORIZED_ACCESS,
            description=f"HTTP {response.status_code} error",
            threat_level=threat_level,
            ip_address=client_ip,
            endpoint=request.url.path,
            response_status=response.status_code
        )
    
    return response
