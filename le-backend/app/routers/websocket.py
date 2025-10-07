"""
WebSocket endpoints for real-time notifications using DragonflyDB Pub/Sub
"""

import json
import asyncio
import logging
from typing import Dict, Any, Optional, Set
from fastapi import WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi import APIRouter
from datetime import datetime, timezone
import uuid

from app.routers.auth import get_current_user_websocket, get_current_user
from app.models import User
from app.services.notification_pubsub_service import notification_pubsub
from app.services.notification_types import NotificationType, NotificationPriority

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

class ConnectionManager:
    """Manages WebSocket connections and DragonflyDB subscriptions"""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, set] = {}  # user_id -> set of connection_ids
        self.heartbeat_tasks: Dict[str, asyncio.Task] = {}
        self.redis_available = True  # Track Redis availability
        self.pubsub_listener_task: Optional[asyncio.Task] = None
        self.pubsub = None
        self.connection_subscriptions: Dict[str, Set[str]] = {}  # connection_id -> set of patterns
    
    async def connect(self, websocket: WebSocket, user: User, accept_connection: bool = True) -> str:
        """Accept WebSocket connection and initialize subscription"""
        if accept_connection:
            await websocket.accept()
        
        # Generate unique connection ID
        connection_id = str(uuid.uuid4())
        self.active_connections[connection_id] = websocket
        self.user_connections[user.id] = self.user_connections.get(user.id, set())
        self.user_connections[user.id].add(connection_id)
        
        # Subscribe to user notifications (with fallback if Redis is not available)
        try:
            await notification_pubsub.subscribe_user(user.id, connection_id)
        except Exception as e:
            logger.warning(f"Failed to subscribe user to notifications (Redis may be unavailable): {e}")
            self.redis_available = False
            # Continue without Redis - WebSocket will still work for basic functionality
        
        # Start heartbeat
        self.heartbeat_tasks[connection_id] = asyncio.create_task(
            self._heartbeat(connection_id, websocket)
        )
        
        logger.info(f"User {user.id} connected via WebSocket {connection_id}")

        # Start Redis pubsub listener if Redis is available and not already running
        if self.redis_available and notification_pubsub.redis and not self.pubsub_listener_task:
            self.pubsub_listener_task = asyncio.create_task(self._listen_for_notifications())

        return connection_id
    
    async def disconnect(self, connection_id: str):
        """Handle WebSocket disconnection"""
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            
            # Cancel heartbeat
            if connection_id in self.heartbeat_tasks:
                self.heartbeat_tasks[connection_id].cancel()
                del self.heartbeat_tasks[connection_id]
            
            # Find user and unsubscribe
            for user_id, connections in self.user_connections.items():
                if connection_id in connections:
                    connections.discard(connection_id)
                    if not connections:
                        del self.user_connections[user_id]
                    try:
                        await notification_pubsub.unsubscribe_user(user_id, connection_id)
                    except Exception as e:
                        logger.warning(f"Failed to unsubscribe user from notifications (Redis may be unavailable): {e}")
                    break
            
            # Clean up connection
            del self.active_connections[connection_id]

            # Clean up pattern subscriptions
            if connection_id in self.connection_subscriptions:
                del self.connection_subscriptions[connection_id]

            try:
                await notification_pubsub.cleanup_connection(connection_id)
            except Exception as e:
                logger.warning(f"Failed to cleanup connection (Redis may be unavailable): {e}")

            logger.info(f"WebSocket {connection_id} disconnected")
    
    async def send_notification(self, connection_id: str, notification: Dict[str, Any]):
        """Send notification to specific connection"""
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            try:
                await websocket.send_text(json.dumps(notification))
            except Exception as e:
                logger.error(f"Failed to send notification to {connection_id}: {e}")
                await self.disconnect(connection_id)
    
    async def send_to_user(self, user_id: str, notification: Dict[str, Any]):
        """Send notification to all connections of a user"""
        if user_id in self.user_connections:
            for connection_id in self.user_connections[user_id]:
                await self.send_notification(connection_id, notification)
    
    async def send_notification_to_all(self, notification: Dict[str, Any]):
        """Send notification to all connected users (fallback when Redis is unavailable)"""
        for connection_id in self.active_connections:
            await self.send_notification(connection_id, notification)
    
    async def _heartbeat(self, connection_id: str, websocket: WebSocket):
        """Send periodic heartbeat to keep connection alive"""
        try:
            while True:
                await asyncio.sleep(30)  # 30 second heartbeat
                await websocket.send_text(json.dumps({
                    "type": "heartbeat",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }))
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Heartbeat error for {connection_id}: {e}")
            await self.disconnect(connection_id)

    async def _listen_for_notifications(self):
        """Background task to listen for Redis pubsub messages and forward to WebSocket clients"""
        try:
            # Use the notification pubsub service's Redis connection
            if not notification_pubsub.redis:
                logger.warning("Redis not available for pubsub listening - notifications will be database-only")
                return

            # Create a separate pubsub connection for listening
            pubsub = notification_pubsub.redis.pubsub()

            # Subscribe to all pattern channels that have active subscribers
            subscribed_channels = set()

            while True:
                # Check for new channels to subscribe to
                for connection_id, patterns in self.connection_subscriptions.items():
                    for pattern in patterns:
                        if pattern.startswith('user:'):
                            # User-specific channel
                            user_id = pattern.split(':', 1)[1]
                            channel = f"notifications:user:{user_id}"
                        else:
                            # Pattern-based channel
                            channel = f"notifications:{pattern}"

                        if channel not in subscribed_channels:
                            await pubsub.subscribe(channel)
                            subscribed_channels.add(channel)
                            logger.info(f"Subscribed to Redis channel: {channel}")

                # Listen for messages
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)

                if message and message['type'] == 'message':
                    try:
                        # Parse notification data
                        notification_data = json.loads(message['data'])

                        # Determine target connections
                        channel = message['channel'].decode('utf-8')

                        if channel.startswith('notifications:user:'):
                            # User-specific notification
                            user_id = channel.split(':', 2)[2]
                            target_connections = self.user_connections.get(user_id, set())
                        elif channel.startswith('notifications:'):
                            # Pattern-based notification - need to determine which connections are subscribed
                            pattern = channel.split(':', 1)[1]
                            target_connections = set()

                            for conn_id, patterns in self.connection_subscriptions.items():
                                if pattern in patterns:
                                    target_connections.add(conn_id)
                        else:
                            continue

                        # Send to all target connections
                        for connection_id in target_connections:
                            if connection_id in self.active_connections:
                                websocket = self.active_connections[connection_id]
                                try:
                                    await websocket.send_text(json.dumps({
                                        "type": "notification",
                                        "id": notification_data.get("id", str(uuid.uuid4())),
                                        "title": notification_data.get("title", ""),
                                        "message": notification_data.get("message", ""),
                                        "priority": notification_data.get("priority", "normal"),
                                        "timestamp": notification_data.get("timestamp", datetime.now(timezone.utc).isoformat()),
                                        "data": notification_data.get("data", {}),
                                        "sender": notification_data.get("sender")
                                    }))
                                    logger.debug(f"Forwarded notification to connection {connection_id}")
                                except Exception as e:
                                    logger.error(f"Failed to send notification to {connection_id}: {e}")
                                    await self.disconnect(connection_id)

                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse notification message: {e}")
                    except Exception as e:
                        logger.error(f"Error processing notification: {e}")

                await asyncio.sleep(0.1)  # Small delay to prevent busy waiting

        except asyncio.CancelledError:
            logger.info("Redis pubsub listener cancelled")
        except Exception as e:
            logger.error(f"Error in Redis pubsub listener: {e}")
        finally:
            if pubsub:
                await pubsub.close()

