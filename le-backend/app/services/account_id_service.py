#!/usr/bin/env python3
"""
Account ID Service for validating and standardizing account IDs from external systems

This service handles:
1. Validation of 8-digit account IDs from external platforms
2. Standardization and formatting
3. Secure integration with UUID-based system
4. Conversion between different account ID formats
"""

import re
import uuid
import hashlib
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from ..models import CustomerApplication
from ..core.logging import get_logger

logger = get_logger(__name__)

class AccountIDValidationError(Exception):
    """Custom exception for account ID validation errors"""
    def __init__(self, message: str, account_id: str, error_code: str = None):
        self.message = message
        self.account_id = account_id
        self.error_code = error_code
        super().__init__(self.message)

class AccountIDService:
    """Service for handling account ID validation and standardization"""
    
    # Regex patterns for different account ID formats
    PATTERNS = {
        'eight_digit': r'^\d{8}$',
        'six_digit': r'^\d{6}$',
        'uuid': r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        'alphanumeric_8_20': r'^[A-Za-z0-9]{8,20}$',
        'single_digit': r'^[0-9]$'
    }
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    def validate_six_digit_account_id(self, account_id: str) -> bool:
        """
        Validate 6-digit account ID from external system

        Args:
            account_id: The account ID to validate

        Returns:
            bool: True if valid 6-digit account ID

        Raises:
            AccountIDValidationError: If validation fails
        """
        if not account_id:
            raise AccountIDValidationError(
                "Account ID cannot be empty",
                account_id or "",
                "EMPTY_ACCOUNT_ID"
            )

        # Remove any whitespace
        account_id = account_id.strip()

        # Check if it's exactly 6 digits
        if not re.match(self.PATTERNS['six_digit'], account_id):
            raise AccountIDValidationError(
                f"Account ID must be exactly 6 digits, got: {account_id}",
                account_id,
                "INVALID_FORMAT"
            )

        # Additional business logic validation
        if account_id == '000000':
            return False

        logger.info(f"Successfully validated 6-digit account ID: {account_id}")
        return True
    
    def validate_eight_digit_account_id(self, account_id: str) -> bool:
        """
        Validate 8-digit account ID format and business rules
        
        Args:
            account_id: Account ID to validate
            
        Returns:
            bool: True if valid, False otherwise
        """
        if not account_id:
            raise AccountIDValidationError(
                "Account ID cannot be empty", 
                account_id or "", 
                "EMPTY_ACCOUNT_ID"
            )
        
        # Remove any whitespace
        account_id = account_id.strip()
        
        # Check if it's exactly 8 digits
        if not re.match(self.PATTERNS['eight_digit'], account_id):
            raise AccountIDValidationError(
                f"Account ID must be exactly 8 digits, got: {account_id}",
                account_id,
                "INVALID_FORMAT"
            )
        
        # Additional business logic validation
        if account_id == '00000000':
            return False
        
        logger.info(f"Successfully validated 8-digit account ID: {account_id}")
        return True
    
    def standardize_account_id(self, account_id: str, source_system: str = "external") -> str:
        """
        Standardize account ID format for consistent storage
        
        Args:
            account_id: Raw account ID from external system
            source_system: Source system identifier
            
        Returns:
            str: Standardized account ID
        """
        if not account_id:
            return account_id
        
        # Remove whitespace and convert to uppercase for consistency
        standardized = account_id.strip().upper()
        
        # For 6-digit IDs, ensure leading zeros are preserved
        if re.match(self.PATTERNS['six_digit'], standardized):
            standardized = standardized.zfill(6)
            logger.info(f"Standardized 6-digit account ID: {account_id} -> {standardized}")
        
        return standardized
    
    def generate_uuid_from_account_id(self, account_id: str, namespace: str = "loan_system") -> str:
        """
        Generate a deterministic UUID from account ID for system compatibility
        
        Args:
            account_id: The account ID to convert
            namespace: Namespace for UUID generation
            
        Returns:
            str: Generated UUID string
        """
        # Create a deterministic UUID using SHA-1 hash
        namespace_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, namespace)
        generated_uuid = uuid.uuid5(namespace_uuid, account_id)
        
        logger.info(f"Generated UUID {generated_uuid} for account ID: {account_id}")
        return str(generated_uuid)
    
    def detect_account_id_format(self, account_id: str) -> str:
        """
        Detect the format of an account ID
        
        Args:
            account_id: The account ID to analyze
            
        Returns:
            str: Format type ('eight_digit', 'uuid', 'alphanumeric_8_20', 'single_digit', 'unknown')
        """
        if not account_id:
            return 'empty'
        
        account_id = account_id.strip()
        
        for format_name, pattern in self.PATTERNS.items():
            if re.match(pattern, account_id, re.IGNORECASE):
                return format_name
        
        return 'unknown'
    
    async def check_account_id_uniqueness(self, account_id: str, exclude_id: Optional[int] = None) -> Tuple[bool, Optional[int]]:
        """
        Check if account ID is unique in the system
        
        Args:
            account_id: Account ID to check
            exclude_id: Application ID to exclude from check
            
        Returns:
            Tuple[bool, Optional[int]]: (is_unique, existing_application_id)
        """
        try:
            query = select(CustomerApplication).where(
                CustomerApplication.account_id == account_id
            )
            
            if exclude_id:
                query = query.where(CustomerApplication.id != exclude_id)
            
            result = await self.db.execute(query)
            existing_application = result.scalar_one_or_none()
            
            if existing_application:
                logger.warning(f"Account ID {account_id} already exists for application {existing_application.id}")
                return False, existing_application.id
            
            return True, None
            
        except Exception as e:
            logger.error(f"Error checking account ID uniqueness: {str(e)}")
            raise
    
    def validate_and_standardize(self, account_id: str, source_system: str = "external") -> Dict[str, Any]:
        """
        Complete validation and standardization process
        
        Args:
            account_id: Raw account ID from external system
            source_system: Source system identifier
            
        Returns:
            Dict containing validation results and standardized values
        """
        result = {
            'original': account_id,
            'standardized': None,
            'format': None,
            'is_valid': False,
            'generated_uuid': None,
            'validation_notes': [],
            'processed_at': datetime.now(timezone.utc).isoformat()
        }
        
        try:
            # Detect format
            format_type = self.detect_account_id_format(account_id)
            result['format'] = format_type
        
            if format_type == 'eight_digit':
                # Validate 8-digit format
                is_valid_eight_digit = self.validate_eight_digit_account_id(account_id)

                if is_valid_eight_digit:
                    # Standardize
                    standardized = self.standardize_account_id(account_id, source_system)
                    result['standardized'] = standardized

                    # Generate UUID for compatibility
                    generated_uuid = self.generate_uuid_from_account_id(standardized)
                    result['generated_uuid'] = generated_uuid

                    result['is_valid'] = True
                    result['validation_notes'].append(f"Valid 8-digit account ID from {source_system}")
                else:
                    result['is_valid'] = False
                    result['validation_notes'].append("Invalid 8-digit account ID: cannot be all zeros")

            elif format_type == 'six_digit':
                # Validate 6-digit format
                is_valid_six_digit = self.validate_six_digit_account_id(account_id)

                if is_valid_six_digit:
                    # Standardize
                    standardized = self.standardize_account_id(account_id, source_system)
                    result['standardized'] = standardized

                    # Generate UUID for compatibility
                    generated_uuid = self.generate_uuid_from_account_id(standardized)
                    result['generated_uuid'] = generated_uuid

                    result['is_valid'] = True
                    result['validation_notes'].append(f"Valid 6-digit account ID from {source_system}")
                else:
                    result['is_valid'] = False
                    result['validation_notes'].append("Invalid 6-digit account ID: cannot be all zeros")

            elif format_type in ['uuid', 'alphanumeric_8_20', 'single_digit']:
                # Already supported formats
                result['standardized'] = account_id.strip()
                result['is_valid'] = True
                result['validation_notes'].append(f"Valid {format_type} format")
                
            else:
                result['validation_notes'].append(f"Unsupported format: {format_type}")
                result['is_valid'] = False
                result['standardized'] = None
                
        except AccountIDValidationError as e:
            result['validation_notes'].append(f"Validation error: {e.message}")
            logger.error(f"Account ID validation failed: {e.message}")
            raise
        except Exception as e:
            result['validation_notes'].append(f"Unexpected error: {str(e)}")
            logger.error(f"Unexpected error in account ID validation: {str(e)}")
            raise
        
        return result
    
    async def process_external_account_id(self, account_id: str, application_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Complete processing pipeline for external account IDs
        
        Args:
            account_id: Account ID from external system
            application_id: Application ID for uniqueness check
            
        Returns:
            Dict containing processing results
        """
        # Validate and standardize
        validation_result = self.validate_and_standardize(account_id, "external_platform")
        
        if validation_result['is_valid']:
            # Check uniqueness
            is_unique, existing_id = await self.check_account_id_uniqueness(
                validation_result['standardized'], 
                application_id
            )
            
            validation_result['is_unique'] = is_unique
            validation_result['existing_application_id'] = existing_id
            
            if not is_unique:
                validation_result['validation_notes'].append(
                    f"Account ID already exists in application {existing_id}"
                )
        
        return validation_result