"""
Permission and authorization models for granular access control.

This module defines the models for implementing a flexible, role-based
permission system with resource-level access control and permission inheritance.
"""

from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey, Integer, JSON, UniqueConstraint, BigInteger
from sqlalchemy.dialects.postgresql import UUID, ENUM, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid
from enum import Enum as PyEnum


class ResourceType(PyEnum):
    """Enumeration of system resources that can have permissions."""
    USER = "user"
    APPLICATION = "application"
    DEPARTMENT = "department"
    BRANCH = "branch"
    FILE = "file"
    FOLDER = "folder"
    ANALYTICS = "analytics"
    NOTIFICATION = "notification"
    AUDIT = "audit"
    SYSTEM = "system"


class PermissionAction(PyEnum):
    """Enumeration of possible actions on resources."""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    APPROVE = "approve"
    REJECT = "reject"
    ASSIGN = "assign"
    EXPORT = "export"
    IMPORT = "import"
    MANAGE = "manage"
    VIEW_ALL = "view_all"
    VIEW_OWN = "view_own"
    VIEW_TEAM = "view_team"
    VIEW_DEPARTMENT = "view_department"
    VIEW_BRANCH = "view_branch"


class PermissionScope(PyEnum):
    """Enumeration of permission scopes."""
    GLOBAL = "global"  # System-wide access
    DEPARTMENT = "department"  # Department-level access
    BRANCH = "branch"  # Branch-level access
    TEAM = "team"  # Team/portfolio access
    OWN = "own"  # Own records only


class Permission(Base):
    """
    System permission definitions.
    
    Defines what actions can be performed on what resources.
    Permissions are combined with roles to grant access to users.
    """
    __tablename__ = "permissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=False)
    
    # Resource and action specification
    resource_type = Column(
        ENUM(ResourceType, name="resource_type_enum"),
        nullable=False,
        comment="Type of resource this permission applies to"
    )
    action = Column(
        ENUM(PermissionAction, name="permission_action_enum"),
        nullable=False,
        comment="Action that can be performed"
    )
    scope = Column(
        ENUM(PermissionScope, name="permission_scope_enum"),
        nullable=False,
        default=PermissionScope.OWN,
        comment="Scope of the permission"
    )
    
    # Permission metadata
    is_system_permission = Column(Boolean, default=False, comment="System-level permission, cannot be deleted")
    is_active = Column(Boolean, default=True, comment="Whether permission is active")
    conditions = Column(JSON, nullable=True, comment="Additional conditions for permission")
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    # Relationships
    role_permissions = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")
    user_permissions = relationship("UserPermission", back_populates="permission", cascade="all, delete-orphan")
    
    # Unique constraint to prevent duplicate permissions
    __table_args__ = (
        UniqueConstraint('resource_type', 'action', 'scope', name='unique_permission_definition'),
    )
    
    def __repr__(self):
        return f"<Permission(name='{self.name}', resource='{self.resource_type.value}', action='{self.action.value}', scope='{self.scope.value}')>"


class Role(Base):
    """
    System roles with associated permissions.
    
    Roles group permissions together for easier management.
    Users are assigned roles which grant them the associated permissions.
    """
    __tablename__ = "roles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    
    # Role hierarchy and inheritance
    parent_role_id = Column(UUID(as_uuid=True), ForeignKey('roles.id'), nullable=True)
    level = Column(Integer, default=0, comment="Role hierarchy level (0=lowest, higher=more privileged)")
    
    # Role metadata
    is_system_role = Column(Boolean, default=False, comment="System role, cannot be deleted")
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False, comment="Default role for new users")
    
    # Department/branch restrictions
    department_restricted = Column(Boolean, default=False, comment="Role restricted to specific departments")
    branch_restricted = Column(Boolean, default=False, comment="Role restricted to specific branches")
    allowed_departments = Column(JSON, nullable=True, comment="List of allowed department IDs")
    allowed_branches = Column(JSON, nullable=True, comment="List of allowed branch IDs")
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    # Relationships
    parent_role = relationship("Role", remote_side="Role.id", foreign_keys=[parent_role_id])
    child_roles = relationship("Role", foreign_keys="Role.parent_role_id", back_populates="parent_role")
    role_permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    user_roles = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Role(name='{self.name}', level={self.level})>"


class RolePermission(Base):
    """
    Association between roles and permissions.
    
    Links roles to their granted permissions with optional conditions.
    """
    __tablename__ = "role_permissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_id = Column(UUID(as_uuid=True), ForeignKey('roles.id'), nullable=False)
    permission_id = Column(UUID(as_uuid=True), ForeignKey('permissions.id'), nullable=False)
    
    # Permission customization
    is_granted = Column(Boolean, default=True, comment="Whether permission is granted or denied")
    conditions = Column(JSON, nullable=True, comment="Additional conditions for this role-permission")
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    granted_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    # Relationships
    role = relationship("Role", back_populates="role_permissions")
    permission = relationship("Permission", back_populates="role_permissions")
    
    # Unique constraint to prevent duplicate role-permission assignments
    __table_args__ = (
        UniqueConstraint('role_id', 'permission_id', name='unique_role_permission'),
    )
    
    def __repr__(self):
        return f"<RolePermission(role_id='{self.role_id}', permission_id='{self.permission_id}', granted={self.is_granted})>"


