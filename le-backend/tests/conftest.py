"""
Test configuration and fixtures for the LC Workflow Backend.
"""
import pytest
import asyncio
from typing import AsyncGenerator
import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from httpx import AsyncClient
from app.main import app
from app.database import get_db, Base
from app.models import User
from app.core.security import get_password_hash

# Test database URL - use PostgreSQL for testing
TEST_DATABASE_URL = "postgresql+asyncpg://user:password@localhost/lc_workflow_test"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False
)

# Create test session factory
TestSessionLocal = sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    # Create all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session
    async with TestSessionLocal() as session:
        yield session
    
    # Clean up - drop all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with database session override."""
    
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()

@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash=get_password_hash("testpassword"),
        first_name="Test",
        last_name="User",
        role="officer",
        status="active"
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """Create a test admin user."""
    user = User(
        username="admin",
        email="admin@example.com",
        password_hash=get_password_hash("adminpassword"),
        first_name="Admin",
        last_name="User",
        role="admin",
        status="active"
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture
async def auth_headers(client: AsyncClient, test_user: User) -> dict:
    """Get authentication headers for test user."""
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "testuser", "password": "testpassword"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
async def admin_headers(client: AsyncClient, admin_user: User) -> dict:
    """Get authentication headers for admin user."""
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "admin", "password": "adminpassword"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

# Pytest configuration
pytest_plugins = []

def pytest_configure(config):
    """Configure pytest."""
    config.addinivalue_line("markers", "slow: marks tests as slow")
    config.addinivalue_line("markers", "integration: marks tests as integration tests")
    config.addinivalue_line("markers", "unit: marks tests as unit tests")