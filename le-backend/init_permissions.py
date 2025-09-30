#!/usr/bin/env python3
"""
Initialize default permissions and roles for the LC Workflow system.

This script creates the essential permissions and roles needed for the system to function properly.
Run this script after database setup to initialize the permission system.
"""

import asyncio
import sys
import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.permissions import (
    Permission, Role, RolePermission, ResourceType, PermissionAction, PermissionScope
)
import uuid

# Add the app directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def init_permissions():
    """Initialize default permissions and roles."""

    # Database URL - adjust as needed
    database_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost/lc_workflow")

    # Create engine
    engine = create_async_engine(database_url, echo=True)

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
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
                # Check if permission already exists
                existing = await session.get(Permission, perm_data["name"])
                if existing:
                    created_permissions[perm_data["name"]] = existing
                    print(f"Permission {perm_data['name']} already exists")
                else:
                    permission = Permission(
                        name=perm_data["name"],
                        description=perm_data["description"],
                        resource_type=perm_data["resource_type"],
                        action=perm_data["action"],
                        scope=perm_data["scope"],
                        is_system_permission=perm_data["is_system_permission"],
                        is_active=True
                    )
                    session.add(permission)
                    created_permissions[perm_data["name"]] = permission
                    print(f"Created permission: {perm_data['name']}")

            await session.flush()

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
            created_roles = {}
            for role_data in roles_data:
                # Check if role already exists
                existing = await session.query(Role).filter(Role.name == role_data["name"]).first()
                if existing:
                    created_roles[role_data["name"]] = existing
                    print(f"Role {role_data['name']} already exists")
                else:
                    role = Role(
                        name=role_data["name"],
                        display_name=role_data["display_name"],
                        description=role_data["description"],
                        level=role_data["level"],
                        is_system_role=role_data["is_system_role"],
                        is_default=role_data["is_default"],
                        is_active=True
                    )
                    session.add(role)
                    created_roles[role_data["name"]] = role
                    print(f"Created role: {role_data['name']}")

            await session.flush()

            # Assign permissions to roles
            for role_data in roles_data:
                role = created_roles[role_data["name"]]
                for perm_name in role_data["permissions"]:
                    permission = created_permissions[perm_name]

                    # Check if role-permission already exists
                    existing_rp = await session.query(RolePermission).filter(
                        RolePermission.role_id == role.id,
                        RolePermission.permission_id == permission.id
                    ).first()

                    if not existing_rp:
                        role_permission = RolePermission(
                            role_id=role.id,
                            permission_id=permission.id,
                            is_granted=True
                        )
                        session.add(role_permission)
                        print(f"Assigned permission {perm_name} to role {role_data['name']}")

            await session.commit()
            print("\n✅ Default permissions and roles initialized successfully!")

        except Exception as e:
            await session.rollback()
            print(f"❌ Error initializing permissions: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(init_permissions())