"""
Pydantic schemas for permission management API.
"""

from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from enum import Enum

from app.models.permissions import ResourceType, PermissionAction, PermissionScope


class BaseSchema(BaseModel):
    """Base schema with common configuration."""
    
    class Config:
        from_attributes = True
        use_enum_values = True


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
    is_active: bool
    created_at: datetime
    updated_at: datetime


class RoleBase(BaseSchema):
    """Base role schema."""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    is_active: bool = True


class RoleCreate(RoleBase):
    """Schema for creating a role."""
    display_name: str = Field(..., min_length=1, max_length=100)
    level: int = Field(0, ge=0, le=100)


class RoleFromTemplateCreate(BaseSchema):
    """Schema for creating a role from a template."""
    template_id: UUID
    name: str = Field(..., min_length=1, max_length=100)
    display_name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    level: int = Field(0, ge=0, le=100)


class RoleUpdate(BaseSchema):
    """Schema for updating a role."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    is_active: Optional[bool] = None


class RoleResponse(RoleBase):
    """Schema for role responses."""
    id: UUID
    created_at: datetime
    updated_at: datetime


class RoleAssignmentCreate(BaseSchema):
    """Schema for role assignments."""
    user_id: UUID
    role_id: UUID


class UserPermissionCreate(BaseSchema):
    """Schema for user permission assignments."""
    user_id: UUID
    permission_id: UUID


class UserPermissionResponse(BaseSchema):
    """Schema for user permission responses."""
    id: UUID
    user_id: UUID
    permission_id: UUID
    created_at: datetime


class PermissionTemplateCreate(BaseSchema):
    """Schema for permission template creation."""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    permissions: List[UUID] = Field(..., min_items=1)


class PermissionTemplateResponse(BaseSchema):
    """Schema for permission template responses."""
    id: UUID
    name: str
    description: str
    permissions: List[PermissionResponse]
    created_at: datetime
    updated_at: datetime


class PermissionMatrixRole(BaseSchema):
    """Schema for role in permission matrix."""
    id: str
    name: str
    display_name: str
    level: int
    is_system_role: bool


class PermissionMatrixPermission(BaseSchema):
    """Schema for permission in permission matrix."""
    id: str
    name: str
    resource_type: str
    action: str
    scope: Optional[str]
    is_system_permission: bool


class PermissionMatrixResponse(BaseSchema):
    """Schema for permission matrix responses."""
    roles: List[PermissionMatrixRole]
    permissions: List[PermissionMatrixPermission]
    assignments: Dict[str, List[str]]  # role_id -> [permission_ids]


class BulkRoleAssignment(BaseSchema):
    """Schema for bulk role assignments."""
    user_ids: List[UUID] = Field(..., min_items=1)
    role_id: UUID


class TemplateGenerationRequest(BaseSchema):
    """Schema for template generation requests."""
    source_role_ids: List[UUID] = Field(..., min_items=1)
    template_name: str = Field(..., min_length=1, max_length=100)
    template_description: str = Field(..., min_length=1, max_length=500)
    include_inactive_roles: bool = False


class TemplateSuggestionRequest(BaseSchema):
    """Schema for template suggestion requests."""
    analysis_type: str = Field(..., pattern="^(pattern|usage|similarity)$")
    role_limit: Optional[int] = Field(10, ge=1, le=100)
    min_permission_count: Optional[int] = Field(1, ge=1)


class TemplateSuggestionResponse(BaseSchema):
    """Schema for template suggestion responses."""
    suggestions: List[Dict[str, Any]]
    analysis_metadata: Dict[str, Any]


class BulkTemplateGenerationRequest(BaseSchema):
    """Schema for bulk template generation requests."""
    generation_configs: List[TemplateGenerationRequest] = Field(..., min_items=1, max_items=50)


class BulkTemplateGenerationResponse(BaseSchema):
    """Schema for bulk template generation responses."""
    results: List[Dict[str, Any]]
    success_count: int
    failure_count: int


class TemplatePreviewRequest(BaseSchema):
    """Schema for template preview requests."""
    source_role_ids: List[UUID] = Field(..., min_items=1)
    include_inactive_roles: bool = False
    preview_type: str = Field("summary", pattern="^(summary|detailed|comparison)$")


class TemplatePreviewResponse(BaseSchema):
    """Schema for template preview responses."""
    preview_data: Dict[str, Any]
    role_analysis: Dict[str, Any]
    suggested_permissions: List[PermissionResponse]
    estimated_template_size: int


class MatrixToggleRequest(BaseSchema):
    """Schema for toggling permission assignments in matrix."""
    role_id: UUID
    permission_id: UUID
    is_granted: bool


class TemplateImportResponse(BaseSchema):
    """Schema for template import responses."""
    template: PermissionTemplateResponse
    action: str  # 'created' or 'updated'
    mapped_count: int
    unmapped_count: int
    unmapped_permissions: List[Dict[str, Any]]


# ==================== AUDIT TRAIL SCHEMAS ====================

class AuditActionType(str, Enum):
    """Types of audit actions for permissions."""
    PERMISSION_CREATED = "permission_created"
    PERMISSION_UPDATED = "permission_updated"
    PERMISSION_DELETED = "permission_deleted"
    PERMISSION_TOGGLED = "permission_toggled"
    ROLE_CREATED = "role_created"
    ROLE_UPDATED = "role_updated"
    ROLE_DELETED = "role_deleted"
    ROLE_ASSIGNED = "role_assigned"
    ROLE_REVOKED = "role_revoked"
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_REVOKED = "permission_revoked"
    ROLE_PERMISSION_ASSIGNED = "role_permission_assigned"
    ROLE_PERMISSION_REVOKED = "role_permission_revoked"


class AuditEntryResponse(BaseSchema):
    """Schema for audit trail entry responses."""
    id: int
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    target_user_id: Optional[str] = None
    target_user_name: Optional[str] = None
    target_role_id: Optional[str] = None
    target_role_name: Optional[str] = None
    permission_id: Optional[str] = None
    permission_name: Optional[str] = None
    role_id: Optional[str] = None
    role_name: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None
    timestamp: datetime
    ip_address: Optional[str] = None


class AuditListResponse(BaseSchema):
    """Schema for paginated audit trail responses."""
    items: List[AuditEntryResponse]
    total: int
    page: int
    size: int
    pages: int
