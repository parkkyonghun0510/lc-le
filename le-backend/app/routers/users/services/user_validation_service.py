"""
Enhanced user validation service.

This module provides comprehensive validation logic for user data,
including complex business rules, cross-field validation, and
integration with external validation services.
"""

import re
from typing import Dict, Any, List, Optional, Tuple
from uuid import UUID
from datetime import datetime, timezone, date

from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import ValidationError, validator

from app.models import User, Department, Branch, Position
from app.routers.users.repositories.user_repository import UserRepository
from app.routers.users.services.user_error_handler import user_error_handler
from app.routers.users.utils.user_exceptions import (
    UserValidationError,
    DuplicateUserError,
    UserBranchAssignmentError,
    DatabaseOperationError
)


class UserValidationService:
    """Enhanced validation service for user data."""

    def __init__(self, db_session: AsyncSession):
        """Initialize validation service with database session."""
        self.db = db_session
        self.repository = UserRepository(db_session)
        self.error_handler = user_error_handler

        # Validation rules
        self.username_pattern = re.compile(r'^[a-zA-Z0-9._-]{3,50}$')
        self.email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        self.phone_pattern = re.compile(r'^[\+]?[0-9\s\-\(\)]{10,20}$')
        self.employee_id_pattern = re.compile(r'^[A-Z0-9]{4,10}$')

        # Role-based validation rules
        self.role_permissions = {
            'admin': {
                'can_create_users': True,
                'can_delete_users': True,
                'can_view_all_users': True,
                'can_bulk_operations': True,
                'can_access_system_settings': True
            },
            'manager': {
                'can_create_users': True,
                'can_delete_users': False,
                'can_view_all_users': False,
                'can_bulk_operations': True,
                'can_access_system_settings': False
            },
            'officer': {
                'can_create_users': False,
                'can_delete_users': False,
                'can_view_all_users': False,
                'can_bulk_operations': False,
                'can_access_system_settings': False
            }
        }

    async def validate_user_data(self, user_data: Dict[str, Any], exclude_id: Optional[UUID] = None) -> Dict[str, Any]:
        """
        Comprehensive validation of user data.

        Args:
            user_data: Dictionary containing user data to validate
            exclude_id: User ID to exclude from duplicate checks (for updates)

        Returns:
            Dictionary with validation results and suggestions

        Raises:
            UserValidationError: If validation fails
        """
        async with self.error_handler.handle_operation("validate_user_data", db_session=self.db):
            try:
                errors = []
                warnings = []
                suggestions = []

                # Basic field validations
                await self._validate_basic_fields(user_data, errors, warnings, suggestions)

                # Cross-field validations
                await self._validate_cross_fields(user_data, errors, warnings, suggestions)

                # Business rule validations
                await self._validate_business_rules(user_data, errors, warnings, suggestions)

                # Duplicate checks
                await self._validate_duplicates(user_data, exclude_id, errors)

                # If there are errors, raise validation exception
                if errors:
                    error_messages = [error['message'] for error in errors]
                    raise UserValidationError(
                        field="general",
                        value=user_data,
                        reason=f"Multiple validation errors: {'; '.join(error_messages)}",
                        suggestions=suggestions
                    )

                return {
                    "valid": True,
                    "warnings": warnings,
                    "suggestions": suggestions
                }

            except UserValidationError:
                raise
            except Exception as e:
                raise UserValidationError(
                    field="general",
                    value=user_data,
                    reason=f"Unexpected validation error: {str(e)}"
                )

    async def validate_user_creation(self, user_data: Dict[str, Any], created_by: UUID) -> Dict[str, Any]:
        """
        Validate user creation with additional security checks.

        Args:
            user_data: Dictionary containing user creation data
            created_by: ID of user creating this user

        Returns:
            Dictionary with validation results

        Raises:
            UserValidationError: If validation fails
            UserAuthorizationError: If user lacks permission
        """
        async with self.error_handler.handle_operation("validate_user_creation", db_session=self.db):
            try:
                # Get creator information
                creator = await self.repository.get_by_id(created_by)
                if not creator:
                    raise UserValidationError(
                        field="created_by",
                        value=created_by,
                        reason="Creator user not found"
                    )

                # Check creator permissions
                if not self._has_permission(creator.role, 'can_create_users'):
                    raise UserValidationError(
                        field="created_by",
                        value=created_by,
                        reason=f"User role '{creator.role}' cannot create users"
                    )

                # Validate user data
                validation_result = await self.validate_user_data(user_data)

                # Additional creation-specific validations
                await self._validate_creation_specific_rules(user_data, creator, validation_result)

                return validation_result

            except (UserValidationError, DatabaseOperationError):
                raise
            except Exception as e:
                raise UserValidationError(
                    field="general",
                    value=user_data,
                    reason=f"Unexpected error in user creation validation: {str(e)}"
                )

    async def validate_user_update(self, user_id: UUID, update_data: Dict[str, Any], updated_by: UUID) -> Dict[str, Any]:
        """
        Validate user update with security and business rule checks.

        Args:
            user_id: ID of user being updated
            update_data: Dictionary containing update data
            updated_by: ID of user making the update

        Returns:
            Dictionary with validation results

        Raises:
            UserValidationError: If validation fails
            UserAuthorizationError: If user lacks permission
        """
        async with self.error_handler.handle_operation("validate_user_update", db_session=self.db):
            try:
                # Get both users
                target_user = await self.repository.get_by_id(user_id)
                if not target_user:
                    raise UserValidationError(
                        field="user_id",
                        value=user_id,
                        reason="Target user not found"
                    )

                updater = await self.repository.get_by_id(updated_by)
                if not updater:
                    raise UserValidationError(
                        field="updated_by",
                        value=updated_by,
                        reason="Updater user not found"
                    )

                # Check update permissions
                if not self._can_update_user(target_user, updater):
                    raise UserValidationError(
                        field="updated_by",
                        value=updated_by,
                        reason=f"User lacks permission to update user {user_id}"
                    )

                # Validate update data
                validation_result = await self.validate_user_data(update_data, exclude_id=user_id)

                # Additional update-specific validations
                await self._validate_update_specific_rules(target_user, update_data, updater, validation_result)

                return validation_result

            except (UserValidationError, DatabaseOperationError):
                raise
            except Exception as e:
                raise UserValidationError(
                    field="general",
                    value=update_data,
                    reason=f"Unexpected error in user update validation: {str(e)}"
                )

    async def validate_bulk_operation(self, operation_data: Dict[str, Any], performed_by: UUID) -> Dict[str, Any]:
        """
        Validate bulk operation parameters.

        Args:
            operation_data: Dictionary containing bulk operation data
            performed_by: ID of user performing the operation

        Returns:
            Dictionary with validation results

        Raises:
            UserValidationError: If validation fails
        """
        async with self.error_handler.handle_operation("validate_bulk_operation", db_session=self.db):
            try:
                errors = []
                warnings = []

                # Get performer information
                performer = await self.repository.get_by_id(performed_by)
                if not performer:
                    raise UserValidationError(
                        field="performed_by",
                        value=performed_by,
                        reason="Performer user not found"
                    )

                # Check bulk operation permissions
                if not self._has_permission(performer.role, 'can_bulk_operations'):
                    errors.append({
                        "field": "performed_by",
                        "message": f"User role '{performer.role}' cannot perform bulk operations"
                    })

                # Validate operation type
                operation_type = operation_data.get('operation_type')
                if operation_type not in ['status_update', 'import', 'export', 'delete']:
                    errors.append({
                        "field": "operation_type",
                        "message": f"Invalid operation type '{operation_type}'"
                    })

                # Validate target criteria
                target_criteria = operation_data.get('target_criteria', {})
                if not target_criteria:
                    warnings.append("No target criteria specified - operation will affect all users")

                # Validate changes
                changes = operation_data.get('changes_applied', {})
                if operation_type == 'status_update':
                    await self._validate_status_update_bulk(changes, errors)

                if errors:
                    error_messages = [error['message'] for error in errors]
                    raise UserValidationError(
                        field="bulk_operation",
                        value=operation_data,
                        reason=f"Bulk operation validation failed: {'; '.join(error_messages)}"
                    )

                return {
                    "valid": True,
                    "warnings": warnings,
                    "estimated_affected_users": await self._estimate_bulk_operation_impact(target_criteria, operation_type)
                }

            except (UserValidationError, DatabaseOperationError):
                raise
            except Exception as e:
                raise UserValidationError(
                    field="bulk_operation",
                    value=operation_data,
                    reason=f"Unexpected error in bulk operation validation: {str(e)}"
                )

    async def _validate_basic_fields(self, user_data: Dict[str, Any], errors: List[Dict], warnings: List[str], suggestions: List[str]) -> None:
        """Validate basic user fields."""
        # Username validation
        username = user_data.get('username', '').strip()
        if username:
            if not self.username_pattern.match(username):
                errors.append({
                    "field": "username",
                    "message": "Username must be 3-50 characters and contain only letters, numbers, dots, hyphens, and underscores"
                })
            else:
                # Check for common username issues
                if username in ['admin', 'root', 'system']:
                    warnings.append("Using reserved username may cause conflicts")
                if len(username) < 6:
                    suggestions.append("Consider using a longer username for better security")
        else:
            errors.append({
                "field": "username",
                "message": "Username is required"
            })

        # Email validation
        email = user_data.get('email', '').strip()
        if email:
            if not self.email_pattern.match(email):
                errors.append({
                    "field": "email",
                    "message": "Invalid email format"
                })
            elif len(email) > 255:
                errors.append({
                    "field": "email",
                    "message": "Email address too long (max 255 characters)"
                })
        else:
            errors.append({
                "field": "email",
                "message": "Email is required"
            })

        # Phone validation
        phone = user_data.get('phone_number')
        if phone and not self.phone_pattern.match(phone):
            errors.append({
                "field": "phone_number",
                "message": "Invalid phone number format"
            })

        # Employee ID validation
        employee_id = user_data.get('employee_id')
        if employee_id and not self.employee_id_pattern.match(employee_id):
            errors.append({
                "field": "employee_id",
                "message": "Employee ID must be 4-10 characters and contain only uppercase letters and numbers"
            })

        # Role validation
        role = user_data.get('role')
        if role:
            valid_roles = ['admin', 'manager', 'officer']
            if role not in valid_roles:
                errors.append({
                    "field": "role",
                    "message": f"Invalid role '{role}'. Must be one of: {', '.join(valid_roles)}"
                })

        # Name validations
        first_name = user_data.get('first_name', '').strip()
        last_name = user_data.get('last_name', '').strip()

        if first_name and len(first_name) > 100:
            errors.append({
                "field": "first_name",
                "message": "First name too long (max 100 characters)"
            })

        if last_name and len(last_name) > 100:
            errors.append({
                "field": "last_name",
                "message": "Last name too long (max 100 characters)"
            })

        # Password validation (if provided)
        password = user_data.get('password')
        if password:
            password_issues = self._validate_password_strength(password)
            if password_issues:
                errors.append({
                    "field": "password",
                    "message": f"Password does not meet security requirements: {'; '.join(password_issues)}"
                })

    async def _validate_cross_fields(self, user_data: Dict[str, Any], errors: List[Dict], warnings: List[str], suggestions: List[str]) -> None:
        """Validate relationships between fields."""
        # Name consistency checks
        first_name = user_data.get('first_name', '').strip()
        last_name = user_data.get('last_name', '').strip()
        username = user_data.get('username', '').strip()
        email = user_data.get('email', '').strip()

        # Check if username relates to name
        if first_name and last_name and username:
            name_parts = f"{first_name.lower()}.{last_name.lower()}"
            if name_parts not in username.lower() and username.lower() not in name_parts:
                suggestions.append("Consider using a username that includes your name for easier identification")

        # Check if email relates to name
        if first_name and last_name and email:
            name_parts = f"{first_name.lower()}.{last_name.lower()}"
            if name_parts not in email.lower() and not email.lower().startswith(username.lower()):
                warnings.append("Email address doesn't appear to match name or username")

        # Role-based field requirements
        role = user_data.get('role')
        if role == 'manager':
            if not user_data.get('department_id') and not user_data.get('branch_id'):
                warnings.append("Manager role typically requires either department or branch assignment")

    async def _validate_business_rules(self, user_data: Dict[str, Any], errors: List[Dict], warnings: List[str], suggestions: List[str]) -> None:
        """Validate business rules and constraints."""
        # Check branch assignment consistency
        branch_id = user_data.get('branch_id')
        department_id = user_data.get('department_id')
        portfolio_id = user_data.get('portfolio_id')
        line_manager_id = user_data.get('line_manager_id')

        if branch_id:
            # If user has a branch, portfolio and line manager should be from same branch
            if portfolio_id:
                try:
                    await self.repository.validate_branch_assignments(branch_id, portfolio_id, None)
                except DatabaseOperationError as e:
                    if "Portfolio manager must be from the same branch" in str(e):
                        errors.append({
                            "field": "portfolio_id",
                            "message": "Portfolio manager must be from the same branch as the user"
                        })

            if line_manager_id:
                try:
                    await self.repository.validate_branch_assignments(branch_id, None, line_manager_id)
                except DatabaseOperationError as e:
                    if "Line manager must be from the same branch" in str(e):
                        errors.append({
                            "field": "line_manager_id",
                            "message": "Line manager must be from the same branch as the user"
                        })

        # Department-specific validations
        if department_id:
            # Check if department exists and is active
            try:
                dept_result = await self.db.execute(
                    "SELECT is_active FROM departments WHERE id = :dept_id",
                    {"dept_id": department_id}
                )
                department = dept_result.first()
                if not department:
                    errors.append({
                        "field": "department_id",
                        "message": "Department not found"
                    })
                elif not department.is_active:
                    warnings.append("Department is not active")
            except Exception:
                errors.append({
                    "field": "department_id",
                    "message": "Error validating department"
                })

        # Position validations
        position_id = user_data.get('position_id')
        if position_id:
            try:
                pos_result = await self.db.execute(
                    "SELECT is_active FROM positions WHERE id = :pos_id",
                    {"pos_id": position_id}
                )
                position = pos_result.first()
                if not position:
                    errors.append({
                        "field": "position_id",
                        "message": "Position not found"
                    })
                elif not position.is_active:
                    warnings.append("Position is not active")
            except Exception:
                errors.append({
                    "field": "position_id",
                    "message": "Error validating position"
                })

    async def _validate_duplicates(self, user_data: Dict[str, Any], exclude_id: Optional[UUID], errors: List[Dict]) -> None:
        """Validate for duplicate data."""
        # Check username duplicates
        if 'username' in user_data:
            existing = await self.repository.get_by_username(user_data['username'])
            if existing and (not exclude_id or existing.id != exclude_id):
                errors.append({
                    "field": "username",
                    "message": f"Username '{user_data['username']}' already exists"
                })

        # Check email duplicates
        if 'email' in user_data:
            existing = await self.repository.get_by_email(user_data['email'])
            if existing and (not exclude_id or existing.id != exclude_id):
                errors.append({
                    "field": "email",
                    "message": f"Email '{user_data['email']}' already exists"
                })

        # Check employee_id duplicates
        if 'employee_id' in user_data and user_data['employee_id']:
            existing = await self.repository.get_by_employee_id(user_data['employee_id'])
            if existing and (not exclude_id or existing.id != exclude_id):
                errors.append({
                    "field": "employee_id",
                    "message": f"Employee ID '{user_data['employee_id']}' already exists"
                })

    async def _validate_creation_specific_rules(self, user_data: Dict[str, Any], creator: User, validation_result: Dict) -> None:
        """Validate creation-specific business rules."""
        # Admin can create any role, manager can only create officer
        if creator.role == 'manager' and user_data.get('role') in ['admin', 'manager']:
            raise UserValidationError(
                field="role",
                value=user_data.get('role'),
                reason="Manager can only create users with 'officer' role"
            )

        # Check if creator's branch/department limits apply
        if creator.role == 'manager':
            if creator.branch_id and user_data.get('branch_id') != creator.branch_id:
                raise UserValidationError(
                    field="branch_id",
                    value=user_data.get('branch_id'),
                    reason="Manager can only create users in their own branch"
                )

            if creator.department_id and user_data.get('department_id') != creator.department_id:
                raise UserValidationError(
                    field="department_id",
                    value=user_data.get('department_id'),
                    reason="Manager can only create users in their own department"
                )

    async def _validate_update_specific_rules(self, target_user: User, update_data: Dict[str, Any], updater: User, validation_result: Dict) -> None:
        """Validate update-specific business rules."""
        # Users can update themselves, managers can update their subordinates
        if updater.id != target_user.id:
            if updater.role == 'manager':
                # Manager can only update users in their department/branch
                if (updater.department_id and target_user.department_id != updater.department_id) and \
                   (updater.branch_id and target_user.branch_id != updater.branch_id):
                    raise UserValidationError(
                        field="user_id",
                        value=target_user.id,
                        reason="Manager can only update users in their own department or branch"
                    )

            # Check role update permissions
            if 'role' in update_data:
                if updater.role == 'manager' and update_data['role'] in ['admin', 'manager']:
                    raise UserValidationError(
                        field="role",
                        value=update_data['role'],
                        reason="Manager cannot assign admin or manager roles"
                    )

    async def _validate_status_update_bulk(self, changes: Dict[str, Any], errors: List[Dict]) -> None:
        """Validate bulk status update parameters."""
        new_status = changes.get('new_status')
        if new_status:
            try:
                from app.core.user_status import UserStatus
                UserStatus(new_status)
            except ValueError:
                errors.append({
                    "field": "new_status",
                    "message": f"Invalid status '{new_status}'"
                })

        reason = changes.get('reason', '').strip()
        if not reason:
            errors.append({
                "field": "reason",
                "message": "Reason is required for bulk status updates"
            })

    async def _estimate_bulk_operation_impact(self, target_criteria: Dict[str, Any], operation_type: str) -> int:
        """Estimate the number of users affected by a bulk operation."""
        try:
            # This is a simplified estimation - in practice, you'd want more sophisticated logic
            if operation_type == 'status_update' and 'user_ids' in target_criteria:
                return len(target_criteria['user_ids'])
            else:
                # For filter-based operations, we'd need to run a count query
                return 0  # Placeholder
        except Exception:
            return 0

    def _validate_password_strength(self, password: str) -> List[str]:
        """Validate password strength requirements."""
        issues = []

        if len(password) < 8:
            issues.append("at least 8 characters")
        if not re.search(r'[A-Z]', password):
            issues.append("at least one uppercase letter")
        if not re.search(r'[a-z]', password):
            issues.append("at least one lowercase letter")
        if not re.search(r'[0-9]', password):
            issues.append("at least one number")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            issues.append("at least one special character")

        return issues

    def _has_permission(self, role: str, permission: str) -> bool:
        """Check if a role has a specific permission."""
        return self.role_permissions.get(role, {}).get(permission, False)

    def _can_update_user(self, target_user: User, updater: User) -> bool:
        """Check if updater can modify target user."""
        # Users can always update themselves
        if updater.id == target_user.id:
            return True

        # Role-based permissions
        if updater.role == 'admin':
            return True

        if updater.role == 'manager':
            # Manager can update users in their department or branch
            return (
                (updater.department_id and target_user.department_id == updater.department_id) or
                (updater.branch_id and target_user.branch_id == updater.branch_id)
            )

        return False

    async def validate_csv_import_row(self, row_data: Dict[str, Any], row_number: int) -> Dict[str, Any]:
        """
        Validate a single CSV import row.

        Args:
            row_data: Dictionary containing CSV row data
            row_number: Row number for error reporting

        Returns:
            Dictionary with validation results
        """
        try:
            errors = []
            warnings = []

            # Required fields validation
            required_fields = ['Username', 'Email', 'First Name', 'Last Name', 'Role']
            for field in required_fields:
                if not row_data.get(field, '').strip():
                    errors.append(f"Row {row_number}: {field} is required")

            # Field format validations
            if 'Email' in row_data:
                email = row_data['Email'].strip()
                if email and not self.email_pattern.match(email):
                    errors.append(f"Row {row_number}: Invalid email format")

            if 'Role' in row_data:
                role = row_data['Role'].strip().lower()
                if role and role not in ['admin', 'manager', 'officer']:
                    errors.append(f"Row {row_number}: Invalid role '{role}'")

            # Cross-field validations
            if all(field in row_data for field in ['First Name', 'Last Name', 'Username']):
                first_name = row_data['First Name'].strip()
                last_name = row_data['Last Name'].strip()
                username = row_data['Username'].strip()

                if first_name and last_name and username:
                    # Check if username could be improved
                    suggested_username = f"{first_name.lower()}.{last_name.lower()}"
                    if suggested_username not in username.lower() and not username.lower().startswith(first_name.lower()):
                        warnings.append(f"Row {row_number}: Consider using username format like '{suggested_username}'")

            return {
                "valid": len(errors) == 0,
                "errors": errors,
                "warnings": warnings,
                "row_number": row_number
            }

        except Exception as e:
            return {
                "valid": False,
                "errors": [f"Row {row_number}: Unexpected validation error: {str(e)}"],
                "warnings": [],
                "row_number": row_number
            }