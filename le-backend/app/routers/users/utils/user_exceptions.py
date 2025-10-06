"""
Custom exception classes for the user management system.

This module provides a comprehensive exception hierarchy for handling
various error conditions in the user management domain.
"""

from typing import Optional, Dict, Any, List
from uuid import UUID
from fastapi import HTTPException, status


class UserManagementException(HTTPException):
    """Base exception class for all user management related errors."""

    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code
        self.context = context or {}


class UserNotFoundError(UserManagementException):
    """Raised when a requested user is not found."""

    def __init__(self, user_id: Optional[UUID] = None, username: Optional[str] = None, email: Optional[str] = None):
        if user_id:
            detail = f"User with ID {user_id} not found"
        elif username:
            detail = f"User with username '{username}' not found"
        elif email:
            detail = f"User with email '{email}' not found"
        else:
            detail = "User not found"

        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="USER_NOT_FOUND",
            context={
                "user_id": str(user_id) if user_id else None,
                "username": username,
                "email": email
            }
        )


class UserAlreadyExistsError(UserManagementException):
    """Raised when trying to create a user that already exists."""

    def __init__(self, username: Optional[str] = None, email: Optional[str] = None, employee_id: Optional[str] = None):
        if username:
            detail = f"User with username '{username}' already exists"
        elif email:
            detail = f"User with email '{email}' already exists"
        elif employee_id:
            detail = f"User with employee ID '{employee_id}' already exists"
        else:
            detail = "User already exists"

        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code="USER_ALREADY_EXISTS",
            context={
                "username": username,
                "email": email,
                "employee_id": employee_id
            }
        )


class UserValidationError(UserManagementException):
    """Raised when user data validation fails."""

    def __init__(self, field: str, value: Any, reason: str, suggestions: Optional[List[str]] = None):
        detail = f"Validation failed for field '{field}': {reason}"

        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="USER_VALIDATION_ERROR",
            context={
                "field": field,
                "value": str(value),
                "reason": reason,
                "suggestions": suggestions or []
            }
        )


class DuplicateUserError(UserManagementException):
    """Raised when duplicate user data is detected."""

    def __init__(self, field: str, value: str, existing_user_id: Optional[UUID] = None):
        detail = f"Duplicate {field} '{value}' found"

        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code="DUPLICATE_USER_ERROR",
            context={
                "field": field,
                "value": value,
                "existing_user_id": str(existing_user_id) if existing_user_id else None
            }
        )


class UserStatusTransitionError(UserManagementException):
    """Raised when an invalid user status transition is attempted."""

    def __init__(self, current_status: str, target_status: str, allowed_transitions: List[str]):
        detail = f"Cannot transition from status '{current_status}' to '{target_status}'. Allowed transitions: {allowed_transitions}"

        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="INVALID_STATUS_TRANSITION",
            context={
                "current_status": current_status,
                "target_status": target_status,
                "allowed_transitions": allowed_transitions
            }
        )


class UserAuthorizationError(UserManagementException):
    """Raised when a user lacks authorization for an operation."""

    def __init__(self, operation: str, required_role: Optional[str] = None, user_role: Optional[str] = None):
        if required_role:
            detail = f"Operation '{operation}' requires role '{required_role}'"
        else:
            detail = f"Unauthorized to perform operation '{operation}'"

        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="USER_AUTHORIZATION_ERROR",
            context={
                "operation": operation,
                "required_role": required_role,
                "user_role": user_role
            }
        )


class UserSoftDeleteError(UserManagementException):
    """Raised when soft delete operations fail."""

    def __init__(self, user_id: UUID, reason: str):
        detail = f"Failed to soft delete user {user_id}: {reason}"

        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="SOFT_DELETE_ERROR",
            context={
                "user_id": str(user_id),
                "reason": reason
            }
        )


class UserRestoreError(UserManagementException):
    """Raised when user restore operations fail."""

    def __init__(self, user_id: UUID, reason: str):
        detail = f"Failed to restore user {user_id}: {reason}"

        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="USER_RESTORE_ERROR",
            context={
                "user_id": str(user_id),
                "reason": reason
            }
        )


class UserImportError(UserManagementException):
    """Raised when CSV import operations fail."""

    def __init__(self, reason: str, row_number: Optional[int] = None, field: Optional[str] = None):
        if row_number:
            detail = f"Import failed at row {row_number}"
            if field:
                detail += f", field '{field}'"
            detail += f": {reason}"
        else:
            detail = f"Import failed: {reason}"

        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="USER_IMPORT_ERROR",
            context={
                "reason": reason,
                "row_number": row_number,
                "field": field
            }
        )


class UserExportError(UserManagementException):
    """Raised when export operations fail."""

    def __init__(self, reason: str, export_format: Optional[str] = None):
        detail = f"Export failed: {reason}"
        if export_format:
            detail += f" (format: {export_format})"

        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="USER_EXPORT_ERROR",
            context={
                "reason": reason,
                "export_format": export_format
            }
        )


class UserActivityError(UserManagementException):
    """Raised when user activity related operations fail."""

    def __init__(self, operation: str, reason: str, user_id: Optional[UUID] = None):
        detail = f"Activity operation '{operation}' failed: {reason}"

        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="USER_ACTIVITY_ERROR",
            context={
                "operation": operation,
                "reason": reason,
                "user_id": str(user_id) if user_id else None
            }
        )


class UserLifecycleError(UserManagementException):
    """Raised when user lifecycle operations fail."""

    def __init__(self, operation: str, reason: str, user_id: Optional[UUID] = None):
        detail = f"Lifecycle operation '{operation}' failed: {reason}"

        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="USER_LIFECYCLE_ERROR",
            context={
                "operation": operation,
                "reason": reason,
                "user_id": str(user_id) if user_id else None
            }
        )


