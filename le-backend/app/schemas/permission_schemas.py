"""
Pydantic schemas for permission management API.

Defines request and response models for permission, role, and access control operations.
"""

from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from datetime import datetime
from uuid import UUID
from enum import Enum

from app.models.permissions import ResourceType, PermissionAction, PermissionScope


# ==================== BASE SCHEMAS ====================

class BaseSchema(BaseModel):
    """Base schema with common configuration."""
    
    class Config:
        from_attributes = True
        use_enum_values = True


# ==================== PERMISSION SCHEMAS ====================

class PermissionBase(BaseSchema):
    """Base permission schema."""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    resource_type: ResourceType
    action: PermissionAction
    scope: PermissionScope = PermissionScope.OWN
    conditions: Optional[Dict[str, Any]] = None


class PermissionCreate(PermissionBase):
    """Schema for creating a permission."""
    pass


class PermissionUpdate(BaseSchema):
    """Schema for updating a permission."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    is_active: Optional[bool] = None
    conditions: Optional[Dict[str, Any]] = None


class PermissionResponse(PermissionBase):
    """Schema for permission responses."""
    id: UUID
    is_system_permission: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None


# ==================== ROLE SCHEMAS ====================

class RoleBase(BaseSchema):
    """Base role schema."""
    name: str = Field(..., min_length=1, max_length=50)
    display_name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    level: int = Field(0, ge=0, le=100)
    department_restricted: bool = False
    branch_restricted: bool = False
    allowed_departments: Optional[List[UUID]] = None
    allowed_branches: Optional[List[UUID]] = None


class RoleCreate(RoleBase):
    """Schema for creating a role."""
    parent_role_id: Optional[UUID] = None


class RoleUpdate(BaseSchema):
    """Schema for updating a role."""
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    level: Optional[int] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None
    department_restricted: Optional[bool] = None
    branch_restricted: Optional[bool] = None
    allowed_departments: Optional[List[UUID]] = None
    allowed_branches: Optional[List[UUID]] = None


class RoleResponse(RoleBase):
    """Schema for role responses."""
    id: UUID
    is_system_role: bool
    is_active: bool
    is_default: bool
    parent_role_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None
    permission_count: Optional[int] = 0


# ==================== USER ROLE ASSIGNMENT SCHEMAS ====================

class RoleAssignmentBase(BaseSchema):
    """Base schema for role assignments."""
    role_id: UUID
    department_id: Optional[UUID] = None
    branch_id: Optional[UUID] = None
    effective_until: Optional[datetime] = None


class RoleAssignmentCreate(RoleAssignmentBase):
    """Schema for creating role assignments."""
    pass


class RoleAssignmentResponse(RoleAssignmentBase):
    """Schema for role assignment responses."""
    id: UUID
    user_id: UUID
    is_active: bool
    effective_from: datetime
    created_at: datetime
    assigned_by: Optional[UUID] = None


# ==================== USER PERMISSION SCHEMAS ====================

class UserPermissionBase(BaseSchema):
    """Base schema for user permissions."""
    permission_id: UUID
    resource_id: Optional[UUID] = None
    department_id: Optional[UUID] = None
    branch_id: Optional[UUID] = None
    conditions: Optional[Dict[str, Any]] = None
    reason: Optional[str] = Field(None, max_length=500)


class UserPermissionCreate(UserPermissionBase):
    """Schema for creating user permissions."""
    pass


class UserPermissionResponse(BaseSchema):
    """Schema for user permission responses."""
    id: UUID
    user_id: UUID
    permission: PermissionResponse
    is_granted: bool
    resource_id: Optional[UUID] = None
    department_id: Optional[UUID] = None
    branch_id: Optional[UUID] = None
    conditions: Optional[Dict[str, Any]] = None
    override_reason: Optional[str] = None
    is_active: bool
    effective_from: datetime
    effective_until: Optional[datetime] = None
    created_at: datetime
    granted_by: Optional[UUID] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UserPermissionResponse':
        """Create response from permission service data."""
        # This is a simplified version - in practice, you'd map the complex data structure
        # returned by the permission service to this response format
        return cls(**data)


# ==================== BULK OPERATION SCHEMAS ====================

class BulkRoleAssignmentItem(BaseSchema):
    """Individual item in bulk role assignment."""
    user_id: UUID
    role_id: UUID
    department_id: Optional[UUID] = None
    branch_id: Optional[UUID] = None


class BulkRoleAssignment(BaseSchema):
    """Schema for bulk role assignments."""
    assignments: List[BulkRoleAssignmentItem]
    
    @validator('assignments')
    def validate_assignments(cls, v):
        if len(v) == 0:
            raise ValueError('At least one assignment is required')
        if len(v) > 100:
            raise ValueError('Cannot process more than 100 assignments at once')
        return v


class BulkPermissionAssignmentItem(BaseSchema):
    """Individual item in bulk permission assignment."""
    target_id: UUID  # User or Role ID
    permission_id: UUID
    resource_id: Optional[UUID] = None


class BulkPermissionAssignment(BaseSchema):
    """Schema for bulk permission assignments."""
    target_type: str = Field(..., regex="^(user|role)$")
    assignments: List[BulkPermissionAssignmentItem]


# ==================== PERMISSION MATRIX SCHEMAS ====================

class PermissionMatrixResponse(BaseSchema):
    """Schema for permission matrix response."""
    roles: List[RoleResponse]
    permissions: List[PermissionResponse]
    matrix: Dict[str, Dict[str, bool]]  # role_id -> {permission_id: has_permission}


# ==================== PERMISSION TEMPLATE SCHEMAS ====================

class PermissionTemplateBase(BaseSchema):
    """Base schema for permission templates."""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    template_type: str = Field(..., regex="^(role|department|position)$")
    permissions: List[UUID] = Field(..., min_items=1)
    default_conditions: Optional[Dict[str, Any]] = None


class PermissionTemplateCreate(PermissionTemplateBase):
    """Schema for creating permission templates."""
    pass


class PermissionTemplateUpdate(BaseSchema):
    """Schema for updating permission templates."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    permissions: Optional[List[UUID]] = Field(None, min_items=1)
    default_conditions: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class PermissionTemplateResponse(PermissionTemplateBase):
    """Schema for permission template responses."""
    id: UUID
    is_system_template: bool
    is_active: bool
    usage_count: int
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None


