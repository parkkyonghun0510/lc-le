from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.services.async_validation_service import AsyncValidationService, DuplicateValidationError
from app.services.audit_service import AuditService, get_audit_service
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/validation", tags=["validation"])

# Helper function to extract request metadata
def get_request_metadata(request: Request) -> Dict[str, Optional[str]]:
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "user_id": request.headers.get("x-user-id")  # Assuming user ID is passed in headers
    }

# Pydantic models for request/response
class FieldAvailabilityRequest(BaseModel):
    model_name: str
    field: str
    value: Any
    exclude_id: Optional[int] = None

class FieldAvailabilityResponse(BaseModel):
    available: bool
    message: str
    existing_id: Optional[int] = None

class DuplicateValidationRequest(BaseModel):
    model_name: str
    data: Dict[str, Any]
    exclude_id: Optional[int] = None

class DuplicateValidationResponse(BaseModel):
    valid: bool
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []

class DuplicateSuggestionsRequest(BaseModel):
    model_name: str
    search_data: Dict[str, Any]

class DuplicateSuggestionsResponse(BaseModel):
    suggestions: List[Dict[str, Any]]

@router.post("/check-field-availability", response_model=FieldAvailabilityResponse)
async def check_field_availability(
    request_data: FieldAvailabilityRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Check if a specific field value is available for use"""
    try:
        validation_service = AsyncValidationService(db, audit_service)
        metadata = get_request_metadata(request)
        
        result = await validation_service.check_field_availability(
            model_name=request_data.model_name,
            field=request_data.field,
            value=request_data.value,
            exclude_id=request_data.exclude_id,
            user_id=int(metadata["user_id"]) if metadata["user_id"] else None,
            ip_address=metadata["ip_address"],
            user_agent=metadata["user_agent"]
        )
        return FieldAvailabilityResponse(**result)
    
    except Exception as e:
        logger.error(f"Error checking field availability: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking field availability"
        )

@router.post("/validate-duplicates", response_model=DuplicateValidationResponse)
async def validate_duplicates(
    request_data: DuplicateValidationRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    audit_service: AuditService = Depends(get_audit_service)
):
    """Validate data for duplicates across all relevant fields"""
    try:
        validation_service = AsyncValidationService(db, audit_service)
        metadata = get_request_metadata(request)
        errors = []
        warnings = []
        
        try:
            # Call appropriate validation method based on model
            if request_data.model_name.lower() == "user":
                await validation_service.validate_user_duplicates(
                    user_data=request_data.data,
                    exclude_id=request_data.exclude_id,
                    user_id=int(metadata["user_id"]) if metadata["user_id"] else None,
                    ip_address=metadata["ip_address"],
                    user_agent=metadata["user_agent"]
                )
            elif request_data.model_name.lower() == "customer_application":
                await validation_service.validate_customer_application_duplicates(
                    customer_data=request_data.data,
                    exclude_id=request_data.exclude_id,
                    user_id=int(metadata["user_id"]) if metadata["user_id"] else None,
                    ip_address=metadata["ip_address"],
                    user_agent=metadata["user_agent"]
                )
            elif request_data.model_name.lower() == "department":
                await validation_service.validate_department_duplicates(
                    department_data=request_data.data,
                    exclude_id=request_data.exclude_id,
                    user_id=int(metadata["user_id"]) if metadata["user_id"] else None,
                    ip_address=metadata["ip_address"],
                    user_agent=metadata["user_agent"]
                )
            elif request_data.model_name.lower() == "branch":
                await validation_service.validate_branch_duplicates(
                    branch_data=request_data.data,
                    exclude_id=request_data.exclude_id,
                    user_id=int(metadata["user_id"]) if metadata["user_id"] else None,
                    ip_address=metadata["ip_address"],
                    user_agent=metadata["user_agent"]
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Validation not supported for model: {request_data.model_name}"
                )
        
        except DuplicateValidationError as e:
            errors.append({
                "field": e.field,
                "message": e.message,
                "value": str(e.value),
                "existing_id": e.existing_id
            })
        
        return DuplicateValidationResponse(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating duplicates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error validating duplicates"
        )

@router.post("/duplicate-suggestions", response_model=DuplicateSuggestionsResponse)
async def get_duplicate_suggestions(
    request: DuplicateSuggestionsRequest,
    db: AsyncSession = Depends(get_db)
):
    """Get suggestions for potential duplicates based on partial data"""
    try:
        validation_service = AsyncValidationService(db)
        suggestions = await validation_service.get_duplicate_suggestions(
            request.model_name, 
            request.search_data
        )
        return DuplicateSuggestionsResponse(suggestions=suggestions)
    
    except Exception as e:
        logger.error(f"Error getting duplicate suggestions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting duplicate suggestions"
        )

# Specific endpoints for common validation scenarios
@router.get("/check-username/{username}")
async def check_username_availability(
    username: str,
    request: Request,
    exclude_user_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    audit_service: AuditService = Depends(get_audit_service)
) -> Dict[str, Any]:
    """Quick check for username availability"""
    validation_service = AsyncValidationService(db, audit_service)
    metadata = get_request_metadata(request)
    
    result = await validation_service.check_field_availability(
        model_name="user",
        field="username",
        value=username,
        exclude_id=exclude_user_id,
        user_id=int(metadata["user_id"]) if metadata["user_id"] else None,
        ip_address=metadata["ip_address"],
        user_agent=metadata["user_agent"]
    )
    return result

# Audit statistics endpoint
@router.get("/audit/statistics")
async def get_audit_statistics(
    request: Request,
    hours: int = 24,
    db: AsyncSession = Depends(get_db),
    audit_service: AuditService = Depends(get_audit_service)
) -> Dict[str, Any]:
    """Get validation audit statistics"""
    metadata = get_request_metadata(request)
    
    stats = await audit_service.get_validation_statistics(
        hours=hours,
        user_id=int(metadata["user_id"]) if metadata["user_id"] else None
    )
    return stats

@router.get("/audit/suspicious")
async def get_suspicious_activity(
    request: Request,
    hours: int = 24,
    threshold: int = 10,
    db: AsyncSession = Depends(get_db),
    audit_service: AuditService = Depends(get_audit_service)
) -> Dict[str, Any]:
    """Get suspicious validation activity"""
    metadata = get_request_metadata(request)
    
    activity = await audit_service.get_suspicious_activity(
        hours=hours,
        threshold=threshold,
        user_id=int(metadata["user_id"]) if metadata["user_id"] else None
    )
    return activity

# Health check endpoint
@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint"""
    return {"status": "healthy", "service": "validation"}

@router.get("/check-email/{email}")
async def check_email_availability(
    email: str,
    request: Request,
    exclude_user_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    audit_service: AuditService = Depends(get_audit_service)
) -> Dict[str, Any]:
    """Quick check for email availability"""
    validation_service = AsyncValidationService(db, audit_service)
    metadata = get_request_metadata(request)
    
    result = await validation_service.check_field_availability(
        model_name="user",
        field="email",
        value=email,
        exclude_id=exclude_user_id,
        user_id=int(metadata["user_id"]) if metadata["user_id"] else None,
        ip_address=metadata["ip_address"],
        user_agent=metadata["user_agent"]
    )
    return result

@router.get("/check-phone/{phone}")
async def check_phone_availability(
    phone: str,
    request: Request,
    exclude_application_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    audit_service: AuditService = Depends(get_audit_service)
) -> Dict[str, Any]:
    """Quick check for phone number availability"""
    validation_service = AsyncValidationService(db, audit_service)
    metadata = get_request_metadata(request)
    
    result = await validation_service.check_field_availability(
        model_name="customer_application",
        field="phone",
        value=phone,
        exclude_id=exclude_application_id,
        user_id=int(metadata["user_id"]) if metadata["user_id"] else None,
        ip_address=metadata["ip_address"],
        user_agent=metadata["user_agent"]
    )
    return result

@router.get("/check-employee-id/{employee_id}")
async def check_employee_id_availability(
    employee_id: str,
    exclude_user_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Quick check for employee ID availability"""
    validation_service = AsyncValidationService(db)
    result = await validation_service.check_field_availability(
        "user", "employee_id", employee_id, exclude_user_id
    )
    return result

@router.post("/check-id-number")
async def check_id_number_availability(
    id_number: str,
    id_card_type: str,
    exclude_application_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Check for ID number + card type combination availability"""
    try:
        validation_service = AsyncValidationService(db)
        
        # Use the comprehensive validation for ID number + type combination
        test_data = {
            "id_number": id_number,
            "id_card_type": id_card_type
        }
        
        try:
            await validation_service.validate_customer_application_duplicates(
                test_data, exclude_application_id
            )
            return {
                "available": True,
                "message": "ID number is available"
            }
        except DuplicateValidationError as e:
            return {
                "available": False,
                "message": e.message,
                "existing_id": e.existing_id
            }
    
    except Exception as e:
        logger.error(f"Error checking ID number availability: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking ID number availability"
        )