"""
Permission Management API endpoints.

Provides REST API endpoints for managing permissions, roles, and user access control.
Includes CRUD operations, role assignments, and permission templates.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from uuid import UUID
import logging

from app.database import get_db
from app.models import User
from app.models.permissions import (
    Permission, Role, RolePermission, UserRole, UserPermission, PermissionTemplate,
    ResourceType, PermissionAction, PermissionScope
)
from app.services.permission_service import PermissionService, require_permission
from app.routers.auth import get_current_user
from app.permission_schemas import (
    PermissionCreate, PermissionUpdate, PermissionResponse,
    RoleCreate, RoleUpdate, RoleResponse, RoleAssignmentCreate,
    UserPermissionCreate, UserPermissionResponse,
    PermissionTemplateCreate, PermissionTemplateResponse,
    PermissionMatrixResponse, BulkRoleAssignment
)

router = APIRouter(prefix="/permissions", tags=["permissions"])
logger = logging.getLogger(__name__)


# ==================== PERMISSION CRUD ====================

@router.get("/", response_model=List[PermissionResponse])
@require_permission(ResourceType.SYSTEM, PermissionAction.VIEW_ALL)
async def list_permissions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    resource_type: Optional[ResourceType] = Query(None),
    action: Optional[PermissionAction] = Query(None),
    scope: Optional[PermissionScope] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all permissions with optional filtering."""
    query = select(Permission)
    
    # Apply filters
    filters = []
    if resource_type:
        filters.append(Permission.resource_type == resource_type)
    if action:
        filters.append(Permission.action == action)
    if scope:
        filters.append(Permission.scope == scope)
    if is_active is not None:
        filters.append(Permission.is_active == is_active)
    
    if filters:
        query = query.where(and_(*filters))
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    permissions = result.scalars().all()
    
    return [PermissionResponse.from_orm(p) for p in permissions]


