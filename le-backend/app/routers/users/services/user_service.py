"""
User service for core business logic operations.

This module provides the business logic layer for user management operations,
orchestrating data access through the repository and handling complex
business rules and workflows.
"""

from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime, timezone, date, timedelta
import csv
import io

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile

from app.models import User, BulkOperation, Department, Branch, Position
from app.routers.users.repositories.user_repository import UserRepository
from app.routers.users.services.user_error_handler import user_error_handler
from app.routers.users.utils.user_exceptions import (
    UserNotFoundError,
    UserAlreadyExistsError,
    UserValidationError,
    DuplicateUserError,
    UserStatusTransitionError,
    UserAuthorizationError,
    UserSoftDeleteError,
    UserRestoreError,
    BulkOperationError,
    DatabaseOperationError,
    UserBranchAssignmentError
)
from app.core.user_status import UserStatus, can_transition_status, get_allowed_transitions


class UserService:
    """Service class for user business logic operations."""

    def __init__(self, db_session: AsyncSession):
        """Initialize service with database session."""
        self.db = db_session
        self.repository = UserRepository(db_session)
        self.error_handler = user_error_handler

    async def create_user(self, user_data: Dict[str, Any], created_by: UUID) -> User:
        """
        Create a new user with validation and business rules.

        Args:
            user_data: Dictionary containing user creation data
            created_by: ID of user creating this user

        Returns:
            Created user object

        Raises:
            UserAlreadyExistsError: If user already exists
            UserValidationError: If validation fails
            DatabaseOperationError: If database operation fails
        """
        async with self.error_handler.handle_operation("create_user", db_session=self.db):
            try:
                # Extract sensitive data
                password = user_data.pop('password', None)
                password_hash = user_data.pop('password_hash', None)

                # Validate branch assignments
                await self._validate_branch_assignments(user_data)

                # Check for duplicates
                await self._check_user_duplicates(user_data)

                # Prepare user data for creation
                create_data = user_data.copy()

                if password_hash:
                    create_data['password_hash'] = password_hash
                elif password:
                    from app.core.security import get_password_hash
                    create_data['password_hash'] = get_password_hash(password)

                # Create user through repository
                user = await self.repository.create(create_data)

                return user

            except (UserAlreadyExistsError, UserValidationError, DatabaseOperationError):
                raise
            except Exception as e:
                raise DatabaseOperationError(
                    operation="create_user",
                    reason=f"Unexpected error creating user: {str(e)}"
                )

    async def get_user_by_id(self, user_id: UUID, include_deleted: bool = False) -> Optional[User]:
        """
        Get user by ID with business logic validation.

        Args:
            user_id: The user ID to retrieve
            include_deleted: Whether to include soft-deleted users

        Returns:
            User object or None if not found
        """
        async with self.error_handler.handle_operation("get_user_by_id", db_session=self.db):
            return await self.repository.get_by_id(user_id, include_deleted)

    async def get_user_with_relationships(self, user_id: UUID, include_deleted: bool = False) -> Optional[User]:
        """
        Get user with all relationships loaded.

        Args:
            user_id: The user ID to retrieve
            include_deleted: Whether to include soft-deleted users

        Returns:
            User object with relationships or None if not found
        """
        async with self.error_handler.handle_operation("get_user_with_relationships", db_session=self.db):
            return await self.repository.get_user_with_relationships(user_id, include_deleted)

    async def update_user(self, user_id: UUID, update_data: Dict[str, Any], updated_by: UUID) -> User:
        """
        Update user with validation and business rules.

        Args:
            user_id: The user ID to update
            update_data: Dictionary containing fields to update
            updated_by: ID of user making the update

        Returns:
            Updated user object

        Raises:
            UserNotFoundError: If user not found
            UserValidationError: If validation fails
            DatabaseOperationError: If database operation fails
        """
        async with self.error_handler.handle_operation("update_user", db_session=self.db):
            try:
                # Get existing user
                user = await self.repository.get_by_id(user_id)
                if not user:
                    raise UserNotFoundError(user_id=user_id)

                # Validate branch assignments if branch-related fields are being updated
                await self._validate_branch_assignments_for_update(user, update_data)

                # Check for duplicates if unique fields are being updated
                await self._check_user_duplicates_for_update(user_id, update_data)

                # Handle password update
                if 'password' in update_data and update_data['password']:
                    from app.core.security import get_password_hash
                    update_data['password_hash'] = get_password_hash(update_data['password'])
                    del update_data['password']

                # Update user through repository
                updated_user = await self.repository.update(user_id, update_data)

                return updated_user

            except (UserNotFoundError, UserValidationError, DatabaseOperationError):
                raise
            except Exception as e:
                raise DatabaseOperationError(
                    operation="update_user",
                    reason=f"Unexpected error updating user {user_id}: {str(e)}"
                )

    async def delete_user(self, user_id: UUID, deleted_by: UUID, permanent: bool = False) -> bool:
        """
        Delete user (soft delete by default).

        Args:
            user_id: The user ID to delete
            deleted_by: ID of user performing deletion
            permanent: Whether to permanently delete

        Returns:
            True if deletion successful

        Raises:
            UserNotFoundError: If user not found
            DatabaseOperationError: If deletion fails
        """
        async with self.error_handler.handle_operation("delete_user", db_session=self.db):
            try:
                if permanent:
                    return await self.repository.permanent_delete(user_id)
                else:
                    return await self.repository.soft_delete(user_id, deleted_by)

            except (UserNotFoundError, DatabaseOperationError):
                raise
            except Exception as e:
                raise DatabaseOperationError(
                    operation="delete_user",
                    reason=f"Unexpected error deleting user {user_id}: {str(e)}"
                )

    async def restore_user(self, user_id: UUID) -> bool:
        """
        Restore a soft-deleted user.

        Args:
            user_id: The user ID to restore

        Returns:
            True if restoration successful

        Raises:
            UserNotFoundError: If user not found
            DatabaseOperationError: If restoration fails
        """
        async with self.error_handler.handle_operation("restore_user", db_session=self.db):
            try:
                return await self.repository.restore(user_id)

            except (UserNotFoundError, DatabaseOperationError):
                raise
            except Exception as e:
                raise DatabaseOperationError(
                    operation="restore_user",
                    reason=f"Unexpected error restoring user {user_id}: {str(e)}"
                )

    async def list_users(
        self,
        role: Optional[str] = None,
        branch_id: Optional[UUID] = None,
        department_id: Optional[UUID] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        search_fields: Optional[List[str]] = None,
        created_from: Optional[date] = None,
        created_to: Optional[date] = None,
        last_login_from: Optional[date] = None,
        last_login_to: Optional[date] = None,
        activity_level: Optional[str] = None,
        inactive_days: Optional[int] = None,
        include_deleted: bool = False,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        page: int = 1,
        size: int = 10
    ) -> Tuple[List[User], int]:
        """
        List users with advanced filtering and pagination.

        Args:
            Various filter parameters

        Returns:
            Tuple of (users list, total count)
        """
        async with self.error_handler.handle_operation("list_users", db_session=self.db):
            try:
                return await self.repository.get_users_with_filters(
                    role=role,
                    branch_id=branch_id,
                    department_id=department_id,
                    status=status,
                    search=search,
                    search_fields=search_fields,
                    created_from=created_from,
                    created_to=created_to,
                    last_login_from=last_login_from,
                    last_login_to=last_login_to,
                    activity_level=activity_level,
                    inactive_days=inactive_days,
                    include_deleted=include_deleted,
                    sort_by=sort_by,
                    sort_order=sort_order,
                    page=page,
                    size=size
                )

            except DatabaseOperationError:
                raise
            except Exception as e:
                raise DatabaseOperationError(
                    operation="list_users",
                    reason=f"Unexpected error listing users: {str(e)}"
                )

    async def change_user_status(
        self,
        user_id: UUID,
        new_status: str,
        reason: str,
        changed_by: UUID
    ) -> Dict[str, Any]:
        """
        Change user status with validation and audit trail.

        Args:
            user_id: The user ID
            new_status: New status to set
            reason: Reason for status change
            changed_by: ID of user making the change

        Returns:
            Dictionary with status change information

        Raises:
            UserNotFoundError: If user not found
            UserStatusTransitionError: If status transition is invalid
            DatabaseOperationError: If database operation fails
        """
        async with self.error_handler.handle_operation("change_user_status", db_session=self.db):
            try:
                # Get current user
                user = await self.repository.get_by_id(user_id)
                if not user:
                    raise UserNotFoundError(user_id=user_id)

                old_status = user.status

                # Validate status transition
                if not can_transition_status(old_status, new_status):
                    allowed = get_allowed_transitions(old_status)
                    raise UserStatusTransitionError(old_status, new_status, allowed)

                # Update user status
                now = datetime.now(timezone.utc)
                update_data = {
                    'status': new_status,
                    'status_reason': reason,
                    'status_changed_at': now,
                    'status_changed_by': changed_by
                }

                await self.repository.update(user_id, update_data)

                return {
                    "user_id": user_id,
                    "old_status": old_status,
                    "new_status": new_status,
                    "reason": reason,
                    "changed_by": changed_by,
                    "changed_at": now,
                    "allowed_transitions": get_allowed_transitions(new_status)
                }

            except (UserNotFoundError, UserStatusTransitionError, DatabaseOperationError):
                raise
            except Exception as e:
                raise DatabaseOperationError(
                    operation="change_user_status",
                    reason=f"Unexpected error changing user status: {str(e)}"
                )

    async def bulk_update_status(
        self,
        user_ids: List[UUID],
        new_status: str,
        reason: str,
        changed_by: UUID
    ) -> Dict[str, Any]:
        """
        Bulk update user status with validation.

        Args:
            user_ids: List of user IDs to update
            new_status: New status to set
            reason: Reason for status change
            changed_by: ID of user making the change

        Returns:
            Dictionary with bulk operation results

        Raises:
            UserStatusTransitionError: If any status transition is invalid
            DatabaseOperationError: If database operation fails
        """
        async with self.error_handler.handle_operation("bulk_update_status", db_session=self.db):
            try:
                # Create bulk operation record
                bulk_operation = BulkOperation(
                    operation_type="status_update",
                    performed_by=changed_by,
                    target_criteria={
                        "user_ids": [str(uid) for uid in user_ids],
                        "filters": "manual_selection"
                    },
                    changes_applied={
                        "new_status": new_status,
                        "reason": reason
                    },
                    total_records=len(user_ids),
                    status="processing"
                )
                self.db.add(bulk_operation)
                await self.db.flush()

                # Perform bulk update through repository
                successful_updates, failed_updates = await self.repository.bulk_update_status(
                    user_ids, new_status, reason, changed_by
                )

                # Update bulk operation record
                now = datetime.now(timezone.utc)
                bulk_operation.successful_records = len(successful_updates)
                bulk_operation.failed_records = len(failed_updates)
                bulk_operation.status = "completed" if len(failed_updates) == 0 else "partial_failure"
                bulk_operation.completed_at = now

                if failed_updates:
                    bulk_operation.error_details = {"failed_users": failed_updates}

                await self.db.commit()

                return {
                    "operation_id": bulk_operation.id,
                    "total_users": len(user_ids),
                    "successful_updates": len(successful_updates),
                    "failed_updates": len(failed_updates),
                    "status": bulk_operation.status,
                    "errors": failed_updates if failed_updates else None,
                    "updated_users": successful_updates,
                    "failed_users": failed_updates
                }

            except DatabaseOperationError:
                raise
            except Exception as e:
                raise DatabaseOperationError(
                    operation="bulk_update_status",
                    reason=f"Unexpected error in bulk status update: {str(e)}"
                )

    async def update_user_activity(self, user_id: UUID, activity_type: str = "login") -> bool:
        """
        Update user activity information.

        Args:
            user_id: The user ID
            activity_type: Type of activity

        Returns:
            True if update successful

        Raises:
            UserNotFoundError: If user not found
        """
        async with self.error_handler.handle_operation("update_user_activity", db_session=self.db):
            try:
                return await self.repository.update_user_activity(user_id, activity_type)

            except (UserNotFoundError, DatabaseOperationError):
                raise
            except Exception as e:
                raise DatabaseOperationError(
                    operation="update_user_activity",
                    reason=f"Unexpected error updating user activity: {str(e)}"
                )

    async def increment_failed_login(self, user_id: UUID) -> bool:
        """
        Increment failed login attempts.

        Args:
            user_id: The user ID

        Returns:
            True if update successful

        Raises:
            UserNotFoundError: If user not found
        """
        async with self.error_handler.handle_operation("increment_failed_login", db_session=self.db):
            try:
                return await self.repository.increment_failed_login(user_id)

            except (UserNotFoundError, DatabaseOperationError):
                raise
            except Exception as e:
                raise DatabaseOperationError(
                    operation="increment_failed_login",
                    reason=f"Unexpected error incrementing failed login: {str(e)}"
                )

    async def get_user_statistics(self) -> Dict[str, Any]:
        """
        Get comprehensive user statistics.

        Returns:
            Dictionary containing user statistics
        """
        async with self.error_handler.handle_operation("get_user_statistics", db_session=self.db):
            try:
                return await self.repository.get_user_statistics()

            except DatabaseOperationError:
                raise
            except Exception as e:
                raise DatabaseOperationError(
                    operation="get_user_statistics",
                    reason=f"Unexpected error getting user statistics: {str(e)}"
                )

    async def get_dormant_users(self, inactive_days: int = 90, exclude_roles: Optional[List[str]] = None) -> List[User]:
        """
        Get dormant users based on inactivity.

        Args:
            inactive_days: Days of inactivity threshold
            exclude_roles: Roles to exclude

        Returns:
            List of dormant users
        """
        async with self.error_handler.handle_operation("get_dormant_users", db_session=self.db):
            try:
                return await self.repository.get_dormant_users(inactive_days, exclude_roles)

            except DatabaseOperationError:
                raise
            except Exception as e:
                raise DatabaseOperationError(
                    operation="get_dormant_users",
                    reason=f"Unexpected error getting dormant users: {str(e)}"
                )

    async def auto_update_dormant_users(
        self,
        inactive_days: int = 90,
        new_status: str = "inactive",
        reason: str = "Automatically marked inactive due to prolonged inactivity",
        performed_by: UUID = None,
        dry_run: bool = True
    ) -> Dict[str, Any]:
        """
        Automatically update status of dormant users.

        Args:
            inactive_days: Days of inactivity threshold
            new_status: Status to assign to dormant users
            reason: Reason for status change
            performed_by: ID of user performing the operation
            dry_run: If True, only simulate the operation

        Returns:
            Dictionary with operation results
        """
        async with self.error_handler.handle_operation("auto_update_dormant_users", db_session=self.db):
            try:
                # Get dormant users
                dormant_users = await self.repository.get_dormant_users(inactive_days)

                if not dormant_users:
                    return {
                        "message": "No dormant users found",
                        "dormant_users_found": 0,
                        "dry_run": dry_run
                    }

                # Perform updates if not dry run
                if not dry_run:
                    user_ids = [user.id for user in dormant_users]
                    result = await self.bulk_update_status(user_ids, new_status, reason, performed_by)

                    return {
                        "message": f"Updated {result['successful_updates']} of {result['total_users']} dormant users",
                        "dormant_users_found": len(dormant_users),
                        "result": result,
                        "dry_run": False
                    }
                else:
                    return {
                        "message": f"Would update {len(dormant_users)} dormant users",
                        "dormant_users_found": len(dormant_users),
                        "dormant_user_ids": [str(user.id) for user in dormant_users],
                        "dry_run": True
                    }

            except (DatabaseOperationError, UserStatusTransitionError):
                raise
            except Exception as e:
                raise DatabaseOperationError(
                    operation="auto_update_dormant_users",
                    reason=f"Unexpected error in auto update dormant users: {str(e)}"
                )

    async def get_users_needing_onboarding(self, days_threshold: int = 7) -> List[User]:
        """
        Get users who need onboarding attention.

        Args:
            days_threshold: Days threshold for pending onboarding

        Returns:
            List of users needing onboarding
        """
        async with self.error_handler.handle_operation("get_users_needing_onboarding", db_session=self.db):
            try:
                return await self.repository.get_users_needing_onboarding(days_threshold)

            except DatabaseOperationError:
                raise
            except Exception as e:
                raise DatabaseOperationError(
                    operation="get_users_needing_onboarding",
                    reason=f"Unexpected error getting users needing onboarding: {str(e)}"
                )

    async def update_onboarding_status(
        self,
        user_id: UUID,
        completed: bool,
        completed_by: UUID,
        notes: Optional[str] = None
    ) -> bool:
        """
        Update user onboarding status.

        Args:
            user_id: The user ID
            completed: Whether onboarding is completed
            completed_by: ID of user completing the onboarding
            notes: Optional notes

        Returns:
            True if update successful

        Raises:
            UserNotFoundError: If user not found
        """
        async with self.error_handler.handle_operation("update_onboarding_status", db_session=self.db):
            try:
                return await self.repository.update_onboarding_status(user_id, completed, completed_by, notes)

            except (UserNotFoundError, DatabaseOperationError):
                raise
            except Exception as e:
                raise DatabaseOperationError(
                    operation="update_onboarding_status",
                    reason=f"Unexpected error updating onboarding status: {str(e)}"
                )

    async def export_users_csv(
        self,
        role: Optional[str] = None,
        branch_id: Optional[UUID] = None,
        department_id: Optional[UUID] = None,
        status: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> str:
        """
        Export users to CSV format.

        Args:
            Various filter parameters

        Returns:
            CSV content as string
        """
        async with self.error_handler.handle_operation("export_users_csv", db_session=self.db):
            try:
                # Get users with filters
                users, _ = await self.repository.get_users_with_filters(
                    role=role,
                    branch_id=branch_id,
                    department_id=department_id,
                    status=status,
                    created_from=date_from,
                    created_to=date_to,
                    page=1,
                    size=10000  # Large page size for export
                )

                # Create CSV content
                output = io.StringIO()
                writer = csv.writer(output)

                # Write header
                writer.writerow([
                    'Employee ID',
                    'Username',
                    'Email',
                    'First Name',
                    'Last Name',
                    'Phone Number',
                    'Role',
                    'Status',
                    'Status Reason',
                    'Department',
                    'Branch',
                    'Position',
                    'Portfolio Manager',
                    'Line Manager',
                    'Last Login',
                    'Login Count',
                    'Created At',
                    'Updated At'
                ])

                # Write data rows
                for user in users:
                    writer.writerow([
                        user.employee_id or '',
                        user.username,
                        user.email,
                        user.first_name,
                        user.last_name,
                        user.phone_number or '',
                        user.role,
                        user.status,
                        user.status_reason or '',
                        user.department.name if user.department else '',
                        user.branch.name if user.branch else '',
                        user.position.name if user.position else '',
                        f"{user.portfolio.first_name} {user.portfolio.last_name}" if user.portfolio else '',
                        f"{user.line_manager.first_name} {user.line_manager.last_name}" if user.line_manager else '',
                        user.last_login_at.isoformat() if user.last_login_at else '',
                        str(user.login_count or 0),
                        user.created_at.isoformat() if user.created_at else '',
                        user.updated_at.isoformat() if user.updated_at else ''
                    ])

                output.seek(0)
                return output.getvalue()

            except DatabaseOperationError:
                raise
            except Exception as e:
                raise DatabaseOperationError(
                    operation="export_users_csv",
                    reason=f"Unexpected error exporting users to CSV: {str(e)}"
                )

    async def _validate_branch_assignments(self, user_data: Dict[str, Any]) -> None:
        """Validate branch assignments for user creation."""
        try:
            user_branch_id = user_data.get('branch_id')
            portfolio_id = user_data.get('portfolio_id')
            line_manager_id = user_data.get('line_manager_id')

            await self.repository.validate_branch_assignments(user_branch_id, portfolio_id, line_manager_id)

        except DatabaseOperationError as e:
            if "Portfolio manager must be from the same branch" in str(e) or "Line manager must be from the same branch" in str(e):
                raise UserBranchAssignmentError(
                    user_branch_id or UUID('00000000-0000-0000-0000-000000000000'),
                    user_branch_id or UUID('00000000-0000-0000-0000-000000000000'),
                    "portfolio" if "Portfolio manager" in str(e) else "line_manager"
                )
            raise

    async def _validate_branch_assignments_for_update(self, existing_user: User, update_data: Dict[str, Any]) -> None:
        """Validate branch assignments for user update."""
        try:
            # Determine the branch ID to use for validation
            user_branch_id = update_data.get('branch_id', existing_user.branch_id)
            portfolio_id = update_data.get('portfolio_id', existing_user.portfolio_id)
            line_manager_id = update_data.get('line_manager_id', existing_user.line_manager_id)

            await self.repository.validate_branch_assignments(user_branch_id, portfolio_id, line_manager_id)

        except DatabaseOperationError as e:
            if "Portfolio manager must be from the same branch" in str(e) or "Line manager must be from the same branch" in str(e):
                raise UserBranchAssignmentError(
                    user_branch_id or UUID('00000000-0000-0000-0000-000000000000'),
                    user_branch_id or UUID('00000000-0000-0000-0000-000000000000'),
                    "portfolio" if "Portfolio manager" in str(e) else "line_manager"
                )
            raise

    async def _check_user_duplicates(self, user_data: Dict[str, Any]) -> None:
        """Check for duplicate users during creation."""
        try:
            # Check username
            if 'username' in user_data:
                existing = await self.repository.get_by_username(user_data['username'])
                if existing:
                    raise DuplicateUserError('username', user_data['username'], existing.id)

            # Check email
            if 'email' in user_data:
                existing = await self.repository.get_by_email(user_data['email'])
                if existing:
                    raise DuplicateUserError('email', user_data['email'], existing.id)

            # Check employee_id
            if 'employee_id' in user_data and user_data['employee_id']:
                existing = await self.repository.get_by_employee_id(user_data['employee_id'])
                if existing:
                    raise DuplicateUserError('employee_id', user_data['employee_id'], existing.id)

        except DuplicateUserError:
            raise
        except Exception as e:
            raise DatabaseOperationError(
                operation="check_user_duplicates",
                reason=f"Error checking user duplicates: {str(e)}"
            )

    async def _check_user_duplicates_for_update(self, user_id: UUID, update_data: Dict[str, Any]) -> None:
        """Check for duplicate users during update."""
        try:
            # Check username
            if 'username' in update_data:
                existing = await self.repository.get_by_username(update_data['username'])
                if existing and existing.id != user_id:
                    raise DuplicateUserError('username', update_data['username'], existing.id)

            # Check email
            if 'email' in update_data:
                existing = await self.repository.get_by_email(update_data['email'])
                if existing and existing.id != user_id:
                    raise DuplicateUserError('email', update_data['email'], existing.id)

            # Check employee_id
            if 'employee_id' in update_data and update_data['employee_id']:
                existing = await self.repository.get_by_employee_id(update_data['employee_id'])
                if existing and existing.id != user_id:
                    raise DuplicateUserError('employee_id', update_data['employee_id'], existing.id)

        except DuplicateUserError:
            raise
        except Exception as e:
            raise DatabaseOperationError(
                operation="check_user_duplicates_for_update",
                reason=f"Error checking user duplicates for update: {str(e)}"
            )

    async def get_allowed_status_transitions(self, user_id: UUID) -> List[str]:
        """
        Get allowed status transitions for a user.

        Args:
            user_id: The user ID

        Returns:
            List of allowed status values

        Raises:
            UserNotFoundError: If user not found
        """
        async with self.error_handler.handle_operation("get_allowed_status_transitions", db_session=self.db):
            try:
                user = await self.repository.get_by_id(user_id)
                if not user:
                    raise UserNotFoundError(user_id=user_id)

                return get_allowed_transitions(user.status)

            except (UserNotFoundError, DatabaseOperationError):
                raise
            except Exception as e:
                raise DatabaseOperationError(
                    operation="get_allowed_status_transitions",
                    reason=f"Unexpected error getting allowed status transitions: {str(e)}"
                )