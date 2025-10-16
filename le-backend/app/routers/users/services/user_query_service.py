"""
User query service for query building and optimization.

This module provides advanced query building capabilities, performance
optimization, and caching strategies for user data retrieval operations.
"""

from typing import Dict, Any, List, Optional, Tuple, Union
from uuid import UUID
from datetime import datetime, timezone, date, timedelta
import json
import hashlib

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, func, desc, text, distinct
from sqlalchemy.orm import selectinload, noload

from app.models import User, Department, Branch, Position, Employee
from app.routers.users.repositories.user_repository import UserRepository
from app.routers.users.services.user_error_handler import user_error_handler
from app.routers.users.utils.user_exceptions import (
    DatabaseOperationError,
    UserValidationError
)


class QueryFilter:
    """Represents a query filter with field, operator, and value."""

    def __init__(self, field: str, operator: str, value: Any, field_type: str = "string"):
        self.field = field
        self.operator = operator
        self.value = value
        self.field_type = field_type

    def to_sqlalchemy_condition(self, model_class):
        """Convert filter to SQLAlchemy condition."""
        field_attr = getattr(model_class, self.field)

        if self.field_type == "date":
            if self.operator == "eq":
                return field_attr == self.value
            elif self.operator == "gt":
                return field_attr > self.value
            elif self.operator == "gte":
                return field_attr >= self.value
            elif self.operator == "lt":
                return field_attr < self.value
            elif self.operator == "lte":
                return field_attr <= self.value
            elif self.operator == "between":
                return field_attr.between(self.value[0], self.value[1])
        elif self.field_type == "string":
            if self.operator == "eq":
                return field_attr == self.value
            elif self.operator == "like":
                return field_attr.ilike(f"%{self.value}%")
            elif self.operator == "in":
                return field_attr.in_(self.value)
        elif self.field_type == "uuid":
            if self.operator == "eq":
                return field_attr == self.value
            elif self.operator == "in":
                return field_attr.in_(self.value)
        elif self.field_type == "boolean":
            if self.operator == "eq":
                return field_attr == self.value

        return field_attr == self.value  # Default case


class QueryOptimizer:
    """Optimizes database queries for better performance."""

    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def get_query_plan(self, query) -> Dict[str, Any]:
        """Get query execution plan for optimization analysis."""
        try:
            # This would typically use EXPLAIN ANALYZE in PostgreSQL
            # For now, return basic query information
            return {
                "query_type": "SELECT",
                "estimated_cost": "unknown",
                "optimization_suggestions": [
                    "Consider adding indexes for frequently filtered columns",
                    "Use selectinload for relationships to avoid N+1 queries",
                    "Consider pagination for large result sets"
                ]
            }
        except Exception as e:
            return {
                "error": f"Failed to analyze query plan: {str(e)}"
            }

    def suggest_indexes(self, query_patterns: List[Dict]) -> List[Dict[str, Any]]:
        """Suggest database indexes based on query patterns."""
        suggestions = []

        for pattern in query_patterns:
            filters = pattern.get("filters", [])
            for filter_info in filters:
                field = filter_info.get("field")
                if field and field not in ["id"]:  # Don't suggest index on primary key
                    suggestions.append({
                        "table": "users",
                        "field": field,
                        "reason": f"Frequently used in {filter_info.get('operator', 'filter')} operations",
                        "priority": "high" if filter_info.get("frequency", 0) > 10 else "medium"
                    })

        return suggestions


