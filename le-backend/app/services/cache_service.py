"""
Redis Cache Service for User Management System
Provides intelligent caching for frequently accessed data with automatic invalidation.
"""

import json
import hashlib
from typing import Any, Optional, Dict, List, Union
from datetime import datetime, timedelta, timezone
import asyncio
import logging
from functools import wraps

from app.database import get_redis
from app.core.config import settings

logger = logging.getLogger(__name__)

class CacheService:
    """High-performance Redis caching service with intelligent invalidation"""
    
    def __init__(self):
        self.redis = get_redis()
        self.default_ttl = 300  # 5 minutes
        self.cache_prefix = "lc_workflow"
        
    def _get_cache_key(self, key: str, namespace: str = "default") -> str:
        """Generate standardized cache key"""
        return f"{self.cache_prefix}:{namespace}:{key}"
    
    def _serialize_data(self, data: Any) -> str:
        """Serialize data for caching with timestamp"""
        # Handle Pydantic models by converting to dict
        if hasattr(data, 'model_dump'):
            # Pydantic v2
            serialized_data = data.model_dump()
        elif hasattr(data, 'dict'):
            # Pydantic v1
            serialized_data = data.dict()
        else:
            serialized_data = data

        cache_data = {
            "data": serialized_data,
            "cached_at": datetime.now(timezone.utc).isoformat(),
            "version": "1.0"
        }
        return json.dumps(cache_data, default=str)
    
    def _deserialize_data(self, cached_data: str) -> Dict[str, Any]:
        """Deserialize cached data"""
        try:
            return json.loads(cached_data)
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"Failed to deserialize cache data: {e}")
            return {"data": None, "cached_at": None, "version": None}
    
    def _generate_query_hash(self, **kwargs) -> str:
        """Generate consistent hash for query parameters"""
        # Sort kwargs to ensure consistent hashing
        sorted_kwargs = sorted(kwargs.items())
        query_string = "&".join([f"{k}={v}" for k, v in sorted_kwargs if v is not None])
        return hashlib.md5(query_string.encode()).hexdigest()
    
    async def get(self, key: str, namespace: str = "default") -> Optional[Any]:
        """Get cached data"""
        if not self.redis:
            return None

        try:
            cache_key = self._get_cache_key(key, namespace)
            cached_data = self.redis.get(cache_key)

            if cached_data:
                deserialized = self._deserialize_data(cached_data)
                logger.debug(f"Cache HIT for key: {cache_key}")
                return deserialized.get("data")
            else:
                logger.debug(f"Cache MISS for key: {cache_key}")
                return None

        except Exception as e:
            logger.error(f"Redis GET error for key {key}: {e}")
            return None
    
    async def set(self, key: str, data: Any, ttl: int = None, namespace: str = "default") -> bool:
        """Set cached data with TTL"""
        if not self.redis:
            return False

        try:
            cache_key = self._get_cache_key(key, namespace)
            serialized_data = self._serialize_data(data)
            ttl = ttl or self.default_ttl

            self.redis.setex(cache_key, ttl, serialized_data)
            logger.debug(f"Cache SET for key: {cache_key} (TTL: {ttl}s)")
            return True

        except Exception as e:
            logger.error(f"Redis SET error for key {key}: {e}")
            return False
    
    async def delete(self, key: str, namespace: str = "default") -> bool:
        """Delete cached data"""
        if not self.redis:
            return False

        try:
            cache_key = self._get_cache_key(key, namespace)
            result = self.redis.delete(cache_key)
            logger.debug(f"Cache DELETE for key: {cache_key}")
            return bool(result)

        except Exception as e:
            logger.error(f"Redis DELETE error for key {key}: {e}")
            return False
    
    async def delete_pattern(self, pattern: str, namespace: str = "default") -> int:
        """Delete all keys matching pattern"""
        if not self.redis:
            return 0

        try:
            cache_pattern = self._get_cache_key(pattern, namespace)
            keys = self.redis.keys(cache_pattern)

            if keys:
                deleted_count = self.redis.delete(*keys)
                logger.debug(f"Cache DELETE PATTERN: {len(keys)} keys deleted for pattern: {cache_pattern}")
                return deleted_count
            return 0

        except Exception as e:
            logger.error(f"Redis DELETE PATTERN error for pattern {pattern}: {e}")
            return 0
    
    async def exists(self, key: str, namespace: str = "default") -> bool:
        """Check if key exists in cache"""
        if not self.redis:
            return False

        try:
            cache_key = self._get_cache_key(key, namespace)
            return bool(self.redis.exists(cache_key))
        except Exception as e:
            logger.error(f"Redis EXISTS error for key {key}: {e}")
            return False
    
    async def get_or_set(self, key: str, fetch_func, ttl: int = None, namespace: str = "default") -> Any:
        """Get from cache or fetch and cache data"""
        # Try to get from cache first
        cached_data = await self.get(key, namespace)
        if cached_data is not None:
            return cached_data
        
        # Fetch data if not in cache
        try:
            data = await fetch_func()
            await self.set(key, data, ttl, namespace)
            return data
        except Exception as e:
            logger.error(f"Error in get_or_set for key {key}: {e}")
            raise
    
    async def invalidate_user_cache(self, user_id: str = None):
        """Invalidate user-related cache entries"""
        patterns_to_clear = [
            "user_list:*",  # All user list queries
            "user_detail:*",  # Individual user details
            "user_analytics:*",  # User analytics data
            "user_search:*",  # User search results
        ]
        
        if user_id:
            patterns_to_clear.extend([
                f"user_detail:{user_id}",
                f"user_activity:{user_id}",
                f"user_permissions:{user_id}",
            ])
        
        total_deleted = 0
        for pattern in patterns_to_clear:
            deleted = await self.delete_pattern(pattern, "users")
            total_deleted += deleted
        
        logger.info(f"Invalidated {total_deleted} user cache entries")
        return total_deleted
    
    async def invalidate_analytics_cache(self):
        """Invalidate analytics-related cache entries"""
        patterns_to_clear = [
            "analytics:*",  # All analytics data
            "dashboard:*",  # Dashboard data
            "metrics:*",  # Performance metrics
        ]
        
        total_deleted = 0
        for pattern in patterns_to_clear:
            deleted = await self.delete_pattern(pattern, "analytics")
            total_deleted += deleted
        
        logger.info(f"Invalidated {total_deleted} analytics cache entries")
        return total_deleted
    
    async def invalidate_reference_cache(self):
        """Invalidate reference data cache (departments, branches, positions)"""
        patterns_to_clear = [
            "departments:*",
            "branches:*", 
            "positions:*",
            "portfolios:*",
        ]
        
        total_deleted = 0
        for pattern in patterns_to_clear:
            deleted = await self.delete_pattern(pattern, "reference")
            total_deleted += deleted
        
        logger.info(f"Invalidated {total_deleted} reference cache entries")
        return total_deleted
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.redis:
            return {"redis_available": False}

        try:
            info = self.redis.info()
            keyspace_info = info.get("keyspace", {})

            return {
                "redis_available": True,
                "total_keys": info.get("db0", {}).get("keys", 0),
                "memory_usage": info.get("used_memory_human"),
                "hit_rate": info.get("keyspace_hits", 0) / max(info.get("keyspace_hits", 0) + info.get("keyspace_misses", 0), 1),
                "uptime": info.get("uptime_in_seconds"),
                "connected_clients": info.get("connected_clients"),
            }
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"redis_available": False, "error": str(e)}


