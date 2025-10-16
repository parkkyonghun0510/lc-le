"""
User management repository package.

This package provides data access layer for user management operations
following the repository pattern.
"""

from typing import TypeVar, Generic, Type, Optional, List, Dict, Any, Union
from uuid import UUID
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, desc, asc, func, text
from sqlalchemy.orm import selectinload, noload
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db
from app.models import User, Employee
from app.routers.users.utils.user_exceptions import (
    UserNotFoundError,
    DatabaseOperationError
)
from app.routers.users.services.user_error_handler import user_error_handler

T = TypeVar('T')  # Generic type for models


class BaseRepository:
    """Base repository class providing common database operations."""

    def __init__(self, db_session: AsyncSession):
        """Initialize repository with database session."""
        self.db = db_session
        self.error_handler = user_error_handler

    async def _execute_query(self, query, operation: str = "query") -> Any:
        """Execute a query with error handling."""
        try:
            result = await self.db.execute(query)
            return result
        except SQLAlchemyError as e:
            db_error = await self.error_handler.handle_database_error(
                e, operation
            )
            raise db_error

    async def _commit(self, operation: str = "commit") -> None:
        """Commit transaction with error handling."""
        try:
            await self.db.commit()
        except SQLAlchemyError as e:
            await self.db.rollback()
            db_error = await self.error_handler.handle_database_error(
                e, operation
            )
            raise db_error

    async def _flush(self, operation: str = "flush") -> None:
        """Flush session with error handling."""
        try:
            await self.db.flush()
        except SQLAlchemyError as e:
            await self.db.rollback()
            db_error = await self.error_handler.handle_database_error(
                e, operation
            )
            raise db_error


