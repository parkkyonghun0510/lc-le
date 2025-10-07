from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.exc import DisconnectionError, OperationalError
from typing import AsyncGenerator, Optional
import redis
import asyncio
import logging
import os
from app.core.config import settings

logger = logging.getLogger(__name__)

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
    echo=os.getenv("SQLALCHEMY_ECHO", "false").lower() == "true",
    connect_args=connect_args,
    # Connection pool settings for better reliability
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=3600,  # Recycle connections every hour
    pool_pre_ping=True,  # Validate connections before use
    # Add logging configuration
    logging_name="sqlalchemy.engine",
    # Only log warnings and errors, not info/debug
    echo_pool=settings.DEBUG,
)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    max_retries = 3
    retry_delay = 1
    
    for attempt in range(max_retries):
        try:
            async with AsyncSessionLocal() as session:
                try:
                    yield session
                except Exception as e:
                    await session.rollback()
                    raise
                finally:
                    await session.close()
            break  # Success, exit retry loop
        except (DisconnectionError, OperationalError) as e:
            if attempt < max_retries - 1:
                logger.warning(f"Database connection failed (attempt {attempt + 1}/{max_retries}): {e}")
                await asyncio.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                logger.error(f"Database connection failed after {max_retries} attempts: {e}")
                raise
        except Exception as e:
            logger.error(f"Unexpected database error: {e}")
            raise


# Redis configuration
_redis_client: Optional[redis.Redis] = None
_async_redis_client: Optional[redis.Redis] = None

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

async def get_async_redis() -> Optional[redis.Redis]:
    """Get async Redis client instance for pub/sub operations"""
    global _async_redis_client
    
    if _async_redis_client is None:
        try:
            # Import async redis here to avoid circular imports
            import redis.asyncio as async_redis
            
            # Try to get Redis URL from settings
            redis_url = getattr(settings, 'REDIS_URL', None)
            if redis_url:
                _async_redis_client = async_redis.from_url(redis_url, decode_responses=True)
                # Test connection
                await _async_redis_client.ping()
            else:
                # Fallback to default Redis configuration
                _async_redis_client = async_redis.Redis(
                    host=getattr(settings, 'REDIS_HOST', 'localhost'),
                    port=getattr(settings, 'REDIS_PORT', 6379),
                    db=getattr(settings, 'REDIS_DB', 0),
                    decode_responses=True
                )
                await _async_redis_client.ping()
        except Exception:
            # If Redis is not available, return None
            # The service will handle this gracefully
            _async_redis_client = None
    
    return _async_redis_client
