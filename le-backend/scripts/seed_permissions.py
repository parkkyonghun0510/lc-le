#!/usr/bin/env python3
"""
Permission seeding script for LC Workflow system.

This script creates the essential system permissions and admin role needed for the 
permission system to function properly. It includes idempotency checks to prevent 
duplicate creation and can be run multiple times safely.

Required permissions to be seeded:
- SYSTEM.VIEW_ALL
- SYSTEM.CREATE  
- SYSTEM.UPDATE
- SYSTEM.DELETE
- SYSTEM.READ

Admin role creation:
- Creates admin role with is_system_role=True
- Assigns all system permissions to admin role
"""

import asyncio
import sys
import os
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
import logging

# Add the app directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import AsyncSessionLocal, engine, Base
from app.models.permissions import (
    Permission, Role, RolePermission, ResourceType, PermissionAction, PermissionScope
)

logger = logging.getLogger(__name__)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


def generate_comprehensive_permissions() -> List[Dict[str, Any]]:
    """
    Generate comprehensive permission definitions for all resources.
    
    Returns:
        List of permission definitions with name, description, resource_type, action, scope
    """
    permissions = []
    
    # Helper function to create permission name
    def perm_name(resource: ResourceType, action: PermissionAction, scope: PermissionScope) -> str:
        return f"{resource.value.upper()}.{action.value.upper()}.{scope.value.upper()}"
    
    # Helper function to create permission description
    def perm_desc(resource: str, action: str, scope: str) -> str:
        scope_text = {
            "global": "across the entire system",
            "branch": "within their branch",
            "department": "within their department",
            "team": "within their team",
            "own": "for their own records only"
        }
        return f"{action.capitalize()} {resource} {scope_text.get(scope, scope)}"
    
    # Define which combinations make sense for each resource
    permission_definitions = {
        # SYSTEM permissions (already exist, but included for completeness)
        ResourceType.SYSTEM: {
            PermissionAction.VIEW_ALL: [PermissionScope.GLOBAL],
            PermissionAction.CREATE: [PermissionScope.GLOBAL],
            PermissionAction.UPDATE: [PermissionScope.GLOBAL],
            PermissionAction.DELETE: [PermissionScope.GLOBAL],
            PermissionAction.READ: [PermissionScope.GLOBAL],
            PermissionAction.MANAGE: [PermissionScope.GLOBAL],
        },
        
        # USER permissions
        ResourceType.USER: {
            PermissionAction.CREATE: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT],
            PermissionAction.READ: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT, PermissionScope.OWN],
            PermissionAction.UPDATE: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT, PermissionScope.OWN],
            PermissionAction.DELETE: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT],
            PermissionAction.MANAGE: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT],
            PermissionAction.ASSIGN: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT],
        },
        
        # APPLICATION permissions
        ResourceType.APPLICATION: {
            PermissionAction.CREATE: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT, PermissionScope.OWN],
            PermissionAction.READ: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT, PermissionScope.TEAM, PermissionScope.OWN],
            PermissionAction.UPDATE: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT, PermissionScope.TEAM, PermissionScope.OWN],
            PermissionAction.DELETE: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT, PermissionScope.OWN],
            PermissionAction.APPROVE: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT, PermissionScope.OWN],
            PermissionAction.REJECT: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT, PermissionScope.OWN],
            PermissionAction.ASSIGN: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT],
            PermissionAction.VIEW_ALL: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT],
            PermissionAction.EXPORT: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT],
        },
        
        # DEPARTMENT permissions
        ResourceType.DEPARTMENT: {
            PermissionAction.CREATE: [PermissionScope.GLOBAL],
            PermissionAction.READ: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.OWN],
            PermissionAction.UPDATE: [PermissionScope.GLOBAL, PermissionScope.BRANCH],
            PermissionAction.DELETE: [PermissionScope.GLOBAL],
            PermissionAction.MANAGE: [PermissionScope.GLOBAL, PermissionScope.BRANCH],
        },
        
        # BRANCH permissions
        ResourceType.BRANCH: {
            PermissionAction.CREATE: [PermissionScope.GLOBAL],
            PermissionAction.READ: [PermissionScope.GLOBAL, PermissionScope.OWN],
            PermissionAction.UPDATE: [PermissionScope.GLOBAL, PermissionScope.OWN],
            PermissionAction.DELETE: [PermissionScope.GLOBAL],
            PermissionAction.MANAGE: [PermissionScope.GLOBAL, PermissionScope.OWN],
        },
        
        # FILE permissions
        ResourceType.FILE: {
            PermissionAction.CREATE: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT, PermissionScope.OWN],
            PermissionAction.READ: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT, PermissionScope.TEAM, PermissionScope.OWN],
            PermissionAction.UPDATE: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT, PermissionScope.OWN],
            PermissionAction.DELETE: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT, PermissionScope.OWN],
            PermissionAction.EXPORT: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT],
        },
        
        # FOLDER permissions
        ResourceType.FOLDER: {
            PermissionAction.CREATE: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT, PermissionScope.OWN],
            PermissionAction.READ: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT, PermissionScope.TEAM, PermissionScope.OWN],
            PermissionAction.UPDATE: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT, PermissionScope.OWN],
            PermissionAction.DELETE: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT, PermissionScope.OWN],
            PermissionAction.MANAGE: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT],
        },
        
        # ANALYTICS permissions
        ResourceType.ANALYTICS: {
            PermissionAction.READ: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT, PermissionScope.TEAM, PermissionScope.OWN],
            PermissionAction.VIEW_ALL: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT],
            PermissionAction.EXPORT: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT],
        },
        
        # NOTIFICATION permissions
        ResourceType.NOTIFICATION: {
            PermissionAction.CREATE: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT],
            PermissionAction.READ: [PermissionScope.GLOBAL, PermissionScope.OWN],
            PermissionAction.UPDATE: [PermissionScope.GLOBAL, PermissionScope.OWN],
            PermissionAction.DELETE: [PermissionScope.GLOBAL, PermissionScope.OWN],
            PermissionAction.MANAGE: [PermissionScope.GLOBAL],
        },
        
        # AUDIT permissions
        ResourceType.AUDIT: {
            PermissionAction.READ: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT],
            PermissionAction.VIEW_ALL: [PermissionScope.GLOBAL, PermissionScope.BRANCH],
            PermissionAction.EXPORT: [PermissionScope.GLOBAL, PermissionScope.BRANCH, PermissionScope.DEPARTMENT],
        },
    }
    
    # Generate permissions from definitions
    for resource_type, actions in permission_definitions.items():
        for action, scopes in actions.items():
            for scope in scopes:
                name = perm_name(resource_type, action, scope)
                description = perm_desc(resource_type.value, action.value, scope.value)
                
                permissions.append({
                    "name": name,
                    "description": description,
                    "resource_type": resource_type,
                    "action": action,
                    "scope": scope,
                    "is_system_permission": resource_type == ResourceType.SYSTEM
                })
    
    return permissions


