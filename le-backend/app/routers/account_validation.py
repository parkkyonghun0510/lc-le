#!/usr/bin/env python3
"""
Account ID Validation Router

Provides endpoints for validating and standardizing account IDs from external systems,
particularly for 8-digit account IDs that need to be integrated with the UUID-based system.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from uuid import UUID

from ..database import get_db
from ..services.account_id_service import AccountIDService, AccountIDValidationError
from ..routers.auth import get_current_user
from ..models import User
from ..core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/account-validation", tags=["Account Validation"])

class AccountIDValidationRequest(BaseModel):
    """Request schema for account ID validation"""
    account_id: str = Field(..., description="Account ID to validate")
    source_system: Optional[str] = Field("external", description="Source system identifier")
    application_id: Optional[UUID] = Field(None, description="Application ID for uniqueness check")

class AccountIDValidationResponse(BaseModel):
    """Response schema for account ID validation"""
    original: str
    standardized: Optional[str]
    format: str
    is_valid: bool
    is_unique: Optional[bool] = None
    generated_uuid: Optional[str] = None
    existing_application_id: Optional[int] = None
    validation_notes: list[str]
    processed_at: str

class BulkAccountIDRequest(BaseModel):
    """Request schema for bulk account ID validation"""
    account_ids: list[str] = Field(..., description="List of account IDs to validate")
    source_system: Optional[str] = Field("external", description="Source system identifier")

class BulkAccountIDResponse(BaseModel):
    """Response schema for bulk account ID validation"""
    results: list[AccountIDValidationResponse]
    summary: Dict[str, int]

@router.post("/validate", response_model=AccountIDValidationResponse)
async def validate_account_id(
    request: AccountIDValidationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> AccountIDValidationResponse:
    """
    Validate and standardize a single account ID from external system
    
    This endpoint:
    1. Validates the format of the account ID (supports 8-digit, UUID, alphanumeric)
    2. Standardizes the format for consistent storage
    3. Checks uniqueness in the system
    4. Generates UUID for compatibility if needed
    """
    try:
        logger.info(f"User {current_user.username} validating account ID: {request.account_id}")
        
        account_service = AccountIDService(db)
        
        # Process the account ID
        result = await account_service.process_external_account_id(
            request.account_id,
            request.application_id
        )
        
        logger.info(f"Account ID validation completed for {request.account_id}: {result['is_valid']}")
        
        return AccountIDValidationResponse(**result)
        
    except AccountIDValidationError as e:
        logger.warning(f"Account ID validation failed: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": e.message,
                "account_id": e.account_id,
                "error_code": e.error_code
            }
        )
    except Exception as e:
        logger.error(f"Unexpected error in account ID validation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during account ID validation"
        )

@router.post("/validate-bulk", response_model=BulkAccountIDResponse)
async def validate_bulk_account_ids(
    request: BulkAccountIDRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> BulkAccountIDResponse:
    """
    Validate multiple account IDs in bulk
    
    Useful for processing batches of account IDs from external systems.
    """
    try:
        logger.info(f"User {current_user.username} validating {len(request.account_ids)} account IDs in bulk")
        
        account_service = AccountIDService(db)
        results = []
        summary = {
            "total": len(request.account_ids),
            "valid": 0,
            "invalid": 0,
            "unique": 0,
            "duplicate": 0
        }
        
        for account_id in request.account_ids:
            try:
                result = await account_service.process_external_account_id(
                    account_id,
                    None  # No application ID for bulk validation
                )
                
                results.append(AccountIDValidationResponse(**result))
                
                if result['is_valid']:
                    summary['valid'] += 1
                    if result.get('is_unique', True):
                        summary['unique'] += 1
                    else:
                        summary['duplicate'] += 1
                else:
                    summary['invalid'] += 1
                    
            except AccountIDValidationError as e:
                # Add failed validation to results
                results.append(AccountIDValidationResponse(
                    original=account_id,
                    standardized=None,
                    format="unknown",
                    is_valid=False,
                    validation_notes=[f"Validation error: {e.message}"],
                    processed_at=e.__dict__.get('processed_at', '')
                ))
                summary['invalid'] += 1
        
        logger.info(f"Bulk validation completed: {summary}")
        
        return BulkAccountIDResponse(
            results=results,
            summary=summary
        )
        
    except Exception as e:
        logger.error(f"Unexpected error in bulk account ID validation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during bulk account ID validation"
        )

@router.get("/formats")
async def get_supported_formats(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get information about supported account ID formats
    """
    return {
        "supported_formats": {
            "eight_digit": {
                "pattern": "^\\d{8}$",
                "description": "8-digit numeric ID from external systems",
                "example": "12345678",
                "notes": "Leading zeros are preserved, cannot be all zeros"
            },
            "uuid": {
                "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                "description": "Standard UUID format",
                "example": "123e4567-e89b-12d3-a456-426614174000",
                "notes": "Case insensitive"
            },
            "alphanumeric_8_20": {
                "pattern": "^[A-Za-z0-9]{8,20}$",
                "description": "Alphanumeric string between 8-20 characters",
                "example": "ACC12345678",
                "notes": "Letters and numbers only"
            },
            "single_digit": {
                "pattern": "^[0-9]$",
                "description": "Single digit fallback for system defaults",
                "example": "1",
                "notes": "Used for system defaults and testing"
            }
        },
        "validation_rules": {
            "eight_digit": [
                "Must be exactly 8 digits",
                "Cannot be all zeros (00000000)",
                "Leading zeros are preserved"
            ],
            "general": [
                "Account ID cannot be empty",
                "Whitespace is automatically trimmed",
                "Format is automatically detected",
                "Uniqueness is checked against existing applications"
            ]
        },
        "integration_notes": {
            "external_systems": "8-digit account IDs from external platforms are automatically standardized",
            "uuid_generation": "UUIDs can be generated from account IDs for system compatibility",
            "backward_compatibility": "All existing account ID formats remain supported"
        }
    }

@router.post("/check-uniqueness")
async def check_account_id_uniqueness(
    account_id: str,
    exclude_application_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Check if an account ID is unique in the system
    """
    try:
        account_service = AccountIDService(db)
        
        is_unique, existing_id = await account_service.check_account_id_uniqueness(
            account_id,
            exclude_application_id
        )
        
        return {
            "account_id": account_id,
            "is_unique": is_unique,
            "existing_application_id": existing_id,
            "message": "Account ID is available" if is_unique else f"Account ID already exists in application {existing_id}"
        }
        
    except Exception as e:
        logger.error(f"Error checking account ID uniqueness: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking account ID uniqueness"
        )

@router.post("/generate-uuid")
async def generate_uuid_from_account_id(
    account_id: str,
    namespace: Optional[str] = "loan_system",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Generate a deterministic UUID from an account ID
    
    Useful for creating UUID-compatible identifiers from external account IDs.
    """
    try:
        account_service = AccountIDService(db)
        
        # First validate the account ID
        validation_result = account_service.validate_and_standardize(account_id)
        
        if not validation_result['is_valid']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid account ID: {validation_result['validation_notes']}"
            )
        
        # Generate UUID
        generated_uuid = account_service.generate_uuid_from_account_id(
            validation_result['standardized'],
            namespace
        )
        
        return {
            "original_account_id": account_id,
            "standardized_account_id": validation_result['standardized'],
            "generated_uuid": generated_uuid,
            "namespace": namespace,
            "deterministic": True,
            "note": "The same account ID will always generate the same UUID"
        }
        
    except AccountIDValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Error generating UUID from account ID: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating UUID from account ID"
        )