class UserRepository(BaseRepository):
    """Repository for user-related database operations."""

    def __init__(self, db_session: AsyncSession):
        """Initialize user repository."""
        super().__init__(db_session)
        self.model = User

    async def get_by_id(
        self,
        user_id: UUID,
        include_deleted: bool = False,
        load_relationships: bool = True
    ) -> Optional[User]:
        """
        Get user by ID.

        Args:
            user_id: The user ID to search for
            include_deleted: Whether to include soft-deleted users
            load_relationships: Whether to load related entities

        Returns:
            User instance or None if not found
        """
        query = select(User).where(User.id == user_id)

        if not include_deleted:
            query = query.where(User.is_deleted == False)

        if load_relationships:
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
                selectinload(User.status_changed_by_user)
            )

        result = await self._execute_query(query, "get_user_by_id")
        user = result.scalar_one_or_none()

        if not user:
            raise UserNotFoundError(user_id=user_id)

        return user

    async def get_by_email(
        self,
        email: str,
        include_deleted: bool = False,
        load_relationships: bool = True
    ) -> Optional[User]:
        """
        Get user by email.

        Args:
            email: The email to search for
            include_deleted: Whether to include soft-deleted users
            load_relationships: Whether to load related entities

        Returns:
            User instance or None if not found
        """
        query = select(User).where(User.email == email)

        if not include_deleted:
            query = query.where(User.is_deleted == False)

        if load_relationships:
            query = query.options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position)
            )

        result = await self._execute_query(query, "get_user_by_email")
        return result.scalar_one_or_none()

    async def get_by_username(
        self,
        username: str,
        include_deleted: bool = False,
        load_relationships: bool = True
    ) -> Optional[User]:
        """
        Get user by username.

        Args:
            username: The username to search for
            include_deleted: Whether to include soft-deleted users
            load_relationships: Whether to load related entities

        Returns:
            User instance or None if not found
        """
        query = select(User).where(User.username == username)

        if not include_deleted:
            query = query.where(User.is_deleted == False)

        if load_relationships:
            query = query.options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position)
            )

        result = await self._execute_query(query, "get_user_by_username")
        return result.scalar_one_or_none()

    async def get_by_employee_id(
        self,
        employee_id: str,
        include_deleted: bool = False,
        load_relationships: bool = True
    ) -> Optional[User]:
        """
        Get user by employee ID.

        Args:
            employee_id: The employee ID to search for
            include_deleted: Whether to include soft-deleted users
            load_relationships: Whether to load related entities

        Returns:
            User instance or None if not found
        """
        query = select(User).where(User.employee_id == employee_id)

        if not include_deleted:
            query = query.where(User.is_deleted == False)

        if load_relationships:
            query = query.options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position)
            )

        result = await self._execute_query(query, "get_user_by_employee_id")
        return result.scalar_one_or_none()

    async def create(self, user_data: Dict[str, Any]) -> User:
        """
        Create a new user.

        Args:
            user_data: Dictionary containing user data

        Returns:
            Created user instance
        """
        try:
            user = User(**user_data)
            self.db.add(user)
            await self._flush("create_user")
            return user
        except SQLAlchemyError as e:
            db_error = await self.error_handler.handle_database_error(
                e, "create_user"
            )
            raise db_error

    async def update(self, user: User, update_data: Dict[str, Any]) -> User:
        """
        Update an existing user.

        Args:
            user: User instance to update
            update_data: Dictionary containing fields to update

        Returns:
            Updated user instance
        """
        try:
            for field, value in update_data.items():
                setattr(user, field, value)

            await self._commit("update_user")
            return user
        except SQLAlchemyError as e:
            db_error = await self.error_handler.handle_database_error(
                e, "update_user"
            )
            raise db_error

    async def soft_delete(self, user: User, deleted_by: UUID) -> User:
        """
        Soft delete a user.

        Args:
            user: User instance to delete
            deleted_by: ID of user performing the deletion

        Returns:
            Updated user instance
        """
        try:
            user.is_deleted = True
            user.deleted_at = datetime.now(timezone.utc)
            user.deleted_by = deleted_by

            await self._commit("soft_delete_user")
            return user
        except SQLAlchemyError as e:
            db_error = await self.error_handler.handle_database_error(
                e, "soft_delete_user"
            )
            raise db_error

    async def restore(self, user: User) -> User:
        """
        Restore a soft-deleted user.

        Args:
            user: User instance to restore

        Returns:
            Updated user instance
        """
        try:
            user.is_deleted = False
            user.deleted_at = None
            user.deleted_by = None

            await self._commit("restore_user")
            return user
        except SQLAlchemyError as e:
            db_error = await self.error_handler.handle_database_error(
                e, "restore_user"
            )
            raise db_error

    async def permanent_delete(self, user: User) -> None:
        """
        Permanently delete a user from database.

        Args:
            user: User instance to delete
        """
        try:
            await self.db.delete(user)
            await self._commit("permanent_delete_user")
        except SQLAlchemyError as e:
            db_error = await self.error_handler.handle_database_error(
                e, "permanent_delete_user"
            )
            raise db_error

    async def get_users_count(
        self,
        filters: Optional[Dict[str, Any]] = None,
        include_deleted: bool = False
    ) -> int:
        """
        Get count of users with optional filters.

        Args:
            filters: Optional filters to apply
            include_deleted: Whether to include soft-deleted users

        Returns:
            Total count of users
        """
        query = select(func.count()).select_from(User)

        if not include_deleted:
            query = query.where(User.is_deleted == False)

        # Apply filters if provided
        if filters:
            for field, value in filters.items():
                if hasattr(User, field):
                    query = query.where(getattr(User, field) == value)

        result = await self._execute_query(query, "count_users")
        return int(result.scalar() or 0)

    async def get_users_paginated(
        self,
        page: int = 1,
        size: int = 10,
        filters: Optional[Dict[str, Any]] = None,
        search: Optional[str] = None,
        search_fields: Optional[List[str]] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        include_deleted: bool = False,
        load_relationships: bool = True
    ) -> Dict[str, Any]:
        """
        Get paginated list of users with filtering and search.

        Args:
            page: Page number (1-based)
            size: Number of items per page
            filters: Optional filters to apply
            search: Optional search term
            search_fields: Fields to search in
            sort_by: Field to sort by
            sort_order: Sort order ('asc' or 'desc')
            include_deleted: Whether to include soft-deleted users
            load_relationships: Whether to load related entities

        Returns:
            Dictionary containing items, total, page, size, pages
        """
        # Build base query
        query = select(User)

        if not include_deleted:
            query = query.where(User.is_deleted == False)

        if load_relationships:
            query = query.options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position)
            )

        # Apply filters
        if filters:
            for field, value in filters.items():
                if hasattr(User, field):
                    query = query.where(getattr(User, field) == value)

        # Apply search
        if search and search_fields:
            search_term = f"%{search}%"
            search_conditions = []

            for field in search_fields:
                if hasattr(User, field):
                    column = getattr(User, field)
                    if field in ['first_name', 'last_name']:
                        search_conditions.append(column.ilike(search_term))
                    else:
                        search_conditions.append(column.ilike(search_term))

            if search_conditions:
                query = query.where(or_(*search_conditions))

        # Apply sorting
        sort_column = getattr(User, sort_by, User.created_at)
        if sort_order.lower() == 'asc':
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        # Get total count
        count_query = select(func.count()).select_from(User)
        if not include_deleted:
            count_query = count_query.where(User.is_deleted == False)

        # Apply same filters to count query
        if filters:
            for field, value in filters.items():
                if hasattr(User, field):
                    count_query = count_query.where(getattr(User, field) == value)

        if search and search_fields:
            search_term = f"%{search}%"
            search_conditions = []
            for field in search_fields:
                if hasattr(User, field):
                    column = getattr(User, field)
                    search_conditions.append(column.ilike(search_term))

            if search_conditions:
                count_query = count_query.where(or_(*search_conditions))

        result = await self._execute_query(count_query, "count_users_paginated")
        total = int(result.scalar() or 0)

        # Apply pagination
        offset = (page - 1) * size
        query = query.offset(offset).limit(size)

        result = await self._execute_query(query, "get_users_paginated")
        users = result.scalars().all()

        return {
            "items": users,
            "total": total,
            "page": page,
            "size": size,
            "pages": (total + size - 1) // size
        }

    async def check_duplicate(
        self,
        field: str,
        value: str,
        exclude_user_id: Optional[UUID] = None
    ) -> Optional[User]:
        """
        Check for duplicate values in specified field.

        Args:
            field: Field name to check
            value: Value to check for
            exclude_user_id: User ID to exclude from check (for updates)

        Returns:
            User instance if duplicate found, None otherwise
        """
        if not hasattr(User, field):
            return None

        query = select(User).where(
            getattr(User, field) == value,
            User.is_deleted == False
        )

        if exclude_user_id:
            query = query.where(User.id != exclude_user_id)

        result = await self._execute_query(query, f"check_duplicate_{field}")
        return result.scalar_one_or_none()

    async def get_users_by_role(
        self,
        role: str,
        include_deleted: bool = False,
        load_relationships: bool = True
    ) -> List[User]:
        """
        Get users by role.

        Args:
            role: Role to filter by
            include_deleted: Whether to include soft-deleted users
            load_relationships: Whether to load related entities

        Returns:
            List of users with specified role
        """
        query = select(User).where(User.role == role)

        if not include_deleted:
            query = query.where(User.is_deleted == False)

        if load_relationships:
            query = query.options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position)
            )

        result = await self._execute_query(query, "get_users_by_role")
        return result.scalars().all()

    async def get_users_by_branch(
        self,
        branch_id: UUID,
        include_deleted: bool = False,
        load_relationships: bool = True
    ) -> List[User]:
        """
        Get users by branch.

        Args:
            branch_id: Branch ID to filter by
            include_deleted: Whether to include soft-deleted users
            load_relationships: Whether to load related entities

        Returns:
            List of users in specified branch
        """
        query = select(User).where(User.branch_id == branch_id)

        if not include_deleted:
            query = query.where(User.is_deleted == False)

        if load_relationships:
            query = query.options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position)
            )

        result = await self._execute_query(query, "get_users_by_branch")
        return result.scalars().all()

    async def get_users_by_department(
        self,
        department_id: UUID,
        include_deleted: bool = False,
        load_relationships: bool = True
    ) -> List[User]:
        """
        Get users by department.

        Args:
            department_id: Department ID to filter by
            include_deleted: Whether to include soft-deleted users
            load_relationships: Whether to load related entities

        Returns:
            List of users in specified department
        """
        query = select(User).where(User.department_id == department_id)

        if not include_deleted:
            query = query.where(User.is_deleted == False)

        if load_relationships:
            query = query.options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position)
            )

        result = await self._execute_query(query, "get_users_by_department")
        return result.scalars().all()

    async def get_active_users(
        self,
        load_relationships: bool = True,
        limit: Optional[int] = None
    ) -> List[User]:
        """
        Get active users.

        Args:
            load_relationships: Whether to load related entities
            limit: Optional limit for results

        Returns:
            List of active users
        """
        query = select(User).where(
            User.status == 'active',
            User.is_deleted == False
        )

        if load_relationships:
            query = query.options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position)
            )

        if limit:
            query = query.limit(limit)

        result = await self._execute_query(query, "get_active_users")
        return result.scalars().all()

    async def get_inactive_users(
        self,
        load_relationships: bool = True,
        limit: Optional[int] = None
    ) -> List[User]:
        """
        Get inactive users.

        Args:
            load_relationships: Whether to load related entities
            limit: Optional limit for results

        Returns:
            List of inactive users
        """
        query = select(User).where(
            User.status == 'inactive',
            User.is_deleted == False
        )

        if load_relationships:
            query = query.options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position)
            )

        if limit:
            query = query.limit(limit)

        result = await self._execute_query(query, "get_inactive_users")
        return result.scalars().all()

    async def get_recent_users(
        self,
        days: int = 30,
        load_relationships: bool = True,
        limit: Optional[int] = None
    ) -> List[User]:
        """
        Get users created in the last N days.

        Args:
            days: Number of days to look back
            load_relationships: Whether to load related entities
            limit: Optional limit for results

        Returns:
            List of recently created users
        """
        from datetime import timedelta

        since_date = datetime.now(timezone.utc) - timedelta(days=days)

        query = select(User).where(
            User.created_at >= since_date,
            User.is_deleted == False
        )

        if load_relationships:
            query = query.options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position)
            )

        query = query.order_by(desc(User.created_at))

        if limit:
            query = query.limit(limit)

        result = await self._execute_query(query, "get_recent_users")
        return result.scalars().all()


# Repository factory function
def get_user_repository(db_session: AsyncSession) -> UserRepository:
    """Get user repository instance."""
    return UserRepository(db_session)


# Export repository classes
__all__ = [
    'BaseRepository',
    'UserRepository',
    'get_user_repository'
]