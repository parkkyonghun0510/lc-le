"""
Query Optimization Service
Provides utilities for optimizing database queries and monitoring performance.
"""

import time
import logging
from typing import List, Dict, Any, Optional, Callable
from functools import wraps
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import text, func
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

class QueryOptimizationService:
    """Service for optimizing database queries and monitoring performance"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.query_stats = []
    
    def log_query_performance(self, query_name: str, execution_time: float, row_count: int = 0):
        """Log query performance metrics"""
        stats = {
            "query_name": query_name,
            "execution_time": execution_time,
            "row_count": row_count,
            "timestamp": time.time()
        }
        self.query_stats.append(stats)
        
        if execution_time > 1.0:  # Log slow queries
            logger.warning(f"Slow query detected: {query_name} took {execution_time:.2f}s")
        else:
            logger.debug(f"Query {query_name} completed in {execution_time:.2f}s")
    
    @asynccontextmanager
    async def timed_query(self, query_name: str):
        """Context manager for timing database queries"""
        start_time = time.time()
        try:
            yield
        finally:
            execution_time = time.time() - start_time
            self.log_query_performance(query_name, execution_time)
    
    def get_optimized_user_query(self, include_relationships: bool = True):
        """Get optimized user query with proper eager loading"""
        query = select(User)
        
        if include_relationships:
            # Use selectinload for one-to-many relationships to avoid N+1 queries
            query = query.options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position),
                # Use joinedload for one-to-one relationships when possible
                joinedload(User.portfolio).options(
                    selectinload(User.position),
                    selectinload(User.department),
                    selectinload(User.branch)
                ),
                joinedload(User.line_manager).options(
                    selectinload(User.position),
                    selectinload(User.department),
                    selectinload(User.branch)
                ),
                selectinload(User.status_changed_by_user)
            )
        
        return query
    
    def get_optimized_user_list_query(self, filters: Dict[str, Any] = None):
        """Get optimized user list query with proper indexing hints"""
        query = self.get_optimized_user_query(include_relationships=True)
        
        if filters:
            # Apply filters in order of selectivity (most selective first)
            if filters.get('user_id'):
                query = query.where(User.id == filters['user_id'])
            elif filters.get('username'):
                query = query.where(User.username == filters['username'])
            elif filters.get('email'):
                query = query.where(User.email == filters['email'])
            elif filters.get('employee_id'):
                query = query.where(User.employee_id == filters['employee_id'])
            
            # Apply other filters
            if filters.get('role'):
                query = query.where(User.role == filters['role'])
            if filters.get('status'):
                query = query.where(User.status == filters['status'])
            if filters.get('department_id'):
                query = query.where(User.department_id == filters['department_id'])
            if filters.get('branch_id'):
                query = query.where(User.branch_id == filters['branch_id'])
        
        return query
    
    async def get_query_explain_plan(self, query: str, params: Dict[str, Any] = None):
        """Get query execution plan for analysis"""
        try:
            explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}"
            result = await self.db.execute(text(explain_query), params or {})
            return result.fetchone()[0]
        except Exception as e:
            logger.error(f"Failed to get explain plan: {e}")
            return None
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get query performance statistics"""
        if not self.query_stats:
            return {"message": "No queries executed yet"}
        
        total_queries = len(self.query_stats)
        total_time = sum(stat['execution_time'] for stat in self.query_stats)
        avg_time = total_time / total_queries if total_queries > 0 else 0
        slow_queries = [stat for stat in self.query_stats if stat['execution_time'] > 1.0]
        
        return {
            "total_queries": total_queries,
            "total_execution_time": round(total_time, 3),
            "average_execution_time": round(avg_time, 3),
            "slow_queries_count": len(slow_queries),
            "slow_queries": slow_queries,
            "queries_per_second": round(total_queries / total_time, 2) if total_time > 0 else 0
        }
    
    def clear_stats(self):
        """Clear query performance statistics"""
        self.query_stats.clear()


def query_monitor(query_name: str = None):
    """Decorator for monitoring query performance"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract db session from args if available
            db = None
            for arg in args:
                if hasattr(arg, 'execute') and hasattr(arg, 'commit'):
                    db = arg
                    break
            
            if not db:
                # Try to get from kwargs
                db = kwargs.get('db')
            
            if db and hasattr(db, 'execute'):
                service = QueryOptimizationService(db)
                name = query_name or func.__name__
                
                async with service.timed_query(name):
                    return await func(*args, **kwargs)
            else:
                return await func(*args, **kwargs)
        
        return wrapper
    return decorator


class PaginationOptimizer:
    """Optimizer for pagination queries"""
    
    @staticmethod
    def get_cursor_based_pagination_query(
        base_query,
        cursor_field: str = "created_at",
        cursor_value: Any = None,
        limit: int = 20,
        direction: str = "next"  # "next" or "prev"
    ):
        """Get cursor-based pagination query for better performance on large datasets"""
        if cursor_value:
            if direction == "next":
                return base_query.where(
                    getattr(User, cursor_field) < cursor_value
                ).order_by(getattr(User, cursor_field).desc()).limit(limit)
            else:
                return base_query.where(
                    getattr(User, cursor_field) > cursor_value
                ).order_by(getattr(User, cursor_field).asc()).limit(limit)
        else:
            return base_query.order_by(getattr(User, cursor_field).desc()).limit(limit)
    
    @staticmethod
    def get_optimized_offset_pagination_query(
        base_query,
        page: int = 1,
        size: int = 20,
        sort_field: str = "created_at",
        sort_order: str = "desc"
    ):
        """Get optimized offset-based pagination query"""
        offset = (page - 1) * size
        
        # Use proper ordering for pagination
        if sort_order == "desc":
            query = base_query.order_by(getattr(User, sort_field).desc())
        else:
            query = base_query.order_by(getattr(User, sort_field).asc())
        
        return query.offset(offset).limit(size)


class IndexHintOptimizer:
    """Optimizer for providing database index hints"""
    
    @staticmethod
    def get_user_search_index_hints(search_term: str) -> List[str]:
        """Get recommended indexes for user search queries"""
        hints = []
        
        if search_term.isdigit() and len(search_term) == 4:
            # Employee ID search
            hints.append("ix_users_employee_id")
        elif "@" in search_term:
            # Email search
            hints.append("ix_users_email")
        elif len(search_term) < 20:
            # Username search
            hints.append("ix_users_username")
        else:
            # Full name search
            hints.append("ix_users_first_name_trgm")
            hints.append("ix_users_last_name_trgm")
            hints.append("ix_users_full_name_search")
        
        return hints
    
    @staticmethod
    def get_filter_index_hints(filters: Dict[str, Any]) -> List[str]:
        """Get recommended indexes for filter combinations"""
        hints = []
        
        if filters.get('status') and filters.get('created_at'):
            hints.append("ix_users_status_created_at")
        elif filters.get('status') and filters.get('last_login_at'):
            hints.append("ix_users_status_last_login_at")
        elif filters.get('role') and filters.get('status'):
            hints.append("ix_users_role_status")
        elif filters.get('department_id') and filters.get('status'):
            hints.append("ix_users_department_status")
        elif filters.get('branch_id') and filters.get('status'):
            hints.append("ix_users_branch_status")
        
        return hints


# Import User model for type hints
try:
    from app.models import User
except ImportError:
    # Fallback for when models aren't available
    User = None
