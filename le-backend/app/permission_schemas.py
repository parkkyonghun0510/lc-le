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
    pass


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


class PermissionMatrixResponse(BaseSchema):
    """Schema for permission matrix responses."""
    users: List[Dict[str, Any]]
    permissions: List[PermissionResponse]
    matrix: List[List[bool]]


class BulkRoleAssignment(BaseSchema):
    """Schema for bulk role assignments."""
    user_ids: List[UUID] = Field(..., min_items=1)
    role_id: UUID
