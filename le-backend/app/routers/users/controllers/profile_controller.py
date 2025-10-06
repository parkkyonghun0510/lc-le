"""
Profile controller for self-service operations (/me endpoints).

This module provides the controller layer for user profile management,
handling self-service operations where users can manage their own profiles.
"""

from typing import Dict, Any, Optional
import logging

from fastapi import HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.schemas import UserUpdate, UserResponse
from app.routers.users.services.user_service import UserService
from app.routers.users.services.user_error_handler import user_error_handler
from app.routers.users.utils.user_exceptions import (
    UserNotFoundError,
    UserValidationError,
    DatabaseOperationError
)

logger = logging.getLogger(__name__)


class ProfileController:
    """Controller for user profile self-service operations."""

    def __init__(self, db_session: AsyncSession):
        """Initialize controller with database session."""
        self.db = db_session
        self.user_service = UserService(db_session)
        self.error_handler = user_error_handler

    async def get_my_profile(self, current_user: User) -> UserResponse:
        """
        Get current user's profile.

        Args:
            current_user: Current authenticated user

        Returns:
            User profile response

        Raises:
            HTTPException: If retrieval fails
        """
        try:
            logger.info(f"Retrieving profile for user: {current_user.username}")

            # Get user with relationships through service
            db_user = await self.user_service.get_user_with_relationships(current_user.id)
            if not db_user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User profile not found"
                )

            return await self._user_to_response(db_user)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error retrieving profile for user {current_user.id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve user profile"
            )

    async def update_my_profile(self, user_update: UserUpdate, current_user: User) -> UserResponse:
        """
        Update current user's profile.

        Args:
            user_update: Profile update data
            current_user: Current authenticated user

        Returns:
            Updated user profile response

        Raises:
            HTTPException: If update fails
        """
        try:
            logger.info(f"Updating profile for user: {current_user.username}")

            # Update user through service
            update_data = user_update.dict(exclude_unset=True)
            db_user = await self.user_service.update_user(
                user_id=current_user.id,
                update_data=update_data,
                updated_by=current_user.id
            )

            return await self._user_to_response(db_user)

        except UserNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        except UserValidationError as e:
            logger.error(f"Profile validation error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except DatabaseOperationError as e:
            logger.error(f"Database error updating profile: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile"
            )
        except Exception as e:
            logger.error(f"Unexpected error updating profile for user {current_user.id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred"
            )

    async def replace_my_profile(self, user_update: UserUpdate, current_user: User) -> UserResponse:
        """
        Replace current user's entire profile.

        Args:
            user_update: Complete profile replacement data
            current_user: Current authenticated user

        Returns:
            Updated user profile response

        Raises:
            HTTPException: If replacement fails
        """
        try:
            logger.info(f"Replacing profile for user: {current_user.username}")

            # Replace user profile through service
            update_data = user_update.dict()
            db_user = await self.user_service.update_user(
                user_id=current_user.id,
                update_data=update_data,
                updated_by=current_user.id
            )

            return await self._user_to_response(db_user)

        except UserNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        except UserValidationError as e:
            logger.error(f"Profile validation error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except DatabaseOperationError as e:
            logger.error(f"Database error replacing profile: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to replace profile"
            )
        except Exception as e:
            logger.error(f"Unexpected error replacing profile for user {current_user.id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred"
            )

    async def update_my_activity(self, current_user: User) -> Dict[str, Any]:
        """
        Update current user's activity status.

        Args:
            current_user: Current authenticated user

        Returns:
            Activity update confirmation

        Raises:
            HTTPException: If update fails
        """
        try:
            logger.info(f"Updating activity for user: {current_user.username}")

            # Update user activity through service
            await self.user_service.update_user_activity(
                user_id=current_user.id,
                activity_type="profile_access"
            )

            return {
                "message": "Activity updated successfully",
                "timestamp": current_user.last_activity_at
            }

        except UserNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        except DatabaseOperationError as e:
            logger.error(f"Database error updating activity: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update activity"
            )
        except Exception as e:
            logger.error(f"Unexpected error updating activity for user {current_user.id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred"
            )

    async def get_my_onboarding_status(self, current_user: User) -> Dict[str, Any]:
        """
        Get current user's onboarding status.

        Args:
            current_user: Current authenticated user

        Returns:
            Onboarding status information

        Raises:
            HTTPException: If retrieval fails
        """
        try:
            logger.info(f"Retrieving onboarding status for user: {current_user.username}")

            # Get user with relationships
            db_user = await self.user_service.get_user_with_relationships(current_user.id)
            if not db_user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            return {
                "onboarding_completed": db_user.onboarding_completed,
                "onboarding_completed_at": db_user.onboarding_completed_at,
                "department_assigned": db_user.department_id is not None,
                "branch_assigned": db_user.branch_id is not None,
                "position_assigned": db_user.position_id is not None,
                "portfolio_assigned": db_user.portfolio_id is not None,
                "line_manager_assigned": db_user.line_manager_id is not None,
                "profile_completed": all([
                    db_user.first_name,
                    db_user.last_name,
                    db_user.phone_number,
                    db_user.employee_id
                ])
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error retrieving onboarding status for user {current_user.id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve onboarding status"
            )

    async def complete_my_onboarding(self, current_user: User, notes: Optional[str] = None) -> Dict[str, Any]:
        """
        Mark current user's onboarding as completed.

        Args:
            current_user: Current authenticated user
            notes: Optional completion notes

        Returns:
            Onboarding completion confirmation

        Raises:
            HTTPException: If completion fails
        """
        try:
            logger.info(f"Completing onboarding for user: {current_user.username}")

            # Update onboarding status through service
            await self.user_service.update_onboarding_status(
                user_id=current_user.id,
                completed=True,
                completed_by=current_user.id,
                notes=notes
            )

            return {
                "message": "Onboarding completed successfully",
                "completed_at": current_user.onboarding_completed_at,
                "notes": notes
            }

        except UserNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        except DatabaseOperationError as e:
            logger.error(f"Database error completing onboarding: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to complete onboarding"
            )
        except Exception as e:
            logger.error(f"Unexpected error completing onboarding for user {current_user.id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred"
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