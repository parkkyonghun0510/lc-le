"""
Real-time Update Service

This service provides real-time updates for file and folder operations using
Server-Sent Events (SSE) to push updates to connected clients.
"""

from typing import Dict, List, Optional, Set, Any, AsyncGenerator
from uuid import UUID, uuid4
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
import asyncio
import json
from fastapi import Request
from fastapi.responses import StreamingResponse
from app.core.logging import get_logger
from app.services.cache_invalidation_service import (
    CacheInvalidationEvent, 
    CacheScope, 
    InvalidationReason,
    cache_invalidation_service
)

logger = get_logger(__name__)


class UpdateType(Enum):
    """Types of real-time updates"""
    FILE_UPLOADED = "file_uploaded"
    FILE_DELETED = "file_deleted"
    FILE_MOVED = "file_moved"
    FOLDER_CREATED = "folder_created"
    FOLDER_DELETED = "folder_deleted"
    FOLDER_UPDATED = "folder_updated"
    APPLICATION_UPDATED = "application_updated"
    CACHE_INVALIDATED = "cache_invalidated"
    SYNC_REQUIRED = "sync_required"


@dataclass
class RealtimeUpdate:
    """Represents a real-time update event"""
    update_type: UpdateType
    entity_id: Optional[str] = None
    entity_type: Optional[str] = None
    data: Dict[str, Any] = field(default_factory=dict)
    affected_scopes: Set[CacheScope] = field(default_factory=set)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    user_id: Optional[str] = None
    
    def to_sse_data(self) -> str:
        """Convert update to Server-Sent Events format"""
        return json.dumps({
            "type": self.update_type.value,
            "entity_id": self.entity_id,
            "entity_type": self.entity_type,
            "data": self.data,
            "affected_scopes": [scope.value for scope in self.affected_scopes],
            "timestamp": self.timestamp.isoformat(),
            "user_id": self.user_id
        })


@dataclass
class ClientConnection:
    """Represents a connected SSE client"""
    connection_id: str
    user_id: Optional[str]
    subscribed_scopes: Set[CacheScope]
    application_filters: Set[str] = field(default_factory=set)
    queue: asyncio.Queue = field(default_factory=lambda: asyncio.Queue(maxsize=100))
    connected_at: datetime = field(default_factory=datetime.utcnow)
    last_ping: datetime = field(default_factory=datetime.utcnow)


