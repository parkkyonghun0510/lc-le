"""
Tests for user management endpoints.
"""
import pytest
from httpx import AsyncClient
from app.models import User

@pytest.mark.unit
@pytest.mark.asyncio
async def test_create_user_admin(client: AsyncClient, admin_headers: dict):
    """Test creating a user as admin."""
    user_data = {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "password123",
        "first_name": "New",
        "last_name": "User",
        "role": "officer"
    }
    response = await client.post(
        "/api/v1/users/",
        json=user_data,
        headers=admin_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "newuser"
    assert data["email"] == "newuser@example.com"
    assert data["role"] == "officer"
    assert "password" not in data  # Password should not be returned

@pytest.mark.unit
@pytest.mark.asyncio
async def test_create_user_unauthorized(client: AsyncClient, auth_headers: dict):
    """Test creating a user without admin permissions."""
    user_data = {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "password123",
        "first_name": "New",
        "last_name": "User",
        "role": "officer"
    }
    response = await client.post(
        "/api/v1/users/",
        json=user_data,
        headers=auth_headers
    )
    assert response.status_code == 403

@pytest.mark.unit
@pytest.mark.asyncio
async def test_create_user_duplicate_username(client: AsyncClient, admin_headers: dict, test_user: User):
    """Test creating a user with duplicate username."""
    user_data = {
        "username": "testuser",  # Already exists
        "email": "different@example.com",
        "password": "password123",
        "first_name": "New",
        "last_name": "User",
        "role": "officer"
    }
    response = await client.post(
        "/api/v1/users/",
        json=user_data,
        headers=admin_headers
    )
    assert response.status_code == 400
    assert "Username already exists" in response.json()["detail"]

@pytest.mark.unit
@pytest.mark.asyncio
async def test_list_users_admin(client: AsyncClient, admin_headers: dict, test_user: User):
    """Test listing users as admin."""
    response = await client.get("/api/v1/users/", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 2  # At least test_user and admin_user

@pytest.mark.unit
@pytest.mark.asyncio
async def test_list_users_officer(client: AsyncClient, auth_headers: dict):
    """Test listing users as officer (should be forbidden)."""
    response = await client.get("/api/v1/users/", headers=auth_headers)
    assert response.status_code == 403

@pytest.mark.unit
@pytest.mark.asyncio
async def test_get_user_by_id(client: AsyncClient, admin_headers: dict, test_user: User):
    """Test getting a specific user by ID."""
    response = await client.get(f"/api/v1/users/{test_user.id}", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_user.id)
    assert data["username"] == test_user.username

@pytest.mark.unit
@pytest.mark.asyncio
async def test_get_nonexistent_user(client: AsyncClient, admin_headers: dict):
    """Test getting a non-existent user."""
    fake_uuid = "00000000-0000-0000-0000-000000000000"
    response = await client.get(f"/api/v1/users/{fake_uuid}", headers=admin_headers)
    assert response.status_code == 404

@pytest.mark.unit
@pytest.mark.asyncio
async def test_update_user(client: AsyncClient, admin_headers: dict, test_user: User):
    """Test updating a user."""
    update_data = {
        "first_name": "Updated",
        "last_name": "Name"
    }
    response = await client.put(
        f"/api/v1/users/{test_user.id}",
        json=update_data,
        headers=admin_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Updated"
    assert data["last_name"] == "Name"

@pytest.mark.unit
@pytest.mark.asyncio
async def test_delete_user(client: AsyncClient, admin_headers: dict, test_user: User):
    """Test deleting a user."""
    response = await client.delete(f"/api/v1/users/{test_user.id}", headers=admin_headers)
    assert response.status_code == 204
    
    # Verify user is deleted
    get_response = await client.get(f"/api/v1/users/{test_user.id}", headers=admin_headers)
    assert get_response.status_code == 404

@pytest.mark.unit
@pytest.mark.asyncio
async def test_user_validation_invalid_email(client: AsyncClient, admin_headers: dict):
    """Test user creation with invalid email."""
    user_data = {
        "username": "newuser",
        "email": "invalid-email",
        "password": "password123",
        "first_name": "New",
        "last_name": "User",
        "role": "officer"
    }
    response = await client.post(
        "/api/v1/users/",
        json=user_data,
        headers=admin_headers
    )
    assert response.status_code == 422  # Validation error

@pytest.mark.unit
@pytest.mark.asyncio
async def test_user_validation_short_password(client: AsyncClient, admin_headers: dict):
    """Test user creation with short password."""
    user_data = {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "123",  # Too short
        "first_name": "New",
        "last_name": "User",
        "role": "officer"
    }
    response = await client.post(
        "/api/v1/users/",
        json=user_data,
        headers=admin_headers
    )
    assert response.status_code == 422  # Validation error