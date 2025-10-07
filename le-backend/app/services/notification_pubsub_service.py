"""
DragonflyDB Pub/Sub Service for Real-time Notifications
Provides scalable, low-latency notification delivery using DragonflyDB's Pub/Sub capabilities.
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Set, Any, Callable
from datetime import datetime, timezone, timedelta
from uuid import UUID
import redis.asyncio as redis
from app.database import get_async_redis
from app.core.config import settings
from app.models import User, Notification
from app.services.notification_types import NotificationType, NotificationPriority

logger = logging.getLogger(__name__)

class NotificationPubSubService:
    """
    High-performance notification service using DragonflyDB Pub/Sub
    with pattern-based routing and offline user support.
    """
    
    def __init__(self):
        self.redis = None
        self.pubsub = None  # For subscribing
        self.redis_publisher = None  # For publishing
        self.subscribers: Dict[str, Set[str]] = {}  # user_id -> set of connection_ids
        self.connection_subscriptions: Dict[str, Set[str]] = {}  # connection_id -> set of patterns
        self.offline_notifications: Dict[str, List[Dict]] = {}  # user_id -> list of notifications
        self.heartbeat_interval = 30  # seconds
        self.offline_ttl = 3600  # 1 hour for offline notifications
        self.subscribed_channels: Set[str] = set()  # Track subscribed channels
        
    async def initialize(self):
        """Initialize the Pub/Sub service"""
        try:
            self.redis = await get_async_redis()
            if not self.redis:
                logger.warning("Redis/DragonflyDB not available, Pub/Sub disabled")
                return False
            
            # Create separate connections for pub/sub and publishing
            self.redis_publisher = await get_async_redis()  # For publishing
            self.pubsub = self.redis.pubsub()  # For subscribing
            
            # Test connection
            await self.redis.ping()
            logger.info("DragonflyDB Pub/Sub service initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize DragonflyDB Pub/Sub: {e}")
            return False
    
    def _get_notification_channel(self, user_id: str) -> str:
        """Get user-specific notification channel"""
        return f"notifications:user:{user_id}"
    
    def _get_pattern_channel(self, pattern: str) -> str:
        """Get pattern-based notification channel"""
        return f"notifications:{pattern}"
    
    def _get_offline_key(self, user_id: str) -> str:
        """Get offline notification storage key"""
        return f"offline_notifications:{user_id}"
    
    async def subscribe_user(self, user_id: str, connection_id: str) -> bool:
        """Subscribe a user to their notification channel"""
        if not self.pubsub:
            return False
        
        try:
            # Add to subscribers tracking
            if user_id not in self.subscribers:
                self.subscribers[user_id] = set()
            self.subscribers[user_id].add(connection_id)
            
            # Add to connection tracking
            if connection_id not in self.connection_subscriptions:
                self.connection_subscriptions[connection_id] = set()
            self.connection_subscriptions[connection_id].add(f"user:{user_id}")
            
            # Subscribe to user channel only if not already subscribed
            channel = self._get_notification_channel(user_id)
            if channel not in self.subscribed_channels:
                await self.pubsub.subscribe(channel)
                self.subscribed_channels.add(channel)
            
            # Send any pending offline notifications
            await self._deliver_offline_notifications(user_id, connection_id)
            
            logger.info(f"User {user_id} subscribed via connection {connection_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to subscribe user {user_id}: {e}")
            return False
    
    async def unsubscribe_user(self, user_id: str, connection_id: str) -> bool:
        """Unsubscribe a user from their notification channel"""
        if not self.pubsub:
            return False
        
        try:
            # Remove from subscribers tracking
            if user_id in self.subscribers:
                self.subscribers[user_id].discard(connection_id)
                if not self.subscribers[user_id]:
                    del self.subscribers[user_id]
                    # Only unsubscribe from channel if no more subscribers
                    channel = self._get_notification_channel(user_id)
                    if channel in self.subscribed_channels:
                        await self.pubsub.unsubscribe(channel)
                        self.subscribed_channels.remove(channel)
            
            # Remove from connection tracking
            if connection_id in self.connection_subscriptions:
                self.connection_subscriptions[connection_id].discard(f"user:{user_id}")
                if not self.connection_subscriptions[connection_id]:
                    del self.connection_subscriptions[connection_id]
            
            logger.info(f"User {user_id} unsubscribed via connection {connection_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to unsubscribe user {user_id}: {e}")
            return False
    
    async def subscribe_pattern(self, pattern: str, connection_id: str) -> bool:
        """Subscribe to pattern-based notifications (e.g., notifications:department:*)"""
        if not self.pubsub:
            return False
        
        try:
            # Add to connection tracking
            if connection_id not in self.connection_subscriptions:
                self.connection_subscriptions[connection_id] = set()
            self.connection_subscriptions[connection_id].add(pattern)
            
            # Subscribe to pattern channel
            channel = self._get_pattern_channel(pattern)
            if channel not in self.subscribed_channels:
                await self.pubsub.psubscribe(channel)
                self.subscribed_channels.add(channel)
            
            logger.info(f"Connection {connection_id} subscribed to pattern {pattern}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to subscribe to pattern {pattern}: {e}")
            return False
    
    async def publish_notification(
        self,
        user_id: str,
        notification: Dict[str, Any],
        priority: str = NotificationPriority.NORMAL
    ) -> bool:
        """Publish notification to user's channel"""
        if not self.redis_publisher:
            return False
        
        try:
            # Add metadata
            notification_data = {
                **notification,
                "user_id": user_id,
                "priority": priority,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "channel": "user"
            }
            
            # Publish to user channel
            channel = self._get_notification_channel(user_id)
            await self.redis_publisher.publish(channel, json.dumps(notification_data))
            
            # If user is offline, store notification
            if user_id not in self.subscribers or not self.subscribers[user_id]:
                await self._store_offline_notification(user_id, notification_data)
            
            logger.info(f"Published notification to user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish notification to user {user_id}: {e}")
            return False
    
    async def publish_pattern_notification(
        self,
        pattern: str,
        notification: Dict[str, Any],
        priority: str = NotificationPriority.NORMAL
    ) -> bool:
        """Publish notification to pattern-based channel"""
        if not self.redis_publisher:
            return False
        
        try:
            # Add metadata
            notification_data = {
                **notification,
                "pattern": pattern,
                "priority": priority,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "channel": "pattern"
            }
            
            # Publish to pattern channel
            channel = self._get_pattern_channel(pattern)
            await self.redis_publisher.publish(channel, json.dumps(notification_data))
            
            logger.info(f"Published notification to pattern {pattern}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish notification to pattern {pattern}: {e}")
            return False
    
    async def _store_offline_notification(self, user_id: str, notification: Dict[str, Any]) -> None:
        """Store notification for offline user"""
        try:
            offline_key = self._get_offline_key(user_id)
            
            # Add to list with TTL
            await self.redis_publisher.lpush(offline_key, json.dumps(notification))
            await self.redis_publisher.expire(offline_key, self.offline_ttl)
            
            logger.debug(f"Stored offline notification for user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to store offline notification for user {user_id}: {e}")
    
    async def _deliver_offline_notifications(self, user_id: str, connection_id: str) -> None:
        """Deliver stored notifications to newly connected user"""
        try:
            offline_key = self._get_offline_key(user_id)
            
            # Get all offline notifications
            notifications = await self.redis_publisher.lrange(offline_key, 0, -1)
            
            if notifications:
                # Send each notification
                for notification_json in notifications:
                    notification = json.loads(notification_json)
                    # Send via WebSocket or other delivery method
                    await self._deliver_to_connection(connection_id, notification)
                
                # Clear offline notifications
                await self.redis_publisher.delete(offline_key)
                
                logger.info(f"Delivered {len(notifications)} offline notifications to user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to deliver offline notifications for user {user_id}: {e}")
    
    async def _deliver_to_connection(self, connection_id: str, notification: Dict[str, Any]) -> None:
        """Deliver notification to specific connection via WebSocket manager"""
        try:
            from app.routers.websocket import manager

            if connection_id in manager.active_connections:
                websocket = manager.active_connections[connection_id]
                await websocket.send_text(json.dumps({
                    "type": "notification",
                    "id": notification.get("id", str(uuid.uuid4())),
                    "title": notification.get("title", ""),
                    "message": notification.get("message", ""),
                    "priority": notification.get("priority", "normal"),
                    "timestamp": notification.get("timestamp", datetime.now(timezone.utc).isoformat()),
                    "data": notification.get("data", {}),
                    "sender": notification.get("sender")
                }))
                logger.debug(f"Delivered offline notification to connection {connection_id}")
            else:
                logger.warning(f"Connection {connection_id} not found for offline notification delivery")

        except Exception as e:
            logger.error(f"Failed to deliver offline notification to connection {connection_id}: {e}")
    
    async def get_subscription_stats(self) -> Dict[str, Any]:
        """Get subscription statistics"""
        return {
            "active_subscribers": len(self.subscribers),
            "total_connections": len(self.connection_subscriptions),
            "subscribers_by_user": {user_id: len(connections) for user_id, connections in self.subscribers.items()},
            "redis_available": self.redis is not None
        }
    
    async def cleanup_connection(self, connection_id: str) -> None:
        """Clean up when connection is closed"""
        try:
            if connection_id in self.connection_subscriptions:
                subscriptions = self.connection_subscriptions[connection_id]
                
                # Unsubscribe from all patterns
                for pattern in subscriptions:
                    if pattern.startswith("user:"):
                        user_id = pattern.split(":", 1)[1]
                        await self.unsubscribe_user(user_id, connection_id)
                    else:
                        channel = self._get_pattern_channel(pattern)
                        if channel in self.subscribed_channels and self.pubsub:
                            await self.pubsub.punsubscribe(channel)
                            self.subscribed_channels.remove(channel)
                
                del self.connection_subscriptions[connection_id]
                
            logger.info(f"Cleaned up connection {connection_id}")
            
        except Exception as e:
            logger.error(f"Failed to cleanup connection {connection_id}: {e}")

# Global service instance
notification_pubsub = NotificationPubSubService()
