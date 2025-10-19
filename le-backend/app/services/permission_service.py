"""
Permission Service for Advanced Role-Based Access Control.

This service handles all permission checking, role management, and authorization
logic for the LC Workflow system. It provides a comprehensive and flexible
permission system with resource-level access control.
"""

from typing import List, Optional, Dict, Any, Union, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from uuid import UUID
from datetime import datetime
import logging
from functools import wraps
from fastapi import HTTPException

from app.models import User
from app.models.permissions import (
    Permission, Role, RolePermission, UserRole, UserPermission, PermissionTemplate,
    ResourceType, PermissionAction, PermissionScope
)

logger = logging.getLogger(__name__)


class PermissionService:
    """
    Comprehensive permission service for role-based access control.
    
    Provides methods for:
    - Permission checking and validation
    - Role management and assignment
    - User permission overrides
    - Resource-level access control
    - Permission inheritance and hierarchy
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # ==================== PERMISSION CHECKING ====================
    
    async def has_permission(
        self,
        user: User,
        resource_type: ResourceType,
        action: PermissionAction,
        resource_id: Optional[UUID] = None,
        scope: Optional[PermissionScope] = None
    ) -> bool:
        """
        Check if a user has a specific permission.
        
        Args:
            user: User to check permissions for
            resource_type: Type of resource being accessed
            action: Action being performed
            resource_id: Specific resource ID (for resource-level permissions)
            scope: Required scope level
            
        Returns:
            bool: True if user has permission, False otherwise
        """
        try:
            # Check direct user permissions first
            user_permission = await self._check_user_permission(
                user.id, resource_type, action, resource_id, scope
            )
            if user_permission is not None:
                return user_permission
            
            # Check role-based permissions
            return await self._check_role_permissions(
                user.id, resource_type, action, resource_id, scope
            )
            
        except Exception as e:
            logger.error(f"Error checking permission for user {user.id}: {e}")
            return False
    
    async def has_any_permission(
        self,
        user: User,
        permissions: List[tuple[ResourceType, PermissionAction]]
    ) -> bool:
        """Check if user has any of the specified permissions."""
        for resource_type, action in permissions:
            if await self.has_permission(user, resource_type, action):
                return True
        return False
    
    async def has_all_permissions(
        self,
        user: User,
        permissions: List[tuple[ResourceType, PermissionAction]]
    ) -> bool:
        """Check if user has all of the specified permissions."""
        for resource_type, action in permissions:
            if not await self.has_permission(user, resource_type, action):
                return False
        return True
    
    async def get_user_permissions(self, user_id: UUID) -> List[Dict[str, Any]]:
        """
        Get all effective permissions for a user.
        
        Returns a comprehensive list of all permissions granted to the user
        through roles and direct assignments.
        """
        permissions = []
        
        # Get role-based permissions
        role_permissions = await self._get_role_permissions(user_id)
        permissions.extend(role_permissions)
        
        # Get direct user permissions
        user_permissions = await self._get_direct_user_permissions(user_id)
        permissions.extend(user_permissions)
        
        # Remove duplicates and handle overrides
        return self._consolidate_permissions(permissions)
    
    # ==================== ROLE MANAGEMENT ====================
    
    async def assign_role_to_user(
        self,
        user_id: UUID,
        role_id: UUID,
        assigned_by: UUID,
        department_id: Optional[UUID] = None,
        branch_id: Optional[UUID] = None,
        effective_until: Optional[str] = None
    ) -> UserRole:
        """Assign a role to a user with optional scope restrictions."""
        user_role = UserRole(
            user_id=user_id,
            role_id=role_id,
            assigned_by=assigned_by,
            department_id=department_id,
            branch_id=branch_id,
            effective_until=effective_until
        )
        
        self.db.add(user_role)
        await self.db.commit()
        await self.db.refresh(user_role)
        
        logger.info(f"Assigned role {role_id} to user {user_id} by {assigned_by}")
        return user_role
    
    async def revoke_role_from_user(
        self,
        user_id: UUID,
        role_id: UUID,
        revoked_by: UUID
    ) -> bool:
        """Revoke a role from a user."""
        stmt = select(UserRole).where(
            and_(
                UserRole.user_id == user_id,
                UserRole.role_id == role_id,
                UserRole.is_active == True
            )
        )
        result = await self.db.execute(stmt)
        user_role = result.scalar_one_or_none()
        
        if user_role:
            user_role.is_active = False
            await self.db.commit()
            logger.info(f"Revoked role {role_id} from user {user_id} by {revoked_by}")
            return True
        
        return False
    
    async def get_user_roles(self, user_id: UUID) -> List[Role]:
        """Get all active roles for a user."""
        stmt = select(Role).join(UserRole).where(
            and_(
                UserRole.user_id == user_id,
                UserRole.is_active == True
            )
        ).options(selectinload(Role.role_permissions))
        
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    # ==================== PERMISSION MANAGEMENT ====================
    
    async def grant_permission_to_user(
        self,
        user_id: UUID,
        permission_id: UUID,
        granted_by: UUID,
        resource_id: Optional[UUID] = None,
        department_id: Optional[UUID] = None,
        branch_id: Optional[UUID] = None,
        conditions: Optional[Dict[str, Any]] = None,
        reason: Optional[str] = None
    ) -> UserPermission:
        """Grant a specific permission directly to a user."""
        user_permission = UserPermission(
            user_id=user_id,
            permission_id=permission_id,
            granted_by=granted_by,
            resource_id=resource_id,
            department_id=department_id,
            branch_id=branch_id,
            conditions=conditions,
            override_reason=reason,
            is_granted=True
        )
        
        self.db.add(user_permission)
        await self.db.commit()
        await self.db.refresh(user_permission)
        
        logger.info(f"Granted permission {permission_id} to user {user_id} by {granted_by}")
        return user_permission
    
    async def revoke_permission_from_user(
        self,
        user_id: UUID,
        permission_id: UUID,
        revoked_by: UUID,
        reason: Optional[str] = None
    ) -> UserPermission:
        """Explicitly revoke a permission from a user (creates a deny entry)."""
        user_permission = UserPermission(
            user_id=user_id,
            permission_id=permission_id,
            granted_by=revoked_by,
            override_reason=reason,
            is_granted=False  # This creates an explicit deny
        )
        
        self.db.add(user_permission)
        await self.db.commit()
        await self.db.refresh(user_permission)
        
        logger.info(f"Revoked permission {permission_id} from user {user_id} by {revoked_by}")
        return user_permission
    
    # ==================== RESOURCE-LEVEL ACCESS CONTROL ====================
    
    async def can_access_resource(
        self,
        user: User,
        resource_type: ResourceType,
        resource_id: UUID,
        action: PermissionAction
    ) -> bool:
        """
        Check if user can access a specific resource.
        
        This method considers:
        - Direct resource permissions
        - Departmental/branch scope permissions
        - Ownership-based access
        - Hierarchical access (manager accessing subordinate resources)
        """
        # Check direct resource permission
        if await self.has_permission(user, resource_type, action, resource_id):
            return True
        
        # Check ownership-based access
        if await self._check_resource_ownership(user, resource_type, resource_id, action):
            return True
        
        # Check hierarchical access
        if await self._check_hierarchical_access(user, resource_type, resource_id, action):
            return True
        
        return False
    
    async def filter_accessible_resources(
        self,
        user: User,
        resource_type: ResourceType,
        resource_ids: List[UUID],
        action: PermissionAction
    ) -> List[UUID]:
        """Filter a list of resource IDs to only include accessible ones."""
        accessible = []
        
        for resource_id in resource_ids:
            if await self.can_access_resource(user, resource_type, resource_id, action):
                accessible.append(resource_id)
        
        return accessible
    
    # ==================== ROLE AND PERMISSION CREATION ====================
    
    async def create_role(
        self,
        name: str,
        display_name: str,
        description: str,
        level: int = 0,
        parent_role_id: Optional[UUID] = None,
        created_by: Optional[UUID] = None
    ) -> Role:
        """Create a new role."""
        role = Role(
            name=name,
            display_name=display_name,
            description=description,
            level=level,
            parent_role_id=parent_role_id,
            created_by=created_by
        )
        
        self.db.add(role)
        await self.db.commit()
        await self.db.refresh(role)
        
        logger.info(f"Created role: {name} (level {level})")
        return role
    
    async def create_role_from_template(
        self,
        template_id: UUID,
        name: str,
        display_name: str,
        description: str,
        level: int = 0,
        created_by: Optional[UUID] = None
    ) -> Role:
        """
        Create a new role from a permission template.
        
        Args:
            template_id: ID of the template to use
            name: Name for the new role
            display_name: Display name for the new role
            description: Description for the new role
            level: Hierarchy level for the new role
            created_by: User ID who is creating the role
            
        Returns:
            The created role with all permissions from the template assigned
            
        Raises:
            ValueError: If template doesn't exist or is not active
        """
        # Load and validate template
        template = await self.db.get(PermissionTemplate, template_id)
        if not template:
            raise ValueError(f"Template with ID {template_id} not found")
        
        if not template.is_active:
            raise ValueError(f"Template {template.name} is not active")
        
        # Create the role using existing method
        role = await self.create_role(
            name=name,
            display_name=display_name,
            description=description,
            level=level,
            created_by=created_by
        )
        
        # Assign all permissions from template to the new role
        for permission_id_str in template.permissions:
            try:
                permission_id = UUID(permission_id_str)
                await self.assign_permission_to_role(
                    role_id=role.id,
                    permission_id=permission_id,
                    granted_by=created_by or role.id
                )
            except Exception as e:
                logger.warning(
                    f"Failed to assign permission {permission_id_str} to role {role.id}: {e}"
                )
        
        logger.info(
            f"Created role {name} from template {template.name} "
            f"with {len(template.permissions)} permissions"
        )
        
        return role
    
    async def create_permission(
        self,
        name: str,
        description: str,
        resource_type: ResourceType,
        action: PermissionAction,
        scope: PermissionScope = PermissionScope.OWN,
        created_by: Optional[UUID] = None
    ) -> Permission:
        """Create a new permission."""
        permission = Permission(
            name=name,
            description=description,
            resource_type=resource_type,
            action=action,
            scope=scope,
            created_by=created_by
        )
        
        self.db.add(permission)
        await self.db.commit()
        await self.db.refresh(permission)
        
        logger.info(f"Created permission: {name} ({resource_type.value}:{action.value}:{scope.value})")
        return permission
    
    async def assign_permission_to_role(
        self,
        role_id: UUID,
        permission_id: UUID,
        granted_by: UUID
    ) -> RolePermission:
        """Assign a permission to a role."""
        role_permission = RolePermission(
            role_id=role_id,
            permission_id=permission_id,
            granted_by=granted_by
        )
        
        self.db.add(role_permission)
        await self.db.commit()
        await self.db.refresh(role_permission)
        
        logger.info(f"Assigned permission {permission_id} to role {role_id}")
        return role_permission
    
    # ==================== PERMISSION TEMPLATES ====================
    
    async def apply_permission_template(
        self,
        template_id: UUID,
        target_id: UUID,
        target_type: str,  # 'role' or 'user'
        applied_by: UUID
    ) -> bool:
        """Apply a permission template to a role or user."""
        template = await self.db.get(PermissionTemplate, template_id)
        if not template or not template.is_active:
            return False
        
        if target_type == 'role':
            return await self._apply_template_to_role(template, target_id, applied_by)
        elif target_type == 'user':
            return await self._apply_template_to_user(template, target_id, applied_by)
        
        return False
    
    async def export_template(self, template_id: UUID) -> Dict[str, Any]:
        """
        Export a permission template to a portable JSON format.
        
        Args:
            template_id: ID of the template to export
            
        Returns:
            Dictionary containing template metadata and permissions in portable format
            
        Raises:
            ValueError: If template doesn't exist
        """
        # Load template
        template = await self.db.get(PermissionTemplate, template_id)
        if not template:
            raise ValueError(f"Template with ID {template_id} not found")
        
        # Load all permissions for this template
        permission_ids = [UUID(pid) for pid in template.permissions]
        stmt = select(Permission).where(Permission.id.in_(permission_ids))
        result = await self.db.execute(stmt)
        permissions = result.scalars().all()
        
        # Convert permissions to portable format (resource_type.action.scope)
        portable_permissions = []
        for perm in permissions:
            portable_format = {
                "resource_type": perm.resource_type.value,
                "action": perm.action.value,
                "scope": perm.scope.value if perm.scope else None,
                "name": perm.name,
                "description": perm.description
            }
            portable_permissions.append(portable_format)
        
        # Generate export structure
        export_data = {
            "template_name": template.name,
            "template_description": template.description,
            "template_type": template.template_type,
            "version": "1.0",
            "exported_at": datetime.utcnow().isoformat(),
            "permissions": portable_permissions,
            "default_conditions": template.default_conditions
        }
        
        logger.info(f"Exported template {template.name} with {len(portable_permissions)} permissions")
        return export_data
    
    async def import_template(
        self,
        template_data: Dict[str, Any],
        imported_by: UUID,
        update_if_exists: bool = False
    ) -> Dict[str, Any]:
        """
        Import a permission template from portable JSON format.
        
        Args:
            template_data: Dictionary containing template data
            imported_by: User ID who is importing the template
            update_if_exists: If True, update existing template with same name
            
        Returns:
            Dictionary with import results including created template and any unmapped permissions
            
        Raises:
            ValueError: If template data is invalid
        """
        # Validate required fields
        required_fields = ["template_name", "template_description", "permissions"]
        for field in required_fields:
            if field not in template_data:
                raise ValueError(f"Missing required field: {field}")
        
        # Map permissions from portable format to IDs
        mapped_permission_ids = []
        unmapped_permissions = []
        
        for perm_data in template_data["permissions"]:
            try:
                # Query permission by resource_type, action, and scope
                stmt = select(Permission).where(
                    and_(
                        Permission.resource_type == ResourceType(perm_data["resource_type"]),
                        Permission.action == PermissionAction(perm_data["action"])
                    )
                )
                
                # Add scope filter if present
                if perm_data.get("scope"):
                    stmt = stmt.where(Permission.scope == PermissionScope(perm_data["scope"]))
                
                result = await self.db.execute(stmt)
                permission = result.scalar_one_or_none()
                
                if permission:
                    mapped_permission_ids.append(str(permission.id))
                else:
                    unmapped_permissions.append(perm_data)
                    
            except Exception as e:
                logger.warning(f"Failed to map permission {perm_data}: {e}")
                unmapped_permissions.append(perm_data)
        
        # Check if template with same name exists
        template_name = template_data["template_name"]
        stmt = select(PermissionTemplate).where(PermissionTemplate.name == template_name)
        result = await self.db.execute(stmt)
        existing_template = result.scalar_one_or_none()
        
        if existing_template and update_if_exists:
            # Update existing template
            existing_template.description = template_data["template_description"]
            existing_template.permissions = mapped_permission_ids
            existing_template.default_conditions = template_data.get("default_conditions")
            await self.db.commit()
            await self.db.refresh(existing_template)
            
            logger.info(f"Updated template {template_name} with {len(mapped_permission_ids)} permissions")
            
            return {
                "template": existing_template,
                "action": "updated",
                "mapped_count": len(mapped_permission_ids),
                "unmapped_count": len(unmapped_permissions),
                "unmapped_permissions": unmapped_permissions
            }
        elif existing_template and not update_if_exists:
            raise ValueError(f"Template with name '{template_name}' already exists")
        else:
            # Create new template
            new_template = PermissionTemplate(
                name=template_name,
                description=template_data["template_description"],
                template_type=template_data.get("template_type", "imported"),
                permissions=mapped_permission_ids,
                default_conditions=template_data.get("default_conditions"),
                created_by=imported_by
            )
            
            self.db.add(new_template)
            await self.db.commit()
            await self.db.refresh(new_template)
            
            logger.info(f"Created template {template_name} with {len(mapped_permission_ids)} permissions")
            
            return {
                "template": new_template,
                "action": "created",
                "mapped_count": len(mapped_permission_ids),
                "unmapped_count": len(unmapped_permissions),
                "unmapped_permissions": unmapped_permissions
            }
    
    # ==================== PRIVATE HELPER METHODS ====================
    
    async def _check_user_permission(
        self,
        user_id: UUID,
        resource_type: ResourceType,
        action: PermissionAction,
        resource_id: Optional[UUID],
        scope: Optional[PermissionScope]
    ) -> Optional[bool]:
        """Check direct user permissions. Returns None if no explicit permission found."""
        stmt = select(UserPermission).join(Permission).where(
            and_(
                UserPermission.user_id == user_id,
                UserPermission.is_active == True,
                Permission.resource_type == resource_type,
                Permission.action == action,
                or_(
                    UserPermission.resource_id == resource_id,
                    UserPermission.resource_id.is_(None)
                )
            )
        )
        
        if scope:
            stmt = stmt.where(Permission.scope == scope)
        
        result = await self.db.execute(stmt)
        user_permission = result.scalar_one_or_none()
        
        return user_permission.is_granted if user_permission else None
    
    async def _check_role_permissions(
        self,
        user_id: UUID,
        resource_type: ResourceType,
        action: PermissionAction,
        resource_id: Optional[UUID],
        scope: Optional[PermissionScope]
    ) -> bool:
        """Check permissions granted through user's roles."""
        stmt = (
            select(RolePermission)
            .join(Permission, RolePermission.permission_id == Permission.id)
            .join(Role, RolePermission.role_id == Role.id)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(
                and_(
                    UserRole.user_id == user_id,
                    UserRole.is_active == True,
                    RolePermission.is_granted == True,
                    Permission.resource_type == resource_type,
                    Permission.action == action,
                    Permission.is_active == True
                )
            )
        )
        
        if scope:
            stmt = stmt.where(Permission.scope == scope)
        
        result = await self.db.execute(stmt)
        role_permissions = result.scalars().all()
        
        return len(role_permissions) > 0
    
    async def _check_resource_ownership(
        self,
        user: User,
        resource_type: ResourceType,
        resource_id: UUID,
        action: PermissionAction
    ) -> bool:
        """Check if user owns the resource and has ownership-based permissions."""
        # Implementation depends on resource type and ownership rules
        # This is a placeholder for resource-specific ownership checks
        return False
    
    async def _check_hierarchical_access(
        self,
        user: User,
        resource_type: ResourceType,
        resource_id: UUID,
        action: PermissionAction
    ) -> bool:
        """Check if user has hierarchical access (e.g., manager accessing subordinate resources)."""
        # Implementation for hierarchical access based on organizational structure
        # This is a placeholder for hierarchy-specific access checks
        return False
    
    async def _get_role_permissions(self, user_id: UUID) -> List[Dict[str, Any]]:
        """Get all permissions granted through user's roles."""
        stmt = (
            select(Permission, RolePermission, Role, UserRole)
            .join(RolePermission, Permission.id == RolePermission.permission_id)
            .join(Role, RolePermission.role_id == Role.id)
            .join(UserRole, Role.id == UserRole.role_id)
            .where(
                and_(
                    UserRole.user_id == user_id,
                    UserRole.is_active == True,
                    RolePermission.is_granted == True
                )
            )
        )

        result = await self.db.execute(stmt)
        permissions = []

        for permission, role_permission, role, user_role in result:
            permissions.append({
                'permission': permission,
                'source': 'role',
                'role': role,
                'granted_through': role_permission,
                'scope_restriction': {
                    'department_id': user_role.department_id,
                    'branch_id': user_role.branch_id
                }
            })

        return permissions
    
    async def _get_direct_user_permissions(self, user_id: UUID) -> List[Dict[str, Any]]:
        """Get all direct user permissions."""
        stmt = select(Permission, UserPermission).join(UserPermission).where(
            and_(
                UserPermission.user_id == user_id,
                UserPermission.is_active == True
            )
        )
        
        result = await self.db.execute(stmt)
        permissions = []
        
        for permission, user_permission in result:
            permissions.append({
                'permission': permission,
                'source': 'direct',
                'user_permission': user_permission,
                'is_granted': user_permission.is_granted
            })
        
        return permissions
    
    def _consolidate_permissions(self, permissions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Consolidate permissions, handling overrides and duplicates."""
        # Group permissions by permission ID
        permission_groups = {}
        
        for perm_data in permissions:
            permission = perm_data['permission']
            perm_id = permission.id
            
            if perm_id not in permission_groups:
                permission_groups[perm_id] = []
            
            permission_groups[perm_id].append(perm_data)
        
        # For each permission group, determine the final effective permission
        consolidated = []
        
        for perm_id, group in permission_groups.items():
            # Direct permissions override role permissions
            direct_permissions = [p for p in group if p['source'] == 'direct']
            
            if direct_permissions:
                # If there are direct permissions, use the most recent one
                latest_direct = max(direct_permissions, 
                                  key=lambda x: x['user_permission'].created_at)
                if latest_direct['is_granted']:
                    consolidated.append(latest_direct)
            else:
                # Use role-based permissions
                role_permissions = [p for p in group if p['source'] == 'role']
                if role_permissions:
                    # Add all role-based permissions (they're all grants)
                    consolidated.extend(role_permissions)
        
        return consolidated
    
    async def _apply_template_to_role(
        self,
        template: PermissionTemplate,
        role_id: UUID,
        applied_by: UUID
    ) -> bool:
        """Apply permission template to a role."""
        try:
            for permission_id in template.permissions:
                await self.assign_permission_to_role(
                    role_id=role_id,
                    permission_id=UUID(permission_id),
                    granted_by=applied_by
                )
            
            # Update template usage count
            template.usage_count += 1
            await self.db.commit()
            
            return True
        except Exception as e:
            logger.error(f"Error applying template {template.id} to role {role_id}: {e}")
            await self.db.rollback()
            return False
    
    async def _apply_template_to_user(
        self,
        template: PermissionTemplate,
        user_id: UUID,
        applied_by: UUID
    ) -> bool:
        """Apply permission template to a user."""
        try:
            for permission_id in template.permissions:
                await self.grant_permission_to_user(
                    user_id=user_id,
                    permission_id=UUID(permission_id),
                    granted_by=applied_by,
                    reason=f"Applied from template: {template.name}"
                )
            
            # Update template usage count
            template.usage_count += 1
            await self.db.commit()
            
            return True
        except Exception as e:
            logger.error(f"Error applying template {template.id} to user {user_id}: {e}")
            await self.db.rollback()
            return False


# ==================== UTILITY FUNCTIONS ====================

async def get_permission_service(db: AsyncSession) -> PermissionService:
    """Factory function to create PermissionService instance."""
    return PermissionService(db)


def require_permission(
    resource_type: ResourceType,
    action: PermissionAction,
    scope: Optional[PermissionScope] = None
):
    """
    Decorator for endpoints that require specific permissions.
    
    Usage:
        @require_permission(ResourceType.USER, PermissionAction.CREATE)
        async def create_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def permission_wrapper(*args, **kwargs):
            # Extract current_user from kwargs
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            # Get database session
            db = kwargs.get('db')
            if not db:
                raise HTTPException(status_code=500, detail="Database session not available")
            
            # Check permission
            permission_service = PermissionService(db)
            has_perm = await permission_service.has_permission(
                current_user, resource_type, action, scope=scope
            )
            
            if not has_perm:
                raise HTTPException(
                    status_code=403,
                    detail=f"Insufficient permissions: {resource_type.value}:{action.value}"
                )
            
            return await func(*args, **kwargs)
        
        return permission_wrapper
    return decorator


def require_permission_or_role(
    resource_type: ResourceType,
    action: PermissionAction,
    allowed_roles: Optional[List[str]] = None,
    scope: Optional[PermissionScope] = None
):
    """
    Decorator for endpoints that require specific permissions OR role membership.
    
    This decorator allows access if the user either:
    1. Has the required permission (resource_type + action)
    2. Has one of the allowed roles (e.g., 'admin')
    
    Usage:
        @require_permission_or_role(
            ResourceType.SYSTEM, 
            PermissionAction.VIEW_ALL,
            allowed_roles=['admin', 'super_admin']
        )
        async def list_roles(current_user: User = Depends(get_current_user)):
            ...
    
    Args:
        resource_type: Type of resource being accessed
        action: Action being performed
        allowed_roles: List of role names that are allowed access (bypasses permission check)
        scope: Optional scope restriction
    """
    def decorator(func):
        @wraps(func)
        async def permission_wrapper(*args, **kwargs):
            # Extract current_user from kwargs
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            # Get database session
            db = kwargs.get('db')
            if not db:
                raise HTTPException(status_code=500, detail="Database session not available")
            
            # Check if user has one of the allowed roles
            if allowed_roles:
                # Check legacy role field first (for backward compatibility)
                if hasattr(current_user, 'role') and current_user.role in allowed_roles:
                    # User has an allowed role via legacy field, grant access
                    return await func(*args, **kwargs)
                
                # Get user's roles from Role table
                permission_service = PermissionService(db)
                user_roles = await permission_service.get_user_roles(current_user.id)
                user_role_names = {role.name for role in user_roles}
                
                # Check if user has any of the allowed roles
                if any(role_name in user_role_names for role_name in allowed_roles):
                    # User has an allowed role, grant access
                    return await func(*args, **kwargs)
            
            # User doesn't have an allowed role, check permission
            permission_service = PermissionService(db)
            has_perm = await permission_service.has_permission(
                current_user, resource_type, action, scope=scope
            )
            
            if not has_perm:
                # Build detailed error message
                error_detail = {
                    "error": "insufficient_permissions",
                    "message": f"You need {resource_type.value}.{action.value} permission or one of these roles to access this resource",
                    "required_permission": f"{resource_type.value}.{action.value}",
                    "required_roles": allowed_roles or []
                }
                raise HTTPException(status_code=403, detail=error_detail)
            
            return await func(*args, **kwargs)
        
        return permission_wrapper
    return decorator