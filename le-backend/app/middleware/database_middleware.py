"""Middleware for handling database connection issues."""

import logging
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.exc import DisconnectionError, OperationalError
from datetime import datetime, timezone

from app.core.database_health import reconnect_database

logger = logging.getLogger(__name__)

class DatabaseConnectionMiddleware(BaseHTTPMiddleware):
    """Middleware to handle database connection issues and automatic reconnection."""
    
    def __init__(self, app, max_reconnect_attempts: int = 3):
        super().__init__(app)
        self.max_reconnect_attempts = max_reconnect_attempts
        self._reconnect_in_progress = False
    
    async def dispatch(self, request: Request, call_next) -> Response:
        try:
            response = await call_next(request)
            return response
            
        except (DisconnectionError, OperationalError) as e:
            logger.warning(f"Database connection error detected: {e}")
            
            # Attempt automatic reconnection if not already in progress
            if not self._reconnect_in_progress:
                await self._attempt_reconnection()
            
            # Return service unavailable response
            return JSONResponse(
                status_code=503,
                content={
                    "success": False,
                    "error": {
                        "code": "DATABASE_CONNECTION_ERROR",
                        "message": "Database connection temporarily unavailable",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "details": {
                            "error_type": type(e).__name__,
                            "reconnection_attempted": True
                        },
                        "suggestions": [
                            "Please try again in a few moments",
                            "The database connection is being restored"
                        ]
                    }
                }
            )
        
        except Exception as e:
            # Let other exceptions bubble up to be handled by error handlers
            raise
    
    async def _attempt_reconnection(self):
        """Attempt to reconnect to the database."""
        if self._reconnect_in_progress:
            return
        
        self._reconnect_in_progress = True
        try:
            logger.info("Attempting database reconnection...")
            
            for attempt in range(self.max_reconnect_attempts):
                try:
                    success = await reconnect_database()
                    if success:
                        logger.info(f"Database reconnection successful after {attempt + 1} attempts")
                        return
                    else:
                        logger.warning(f"Database reconnection attempt {attempt + 1} failed")
                        
                except Exception as e:
                    logger.error(f"Database reconnection attempt {attempt + 1} error: {e}")
            
            logger.error(f"Database reconnection failed after {self.max_reconnect_attempts} attempts")
            
        finally:
            self._reconnect_in_progress = False