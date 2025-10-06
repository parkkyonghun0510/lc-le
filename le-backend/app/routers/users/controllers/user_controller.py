"""
User controller for HTTP request/response handling of core CRUD operations.

This module provides the controller layer for user management, handling HTTP
requests and responses while delegating business logic to the service layer.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import date
import logging

from fastapi import HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.schemas import UserCreate, UserUpdate, UserResponse, PaginatedResponse
from app.routers.users.services.user_service import UserService
from app.routers.users.services.user_query_service import UserQueryService
from app.routers.users.services.user_error_handler import user_error_handler
from app.routers.users.utils.user_exceptions import (
    UserNotFoundError,
    UserValidationError,
    DatabaseOperationError,
    UserAuthorizationError
)

logger = logging.getLogger(__name__)


class UserController:
    """Controller for user CRUD operations."""

    def __init__(self, db_session: AsyncSession):
        """Initialize controller with database session."""
        self.db = db_session
        self.user_service = UserService(db_session)
        self.query_service = UserQueryService(db_session)
        self.error_handler = user_error_handler

    async def create_user(self, user_data: UserCreate, current_user: User) -> UserResponse:
        """
        Create a new user.

        Args:
            user_data: User creation data
            current_user: Current authenticated user

        Returns:
            Created user response

        Raises:
            HTTPException: If creation fails or unauthorized
        """
        try:
            # Check authorization
            if current_user.role not in ["admin", "manager"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to create users"
                )

            logger.info(f"Creating user: {user_data.username} by {current_user.username}")

            # Create user through service
            db_user = await self.user_service.create_user(
                user_data=user_data.dict(),
                created_by=current_user.id
            )

            # Convert to response format
            return await self._user_to_response(db_user)

        except UserValidationError as e:
            logger.error(f"User validation error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except DatabaseOperationError as e:
            logger.error(f"Database error creating user: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
        except Exception as e:
            logger.error(f"Unexpected error creating user: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred"
            )

    async def get_user(self, user_id: UUID, current_user: User) -> UserResponse:
        """
        Get user by ID.

        Args:
            user_id: User ID to retrieve
            current_user: Current authenticated user

        Returns:
            User response

        Raises:
            HTTPException: If user not found or unauthorized
        """
        try:
            # Check authorization
            if current_user.role not in ["admin", "manager"] and current_user.id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to access this user"
                )

            logger.info(f"Retrieving user: {user_id} by {current_user.username}")

            # Get user through service
            db_user = await self.user_service.get_user_with_relationships(user_id)
            if not db_user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            return await self._user_to_response(db_user)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error retrieving user {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve user"
            )

    async def update_user(
        self,
        user_id: UUID,
        user_update: UserUpdate,
        current_user: User
    ) -> UserResponse:
        """
        Update user.

        Args:
            user_id: User ID to update
            user_update: Update data
            current_user: Current authenticated user

        Returns:
            Updated user response

        Raises:
            HTTPException: If update fails or unauthorized
        """
        try:
            # Check authorization
            if current_user.role not in ["admin", "manager"] and current_user.id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to update this user"
                )

            logger.info(f"Updating user: {user_id} by {current_user.username}")

            # Update user through service
            update_data = user_update.dict(exclude_unset=True)
            db_user = await self.user_service.update_user(
                user_id=user_id,
                update_data=update_data,
                updated_by=current_user.id
            )

            return await self._user_to_response(db_user)

        except UserNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        except UserValidationError as e:
            logger.error(f"User validation error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except DatabaseOperationError as e:
            logger.error(f"Database error updating user: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user"
            )
        except Exception as e:
            logger.error(f"Unexpected error updating user {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred"
            )

    async def delete_user(self, user_id: UUID, current_user: User) -> Dict[str, Any]:
        """
        Soft delete user.

        Args:
            user_id: User ID to delete
            current_user: Current authenticated user

        Returns:
            Deletion confirmation

        Raises:
            HTTPException: If deletion fails or unauthorized
        """
        try:
            # Check authorization
            if current_user.role != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to delete users"
                )

            logger.info(f"Soft deleting user: {user_id} by {current_user.username}")

            # Delete user through service
            await self.user_service.delete_user(
                user_id=user_id,
                deleted_by=current_user.id,
                permanent=False
            )

            return {"message": "User soft deleted successfully"}

        except UserNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        except DatabaseOperationError as e:
            logger.error(f"Database error deleting user: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete user"
            )
        except Exception as e:
            logger.error(f"Unexpected error deleting user {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred"
            )

    async def restore_user(self, user_id: UUID, current_user: User) -> Dict[str, Any]:
        """
        Restore soft-deleted user.

        Args:
            user_id: User ID to restore
            current_user: Current authenticated user

        Returns:
            Restoration confirmation

        Raises:
            HTTPException: If restoration fails or unauthorized
        """
        try:
            # Check authorization
            if current_user.role != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to restore users"
                )

            logger.info(f"Restoring user: {user_id} by {current_user.username}")

            # Restore user through service
            await self.user_service.restore_user(user_id)

            return {"message": "User restored successfully"}

        except UserNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        except DatabaseOperationError as e:
            logger.error(f"Database error restoring user: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to restore user"
            )
        except Exception as e:
            logger.error(f"Unexpected error restoring user {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred"
            )

    async def list_users(
        self,
        current_user: User,
        role: Optional[str] = None,
        branch_id: Optional[str] = None,
        department_id: Optional[str] = None,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
        created_from: Optional[date] = None,
        created_to: Optional[date] = None,
        last_login_from: Optional[date] = None,
        last_login_to: Optional[date] = None,
        activity_level: Optional[str] = None,
        inactive_days: Optional[int] = None,
        search_fields: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        include_deleted: bool = False,
        page: int = 1,
        size: int = 10
    ) -> PaginatedResponse:
        """
        List users with advanced filtering and pagination.

        Args:
            current_user: Current authenticated user
            Various filter parameters

        Returns:
            Paginated user list response

        Raises:
            HTTPException: If listing fails or unauthorized
        """
        try:
            # Check authorization
            if current_user.role not in ["admin", "manager"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to list users"
                )

            # Only admins can view soft-deleted users
            if include_deleted and current_user.role != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view deleted users"
                )

            logger.info(f"Listing users by {current_user.username}, page {page}, size {size}")

            # Parse UUID parameters
            branch_uuid = UUID(branch_id) if branch_id else None
            department_uuid = UUID(department_id) if department_id else None

            # Parse search fields
            search_fields_list = None
            if search_fields:
                search_fields_list = [field.strip() for field in search_fields.split(',')]

            # Get users through service
            users, total = await self.user_service.list_users(
                role=role,
                branch_id=branch_uuid,
                department_id=department_uuid,
                status=status_filter,
                search=search,
                search_fields=search_fields_list,
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

            # Convert to response format
            user_responses = []
            for user in users:
                user_response = await self._user_to_response(user)
                user_responses.append(user_response)

            # Calculate pagination info
            pages = (total + size - 1) // size

            return PaginatedResponse(
                items=user_responses,
                total=total,
                page=page,
                size=size,
                pages=pages
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error listing users: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve users"
            )

    async def get_user_statistics(self, current_user: User) -> Dict[str, Any]:
        """
        Get user statistics.

        Args:
            current_user: Current authenticated user

        Returns:
            User statistics

        Raises:
            HTTPException: If retrieval fails or unauthorized
        """
        try:
            # Check authorization
            if current_user.role not in ["admin", "manager"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view user statistics"
                )

            logger.info(f"Retrieving user statistics by {current_user.username}")

            # Get statistics through service
            return await self.user_service.get_user_statistics()

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error retrieving user statistics: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve user statistics"
            )

    async def _user_to_response(self, db_user: User) -> UserResponse:
        """
        Convert database user to response format.

        Args:
            db_user: Database user object

        Returns:
            User response object
        """
        try:
            # Convert to dictionary to avoid lazy loading issues
            user_data = {
                "id": db_user.id,
                "username": db_user.username,
                "email": db_user.email,
                "first_name": db_user.first_name,
                "last_name": db_user.last_name,
                "phone_number": db_user.phone_number,
                "role": db_user.role,
                "status": db_user.status,
                "status_reason": db_user.status_reason,
                "status_changed_at": db_user.status_changed_at,
                "status_changed_by": db_user.status_changed_by,
                "last_activity_at": db_user.last_activity_at,
                "login_count": db_user.login_count,
                "failed_login_attempts": db_user.failed_login_attempts,
                "onboarding_completed": db_user.onboarding_completed,
                "onboarding_completed_at": db_user.onboarding_completed_at,
                "department_id": db_user.department_id,
                "branch_id": db_user.branch_id,
                "position_id": db_user.position_id,
                "portfolio_id": db_user.portfolio_id,
                "line_manager_id": db_user.line_manager_id,
                "profile_image_url": db_user.profile_image_url,
                "employee_id": db_user.employee_id,
                "created_at": db_user.created_at,
                "updated_at": db_user.updated_at,
                "last_login_at": db_user.last_login_at,
                "department": db_user.department,
                "branch": db_user.branch,
                "position": db_user.position,
                "portfolio": db_user.portfolio,
                "line_manager": db_user.line_manager,
                "status_changed_by_user": db_user.status_changed_by_user,
            }

            # Convert nested SQLAlchemy objects to dictionaries
            if user_data.get("department"):
                user_data["department"] = {
                    "id": user_data["department"].id,
                    "name": user_data["department"].name,
                    "code": user_data["department"].code,
                    "description": user_data["department"].description,
                    "is_active": user_data["department"].is_active,
                    "created_at": user_data["department"].created_at,
                    "updated_at": user_data["department"].updated_at,
                } if hasattr(user_data["department"], 'id') else None

            if user_data.get("branch"):
                user_data["branch"] = {
                    "id": user_data["branch"].id,
                    "name": user_data["branch"].name,
                    "code": user_data["branch"].code,
                    "address": user_data["branch"].address,
                    "phone_number": user_data["branch"].phone_number,
                    "email": user_data["branch"].email,
                    "is_active": user_data["branch"].is_active,
                    "created_at": user_data["branch"].created_at,
                    "updated_at": user_data["branch"].updated_at,
                } if hasattr(user_data["branch"], 'id') else None

            if user_data.get("position"):
                user_data["position"] = {
                    "id": user_data["position"].id,
                    "name": user_data["position"].name,
                    "description": user_data["position"].description,
                    "is_active": user_data["position"].is_active,
                    "created_at": user_data["position"].created_at,
                    "updated_at": user_data["position"].updated_at,
                } if hasattr(user_data["position"], 'id') else None

            # Handle portfolio and line_manager relationships
            if user_data.get("portfolio"):
                user_data["portfolio"] = {
                    "id": user_data["portfolio"].id,
                    "username": user_data["portfolio"].username,
                    "email": user_data["portfolio"].email,
                    "first_name": user_data["portfolio"].first_name,
                    "last_name": user_data["portfolio"].last_name,
                    "phone_number": user_data["portfolio"].phone_number,
                    "role": user_data["portfolio"].role,
                    "status": user_data["portfolio"].status,
                    "status_reason": user_data["portfolio"].status_reason,
                    "status_changed_at": user_data["portfolio"].status_changed_at,
                    "status_changed_by": user_data["portfolio"].status_changed_by,
                    "last_activity_at": user_data["portfolio"].last_activity_at,
                    "login_count": user_data["portfolio"].login_count,
                    "failed_login_attempts": user_data["portfolio"].failed_login_attempts,
                    "onboarding_completed": user_data["portfolio"].onboarding_completed,
                    "onboarding_completed_at": user_data["portfolio"].onboarding_completed_at,
                    "department_id": user_data["portfolio"].department_id,
                    "branch_id": user_data["portfolio"].branch_id,
                    "position_id": user_data["portfolio"].position_id,
                    "portfolio_id": user_data["portfolio"].portfolio_id,
                    "line_manager_id": user_data["portfolio"].line_manager_id,
                    "profile_image_url": user_data["portfolio"].profile_image_url,
                    "employee_id": user_data["portfolio"].employee_id,
                    "created_at": user_data["portfolio"].created_at,
                    "updated_at": user_data["portfolio"].updated_at,
                    "last_login_at": user_data["portfolio"].last_login_at,
                    "department": None,  # Avoid infinite nesting
                    "branch": None,      # Avoid infinite nesting
                    "position": None,    # Avoid infinite nesting
                    "portfolio": None,   # Avoid infinite nesting
                    "line_manager": None, # Avoid infinite nesting
                    "status_changed_by_user": None
                } if hasattr(user_data["portfolio"], 'id') else None

            if user_data.get("line_manager"):
                user_data["line_manager"] = {
                    "id": user_data["line_manager"].id,
                    "username": user_data["line_manager"].username,
                    "email": user_data["line_manager"].email,
                    "first_name": user_data["line_manager"].first_name,
                    "last_name": user_data["line_manager"].last_name,
                    "phone_number": user_data["line_manager"].phone_number,
                    "role": user_data["line_manager"].role,
                    "status": user_data["line_manager"].status,
                    "status_reason": user_data["line_manager"].status_reason,
                    "status_changed_at": user_data["line_manager"].status_changed_at,
                    "status_changed_by": user_data["line_manager"].status_changed_by,
                    "last_activity_at": user_data["line_manager"].last_activity_at,
                    "login_count": user_data["line_manager"].login_count,
                    "failed_login_attempts": user_data["line_manager"].failed_login_attempts,
                    "onboarding_completed": user_data["line_manager"].onboarding_completed,
                    "onboarding_completed_at": user_data["line_manager"].onboarding_completed_at,
                    "department_id": user_data["line_manager"].department_id,
                    "branch_id": user_data["line_manager"].branch_id,
                    "position_id": user_data["line_manager"].position_id,
                    "portfolio_id": user_data["line_manager"].portfolio_id,
                    "line_manager_id": user_data["line_manager"].line_manager_id,
                    "profile_image_url": user_data["line_manager"].profile_image_url,
                    "employee_id": user_data["line_manager"].employee_id,
                    "created_at": user_data["line_manager"].created_at,
                    "updated_at": user_data["line_manager"].updated_at,
                    "last_login_at": user_data["line_manager"].last_login_at,
                    "department": None,  # Avoid infinite nesting
                    "branch": None,      # Avoid infinite nesting
                    "position": None,    # Avoid infinite nesting
                    "portfolio": None,   # Avoid infinite nesting
                    "line_manager": None, # Avoid infinite nesting
                    "status_changed_by_user": None
                } if hasattr(user_data["line_manager"], 'id') else None

            return UserResponse.model_validate(user_data)

        except Exception as e:
            logger.error(f"Error converting user to response: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to format user response"
            )