"""Database health monitoring utilities."""

import asyncio
import logging
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from typing import Dict, Any
from datetime import datetime, timezone

from app.database import engine

logger = logging.getLogger(__name__)

async def check_database_health() -> Dict[str, Any]:
    """
    Check database connectivity and return health status.
    
    Returns:
        Dict containing health status, connection info, and any errors
    """
    health_info = {
        "status": "unknown",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "connection_pool": {},
        "error": None
    }
    
    try:
        # Test basic connectivity
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1 as health_check"))
            row = result.fetchone()
            
            if row and row[0] == 1:
                health_info["status"] = "healthy"
            else:
                health_info["status"] = "unhealthy"
                health_info["error"] = "Health check query returned unexpected result"
        
        # Get connection pool information
        pool = engine.pool
        health_info["connection_pool"] = {
            "size": pool.size(),
            "checked_in": pool.checkedin(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            # AsyncAdaptedQueuePool doesn't have invalid() method
            "pool_type": type(pool).__name__
        }
        
    except SQLAlchemyError as e:
        health_info["status"] = "unhealthy"
        health_info["error"] = {
            "type": type(e).__name__,
            "message": str(e),
            "is_connection_error": _is_connection_error(e)
        }
        logger.error(f"Database health check failed: {e}")
        
    except Exception as e:
        health_info["status"] = "unhealthy"
        health_info["error"] = {
            "type": type(e).__name__,
            "message": str(e),
            "is_connection_error": False
        }
        logger.error(f"Unexpected error during database health check: {e}")
    
    return health_info

def _is_connection_error(exc: SQLAlchemyError) -> bool:
    """Check if the exception is related to connection issues."""
    from sqlalchemy.exc import DisconnectionError, OperationalError
    
    if isinstance(exc, (DisconnectionError, OperationalError)):
        return True
    
    # Check error message for connection-related keywords
    error_message = str(exc).lower()
    connection_keywords = [
        'connection', 'closed', 'timeout', 'network', 
        'refused', 'unreachable', 'disconnected'
    ]
    
    return any(keyword in error_message for keyword in connection_keywords)

async def wait_for_database(max_attempts: int = 30, delay: float = 2.0) -> bool:
    """
    Wait for database to become available.
    
    Args:
        max_attempts: Maximum number of connection attempts
        delay: Delay between attempts in seconds
        
    Returns:
        True if database becomes available, False if timeout
    """
    for attempt in range(max_attempts):
        try:
            health = await check_database_health()
            if health["status"] == "healthy":
                logger.info(f"Database connection established after {attempt + 1} attempts")
                return True
        except Exception as e:
            logger.debug(f"Database connection attempt {attempt + 1} failed: {e}")
        
        if attempt < max_attempts - 1:
            await asyncio.sleep(delay)
    
    logger.error(f"Database connection failed after {max_attempts} attempts")
    return False

async def reconnect_database() -> bool:
    """
    Attempt to reconnect to the database by disposing current connections.
    
    Returns:
        True if reconnection successful, False otherwise
    """
    try:
        # Dispose of all connections in the pool
        await engine.dispose()
        logger.info("Database connection pool disposed")
        
        # Wait a moment for cleanup
        await asyncio.sleep(1)
        
        # Test new connection
        health = await check_database_health()
        if health["status"] == "healthy":
            logger.info("Database reconnection successful")
            return True
        else:
            logger.warning("Database reconnection failed - health check unsuccessful")
            return False
            
    except Exception as e:
        logger.error(f"Database reconnection failed: {e}")
        return False