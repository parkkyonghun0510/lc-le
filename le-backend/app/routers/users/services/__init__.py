"""
User management services package.

This package provides business logic layer for user management operations
following the service layer pattern.
"""

from typing import TypeVar, Generic, Type, Optional, List, Dict, Any, Union, Protocol
from uuid import UUID
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.routers.users.repositories import UserRepository, get_user_repository
from app.routers.users.utils.user_exceptions import (
    UserNotFoundError,
    UserAlreadyExistsError,
    UserValidationError,
    DuplicateUserError,
    UserStatusTransitionError,
    UserAuthorizationError,
    UserBranchAssignmentError
)
from app.routers.users.services.user_error_handler import (
    UserErrorHandler,
    get_user_error_handler
)

T = TypeVar('T')  # Generic type for models


class ServiceResult(Generic[T]):
    """Generic service result wrapper."""

    def __init__(
        self,
        success: bool,
        data: Optional[T] = None,
        error: Optional[str] = None,
        error_code: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.success = success
        self.data = data
        self.error = error
        self.error_code = error_code
        self.metadata = metadata or {}

    @classmethod
    def ok(cls, data: Optional[T] = None, **metadata) -> 'ServiceResult[T]':
        """Create successful result."""
        return cls(success=True, data=data, metadata=metadata)

    @classmethod
    def fail(
        cls,
        error: str,
        error_code: Optional[str] = None,
        **metadata
    ) -> 'ServiceResult[T]':
        """Create failed result."""
        return cls(
            success=False,
            error=error,
            error_code=error_code,
            metadata=metadata
        )


class BaseService:
    """Base service class providing common functionality."""

    def __init__(self, db_session: AsyncSession):
        """Initialize service with database session."""
        self.db = db_session
        self.error_handler = get_user_error_handler()

    async def _validate_user_exists(
        self,
        user_id: UUID,
        include_deleted: bool = False
    ) -> User:
        """Validate that a user exists and return the user."""
        try:
            user_repo = get_user_repository(self.db)
            return await user_repo.get_by_id(
                user_id,
                include_deleted=include_deleted
            )
        except UserNotFoundError:
            raise

    async def _validate_duplicate_data(
        self,
        field: str,
        value: str,
        exclude_user_id: Optional[UUID] = None
    ) -> None:
        """Validate that data doesn't already exist."""
        user_repo = get_user_repository(self.db)
        existing_user = await user_repo.check_duplicate(field, value, exclude_user_id)

        if existing_user:
            raise DuplicateUserError(field, value, existing_user.id)

    async def _validate_branch_assignments(
        self,
        user_branch_id: Optional[UUID],
        portfolio_id: Optional[UUID],
        line_manager_id: Optional[UUID]
    ) -> None:
        """Validate that portfolio and line managers are from the same branch."""
        if not user_branch_id:
            return

        user_repo = get_user_repository(self.db)

        # Check portfolio manager
        if portfolio_id:
            portfolio_manager = await user_repo.get_by_id(portfolio_id)
            if portfolio_manager and portfolio_manager.branch_id != user_branch_id:
                raise UserBranchAssignmentError(
                    user_branch_id,
                    portfolio_manager.branch_id,
                    "Portfolio manager"
                )

        # Check line manager
        if line_manager_id:
            line_manager = await user_repo.get_by_id(line_manager_id)
            if line_manager and line_manager.branch_id != user_branch_id:
                raise UserBranchAssignmentError(
                    user_branch_id,
                    line_manager.branch_id,
                    "Line manager"
                )


class UserService(BaseService):
    """Service for user-related business logic."""

    def __init__(self, db_session: AsyncSession):
        """Initialize user service."""
        super().__init__(db_session)
        self.user_repository = get_user_repository(db_session)

    async def create_user(
        self,
        user_data: Dict[str, Any],
        created_by: UUID
    ) -> ServiceResult[User]:
        """
        Create a new user with validation.

        Args:
            user_data: User data for creation
            created_by: ID of user creating this user

        Returns:
            ServiceResult containing created user or error
        """
        try:
            # Validate required fields
            required_fields = ['username', 'email', 'first_name', 'last_name']
            for field in required_fields:
                if not user_data.get(field):
                    return ServiceResult.fail(
                        f"Field '{field}' is required",
                        "VALIDATION_ERROR"
                    )

            # Check for duplicates
            await self._validate_duplicate_data('username', user_data['username'])
            await self._validate_duplicate_data('email', user_data['email'])

            if user_data.get('employee_id'):
                await self._validate_duplicate_data(
                    'employee_id',
                    user_data['employee_id']
                )

            # Validate branch assignments
            await self._validate_branch_assignments(
                user_data.get('branch_id'),
                user_data.get('portfolio_id'),
                user_data.get('line_manager_id')
            )

            # Create user
            user = await self.user_repository.create(user_data)

            return ServiceResult.ok(user, operation="create_user")

        except (DuplicateUserError, UserBranchAssignmentError) as e:
            return ServiceResult.fail(str(e), e.error_code)
        except Exception as e:
            return ServiceResult.fail(f"Failed to create user: {str(e)}")

    async def get_user_by_id(
        self,
        user_id: UUID,
        include_deleted: bool = False,
        load_relationships: bool = True
    ) -> ServiceResult[User]:
        """
        Get user by ID.

        Args:
            user_id: User ID to retrieve
            include_deleted: Whether to include soft-deleted users
            load_relationships: Whether to load related entities

        Returns:
            ServiceResult containing user or error
        """
        try:
            user = await self.user_repository.get_by_id(
                user_id,
                include_deleted=include_deleted,
                load_relationships=load_relationships
            )
            return ServiceResult.ok(user, operation="get_user_by_id")

        except UserNotFoundError as e:
            return ServiceResult.fail(str(e), e.error_code)
        except Exception as e:
            return ServiceResult.fail(f"Failed to get user: {str(e)}")

    async def update_user(
        self,
        user_id: UUID,
        update_data: Dict[str, Any],
        updated_by: UUID
    ) -> ServiceResult[User]:
        """
        Update user with validation.

        Args:
            user_id: ID of user to update
            update_data: Data to update
            updated_by: ID of user making the update

        Returns:
            ServiceResult containing updated user or error
        """
        try:
            # Get existing user
            user = await self._validate_user_exists(user_id)

            # Check for duplicates if updating unique fields
            if 'username' in update_data:
                await self._validate_duplicate_data(
                    'username',
                    update_data['username'],
                    exclude_user_id=user_id
                )

            if 'email' in update_data:
                await self._validate_duplicate_data(
                    'email',
                    update_data['email'],
                    exclude_user_id=user_id
                )

            if 'employee_id' in update_data and update_data['employee_id']:
                await self._validate_duplicate_data(
                    'employee_id',
                    update_data['employee_id'],
                    exclude_user_id=user_id
                )

            # Validate branch assignments
            await self._validate_branch_assignments(
                update_data.get('branch_id', user.branch_id),
                update_data.get('portfolio_id', user.portfolio_id),
                update_data.get('line_manager_id', user.line_manager_id)
            )

            # Update user
            updated_user = await self.user_repository.update(user, update_data)

            return ServiceResult.ok(updated_user, operation="update_user")

        except (UserNotFoundError, DuplicateUserError, UserBranchAssignmentError) as e:
            return ServiceResult.fail(str(e), e.error_code)
        except Exception as e:
            return ServiceResult.fail(f"Failed to update user: {str(e)}")

    async def delete_user(
        self,
        user_id: UUID,
        deleted_by: UUID,
        permanent: bool = False
    ) -> ServiceResult[User]:
        """
        Delete user (soft delete by default).

        Args:
            user_id: ID of user to delete
            deleted_by: ID of user performing deletion
            permanent: Whether to permanently delete

        Returns:
            ServiceResult containing deleted user or error
        """
        try:
            # Get user
            user = await self._validate_user_exists(user_id)

            if permanent:
                await self.user_repository.permanent_delete(user)
                return ServiceResult.ok(
                    None,
                    operation="permanent_delete_user",
                    deleted_user_id=str(user_id)
                )
            else:
                deleted_user = await self.user_repository.soft_delete(user, deleted_by)
                return ServiceResult.ok(deleted_user, operation="soft_delete_user")

        except UserNotFoundError as e:
            return ServiceResult.fail(str(e), e.error_code)
        except Exception as e:
            return ServiceResult.fail(f"Failed to delete user: {str(e)}")

    async def restore_user(self, user_id: UUID) -> ServiceResult[User]:
        """
        Restore a soft-deleted user.

        Args:
            user_id: ID of user to restore

        Returns:
            ServiceResult containing restored user or error
        """
        try:
            # Get user including deleted ones
            user = await self._validate_user_exists(user_id, include_deleted=True)

            if not user.is_deleted:
                return ServiceResult.fail(
                    "User is not deleted",
                    "USER_NOT_DELETED"
                )

            restored_user = await self.user_repository.restore(user)
            return ServiceResult.ok(restored_user, operation="restore_user")

        except UserNotFoundError as e:
            return ServiceResult.fail(str(e), e.error_code)
        except Exception as e:
            return ServiceResult.fail(f"Failed to restore user: {str(e)}")

    async def get_users_paginated(
        self,
        page: int = 1,
        size: int = 10,
        filters: Optional[Dict[str, Any]] = None,
        search: Optional[str] = None,
        search_fields: Optional[List[str]] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        include_deleted: bool = False
    ) -> ServiceResult[Dict[str, Any]]:
        """
        Get paginated users with filtering and search.

        Args:
            page: Page number
            size: Page size
            filters: Optional filters
            search: Optional search term
            search_fields: Fields to search in
            sort_by: Sort field
            sort_order: Sort order
            include_deleted: Include soft-deleted users

        Returns:
            ServiceResult containing paginated users
        """
        try:
            result = await self.user_repository.get_users_paginated(
                page=page,
                size=size,
                filters=filters,
                search=search,
                search_fields=search_fields,
                sort_by=sort_by,
                sort_order=sort_order,
                include_deleted=include_deleted
            )

            return ServiceResult.ok(result, operation="get_users_paginated")

        except Exception as e:
            return ServiceResult.fail(f"Failed to get users: {str(e)}")

    async def change_user_status(
        self,
        user_id: UUID,
        new_status: str,
        reason: str,
        changed_by: UUID
    ) -> ServiceResult[User]:
        """
        Change user status with validation.

        Args:
            user_id: ID of user to update
            new_status: New status value
            reason: Reason for status change
            changed_by: ID of user making the change

        Returns:
            ServiceResult containing updated user or error
        """
        try:
            # Get user
            user = await self._validate_user_exists(user_id)

            # Validate status transition
            from app.core.user_status import can_transition_status, get_allowed_transitions

            if not can_transition_status(user.status, new_status):
                allowed = get_allowed_transitions(user.status)
                raise UserStatusTransitionError(user.status, new_status, allowed)

            # Update status
            update_data = {
                'status': new_status,
                'status_reason': reason,
                'status_changed_at': datetime.now(timezone.utc),
                'status_changed_by': changed_by
            }

            updated_user = await self.user_repository.update(user, update_data)

            return ServiceResult.ok(updated_user, operation="change_user_status")

        except (UserNotFoundError, UserStatusTransitionError) as e:
            return ServiceResult.fail(str(e), e.error_code)
        except Exception as e:
            return ServiceResult.fail(f"Failed to change user status: {str(e)}")

    async def get_user_activity_summary(
        self,
        user_id: UUID,
        days: int = 30
    ) -> ServiceResult[Dict[str, Any]]:
        """
        Get user activity summary.

        Args:
            user_id: ID of user to analyze
            days: Number of days to analyze

        Returns:
            ServiceResult containing activity summary
        """
        try:
            # Get user
            user = await self._validate_user_exists(user_id)

            # Calculate activity metrics
            now = datetime.now(timezone.utc)
            since_date = now.replace(hour=0, minute=0, second=0, microsecond=0)

            summary = {
                'user_id': str(user_id),
                'username': user.username,
                'current_status': user.status,
                'last_login': user.last_login_at.isoformat() if user.last_login_at else None,
                'login_count': user.login_count or 0,
                'failed_login_attempts': user.failed_login_attempts or 0,
                'account_created': user.created_at.isoformat(),
                'last_activity': user.last_activity_at.isoformat() if user.last_activity_at else None,
                'is_active': user.status == 'active',
                'onboarding_completed': user.onboarding_completed,
                'analysis_period_days': days,
                'generated_at': now.isoformat()
            }

            return ServiceResult.ok(summary, operation="get_user_activity_summary")

        except UserNotFoundError as e:
            return ServiceResult.fail(str(e), e.error_code)
        except Exception as e:
            return ServiceResult.fail(f"Failed to get activity summary: {str(e)}")


class UserValidationService(BaseService):
    """Service for user data validation."""

    def __init__(self, db_session: AsyncSession):
        """Initialize validation service."""
        super().__init__(db_session)
        self.user_repository = get_user_repository(db_session)

    async def validate_user_duplicates(
        self,
        user_data: Dict[str, Any],
        exclude_id: Optional[UUID] = None
    ) -> ServiceResult[None]:
        """
        Validate user data for duplicates.

        Args:
            user_data: User data to validate
            exclude_id: User ID to exclude from duplicate check

        Returns:
            ServiceResult indicating success or failure
        """
        try:
            # Check username
            if 'username' in user_data:
                await self._validate_duplicate_data(
                    'username',
                    user_data['username'],
                    exclude_id
                )

            # Check email
            if 'email' in user_data:
                await self._validate_duplicate_data(
                    'email',
                    user_data['email'],
                    exclude_id
                )

            # Check employee_id
            if 'employee_id' in user_data and user_data['employee_id']:
                await self._validate_duplicate_data(
                    'employee_id',
                    user_data['employee_id'],
                    exclude_id
                )

            return ServiceResult.ok(None, operation="validate_user_duplicates")

        except DuplicateUserError as e:
            return ServiceResult.fail(str(e), e.error_code)
        except Exception as e:
            return ServiceResult.fail(f"Validation failed: {str(e)}")


class UserQueryService(BaseService):
    """Service for complex user queries and analytics."""

    def __init__(self, db_session: AsyncSession):
        """Initialize query service."""
        super().__init__(db_session)
        self.user_repository = get_user_repository(db_session)

    async def get_user_statistics(
        self,
        filters: Optional[Dict[str, Any]] = None
    ) -> ServiceResult[Dict[str, Any]]:
        """
        Get user statistics.

        Args:
            filters: Optional filters to apply

        Returns:
            ServiceResult containing statistics
        """
        try:
            # Get total count
            total_users = await self.user_repository.get_users_count(
                filters=filters,
                include_deleted=False
            )

            # Get active users count
            active_filters = filters.copy() if filters else {}
            active_filters['status'] = 'active'
            active_users = await self.user_repository.get_users_count(
                filters=active_filters,
                include_deleted=False
            )

            # Get inactive users count
            inactive_filters = filters.copy() if filters else {}
            inactive_filters['status'] = 'inactive'
            inactive_users = await self.user_repository.get_users_count(
                filters=inactive_filters,
                include_deleted=False
            )

            # Get recent users (last 30 days)
            recent_users = await self.user_repository.get_recent_users(
                days=30,
                limit=1000  # Get all recent users for counting
            )

            statistics = {
                'total_users': total_users,
                'active_users': active_users,
                'inactive_users': inactive_users,
                'recent_users_30d': len(recent_users),
                'active_percentage': (active_users / total_users * 100) if total_users > 0 else 0,
                'inactive_percentage': (inactive_users / total_users * 100) if total_users > 0 else 0,
                'generated_at': datetime.now(timezone.utc).isoformat()
            }

            return ServiceResult.ok(statistics, operation="get_user_statistics")

        except Exception as e:
            return ServiceResult.fail(f"Failed to get statistics: {str(e)}")


# Service factory functions
def get_user_service(db_session: AsyncSession) -> UserService:
    """Get user service instance."""
    return UserService(db_session)


def get_user_validation_service(db_session: AsyncSession) -> UserValidationService:
    """Get user validation service instance."""
    return UserValidationService(db_session)


def get_user_query_service(db_session: AsyncSession) -> UserQueryService:
    """Get user query service instance."""
    return UserQueryService(db_session)


# Export service classes
__all__ = [
    'ServiceResult',
    'BaseService',
    'UserService',
    'UserValidationService',
    'UserQueryService',
    'get_user_service',
    'get_user_validation_service',
    'get_user_query_service'
]