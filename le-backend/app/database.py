from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator, Optional
import redis
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


# Redis configuration
_redis_client: Optional[redis.Redis] = None

def get_redis() -> Optional[redis.Redis]:
    """Get Redis client instance"""
    global _redis_client
    
    if _redis_client is None:
        try:
            # Try to get Redis URL from settings
            redis_url = getattr(settings, 'REDIS_URL', None)
            if redis_url:
                _redis_client = redis.from_url(redis_url, decode_responses=True)
                # Test connection
                _redis_client.ping()
            else:
                # Fallback to default Redis configuration
                _redis_client = redis.Redis(
                    host=getattr(settings, 'REDIS_HOST', 'localhost'),
                    port=getattr(settings, 'REDIS_PORT', 6379),
                    db=getattr(settings, 'REDIS_DB', 0),
                    decode_responses=True
                )
                _redis_client.ping()
        except Exception:
            # If Redis is not available, return None
            # The enum service will handle this gracefully
            _redis_client = None
    
    return _redis_client