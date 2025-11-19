"""
HTTP endpoints for notification management
Separated from WebSocket router to avoid route conflicts
"""

import json
import asyncio
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

from app.routers.auth import get_current_user
from app.models import User
from app.services.notification_pubsub_service import notification_pubsub
from app.services.notification_types import NotificationType, NotificationPriority

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications-http"])

# Pydantic models for request bodies
class SendNotificationRequest(BaseModel):
    user_id: str
    notification_type: str
    title: str
    message: str
    priority: str = NotificationPriority.NORMAL
    data: Optional[Dict[str, Any]] = None

class BroadcastNotificationRequest(BaseModel):
    pattern: str
    notification_type: str
    title: str
    message: str
    priority: str = NotificationPriority.NORMAL
    data: Optional[Dict[str, Any]] = None

@router.get("/stats")
async def get_notification_stats(
    current_user: User = Depends(get_current_user)
):
    """Get real-time notification statistics"""
    if current_user.role not in ["admin", "manager"]:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Not authorized to view notification stats"
    #     )
    
    stats = await notification_pubsub.get_subscription_stats()
    return {
        "websocket_connections": 0,  # This would need to be accessed from the WebSocket manager
        "user_connections": 0,  # This would need to be accessed from the WebSocket manager
        "pubsub_stats": stats,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.post("/send-realtime")
async def send_realtime_notification(
    request: SendNotificationRequest,
    current_user: User = Depends(get_current_user)
):
    """Send real-time notification to specific user"""
    if current_user.role not in ["admin", "manager"]:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Not authorized to send real-time notifications"
    #     )
    
    notification = {
        "id": str(uuid.uuid4()),
        "type": request.notification_type,
        "title": request.title,
        "message": request.message,
        "data": request.data or {},
        "priority": request.priority,
        "sender": {
            "id": str(current_user.id),
            "name": f"{current_user.first_name} {current_user.last_name}",
            "role": current_user.role
        }
    }
    
    # Send via Pub/Sub
    success = await notification_pubsub.publish_notification(request.user_id, notification, request.priority)
    
    if success:
        return {
            "success": True,
            "message": "Real-time notification sent",
            "notification_id": notification["id"]
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send real-time notification"
        )

@router.post("/broadcast")
async def broadcast_notification(
    request: BroadcastNotificationRequest,
    current_user: User = Depends(get_current_user)
):
    """Broadcast notification to pattern-based subscribers"""
    if current_user.role != "admin":
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Only admins can broadcast notifications"
    #     )
    
    notification = {
        "id": str(uuid.uuid4()),
        "type": request.notification_type,
        "title": request.title,
        "message": request.message,
        "data": request.data or {},
        "priority": request.priority,
        "sender": {
            "id": str(current_user.id),
            "name": f"{current_user.first_name} {current_user.last_name}",
            "role": current_user.role
        }
    }
    
    # Send via Pub/Sub pattern
    success = await notification_pubsub.publish_pattern_notification(request.pattern, notification, request.priority)
    
    if success:
        return {
            "success": True,
            "message": f"Notification broadcasted to pattern {request.pattern}",
            "notification_id": notification["id"]
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to broadcast notification"
        )
