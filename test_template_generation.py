#!/usr/bin/env python3
"""
Test script for permission template generation functionality.
This script tests the backend API endpoints directly.
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'le-backend'))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.permissions import Permission, Role, RolePermission, PermissionTemplate
from app.services.permission_service import PermissionService
from app.models import User
from app.core.config import settings

async def test_template_generation():
    """Test the template generation functionality."""
    print("Testing permission template generation...")

    # Create database engine
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        try:
            # Create permission service
            permission_service = PermissionService(db)

            # Test 1: Create some test permissions
            print("\n1. Creating test permissions...")
            permissions_data = [
                {
                    "name": "test_read",
                    "description": "Test read permission",
                    "resource_type": "SYSTEM",
                    "action": "READ",
                    "scope": "GLOBAL"
                },
                {
                    "name": "test_write",
                    "description": "Test write permission",
                    "resource_type": "SYSTEM",
                    "action": "CREATE",
                    "scope": "GLOBAL"
                },
                {
                    "name": "test_admin",
                    "description": "Test admin permission",
                    "resource_type": "SYSTEM",
                    "action": "MANAGE",
                    "scope": "GLOBAL"
                }
            ]

            created_permissions = {}
            for perm_data in permissions_data:
                try:
                    permission = await permission_service.create_permission(
                        name=perm_data["name"],
                        description=perm_data["description"],
                        resource_type=perm_data["resource_type"],
                        action=perm_data["action"],
                        scope=perm_data["scope"],
                        created_by="00000000-0000-0000-0000-000000000000"
                    )
                    created_permissions[perm_data["name"]] = permission
                    print(f"  ✓ Created permission: {perm_data['name']}")
                except Exception as e:
                    print(f"  ✗ Failed to create permission {perm_data['name']}: {e}")

            # Test 2: Create test roles
            print("\n2. Creating test roles...")
            roles_data = [
                {
                    "name": "test_manager",
                    "display_name": "Test Manager",
                    "description": "Test manager role",
                    "level": 80,
                    "permissions": ["test_read", "test_write"]
                },
                {
                    "name": "test_admin",
                    "display_name": "Test Admin",
                    "description": "Test admin role",
                    "level": 100,
                    "permissions": ["test_read", "test_write", "test_admin"]
                }
            ]

            created_roles = {}
            for role_data in roles_data:
                try:
                    role = await permission_service.create_role(
                        name=role_data["name"],
                        display_name=role_data["display_name"],
                        description=role_data["description"],
                        level=role_data["level"],
                        created_by="00000000-0000-0000-0000-000000000000"
                    )
                    created_roles[role_data["name"]] = role
                    print(f"  ✓ Created role: {role_data['name']}")

                    # Assign permissions to role
                    for perm_name in role_data["permissions"]:
                        permission = created_permissions.get(perm_name)
                        if permission:
                            await permission_service.assign_permission_to_role(
                                role_id=role.id,
                                permission_id=permission.id,
                                granted_by="00000000-0000-0000-0000-000000000000"
                            )
                            print(f"    - Assigned permission: {perm_name}")

                except Exception as e:
                    print(f"  ✗ Failed to create role {role_data['name']}: {e}")

            # Test 3: Generate template from roles
            print("\n3. Testing template generation from roles...")
            try:
                # Get the roles we just created
                manager_role = created_roles.get("test_manager")
                admin_role = created_roles.get("test_admin")

                if manager_role and admin_role:
                    # Generate template from manager role
                    template = await permission_service.generate_template_from_roles(
                        source_role_ids=[manager_role.id],
                        template_name="Test Manager Template",
                        template_description="Generated from test manager role",
                        created_by="00000000-0000-0000-0000-000000000000"
                    )
                    print(f"  ✓ Generated template: {template.name}")
                    print(f"    - Permissions: {len(template.permissions)}")
                    print(f"    - Type: {template.template_type}")

            except Exception as e:
                print(f"  ✗ Failed to generate template: {e}")

            # Test 4: Test template suggestions
            print("\n4. Testing template suggestions...")
            try:
                suggestions = await permission_service.get_template_suggestions(
                    analysis_type="pattern",
                    role_limit=5
                )
                print(f"  ✓ Generated {len(suggestions.get('suggestions', []))} suggestions")

            except Exception as e:
                print(f"  ✗ Failed to get suggestions: {e}")

            # Test 5: Test bulk template generation
            print("\n5. Testing bulk template generation...")
            try:
                bulk_configs = [
                    {
                        "source_role_ids": [created_roles["test_manager"].id],
                        "template_name": "Bulk Manager Template",
                        "template_description": "Bulk generated manager template"
                    },
                    {
                        "source_role_ids": [created_roles["test_admin"].id],
                        "template_name": "Bulk Admin Template",
                        "template_description": "Bulk generated admin template"
                    }
                ]

                results = await permission_service.bulk_generate_templates(
                    generation_configs=bulk_configs,
                    created_by="00000000-0000-0000-0000-000000000000"
                )

                print(f"  ✓ Bulk generation completed:")
                print(f"    - Success: {results.get('success_count', 0)}")
                print(f"    - Failed: {results.get('failure_count', 0)}")

            except Exception as e:
                print(f"  ✗ Failed bulk generation: {e}")

            print("\n✅ Template generation tests completed!")

        except Exception as e:
            print(f"❌ Test failed with error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_template_generation())