from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status
from enum import Enum

class ErrorCode(str, Enum):
    """Standardized error codes for the application"""
    # Validation errors
    DUPLICATE_FIELD = "DUPLICATE_FIELD"
    INVALID_FIELD_FORMAT = "INVALID_FIELD_FORMAT"
    REQUIRED_FIELD_MISSING = "REQUIRED_FIELD_MISSING"
    FIELD_TOO_LONG = "FIELD_TOO_LONG"
    FIELD_TOO_SHORT = "FIELD_TOO_SHORT"
    
    # Database errors
    DATABASE_CONNECTION_ERROR = "DATABASE_CONNECTION_ERROR"
    DATABASE_CONSTRAINT_VIOLATION = "DATABASE_CONSTRAINT_VIOLATION"
    RECORD_NOT_FOUND = "RECORD_NOT_FOUND"
    
    # Authentication/Authorization errors
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    INVALID_TOKEN = "INVALID_TOKEN"
    
    # Business logic errors
    BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION"
    OPERATION_NOT_ALLOWED = "OPERATION_NOT_ALLOWED"
    
    # System errors
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"

class ErrorSeverity(str, Enum):
    """Error severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class BaseApplicationError(Exception):
    """Base exception class for all application errors"""
    
    def __init__(
        self,
        message: str,
        error_code: ErrorCode,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        details: Optional[Dict[str, Any]] = None,
        suggestions: Optional[List[str]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.severity = severity
        self.details = details or {}
        self.suggestions = suggestions or []
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses"""
        return {
            "error_code": self.error_code.value,
            "message": self.message,
            "severity": self.severity.value,
            "details": self.details,
            "suggestions": self.suggestions
        }

class ValidationError(BaseApplicationError):
    """Exception for validation errors"""
    
    def __init__(
        self,
        message: str,
        field: str,
        value: Any,
        error_code: ErrorCode = ErrorCode.INVALID_FIELD_FORMAT,
        existing_id: Optional[int] = None,
        suggestions: Optional[List[str]] = None
    ):
        self.field = field
        self.value = value
        self.existing_id = existing_id
        
        details = {
            "field": field,
            "value": str(value),
            "existing_id": existing_id
        }
        
        super().__init__(
            message=message,
            error_code=error_code,
            severity=ErrorSeverity.MEDIUM,
            details=details,
            suggestions=suggestions
        )

class DuplicateFieldError(ValidationError):
    """Exception for duplicate field errors with enhanced user feedback"""
    
    def __init__(
        self,
        field: str,
        value: Any,
        existing_id: Optional[int] = None,
        entity_type: str = "record",
        custom_message: Optional[str] = None
    ):
        # Generate user-friendly messages based on field type
        field_messages = {
            "username": f"The username '{value}' is already taken. Please choose a different username.",
            "email": f"The email address '{value}' is already registered. Please use a different email or try logging in.",
            "phone": f"The phone number '{value}' is already registered. Please verify your number or use a different one.",
            "employee_id": f"Employee ID '{value}' is already assigned. Please check with your administrator.",
            "id_number": f"This ID number is already registered. Please verify your information.",
            "department_name": f"A department named '{value}' already exists. Please choose a different name.",
            "branch_name": f"A branch named '{value}' already exists. Please choose a different name."
        }
        
        message = custom_message or field_messages.get(field, f"The {field} '{value}' is already in use.")
        
        # Generate helpful suggestions
        suggestions = self._generate_suggestions(field, value)
        
        super().__init__(
            message=message,
            field=field,
            value=value,
            error_code=ErrorCode.DUPLICATE_FIELD,
            existing_id=existing_id,
            suggestions=suggestions
        )
    
    def _generate_suggestions(self, field: str, value: Any) -> List[str]:
        """Generate helpful suggestions based on field type"""
        suggestions = []
        
        if field == "username":
            suggestions = [
                "Try adding numbers or underscores to your username",
                "Consider using your full name or initials",
                "Check if you already have an account"
            ]
        elif field == "email":
            suggestions = [
                "Try using a different email address",
                "Check if you already have an account and try logging in",
                "Contact support if you believe this is an error"
            ]
        elif field == "phone":
            suggestions = [
                "Verify that you entered the correct phone number",
                "Check if you already have an account with this number",
                "Contact support if you need to update your phone number"
            ]
        elif field == "employee_id":
            suggestions = [
                "Contact your HR department to verify your employee ID",
                "Check if you already have an account in the system"
            ]
        elif field in ["department_name", "branch_name"]:
            suggestions = [
                "Try a more specific name (e.g., add location or department code)",
                "Check existing records to avoid conflicts",
                "Consider using abbreviations or alternative naming"
            ]
        
        return suggestions

class DatabaseError(BaseApplicationError):
    """Exception for database-related errors"""
    
    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.DATABASE_CONNECTION_ERROR,
        original_error: Optional[Exception] = None
    ):
        details = {}
        if original_error:
            details["original_error"] = str(original_error)
            details["error_type"] = type(original_error).__name__
        
        super().__init__(
            message=message,
            error_code=error_code,
            severity=ErrorSeverity.HIGH,
            details=details,
            suggestions=["Please try again later", "Contact support if the problem persists"]
        )

class BusinessRuleError(BaseApplicationError):
    """Exception for business rule violations"""
    
    def __init__(
        self,
        message: str,
        rule_name: str,
        context: Optional[Dict[str, Any]] = None
    ):
        details = {
            "rule_name": rule_name,
            "context": context or {}
        }
        
        super().__init__(
            message=message,
            error_code=ErrorCode.BUSINESS_RULE_VIOLATION,
            severity=ErrorSeverity.MEDIUM,
            details=details
        )

class RateLimitError(BaseApplicationError):
    """Exception for rate limiting"""
    
    def __init__(
        self,
        message: str = "Too many requests. Please try again later.",
        retry_after: Optional[int] = None
    ):
        details = {}
        if retry_after:
            details["retry_after"] = retry_after
        
        suggestions = [
            "Please wait before making another request",
            "Consider reducing the frequency of your requests"
        ]
        
        super().__init__(
            message=message,
            error_code=ErrorCode.RATE_LIMIT_EXCEEDED,
            severity=ErrorSeverity.MEDIUM,
            details=details,
            suggestions=suggestions
        )

def create_http_exception(
    error: BaseApplicationError,
    status_code: Optional[int] = None
) -> HTTPException:
    """Convert application error to FastAPI HTTPException"""
    
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
    
    http_status = status_code or status_code_mapping.get(
        error.error_code, 
        status.HTTP_500_INTERNAL_SERVER_ERROR
    )
    
    return HTTPException(
        status_code=http_status,
        detail=error.to_dict()
    )

# Utility functions for common error scenarios
def format_validation_errors(errors: List[ValidationError]) -> Dict[str, Any]:
    """Format multiple validation errors for API response"""
    return {
        "error_code": "MULTIPLE_VALIDATION_ERRORS",
        "message": "Multiple validation errors occurred",
        "errors": [error.to_dict() for error in errors],
        "total_errors": len(errors)
    }

def create_field_error_response(
    field: str,
    value: Any,
    error_type: str = "validation",
    custom_message: Optional[str] = None
) -> Dict[str, Any]:
    """Create a standardized field error response"""
    return {
        "field": field,
        "value": str(value),
        "error_type": error_type,
        "message": custom_message or f"Invalid value for field '{field}'",
        "timestamp": None  # Will be set by the API layer
    }