async def seed_default_permissions(db: AsyncSession) -> Dict[str, Any]:
    """
    Seed default permissions and roles for the system.
    
    Returns:
        Dict containing seeding results and statistics
    """
    logger.info("Starting permission seeding...")
    
    results = {
        "permissions_created": 0,
        "permissions_existing": 0,
        "roles_created": 0,
        "roles_existing": 0,
        "role_permissions_created": 0,
        "role_permissions_existing": 0,
        "templates_created": 0,
        "templates_existing": 0,
        "errors": []
    }
    
    try:
        # Generate comprehensive permission definitions
        all_permissions = generate_comprehensive_permissions()
        logger.info(f"Generated {len(all_permissions)} permission definitions")
        
        # Create permissions in batches with idempotency checks
        created_permissions = {}
        batch_size = 50
        
        for i in range(0, len(all_permissions), batch_size):
            batch = all_permissions[i:i + batch_size]
            logger.info(f"Processing permission batch {i//batch_size + 1} ({len(batch)} permissions)")
            
            for perm_data in batch:
                # Check if permission already exists by unique constraint (resource_type, action, scope)
                existing_query = select(Permission).where(
                    and_(
                        Permission.resource_type == perm_data["resource_type"],
                        Permission.action == perm_data["action"],
                        Permission.scope == perm_data["scope"]
                    )
                )
                existing_result = await db.execute(existing_query)
                existing_permission = existing_result.scalar_one_or_none()
                
                if existing_permission:
                    created_permissions[perm_data["name"]] = existing_permission
                    results["permissions_existing"] += 1
                else:
                    # Create new permission
                    permission = Permission(
                        name=perm_data["name"],
                        description=perm_data["description"],
                        resource_type=perm_data["resource_type"],
                        action=perm_data["action"],
                        scope=perm_data["scope"],
                        is_system_permission=perm_data["is_system_permission"],
                        is_active=True
                    )
                    db.add(permission)
                    created_permissions[perm_data["name"]] = permission
                    results["permissions_created"] += 1
            
            # Flush batch to get IDs
            await db.flush()
            logger.info(f"Batch {i//batch_size + 1} flushed successfully")
        
        logger.info(f"Permission creation complete: {results['permissions_created']} created, {results['permissions_existing']} existing")
        
        # Define standard roles
        standard_roles = [
            {
                "name": "admin",
                "display_name": "Administrator",
                "description": "Full system access with all permissions. Can manage users, roles, and system settings.",
                "level": 100,
            },
            {
                "name": "branch_manager",
                "display_name": "Branch Manager",
                "description": "Branch-level management. Can approve/reject applications, manage branch users, and view branch analytics.",
                "level": 80,
            },
            {
                "name": "reviewer",
                "display_name": "Reviewer/Auditor",
                "description": "Read-only access with export capabilities. Can view all applications, audit trails, and export reports for compliance.",
                "level": 70,
            },
            {
                "name": "credit_officer",
                "display_name": "Credit Officer",
                "description": "Department-level application management. Can create, update, and manage applications within their department.",
                "level": 60,
            },
            {
                "name": "portfolio_officer",
                "display_name": "Portfolio Officer",
                "description": "Own portfolio management. Can manage customer portfolios and create applications on behalf of customers.",
                "level": 50,
            },
            {
                "name": "teller",
                "display_name": "Teller",
                "description": "Application processing. Can process account IDs, validate customer information, and update assigned applications.",
                "level": 40,
            },
            {
                "name": "data_entry_clerk",
                "display_name": "Data Entry Clerk",
                "description": "Basic data entry. Can create draft applications and upload documents.",
                "level": 30,
            },
        ]
        
        # Create standard roles with idempotency checks
        created_roles = {}
        for role_data in standard_roles:
            # Check if role already exists
            existing_role_query = select(Role).where(Role.name == role_data["name"])
            existing_role_result = await db.execute(existing_role_query)
            existing_role = existing_role_result.scalar_one_or_none()
            
            if existing_role:
                created_roles[role_data["name"]] = existing_role
                results["roles_existing"] += 1
                logger.info(f"Role {role_data['name']} already exists")
            else:
                # Create new role
                role = Role(
                    name=role_data["name"],
                    display_name=role_data["display_name"],
                    description=role_data["description"],
                    level=role_data["level"],
                    is_system_role=True,
                    is_active=True,
                    is_default=False
                )
                db.add(role)
                created_roles[role_data["name"]] = role
                results["roles_created"] += 1
                logger.info(f"Created role: {role_data['name']}")
        
        # Flush to get role IDs
        await db.flush()
        logger.info(f"Role creation complete: {results['roles_created']} created, {results['roles_existing']} existing")
        
        # Define role-permission assignments
        role_permission_assignments = {
            "admin": [
                # Admin gets ALL permissions with GLOBAL scope
                perm_name for perm_name in created_permissions.keys()
                if ".GLOBAL" in perm_name
            ],
            "branch_manager": [
                # Branch-level management
                "APPLICATION.APPROVE.BRANCH", "APPLICATION.REJECT.BRANCH",
                "APPLICATION.VIEW_ALL.BRANCH", "APPLICATION.READ.BRANCH",
                "APPLICATION.UPDATE.BRANCH", "APPLICATION.ASSIGN.BRANCH",
                "APPLICATION.EXPORT.BRANCH",
                "USER.READ.BRANCH", "USER.UPDATE.BRANCH", "USER.ASSIGN.BRANCH",
                "ANALYTICS.VIEW_ALL.BRANCH", "ANALYTICS.READ.BRANCH", "ANALYTICS.EXPORT.BRANCH",
                "DEPARTMENT.READ.BRANCH", "DEPARTMENT.MANAGE.BRANCH",
                "FILE.READ.BRANCH", "FILE.UPDATE.BRANCH",
                "FOLDER.READ.BRANCH", "FOLDER.MANAGE.BRANCH",
                "AUDIT.READ.BRANCH", "AUDIT.EXPORT.BRANCH",
            ],
            "reviewer": [
                # Read-only global access with export
                "APPLICATION.READ.GLOBAL", "APPLICATION.VIEW_ALL.GLOBAL", "APPLICATION.EXPORT.GLOBAL",
                "AUDIT.READ.GLOBAL", "AUDIT.VIEW_ALL.GLOBAL", "AUDIT.EXPORT.GLOBAL",
                "ANALYTICS.VIEW_ALL.GLOBAL", "ANALYTICS.READ.GLOBAL", "ANALYTICS.EXPORT.GLOBAL",
                "USER.READ.GLOBAL",
                "DEPARTMENT.READ.GLOBAL",
                "BRANCH.READ.GLOBAL",
                "FILE.READ.GLOBAL", "FILE.EXPORT.GLOBAL",
                "FOLDER.READ.GLOBAL",
            ],
            "credit_officer": [
                # Department-level application management
                "APPLICATION.CREATE.DEPARTMENT", "APPLICATION.READ.DEPARTMENT",
                "APPLICATION.UPDATE.DEPARTMENT", "APPLICATION.ASSIGN.DEPARTMENT",
                "APPLICATION.VIEW_ALL.DEPARTMENT", "APPLICATION.EXPORT.DEPARTMENT",
                # Own scope for approve/reject
                "APPLICATION.APPROVE.OWN", "APPLICATION.REJECT.OWN",
                "APPLICATION.READ.OWN", "APPLICATION.UPDATE.OWN", "APPLICATION.DELETE.OWN",
                # File management
                "FILE.CREATE.DEPARTMENT", "FILE.READ.DEPARTMENT", "FILE.UPDATE.DEPARTMENT",
                "FILE.CREATE.OWN", "FILE.READ.OWN", "FILE.UPDATE.OWN", "FILE.DELETE.OWN",
                "FOLDER.CREATE.DEPARTMENT", "FOLDER.READ.DEPARTMENT",
                "FOLDER.CREATE.OWN", "FOLDER.READ.OWN", "FOLDER.UPDATE.OWN",
                # Analytics
                "ANALYTICS.READ.DEPARTMENT", "ANALYTICS.READ.OWN",
                # User read access
                "USER.READ.DEPARTMENT",
            ],
            "portfolio_officer": [
                # Own portfolio management
                "APPLICATION.CREATE.OWN", "APPLICATION.READ.OWN",
                "APPLICATION.UPDATE.OWN", "APPLICATION.READ.TEAM",
                "FILE.CREATE.OWN", "FILE.READ.OWN", "FILE.UPDATE.OWN",
                "FILE.READ.TEAM",
                "FOLDER.CREATE.OWN", "FOLDER.READ.OWN", "FOLDER.UPDATE.OWN",
                "FOLDER.READ.TEAM",
                "ANALYTICS.READ.OWN", "ANALYTICS.READ.TEAM",
                "USER.READ.OWN",
            ],
            "teller": [
                # Application processing (read/update for assigned)
                "APPLICATION.READ.TEAM", "APPLICATION.UPDATE.TEAM",
                "APPLICATION.READ.OWN", "APPLICATION.UPDATE.OWN",
                "FILE.READ.TEAM", "FILE.READ.OWN",
                "FOLDER.READ.TEAM", "FOLDER.READ.OWN",
                "USER.READ.OWN",
            ],
            "data_entry_clerk": [
                # Basic data entry
                "APPLICATION.CREATE.OWN", "APPLICATION.READ.OWN", "APPLICATION.UPDATE.OWN",
                "FILE.CREATE.OWN", "FILE.READ.OWN", "FILE.UPDATE.OWN",
                "FOLDER.CREATE.OWN", "FOLDER.READ.OWN", "FOLDER.UPDATE.OWN",
                "USER.READ.OWN",
                "NOTIFICATION.READ.OWN",
            ],
        }
        
        # Assign permissions to roles with idempotency checks
        for role_name, permission_names in role_permission_assignments.items():
            role = created_roles.get(role_name)
            if not role:
                logger.warning(f"Role {role_name} not found, skipping permission assignments")
                continue
            
            logger.info(f"Assigning {len(permission_names)} permissions to {role_name}")
            
            for perm_name in permission_names:
                permission = created_permissions.get(perm_name)
                if not permission:
                    logger.warning(f"Permission {perm_name} not found for role {role_name}")
                    continue
                
                # Check if role-permission assignment already exists
                existing_assignment_query = select(RolePermission).where(
                    and_(
                        RolePermission.role_id == role.id,
                        RolePermission.permission_id == permission.id
                    )
                )
                existing_assignment_result = await db.execute(existing_assignment_query)
                existing_assignment = existing_assignment_result.scalar_one_or_none()
                
                if existing_assignment:
                    results["role_permissions_existing"] += 1
                else:
                    # Create role-permission assignment
                    role_permission = RolePermission(
                        role_id=role.id,
                        permission_id=permission.id,
                        is_granted=True
                    )
                    db.add(role_permission)
                    results["role_permissions_created"] += 1
            
            logger.info(f"Completed permission assignments for {role_name}")
        
        logger.info(f"Role-permission assignment complete: {results['role_permissions_created']} created, {results['role_permissions_existing']} existing")
        
        # Flush to ensure all role-permissions have IDs
        await db.flush()
        
        # Create permission templates for each standard role
        logger.info("Creating permission templates for standard roles...")
        
        from app.models.permissions import PermissionTemplate
        
        for role_name, permission_names in role_permission_assignments.items():
            role = created_roles.get(role_name)
            if not role:
                continue
            
            # Get permission IDs for this role
            permission_ids = []
            for perm_name in permission_names:
                permission = created_permissions.get(perm_name)
                if permission:
                    permission_ids.append(str(permission.id))
            
            # Check if template already exists
            template_name = f"{role.display_name} Template"
            existing_template_query = select(PermissionTemplate).where(
                PermissionTemplate.name == template_name
            )
            existing_template_result = await db.execute(existing_template_query)
            existing_template = existing_template_result.scalar_one_or_none()
            
            if existing_template:
                results["templates_existing"] += 1
                logger.info(f"Template '{template_name}' already exists")
            else:
                # Create new template
                template = PermissionTemplate(
                    name=template_name,
                    description=f"Standard permission template for {role.display_name} role. {role.description}",
                    template_type="role",
                    permissions=permission_ids,
                    is_system_template=True,
                    is_active=True,
                    usage_count=0
                )
                db.add(template)
                results["templates_created"] += 1
                logger.info(f"Created template: {template_name}")
        
        logger.info(f"Template creation complete: {results['templates_created']} created, {results['templates_existing']} existing")
        
        # Commit all changes
        await db.commit()
        
        logger.info("Permission seeding completed successfully")
        logger.info(f"Results: {results}")
        
        return results
        
    except Exception as e:
        await db.rollback()
        error_msg = f"Error during permission seeding: {e}"
        logger.error(error_msg)
        results["errors"].append(error_msg)
        raise


