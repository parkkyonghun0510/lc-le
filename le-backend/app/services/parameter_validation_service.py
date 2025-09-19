"""
Parameter validation service for file upload operations.
Provides comprehensive validation with clear error messages.
"""

import logging
from typing import Optional, Dict, Any
from uuid import UUID
from fastapi import HTTPException, status
from pydantic import BaseModel

from app.core.logging import get_logger

logger = get_logger(__name__)

# Allowed document types for validation
ALLOWED_DOCUMENT_TYPES = [
    "borrower_photo",
    "borrower_id",
    "borrower_income_proof",
    "guarantor_photo", 
    "guarantor_id",
    "guarantor_income_proof",
    "collateral_photo",
    "collateral_document",
    "land_title",
    "contract",
    "other"
]

class ValidatedUploadParams(BaseModel):
    """Validated upload parameters with proper types"""
    application_id: Optional[UUID] = None
    folder_id: Optional[UUID] = None
    document_type: Optional[str] = None
    field_name: Optional[str] = None

class UploadParameterValidator:
    """Comprehensive parameter validation for file uploads"""
    
    @staticmethod
    async def validate_upload_parameters(
        application_id: Optional[str] = None,
        folder_id: Optional[str] = None,
        document_type: Optional[str] = None,
        field_name: Optional[str] = None,
        # Support for query parameters as fallback
        query_application_id: Optional[str] = None,
        query_folder_id: Optional[str] = None,
        query_document_type: Optional[str] = None,
        query_field_name: Optional[str] = None
    ) -> ValidatedUploadParams:
        """
        Validates and converts upload parameters with comprehensive error handling.
        Supports dual parameter sources (form data and query params) for backward compatibility.
        
        Args:
            application_id: Application ID from form data
            folder_id: Folder ID from form data  
            document_type: Document type from form data
            field_name: Field name from form data
            query_application_id: Application ID from query params (fallback)
            query_folder_id: Folder ID from query params (fallback)
            query_document_type: Document type from query params (fallback)
            query_field_name: Field name from query params (fallback)
            
        Returns:
            ValidatedUploadParams: Validated parameters with proper types
            
        Raises:
            HTTPException: If validation fails with detailed error messages
        """
        logger.debug(
            f"Validating upload parameters - Form data: app_id={application_id}, "
            f"folder_id={folder_id}, doc_type={document_type}, field={field_name}"
        )
        logger.debug(
            f"Query parameters: app_id={query_application_id}, "
            f"folder_id={query_folder_id}, doc_type={query_document_type}, field={query_field_name}"
        )
        
        validated = ValidatedUploadParams()
        
        # Use form data with query params as fallback (form data takes precedence)
        # Note: We need to check for None explicitly, not just falsy values
        final_application_id = application_id if application_id is not None else query_application_id
        final_folder_id = folder_id if folder_id is not None else query_folder_id
        final_document_type = document_type if document_type is not None else query_document_type
        final_field_name = field_name if field_name is not None else query_field_name
        
        logger.debug(
            f"Final parameters after precedence: app_id={final_application_id}, "
            f"folder_id={final_folder_id}, doc_type={final_document_type}, field={final_field_name}"
        )
        
        # Validate application_id
        if final_application_id:
            try:
                validated.application_id = UUID(final_application_id)
                logger.debug(f"Successfully validated application_id: {validated.application_id}")
            except ValueError as e:
                logger.error(f"Invalid application_id format: {final_application_id} - {e}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": "invalid_application_id",
                        "message": f"Invalid application_id format: '{final_application_id}'. Must be a valid UUID.",
                        "parameter": "application_id",
                        "value": final_application_id,
                        "expected_format": "UUID (e.g., 123e4567-e89b-12d3-a456-426614174000)"
                    }
                )
        
        # Validate folder_id
        if final_folder_id:
            try:
                validated.folder_id = UUID(final_folder_id)
                logger.debug(f"Successfully validated folder_id: {validated.folder_id}")
            except ValueError as e:
                logger.error(f"Invalid folder_id format: {final_folder_id} - {e}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": "invalid_folder_id",
                        "message": f"Invalid folder_id format: '{final_folder_id}'. Must be a valid UUID.",
                        "parameter": "folder_id", 
                        "value": final_folder_id,
                        "expected_format": "UUID (e.g., 123e4567-e89b-12d3-a456-426614174000)"
                    }
                )
        
        # Validate document_type
        if final_document_type:
            if final_document_type not in ALLOWED_DOCUMENT_TYPES:
                logger.error(f"Invalid document_type: {final_document_type}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": "invalid_document_type",
                        "message": f"Invalid document_type: '{final_document_type}'.",
                        "parameter": "document_type",
                        "value": final_document_type,
                        "allowed_values": ALLOWED_DOCUMENT_TYPES
                    }
                )
            validated.document_type = final_document_type
            logger.debug(f"Successfully validated document_type: {validated.document_type}")
        
        # Validate field_name (basic validation - non-empty string)
        if final_field_name is not None:
            if not isinstance(final_field_name, str) or not final_field_name.strip():
                logger.error(f"Invalid field_name: {final_field_name}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": "invalid_field_name",
                        "message": f"Invalid field_name: '{final_field_name}'. Must be a non-empty string.",
                        "parameter": "field_name",
                        "value": final_field_name
                    }
                )
            validated.field_name = final_field_name.strip()
            logger.debug(f"Successfully validated field_name: {validated.field_name}")
        
        logger.info(
            f"Parameter validation completed successfully: "
            f"app_id={validated.application_id}, folder_id={validated.folder_id}, "
            f"doc_type={validated.document_type}, field={validated.field_name}"
        )
        
        return validated

    @staticmethod
    def validate_parameter_consistency(params: ValidatedUploadParams) -> None:
        """
        Validates consistency between parameters.
        
        Args:
            params: Validated parameters to check for consistency
            
        Raises:
            HTTPException: If parameters are inconsistent
        """
        # If folder_id is provided without application_id, that's potentially problematic
        # but we'll allow it and let the database constraints handle it
        if params.folder_id and not params.application_id:
            logger.warning(
                f"folder_id provided ({params.folder_id}) without application_id. "
                "This may cause issues if the folder belongs to a different application."
            )
        
        # Log parameter consistency check
        logger.debug(f"Parameter consistency check passed for: {params}")

class ParameterLogger:
    """Utility class for structured parameter logging"""
    
    @staticmethod
    def log_parameter_processing(
        stage: str,
        params: Dict[str, Any],
        correlation_id: Optional[str] = None
    ) -> None:
        """
        Log parameter processing at different stages.
        
        Args:
            stage: Processing stage (e.g., 'received', 'validated', 'processed')
            params: Parameters to log
            correlation_id: Optional correlation ID for request tracking
        """
        log_data = {
            "stage": stage,
            "parameters": params,
            "correlation_id": correlation_id
        }
        
        logger.info(f"Parameter processing [{stage}]: {log_data}")
    
    @staticmethod
    def log_validation_error(
        parameter: str,
        value: Any,
        error: str,
        correlation_id: Optional[str] = None
    ) -> None:
        """
        Log parameter validation errors.
        
        Args:
            parameter: Parameter name that failed validation
            value: Invalid value
            error: Error description
            correlation_id: Optional correlation ID for request tracking
        """
        log_data = {
            "parameter": parameter,
            "value": value,
            "error": error,
            "correlation_id": correlation_id
        }
        
        logger.error(f"Parameter validation error: {log_data}")