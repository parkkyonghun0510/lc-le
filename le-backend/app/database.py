from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator
from app.core.config import settings

# Convert psycopg2 URL to asyncpg URL for Railway compatibility
def get_async_database_url(url: str) -> str:
    """Convert postgresql:// to postgresql+asyncpg:// for async support."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url

# Configure SSL for Railway PostgreSQL
async_database_url = get_async_database_url(settings.DATABASE_URL)

# Configure connection args based on database type
connect_args = {}
if "postgresql" in async_database_url:
    connect_args["ssl"] = "require" if "railway" in async_database_url else False

engine = create_async_engine(
    async_database_url, 
    echo=settings.DEBUG,
    connect_args=connect_args
)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()