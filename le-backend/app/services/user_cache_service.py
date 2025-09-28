"""
User Cache Service - Specialized caching for user management operations
Integrates with existing user management system for optimal performance.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.services.cache_service import cache_service, cache_user_list, cache_user_detail, cache_analytics
from app.models import User, Department, Branch, Position
from app.schemas import UserResponse, PaginatedResponse
import logging

logger = logging.getLogger(__name__)

class UserCacheService:
    """Specialized caching service for user management operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.cache = cache_service
    
    async def get_cached_user_list(
        self,
        role: Optional[str] = None,
        branch_id: Optional[str] = None,
        department_id: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        created_from: Optional[str] = None,
        created_to: Optional[str] = None,
        last_login_from: Optional[str] = None,
        last_login_to: Optional[str] = None,
        activity_level: Optional[str] = None,
        inactive_days: Optional[int] = None,
        search_fields: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        page: int = 1,
        size: int = 10,
    ) -> Optional[PaginatedResponse]:
        """Get cached user list or fetch from database"""
        
        # Generate cache key from query parameters
        query_params = {
            "role": role, "branch_id": branch_id, "department_id": department_id,
            "status": status, "search": search, "created_from": created_from,
            "created_to": created_to, "last_login_from": last_login_from,
            "last_login_to": last_login_to, "activity_level": activity_level,
            "inactive_days": inactive_days, "search_fields": search_fields,
            "sort_by": sort_by, "sort_order": sort_order, "page": page, "size": size
        }
        cache_key = f"user_list:{self.cache._generate_query_hash(**query_params)}"
        
        # Try to get from cache first
        cached_result = await self.cache.get(cache_key, "users")
        if cached_result:
            logger.info(f"Cache HIT for user list query: {cache_key}")
            return cached_result
        
        logger.info(f"Cache MISS for user list query: {cache_key}")
        return None
    
    async def set_cached_user_list(
        self,
        data: PaginatedResponse,
        role: Optional[str] = None,
        branch_id: Optional[str] = None,
        department_id: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        created_from: Optional[str] = None,
        created_to: Optional[str] = None,
        last_login_from: Optional[str] = None,
        last_login_to: Optional[str] = None,
        activity_level: Optional[str] = None,
        inactive_days: Optional[int] = None,
        search_fields: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        page: int = 1,
        size: int = 10,
        ttl: int = 180  # 3 minutes
    ) -> bool:
        """Cache user list results"""
        
        query_params = {
            "role": role, "branch_id": branch_id, "department_id": department_id,
            "status": status, "search": search, "created_from": created_from,
            "created_to": created_to, "last_login_from": last_login_from,
            "last_login_to": last_login_to, "activity_level": activity_level,
            "inactive_days": inactive_days, "search_fields": search_fields,
            "sort_by": sort_by, "sort_order": sort_order, "page": page, "size": size
        }
        cache_key = f"user_list:{self.cache._generate_query_hash(**query_params)}"
        
        return await self.cache.set(cache_key, data, ttl, "users")
    
    async def get_cached_user_detail(self, user_id: UUID) -> Optional[UserResponse]:
        """Get cached user details"""
        cache_key = f"user_detail:{user_id}"
        cached_result = await self.cache.get(cache_key, "users")
        
        if cached_result:
            logger.info(f"Cache HIT for user detail: {user_id}")
            return cached_result
        
        logger.info(f"Cache MISS for user detail: {user_id}")
        return None
    
    async def set_cached_user_detail(self, user_id: UUID, user_data: UserResponse, ttl: int = 600) -> bool:
        """Cache user details"""
        cache_key = f"user_detail:{user_id}"
        return await self.cache.set(cache_key, user_data, ttl, "users")
    
    async def invalidate_user_cache(self, user_id: Optional[UUID] = None):
        """Invalidate user-related cache entries"""
        if user_id:
            # Invalidate specific user cache
            await self.cache.delete(f"user_detail:{user_id}", "users")
            logger.info(f"Invalidated cache for user: {user_id}")
        
        # Invalidate all user list caches (since any user change affects lists)
        deleted_count = await self.cache.delete_pattern("user_list:*", "users")
        logger.info(f"Invalidated {deleted_count} user list cache entries")
        
        return deleted_count + (1 if user_id else 0)
    
    async def get_cached_departments(self) -> Optional[List[Dict[str, Any]]]:
        """Get cached departments list"""
        cached_result = await self.cache.get("departments:all", "reference")
        
        if cached_result:
            logger.info("Cache HIT for departments")
            return cached_result
        
        logger.info("Cache MISS for departments")
        return None
    
    async def set_cached_departments(self, departments: List[Dict[str, Any]], ttl: int = 1800) -> bool:
        """Cache departments list"""
        return await self.cache.set("departments:all", departments, ttl, "reference")
    
    async def get_cached_branches(self) -> Optional[List[Dict[str, Any]]]:
        """Get cached branches list"""
        cached_result = await self.cache.get("branches:all", "reference")
        
        if cached_result:
            logger.info("Cache HIT for branches")
            return cached_result
        
        logger.info("Cache MISS for branches")
        return None
    
    async def set_cached_branches(self, branches: List[Dict[str, Any]], ttl: int = 1800) -> bool:
        """Cache branches list"""
        return await self.cache.set("branches:all", branches, ttl, "reference")
    
    async def get_cached_positions(self) -> Optional[List[Dict[str, Any]]]:
        """Get cached positions list"""
        cached_result = await self.cache.get("positions:all", "reference")
        
        if cached_result:
            logger.info("Cache HIT for positions")
            return cached_result
        
        logger.info("Cache MISS for positions")
        return None
    
    async def set_cached_positions(self, positions: List[Dict[str, Any]], ttl: int = 1800) -> bool:
        """Cache positions list"""
        return await self.cache.set("positions:all", positions, ttl, "reference")
    
    async def get_cached_portfolios(self) -> Optional[List[Dict[str, Any]]]:
        """Get cached portfolios list"""
        cached_result = await self.cache.get("portfolios:all", "reference")
        
        if cached_result:
            logger.info("Cache HIT for portfolios")
            return cached_result
        
        logger.info("Cache MISS for portfolios")
        return None
    
    async def set_cached_portfolios(self, portfolios: List[Dict[str, Any]], ttl: int = 1800) -> bool:
        """Cache portfolios list"""
        return await self.cache.set("portfolios:all", portfolios, ttl, "reference")
    
    async def invalidate_reference_cache(self):
        """Invalidate all reference data cache"""
        patterns = ["departments:*", "branches:*", "positions:*", "portfolios:*"]
        total_deleted = 0
        
        for pattern in patterns:
            deleted = await self.cache.delete_pattern(pattern, "reference")
            total_deleted += deleted
        
        logger.info(f"Invalidated {total_deleted} reference cache entries")
        return total_deleted
    
    async def get_cached_user_analytics(
        self,
        days: int = 30,
        department_id: Optional[UUID] = None,
        branch_id: Optional[UUID] = None
    ) -> Optional[Dict[str, Any]]:
        """Get cached user analytics"""
        query_params = {
            "days": days, "department_id": department_id, "branch_id": branch_id
        }
        cache_key = f"user_analytics:{self.cache._generate_query_hash(**query_params)}"
        
        cached_result = await self.cache.get(cache_key, "analytics")
        
        if cached_result:
            logger.info(f"Cache HIT for user analytics: {cache_key}")
            return cached_result
        
        logger.info(f"Cache MISS for user analytics: {cache_key}")
        return None
    
    async def set_cached_user_analytics(
        self,
        analytics_data: Dict[str, Any],
        days: int = 30,
        department_id: Optional[UUID] = None,
        branch_id: Optional[UUID] = None,
        ttl: int = 300  # 5 minutes
    ) -> bool:
        """Cache user analytics data"""
        query_params = {
            "days": days, "department_id": department_id, "branch_id": branch_id
        }
        cache_key = f"user_analytics:{self.cache._generate_query_hash(**query_params)}"
        
        return await self.cache.set(cache_key, analytics_data, ttl, "analytics")
    
    async def invalidate_analytics_cache(self):
        """Invalidate analytics cache"""
        deleted_count = await self.cache.delete_pattern("*", "analytics")
        logger.info(f"Invalidated {deleted_count} analytics cache entries")
        return deleted_count
    
    async def get_cache_performance_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics"""
        stats = await self.cache.get_cache_stats()
        
        # Add user-specific cache statistics
        user_cache_keys = await self.cache.redis.keys(f"{self.cache.cache_prefix}:users:*") if self.cache.redis else []
        reference_cache_keys = await self.cache.redis.keys(f"{self.cache.cache_prefix}:reference:*") if self.cache.redis else []
        analytics_cache_keys = await self.cache.redis.keys(f"{self.cache.cache_prefix}:analytics:*") if self.cache.redis else []
        
        stats.update({
            "user_cache_entries": len(user_cache_keys),
            "reference_cache_entries": len(reference_cache_keys),
            "analytics_cache_entries": len(analytics_cache_keys),
        })
        
        return stats


# Cache decorators for user operations
def cache_user_operations(ttl: int = 180):
    """Decorator for caching user list operations"""
    return cache_user_list(ttl)

def cache_user_details(ttl: int = 600):
    """Decorator for caching user detail operations"""
    return cache_user_detail(ttl)

def cache_user_analytics(ttl: int = 300):
    """Decorator for caching user analytics operations"""
    return cache_analytics(ttl)