# Global cache service instance
cache_service = CacheService()


def cache_result(ttl: int = 300, namespace: str = "default", key_func=None):
    """
    Decorator for caching function results
    
    Args:
        ttl: Time to live in seconds
        namespace: Cache namespace
        key_func: Function to generate cache key from function arguments
    """
    def decorator(func):
        @wraps(func)
        async def cache_wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                # Default key generation from function name and arguments
                key_data = {
                    "func": func.__name__,
                    "args": str(args),
                    "kwargs": str(sorted(kwargs.items()))
                }
                cache_key = cache_service._generate_query_hash(**key_data)
            
            # Try to get from cache
            cached_result = await cache_service.get(cache_key, namespace)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache_service.set(cache_key, result, ttl, namespace)
            return result
        
        return cache_wrapper
    return decorator


# Specialized cache decorators for common patterns
def cache_user_list(ttl: int = 180):  # 3 minutes for user lists
    """Cache user list queries"""
    return cache_result(ttl=ttl, namespace="users", key_func=lambda **kwargs: f"user_list:{cache_service._generate_query_hash(**kwargs)}")

def cache_user_detail(ttl: int = 600):  # 10 minutes for user details
    """Cache individual user details"""
    return cache_result(ttl=ttl, namespace="users", key_func=lambda user_id, **kwargs: f"user_detail:{user_id}")

def cache_analytics(ttl: int = 300):  # 5 minutes for analytics
    """Cache analytics data"""
    return cache_result(ttl=ttl, namespace="analytics", key_func=lambda **kwargs: f"analytics:{cache_service._generate_query_hash(**kwargs)}")

def cache_reference_data(ttl: int = 1800):  # 30 minutes for reference data
    """Cache reference data (departments, branches, positions)"""
    return cache_result(ttl=ttl, namespace="reference", key_func=lambda data_type, **kwargs: f"{data_type}:{cache_service._generate_query_hash(**kwargs)}")