# ==================== PERMISSION CHECK SCHEMAS ====================

class PermissionCheckRequest(BaseSchema):
    """Schema for permission check requests."""
    resource_type: ResourceType
    action: PermissionAction
    resource_id: Optional[UUID] = None
    scope: Optional[PermissionScope] = None


class PermissionCheckResponse(BaseSchema):
    """Schema for permission check responses."""
    has_permission: bool
    reason: Optional[str] = None
    source: Optional[str] = None  # 'role', 'direct', 'inherited'


class MultiplePermissionCheckRequest(BaseSchema):
    """Schema for checking multiple permissions."""
    checks: List[PermissionCheckRequest]
    
    @validator('checks')
    def validate_checks(cls, v):
        if len(v) == 0:
            raise ValueError('At least one permission check is required')
        if len(v) > 50:
            raise ValueError('Cannot check more than 50 permissions at once')
        return v


class MultiplePermissionCheckResponse(BaseSchema):
    """Schema for multiple permission check responses."""
    results: List[PermissionCheckResponse]
    has_all: bool
    has_any: bool


# ==================== AUDIT SCHEMAS ====================

class PermissionAuditEntry(BaseSchema):
    """Schema for permission audit entries."""
    id: UUID
    action: str  # 'granted', 'revoked', 'role_assigned', 'role_revoked'
    target_type: str  # 'user', 'role'
    target_id: UUID
    permission_id: Optional[UUID] = None
    role_id: Optional[UUID] = None
    performed_by: UUID
    reason: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime


class PermissionAuditResponse(BaseSchema):
    """Schema for permission audit responses."""
    entries: List[PermissionAuditEntry]
    total_count: int
    page: int
    page_size: int


# ==================== ANALYTICS SCHEMAS ====================

class PermissionAnalytics(BaseSchema):
    """Schema for permission analytics."""
    total_permissions: int
    total_roles: int
    total_user_roles: int
    total_user_permissions: int
    most_assigned_permissions: List[Dict[str, Any]]
    least_assigned_permissions: List[Dict[str, Any]]
    role_usage_stats: List[Dict[str, Any]]
    permission_by_resource_type: Dict[str, int]
    permission_by_action: Dict[str, int]
    permission_by_scope: Dict[str, int]


# ==================== ERROR SCHEMAS ====================

class PermissionError(BaseSchema):
    """Schema for permission-related errors."""
    error_code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class ValidationError(BaseSchema):
    """Schema for validation errors."""
    field: str
    message: str
    invalid_value: Optional[Any] = None