#!/usr/bin/env python3
"""
Simple test for permission template generation functionality.
"""

import asyncio
import sys
import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'le-backend'))

# Set minimal environment variables to avoid config errors
os.environ['ENVIRONMENT'] = 'testing'
os.environ['MINIO_ACCESS_KEY'] = 'test'
os.environ['MINIO_SECRET_KEY'] = 'test'

from app.database import Base
from app.models.permissions import Permission, Role, RolePermission, PermissionTemplate, ResourceType, PermissionAction, PermissionScope
from app.services.permission_service import PermissionService
from app.models import User

async def test_basic_functionality():
    """Test basic permission functionality."""
    print("Testing basic permission functionality...")

    # Create in-memory SQLite database for testing
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        try:
            # Create permission service
            permission_service = PermissionService(db)

            # Test 1: Create test permissions
            print("\n1. Creating test permissions...")
            permissions_data = [
                {
                    "name": "test_read",
                    "description": "Test read permission",
                    "resource_type": ResourceType.SYSTEM,
                    "action": PermissionAction.READ,
                    "scope": PermissionScope.GLOBAL
                },
                {
                    "name": "test_write",
                    "description": "Test write permission",
                    "resource_type": ResourceType.SYSTEM,
                    "action": PermissionAction.CREATE,
                    "scope": PermissionScope.GLOBAL
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

            # Test 2: Create test role
            print("\n2. Creating test role...")
            try:
                role = await permission_service.create_role(
                    name="test_role",
                    display_name="Test Role",
                    description="Test role for template generation",
                    level=50,
                    created_by="00000000-0000-0000-0000-000000000000"
                )
                print(f"  ✓ Created role: {role.name}")

                # Assign permissions to role
                for perm_name, permission in created_permissions.items():
                    await permission_service.assign_permission_to_role(
                        role_id=role.id,
                        permission_id=permission.id,
                        granted_by="00000000-0000-0000-0000-000000000000"
                    )
                    print(f"    - Assigned permission: {perm_name}")

            except Exception as e:
                print(f"  ✗ Failed to create role: {e}")

            # Test 3: Generate template from role
            print("\n3. Testing template generation...")
            try:
                # Get the role we just created
                stmt = db.select(Role).where(Role.name == "test_role")
                result = await db.execute(stmt)
                role = result.scalar_one_or_none()

                if role:
                    template = await permission_service.generate_template_from_roles(
                        source_role_ids=[role.id],
                        template_name="Test Template",
                        template_description="Generated from test role",
                        created_by="00000000-0000-0000-0000-000000000000"
                    )
                    print(f"  ✓ Generated template: {template.name}")
                    print(f"    - Permissions: {len(template.permissions)}")
                    print(f"    - Type: {template.template_type}")

                    # Verify the template contains the expected permissions
                    expected_perm_ids = {str(p.id) for p in created_permissions.values()}
                    actual_perm_ids = set(template.permissions)

                    if expected_perm_ids == actual_perm_ids:
                        print("  ✓ Template contains correct permissions")
                    else:
                        print(f"  ✗ Template permissions mismatch. Expected: {expected_perm_ids}, Got: {actual_perm_ids}")

            except Exception as e:
                print(f"  ✗ Failed to generate template: {e}")
                import traceback
                traceback.print_exc()

            print("\n✅ Basic functionality tests completed!")

        except Exception as e:
            print(f"❌ Test failed with error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_basic_functionality())