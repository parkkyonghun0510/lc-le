from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from typing import Dict, Any
import traceback
from datetime import datetime

from app.core.exceptions import (
    BaseApplicationError,
    DuplicateFieldError,
    ValidationError,
    DatabaseError,
    ErrorCode,
    ErrorSeverity,
    create_http_exception
)
from app.core.logging import get_logger

logger = get_logger(__name__)

def create_error_response(
    error_code: str,
    message: str,
    details: Dict[str, Any] = None,
    suggestions: list = None,
    status_code: int = 500
) -> JSONResponse:
    """Create a standardized error response"""
    response_data = {
        "success": False,
        "error": {
            "code": error_code,
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details or {},
            "suggestions": suggestions or []
        }
    }
    
    return JSONResponse(
        status_code=status_code,
        content=response_data
    )

async def application_error_handler(request: Request, exc: BaseApplicationError) -> JSONResponse:
    """Handle custom application errors"""
    logger.error(
        f"Application error: {exc.error_code.value} - {exc.message}",
        extra={
            "error_code": exc.error_code.value,
            "severity": exc.severity.value,
            "details": exc.details,
            "path": str(request.url),
            "method": request.method
        }
    )
    
    # Map error codes to HTTP status codes
    status_code_mapping = {
        ErrorCode.DUPLICATE_FIELD: status.HTTP_409_CONFLICT,
        ErrorCode.INVALID_FIELD_FORMAT: status.HTTP_422_UNPROCESSABLE_ENTITY,
        ErrorCode.REQUIRED_FIELD_MISSING: status.HTTP_422_UNPROCESSABLE_ENTITY,
        ErrorCode.FIELD_TOO_LONG: status.HTTP_422_UNPROCESSABLE_ENTITY,
        ErrorCode.FIELD_TOO_SHORT: status.HTTP_422_UNPROCESSABLE_ENTITY,
        ErrorCode.DATABASE_CONNECTION_ERROR: status.HTTP_503_SERVICE_UNAVAILABLE,
        ErrorCode.DATABASE_CONSTRAINT_VIOLATION: status.HTTP_409_CONFLICT,
        ErrorCode.RECORD_NOT_FOUND: status.HTTP_404_NOT_FOUND,
        ErrorCode.UNAUTHORIZED: status.HTTP_401_UNAUTHORIZED,
        ErrorCode.FORBIDDEN: status.HTTP_403_FORBIDDEN,
        ErrorCode.BUSINESS_RULE_VIOLATION: status.HTTP_422_UNPROCESSABLE_ENTITY,
        ErrorCode.OPERATION_NOT_ALLOWED: status.HTTP_403_FORBIDDEN,
        ErrorCode.RATE_LIMIT_EXCEEDED: status.HTTP_429_TOO_MANY_REQUESTS,
        ErrorCode.INTERNAL_SERVER_ERROR: status.HTTP_500_INTERNAL_SERVER_ERROR,
        ErrorCode.SERVICE_UNAVAILABLE: status.HTTP_503_SERVICE_UNAVAILABLE
    }
    
    http_status = status_code_mapping.get(exc.error_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return create_error_response(
        error_code=exc.error_code.value,
        message=exc.message,
        details=exc.details,
        suggestions=exc.suggestions,
        status_code=http_status
    )

async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle FastAPI validation errors"""
    logger.warning(
        f"Validation error: {str(exc)}",
        extra={
            "path": str(request.url),
            "method": request.method,
            "errors": exc.errors()
        }
    )
    
    # Format validation errors for better user experience
    formatted_errors = []
    for error in exc.errors():
        field_path = " -> ".join(str(loc) for loc in error["loc"][1:])  # Skip 'body'
        formatted_errors.append({
            "field": field_path,
            "message": error["msg"],
            "type": error["type"],
            "input": error.get("input")
        })
    
    return create_error_response(
        error_code="VALIDATION_ERROR",
        message="Request validation failed",
        details={"field_errors": formatted_errors},
        suggestions=[
            "Please check the required fields and their formats",
            "Ensure all data types match the expected format"
        ],
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
    )

async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle FastAPI HTTP exceptions"""
    logger.warning(
        f"HTTP exception: {exc.status_code} - {exc.detail}",
        extra={
            "status_code": exc.status_code,
            "path": str(request.url),
            "method": request.method
        }
    )
    
    # If detail is already a dict (from our custom exceptions), use it directly
    if isinstance(exc.detail, dict):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    **exc.detail,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
        )
    
    return create_error_response(
        error_code="HTTP_ERROR",
        message=str(exc.detail),
        status_code=exc.status_code
    )

