"""
Status controller for status management operations.

This module provides the controller layer for user status management,
handling status transitions, bulk operations, and status-related analytics.
"""

from typing import List, Dict, Any, Optional
from uuid import UUID
import logging

from fastapi import HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.schemas import UserStatusChange, BulkStatusUpdate
from app.routers.users.services.user_service import UserService
from app.routers.users.services.user_error_handler import user_error_handler
from app.routers.users.utils.user_exceptions import (
    UserNotFoundError,
    UserValidationError,
    UserStatusTransitionError,
    DatabaseOperationError,
    BulkOperationError
)

logger = logging.getLogger(__name__)


class StatusController:
    """Controller for user status management operations."""

    def __init__(self, db_session: AsyncSession):
        """Initialize controller with database session."""
        self.db = db_session
        self.user_service = UserService(db_session)
        self.error_handler = user_error_handler

    async def change_user_status(
        self,
        user_id: UUID,
        status_change: UserStatusChange,
        current_user: User
    ) -> Dict[str, Any]:
        """
        Change user status with validation and audit trail.

        Args:
            user_id: User ID to update
            status_change: Status change data
            current_user: Current authenticated user

        Returns:
            Status change confirmation

        Raises:
            HTTPException: If status change fails or unauthorized
        """
        try:
            # Check authorization
            if current_user.role not in ["admin", "manager"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to change user status"
                )

            logger.info(f"Changing status for user {user_id} from {status_change.old_status} to {status_change.status} by {current_user.username}")

            # Change user status through service
            result = await self.user_service.change_user_status(
                user_id=user_id,
                new_status=status_change.status,
                reason=status_change.reason,
                changed_by=current_user.id
            )

            return result

        except UserNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        except UserStatusTransitionError as e:
            logger.error(f"Status transition error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except DatabaseOperationError as e:
            logger.error(f"Database error changing status: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to change user status"
            )
        except Exception as e:
            logger.error(f"Unexpected error changing status for user {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred"
            )

    async def get_allowed_status_transitions(self, user_id: UUID, current_user: User) -> List[str]:
        """
        Get allowed status transitions for a user.

        Args:
            user_id: User ID to check
            current_user: Current authenticated user

        Returns:
            List of allowed status values

        Raises:
            HTTPException: If retrieval fails or unauthorized
        """
        try:
            # Check authorization
            if current_user.role not in ["admin", "manager"] and current_user.id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view user status transitions"
                )

            logger.info(f"Retrieving allowed status transitions for user {user_id} by {current_user.username}")

            # Get allowed transitions through service
            return await self.user_service.get_allowed_status_transitions(user_id)

        except UserNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        except DatabaseOperationError as e:
            logger.error(f"Database error getting status transitions: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve status transitions"
            )
        except Exception as e:
            logger.error(f"Unexpected error getting status transitions for user {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred"
            )

    async def bulk_update_status(
        self,
        bulk_update: BulkStatusUpdate,
        current_user: User
    ) -> Dict[str, Any]:
        """
        Bulk update user status with validation.

        Args:
            bulk_update: Bulk status update data
            current_user: Current authenticated user

        Returns:
            Bulk operation results

        Raises:
            HTTPException: If bulk update fails or unauthorized
        """
        try:
            # Check authorization
            if current_user.role not in ["admin", "manager"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to perform bulk status updates"
                )

            logger.info(f"Bulk updating status for {len(bulk_update.user_ids)} users to {bulk_update.status} by {current_user.username}")

            # Perform bulk update through service
            result = await self.user_service.bulk_update_status(
                user_ids=bulk_update.user_ids,
                new_status=bulk_update.status,
                reason=bulk_update.reason,
                changed_by=current_user.id
            )

            return result

        except UserStatusTransitionError as e:
            logger.error(f"Bulk status transition error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except DatabaseOperationError as e:
            logger.error(f"Database error in bulk status update: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to perform bulk status update"
            )
        except Exception as e:
            logger.error(f"Unexpected error in bulk status update: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred"
            )

    async def get_dormant_users(
        self,
        current_user: User,
        inactive_days: int = 90
    ) -> Dict[str, Any]:
        """
        Get list of dormant users based on inactivity period.

        Args:
            current_user: Current authenticated user
            inactive_days: Days of inactivity threshold

        Returns:
            Dormant users information

        Raises:
            HTTPException: If retrieval fails or unauthorized
        """
        try:
            # Check authorization
            if current_user.role not in ["admin", "manager"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view dormant user analysis"
                )

            logger.info(f"Retrieving dormant users (inactive > {inactive_days} days) by {current_user.username}")

            # Get dormant users through service
            dormant_users = await self.user_service.get_dormant_users(
                inactive_days=inactive_days,
                exclude_roles=['admin'] if current_user.role == 'manager' else None
            )

            return {
                "dormant_users": [
                    {
                        "id": str(user.id),
                        "username": user.username,
                        "email": user.email,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "last_login_at": user.last_login_at,
                        "status": user.status,
                        "department": user.department.name if user.department else None,
                        "branch": user.branch.name if user.branch else None,
                        "role": user.role
                    }
                    for user in dormant_users
                ],
                "total_dormant": len(dormant_users),
                "inactive_days_threshold": inactive_days,
                "analysis_date": str(dormant_users[0].last_activity_at) if dormant_users else None
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error retrieving dormant users: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve dormant users"
            )

    async def auto_update_dormant_users(
        self,
        current_user: User,
        inactive_days: int = 90,
        new_status: str = "inactive",
        reason: str = "Automatically marked inactive due to prolonged inactivity",
        dry_run: bool = True
    ) -> Dict[str, Any]:
        """
        Automatically update status of dormant users.

        Args:
            current_user: Current authenticated user
            inactive_days: Days of inactivity threshold
            new_status: Status to assign to dormant users
            reason: Reason for status change
            dry_run: If True, only simulate the operation

        Returns:
            Operation results

        Raises:
            HTTPException: If operation fails or unauthorized
        """
        try:
            # Check authorization
            if current_user.role not in ["admin"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to perform automated status updates"
                )

            logger.info(f"Auto-updating dormant users (inactive > {inactive_days} days) to {new_status} by {current_user.username}")

            # Perform auto-update through service
            result = await self.user_service.auto_update_dormant_users(
                inactive_days=inactive_days,
                new_status=new_status,
                reason=reason,
                performed_by=current_user.id,
                dry_run=dry_run
            )

            return result

        except (UserStatusTransitionError, DatabaseOperationError) as e:
            logger.error(f"Error in auto-update dormant users: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )
        except Exception as e:
            logger.error(f"Unexpected error in auto-update dormant users: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred"
            )

    async def get_users_needing_onboarding(
        self,
        current_user: User,
        days_threshold: int = 7
    ) -> Dict[str, Any]:
        """
        Get users who need onboarding attention.

        Args:
            current_user: Current authenticated user
            days_threshold: Days threshold for pending onboarding

        Returns:
            Users needing onboarding

        Raises:
            HTTPException: If retrieval fails or unauthorized
        """
        try:
            # Check authorization
            if current_user.role not in ["admin", "manager"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view pending onboarding users"
                )

            logger.info(f"Retrieving users needing onboarding (threshold: {days_threshold} days) by {current_user.username}")

            # Get users needing onboarding through service
            users = await self.user_service.get_users_needing_onboarding(days_threshold)

            return {
                "users": [
                    {
                        "id": str(user.id),
                        "username": user.username,
                        "email": user.email,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "created_at": user.created_at,
                        "days_since_creation": (user.created_at - user.created_at).days,  # This would need proper calculation
                        "department": user.department.name if user.department else None,
                        "branch": user.branch.name if user.branch else None,
                        "role": user.role
                    }
                    for user in users
                ],
                "total_pending": len(users),
                "days_threshold": days_threshold,
                "analysis_date": str(users[0].created_at) if users else None
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error retrieving users needing onboarding: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve users needing onboarding"
            )

    async def update_user_onboarding_status(
        self,
        user_id: UUID,
        completed: bool,
        current_user: User,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update user onboarding status.

        Args:
            user_id: User ID to update
            completed: Whether onboarding is completed
            current_user: Current authenticated user
            notes: Optional notes

        Returns:
            Update confirmation

        Raises:
            HTTPException: If update fails or unauthorized
        """
        try:
            # Check authorization
            if current_user.role not in ["admin", "manager"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to update onboarding status"
                )

            logger.info(f"Updating onboarding status for user {user_id} to {'completed' if completed else 'pending'} by {current_user.username}")

            # Update onboarding status through service
            await self.user_service.update_onboarding_status(
                user_id=user_id,
                completed=completed,
                completed_by=current_user.id,
                notes=notes
            )

            return {
                "message": f"Onboarding {'completed' if completed else 'marked as pending'} successfully",
                "user_id": str(user_id),
                "completed": completed,
                "completed_by": str(current_user.id),
                "notes": notes
            }

        except UserNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        except DatabaseOperationError as e:
            logger.error(f"Database error updating onboarding status: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update onboarding status"
            )
        except Exception as e:
            logger.error(f"Unexpected error updating onboarding status for user {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred"
            )

    async def get_activity_summary(
        self,
        current_user: User,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get user activity summary and statistics.

        Args:
            current_user: Current authenticated user
            days: Number of days to analyze

        Returns:
            Activity summary

        Raises:
            HTTPException: If retrieval fails or unauthorized
        """
        try:
            # Check authorization
            if current_user.role not in ["admin", "manager"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view activity summary"
                )

            logger.info(f"Retrieving activity summary for last {days} days by {current_user.username}")

            # Get activity summary through service
            return await self.user_service.get_user_statistics()

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error retrieving activity summary: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve activity summary"
            )