class RealtimeUpdateService:
    """Service for managing real-time updates via Server-Sent Events"""
    
    def __init__(self):
        self._connections: Dict[str, ClientConnection] = {}
        self._update_history: List[RealtimeUpdate] = []
        self._max_history_size = 500
        
        # Subscribe to cache invalidation events
        for scope in CacheScope:
            cache_invalidation_service.subscribe(scope, self._handle_cache_invalidation)
    
    async def create_connection(
        self,
        user_id: Optional[str] = None,
        subscribed_scopes: Optional[List[str]] = None,
        application_filters: Optional[List[str]] = None
    ) -> str:
        """Create a new SSE connection"""
        connection_id = str(uuid4())
        
        # Parse subscribed scopes
        scopes = set()
        if subscribed_scopes:
            for scope_str in subscribed_scopes:
                try:
                    scopes.add(CacheScope(scope_str))
                except ValueError:
                    logger.warning(f"Invalid cache scope: {scope_str}")
        else:
            # Default to all scopes
            scopes = set(CacheScope)
        
        # Parse application filters
        app_filters = set(application_filters or [])
        
        connection = ClientConnection(
            connection_id=connection_id,
            user_id=user_id,
            subscribed_scopes=scopes,
            application_filters=app_filters
        )
        
        self._connections[connection_id] = connection
        
        logger.info(f"Created SSE connection {connection_id} for user {user_id}")
        return connection_id
    
    async def remove_connection(self, connection_id: str) -> None:
        """Remove an SSE connection"""
        if connection_id in self._connections:
            del self._connections[connection_id]
            logger.info(f"Removed SSE connection {connection_id}")
    
    async def send_update(self, update: RealtimeUpdate) -> None:
        """Send a real-time update to relevant connections"""
        logger.debug(f"Broadcasting update: {update.update_type.value}")
        
        # Add to history
        self._add_to_history(update)
        
        # Send to relevant connections
        disconnected_connections = []
        
        for connection_id, connection in self._connections.items():
            try:
                # Check if connection is interested in this update
                if self._should_send_to_connection(connection, update):
                    await connection.queue.put(update)
            except asyncio.QueueFull:
                logger.warning(f"Queue full for connection {connection_id}, dropping update")
            except Exception as e:
                logger.error(f"Error sending update to connection {connection_id}: {e}")
                disconnected_connections.append(connection_id)
        
        # Clean up disconnected connections
        for connection_id in disconnected_connections:
            await self.remove_connection(connection_id)
    
    async def send_file_update(
        self,
        update_type: UpdateType,
        file_id: str,
        file_data: Dict[str, Any],
        folder_id: Optional[str] = None,
        application_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> None:
        """Send a file-related update"""
        affected_scopes = {CacheScope.FILES}
        
        if folder_id:
            affected_scopes.add(CacheScope.FOLDERS)
        if application_id:
            affected_scopes.add(CacheScope.APPLICATIONS)
        
        update = RealtimeUpdate(
            update_type=update_type,
            entity_id=file_id,
            entity_type="file",
            data={
                **file_data,
                "folder_id": folder_id,
                "application_id": application_id
            },
            affected_scopes=affected_scopes,
            user_id=user_id
        )
        
        await self.send_update(update)
    
    async def send_folder_update(
        self,
        update_type: UpdateType,
        folder_id: str,
        folder_data: Dict[str, Any],
        parent_id: Optional[str] = None,
        application_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> None:
        """Send a folder-related update"""
        affected_scopes = {CacheScope.FOLDERS, CacheScope.FILES}
        
        if application_id:
            affected_scopes.add(CacheScope.APPLICATIONS)
        
        update = RealtimeUpdate(
            update_type=update_type,
            entity_id=folder_id,
            entity_type="folder",
            data={
                **folder_data,
                "parent_id": parent_id,
                "application_id": application_id
            },
            affected_scopes=affected_scopes,
            user_id=user_id
        )
        
        await self.send_update(update)
    
    async def send_sync_required(
        self,
        scope: CacheScope,
        reason: str,
        entity_id: Optional[str] = None,
        application_id: Optional[str] = None
    ) -> None:
        """Send a sync required notification"""
        update = RealtimeUpdate(
            update_type=UpdateType.SYNC_REQUIRED,
            entity_id=entity_id,
            entity_type=scope.value,
            data={
                "reason": reason,
                "application_id": application_id,
                "requires_full_refresh": True
            },
            affected_scopes={scope}
        )
        
        await self.send_update(update)
    
    async def get_connection_stream(self, connection_id: str) -> AsyncGenerator[str, None]:
        """Get the SSE stream for a connection"""
        if connection_id not in self._connections:
            return
        
        connection = self._connections[connection_id]
        
        try:
            # Send initial connection confirmation
            yield f"data: {json.dumps({'type': 'connected', 'connection_id': connection_id})}\n\n"
            
            while connection_id in self._connections:
                try:
                    # Wait for update with timeout for periodic ping
                    update = await asyncio.wait_for(connection.queue.get(), timeout=30.0)
                    
                    # Send the update
                    yield f"data: {update.to_sse_data()}\n\n"
                    
                except asyncio.TimeoutError:
                    # Send periodic ping to keep connection alive
                    connection.last_ping = datetime.utcnow()
                    yield f"data: {json.dumps({'type': 'ping', 'timestamp': connection.last_ping.isoformat()})}\n\n"
                
                except Exception as e:
                    logger.error(f"Error in SSE stream for connection {connection_id}: {e}")
                    break
        
        finally:
            await self.remove_connection(connection_id)
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get statistics about active connections"""
        total_connections = len(self._connections)
        connections_by_scope = {}
        connections_by_user = {}
        
        for connection in self._connections.values():
            # Count by scope
            for scope in connection.subscribed_scopes:
                scope_name = scope.value
                connections_by_scope[scope_name] = connections_by_scope.get(scope_name, 0) + 1
            
            # Count by user
            user_id = connection.user_id or "anonymous"
            connections_by_user[user_id] = connections_by_user.get(user_id, 0) + 1
        
        return {
            "total_connections": total_connections,
            "connections_by_scope": connections_by_scope,
            "connections_by_user": connections_by_user,
            "update_history_size": len(self._update_history)
        }
    
    def get_update_history(
        self,
        scope: Optional[CacheScope] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get recent update history"""
        history = self._update_history
        
        if scope:
            history = [update for update in history if scope in update.affected_scopes]
        
        # Return most recent updates first
        recent_updates = history[-limit:][::-1]
        
        return [
            {
                "type": update.update_type.value,
                "entity_id": update.entity_id,
                "entity_type": update.entity_type,
                "data": update.data,
                "affected_scopes": [scope.value for scope in update.affected_scopes],
                "timestamp": update.timestamp.isoformat(),
                "user_id": update.user_id
            }
            for update in recent_updates
        ]
    
    async def _handle_cache_invalidation(self, event: CacheInvalidationEvent) -> None:
        """Handle cache invalidation events by sending real-time updates"""
        update = RealtimeUpdate(
            update_type=UpdateType.CACHE_INVALIDATED,
            entity_id=event.entity_id,
            entity_type=event.scope.value,
            data={
                "reason": event.reason.value,
                "related_ids": list(event.related_ids),
                "metadata": event.metadata
            },
            affected_scopes={event.scope}
        )
        
        await self.send_update(update)
    
    def _should_send_to_connection(
        self, 
        connection: ClientConnection, 
        update: RealtimeUpdate
    ) -> bool:
        """Determine if an update should be sent to a specific connection"""
        # Check if connection is subscribed to any affected scopes
        if not any(scope in connection.subscribed_scopes for scope in update.affected_scopes):
            return False
        
        # Check application filters
        if connection.application_filters:
            application_id = update.data.get("application_id")
            if application_id and application_id not in connection.application_filters:
                return False
        
        return True
    
    def _add_to_history(self, update: RealtimeUpdate) -> None:
        """Add update to history"""
        self._update_history.append(update)
        
        # Trim history if it gets too large
        if len(self._update_history) > self._max_history_size:
            self._update_history = self._update_history[-self._max_history_size//2:]


# Global real-time update service instance
realtime_update_service = RealtimeUpdateService()


# Convenience functions for common update patterns
async def notify_file_uploaded(
    file_id: str,
    file_data: Dict[str, Any],
    folder_id: Optional[str] = None,
    application_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> None:
    """Notify about file upload"""
    await realtime_update_service.send_file_update(
        UpdateType.FILE_UPLOADED,
        file_id=file_id,
        file_data=file_data,
        folder_id=folder_id,
        application_id=application_id,
        user_id=user_id
    )


async def notify_file_deleted(
    file_id: str,
    folder_id: Optional[str] = None,
    application_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> None:
    """Notify about file deletion"""
    await realtime_update_service.send_file_update(
        UpdateType.FILE_DELETED,
        file_id=file_id,
        file_data={"deleted": True},
        folder_id=folder_id,
        application_id=application_id,
        user_id=user_id
    )


async def notify_folder_created(
    folder_id: str,
    folder_data: Dict[str, Any],
    parent_id: Optional[str] = None,
    application_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> None:
    """Notify about folder creation"""
    await realtime_update_service.send_folder_update(
        UpdateType.FOLDER_CREATED,
        folder_id=folder_id,
        folder_data=folder_data,
        parent_id=parent_id,
        application_id=application_id,
        user_id=user_id
    )


async def notify_sync_required(
    scope: CacheScope,
    reason: str,
    entity_id: Optional[str] = None,
    application_id: Optional[str] = None
) -> None:
    """Notify that synchronization is required"""
    await realtime_update_service.send_sync_required(
        scope=scope,
        reason=reason,
        entity_id=entity_id,
        application_id=application_id
    )