class UserCacheError(UserManagementException):
    """Raised when cache operations fail."""

    def __init__(self, operation: str, reason: str, user_id: Optional[UUID] = None):
        detail = f"Cache operation '{operation}' failed: {reason}"

        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="USER_CACHE_ERROR",
            context={
                "operation": operation,
                "reason": reason,
                "user_id": str(user_id) if user_id else None
            }
        )


class UserNotificationError(UserManagementException):
    """Raised when notification operations fail."""

    def __init__(self, operation: str, reason: str, user_id: Optional[UUID] = None):
        detail = f"Notification operation '{operation}' failed: {reason}"

        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="USER_NOTIFICATION_ERROR",
            context={
                "operation": operation,
                "reason": reason,
                "user_id": str(user_id) if user_id else None
            }
        )


class UserAnalyticsError(UserManagementException):
    """Raised when analytics operations fail."""

    def __init__(self, operation: str, reason: str, metric_type: Optional[str] = None):
        detail = f"Analytics operation '{operation}' failed: {reason}"

        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="USER_ANALYTICS_ERROR",
            context={
                "operation": operation,
                "reason": reason,
                "metric_type": metric_type
            }
        )


class BulkOperationError(UserManagementException):
    """Raised when bulk operations fail."""

    def __init__(self, operation: str, reason: str, operation_id: Optional[UUID] = None, failed_count: Optional[int] = None):
        detail = f"Bulk operation '{operation}' failed: {reason}"

        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="BULK_OPERATION_ERROR",
            context={
                "operation": operation,
                "reason": reason,
                "operation_id": str(operation_id) if operation_id else None,
                "failed_count": failed_count
            }
        )


class DatabaseOperationError(UserManagementException):
    """Raised when database operations fail."""

    def __init__(
        self,
        operation: str,
        reason: str,
        table: Optional[str] = None,
        constraint_name: Optional[str] = None,
        suggestions: Optional[List[str]] = None
    ):
        detail = f"Database operation '{operation}' failed: {reason}"

        if constraint_name:
            detail += f" (Constraint: {constraint_name})"

        context = {
            "operation": operation,
            "reason": reason,
            "table": table,
            "constraint_name": constraint_name,
            "suggestions": suggestions or []
        }

        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST if constraint_name else status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="DATABASE_OPERATION_ERROR",
            context=context
        )


class UserBranchAssignmentError(UserManagementException):
    """Raised when branch assignment validation fails."""

    def __init__(self, user_branch_id: UUID, manager_branch_id: UUID, manager_type: str):
        detail = f"{manager_type} must be from the same branch as the user"

        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="BRANCH_ASSIGNMENT_ERROR",
            context={
                "user_branch_id": str(user_branch_id),
                "manager_branch_id": str(manager_branch_id),
                "manager_type": manager_type
            }
        )


class UserOnboardingError(UserManagementException):
    """Raised when onboarding operations fail."""

    def __init__(self, operation: str, reason: str, user_id: Optional[UUID] = None):
        detail = f"Onboarding operation '{operation}' failed: {reason}"

        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="USER_ONBOARDING_ERROR",
            context={
                "operation": operation,
                "reason": reason,
                "user_id": str(user_id) if user_id else None
            }
        )


class UserOffboardingError(UserManagementException):
    """Raised when offboarding operations fail."""

    def __init__(self, operation: str, reason: str, user_id: Optional[UUID] = None):
        detail = f"Offboarding operation '{operation}' failed: {reason}"

        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="USER_OFFBOARDING_ERROR",
            context={
                "operation": operation,
                "reason": reason,
                "user_id": str(user_id) if user_id else None
            }
        )


# Exception mapping for easy lookup
USER_EXCEPTION_MAP = {
    "USER_NOT_FOUND": UserNotFoundError,
    "USER_ALREADY_EXISTS": UserAlreadyExistsError,
    "USER_VALIDATION_ERROR": UserValidationError,
    "DUPLICATE_USER_ERROR": DuplicateUserError,
    "INVALID_STATUS_TRANSITION": UserStatusTransitionError,
    "USER_AUTHORIZATION_ERROR": UserAuthorizationError,
    "SOFT_DELETE_ERROR": UserSoftDeleteError,
    "USER_RESTORE_ERROR": UserRestoreError,
    "USER_IMPORT_ERROR": UserImportError,
    "USER_EXPORT_ERROR": UserExportError,
    "USER_ACTIVITY_ERROR": UserActivityError,
    "USER_LIFECYCLE_ERROR": UserLifecycleError,
    "USER_CACHE_ERROR": UserCacheError,
    "USER_NOTIFICATION_ERROR": UserNotificationError,
    "USER_ANALYTICS_ERROR": UserAnalyticsError,
    "BULK_OPERATION_ERROR": BulkOperationError,
    "DATABASE_OPERATION_ERROR": DatabaseOperationError,
    "BRANCH_ASSIGNMENT_ERROR": UserBranchAssignmentError,
    "USER_ONBOARDING_ERROR": UserOnboardingError,
    "USER_OFFBOARDING_ERROR": UserOffboardingError,
}


def get_user_exception(error_code: str) -> type:
    """Get exception class by error code."""
    return USER_EXCEPTION_MAP.get(error_code, UserManagementException)


def create_user_exception(error_code: str, **kwargs) -> UserManagementException:
    """Create an exception instance by error code."""
    exception_class = get_user_exception(error_code)
    return exception_class(**kwargs)