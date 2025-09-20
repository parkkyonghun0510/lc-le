"""
Cache Invalidation Service

This service handles automatic cache invalidation on data changes to ensure
data consistency between frontend and backend.
"""

from typing import Dict, List, Optional, Set, Any
from uuid import UUID
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
import asyncio
import json
from app.core.logging import get_logger

logger = get_logger(__name__)


class CacheScope(Enum):
    """Cache scope enumeration for different data types"""
    FILES = "files"
    FOLDERS = "folders"
    APPLICATIONS = "applications"
    CUSTOMERS = "customers"
    USERS = "users"
    DASHBOARD = "dashboard"
    SETTINGS = "settings"


class InvalidationReason(Enum):
    """Reasons for cache invalidation"""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    MOVE = "move"
    BULK_OPERATION = "bulk_operation"
    MANUAL_REFRESH = "manual_refresh"


@dataclass
class CacheInvalidationEvent:
    """Represents a cache invalidation event"""
    scope: CacheScope
    reason: InvalidationReason
    entity_id: Optional[str] = None
    related_ids: Set[str] = field(default_factory=set)
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for serialization"""
        return {
            "scope": self.scope.value,
            "reason": self.reason.value,
            "entity_id": self.entity_id,
            "related_ids": list(self.related_ids),
            "metadata": self.metadata,
            "timestamp": self.timestamp.isoformat()
        }


class CacheInvalidationService:
    """Service for managing cache invalidation across the system"""
    
    def __init__(self):
        self._subscribers: Dict[CacheScope, List[callable]] = {}
        self._invalidation_history: List[CacheInvalidationEvent] = []
        self._max_history_size = 1000
    
    def subscribe(self, scope: CacheScope, callback: callable) -> None:
        """Subscribe to cache invalidation events for a specific scope"""
        if scope not in self._subscribers:
            self._subscribers[scope] = []
        self._subscribers[scope].append(callback)
        logger.debug(f"Subscribed callback to {scope.value} invalidation events")
    
    def unsubscribe(self, scope: CacheScope, callback: callable) -> None:
        """Unsubscribe from cache invalidation events"""
        if scope in self._subscribers and callback in self._subscribers[scope]:
            self._subscribers[scope].remove(callback)
            logger.debug(f"Unsubscribed callback from {scope.value} invalidation events")
    
    async def invalidate(self, event: CacheInvalidationEvent) -> None:
        """Trigger cache invalidation for the given event"""
        logger.info(f"Cache invalidation triggered: {event.scope.value} - {event.reason.value}")
        
        # Add to history
        self._add_to_history(event)
        
        # Notify subscribers
        if event.scope in self._subscribers:
            tasks = []
            for callback in self._subscribers[event.scope]:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        tasks.append(callback(event))
                    else:
                        callback(event)
                except Exception as e:
                    logger.error(f"Error in cache invalidation callback: {e}")
            
            # Wait for async callbacks
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
    
    async def invalidate_file_operations(
        self, 
        file_id: Optional[str] = None,
        folder_id: Optional[str] = None,
        application_id: Optional[str] = None,
        reason: InvalidationReason = InvalidationReason.UPDATE
    ) -> None:
        """Invalidate caches related to file operations"""
        related_ids = set()
        
        if folder_id:
            related_ids.add(f"folder:{folder_id}")
        if application_id:
            related_ids.add(f"application:{application_id}")
        
        # Invalidate file cache
        await self.invalidate(CacheInvalidationEvent(
            scope=CacheScope.FILES,
            reason=reason,
            entity_id=file_id,
            related_ids=related_ids,
            metadata={
                "folder_id": folder_id,
                "application_id": application_id
            }
        ))
        
        # Also invalidate folder cache if folder is involved
        if folder_id:
            await self.invalidate(CacheInvalidationEvent(
                scope=CacheScope.FOLDERS,
                reason=reason,
                entity_id=folder_id,
                related_ids={f"application:{application_id}"} if application_id else set(),
                metadata={
                    "file_id": file_id,
                    "application_id": application_id
                }
            ))
    
    async def invalidate_folder_operations(
        self,
        folder_id: Optional[str] = None,
        parent_id: Optional[str] = None,
        application_id: Optional[str] = None,
        reason: InvalidationReason = InvalidationReason.UPDATE
    ) -> None:
        """Invalidate caches related to folder operations"""
        related_ids = set()
        
        if parent_id:
            related_ids.add(f"folder:{parent_id}")
        if application_id:
            related_ids.add(f"application:{application_id}")
        
        await self.invalidate(CacheInvalidationEvent(
            scope=CacheScope.FOLDERS,
            reason=reason,
            entity_id=folder_id,
            related_ids=related_ids,
            metadata={
                "parent_id": parent_id,
                "application_id": application_id
            }
        ))
        
        # Also invalidate files cache for the application
        if application_id:
            await self.invalidate(CacheInvalidationEvent(
                scope=CacheScope.FILES,
                reason=reason,
                related_ids={f"application:{application_id}"},
                metadata={
                    "folder_id": folder_id,
                    "application_id": application_id
                }
            ))
    
    async def invalidate_application_data(
        self,
        application_id: str,
        reason: InvalidationReason = InvalidationReason.UPDATE
    ) -> None:
        """Invalidate all caches related to an application"""
        related_ids = {f"application:{application_id}"}
        
        # Invalidate multiple scopes
        for scope in [CacheScope.FILES, CacheScope.FOLDERS, CacheScope.APPLICATIONS]:
            await self.invalidate(CacheInvalidationEvent(
                scope=scope,
                reason=reason,
                related_ids=related_ids,
                metadata={"application_id": application_id}
            ))
    
    async def manual_refresh_request(
        self,
        scope: CacheScope,
        entity_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> None:
        """Handle manual refresh requests from users"""
        await self.invalidate(CacheInvalidationEvent(
            scope=scope,
            reason=InvalidationReason.MANUAL_REFRESH,
            entity_id=entity_id,
            metadata={
                "user_id": user_id,
                "manual_refresh": True
            }
        ))
    
    def get_invalidation_history(
        self,
        scope: Optional[CacheScope] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get recent cache invalidation history"""
        history = self._invalidation_history
        
        if scope:
            history = [event for event in history if event.scope == scope]
        
        # Return most recent events first
        return [event.to_dict() for event in history[-limit:]][::-1]
    
    def _add_to_history(self, event: CacheInvalidationEvent) -> None:
        """Add event to invalidation history"""
        self._invalidation_history.append(event)
        
        # Trim history if it gets too large
        if len(self._invalidation_history) > self._max_history_size:
            self._invalidation_history = self._invalidation_history[-self._max_history_size//2:]


# Global cache invalidation service instance
cache_invalidation_service = CacheInvalidationService()


# Convenience functions for common invalidation patterns
async def invalidate_file_cache(
    file_id: Optional[str] = None,
    folder_id: Optional[str] = None,
    application_id: Optional[str] = None,
    reason: InvalidationReason = InvalidationReason.UPDATE
) -> None:
    """Convenience function to invalidate file-related caches"""
    await cache_invalidation_service.invalidate_file_operations(
        file_id=file_id,
        folder_id=folder_id,
        application_id=application_id,
        reason=reason
    )


async def invalidate_folder_cache(
    folder_id: Optional[str] = None,
    parent_id: Optional[str] = None,
    application_id: Optional[str] = None,
    reason: InvalidationReason = InvalidationReason.UPDATE
) -> None:
    """Convenience function to invalidate folder-related caches"""
    await cache_invalidation_service.invalidate_folder_operations(
        folder_id=folder_id,
        parent_id=parent_id,
        application_id=application_id,
        reason=reason
    )


async def invalidate_application_cache(
    application_id: str,
    reason: InvalidationReason = InvalidationReason.UPDATE
) -> None:
    """Convenience function to invalidate application-related caches"""
    await cache_invalidation_service.invalidate_application_data(
        application_id=application_id,
        reason=reason
    )