class UserQueryService:
    """Service for building and optimizing user queries."""

    def __init__(self, db_session: AsyncSession):
        """Initialize query service with database session."""
        self.db = db_session
        self.repository = UserRepository(db_session)
        self.error_handler = user_error_handler
        self.optimizer = QueryOptimizer(db_session)

        # Query performance tracking
        self.query_stats = {}
        self.cache_stats = {}

        # Field type mappings for query building
        self.field_types = {
            'id': 'uuid',
            'username': 'string',
            'email': 'string',
            'first_name': 'string',
            'last_name': 'string',
            'phone_number': 'string',
            'employee_id': 'string',
            'role': 'string',
            'status': 'string',
            'created_at': 'date',
            'updated_at': 'date',
            'last_login_at': 'date',
            'onboarding_completed': 'boolean',
            'is_deleted': 'boolean',
            'department_id': 'uuid',
            'branch_id': 'uuid',
            'position_id': 'uuid',
            'portfolio_id': 'uuid',
            'line_manager_id': 'uuid'
        }

    async def build_user_list_query(
        self,
        filters: Dict[str, Any],
        sorting: Dict[str, Any],
        pagination: Dict[str, Any],
        include_relationships: bool = True
    ) -> Tuple[Any, int]:
        """
        Build optimized query for user listing.

        Args:
            filters: Dictionary of filter criteria
            sorting: Dictionary with sort field and order
            pagination: Dictionary with page and size
            include_relationships: Whether to include related data

        Returns:
            Tuple of (query, total_count)
        """
        async with self.error_handler.handle_operation("build_user_list_query", db_session=self.db):
            try:
                # Build base query
                query = select(User)

                # Add relationships if requested
                if include_relationships:
                    query = query.options(
                        selectinload(User.department),
                        selectinload(User.branch),
                        selectinload(User.position),
                        selectinload(User.portfolio).options(
                selectinload(Employee.department),
                selectinload(Employee.branch),
            ),
            selectinload(User.line_manager).options(
                selectinload(Employee.department),
                selectinload(Employee.branch),
            ),
                    )

                # Apply filters
                query, count_query = await self._apply_filters(query, filters)

                # Get total count
                count_result = await self.db.execute(count_query)
                total = int(count_result.scalar() or 0)

                # Apply sorting
                query = self._apply_sorting(query, sorting)

                # Apply pagination
                query = self._apply_pagination(query, pagination)

                return query, total

            except Exception as e:
                raise DatabaseOperationError(
                    operation="build_user_list_query",
                    reason=f"Failed to build user list query: {str(e)}"
                )

    async def build_analytics_query(
        self,
        metrics: List[str],
        filters: Dict[str, Any],
        group_by: Optional[str] = None,
        time_range: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Build query for user analytics and metrics.

        Args:
            metrics: List of metrics to calculate
            filters: Dictionary of filter criteria
            group_by: Field to group results by
            time_range: Time range for analysis

        Returns:
            Dictionary with query results
        """
        async with self.error_handler.handle_operation("build_analytics_query", db_session=self.db):
            try:
                results = {}

                # Base query for analytics
                base_query = select(User).where(User.is_deleted == False)

                # Apply filters
                if filters:
                    base_query = await self._apply_analytics_filters(base_query, filters)

                # Apply time range
                if time_range:
                    base_query = self._apply_time_range(base_query, time_range)

                # Calculate metrics
                for metric in metrics:
                    if metric == "total_users":
                        results[metric] = await self._calculate_total_users(base_query)
                    elif metric == "active_users":
                        results[metric] = await self._calculate_active_users(base_query)
                    elif metric == "new_users":
                        results[metric] = await self._calculate_new_users(base_query, time_range)
                    elif metric == "role_distribution":
                        results[metric] = await self._calculate_role_distribution(base_query)
                    elif metric == "status_distribution":
                        results[metric] = await self._calculate_status_distribution(base_query)
                    elif metric == "department_distribution":
                        results[metric] = await self._calculate_department_distribution(base_query)
                    elif metric == "branch_distribution":
                        results[metric] = await self._calculate_branch_distribution(base_query)
                    elif metric == "activity_levels":
                        results[metric] = await self._calculate_activity_levels(base_query)

                # Apply grouping if specified
                if group_by:
                    results = await self._apply_grouping(results, group_by, base_query)

                return results

            except Exception as e:
                raise DatabaseOperationError(
                    operation="build_analytics_query",
                    reason=f"Failed to build analytics query: {str(e)}"
                )

    async def build_activity_analysis_query(
        self,
        analysis_type: str,
        filters: Dict[str, Any],
        time_range: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Build query for user activity analysis.

        Args:
            analysis_type: Type of analysis (dormant_users, activity_trends, etc.)
            filters: Dictionary of filter criteria
            time_range: Time range for analysis

        Returns:
            Dictionary with analysis results
        """
        async with self.error_handler.handle_operation("build_activity_analysis_query", db_session=self.db):
            try:
                if analysis_type == "dormant_users":
                    return await self._analyze_dormant_users(filters, time_range)
                elif analysis_type == "activity_trends":
                    return await self._analyze_activity_trends(filters, time_range)
                elif analysis_type == "login_patterns":
                    return await self._analyze_login_patterns(filters, time_range)
                elif analysis_type == "onboarding_progress":
                    return await self._analyze_onboarding_progress(filters, time_range)
                else:
                    raise UserValidationError(
                        field="analysis_type",
                        value=analysis_type,
                        reason=f"Unknown analysis type: {analysis_type}"
                    )

            except (UserValidationError, DatabaseOperationError):
                raise
            except Exception as e:
                raise DatabaseOperationError(
                    operation="build_activity_analysis_query",
                    reason=f"Failed to build activity analysis query: {str(e)}"
                )

    async def optimize_query_performance(self, query_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze and optimize query performance.

        Args:
            query_info: Information about the query to optimize

        Returns:
            Dictionary with optimization suggestions
        """
        async with self.error_handler.handle_operation("optimize_query_performance", db_session=self.db):
            try:
                optimizations = {
                    "index_suggestions": [],
                    "query_rewrites": [],
                    "caching_suggestions": [],
                    "performance_score": 0
                }

                # Analyze query patterns
                query_patterns = query_info.get("query_patterns", [])
                if query_patterns:
                    index_suggestions = self.optimizer.suggest_indexes(query_patterns)
                    optimizations["index_suggestions"] = index_suggestions

                # Analyze filter patterns
                filters = query_info.get("filters", {})
                if filters:
                    filter_optimizations = await self._analyze_filter_patterns(filters)
                    optimizations["query_rewrites"].extend(filter_optimizations)

                # Analyze caching opportunities
                caching_suggestions = await self._analyze_caching_opportunities(query_info)
                optimizations["caching_suggestions"] = caching_suggestions

                # Calculate performance score
                optimizations["performance_score"] = self._calculate_performance_score(optimizations)

                return optimizations

            except Exception as e:
                return {
                    "error": f"Failed to optimize query performance: {str(e)}",
                    "suggestions": ["Review query structure and add appropriate indexes"]
                }

    async def _apply_filters(self, query, filters: Dict[str, Any]) -> Tuple[Any, Any]:
        """Apply filters to query and create count query."""
        # Start with base conditions
        conditions = [User.is_deleted == False]

        # Role filter
        if role := filters.get('role'):
            conditions.append(User.role == role)

        # Branch filter
        if branch_id := filters.get('branch_id'):
            conditions.append(User.branch_id == branch_id)

        # Department filter
        if department_id := filters.get('department_id'):
            conditions.append(User.department_id == department_id)

        # Status filter
        if status := filters.get('status'):
            conditions.append(User.status == status)

        # Search filter
        if search := filters.get('search'):
            search_term = f"%{search}%"
            search_fields = filters.get('search_fields', ['username', 'email', 'first_name', 'last_name'])

            search_conditions = []
            if 'username' in search_fields:
                search_conditions.append(User.username.ilike(search_term))
            if 'email' in search_fields:
                search_conditions.append(User.email.ilike(search_term))
            if 'first_name' in search_fields:
                search_conditions.append(User.first_name.ilike(search_term))
            if 'last_name' in search_fields:
                search_conditions.append(User.last_name.ilike(search_term))
            if 'employee_id' in search_fields:
                search_conditions.append(User.employee_id.ilike(search_term))

            if search_conditions:
                conditions.append(or_(*search_conditions))

        # Date filters
        if created_from := filters.get('created_from'):
            conditions.append(User.created_at >= created_from)

        if created_to := filters.get('created_to'):
            end_date = datetime.combine(created_to, datetime.max.time())
            conditions.append(User.created_at <= end_date)

        if last_login_from := filters.get('last_login_from'):
            conditions.append(User.last_login_at >= last_login_from)

        if last_login_to := filters.get('last_login_to'):
            end_date = datetime.combine(last_login_to, datetime.max.time())
            conditions.append(User.last_login_at <= end_date)

        # Activity level filter
        if activity_level := filters.get('activity_level'):
            now = datetime.now(timezone.utc)

            if activity_level == 'never_logged_in':
                conditions.append(User.last_login_at.is_(None))
            elif activity_level == 'dormant':
                dormant_threshold = now - timedelta(days=90)
                conditions.append(
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
                conditions.append(
                    and_(
                        User.status == 'active',
                        User.last_login_at >= active_threshold
                    )
                )

        # Custom inactive days filter
        if inactive_days := filters.get('inactive_days'):
            threshold_date = datetime.now(timezone.utc) - timedelta(days=inactive_days)
            conditions.append(
                or_(
                    User.last_login_at < threshold_date,
                    User.last_login_at.is_(None)
                )
            )

        # Apply conditions to query
        if conditions:
            query = query.where(and_(*conditions))

        # Create count query with same conditions
        count_query = select(func.count()).select_from(User)
        if conditions:
            count_query = count_query.where(and_(*conditions))

        return query, count_query

    async def _apply_analytics_filters(self, query, filters: Dict[str, Any]):
        """Apply filters for analytics queries."""
        conditions = [User.is_deleted == False]

        # Apply standard filters
        if role := filters.get('role'):
            conditions.append(User.role == role)
        if branch_id := filters.get('branch_id'):
            conditions.append(User.branch_id == branch_id)
        if department_id := filters.get('department_id'):
            conditions.append(User.department_id == department_id)

        if conditions:
            query = query.where(and_(*conditions))

        return query

    def _apply_time_range(self, query, time_range: Dict[str, Any]):
        """Apply time range filter to query."""
        start_date = time_range.get('start')
        end_date = time_range.get('end')

        if start_date:
            query = query.where(User.created_at >= start_date)
        if end_date:
            query = query.where(User.created_at <= end_date)

        return query

    def _apply_sorting(self, query, sorting: Dict[str, Any]):
        """Apply sorting to query."""
        sort_by = sorting.get('sort_by', 'created_at')
        sort_order = sorting.get('sort_order', 'desc')

        sort_field = getattr(User, sort_by, User.created_at)

        if sort_order == 'asc':
            query = query.order_by(sort_field.asc())
        else:
            query = query.order_by(sort_field.desc())

        return query

    def _apply_pagination(self, query, pagination: Dict[str, Any]):
        """Apply pagination to query."""
        page = pagination.get('page', 1)
        size = pagination.get('size', 10)

        offset = (page - 1) * size
        query = query.offset(offset).limit(size)

        return query

    async def _calculate_total_users(self, base_query) -> int:
        """Calculate total number of users."""
        count_query = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_query)
        return int(result.scalar() or 0)

    async def _calculate_active_users(self, base_query) -> int:
        """Calculate number of active users."""
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        count_query = select(func.count()).select_from(
            base_query.where(User.last_login_at >= thirty_days_ago).subquery()
        )
        result = await self.db.execute(count_query)
        return int(result.scalar() or 0)

    async def _calculate_new_users(self, base_query, time_range: Dict[str, Any]) -> int:
        """Calculate number of new users in time range."""
        start_date = time_range.get('start') if time_range else datetime.now(timezone.utc) - timedelta(days=30)

        count_query = select(func.count()).select_from(
            base_query.where(User.created_at >= start_date).subquery()
        )
        result = await self.db.execute(count_query)
        return int(result.scalar() or 0)

    async def _calculate_role_distribution(self, base_query) -> Dict[str, int]:
        """Calculate distribution of users by role."""
        query = select(User.role, func.count(User.id)).select_from(
            base_query.subquery()
        ).group_by(User.role)

        result = await self.db.execute(query)
        return {role: count for role, count in result.all()}

    async def _calculate_status_distribution(self, base_query) -> Dict[str, int]:
        """Calculate distribution of users by status."""
        query = select(User.status, func.count(User.id)).select_from(
            base_query.subquery()
        ).group_by(User.status)

        result = await self.db.execute(query)
        return {status: count for status, count in result.all()}

    async def _calculate_department_distribution(self, base_query) -> Dict[str, int]:
        """Calculate distribution of users by department."""
        query = (
            select(Department.name, func.count(User.id))
            .select_from(base_query.join(Department, User.department_id == Department.id).subquery())
            .group_by(Department.name)
        )

        result = await self.db.execute(query)
        return {dept: count for dept, count in result.all()}

    async def _calculate_branch_distribution(self, base_query) -> Dict[str, int]:
        """Calculate distribution of users by branch."""
        query = (
            select(Branch.name, func.count(User.id))
            .select_from(base_query.join(Branch, User.branch_id == Branch.id).subquery())
            .group_by(Branch.name)
        )

        result = await self.db.execute(query)
        return {branch: count for branch, count in result.all()}

    async def _calculate_activity_levels(self, base_query) -> Dict[str, int]:
        """Calculate activity levels of users."""
        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)
        ninety_days_ago = now - timedelta(days=90)

        # Active users (logged in within 30 days)
        active_query = select(func.count()).select_from(
            base_query.where(
                and_(User.status == 'active', User.last_login_at >= thirty_days_ago)
            ).subquery()
        )
        active_result = await self.db.execute(active_query)
        active_count = int(active_result.scalar() or 0)

        # Dormant users (no login for 90+ days but still active)
        dormant_query = select(func.count()).select_from(
            base_query.where(
                and_(
                    User.status == 'active',
                    or_(
                        User.last_login_at < ninety_days_ago,
                        User.last_login_at.is_(None)
                    )
                )
            ).subquery()
        )
        dormant_result = await self.db.execute(dormant_query)
        dormant_count = int(dormant_result.scalar() or 0)

        # Never logged in
        never_query = select(func.count()).select_from(
            base_query.where(User.last_login_at.is_(None)).subquery()
        )
        never_result = await self.db.execute(never_query)
        never_count = int(never_result.scalar() or 0)

        return {
            "active": active_count,
            "dormant": dormant_count,
            "never_logged_in": never_count,
            "total_tracked": active_count + dormant_count + never_count
        }

    async def _apply_grouping(self, results: Dict[str, Any], group_by: str, base_query) -> Dict[str, Any]:
        """Apply grouping to results."""
        # This would implement more sophisticated grouping logic
        # For now, return results as-is
        return results

    async def _analyze_dormant_users(self, filters: Dict[str, Any], time_range: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze dormant users."""
        # Get dormant users analysis
        inactive_days = filters.get('inactive_days', 90)

        query = (
            select(User)
            .options(selectinload(User.department), selectinload(User.branch))
            .where(
                and_(
                    User.is_deleted == False,
                    User.status == 'active',
                    or_(
                        User.last_login_at < datetime.now(timezone.utc) - timedelta(days=inactive_days),
                        User.last_login_at.is_(None)
                    )
                )
            )
        )

        result = await self.db.execute(query)
        dormant_users = result.scalars().all()

        return {
            "total_dormant": len(dormant_users),
            "inactive_threshold_days": inactive_days,
            "users": [
                {
                    "id": str(user.id),
                    "username": user.username,
                    "last_login": user.last_login_at.isoformat() if user.last_login_at else None,
                    "department": user.department.name if user.department else None,
                    "branch": user.branch.name if user.branch else None
                }
                for user in dormant_users
            ]
        }

    async def _analyze_activity_trends(self, filters: Dict[str, Any], time_range: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze user activity trends over time."""
        # This would implement trend analysis
        return {
            "trend_type": "activity",
            "analysis_period": time_range,
            "trend_data": [],
            "insights": ["Trend analysis not yet implemented"]
        }

    async def _analyze_login_patterns(self, filters: Dict[str, Any], time_range: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze user login patterns."""
        # This would implement login pattern analysis
        return {
            "pattern_type": "login",
            "analysis_period": time_range,
            "patterns": [],
            "insights": ["Login pattern analysis not yet implemented"]
        }

    async def _analyze_onboarding_progress(self, filters: Dict[str, Any], time_range: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze user onboarding progress."""
        # Calculate onboarding metrics
        total_query = select(func.count()).select_from(User).where(User.is_deleted == False)
        total_result = await self.db.execute(total_query)
        total_users = int(total_result.scalar() or 0)

        completed_query = select(func.count()).select_from(
            User.where(User.onboarding_completed == True).subquery()
        )
        completed_result = await self.db.execute(completed_query)
        completed_users = int(completed_result.scalar() or 0)

        return {
            "total_users": total_users,
            "completed_onboarding": completed_users,
            "completion_rate": (completed_users / total_users * 100) if total_users > 0 else 0,
            "pending_users": total_users - completed_users
        }

    async def _analyze_filter_patterns(self, filters: Dict[str, Any]) -> List[str]:
        """Analyze filter patterns for optimization suggestions."""
        suggestions = []

        # Check for inefficient patterns
        if 'search' in filters and not filters.get('search_fields'):
            suggestions.append("Consider specifying search_fields to optimize search performance")

        if filters.get('activity_level') == 'dormant':
            suggestions.append("Consider adding composite index on (status, last_login_at) for dormant user queries")

        return suggestions

    async def _analyze_caching_opportunities(self, query_info: Dict[str, Any]) -> List[str]:
        """Analyze opportunities for query result caching."""
        suggestions = []

        # Check for static or slowly changing data
        if query_info.get('filters', {}).get('role') == 'admin':
            suggestions.append("Admin user queries are good candidates for caching")

        if 'created_from' in query_info.get('filters', {}):
            suggestions.append("Historical queries (with date filters) are good candidates for long-term caching")

        return suggestions

    def _calculate_performance_score(self, optimizations: Dict[str, Any]) -> int:
        """Calculate a performance score based on optimizations."""
        score = 100

        # Deduct points for missing optimizations
        if not optimizations.get('index_suggestions'):
            score -= 10

        if len(optimizations.get('query_rewrites', [])) > 3:
            score -= 15

        if not optimizations.get('caching_suggestions'):
            score -= 5

        return max(0, score)

    def generate_query_hash(self, query_params: Dict[str, Any]) -> str:
        """Generate a hash for query result caching."""
        # Create a normalized representation of query parameters
        normalized = json.dumps(query_params, sort_keys=True, default=str)
        return hashlib.md5(normalized.encode()).hexdigest()

    async def get_query_statistics(self) -> Dict[str, Any]:
        """Get query performance statistics."""
        return {
            "query_stats": self.query_stats,
            "cache_stats": self.cache_stats,
            "optimization_suggestions": await self._get_optimization_suggestions()
        }

    async def _get_optimization_suggestions(self) -> List[str]:
        """Get general optimization suggestions."""
        return [
            "Add indexes on frequently filtered columns (role, status, branch_id, department_id)",
            "Use selectinload for relationships to avoid N+1 queries",
            "Consider query result caching for expensive operations",
            "Use pagination for large result sets",
            "Consider database connection pooling optimization"
        ]