async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Handle SQLAlchemy database errors"""
    logger.error(
        f"Database error: {str(exc)}",
        extra={
            "error_type": type(exc).__name__,
            "path": str(request.url),
            "method": request.method,
            "traceback": traceback.format_exc()
        }
    )
    
    # Handle specific SQLAlchemy errors
    if isinstance(exc, IntegrityError):
        # Parse integrity constraint violations
        error_message = str(exc.orig) if hasattr(exc, 'orig') else str(exc)
        
        # Try to extract field information from constraint violations
        field_info = _parse_integrity_error(error_message)
        
        return create_error_response(
            error_code="DATABASE_CONSTRAINT_VIOLATION",
            message="Data integrity constraint violated",
            details={
                "constraint_info": field_info,
                "database_error": error_message
            },
            suggestions=[
                "Please check for duplicate values in unique fields",
                "Ensure all required relationships are properly set",
                "Contact support if the problem persists"
            ],
            status_code=status.HTTP_409_CONFLICT
        )
    
    # Generic database error
    return create_error_response(
        error_code="DATABASE_ERROR",
        message="A database error occurred",
        details={"error_type": type(exc).__name__},
        suggestions=[
            "Please try again later",
            "Contact support if the problem persists"
        ],
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE
    )

async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle all other unhandled exceptions"""
    logger.error(
        f"Unhandled exception: {str(exc)}",
        extra={
            "error_type": type(exc).__name__,
            "path": str(request.url),
            "method": request.method,
            "traceback": traceback.format_exc()
        }
    )
    
    return create_error_response(
        error_code="INTERNAL_SERVER_ERROR",
        message="An unexpected error occurred",
        details={"error_type": type(exc).__name__},
        suggestions=[
            "Please try again later",
            "Contact support if the problem persists"
        ],
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
    )

def _parse_integrity_error(error_message: str) -> Dict[str, Any]:
    """Parse SQLAlchemy integrity error to extract useful information"""
    info = {"raw_message": error_message}
    
    # Common patterns for different databases
    patterns = {
        "unique_violation": [
            r"UNIQUE constraint failed: (\w+)\.(\w+)",  # SQLite
            r"duplicate key value violates unique constraint \"(\w+)\"",  # PostgreSQL
            r"Duplicate entry '(.+)' for key '(\w+)'",  # MySQL
        ],
        "foreign_key_violation": [
            r"FOREIGN KEY constraint failed",  # SQLite
            r"violates foreign key constraint",  # PostgreSQL
        ],
        "not_null_violation": [
            r"NOT NULL constraint failed: (\w+)\.(\w+)",  # SQLite
            r"null value in column \"(\w+)\" violates not-null constraint",  # PostgreSQL
        ]
    }
    
    import re
    
    for violation_type, pattern_list in patterns.items():
        for pattern in pattern_list:
            match = re.search(pattern, error_message, re.IGNORECASE)
            if match:
                info["violation_type"] = violation_type
                info["matched_groups"] = match.groups()
                break
        if "violation_type" in info:
            break
    
    return info

# Utility function to register all error handlers
def register_error_handlers(app):
    """Register all error handlers with the FastAPI app"""
    app.add_exception_handler(BaseApplicationError, application_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)
    app.add_exception_handler(Exception, general_exception_handler)