# Global connection manager
manager = ConnectionManager()

@router.websocket("/realtime")
async def websocket_notifications(websocket: WebSocket):
    """
    WebSocket endpoint for real-time notifications
    """
    # Accept connection first, then authenticate
    await websocket.accept()
    
    try:
        # Manually authenticate the WebSocket connection
        user = await get_current_user_websocket(websocket)
    except Exception as e:
        logger.error(f"WebSocket authentication failed: {e}")
        await websocket.close(code=4001, reason="Authentication failed")
        return
    
    connection_id = await manager.connect(websocket, user, accept_connection=False)
    
    try:
        while True:
            # Listen for client messages (ping, subscription changes, etc.)
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({
                    "type": "pong",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }))
            
            elif message.get("type") == "subscribe_pattern":
                pattern = message.get("pattern")
                if pattern:
                    try:
                        # Track subscription in connection manager
                        if connection_id not in manager.connection_subscriptions:
                            manager.connection_subscriptions[connection_id] = set()
                        manager.connection_subscriptions[connection_id].add(pattern)

                        # Only subscribe to Redis pattern if Redis is available
                        if notification_pubsub.redis:
                            await notification_pubsub.subscribe_pattern(pattern, connection_id)

                        await websocket.send_text(json.dumps({
                            "type": "subscribed",
                            "pattern": pattern,
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }))
                    except Exception as e:
                        logger.warning(f"Failed to subscribe to pattern (Redis may be unavailable): {e}")
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Failed to subscribe to pattern - notification service unavailable",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }))
            
            elif message.get("type") == "unsubscribe_pattern":
                pattern = message.get("pattern")
                if pattern:
                    try:
                        # Remove from connection tracking
                        if connection_id in manager.connection_subscriptions:
                            manager.connection_subscriptions[connection_id].discard(pattern)

                        # Implementation for unsubscribing from patterns
                        await websocket.send_text(json.dumps({
                            "type": "unsubscribed",
                            "pattern": pattern,
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }))
                    except Exception as e:
                        logger.warning(f"Failed to unsubscribe from pattern {pattern}: {e}")
    
    except WebSocketDisconnect:
        await manager.disconnect(connection_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await manager.disconnect(connection_id)

# HTTP endpoints moved to separate router to avoid conflicts with WebSocket endpoints
