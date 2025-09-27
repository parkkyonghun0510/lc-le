"""
Optimized User Queries
Pre-optimized query patterns for common user management operations.
"""

from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_, desc, asc, text
from sqlalchemy.orm import selectinload, joinedload
from datetime import datetime, timezone, timedelta
from uuid import UUID

from app.models import User, Department, Branch, Position
from app.services.query_optimization_service import QueryOptimizationService, query_monitor


class OptimizedUserQueries:
    """Optimized query patterns for user management operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.optimizer = QueryOptimizationService(db)
    
    @query_monitor("optimized_user_list")
    async def get_users_optimized(
        self,
        role: Optional[str] = None,
        branch_id: Optional[UUID] = None,
        department_id: Optional[UUID] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        created_from: Optional[datetime] = None,
        created_to: Optional[datetime] = None,
        last_login_from: Optional[datetime] = None,
        last_login_to: Optional[datetime] = None,
        activity_level: Optional[str] = None,
        inactive_days: Optional[int] = None,
        search_fields: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        page: int = 1,
        size: int = 10
    ) -> Tuple[List[User], int]:
        """
        Optimized user list query with proper eager loading and indexing
        Returns (users, total_count) tuple
        """
        
        # Build base query with optimized eager loading
        query = (
            select(User)
            .options(
                # Use selectinload for one-to-many relationships
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position),
                # Use joinedload for one-to-one relationships to avoid extra queries
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
        )
        
        # Apply filters in order of selectivity (most selective first)
        filters_applied = []
        
        # High selectivity filters first
        if role:
            query = query.where(User.role == role)
            filters_applied.append(f"role={role}")
        
        if status:
            query = query.where(User.status == status)
            filters_applied.append(f"status={status}")
        
        if department_id:
            query = query.where(User.department_id == department_id)
            filters_applied.append(f"department_id={department_id}")
        
        if branch_id:
            query = query.where(User.branch_id == branch_id)
            filters_applied.append(f"branch_id={branch_id}")
        
        # Search filters
        if search:
            search_term = f"%{search}%"
            if search_fields:
                # Search in specific fields
                search_conditions = []
                fields = [field.strip() for field in search_fields.split(',')]
                
                if 'username' in fields:
                    search_conditions.append(User.username.ilike(search_term))
                if 'email' in fields:
                    search_conditions.append(User.email.ilike(search_term))
                if 'name' in fields:
                    search_conditions.extend([
                        User.first_name.ilike(search_term),
                        User.last_name.ilike(search_term)
                    ])
                if 'employee_id' in fields:
                    search_conditions.append(User.employee_id.ilike(search_term))
                
                if search_conditions:
                    query = query.where(or_(*search_conditions))
                    filters_applied.append(f"search={search}")
            else:
                # Default search in all fields
                query = query.where(
                    (User.username.ilike(search_term)) |
                    (User.email.ilike(search_term)) |
                    (User.first_name.ilike(search_term)) |
                    (User.last_name.ilike(search_term)) |
                    (User.employee_id.ilike(search_term) if User.employee_id.is_not(None) else False)
                )
                filters_applied.append(f"search={search}")
        
        # Date range filters
        if created_from:
            query = query.where(User.created_at >= created_from)
            filters_applied.append(f"created_from={created_from}")
        
        if created_to:
            end_date = datetime.combine(created_to, datetime.max.time())
            query = query.where(User.created_at <= end_date)
            filters_applied.append(f"created_to={created_to}")
        
        if last_login_from:
            query = query.where(User.last_login_at >= last_login_from)
            filters_applied.append(f"last_login_from={last_login_from}")
        
        if last_login_to:
            end_date = datetime.combine(last_login_to, datetime.max.time())
            query = query.where(User.last_login_at <= end_date)
            filters_applied.append(f"last_login_to={last_login_to}")
        
        # Activity level filtering with optimized queries
        if activity_level:
            now = datetime.now(timezone.utc)
            
            if activity_level == 'never_logged_in':
                query = query.where(User.last_login_at.is_(None))
                filters_applied.append("activity_level=never_logged_in")
            elif activity_level == 'dormant':
                # Users who haven't logged in for 90+ days
                dormant_threshold = now - timedelta(days=90)
                query = query.where(
                    and_(
                        User.status == 'active',
                        or_(
                            User.last_login_at < dormant_threshold,
                            User.last_login_at.is_(None)
                        )
                    )
                )
                filters_applied.append("activity_level=dormant")
            elif activity_level == 'active':
                # Users who logged in within last 30 days
                active_threshold = now - timedelta(days=30)
                query = query.where(
                    and_(
                        User.status == 'active',
                        User.last_login_at >= active_threshold
                    )
                )
                filters_applied.append("activity_level=active")
        
        # Custom inactive days filtering
        if inactive_days is not None:
            threshold_date = datetime.now(timezone.utc) - timedelta(days=inactive_days)
            query = query.where(
                or_(
                    User.last_login_at < threshold_date,
                    User.last_login_at.is_(None)
                )
            )
            filters_applied.append(f"inactive_days={inactive_days}")
        
        # Get total count with same filters (optimized)
        count_query = select(func.count()).select_from(User)
        
        # Apply same filters to count query
        if role:
            count_query = count_query.where(User.role == role)
        if status:
            count_query = count_query.where(User.status == status)
        if department_id:
            count_query = count_query.where(User.department_id == department_id)
        if branch_id:
            count_query = count_query.where(User.branch_id == branch_id)
        
        if search:
            search_term = f"%{search}%"
            if search_fields:
                search_conditions = []
                fields = [field.strip() for field in search_fields.split(',')]
                
                if 'username' in fields:
                    search_conditions.append(User.username.ilike(search_term))
                if 'email' in fields:
                    search_conditions.append(User.email.ilike(search_term))
                if 'name' in fields:
                    search_conditions.extend([
                        User.first_name.ilike(search_term),
                        User.last_name.ilike(search_term)
                    ])
                if 'employee_id' in fields:
                    search_conditions.append(User.employee_id.ilike(search_term))
                
                if search_conditions:
                    count_query = count_query.where(or_(*search_conditions))
            else:
                count_query = count_query.where(
                    (User.username.ilike(search_term)) |
                    (User.email.ilike(search_term)) |
                    (User.first_name.ilike(search_term)) |
                    (User.last_name.ilike(search_term)) |
                    (User.employee_id.ilike(search_term) if User.employee_id.is_not(None) else False)
                )
        
        # Apply date filters to count query
        if created_from:
            count_query = count_query.where(User.created_at >= created_from)
        if created_to:
            end_date = datetime.combine(created_to, datetime.max.time())
            count_query = count_query.where(User.created_at <= end_date)
        if last_login_from:
            count_query = count_query.where(User.last_login_at >= last_login_from)
        if last_login_to:
            end_date = datetime.combine(last_login_to, datetime.max.time())
            count_query = count_query.where(User.last_login_at <= end_date)
        
        # Apply activity level filters to count query
        if activity_level:
            now = datetime.now(timezone.utc)
            
            if activity_level == 'never_logged_in':
                count_query = count_query.where(User.last_login_at.is_(None))
            elif activity_level == 'dormant':
                dormant_threshold = now - timedelta(days=90)
                count_query = count_query.where(
                    and_(
                        User.status == 'active',
                        or_(
                            User.last_login_at < dormant_threshold,
                            User.last_login_at.is_(None)
                        )
                    )
                )
            elif activity_level == 'active':
                active_threshold = now - timedelta(days=30)
                count_query = count_query.where(
                    and_(
                        User.status == 'active',
                        User.last_login_at >= active_threshold
                    )
                )
        
        if inactive_days is not None:
            threshold_date = datetime.now(timezone.utc) - timedelta(days=inactive_days)
            count_query = count_query.where(
                or_(
                    User.last_login_at < threshold_date,
                    User.last_login_at.is_(None)
                )
            )
        
        # Apply sorting with proper indexing
        if sort_by == 'last_login_at':
            if sort_order == 'asc':
                query = query.order_by(User.last_login_at.asc().nulls_last())
            else:
                query = query.order_by(User.last_login_at.desc().nulls_last())
        elif sort_by == 'username':
            if sort_order == 'asc':
                query = query.order_by(User.username.asc())
            else:
                query = query.order_by(User.username.desc())
        elif sort_by == 'email':
            if sort_order == 'asc':
                query = query.order_by(User.email.asc())
            else:
                query = query.order_by(User.email.desc())
        else:  # Default to created_at
            if sort_order == 'asc':
                query = query.order_by(User.created_at.asc())
            else:
                query = query.order_by(User.created_at.desc())
        
        # Apply pagination
        offset = (page - 1) * size
        query = query.offset(offset).limit(size)
        
        # Execute queries
        async with self.optimizer.timed_query("optimized_user_list_execution"):
            # Execute count query first (usually faster)
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()
            
            # Execute main query
            result = await self.db.execute(query)
            users = result.scalars().all()
        
        # Log optimization info
        logger.info(f"Optimized user query executed with filters: {', '.join(filters_applied)}")
        
        return users, total
    
    @query_monitor("optimized_user_detail")
    async def get_user_optimized(self, user_id: UUID) -> Optional[User]:
        """Optimized single user query with proper eager loading"""
        
        query = (
            select(User)
            .options(
                # Use joinedload for one-to-one relationships
                joinedload(User.department),
                joinedload(User.branch),
                joinedload(User.position),
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
                joinedload(User.status_changed_by_user)
            )
            .where(User.id == user_id)
        )
        
        async with self.optimizer.timed_query("optimized_user_detail_execution"):
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
    
    @query_monitor("optimized_user_analytics")
    async def get_user_analytics_optimized(
        self,
        days: int = 30,
        department_id: Optional[UUID] = None,
        branch_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """Optimized user analytics query with proper aggregation"""
        
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        # Base query with filters
        base_query = select(User).options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position)
        )
        
        if department_id:
            base_query = base_query.where(User.department_id == department_id)
        if branch_id:
            base_query = base_query.where(User.branch_id == branch_id)
        
        # Execute optimized analytics queries
        async with self.optimizer.timed_query("optimized_analytics_execution"):
            result = await self.db.execute(base_query)
            all_users = result.scalars().all()
        
        # Process analytics in memory (faster than complex SQL)
        metrics = self._calculate_analytics_metrics(all_users, start_date, end_date)
        
        return metrics
    
    def _calculate_analytics_metrics(self, users: List[User], start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Calculate analytics metrics from user data"""
        
        total_users = len(users)
        active_users = [u for u in users if u.status == 'active']
        
        # Activity levels
        now = datetime.now(timezone.utc)
        active_threshold = now - timedelta(days=30)
        dormant_threshold = now - timedelta(days=90)
        
        highly_active = []
        moderately_active = []
        dormant = []
        never_logged = []
        
        for user in active_users:
            if user.last_login_at is None:
                never_logged.append(user)
            elif user.last_login_at >= active_threshold:
                highly_active.append(user)
            elif user.last_login_at >= dormant_threshold:
                moderately_active.append(user)
            else:
                dormant.append(user)
        
        # Role distribution
        role_distribution = {}
        for user in users:
            role = user.role
            role_distribution[role] = role_distribution.get(role, 0) + 1
        
        # Department distribution
        department_distribution = {}
        for user in users:
            if user.department:
                dept_name = user.department.name
                department_distribution[dept_name] = department_distribution.get(dept_name, 0) + 1
        
        # Branch distribution
        branch_distribution = {}
        for user in users:
            if user.branch:
                branch_name = user.branch.name
                branch_distribution[branch_name] = branch_distribution.get(branch_name, 0) + 1
        
        return {
            "overview": {
                "total_users": total_users,
                "active_users": len(active_users),
                "inactive_users": total_users - len(active_users),
                "analysis_period_days": (end_date - start_date).days
            },
            "activity_levels": {
                "highly_active": len(highly_active),
                "moderately_active": len(moderately_active),
                "dormant": len(dormant),
                "never_logged_in": len(never_logged)
            },
            "role_distribution": role_distribution,
            "department_distribution": department_distribution,
            "branch_distribution": branch_distribution,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    
    async def get_performance_stats(self) -> Dict[str, Any]:
        """Get query performance statistics"""
        return self.optimizer.get_performance_stats()
    
    def clear_performance_stats(self):
        """Clear performance statistics"""
        self.optimizer.clear_stats()
