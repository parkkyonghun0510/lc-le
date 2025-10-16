"""
User repository for data access operations.

This module provides the data access layer for user management operations,
encapsulating all database interactions and providing a clean interface
for the service layer.
"""

from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime, timezone, date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, func, desc, text
from sqlalchemy.orm import selectinload, noload

from app.models import User, Department, Branch, Position, BulkOperation, Employee
from app.routers.users.utils.user_exceptions import (
    UserNotFoundError,
    UserAlreadyExistsError,
    DatabaseOperationError
)
from app.routers.users.services.user_error_handler import user_error_handler


class UserRepository:
    """Repository class for user data access operations."""

    def __init__(self, db_session: AsyncSession):
        """Initialize repository with database session."""
        self.db = db_session
        self.error_handler = user_error_handler

    async def get_by_id(self, user_id: UUID, include_deleted: bool = False) -> Optional[User]:
        """
        Get user by ID.

        Args:
            user_id: The user ID to look for
            include_deleted: Whether to include soft-deleted users

        Returns:
            User object or None if not found
        """
        try:
            query = select(User).where(User.id == user_id)

            if not include_deleted:
                query = query.where(User.is_deleted == False)

            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            raise DatabaseOperationError(
                operation="get_user_by_id",
                reason=f"Failed to retrieve user {user_id}: {str(e)}"
            )

    async def get_by_username(self, username: str, include_deleted: bool = False) -> Optional[User]:
        """
        Get user by username.

        Args:
            username: The username to look for
            include_deleted: Whether to include soft-deleted users

        Returns:
            User object or None if not found
        """
        try:
            query = select(User).where(User.username == username)

            if not include_deleted:
                query = query.where(User.is_deleted == False)

            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            raise DatabaseOperationError(
                operation="get_user_by_username",
                reason=f"Failed to retrieve user '{username}': {str(e)}"
            )

    async def get_by_email(self, email: str, include_deleted: bool = False) -> Optional[User]:
        """
        Get user by email.

        Args:
            email: The email to look for
            include_deleted: Whether to include soft-deleted users

        Returns:
            User object or None if not found
        """
        try:
            query = select(User).where(User.email == email)

            if not include_deleted:
                query = query.where(User.is_deleted == False)

            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            raise DatabaseOperationError(
                operation="get_user_by_email",
                reason=f"Failed to retrieve user '{email}': {str(e)}"
            )

    async def get_by_employee_id(self, employee_id: str, include_deleted: bool = False) -> Optional[User]:
        """
        Get user by employee ID.

        Args:
            employee_id: The employee ID to look for
            include_deleted: Whether to include soft-deleted users

        Returns:
            User object or None if not found
        """
        try:
            query = select(User).where(User.employee_id == employee_id)

            if not include_deleted:
                query = query.where(User.is_deleted == False)

            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            raise DatabaseOperationError(
                operation="get_user_by_employee_id",
                reason=f"Failed to retrieve user with employee ID '{employee_id}': {str(e)}"
            )

    async def create(self, user_data: Dict[str, Any]) -> User:
        """
        Create a new user.

        Args:
            user_data: Dictionary containing user data

        Returns:
            Created user object

        Raises:
            DatabaseOperationError: If creation fails
        """
        try:
            # Remove password from user_data if present (should be handled separately)
            password = user_data.pop('password', None)
            password_hash = user_data.pop('password_hash', None)

            # Create user instance
            db_user = User(**user_data)

            # Set password hash if provided
            if password_hash:
                db_user.password_hash = password_hash
            elif password:
                from app.core.security import get_password_hash
                db_user.password_hash = get_password_hash(password)

            self.db.add(db_user)
            await self.db.flush()  # Get the ID without committing
            await self.db.refresh(db_user)

            return db_user
        except Exception as e:
            await self.db.rollback()
            raise DatabaseOperationError(
                operation="create_user",
                reason=f"Failed to create user: {str(e)}"
            )

    async def update(self, user_id: UUID, update_data: Dict[str, Any]) -> User:
        """
        Update an existing user.

        Args:
            user_id: The user ID to update
            update_data: Dictionary containing fields to update

        Returns:
            Updated user object

        Raises:
            UserNotFoundError: If user not found
            DatabaseOperationError: If update fails
        """
        try:
            # Get existing user
            user = await self.get_by_id(user_id)
            if not user:
                raise UserNotFoundError(user_id=user_id)

            # Update fields
            for field, value in update_data.items():
                if hasattr(user, field):
                    setattr(user, field, value)

            await self.db.commit()
            await self.db.refresh(user)

            return user
        except UserNotFoundError:
            raise
        except Exception as e:
            await self.db.rollback()
            raise DatabaseOperationError(
                operation="update_user",
                reason=f"Failed to update user {user_id}: {str(e)}"
            )

    async def soft_delete(self, user_id: UUID, deleted_by: UUID) -> bool:
        """
        Soft delete a user.

        Args:
            user_id: The user ID to delete
            deleted_by: ID of user performing the deletion

        Returns:
            True if deletion successful

        Raises:
            UserNotFoundError: If user not found
            DatabaseOperationError: If deletion fails
        """
        try:
            user = await self.get_by_id(user_id)
            if not user:
                raise UserNotFoundError(user_id=user_id)

            if user.is_deleted:
                raise DatabaseOperationError(
                    operation="soft_delete_user",
                    reason=f"User {user_id} is already soft deleted"
                )

            user.is_deleted = True
            user.deleted_at = datetime.now(timezone.utc)
            user.deleted_by = deleted_by

            await self.db.commit()
            return True
        except UserNotFoundError:
            raise
        except Exception as e:
            await self.db.rollback()
            raise DatabaseOperationError(
                operation="soft_delete_user",
                reason=f"Failed to soft delete user {user_id}: {str(e)}"
            )

    async def restore(self, user_id: UUID) -> bool:
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
        try:
            user = await self.get_by_id(user_id, include_deleted=True)
            if not user:
                raise UserNotFoundError(user_id=user_id)

            if not user.is_deleted:
                raise DatabaseOperationError(
                    operation="restore_user",
                    reason=f"User {user_id} is not soft deleted"
                )

            user.is_deleted = False
            user.deleted_at = None
            user.deleted_by = None

            await self.db.commit()
            return True
        except UserNotFoundError:
            raise
        except Exception as e:
            await self.db.rollback()
            raise DatabaseOperationError(
                operation="restore_user",
                reason=f"Failed to restore user {user_id}: {str(e)}"
            )

    async def permanent_delete(self, user_id: UUID) -> bool:
        """
        Permanently delete a user from database.

        Args:
            user_id: The user ID to permanently delete

        Returns:
            True if deletion successful

        Raises:
            UserNotFoundError: If user not found
            DatabaseOperationError: If deletion fails
        """
        try:
            user = await self.get_by_id(user_id, include_deleted=True)
            if not user:
                raise UserNotFoundError(user_id=user_id)

            await self.db.delete(user)
            await self.db.commit()
            return True
        except UserNotFoundError:
            raise
        except Exception as e:
            await self.db.rollback()
            raise DatabaseOperationError(
                operation="permanent_delete_user",
                reason=f"Failed to permanently delete user {user_id}: {str(e)}"
            )

    async def get_users_with_filters(
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
        Get users with advanced filtering and pagination.

        Args:
            role: Filter by role
            branch_id: Filter by branch
            department_id: Filter by department
            status: Filter by status
            search: Search term
            search_fields: Fields to search in
            created_from: Created from date
            created_to: Created to date
            last_login_from: Last login from date
            last_login_to: Last login to date
            activity_level: Activity level filter
            inactive_days: Custom inactive days threshold
            include_deleted: Whether to include soft-deleted users
            sort_by: Field to sort by
            sort_order: Sort order (asc/desc)
            page: Page number
            size: Page size

        Returns:
            Tuple of (users list, total count)
        """
        try:
            # Build base query with eager loading
            query = (
                select(User)
                .options(
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
                .where(User.is_deleted == False if not include_deleted else True)
            )

            # Apply filters
            if role:
                query = query.where(User.role == role)

            if branch_id:
                query = query.where(User.branch_id == branch_id)

            if department_id:
                query = query.where(User.department_id == department_id)

            if status:
                query = query.where(User.status == status)

            # Enhanced search functionality
            if search:
                search_term = f"%{search}%"
                if search_fields:
                    search_conditions = []
                    fields = [field.strip() for field in search_fields]

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
                else:
                    # Default search in all fields
                    query = query.where(
                        (User.username.ilike(search_term)) |
                        (User.email.ilike(search_term)) |
                        (User.first_name.ilike(search_term)) |
                        (User.last_name.ilike(search_term)) |
                        (User.employee_id.ilike(search_term) if User.employee_id.is_not(None) else False)
                    )

            # Date range filtering
            if created_from:
                query = query.where(User.created_at >= created_from)

            if created_to:
                end_date = datetime.combine(created_to, datetime.max.time())
                query = query.where(User.created_at <= end_date)

            if last_login_from:
                query = query.where(User.last_login_at >= last_login_from)

            if last_login_to:
                end_date = datetime.combine(last_login_to, datetime.max.time())
                query = query.where(User.last_login_at <= end_date)

            # Activity level filtering
            if activity_level:
                now = datetime.now(timezone.utc)

                if activity_level == 'never_logged_in':
                    query = query.where(User.last_login_at.is_(None))
                elif activity_level == 'dormant':
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
                elif activity_level == 'active':
                    active_threshold = now - timedelta(days=30)
                    query = query.where(
                        and_(
                            User.status == 'active',
                            User.last_login_at >= active_threshold
                        )
                    )

            # Custom inactive days filtering
            if inactive_days is not None:
                threshold_date = datetime.now(timezone.utc) - timedelta(days=inactive_days)
                query = query.where(
                    or_(
                        User.last_login_at < threshold_date,
                        User.last_login_at.is_(None)
                    )
                )

            # Get total count
            count_query = select(func.count()).select_from(User)
            if not include_deleted:
                count_query = count_query.where(User.is_deleted == False)

            # Apply same filters to count query
            if role:
                count_query = count_query.where(User.role == role)
            if branch_id:
                count_query = count_query.where(User.branch_id == branch_id)
            if department_id:
                count_query = count_query.where(User.department_id == department_id)
            if status:
                count_query = count_query.where(User.status == status)

            if search:
                search_term = f"%{search}%"
                if search_fields:
                    search_conditions = []
                    fields = [field.strip() for field in search_fields]

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

            count_result = await self.db.execute(count_query)
            total = int(count_result.scalar() or 0)

            # Apply sorting
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

            result = await self.db.execute(query)
            users = result.scalars().all()

            return users, total

        except Exception as e:
            raise DatabaseOperationError(
                operation="get_users_with_filters",
                reason=f"Failed to retrieve users with filters: {str(e)}"
            )

    async def get_dormant_users(self, inactive_days: int = 90, exclude_roles: Optional[List[str]] = None) -> List[User]:
        """
        Get users who haven't logged in for specified number of days.

        Args:
            inactive_days: Number of days of inactivity
            exclude_roles: Roles to exclude from dormant check

        Returns:
            List of dormant users
        """
        try:
            threshold_date = datetime.now(timezone.utc) - timedelta(days=inactive_days)

            query = (
                select(User)
                .options(
                    selectinload(User.department),
                    selectinload(User.branch),
                    selectinload(User.position)
                )
                .where(
                    and_(
                        User.is_deleted == False,
                        User.status == 'active',
                        or_(
                            User.last_login_at < threshold_date,
                            User.last_login_at.is_(None)
                        )
                    )
                )
            )

            if exclude_roles:
                query = query.where(User.role.not_in(exclude_roles))

            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            raise DatabaseOperationError(
                operation="get_dormant_users",
                reason=f"Failed to retrieve dormant users: {str(e)}"
            )

    async def update_user_activity(self, user_id: UUID, activity_type: str = "login") -> bool:
        """
        Update user activity information.

        Args:
            user_id: The user ID
            activity_type: Type of activity (login, logout, etc.)

        Returns:
            True if update successful

        Raises:
            UserNotFoundError: If user not found
        """
        try:
            user = await self.get_by_id(user_id)
            if not user:
                raise UserNotFoundError(user_id=user_id)

            now = datetime.now(timezone.utc)

            if activity_type == "login":
                user.last_activity_at = now
                user.login_count += 1
                user.last_login_at = now
                user.failed_login_attempts = 0  # Reset failed attempts on successful login

            await self.db.commit()
            return True
        except UserNotFoundError:
            raise
        except Exception as e:
            await self.db.rollback()
            raise DatabaseOperationError(
                operation="update_user_activity",
                reason=f"Failed to update user activity for {user_id}: {str(e)}"
            )

    async def increment_failed_login(self, user_id: UUID) -> bool:
        """
        Increment failed login attempts for a user.

        Args:
            user_id: The user ID

        Returns:
            True if update successful

        Raises:
            UserNotFoundError: If user not found
        """
        try:
            user = await self.get_by_id(user_id)
            if not user:
                raise UserNotFoundError(user_id=user_id)

            user.failed_login_attempts += 1
            user.last_activity_at = datetime.now(timezone.utc)

            await self.db.commit()
            return True
        except UserNotFoundError:
            raise
        except Exception as e:
            await self.db.rollback()
            raise DatabaseOperationError(
                operation="increment_failed_login",
                reason=f"Failed to increment failed login attempts for {user_id}: {str(e)}"
            )

    async def get_user_statistics(self) -> Dict[str, Any]:
        """
        Get user statistics for dashboard.

        Returns:
            Dictionary containing various user statistics
        """
        try:
            # Total users
            total_result = await self.db.execute(
                select(func.count()).select_from(User).where(User.is_deleted == False)
            )
            total_users = int(total_result.scalar() or 0)

            # Users by status
            status_result = await self.db.execute(
                select(User.status, func.count(User.id))
                .select_from(User)
                .where(User.is_deleted == False)
                .group_by(User.status)
            )
            status_counts = {status: count for status, count in status_result.all()}

            # Users by role
            role_result = await self.db.execute(
                select(User.role, func.count(User.id))
                .select_from(User)
                .where(User.is_deleted == False)
                .group_by(User.role)
            )
            role_counts = {role: count for role, count in role_result.all()}

            # Recent activity (last 30 days)
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            active_result = await self.db.execute(
                select(func.count())
                .select_from(User)
                .where(
                    and_(
                        User.is_deleted == False,
                        User.last_login_at >= thirty_days_ago
                    )
                )
            )
            active_users = int(active_result.scalar() or 0)

            # Never logged in users
            never_logged_result = await self.db.execute(
                select(func.count())
                .select_from(User)
                .where(
                    and_(
                        User.is_deleted == False,
                        User.last_login_at.is_(None)
                    )
                )
            )
            never_logged_in = int(never_logged_result.scalar() or 0)

            # Onboarding completion
            onboarding_result = await self.db.execute(
                select(func.count())
                .select_from(User)
                .where(
                    and_(
                        User.is_deleted == False,
                        User.onboarding_completed == True
                    )
                )
            )
            onboarding_completed = int(onboarding_result.scalar() or 0)

            return {
                "total_users": total_users,
                "active_users": active_users,
                "never_logged_in": never_logged_in,
                "onboarding_completed": onboarding_completed,
                "status_distribution": status_counts,
                "role_distribution": role_counts,
                "onboarding_completion_rate": (onboarding_completed / total_users * 100) if total_users > 0 else 0
            }
        except Exception as e:
            raise DatabaseOperationError(
                operation="get_user_statistics",
                reason=f"Failed to retrieve user statistics: {str(e)}"
            )

    async def bulk_update_status(
        self,
        user_ids: List[UUID],
        new_status: str,
        reason: str,
        changed_by: UUID
    ) -> Tuple[List[UUID], List[Dict[str, Any]]]:
        """
        Bulk update user status.

        Args:
            user_ids: List of user IDs to update
            new_status: New status to set
            reason: Reason for status change
            changed_by: ID of user making the change

        Returns:
            Tuple of (successful_updates, failed_updates)
        """
        try:
            successful_updates = []
            failed_updates = []

            # Get users to update
            result = await self.db.execute(
                select(User).where(User.id.in_(user_ids), User.is_deleted == False)
            )
            users = result.scalars().all()

            if len(users) != len(user_ids):
                found_ids = {user.id for user in users}
                missing_ids = set(user_ids) - found_ids
                for user_id in missing_ids:
                    failed_updates.append({
                        "user_id": str(user_id),
                        "error": "User not found"
                    })

            now = datetime.now(timezone.utc)

            # Update each user
            for user in users:
                try:
                    old_status = user.status
                    user.status = new_status
                    user.status_reason = reason
                    user.status_changed_at = now
                    user.status_changed_by = changed_by

                    successful_updates.append(user.id)
                except Exception as e:
                    failed_updates.append({
                        "user_id": str(user.id),
                        "username": user.username,
                        "error": str(e)
                    })

            await self.db.commit()
            return successful_updates, failed_updates
        except Exception as e:
            await self.db.rollback()
            raise DatabaseOperationError(
                operation="bulk_update_status",
                reason=f"Failed to bulk update user status: {str(e)}"
            )

    async def get_users_needing_onboarding(self, days_threshold: int = 7) -> List[User]:
        """
        Get users who need onboarding attention.

        Args:
            days_threshold: Days threshold for pending onboarding

        Returns:
            List of users needing onboarding
        """
        try:
            threshold_date = datetime.now(timezone.utc) - timedelta(days=days_threshold)

            query = (
                select(User)
                .options(
                    selectinload(User.department),
                    selectinload(User.branch),
                    selectinload(User.position)
                )
                .where(
                    and_(
                        User.is_deleted == False,
                        User.onboarding_completed == False,
                        User.created_at <= threshold_date
                    )
                )
                .order_by(User.created_at.asc())
            )

            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            raise DatabaseOperationError(
                operation="get_users_needing_onboarding",
                reason=f"Failed to retrieve users needing onboarding: {str(e)}"
            )

    async def update_onboarding_status(self, user_id: UUID, completed: bool, completed_by: UUID, notes: Optional[str] = None) -> bool:
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
        try:
            user = await self.get_by_id(user_id)
            if not user:
                raise UserNotFoundError(user_id=user_id)

            now = datetime.now(timezone.utc)

            user.onboarding_completed = completed
            if completed:
                user.onboarding_completed_at = now
            else:
                user.onboarding_completed_at = None

            await self.db.commit()
            return True
        except UserNotFoundError:
            raise
        except Exception as e:
            await self.db.rollback()
            raise DatabaseOperationError(
                operation="update_onboarding_status",
                reason=f"Failed to update onboarding status for {user_id}: {str(e)}"
            )

    async def validate_branch_assignments(self, user_branch_id: Optional[UUID], portfolio_id: Optional[UUID], line_manager_id: Optional[UUID]) -> bool:
        """
        Validate that portfolio and line managers are from the same branch as the user.

        Args:
            user_branch_id: The user's branch ID
            portfolio_id: Portfolio manager ID
            line_manager_id: Line manager ID

        Returns:
            True if validation passes

        Raises:
            DatabaseOperationError: If validation fails
        """
        try:
            if not user_branch_id:
                return True  # No branch assigned, skip validation

            # Check portfolio manager
            if portfolio_id:
                result = await self.db.execute(
                    select(User).where(User.id == portfolio_id, User.is_deleted == False)
                )
                portfolio_manager = result.scalar_one_or_none()
                if portfolio_manager and portfolio_manager.branch_id != user_branch_id:
                    raise DatabaseOperationError(
                        operation="validate_branch_assignments",
                        reason="Portfolio manager must be from the same branch as the user"
                    )

            # Check line manager
            if line_manager_id:
                result = await self.db.execute(
                    select(User).where(User.id == line_manager_id, User.is_deleted == False)
                )
                line_manager = result.scalar_one_or_none()
                if line_manager and line_manager.branch_id != user_branch_id:
                    raise DatabaseOperationError(
                        operation="validate_branch_assignments",
                        reason="Line manager must be from the same branch as the user"
                    )

            return True
        except DatabaseOperationError:
            raise
        except Exception as e:
            raise DatabaseOperationError(
                operation="validate_branch_assignments",
                reason=f"Failed to validate branch assignments: {str(e)}"
            )

    async def get_user_with_relationships(self, user_id: UUID, include_deleted: bool = False) -> Optional[User]:
        """
        Get user with all relationships eagerly loaded.

        Args:
            user_id: The user ID
            include_deleted: Whether to include soft-deleted users

        Returns:
            User object with relationships or None if not found
        """
        try:
            query = (
                select(User)
                .options(
                    selectinload(User.department),
                    selectinload(User.branch),
                    selectinload(User.position).options(noload(Position.users)),
                    selectinload(User.status_changed_by_user),
                    selectinload(User.portfolio).options(
                        selectinload(Employee.department),
                        selectinload(Employee.branch),
                    ),
                    selectinload(User.line_manager).options(
                        selectinload(Employee.department),
                        selectinload(Employee.branch),
                    )
                )
                .where(User.id == user_id)
            )

            if not include_deleted:
                query = query.where(User.is_deleted == False)

            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            raise DatabaseOperationError(
                operation="get_user_with_relationships",
                reason=f"Failed to retrieve user with relationships {user_id}: {str(e)}"
            )