@router.post("/", response_model=PermissionResponse)
@require_permission(ResourceType.SYSTEM, PermissionAction.CREATE)
async def create_permission(
    permission_data: PermissionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new permission."""
    permission_service = PermissionService(db)
    
    permission = await permission_service.create_permission(
        name=permission_data.name,
        description=permission_data.description,
        resource_type=permission_data.resource_type,
        action=permission_data.action,
        scope=permission_data.scope,
        created_by=current_user.id
    )
    
    return PermissionResponse.from_orm(permission)


@router.get("/{permission_id}", response_model=PermissionResponse)
@require_permission(ResourceType.SYSTEM, PermissionAction.READ)
async def get_permission(
    permission_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific permission by ID."""
    permission = await db.get(Permission, permission_id)
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    return PermissionResponse.from_orm(permission)


@router.put("/{permission_id}", response_model=PermissionResponse)
@require_permission(ResourceType.SYSTEM, PermissionAction.UPDATE)
async def update_permission(
    permission_data: PermissionUpdate,
    permission_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a permission."""
    permission = await db.get(Permission, permission_id)
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    if permission.is_system_permission:
        raise HTTPException(status_code=403, detail="Cannot modify system permission")
    
    # Update fields
    for field, value in permission_data.dict(exclude_unset=True).items():
        setattr(permission, field, value)
    
    await db.commit()
    await db.refresh(permission)
    
    return PermissionResponse.from_orm(permission)


@router.delete("/{permission_id}")
@require_permission(ResourceType.SYSTEM, PermissionAction.DELETE)
async def delete_permission(
    permission_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a permission."""
    permission = await db.get(Permission, permission_id)
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    if permission.is_system_permission:
        raise HTTPException(status_code=403, detail="Cannot delete system permission")
    
    await db.delete(permission)
    await db.commit()
    
    return {"message": "Permission deleted successfully"}


# ==================== ROLE CRUD ====================

@router.get("/roles", response_model=List[RoleResponse])
@require_permission(ResourceType.SYSTEM, PermissionAction.VIEW_ALL)
async def list_roles(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    is_active: Optional[bool] = Query(None),
    level: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all roles with optional filtering."""
    query = select(Role).options(selectinload(Role.role_permissions))
    
    # Apply filters
    filters = []
    if is_active is not None:
        filters.append(Role.is_active == is_active)
    if level is not None:
        filters.append(Role.level == level)
    
    if filters:
        query = query.where(and_(*filters))
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    roles = result.scalars().all()
    
    return [RoleResponse.from_orm(r) for r in roles]


@router.post("/roles", response_model=RoleResponse)
@require_permission(ResourceType.SYSTEM, PermissionAction.CREATE)
async def create_role(
    role_data: RoleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new role."""
    permission_service = PermissionService(db)
    
    role = await permission_service.create_role(
        name=role_data.name,
        display_name=role_data.display_name,
        description=role_data.description,
        level=role_data.level,
        parent_role_id=role_data.parent_role_id,
        created_by=current_user.id
    )
    
    return RoleResponse.from_orm(role)


@router.get("/roles/{role_id}", response_model=RoleResponse)
@require_permission(ResourceType.SYSTEM, PermissionAction.READ)
async def get_role(
    role_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific role by ID."""
    query = select(Role).where(Role.id == role_id).options(
        selectinload(Role.role_permissions).selectinload(RolePermission.permission)
    )
    result = await db.execute(query)
    role = result.scalar_one_or_none()
    
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    return RoleResponse.from_orm(role)


@router.put("/roles/{role_id}", response_model=RoleResponse)
@require_permission(ResourceType.SYSTEM, PermissionAction.UPDATE)
async def update_role(
    role_data: RoleUpdate,
    role_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a role."""
    role = await db.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role.is_system_role:
        raise HTTPException(status_code=403, detail="Cannot modify system role")
    
    # Update fields
    for field, value in role_data.dict(exclude_unset=True).items():
        setattr(role, field, value)
    
    await db.commit()
    await db.refresh(role)
    
    return RoleResponse.from_orm(role)


@router.delete("/roles/{role_id}")
@require_permission(ResourceType.SYSTEM, PermissionAction.DELETE)
async def delete_role(
    role_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a role."""
    role = await db.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role.is_system_role:
        raise HTTPException(status_code=403, detail="Cannot delete system role")
    
    await db.delete(role)
    await db.commit()
    
    return {"message": "Role deleted successfully"}


# ==================== ROLE-PERMISSION MANAGEMENT ====================

@router.post("/roles/{role_id}/permissions/{permission_id}")
@require_permission(ResourceType.SYSTEM, PermissionAction.ASSIGN)
async def assign_permission_to_role(
    role_id: UUID = Path(...),
    permission_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Assign a permission to a role."""
    permission_service = PermissionService(db)
    
    # Verify role and permission exist
    role = await db.get(Role, role_id)
    permission = await db.get(Permission, permission_id)
    
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    role_permission = await permission_service.assign_permission_to_role(
        role_id=role_id,
        permission_id=permission_id,
        granted_by=current_user.id
    )
    
    return {"message": "Permission assigned to role successfully"}


@router.delete("/roles/{role_id}/permissions/{permission_id}")
@require_permission(ResourceType.SYSTEM, PermissionAction.ASSIGN)
async def revoke_permission_from_role(
    role_id: UUID = Path(...),
    permission_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Revoke a permission from a role."""
    stmt = select(RolePermission).where(
        and_(
            RolePermission.role_id == role_id,
            RolePermission.permission_id == permission_id
        )
    )
    result = await db.execute(stmt)
    role_permission = result.scalar_one_or_none()
    
    if not role_permission:
        raise HTTPException(status_code=404, detail="Role permission not found")
    
    await db.delete(role_permission)
    await db.commit()
    
    return {"message": "Permission revoked from role successfully"}


# ==================== USER ROLE MANAGEMENT ====================

@router.post("/users/{user_id}/roles")
@require_permission(ResourceType.USER, PermissionAction.ASSIGN)
async def assign_role_to_user(
    assignment_data: RoleAssignmentCreate,
    user_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Assign a role to a user."""
    permission_service = PermissionService(db)
    
    # Verify user and role exist
    user = await db.get(User, user_id)
    role = await db.get(Role, assignment_data.role_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    user_role = await permission_service.assign_role_to_user(
        user_id=user_id,
        role_id=assignment_data.role_id,
        assigned_by=current_user.id,
        department_id=assignment_data.department_id,
        branch_id=assignment_data.branch_id,
        effective_until=assignment_data.effective_until
    )
    
    return {"message": "Role assigned to user successfully"}


@router.delete("/users/{user_id}/roles/{role_id}")
@require_permission(ResourceType.USER, PermissionAction.ASSIGN)
async def revoke_role_from_user(
    user_id: UUID = Path(...),
    role_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Revoke a role from a user."""
    permission_service = PermissionService(db)
    
    success = await permission_service.revoke_role_from_user(
        user_id=user_id,
        role_id=role_id,
        revoked_by=current_user.id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="User role assignment not found")
    
    return {"message": "Role revoked from user successfully"}


@router.get("/users/{user_id}/roles", response_model=List[RoleResponse])
@require_permission(ResourceType.USER, PermissionAction.READ)
async def get_user_roles(
    user_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all roles assigned to a user."""
    permission_service = PermissionService(db)
    roles = await permission_service.get_user_roles(user_id)
    
    return [RoleResponse.from_orm(r) for r in roles]


# ==================== USER PERMISSION MANAGEMENT ====================

@router.post("/users/{user_id}/permissions")
@require_permission(ResourceType.USER, PermissionAction.ASSIGN)
async def grant_permission_to_user(
    permission_data: UserPermissionCreate,
    user_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Grant a specific permission directly to a user."""
    permission_service = PermissionService(db)
    
    # Verify user and permission exist
    user = await db.get(User, user_id)
    permission = await db.get(Permission, permission_data.permission_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    user_permission = await permission_service.grant_permission_to_user(
        user_id=user_id,
        permission_id=permission_data.permission_id,
        granted_by=current_user.id,
        resource_id=permission_data.resource_id,
        department_id=permission_data.department_id,
        branch_id=permission_data.branch_id,
        conditions=permission_data.conditions,
        reason=permission_data.reason
    )
    
    return {"message": "Permission granted to user successfully"}


@router.get("/users/{user_id}/permissions", response_model=List[UserPermissionResponse])
@require_permission(ResourceType.USER, PermissionAction.READ)
async def get_user_permissions(
    user_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all effective permissions for a user."""
    permission_service = PermissionService(db)
    permissions = await permission_service.get_user_permissions(user_id)
    
    return [UserPermissionResponse.from_dict(p) for p in permissions]


# ==================== BULK OPERATIONS ====================

@router.post("/bulk/role-assignments")
@require_permission(ResourceType.SYSTEM, PermissionAction.MANAGE)
async def bulk_assign_roles(
    assignments: BulkRoleAssignment,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Bulk assign roles to multiple users."""
    permission_service = PermissionService(db)
    results = []
    
    for assignment in assignments.assignments:
        try:
            user_role = await permission_service.assign_role_to_user(
                user_id=assignment.user_id,
                role_id=assignment.role_id,
                assigned_by=current_user.id,
                department_id=assignment.department_id,
                branch_id=assignment.branch_id
            )
            results.append({
                "user_id": assignment.user_id,
                "role_id": assignment.role_id,
                "status": "success"
            })
        except Exception as e:
            results.append({
                "user_id": assignment.user_id,
                "role_id": assignment.role_id,
                "status": "error",
                "error": str(e)
            })
    
    return {"results": results}


# ==================== PERMISSION MATRIX ====================

@router.get("/matrix", response_model=PermissionMatrixResponse)
@require_permission(ResourceType.SYSTEM, PermissionAction.VIEW_ALL)
async def get_permission_matrix(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a comprehensive permission matrix showing roles and their permissions."""
    # Get all roles with their permissions
    stmt = select(Role).options(
        selectinload(Role.role_permissions).selectinload(RolePermission.permission)
    ).where(Role.is_active == True)
    
    result = await db.execute(stmt)
    roles = result.scalars().all()
    
    # Get all permissions
    perm_stmt = select(Permission).where(Permission.is_active == True)
    perm_result = await db.execute(perm_stmt)
    all_permissions = perm_result.scalars().all()
    
    # Build matrix
    matrix = {
        "roles": [],
        "permissions": [PermissionResponse.from_orm(p) for p in all_permissions],
        "matrix": {}
    }
    
    for role in roles:
        role_data = RoleResponse.from_orm(role)
        matrix["roles"].append(role_data)
        
        # Map role permissions
        role_permission_ids = {rp.permission_id for rp in role.role_permissions if rp.is_granted}
        matrix["matrix"][str(role.id)] = {
            str(perm.id): str(perm.id) in role_permission_ids
            for perm in all_permissions
        }
    
    return PermissionMatrixResponse(**matrix)


# ==================== PERMISSION TEMPLATES ====================

@router.get("/templates", response_model=List[PermissionTemplateResponse])
@require_permission(ResourceType.SYSTEM, PermissionAction.READ)
async def list_permission_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    template_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all permission templates."""
    query = select(PermissionTemplate).where(PermissionTemplate.is_active == True)
    
    if template_type:
        query = query.where(PermissionTemplate.template_type == template_type)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    templates = result.scalars().all()
    
    return [PermissionTemplateResponse.from_orm(t) for t in templates]


@router.post("/templates", response_model=PermissionTemplateResponse)
@require_permission(ResourceType.SYSTEM, PermissionAction.CREATE)
async def create_permission_template(
    template_data: PermissionTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new permission template."""
    template = PermissionTemplate(
        name=template_data.name,
        description=template_data.description,
        template_type=template_data.template_type,
        permissions=template_data.permissions,
        default_conditions=template_data.default_conditions,
        created_by=current_user.id
    )
    
    db.add(template)

    
    await db.flush()

    
    await db.refresh(template)
    await db.refresh(template)
    
    return PermissionTemplateResponse.from_orm(template)


@router.post("/templates/{template_id}/apply/{target_type}/{target_id}")
@require_permission(ResourceType.SYSTEM, PermissionAction.MANAGE)
async def apply_permission_template(
    template_id: UUID = Path(...),
    target_type: str = Path(..., regex="^(role|user)$"),
    target_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Apply a permission template to a role or user."""
    permission_service = PermissionService(db)
    
    success = await permission_service.apply_permission_template(
        template_id=template_id,
        target_id=target_id,
        target_type=target_type,
        applied_by=current_user.id
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to apply template")
    
    return {"message": f"Template applied to {target_type} successfully"}