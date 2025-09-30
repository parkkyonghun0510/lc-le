#!/usr/bin/env python3
"""
Test script to verify permission endpoints are working correctly.
This script creates a test user, gets an auth token, and tests the endpoints.
"""

import asyncio
import aiohttp
import json
import sys
import os

# Add the le-backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'le-backend'))

from app.database import get_db
from app.models import User
from app.services.permission_service import PermissionService
from app.models.permissions import ResourceType, PermissionAction, PermissionScope
from sqlalchemy import select

BASE_URL = "http://localhost:8000/api/v1"

async def create_test_user():
    """Create a test user with admin permissions."""
    async with get_db() as db:
        # Check if test user already exists
        stmt = select(User).where(User.username == "test_admin")
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if user:
            print("Test user already exists")
            return user

        # Create test user
        test_user = User(
            username="test_admin",
            email="test@example.com",
            password_hash="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj",  # "password"
            first_name="Test",
            last_name="Admin",
            role="admin",
            status="active"
        )

        db.add(test_user)
        await db.commit()
        await db.refresh(test_user)

        # Give the user system permissions
        permission_service = PermissionService(db)

        # Get or create the required permissions
        permissions_to_grant = [
            (ResourceType.SYSTEM, PermissionAction.VIEW_ALL),
            (ResourceType.SYSTEM, PermissionAction.READ),
            (ResourceType.SYSTEM, PermissionAction.CREATE),
            (ResourceType.SYSTEM, PermissionAction.UPDATE),
            (ResourceType.SYSTEM, PermissionAction.DELETE),
            (ResourceType.SYSTEM, PermissionAction.MANAGE),
            (ResourceType.SYSTEM, PermissionAction.ASSIGN),
        ]

        for resource_type, action in permissions_to_grant:
            try:
                permission = await permission_service.create_permission(
                    name=f"test_{resource_type.value}_{action.value}",
                    description=f"Test permission for {resource_type.value}:{action.value}",
                    resource_type=resource_type,
                    action=action,
                    scope=PermissionScope.GLOBAL,
                    created_by=test_user.id
                )

                # Grant permission directly to user
                await permission_service.grant_permission_to_user(
                    user_id=test_user.id,
                    permission_id=permission.id,
                    granted_by=test_user.id,
                    reason="Test permission for debugging"
                )
                print(f"Granted permission: {resource_type.value}:{action.value}")
            except Exception as e:
                print(f"Error granting permission {resource_type.value}:{action.value}: {e}")

        await db.commit()
        print(f"Created test user: {test_user.username}")
        return test_user

async def get_auth_token():
    """Login and get auth token."""
    async with aiohttp.ClientSession() as session:
        login_data = {
            "username": "test_admin",
            "password": "password"
        }

        async with session.post(f"{BASE_URL}/auth/login", json=login_data) as response:
            if response.status == 200:
                data = await response.json()
                return data["access_token"]
            else:
                print(f"Login failed: {response.status}")
                error = await response.text()
                print(f"Error: {error}")
                return None

async def test_endpoints(token):
    """Test the three permission endpoints."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    endpoints = [
        "/permissions/matrix",
        "/permissions/roles",
        "/permissions/templates"
    ]

    async with aiohttp.ClientSession(headers=headers) as session:
        for endpoint in endpoints:
            url = f"{BASE_URL}{endpoint}"
            print(f"\nTesting {url}")

            async with session.get(url) as response:
                print(f"Status: {response.status}")

                if response.status == 200:
                    try:
                        data = await response.json()
                        print(f"Success! Response type: {type(data)}")
                        if isinstance(data, dict):
                            print(f"Keys: {list(data.keys())}")
                    except Exception as e:
                        print(f"Error parsing response: {e}")
                else:
                    try:
                        error = await response.json()
                        print(f"Error: {error}")
                    except:
                        error_text = await response.text()
                        print(f"Error text: {error_text}")

async def main():
    """Main test function."""
    print("Creating test user...")
    user = await create_test_user()

    print("\nGetting auth token...")
    token = await get_auth_token()

    if token:
        print("\nTesting endpoints...")
        await test_endpoints(token)
    else:
        print("Failed to get auth token")

if __name__ == "__main__":
    asyncio.run(main())