async def verify_seeding() -> Dict[str, Any]:
    """
    Verify that all required permissions and roles were created correctly.
    
    Returns:
        Dict containing verification results
    """
    logger.info("Verifying permission seeding...")
    
    verification_results = {
        "total_permissions": 0,
        "total_roles": 0,
        "total_templates": 0,
        "standard_roles": {
            "admin": {"exists": False, "is_system": False, "level": 0, "permissions": 0},
            "branch_manager": {"exists": False, "is_system": False, "level": 0, "permissions": 0},
            "reviewer": {"exists": False, "is_system": False, "level": 0, "permissions": 0},
            "credit_officer": {"exists": False, "is_system": False, "level": 0, "permissions": 0},
            "portfolio_officer": {"exists": False, "is_system": False, "level": 0, "permissions": 0},
            "teller": {"exists": False, "is_system": False, "level": 0, "permissions": 0},
            "data_entry_clerk": {"exists": False, "is_system": False, "level": 0, "permissions": 0},
        },
        "resource_type_coverage": {},
        "templates_verified": [],
        "missing_roles": [],
        "success": False
    }
    
    async with AsyncSessionLocal() as db:
        try:
            from app.models.permissions import PermissionTemplate
            
            # Count total permissions
            total_perms_query = select(Permission)
            total_perms_result = await db.execute(total_perms_query)
            all_permissions = total_perms_result.scalars().all()
            verification_results["total_permissions"] = len(all_permissions)
            logger.info(f"Total permissions in database: {len(all_permissions)}")
            
            # Check resource type coverage
            for perm in all_permissions:
                resource = perm.resource_type.value
                if resource not in verification_results["resource_type_coverage"]:
                    verification_results["resource_type_coverage"][resource] = 0
                verification_results["resource_type_coverage"][resource] += 1
            
            logger.info(f"Resource type coverage: {verification_results['resource_type_coverage']}")
            
            # Count total roles
            total_roles_query = select(Role)
            total_roles_result = await db.execute(total_roles_query)
            all_roles = total_roles_result.scalars().all()
            verification_results["total_roles"] = len(all_roles)
            logger.info(f"Total roles in database: {len(all_roles)}")
            
            # Verify each standard role
            for role_name in verification_results["standard_roles"].keys():
                role_query = select(Role).where(Role.name == role_name)
                role_result = await db.execute(role_query)
                role = role_result.scalar_one_or_none()
                
                if role:
                    verification_results["standard_roles"][role_name]["exists"] = True
                    verification_results["standard_roles"][role_name]["is_system"] = role.is_system_role
                    verification_results["standard_roles"][role_name]["level"] = role.level
                    
                    # Count permissions for this role
                    role_perms_query = select(RolePermission).where(
                        RolePermission.role_id == role.id
                    )
                    role_perms_result = await db.execute(role_perms_query)
                    role_perms = role_perms_result.scalars().all()
                    verification_results["standard_roles"][role_name]["permissions"] = len(role_perms)
                    
                    logger.info(f"✅ Role '{role_name}': level={role.level}, permissions={len(role_perms)}, is_system={role.is_system_role}")
                else:
                    verification_results["missing_roles"].append(role_name)
                    logger.error(f"❌ Role '{role_name}' not found")
            
            # Count and verify templates
            templates_query = select(PermissionTemplate).where(
                PermissionTemplate.is_system_template == True
            )
            templates_result = await db.execute(templates_query)
            templates = templates_result.scalars().all()
            verification_results["total_templates"] = len(templates)
            
            for template in templates:
                verification_results["templates_verified"].append({
                    "name": template.name,
                    "type": template.template_type,
                    "permissions_count": len(template.permissions) if template.permissions else 0,
                    "is_active": template.is_active
                })
                logger.info(f"✅ Template '{template.name}': {len(template.permissions) if template.permissions else 0} permissions")
            
            # Determine overall success
            all_roles_exist = all(
                info["exists"] and info["is_system"] and info["permissions"] > 0
                for info in verification_results["standard_roles"].values()
            )
            
            all_resources_covered = len(verification_results["resource_type_coverage"]) >= 9  # At least 9 resource types
            
            templates_ok = verification_results["total_templates"] >= 7  # At least 7 templates (one per role)
            
            verification_results["success"] = (
                all_roles_exist and
                all_resources_covered and
                templates_ok and
                verification_results["total_permissions"] >= 50  # At least 50 permissions
            )
            
            if verification_results["success"]:
                logger.info("✅ Permission seeding verification successful")
            else:
                logger.error("❌ Permission seeding verification failed")
                if not all_roles_exist:
                    logger.error("  - Not all standard roles exist or configured correctly")
                if not all_resources_covered:
                    logger.error(f"  - Insufficient resource type coverage: {len(verification_results['resource_type_coverage'])}/9")
                if not templates_ok:
                    logger.error(f"  - Insufficient templates: {verification_results['total_templates']}/7")
            
            return verification_results
            
        except Exception as e:
            logger.error(f"Error during verification: {e}")
            verification_results["errors"] = [str(e)]
            return verification_results


