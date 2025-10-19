"""
Permission Management API endpoints.

Provides REST API endpoints for managing permissions, roles, and user access control.
Includes CRUD operations, role assignments, and permission templates.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Path, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from uuid import UUID
from datetime import datetime
import logging
import json
import csv
import io

from app.database import get_db
from app.models import User
from app.models.permissions import (
    Permission, Role, RolePermission, UserRole, UserPermission, PermissionTemplate,
    ResourceType, PermissionAction, PermissionScope
)
from app.services.permission_service import PermissionService, require_permission, require_permission_or_role
from app.routers.auth import get_current_user
from app.permission_schemas import (
    PermissionCreate, PermissionUpdate, PermissionResponse,
    RoleCreate, RoleUpdate, RoleResponse, RoleAssignmentCreate,
    RoleFromTemplateCreate, MatrixToggleRequest, TemplateImportResponse,
    UserPermissionCreate, UserPermissionResponse,
    PermissionTemplateCreate, PermissionTemplateResponse,
    PermissionMatrixResponse, PermissionMatrixRole, PermissionMatrixPermission,
    BulkRoleAssignment,
    TemplateGenerationRequest, TemplateSuggestionRequest, TemplateSuggestionResponse,
    BulkTemplateGenerationRequest, BulkTemplateGenerationResponse,
    TemplatePreviewRequest, TemplatePreviewResponse
)

router = APIRouter(tags=["permissions"])
logger = logging.getLogger(__name__)


# ==================== ROLE CRUD ====================
# NOTE: Specific routes must come before generic /{permission_id} routes

@router.get("/roles", response_model=List[RoleResponse])
@require_permission_or_role(
    ResourceType.SYSTEM, 
    PermissionAction.VIEW_ALL,
    allowed_roles=['admin', 'super_admin']
)
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
@require_permission_or_role(
    ResourceType.SYSTEM, 
    PermissionAction.READ,
    allowed_roles=['admin', 'super_admin']
)
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


@router.post("/roles/from-template", response_model=RoleResponse)
@require_permission(ResourceType.SYSTEM, PermissionAction.CREATE)
async def create_role_from_template(
    role_data: RoleFromTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new role from a permission template.
    
    This endpoint creates a role and automatically assigns all permissions
    from the specified template to the new role.
    """
    permission_service = PermissionService(db)
    
    try:
        role = await permission_service.create_role_from_template(
            template_id=role_data.template_id,
            name=role_data.name,
            display_name=role_data.display_name,
            description=role_data.description,
            level=role_data.level,
            created_by=current_user.id
        )
        
        return RoleResponse.from_orm(role)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating role from template: {e}")
        raise HTTPException(status_code=500, detail="Failed to create role from template")


@router.get("/roles/standard", response_model=List[RoleResponse])
@require_permission_or_role(
    ResourceType.SYSTEM,
    PermissionAction.READ,
    allowed_roles=['admin', 'super_admin']
)
async def get_standard_roles(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all standard (system) roles.
    
    Returns roles that are marked as system roles, which are predefined
    roles with standard permission sets.
    """
    query = select(Role).where(Role.is_system_role == True).options(
        selectinload(Role.role_permissions).selectinload(RolePermission.permission)
    ).order_by(Role.level.desc(), Role.display_name)
    
    result = await db.execute(query)
    roles = result.scalars().all()
    
    return [RoleResponse.from_orm(r) for r in roles]


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
@require_permission_or_role(
    ResourceType.SYSTEM, 
    PermissionAction.VIEW_ALL,
    allowed_roles=['admin', 'super_admin']
)
async def get_permission_matrix(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a comprehensive permission matrix showing roles and their permissions.
    Returns a matrix of roles vs permissions with assignment indicators.
    """
    try:
        # Get all active roles with their permissions
        roles_query = select(Role).options(
            selectinload(Role.role_permissions).selectinload(RolePermission.permission)
        ).where(Role.is_active == True).order_by(Role.level.desc(), Role.display_name)
        
        roles_result = await db.execute(roles_query)
        roles = roles_result.scalars().all()
        
        # Get all active permissions
        permissions_query = select(Permission).where(
            Permission.is_active == True
        ).order_by(
            Permission.resource_type,
            Permission.action,
            Permission.scope
        )
        
        permissions_result = await db.execute(permissions_query)
        permissions = permissions_result.scalars().all()
        
        # Build matrix data structure
        matrix_data = {
            "roles": [
                {
                    "id": str(role.id),
                    "name": role.name,
                    "display_name": role.display_name,
                    "level": role.level,
                    "is_system_role": role.is_system_role
                }
                for role in roles
            ],
            "permissions": [
                {
                    "id": str(perm.id),
                    "name": perm.name,
                    "resource_type": perm.resource_type.value,
                    "action": perm.action.value,
                    "scope": perm.scope.value if perm.scope else None,
                    "is_system_permission": perm.is_system_permission
                }
                for perm in permissions
            ],
            "assignments": {}
        }
        
        # Build assignments map: role_id -> [permission_ids]
        for role in roles:
            role_id = str(role.id)
            matrix_data["assignments"][role_id] = [
                str(rp.permission_id)
                for rp in role.role_permissions
                if rp.is_granted
            ]
        
        return PermissionMatrixResponse(**matrix_data)
        
    except Exception as e:
        logger.error(f"Error fetching permission matrix: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "matrix_fetch_failed",
                "message": "Failed to fetch permission matrix",
                "details": str(e)
            }
        )