class UserRole(Base):
    """
    Association between users and roles.
    
    Assigns roles to users with optional scope restrictions.
    """
    __tablename__ = "user_roles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    role_id = Column(UUID(as_uuid=True), ForeignKey('roles.id'), nullable=False)
    
    # Scope restrictions
    department_id = Column(UUID(as_uuid=True), ForeignKey('departments.id'), nullable=True)
    branch_id = Column(UUID(as_uuid=True), ForeignKey('branches.id'), nullable=True)
    
    # Role assignment metadata
    is_active = Column(Boolean, default=True)
    effective_from = Column(DateTime(timezone=True), server_default=func.now())
    effective_until = Column(DateTime(timezone=True), nullable=True)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    assigned_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], overlaps="user_roles")
    role = relationship("Role", back_populates="user_roles")
    department = relationship("Department", foreign_keys=[department_id])
    branch = relationship("Branch", foreign_keys=[branch_id])
    assigned_by_user = relationship("User", foreign_keys=[assigned_by])
    
    # Unique constraint to prevent duplicate user-role assignments
    __table_args__ = (
        UniqueConstraint('user_id', 'role_id', 'department_id', 'branch_id', name='unique_user_role_scope'),
    )
    
    def __repr__(self):
        return f"<UserRole(user_id='{self.user_id}', role_id='{self.role_id}', active={self.is_active})>"


class UserPermission(Base):
    """
    Direct permission grants to users.
    
    Allows for user-specific permission overrides beyond their roles.
    Can grant additional permissions or revoke role-based permissions.
    """
    __tablename__ = "user_permissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    permission_id = Column(UUID(as_uuid=True), ForeignKey('permissions.id'), nullable=False)
    
    # Permission override
    is_granted = Column(Boolean, default=True, comment="Whether permission is granted or explicitly denied")
    override_reason = Column(Text, nullable=True, comment="Reason for permission override")
    
    # Scope restrictions
    resource_id = Column(UUID(as_uuid=True), nullable=True, comment="Specific resource ID if permission is resource-specific")
    department_id = Column(UUID(as_uuid=True), ForeignKey('departments.id'), nullable=True)
    branch_id = Column(UUID(as_uuid=True), ForeignKey('branches.id'), nullable=True)
    conditions = Column(JSON, nullable=True, comment="Additional conditions for this permission")
    
    # Permission validity
    is_active = Column(Boolean, default=True)
    effective_from = Column(DateTime(timezone=True), server_default=func.now())
    effective_until = Column(DateTime(timezone=True), nullable=True)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    granted_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], overlaps="user_permissions")
    permission = relationship("Permission", back_populates="user_permissions")
    department = relationship("Department", foreign_keys=[department_id])
    branch = relationship("Branch", foreign_keys=[branch_id])
    granted_by_user = relationship("User", foreign_keys=[granted_by])
    
    # Unique constraint to prevent duplicate user-permission assignments
    __table_args__ = (
        UniqueConstraint('user_id', 'permission_id', 'resource_id', 'department_id', 'branch_id', 
                        name='unique_user_permission_scope'),
    )
    
    def __repr__(self):
        return f"<UserPermission(user_id='{self.user_id}', permission_id='{self.permission_id}', granted={self.is_granted})>"


class PermissionTemplate(Base):
    """
    Permission templates for common role configurations.
    
    Allows for quick setup of common permission sets.
    """
    __tablename__ = "permission_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=False)
    template_type = Column(String(50), nullable=False, comment="Type of template (role, department, position)")
    
    # Template configuration
    permissions = Column(JSON, nullable=False, comment="List of permission IDs included in template")
    default_conditions = Column(JSON, nullable=True, comment="Default conditions to apply")
    
    # Template metadata
    is_system_template = Column(Boolean, default=False, comment="System template, cannot be deleted")
    is_active = Column(Boolean, default=True)
    usage_count = Column(Integer, default=0, comment="Number of times template has been used")
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    def __repr__(self):
        return f"<PermissionTemplate(name='{self.name}', type='{self.template_type}')>"


class PermissionAuditTrail(Base):
    """
    Audit trail for all permission-related changes.
    
    Tracks all permission, role, and template changes for compliance and security.
    """
    __tablename__ = "permission_audit_trail"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    action = Column(String(50), nullable=False, comment="Action performed (e.g., 'role_created', 'permission_granted')")
    entity_type = Column(String(50), nullable=False, comment="Type of entity affected (e.g., 'role', 'permission', 'user')")
    entity_id = Column(UUID(as_uuid=True), nullable=True, comment="ID of the affected entity")
    
    # User tracking
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True, comment="User who performed the action")
    target_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True, comment="User affected by the action")
    target_role_id = Column(UUID(as_uuid=True), ForeignKey('roles.id', ondelete='SET NULL'), nullable=True, comment="Role affected by the action")
    permission_id = Column(UUID(as_uuid=True), ForeignKey('permissions.id', ondelete='SET NULL'), nullable=True, comment="Permission affected by the action")
    
    # Change details
    details = Column(JSONB, nullable=True, comment="Additional details about the change (before/after values)")
    reason = Column(Text, nullable=True, comment="Reason for the change")
    ip_address = Column(String(45), nullable=True, comment="IP address of the requester")
    
    # Timestamp
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    target_user = relationship("User", foreign_keys=[target_user_id])
    target_role = relationship("Role", foreign_keys=[target_role_id])
    permission = relationship("Permission", foreign_keys=[permission_id])
    
    def __repr__(self):
        return f"<PermissionAuditTrail(action='{self.action}', entity_type='{self.entity_type}', timestamp='{self.timestamp}')>"