async def main():
    """Main function to run permission seeding."""
    try:
        # Create database tables if they don't exist
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created/verified")
        
        # Run seeding
        async with AsyncSessionLocal() as db:
            results = await seed_default_permissions(db)
        
        # Verify seeding
        verification = await verify_seeding()
        
        # Print summary
        print("\n" + "="*70)
        print("PERMISSION SEEDING SUMMARY")
        print("="*70)
        print(f"\n📊 CREATION STATISTICS:")
        print(f"  Permissions created: {results['permissions_created']}")
        print(f"  Permissions existing: {results['permissions_existing']}")
        print(f"  Total permissions: {results['permissions_created'] + results['permissions_existing']}")
        print(f"\n  Roles created: {results['roles_created']}")
        print(f"  Roles existing: {results['roles_existing']}")
        print(f"  Total roles: {results['roles_created'] + results['roles_existing']}")
        print(f"\n  Role-permissions created: {results['role_permissions_created']}")
        print(f"  Role-permissions existing: {results['role_permissions_existing']}")
        print(f"  Total role-permissions: {results['role_permissions_created'] + results['role_permissions_existing']}")
        print(f"\n  Templates created: {results['templates_created']}")
        print(f"  Templates existing: {results['templates_existing']}")
        print(f"  Total templates: {results['templates_created'] + results['templates_existing']}")
        
        print(f"\n📋 VERIFICATION RESULTS:")
        print(f"  Total permissions in DB: {verification['total_permissions']}")
        print(f"  Total roles in DB: {verification['total_roles']}")
        print(f"  Total templates in DB: {verification['total_templates']}")
        
        print(f"\n👥 STANDARD ROLES:")
        for role_name, info in verification["standard_roles"].items():
            status = "✅" if info["exists"] and info["is_system"] else "❌"
            print(f"  {status} {role_name}: level={info['level']}, permissions={info['permissions']}, system={info['is_system']}")
        
        print(f"\n📦 RESOURCE TYPE COVERAGE:")
        for resource, count in verification["resource_type_coverage"].items():
            print(f"  {resource}: {count} permissions")
        
        print(f"\n📝 TEMPLATES:")
        for template in verification["templates_verified"]:
            status = "✅" if template["is_active"] else "❌"
            print(f"  {status} {template['name']}: {template['permissions_count']} permissions")
        
        if verification["success"]:
            print("\n✅ SEEDING SUCCESSFUL - All required permissions, roles, and templates are in place")
        else:
            print("\n❌ SEEDING VERIFICATION FAILED")
            if verification.get("missing_roles"):
                print(f"  Missing roles: {verification['missing_roles']}")
        
        print("="*70)
        
        return verification["success"]
        
    except Exception as e:
        logger.error(f"Fatal error in main: {e}")
        print(f"\n❌ SEEDING FAILED: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)