@router.put("/matrix/toggle")
@require_permission(ResourceType.SYSTEM, PermissionAction.MANAGE)
async def toggle_permission_in_matrix(
    toggle_data: MatrixToggleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Toggle a permission assignment for a role in the permission matrix.
    
    This endpoint allows granting or revoking permissions from roles.
    System roles cannot be modified.
    """
    permission_service = PermissionService(db)
    
    # Validate role exists
    role = await db.get(Role, toggle_data.role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role.is_system_role:
        raise HTTPException(
            status_code=403,
            detail="Cannot modify system role permissions"
        )
    
    # Validate permission exists
    permission = await db.get(Permission, toggle_data.permission_id)
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    try:
        if toggle_data.is_granted:
            # Grant permission to role
            await permission_service.assign_permission_to_role(
                role_id=toggle_data.role_id,
                permission_id=toggle_data.permission_id,
                granted_by=current_user.id
            )
            message = f"Permission {permission.name} granted to role {role.name}"
        else:
            # Revoke permission from role
            stmt = select(RolePermission).where(
                and_(
                    RolePermission.role_id == toggle_data.role_id,
                    RolePermission.permission_id == toggle_data.permission_id
                )
            )
            result = await db.execute(stmt)
            role_permission = result.scalar_one_or_none()
            
            if role_permission:
                await db.delete(role_permission)
                await db.commit()
                message = f"Permission {permission.name} revoked from role {role.name}"
            else:
                raise HTTPException(
                    status_code=404,
                    detail="Permission assignment not found"
                )
        
        return {
            "success": True,
            "message": message,
            "role_id": str(toggle_data.role_id),
            "permission_id": str(toggle_data.permission_id),
            "is_granted": toggle_data.is_granted
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling permission in matrix: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to toggle permission assignment"
        )


# ==================== PERMISSION TEMPLATES ====================

@router.get("/templates", response_model=List[PermissionTemplateResponse])
@require_permission_or_role(
    ResourceType.SYSTEM, 
    PermissionAction.READ,
    allowed_roles=['admin', 'super_admin']
)
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


@router.get("/templates/{template_id}/export")
@require_permission_or_role(
    ResourceType.SYSTEM,
    PermissionAction.READ,
    allowed_roles=['admin', 'super_admin']
)
async def export_permission_template(
    template_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Export a permission template to a portable JSON format.
    
    The exported template can be imported into other systems or used as a backup.
    """
    permission_service = PermissionService(db)
    
    try:
        export_data = await permission_service.export_template(template_id)
        
        # Return as downloadable JSON file
        filename = f"template_{export_data['template_name'].replace(' ', '_')}.json"
        
        return JSONResponse(
            content=export_data,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error exporting template: {e}")
        raise HTTPException(status_code=500, detail="Failed to export template")


@router.post("/templates/import", response_model=TemplateImportResponse)
@require_permission(ResourceType.SYSTEM, PermissionAction.CREATE)
async def import_permission_template(
    file: UploadFile = File(...),
    update_if_exists: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Import a permission template from a JSON file.
    
    The template file should be in the format exported by the export endpoint.
    If update_if_exists is True, existing templates with the same name will be updated.
    """
    permission_service = PermissionService(db)
    
    try:
        # Read and parse the uploaded file
        content = await file.read()
        template_data = json.loads(content.decode('utf-8'))
        
        # Import the template
        result = await permission_service.import_template(
            template_data=template_data,
            imported_by=current_user.id,
            update_if_exists=update_if_exists
        )
        
        # Convert template to response format
        template_response = PermissionTemplateResponse.from_orm(result['template'])
        
        return TemplateImportResponse(
            template=template_response,
            action=result['action'],
            mapped_count=result['mapped_count'],
            unmapped_count=result['unmapped_count'],
            unmapped_permissions=result['unmapped_permissions']
        )
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error importing template: {e}")
        raise HTTPException(status_code=500, detail="Failed to import template")


# ==================== TEMPLATE GENERATION ====================

@router.post("/templates/generate-from-roles", response_model=PermissionTemplateResponse)
@require_permission(ResourceType.SYSTEM, PermissionAction.CREATE)
async def generate_template_from_roles(
    request: TemplateGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate a permission template from existing roles."""
    permission_service = PermissionService(db)

    try:
        # Get roles and their permissions
        role_ids = request.source_role_ids
        query = select(Role).where(Role.id.in_(role_ids))

        if not request.include_inactive_roles:
            query = query.where(Role.is_active == True)

        result = await db.execute(query)
        roles = result.scalars().all()

        if not roles:
            raise HTTPException(status_code=404, detail="No valid roles found")

        # Collect all unique permissions from the roles
        permission_ids = set()
        for role in roles:
            for role_permission in role.role_permissions:
                if role_permission.is_granted:
                    permission_ids.add(role_permission.permission_id)

        if not permission_ids:
            raise HTTPException(status_code=400, detail="No permissions found in the specified roles")

        # Create the template
        template = PermissionTemplate(
            name=request.template_name,
            description=request.template_description,
            template_type="generated_from_roles",
            permissions=list(permission_ids),
            created_by=current_user.id
        )

        db.add(template)
        await db.flush()
        await db.refresh(template)

        return PermissionTemplateResponse.from_orm(template)

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate template: {str(e)}")


@router.post("/templates/suggestions", response_model=TemplateSuggestionResponse)
@require_permission_or_role(
    ResourceType.SYSTEM, 
    PermissionAction.READ,
    allowed_roles=['admin', 'super_admin']
)
async def get_template_suggestions(
    request: TemplateSuggestionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get template suggestions based on role analysis."""
    try:
        # Get active roles with their permissions
        query = select(Role).options(
            selectinload(Role.role_permissions).selectinload(RolePermission.permission)
        ).where(Role.is_active == True)

        result = await db.execute(query)
        roles = result.scalars().all()

        suggestions = []
        analysis_metadata = {
            "total_roles_analyzed": len(roles),
            "analysis_type": request.analysis_type,
            "role_limit": request.role_limit or 10
        }

        if request.analysis_type == "pattern":
            # Analyze permission patterns
            role_permission_patterns = {}
            for role in roles:
                permission_set = {rp.permission_id for rp in role.role_permissions if rp.is_granted}
                pattern_key = frozenset(permission_set)
                if pattern_key not in role_permission_patterns:
                    role_permission_patterns[pattern_key] = []
                role_permission_patterns[pattern_key].append(role)

            # Find common patterns
            common_patterns = [
                {"pattern": list(pattern), "roles": [r.name for r in roles_with_pattern], "count": len(roles_with_pattern)}
                for pattern, roles_with_pattern in role_permission_patterns.items()
                if len(roles_with_pattern) > 1
            ]

            # Sort by frequency and take top suggestions
            common_patterns.sort(key=lambda x: x["count"], reverse=True)
            suggestions = common_patterns[:request.role_limit]

        elif request.analysis_type == "usage":
            # Analyze roles by usage frequency (mock implementation)
            role_usage = []
            for role in roles:
                permission_count = len([rp for rp in role.role_permissions if rp.is_granted])
                if permission_count >= (request.min_permission_count or 1):
                    role_usage.append({
                        "role_name": role.name,
                        "permission_count": permission_count,
                        "suggested_template_name": f"{role.display_name} Template"
                    })

            role_usage.sort(key=lambda x: x["permission_count"], reverse=True)
            suggestions = role_usage[:request.role_limit]

        elif request.analysis_type == "similarity":
            # Find similar roles based on permission overlap
            similar_roles = []
            for i, role1 in enumerate(roles):
                for role2 in roles[i+1:]:
                    perm_set1 = {rp.permission_id for rp in role1.role_permissions if rp.is_granted}
                    perm_set2 = {rp.permission_id for rp in role2.role_permissions if rp.is_granted}

                    if perm_set1 and perm_set2:
                        intersection = len(perm_set1.intersection(perm_set2))
                        union = len(perm_set1.union(perm_set2))
                        similarity = intersection / union if union > 0 else 0

                        if similarity > 0.5:  # 50% similarity threshold
                            similar_roles.append({
                                "role1": role1.name,
                                "role2": role2.name,
                                "similarity": similarity,
                                "suggested_template_name": f"{role1.display_name} + {role2.display_name} Template"
                            })

            similar_roles.sort(key=lambda x: x["similarity"], reverse=True)
            suggestions = similar_roles[:request.role_limit]

        return TemplateSuggestionResponse(
            suggestions=suggestions,
            analysis_metadata=analysis_metadata
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}")


@router.post("/templates/bulk-generate", response_model=BulkTemplateGenerationResponse)
@require_permission(ResourceType.SYSTEM, PermissionAction.CREATE)
async def bulk_generate_templates(
    request: BulkTemplateGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate multiple permission templates in bulk."""
    permission_service = PermissionService(db)
    results = []
    success_count = 0
    failure_count = 0

    try:
        for config in request.generation_configs:
            try:
                # Get roles and their permissions
                role_ids = config.source_role_ids
                query = select(Role).where(Role.id.in_(role_ids))

                if not config.include_inactive_roles:
                    query = query.where(Role.is_active == True)

                result = await db.execute(query)
                roles = result.scalars().all()

                if not roles:
                    results.append({
                        "template_name": config.template_name,
                        "status": "error",
                        "error": "No valid roles found"
                    })
                    failure_count += 1
                    continue

                # Collect all unique permissions from the roles
                permission_ids = set()
                for role in roles:
                    for role_permission in role.role_permissions:
                        if role_permission.is_granted:
                            permission_ids.add(role_permission.permission_id)

                if not permission_ids:
                    results.append({
                        "template_name": config.template_name,
                        "status": "error",
                        "error": "No permissions found in the specified roles"
                    })
                    failure_count += 1
                    continue

                # Create the template
                template = PermissionTemplate(
                    name=config.template_name,
                    description=config.template_description,
                    template_type="bulk_generated",
                    permissions=list(permission_ids),
                    created_by=current_user.id
                )

                db.add(template)
                results.append({
                    "template_name": config.template_name,
                    "status": "success",
                    "template_id": str(template.id),
                    "permission_count": len(permission_ids)
                })
                success_count += 1

            except Exception as e:
                results.append({
                    "template_name": config.template_name,
                    "status": "error",
                    "error": str(e)
                })
                failure_count += 1

        await db.commit()

        return BulkTemplateGenerationResponse(
            results=results,
            success_count=success_count,
            failure_count=failure_count
        )

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to bulk generate templates: {str(e)}")


@router.post("/templates/preview", response_model=TemplatePreviewResponse)
@require_permission_or_role(
    ResourceType.SYSTEM, 
    PermissionAction.READ,
    allowed_roles=['admin', 'super_admin']
)
async def preview_template_generation(
    request: TemplatePreviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Preview template generation without actually creating the template."""
    try:
        # Get roles and their permissions
        role_ids = request.source_role_ids
        query = select(Role).options(
            selectinload(Role.role_permissions).selectinload(RolePermission.permission)
        ).where(Role.id.in_(role_ids))

        if not request.include_inactive_roles:
            query = query.where(Role.is_active == True)

        result = await db.execute(query)
        roles = result.scalars().all()

        if not roles:
            raise HTTPException(status_code=404, detail="No valid roles found")

        # Analyze roles
        role_analysis = {}
        all_permissions = set()

        for role in roles:
            role_permissions = [rp for rp in role.role_permissions if rp.is_granted]
            permission_ids = {rp.permission_id for rp in role_permissions}

            role_analysis[role.name] = {
                "role_id": str(role.id),
                "display_name": role.display_name,
                "permission_count": len(permission_ids),
                "permissions": [str(pid) for pid in permission_ids]
            }

            all_permissions.update(permission_ids)

        # Get permission details
        if all_permissions:
            perm_query = select(Permission).where(Permission.id.in_(all_permissions))
            perm_result = await db.execute(perm_query)
            permission_objects = perm_result.scalars().all()
            suggested_permissions = [PermissionResponse.from_orm(p) for p in permission_objects]
        else:
            suggested_permissions = []

        # Generate preview data based on type
        preview_data = {}

        if request.preview_type == "summary":
            preview_data = {
                "total_roles": len(roles),
                "total_unique_permissions": len(all_permissions),
                "estimated_template_size": len(all_permissions),
                "role_breakdown": {name: analysis["permission_count"] for name, analysis in role_analysis.items()}
            }
        elif request.preview_type == "detailed":
            preview_data = {
                "roles": role_analysis,
                "permission_details": {
                    str(p.id): {
                        "name": p.name,
                        "description": p.description,
                        "resource_type": p.resource_type.value,
                        "action": p.action.value
                    }
                    for p in permission_objects
                }
            }
        elif request.preview_type == "comparison":
            # Compare with existing templates
            template_query = select(PermissionTemplate).where(PermissionTemplate.is_active == True)
            template_result = await db.execute(template_query)
            existing_templates = template_result.scalars().all()

            comparisons = []
            for template in existing_templates:
                template_perms = set(template.permissions)
                intersection = len(all_permissions.intersection(template_perms))
                union = len(all_permissions.union(template_perms))
                similarity = intersection / union if union > 0 else 0

                comparisons.append({
                    "template_name": template.name,
                    "similarity": similarity,
                    "common_permissions": intersection,
                    "template_id": str(template.id)
                })

            comparisons.sort(key=lambda x: x["similarity"], reverse=True)
            preview_data = {
                "comparisons": comparisons[:5],  # Top 5 similar templates
                "recommendation": "Create new template" if not comparisons or comparisons[0]["similarity"] < 0.8 else "Consider using existing template"
            }

        return TemplatePreviewResponse(
            preview_data=preview_data,
            role_analysis=role_analysis,
            suggested_permissions=suggested_permissions,
            estimated_template_size=len(all_permissions)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate preview: {str(e)}")


# ==================== SYSTEM INITIALIZATION ====================

@router.post("/init-defaults")
async def initialize_default_permissions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Initialize default permissions and roles for the system."""
    permission_service = PermissionService(db)

    try:
        # Create default permissions
        permissions_data = [
            # System permissions
            {
                "name": "system_admin",
                "description": "Full system administration access",
                "resource_type": ResourceType.SYSTEM,
                "action": PermissionAction.MANAGE,
                "scope": PermissionScope.GLOBAL,
                "is_system_permission": True
            },
            {
                "name": "system_view",
                "description": "View system configuration and settings",
                "resource_type": ResourceType.SYSTEM,
                "action": PermissionAction.VIEW_ALL,
                "scope": PermissionScope.GLOBAL,
                "is_system_permission": True
            },

            # User permissions
            {
                "name": "user_create",
                "description": "Create new user accounts",
                "resource_type": ResourceType.USER,
                "action": PermissionAction.CREATE,
                "scope": PermissionScope.GLOBAL,
                "is_system_permission": True
            },
            {
                "name": "user_read",
                "description": "View user information",
                "resource_type": ResourceType.USER,
                "action": PermissionAction.READ,
                "scope": PermissionScope.DEPARTMENT,
                "is_system_permission": True
            },
            {
                "name": "user_update",
                "description": "Update user information",
                "resource_type": ResourceType.USER,
                "action": PermissionAction.UPDATE,
                "scope": PermissionScope.DEPARTMENT,
                "is_system_permission": True
            },
            {
                "name": "user_delete",
                "description": "Delete user accounts",
                "resource_type": ResourceType.USER,
                "action": PermissionAction.DELETE,
                "scope": PermissionScope.GLOBAL,
                "is_system_permission": True
            },
            {
                "name": "user_assign",
                "description": "Assign roles and permissions to users",
                "resource_type": ResourceType.USER,
                "action": PermissionAction.ASSIGN,
                "scope": PermissionScope.DEPARTMENT,
                "is_system_permission": True
            },

            # Application permissions
            {
                "name": "application_create",
                "description": "Create new loan applications",
                "resource_type": ResourceType.APPLICATION,
                "action": PermissionAction.CREATE,
                "scope": PermissionScope.DEPARTMENT,
                "is_system_permission": True
            },
            {
                "name": "application_read",
                "description": "View loan applications",
                "resource_type": ResourceType.APPLICATION,
                "action": PermissionAction.READ,
                "scope": PermissionScope.DEPARTMENT,
                "is_system_permission": True
            },
            {
                "name": "application_update",
                "description": "Update loan applications",
                "resource_type": ResourceType.APPLICATION,
                "action": PermissionAction.UPDATE,
                "scope": PermissionScope.OWN,
                "is_system_permission": True
            },
            {
                "name": "application_approve",
                "description": "Approve loan applications",
                "resource_type": ResourceType.APPLICATION,
                "action": PermissionAction.APPROVE,
                "scope": PermissionScope.DEPARTMENT,
                "is_system_permission": True
            },
            {
                "name": "application_reject",
                "description": "Reject loan applications",
                "resource_type": ResourceType.APPLICATION,
                "action": PermissionAction.REJECT,
                "scope": PermissionScope.DEPARTMENT,
                "is_system_permission": True
            },

            # Department permissions
            {
                "name": "department_read",
                "description": "View department information",
                "resource_type": ResourceType.DEPARTMENT,
                "action": PermissionAction.READ,
                "scope": PermissionScope.DEPARTMENT,
                "is_system_permission": True
            },
            {
                "name": "department_manage",
                "description": "Manage department settings",
                "resource_type": ResourceType.DEPARTMENT,
                "action": PermissionAction.MANAGE,
                "scope": PermissionScope.OWN,
                "is_system_permission": True
            },

            # Branch permissions
            {
                "name": "branch_read",
                "description": "View branch information",
                "resource_type": ResourceType.BRANCH,
                "action": PermissionAction.READ,
                "scope": PermissionScope.BRANCH,
                "is_system_permission": True
            },
            {
                "name": "branch_manage",
                "description": "Manage branch settings",
                "resource_type": ResourceType.BRANCH,
                "action": PermissionAction.MANAGE,
                "scope": PermissionScope.OWN,
                "is_system_permission": True
            },

            # File permissions
            {
                "name": "file_upload",
                "description": "Upload files",
                "resource_type": ResourceType.FILE,
                "action": PermissionAction.CREATE,
                "scope": PermissionScope.DEPARTMENT,
                "is_system_permission": True
            },
            {
                "name": "file_read",
                "description": "View and download files",
                "resource_type": ResourceType.FILE,
                "action": PermissionAction.READ,
                "scope": PermissionScope.DEPARTMENT,
                "is_system_permission": True
            },
            {
                "name": "file_delete",
                "description": "Delete files",
                "resource_type": ResourceType.FILE,
                "action": PermissionAction.DELETE,
                "scope": PermissionScope.OWN,
                "is_system_permission": True
            },

            # Analytics permissions
            {
                "name": "analytics_view",
                "description": "View analytics and reports",
                "resource_type": ResourceType.ANALYTICS,
                "action": PermissionAction.READ,
                "scope": PermissionScope.DEPARTMENT,
                "is_system_permission": True
            },
            {
                "name": "analytics_export",
                "description": "Export analytics data",
                "resource_type": ResourceType.ANALYTICS,
                "action": PermissionAction.EXPORT,
                "scope": PermissionScope.DEPARTMENT,
                "is_system_permission": True
            },

            # Notification permissions
            {
                "name": "notification_send",
                "description": "Send notifications",
                "resource_type": ResourceType.NOTIFICATION,
                "action": PermissionAction.CREATE,
                "scope": PermissionScope.DEPARTMENT,
                "is_system_permission": True
            },
            {
                "name": "notification_view",
                "description": "View notifications",
                "resource_type": ResourceType.NOTIFICATION,
                "action": PermissionAction.READ,
                "scope": PermissionScope.OWN,
                "is_system_permission": True
            }
        ]

        # Create permissions
        created_permissions = {}
        for perm_data in permissions_data:
            try:
                permission = await permission_service.create_permission(
                    name=perm_data["name"],
                    description=perm_data["description"],
                    resource_type=perm_data["resource_type"],
                    action=perm_data["action"],
                    scope=perm_data["scope"],
                    created_by=current_user.id
                )
                created_permissions[perm_data["name"]] = permission
                print(f"Created permission: {perm_data['name']}")
            except Exception as e:
                print(f"Permission {perm_data['name']} may already exist: {e}")
                # Try to get existing permission
                stmt = select(Permission).where(Permission.name == perm_data["name"])
                result = await db.execute(stmt)
                existing = result.scalar_one_or_none()
                if existing:
                    created_permissions[perm_data["name"]] = existing

        # Create default roles
        roles_data = [
            {
                "name": "super_admin",
                "display_name": "Super Administrator",
                "description": "Full system access with all permissions",
                "level": 100,
                "is_system_role": True,
                "is_default": False,
                "permissions": ["system_admin", "system_view", "user_create", "user_read", "user_update", "user_delete", "user_assign",
                              "application_create", "application_read", "application_update", "application_approve", "application_reject",
                              "department_read", "department_manage", "branch_read", "branch_manage",
                              "file_upload", "file_read", "file_delete", "analytics_view", "analytics_export",
                              "notification_send", "notification_view"]
            },
            {
                "name": "admin",
                "display_name": "Administrator",
                "description": "Administrative access with management permissions",
                "level": 80,
                "is_system_role": True,
                "is_default": False,
                "permissions": ["system_view", "user_read", "user_update", "user_assign",
                              "application_read", "application_approve", "application_reject",
                              "department_read", "department_manage", "branch_read", "branch_manage",
                              "file_upload", "file_read", "analytics_view", "analytics_export",
                              "notification_send", "notification_view"]
            },
            {
                "name": "manager",
                "display_name": "Manager",
                "description": "Management role with approval and oversight permissions",
                "level": 60,
                "is_system_role": True,
                "is_default": False,
                "permissions": ["user_read", "application_create", "application_read", "application_update", "application_approve",
                              "department_read", "branch_read", "file_upload", "file_read", "analytics_view", "notification_view"]
            },
            {
                "name": "officer",
                "display_name": "Officer",
                "description": "Standard officer role for processing applications",
                "level": 40,
                "is_system_role": True,
                "is_default": True,
                "permissions": ["application_create", "application_read", "application_update", "file_upload", "file_read", "notification_view"]
            },
            {
                "name": "analyst",
                "display_name": "Analyst",
                "description": "Read-only access for analysis and reporting",
                "level": 20,
                "is_system_role": True,
                "is_default": False,
                "permissions": ["application_read", "analytics_view", "file_read", "notification_view"]
            },
            {
                "name": "viewer",
                "display_name": "Viewer",
                "description": "Limited read-only access",
                "level": 10,
                "is_system_role": True,
                "is_default": False,
                "permissions": ["application_read", "file_read", "notification_view"]
            }
        ]

        # Create roles and assign permissions
        for role_data in roles_data:
            try:
                role = await permission_service.create_role(
                    name=role_data["name"],
                    display_name=role_data["display_name"],
                    description=role_data["description"],
                    level=role_data["level"],
                    created_by=current_user.id
                )
                print(f"Created role: {role_data['name']}")

                # Assign permissions to role
                for perm_name in role_data["permissions"]:
                    permission = created_permissions.get(perm_name)
                    if permission:
                        await permission_service.assign_permission_to_role(
                            role_id=role.id,
                            permission_id=permission.id,
                            granted_by=current_user.id
                        )
                        print(f"Assigned permission {perm_name} to role {role_data['name']}")

            except Exception as e:
                print(f"Role {role_data['name']} may already exist: {e}")

        await db.commit()
        return {"message": "Default permissions and roles initialized successfully"}

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to initialize permissions: {str(e)}")


# ==================== PERMISSION CRUD ====================
# NOTE: These generic routes are placed at the end to avoid conflicts with specific routes

@router.get("/", response_model=List[PermissionResponse])
@require_permission_or_role(
    ResourceType.SYSTEM, 
    PermissionAction.VIEW_ALL,
    allowed_roles=['admin', 'super_admin']
)
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
@require_permission_or_role(
    ResourceType.SYSTEM, 
    PermissionAction.READ,
    allowed_roles=['admin', 'super_admin']
)
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


# ==================== HEALTH CHECK ====================

@router.get("/health")
async def permission_system_health(
    db: AsyncSession = Depends(get_db)
):
    """
    Check health of permission system.
    
    Verifies that:
    - Permission table has data (count > 0)
    - Role table has data (count > 0) 
    - Admin role exists
    - SYSTEM.VIEW_ALL permission exists
    - Returns overall health status (healthy, degraded, unhealthy)
    """
    health_status = {
        "status": "healthy",
        "checks": {},
        "timestamp": datetime.utcnow().isoformat()
    }
    
    try:
        # Check if permission tables exist and have data
        permission_count = await db.scalar(select(func.count(Permission.id)))
        role_count = await db.scalar(select(func.count(Role.id)))
        
        health_status["checks"]["permissions"] = {
            "status": "healthy" if permission_count > 0 else "warning",
            "count": permission_count,
            "message": f"Found {permission_count} permissions" if permission_count > 0 else "No permissions found"
        }
        
        health_status["checks"]["roles"] = {
            "status": "healthy" if role_count > 0 else "warning", 
            "count": role_count,
            "message": f"Found {role_count} roles" if role_count > 0 else "No roles found"
        }
        
        # Check if admin role exists
        admin_role = await db.scalar(
            select(Role).where(Role.name == "admin")
        )
        health_status["checks"]["admin_role"] = {
            "status": "healthy" if admin_role else "unhealthy",
            "exists": admin_role is not None,
            "message": "Admin role found" if admin_role else "Admin role not found"
        }
        
        # Check if SYSTEM.VIEW_ALL permission exists
        view_all_perm = await db.scalar(
            select(Permission).where(Permission.name == "SYSTEM.VIEW_ALL")
        )
        health_status["checks"]["system_permissions"] = {
            "status": "healthy" if view_all_perm else "unhealthy",
            "exists": view_all_perm is not None,
            "message": "SYSTEM.VIEW_ALL permission found" if view_all_perm else "SYSTEM.VIEW_ALL permission not found"
        }
        
        # Determine overall status
        check_statuses = [check["status"] for check in health_status["checks"].values()]
        if "unhealthy" in check_statuses:
            health_status["status"] = "unhealthy"
        elif "warning" in check_statuses:
            health_status["status"] = "degraded"
        else:
            health_status["status"] = "healthy"
            
        # Add summary message
        if health_status["status"] == "healthy":
            health_status["message"] = "Permission system is functioning normally"
        elif health_status["status"] == "degraded":
            health_status["message"] = "Permission system has minor issues but is functional"
        else:
            health_status["message"] = "Permission system has critical issues"
        
    except Exception as e:
        logger.error(f"Error checking permission system health: {e}")
        health_status["status"] = "unhealthy"
        health_status["error"] = str(e)
        health_status["message"] = "Failed to check permission system health"
    
    return health_status


# ==================== AUDIT TRAIL ====================

@router.get("/audit", response_model=Dict[str, Any])
@require_permission(ResourceType.AUDIT, PermissionAction.VIEW_ALL)
async def get_audit_trail(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    action_type: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    target_user_id: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get audit trail for permission changes.
    
    Supports filtering by:
    - action_type: Type of action (permission_created, role_assigned, etc.)
    - entity_type: Type of entity (permission, role, user_role, user_permission)
    - user_id: User who performed the action
    - target_user_id: User who was affected by the action
    - start_date: Start of date range
    - end_date: End of date range
    - search: Search in action, entity_type, and details
    """
    from app.services.permission_audit_service import PermissionAuditService
    
    audit_service = PermissionAuditService(db)
    
    entries, total = await audit_service.get_audit_trail(
        page=page,
        size=size,
        action_type=action_type,
        entity_type=entity_type,
        user_id=user_id,
        target_user_id=target_user_id,
        start_date=start_date,
        end_date=end_date,
        search=search
    )
    
    # Enrich entries with user and entity names
    enriched_entries = []
    for entry in entries:
        entry_dict = {
            "id": entry.id,
            "action": entry.action,
            "entity_type": entry.entity_type,
            "entity_id": entry.entity_id,
            "user_id": entry.user_id,
            "timestamp": entry.timestamp,
            "ip_address": entry.ip_address,
            "details": entry.details or {}
        }
        
        # Get user name
        if entry.user_id:
            user = await db.get(User, entry.user_id)
            if user:
                entry_dict["user_name"] = f"{user.first_name} {user.last_name}"
        
        # Get target user name from direct field
        if entry.target_user_id:
            target_user = await db.get(User, entry.target_user_id)
            if target_user:
                entry_dict["target_user_name"] = f"{target_user.first_name} {target_user.last_name}"
                entry_dict["target_user_id"] = str(entry.target_user_id)
        
        # Get role name from direct field
        if entry.target_role_id:
            role = await db.get(Role, entry.target_role_id)
            if role:
                entry_dict["role_name"] = role.name
                entry_dict["target_role_id"] = str(entry.target_role_id)
        
        # Get permission name from direct field
        if entry.permission_id:
            permission = await db.get(Permission, entry.permission_id)
            if permission:
                entry_dict["permission_name"] = permission.name
                entry_dict["permission_id"] = str(entry.permission_id)
        
        # Add reason from direct field
        if entry.reason:
            entry_dict["reason"] = entry.reason
        
        # Extract additional info from details
        if entry.details:
            entry_dict["permission_name"] = entry_dict.get("permission_name") or entry.details.get("permission_name")
            entry_dict["role_name"] = entry_dict.get("role_name") or entry.details.get("role_name")
        
        enriched_entries.append(entry_dict)
    
    # Calculate pagination
    pages = (total + size - 1) // size
    
    return {
        "items": enriched_entries,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }


@router.get("/audit/export")
@require_permission_or_role(
    ResourceType.AUDIT,
    PermissionAction.EXPORT,
    allowed_roles=['admin', 'super_admin']
)
async def export_audit_trail(
    format: str = Query("csv", regex="^(csv|json)$"),
    action_type: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    target_user_id: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Export audit trail to CSV or JSON format.
    
    Supports the same filtering options as the audit trail endpoint.
    Returns a downloadable file in the requested format.
    """
    from app.services.permission_audit_service import PermissionAuditService
    
    audit_service = PermissionAuditService(db)
    
    # Get all matching entries (no pagination for export)
    entries, total = await audit_service.get_audit_trail(
        page=1,
        size=10000,  # Large limit for export
        action_type=action_type,
        entity_type=entity_type,
        user_id=user_id,
        target_user_id=target_user_id,
        start_date=start_date,
        end_date=end_date,
        search=search
    )
    
    # Enrich entries with user and entity names
    enriched_entries = []
    for entry in entries:
        entry_dict = {
            "id": entry.id,
            "action": entry.action,
            "entity_type": entry.entity_type,
            "entity_id": str(entry.entity_id) if entry.entity_id else "",
            "user_id": str(entry.user_id) if entry.user_id else "",
            "user_name": "",
            "target_user_id": str(entry.target_user_id) if entry.target_user_id else "",
            "target_user_name": "",
            "target_role_id": str(entry.target_role_id) if entry.target_role_id else "",
            "role_name": "",
            "permission_id": str(entry.permission_id) if entry.permission_id else "",
            "permission_name": "",
            "reason": entry.reason or "",
            "timestamp": entry.timestamp.isoformat(),
            "ip_address": entry.ip_address or ""
        }
        
        # Get user name
        if entry.user_id:
            user = await db.get(User, entry.user_id)
            if user:
                entry_dict["user_name"] = f"{user.first_name} {user.last_name}"
        
        # Get target user name
        if entry.target_user_id:
            target_user = await db.get(User, entry.target_user_id)
            if target_user:
                entry_dict["target_user_name"] = f"{target_user.first_name} {target_user.last_name}"
        
        # Get role name
        if entry.target_role_id:
            role = await db.get(Role, entry.target_role_id)
            if role:
                entry_dict["role_name"] = role.name
        
        # Get permission name
        if entry.permission_id:
            permission = await db.get(Permission, entry.permission_id)
            if permission:
                entry_dict["permission_name"] = permission.name
        
        enriched_entries.append(entry_dict)
    
    if format == "csv":
        # Generate CSV
        output = io.StringIO()
        if enriched_entries:
            fieldnames = [
                "id", "timestamp", "action", "entity_type", "entity_id",
                "user_id", "user_name", "target_user_id", "target_user_name",
                "target_role_id", "role_name", "permission_id", "permission_name",
                "reason", "ip_address"
            ]
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(enriched_entries)
        
        # Create streaming response
        output.seek(0)
        filename = f"audit_trail_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    else:
        # Return JSON
        filename = f"audit_trail_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        
        return JSONResponse(
            content={
                "export_date": datetime.utcnow().isoformat(),
                "total_entries": len(enriched_entries),
                "filters": {
                    "action_type": action_type,
                    "entity_type": entity_type,
                    "user_id": user_id,
                    "target_user_id": target_user_id,
                    "start_date": start_date.isoformat() if start_date else None,
                    "end_date": end_date.isoformat() if end_date else None,
                    "search": search
                },
                "entries": enriched_entries
            },
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
