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
        "errors": []
    }
    
    try:
        # Define system permissions to be seeded
        system_permissions = [
            {
                "name": "SYSTEM.VIEW_ALL",
                "description": "View all system resources and settings",
                "resource_type": ResourceType.SYSTEM,
                "action": PermissionAction.VIEW_ALL,
                "scope": PermissionScope.GLOBAL,
                "is_system_permission": True
            },
            {
                "name": "SYSTEM.CREATE",
                "description": "Create system resources",
                "resource_type": ResourceType.SYSTEM,
                "action": PermissionAction.CREATE,
                "scope": PermissionScope.GLOBAL,
                "is_system_permission": True
            },
            {
                "name": "SYSTEM.UPDATE",
                "description": "Update system resources",
                "resource_type": ResourceType.SYSTEM,
                "action": PermissionAction.UPDATE,
                "scope": PermissionScope.GLOBAL,
                "is_system_permission": True
            },
            {
                "name": "SYSTEM.DELETE",
                "description": "Delete system resources",
                "resource_type": ResourceType.SYSTEM,
                "action": PermissionAction.DELETE,
                "scope": PermissionScope.GLOBAL,
                "is_system_permission": True
            },
            {
                "name": "SYSTEM.READ",
                "description": "Read system resources",
                "resource_type": ResourceType.SYSTEM,
                "action": PermissionAction.READ,
                "scope": PermissionScope.GLOBAL,
                "is_system_permission": True
            }
        ]
        
        # Create permissions if they don't exist (idempotency check)
        created_permissions = {}
        for perm_data in system_permissions:
            # Check if permission already exists
            existing_query = select(Permission).where(Permission.name == perm_data["name"])
            existing_result = await db.execute(existing_query)
            existing_permission = existing_result.scalar_one_or_none()
            
            if existing_permission:
                created_permissions[perm_data["name"]] = existing_permission
                results["permissions_existing"] += 1
                logger.info(f"Permission {perm_data['name']} already exists")
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
                logger.info(f"Created permission: {perm_data['name']}")
        
        # Flush to get permission IDs
        await db.flush()
        
        # Create admin role if it doesn't exist (idempotency check)
        admin_role_query = select(Role).where(Role.name == "admin")
        admin_role_result = await db.execute(admin_role_query)
        admin_role = admin_role_result.scalar_one_or_none()
        
        if admin_role:
            results["roles_existing"] += 1
            logger.info("Admin role already exists")
        else:
            # Create admin role
            admin_role = Role(
                name="admin",
                display_name="Administrator",
                description="Full system access with all permissions",
                level=100,
                is_system_role=True,
                is_active=True,
                is_default=False
            )
            db.add(admin_role)
            results["roles_created"] += 1
            logger.info("Created admin role")
        
        # Flush to get role ID
        await db.flush()
        
        # Assign all system permissions to admin role (idempotency check)
        for perm_name, permission in created_permissions.items():
            # Check if role-permission assignment already exists
            existing_assignment_query = select(RolePermission).where(
                and_(
                    RolePermission.role_id == admin_role.id,
                    RolePermission.permission_id == permission.id
                )
            )
            existing_assignment_result = await db.execute(existing_assignment_query)
            existing_assignment = existing_assignment_result.scalar_one_or_none()
            
            if existing_assignment:
                results["role_permissions_existing"] += 1
                logger.info(f"Permission {perm_name} already assigned to admin role")
            else:
                # Create role-permission assignment
                role_permission = RolePermission(
                    role_id=admin_role.id,
                    permission_id=permission.id,
                    is_granted=True
                )
                db.add(role_permission)
                results["role_permissions_created"] += 1
                logger.info(f"Assigned permission {perm_name} to admin role")
        
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
        "admin_role_exists": False,
        "admin_role_is_system": False,
        "system_permissions_count": 0,
        "admin_permissions_count": 0,
        "required_permissions": [
            "SYSTEM.VIEW_ALL",
            "SYSTEM.CREATE", 
            "SYSTEM.UPDATE",
            "SYSTEM.DELETE",
            "SYSTEM.READ"
        ],
        "missing_permissions": [],
        "success": False
    }
    
    async with AsyncSessionLocal() as db:
        try:
            # Check if admin role exists and is system role
            admin_role_query = select(Role).where(Role.name == "admin")
            admin_role_result = await db.execute(admin_role_query)
            admin_role = admin_role_result.scalar_one_or_none()
            
            if admin_role:
                verification_results["admin_role_exists"] = True
                verification_results["admin_role_is_system"] = admin_role.is_system_role
                logger.info(f"Admin role found: is_system_role={admin_role.is_system_role}")
            else:
                logger.error("Admin role not found")
                return verification_results
            
            # Check system permissions
            for perm_name in verification_results["required_permissions"]:
                perm_query = select(Permission).where(Permission.name == perm_name)
                perm_result = await db.execute(perm_query)
                permission = perm_result.scalar_one_or_none()
                
                if permission:
                    verification_results["system_permissions_count"] += 1
                    logger.info(f"System permission {perm_name} exists")
                else:
                    verification_results["missing_permissions"].append(perm_name)
                    logger.error(f"System permission {perm_name} missing")
            
            # Check admin role permissions
            admin_permissions_query = select(RolePermission).where(
                RolePermission.role_id == admin_role.id
            ).options(selectinload(RolePermission.permission))
            admin_permissions_result = await db.execute(admin_permissions_query)
            admin_permissions = admin_permissions_result.scalars().all()
            
            verification_results["admin_permissions_count"] = len(admin_permissions)
            logger.info(f"Admin role has {len(admin_permissions)} permissions")
            
            # Check if all required permissions are assigned to admin
            admin_permission_names = {rp.permission.name for rp in admin_permissions}
            for required_perm in verification_results["required_permissions"]:
                if required_perm not in admin_permission_names:
                    logger.error(f"Admin role missing permission: {required_perm}")
            
            # Determine overall success
            verification_results["success"] = (
                verification_results["admin_role_exists"] and
                verification_results["admin_role_is_system"] and
                verification_results["system_permissions_count"] == len(verification_results["required_permissions"]) and
                len(verification_results["missing_permissions"]) == 0 and
                verification_results["admin_permissions_count"] >= len(verification_results["required_permissions"])
            )
            
            if verification_results["success"]:
                logger.info("✅ Permission seeding verification successful")
            else:
                logger.error("❌ Permission seeding verification failed")
            
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
        print("\n" + "="*50)
        print("PERMISSION SEEDING SUMMARY")
        print("="*50)
        print(f"Permissions created: {results['permissions_created']}")
        print(f"Permissions existing: {results['permissions_existing']}")
        print(f"Roles created: {results['roles_created']}")
        print(f"Roles existing: {results['roles_existing']}")
        print(f"Role-permissions created: {results['role_permissions_created']}")
        print(f"Role-permissions existing: {results['role_permissions_existing']}")
        
        if verification["success"]:
            print("\n✅ SEEDING SUCCESSFUL - All required permissions and roles are in place")
        else:
            print("\n❌ SEEDING VERIFICATION FAILED")
            if verification["missing_permissions"]:
                print(f"Missing permissions: {verification['missing_permissions']}")
        
        print("="*50)
        
        return verification["success"]
        
    except Exception as e:
        logger.error(f"Fatal error in main: {e}")
        print(f"\n❌ SEEDING FAILED: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)