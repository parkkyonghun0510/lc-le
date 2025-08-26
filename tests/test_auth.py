"""
Tests for authentication endpoints.
"""
import pytest
from httpx import AsyncClient
from app.models import User

@pytest.mark.unit
@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test health check endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

@pytest.mark.unit
@pytest.mark.asyncio
async def test_api_health_check(client: AsyncClient):
    """Test API health check endpoint."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "unhealthy"]
    assert data["service"] == "lc-workflow-api"

@pytest.mark.unit
@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user: User):
    """Test successful login."""
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "testuser",
            "password": "testpassword"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.unit
@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient, test_user: User):
    """Test login with invalid credentials."""
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "testuser",
            "password": "wrongpassword"
        }
    )
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]

@pytest.mark.unit
@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    """Test login with non-existent user."""
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "nonexistent",
            "password": "password"
        }
    )
    assert response.status_code == 401

@pytest.mark.unit
@pytest.mark.asyncio
async def test_get_current_user(client: AsyncClient, auth_headers: dict):
    """Test getting current user information."""
    response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"
    assert data["role"] == "officer"

@pytest.mark.unit
@pytest.mark.asyncio
async def test_get_current_user_unauthorized(client: AsyncClient):
    """Test getting current user without authentication."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401

@pytest.mark.unit
@pytest.mark.asyncio
async def test_get_current_user_invalid_token(client: AsyncClient):
    """Test getting current user with invalid token."""
    headers = {"Authorization": "Bearer invalid_token"}
    response = await client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 401

@pytest.mark.unit
@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient, test_user: User):
    """Test refreshing access token."""
    # First login to get tokens
    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "testuser",
            "password": "testpassword"
        }
    )
    refresh_token = login_response.json()["refresh_token"]
    
    # Use refresh token to get new access token
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.unit
@pytest.mark.asyncio
async def test_refresh_token_invalid(client: AsyncClient):
    """Test refresh token with invalid token."""
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "invalid_token"}
    )
    assert response.status_code == 401