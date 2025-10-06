"""
Centralized error handler service for the user management system.

This service provides consistent error handling, logging, and response formatting
for all user management operations.
"""

import logging
import traceback
from typing import Optional, Dict, Any, Union
from uuid import UUID
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError

from app.routers.users.utils.user_exceptions import (
    UserManagementException,
    UserNotFoundError,
    UserAlreadyExistsError,
    UserValidationError,
    DuplicateUserError,
    UserStatusTransitionError,
    UserAuthorizationError,
    UserSoftDeleteError,
    UserRestoreError,
    UserImportError,
    UserExportError,
    UserActivityError,
    UserLifecycleError,
    UserCacheError,
    UserNotificationError,
    UserAnalyticsError,
    BulkOperationError,
    DatabaseOperationError,
    UserBranchAssignmentError,
    UserOnboardingError,
    UserOffboardingError,
    USER_EXCEPTION_MAP
)


class UserErrorHandler:
    """Centralized error handler for user management operations."""

    def __init__(self, logger_name: str = "user_management"):
        """Initialize the error handler with a logger."""
        self.logger = logging.getLogger(logger_name)
        self._setup_logging()

    def _setup_logging(self):
        """Set up logging configuration for user management errors."""
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)

    def _log_error(
        self,
        error: Exception,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[UUID] = None,
        operation: Optional[str] = None
    ):
        """Log error with context information."""
        error_context = {
            "error_type": type(error).__name__,
            "error_message": str(error),
            "user_id": str(user_id) if user_id else None,
            "operation": operation,
            "context": context or {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        if isinstance(error, UserManagementException):
            error_context.update({
                "error_code": error.error_code,
                "status_code": error.status_code,
                "exception_context": error.context
            })

        self.logger.error(
            f"User management error: {error_context}",
            exc_info=True
        )

    def _create_error_response(
        self,
        error: Exception,
        include_debug_info: bool = False
    ) -> Dict[str, Any]:
        """Create standardized error response."""
        if isinstance(error, UserManagementException):
            response = {
                "success": False,
                "error": {
                    "code": error.error_code,
                    "message": error.detail,
                    "type": type(error).__name__,
                    "context": error.context
                },
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

            if include_debug_info:
                response["error"]["traceback"] = traceback.format_exc()

            return response
        else:
            # Handle non-user management exceptions
            response = {
                "success": False,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An internal error occurred",
                    "type": type(error).__name__,
                    "context": {}
                },
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

            if include_debug_info:
                response["error"]["traceback"] = traceback.format_exc()
                response["error"]["original_message"] = str(error)

            return response

    async def handle_exception(
        self,
        error: Exception,
        user_id: Optional[UUID] = None,
        operation: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        rollback_transaction: bool = False,
        db_session: Optional[AsyncSession] = None
    ) -> JSONResponse:
        """
        Handle any exception and return appropriate response.

        Args:
            error: The exception to handle
            user_id: ID of the user related to the error
            operation: Name of the operation that failed
            context: Additional context information
            rollback_transaction: Whether to rollback database transaction
            db_session: Database session to rollback if needed

        Returns:
            JSONResponse with appropriate error information
        """
        # Log the error
        self._log_error(error, context, user_id, operation)

        # Rollback transaction if requested
        if rollback_transaction and db_session:
            try:
                await db_session.rollback()
                self.logger.info("Database transaction rolled back due to error")
            except Exception as rollback_error:
                self.logger.error(f"Failed to rollback transaction: {rollback_error}")

        # Create error response
        error_response = self._create_error_response(error)

        # Determine status code
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        if isinstance(error, UserManagementException):
            status_code = error.status_code
        elif isinstance(error, HTTPException):
            status_code = error.status_code

        return JSONResponse(
            status_code=status_code,
            content=error_response
        )

    async def handle_user_not_found(
        self,
        user_id: Optional[UUID] = None,
        username: Optional[str] = None,
        email: Optional[str] = None,
        operation: Optional[str] = None
    ) -> UserNotFoundError:
        """Handle user not found scenarios."""
        return UserNotFoundError(user_id=user_id, username=username, email=email)

    async def handle_duplicate_user(
        self,
        field: str,
        value: str,
        existing_user_id: Optional[UUID] = None,
        operation: Optional[str] = None
    ) -> DuplicateUserError:
        """Handle duplicate user scenarios."""
        return DuplicateUserError(field=field, value=value, existing_user_id=existing_user_id)

    async def handle_validation_error(
        self,
        field: str,
        value: Any,
        reason: str,
        suggestions: Optional[list] = None,
        operation: Optional[str] = None
    ) -> UserValidationError:
        """Handle user validation errors."""
        return UserValidationError(field=field, value=value, reason=reason, suggestions=suggestions)

    async def handle_status_transition_error(
        self,
        current_status: str,
        target_status: str,
        allowed_transitions: list,
        operation: Optional[str] = None
    ) -> UserStatusTransitionError:
        """Handle invalid status transition errors."""
        return UserStatusTransitionError(
            current_status=current_status,
            target_status=target_status,
            allowed_transitions=allowed_transitions
        )

    async def handle_authorization_error(
        self,
        operation: str,
        required_role: Optional[str] = None,
        user_role: Optional[str] = None
    ) -> UserAuthorizationError:
        """Handle authorization errors."""
        return UserAuthorizationError(
            operation=operation,
            required_role=required_role,
            user_role=user_role
        )

    async def handle_database_error(
        self,
        error: SQLAlchemyError,
        operation: str,
        table: Optional[str] = None,
        user_id: Optional[UUID] = None
    ) -> DatabaseOperationError:
        """Handle database operation errors with enhanced constraint violation handling."""
        if isinstance(error, IntegrityError):
            # Handle specific integrity errors with detailed constraint analysis
            error_msg = str(error.orig) if hasattr(error, 'orig') else str(error)
            constraint_info = self._analyze_constraint_violation(error_msg, table)

            if constraint_info:
                return DatabaseOperationError(
                    operation=operation,
                    reason=constraint_info['reason'],
                    table=table,
                    constraint_name=constraint_info.get('constraint_name'),
                    suggestions=constraint_info.get('suggestions')
                )
            elif "duplicate" in error_msg.lower() or "unique" in error_msg.lower():
                return DatabaseOperationError(
                    operation=operation,
                    reason="Duplicate data constraint violation",
                    table=table,
                    suggestions=["Check for existing records with the same unique values"]
                )
            else:
                return DatabaseOperationError(
                    operation=operation,
                    reason=f"Data integrity error: {error_msg}",
                    table=table
                )
        elif isinstance(error, OperationalError):
            return DatabaseOperationError(
                operation=operation,
                reason=f"Database operational error: {str(error)}",
                table=table
            )
        else:
            return DatabaseOperationError(
                operation=operation,
                reason=f"Database error: {str(error)}",
                table=table
            )

    def _analyze_constraint_violation(self, error_msg: str, table: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Analyze constraint violation error messages and provide specific guidance."""

        # User status constraint violations
        if table == "users" and "ck_users_status_valid" in error_msg:
            return {
                'constraint_name': 'ck_users_status_valid',
                'reason': 'Invalid user status value provided',
                'suggestions': [
                    'Valid status values are: active, inactive, suspended, pending',
                    'Check the current user status before updating',
                    'Ensure status transitions follow business rules'
                ]
            }

        # Customer application status constraint violations
        if table == "customer_applications" and "ck_customer_applications_status_valid" in error_msg:
            return {
                'constraint_name': 'ck_customer_applications_status_valid',
                'reason': 'Invalid application status value provided',
                'suggestions': [
                    'Valid status values are: draft, submitted, approved, rejected, disbursed',
                    'Check the current application status before updating',
                    'Ensure status transitions follow workflow rules'
                ]
            }

        # Loan date relationship constraint violations
        if table == "customer_applications" and "ck_loan_dates_valid" in error_msg:
            return {
                'constraint_name': 'ck_loan_dates_valid',
                'reason': 'Loan start date must be before or equal to loan end date',
                'suggestions': [
                    'Ensure loan_start_date <= loan_end_date',
                    'Check that both dates are valid calendar dates',
                    'Verify the loan term calculation is correct'
                ]
            }

        # Interest rate range constraint violations
        if table == "customer_applications" and "ck_interest_rate_range" in error_msg:
            return {
                'constraint_name': 'ck_interest_rate_range',
                'reason': 'Interest rate must be between 0 and 100 percent',
                'suggestions': [
                    'Interest rate must be >= 0 and <= 100',
                    'Check if the rate is entered as a percentage (e.g., 12.5 for 12.5%)',
                    'Verify the interest rate calculation formula'
                ]
            }

        # Minimum age constraint violations
        if table == "customer_applications" and "ck_minimum_age" in error_msg:
            return {
                'constraint_name': 'ck_minimum_age',
                'reason': 'Customer must be at least 18 years old',
                'suggestions': [
                    'Customer date of birth must result in age >= 18 years',
                    'Verify the date of birth is entered correctly',
                    'Check if the customer meets age requirements for loan applications'
                ]
            }

        # Customer identification unique constraint violations
        if table == "customer_applications" and "uq_customer_identification" in error_msg:
            return {
                'constraint_name': 'uq_customer_identification',
                'reason': 'Customer with this ID card type and number already exists',
                'suggestions': [
                    'Check if customer already has an application with this ID',
                    'Verify the ID card type and number are correct',
                    'Consider if this is the same customer applying again'
                ]
            }

        # File path unique constraint violations
        if table == "files" and "uq_file_paths" in error_msg:
            return {
                'constraint_name': 'uq_file_paths',
                'reason': 'File with this path already exists',
                'suggestions': [
                    'Check if file already exists at this location',
                    'Use a different filename or path',
                    'Consider if this is a duplicate upload'
                ]
            }

        # Positive amount constraint violations
        if table == "customer_applications" and "ck_requested_amount_positive" in error_msg:
            return {
                'constraint_name': 'ck_requested_amount_positive',
                'reason': 'Requested loan amount must be greater than zero',
                'suggestions': [
                    'Enter a valid loan amount > 0',
                    'Check if amount is entered in correct currency units',
                    'Verify minimum loan amount requirements'
                ]
            }

        # Workflow status consistency constraint violations
        if table == "customer_applications" and "ck_workflow_status_consistency" in error_msg:
            return {
                'constraint_name': 'ck_workflow_status_consistency',
                'reason': 'Workflow status is inconsistent with application status',
                'suggestions': [
                    'Ensure workflow status matches application status',
                    'Check workflow progression rules',
                    'Verify status transition sequence'
                ]
            }

        # Check constraint violations (general)
        if "check constraint" in error_msg.lower() or "violates check constraint" in error_msg.lower():
            return {
                'constraint_name': 'unknown_check_constraint',
                'reason': 'Data violates database check constraint',
                'suggestions': [
                    'Review the data being inserted/updated',
                    'Check field validation rules',
                    'Verify data types and ranges'
                ]
            }

        return None

    async def handle_bulk_operation_error(
        self,
        operation: str,
        reason: str,
        operation_id: Optional[UUID] = None,
        failed_count: Optional[int] = None
    ) -> BulkOperationError:
        """Handle bulk operation errors."""
        return BulkOperationError(
            operation=operation,
            reason=reason,
            operation_id=operation_id,
            failed_count=failed_count
        )

    @asynccontextmanager
    async def handle_operation(
        self,
        operation: str,
        user_id: Optional[UUID] = None,
        db_session: Optional[AsyncSession] = None,
        auto_rollback: bool = True
    ):
        """
        Context manager for handling operations with automatic error handling.

        Usage:
            async with error_handler.handle_operation("create_user", user_id=user_id, db_session=db):
                # Perform operation
                pass
        """
        try:
            yield
        except UserManagementException:
            # Re-raise user management exceptions as-is
            raise
        except SQLAlchemyError as e:
            db_error = await self.handle_database_error(e, operation, user_id=user_id)
            if auto_rollback and db_session:
                await db_session.rollback()
            raise db_error
        except Exception as e:
            # Handle unexpected errors
            error_response = self._create_error_response(e)
            self._log_error(e, user_id=user_id, operation=operation)

            if auto_rollback and db_session:
                await db_session.rollback()

            raise UserManagementException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error in {operation}: {str(e)}",
                error_code="UNEXPECTED_ERROR",
                context={"original_error": type(e).__name__}
            )

    def create_success_response(
        self,
        data: Any = None,
        message: Optional[str] = None,
        operation: Optional[str] = None,
        user_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """Create standardized success response."""
        response = {
            "success": True,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        if data is not None:
            response["data"] = data

        if message:
            response["message"] = message

        if operation:
            response["operation"] = operation

        if user_id:
            response["user_id"] = str(user_id)

        return response

    def create_paginated_response(
        self,
        items: list,
        total: int,
        page: int,
        size: int,
        operation: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create standardized paginated response."""
        return {
            "success": True,
            "data": {
                "items": items,
                "total": total,
                "page": page,
                "size": size,
                "pages": (total + size - 1) // size
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "operation": operation
        }


# Global error handler instance
user_error_handler = UserErrorHandler()


def get_user_error_handler() -> UserErrorHandler:
    """Get the global user error handler instance."""
    return user_error_handler