from __future__ import annotations
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator  # pyright: ignore[reportMissingImports]
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import json
import re
from uuid import UUID
from enum import Enum
from app.workflow import WorkflowStatus, WorkflowStatusUpdate, WorkflowStatusResponse
from app.core.user_status import UserStatus, can_transition_status

# Base schemas
class BaseSchema(BaseModel):
    model_config = {
        "from_attributes": True,
        "extra": "ignore",
        "arbitrary_types_allowed": True,
        "populate_by_name": True
    }

# User schemas
class UserBase(BaseSchema):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    phone_number: Optional[str] = Field(None, max_length=20)
    role: str = Field(default='officer')
    status: str = Field(default='active')
    department_id: Optional[UUID] = None
    branch_id: Optional[UUID] = None
    profile_image_url: Optional[str] = None
    employee_id: Optional[str] = Field(None, max_length=4, pattern=r'^\d{4}$')
    # Position FK (optional for compatibility)
    position_id: Optional[UUID] = None
    # Portfolio and line manager references
    portfolio_id: Optional[UUID] = None
    line_manager_id: Optional[UUID] = None
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Validate that status is one of the allowed values"""
        try:
            UserStatus(v)
            return v
        except ValueError:
            raise ValueError(f'Invalid status: {v}. Must be one of: {", ".join([s.value for s in UserStatus])}')

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    employee_id: Optional[str] = Field(None, max_length=4, pattern=r'^\d{4}$')

class UserUpdate(BaseSchema):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=20)
    password: Optional[str] = Field(None, min_length=6)
    role: Optional[str] = None
    status: Optional[str] = None
    status_reason: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None  # Kept for backward compatibility
    department_id: Optional[UUID] = None
    branch_id: Optional[UUID] = None
    profile_image_url: Optional[str] = None
    employee_id: Optional[str] = Field(None, max_length=4, pattern=r'^\d{4}$')
    position_id: Optional[UUID] = None
    portfolio_id: Optional[UUID] = None
    line_manager_id: Optional[UUID] = None
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Validate that status is one of the allowed values"""
        if v is None:
            return v
        try:
            UserStatus(v)
            return v
        except ValueError:
            raise ValueError(f'Invalid status: {v}. Must be one of: {", ".join([s.value for s in UserStatus])}')

# Position schemas
class PositionBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=100, description="Position name/title")
    description: Optional[str] = Field(None, description="Position description")
    is_active: bool = Field(default=True, description="Whether position is active")

class PositionCreate(PositionBase):
    """Schema for creating a new position"""
    pass

class PositionUpdate(BaseSchema):
    """Schema for updating an existing position"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Updated position name")
    description: Optional[str] = Field(None, description="Updated position description")
    is_active: Optional[bool] = Field(None, description="Updated active status")

class PositionResponse(PositionBase):
    """Schema for position responses"""
    id: UUID
    created_at: datetime
    updated_at: datetime
    users: Optional[List[UserResponse]] = None
    user_count: int = 0

    @classmethod
    def from_orm(cls, position):
        """Create PositionResponse from Position model with computed user_count"""
        data = {
            'id': position.id,
            'name': position.name,
            'description': position.description,
            'is_active': position.is_active,
            'created_at': position.created_at,
            'updated_at': position.updated_at,
            'user_count': len(position.users) if hasattr(position, 'users') and position.users else 0
        }

        # Add nested user objects if relationships are loaded
        if hasattr(position, 'users') and position.users:
            data['users'] = [UserResponse.from_orm(user) for user in position.users]

        return cls(**data)

class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime]
    # Enhanced status management fields
    status_reason: Optional[str] = None
    status_changed_at: Optional[datetime] = None
    status_changed_by: Optional[UUID] = None
    # Activity tracking fields
    last_activity_at: Optional[datetime] = None
    login_count: int = 0
    failed_login_attempts: int = 0
    # Lifecycle management fields
    onboarding_completed: bool = False
    onboarding_completed_at: Optional[datetime] = None
    employee_id: Optional[str] = Field(None, max_length=4, pattern=r'^\d{4}$')
    department: Optional['DepartmentResponse'] = None
    branch: Optional['BranchResponse'] = None
    # Replace prior string placeholder with nested position
    position: Optional['PositionResponse'] = None
    # Portfolio and line manager relationships
    portfolio: Optional['UserResponse'] = None
    line_manager: Optional['UserResponse'] = None
    # Status changed by user relationship
    status_changed_by_user: Optional['UserResponse'] = None

class UserLogin(BaseSchema):
    username: str
    password: str

# User status management schemas
class UserStatusChange(BaseSchema):
    """Schema for changing user status"""
    status: str = Field(..., description="New status for the user")
    reason: str = Field(..., min_length=1, max_length=100, description="Reason for status change")
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Validate that status is one of the allowed values"""
        try:
            UserStatus(v)
            return v
        except ValueError:
            raise ValueError(f'Invalid status: {v}. Must be one of: {", ".join([s.value for s in UserStatus])}')

class UserStatusChangeResponse(BaseSchema):
    """Response schema for status change operations"""
    user_id: UUID
    old_status: str
    new_status: str
    reason: str
    changed_by: UUID
    changed_at: datetime
    allowed_transitions: List[str]

# Bulk operations schemas
class BulkStatusUpdate(BaseSchema):
    """Schema for bulk status update operations"""
    user_ids: List[UUID] = Field(..., min_length=1, max_length=100, description="List of user IDs to update")
    status: str = Field(..., description="New status for selected users")
    reason: str = Field(..., min_length=1, max_length=200, description="Reason for status change")
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Validate that status is one of the allowed values"""
        try:
            UserStatus(v)
            return v
        except ValueError:
            raise ValueError(f'Invalid status: {v}. Must be one of: {", ".join([s.value for s in UserStatus])}')

class BulkOperationResponse(BaseSchema):
    """Response schema for bulk operations"""
    operation_id: UUID
    operation_type: str
    total_records: int
    successful_records: int
    failed_records: int
    status: str
    errors: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

class BulkStatusUpdateResponse(BaseSchema):
    """Response schema for bulk status update operations"""
    operation_id: UUID
    total_users: int
    successful_updates: int
    failed_updates: int
    status: str  # pending, processing, completed, failed
    errors: Optional[List[Dict[str, Any]]] = None
    updated_users: List[UserStatusChangeResponse] = []
    failed_users: List[Dict[str, Any]] = []

# CSV Import schemas
class CSVImportRequest(BaseSchema):
    """Schema for CSV import request"""
    import_mode: str = Field(..., description="Import mode: 'create_only', 'update_only', or 'create_and_update'")
    preview_only: bool = Field(default=False, description="If true, only validate and preview without importing")
    
    @field_validator('import_mode')
    @classmethod
    def validate_import_mode(cls, v):
        """Validate import mode"""
        valid_modes = ['create_only', 'update_only', 'create_and_update']
        if v not in valid_modes:
            raise ValueError(f"Invalid import mode: {v}. Must be one of: {', '.join(valid_modes)}")
        return v

class CSVImportRowResult(BaseSchema):
    """Result for a single CSV row import"""
    row_number: int
    action: str  # 'created', 'updated', 'skipped', 'failed'
    user_id: Optional[UUID] = None
    username: Optional[str] = None
    email: Optional[str] = None
    employee_id: Optional[str] = None
    errors: List[str] = []
    warnings: List[str] = []

class CSVImportResponse(BaseSchema):
    """Response schema for CSV import operations"""
    operation_id: UUID
    total_rows: int
    successful_imports: int
    failed_imports: int
    skipped_rows: int
    status: str  # pending, processing, completed, failed
    preview_mode: bool
    import_mode: str
    results: List[CSVImportRowResult] = []
    summary: Dict[str, Any] = {}
    created_at: datetime
    completed_at: Optional[datetime] = None

# Department schemas
class DepartmentBase(BaseSchema):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=20)
    description: Optional[str] = None
    manager_id: Optional[UUID] = None
    is_active: Optional[bool] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseSchema):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    manager_id: Optional[UUID] = None
    is_active: Optional[bool] = None

class DepartmentResponse(DepartmentBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    manager: Optional['UserResponse'] = None

# Branch schemas
class BranchBase(BaseSchema):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=20)
    address: str = Field(...)
    phone_number: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    manager_id: Optional[UUID] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: bool = True

class BranchCreate(BranchBase):
    pass

class BranchUpdate(BaseSchema):
    name: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = None
    phone_number: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    manager_id: Optional[UUID] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: Optional[bool] = None

class BranchResponse(BranchBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

# Application schemas
class CustomerApplicationBase(BaseSchema):
    # Account grouping
    account_id: Optional[str] = Field(None, max_length=100)
    # Borrower Information
    id_card_type: Optional[str] = Field(None, max_length=50)
    id_number: Optional[str] = Field(None, max_length=50)
    full_name_khmer: Optional[str] = Field(None, max_length=255)
    full_name_latin: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    date_of_birth: Optional[date] = None
    sex: Optional[str] = Field(None, max_length=20)  # male, female, other
    marital_status: Optional[str] = Field(None, max_length=20)  # single, married, divorced, widowed, separated
    portfolio_officer_name: Optional[str] = Field(None, max_length=255)
    
    # Address Information
    current_address: Optional[str] = None
    province: Optional[str] = Field(None, max_length=100)
    district: Optional[str] = Field(None, max_length=100)
    commune: Optional[str] = Field(None, max_length=100)
    village: Optional[str] = Field(None, max_length=100)
    
    # Employment Information
    occupation: Optional[str] = Field(None, max_length=100)
    employer_name: Optional[str] = Field(None, max_length=255)
    monthly_income: Optional[float] = None
    income_source: Optional[str] = Field(None, max_length=100)
    
    # Loan Details
    requested_amount: Optional[float] = None
    loan_purposes: Optional[List[str]] = None
    purpose_details: Optional[str] = None
    product_type: Optional[str] = Field(None, max_length=50)
    desired_loan_term: Optional[int] = None
    
    @field_validator('desired_loan_term', mode='before')
    @classmethod
    def parse_loan_term(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            # Handle formats like "12_months", "6_months", "3_months"
            match = re.search(r'(\d+)', v)
            if match:
                return int(match.group(1))
        if isinstance(v, int):
            return v
        return None
    requested_disbursement_date: Optional[date] = None
    interest_rate: Optional[float] = None
    
    # Additional loan fields from frontend
    loan_amount: Optional[float] = None
    loan_status: Optional[str] = Field(None, max_length=20)
    loan_purpose: Optional[str] = Field(None, max_length=255)
    loan_start_date: Optional[date] = None
    loan_end_date: Optional[date] = None
    
    # Guarantor Information
    guarantor_name: Optional[str] = Field(None, max_length=255)
    guarantor_phone: Optional[str] = Field(None, max_length=20)
    guarantor_id_number: Optional[str] = Field(None, max_length=50)
    guarantor_address: Optional[str] = None
    guarantor_relationship: Optional[str] = Field(None, max_length=100)
    
    # Financial Information
    existing_loans: Optional[List[Dict[str, Any]]] = None
    monthly_expenses: Optional[float] = None
    assets_value: Optional[float] = None
    
    # Risk Assessment
    credit_score: Optional[int] = None
    risk_category: Optional[str] = Field(None, max_length=20)
    assessment_notes: Optional[str] = None
    
    # Additional data
    collaterals: Optional[List[Dict[str, Any]]] = None
    documents: Optional[List[Dict[str, Any]]] = None
    
    # Photo/Document paths from frontend
    profile_image: Optional[str] = None
    borrower_nid_photo_path: Optional[str] = None
    borrower_home_or_land_photo_path: Optional[str] = None
    borrower_business_photo_path: Optional[str] = None
    guarantor_nid_photo_path: Optional[str] = None
    guarantor_home_or_land_photo_path: Optional[str] = None
    guarantor_business_photo_path: Optional[str] = None
    profile_photo_path: Optional[str] = None
    
    # Workflow tracking
    workflow_stage: Optional[str] = Field(None, max_length=50)
    assigned_reviewer: Optional[UUID] = None
    priority_level: Optional[str] = Field(default='normal', max_length=20)
    
    # Role-based workflow fields
    workflow_status: Optional[WorkflowStatus] = Field(default=WorkflowStatus.PO_CREATED)
    po_created_at: Optional[datetime] = None
    po_created_by: Optional[UUID] = None
    user_completed_at: Optional[datetime] = None
    user_completed_by: Optional[UUID] = None
    teller_processed_at: Optional[datetime] = None
    teller_processed_by: Optional[UUID] = None
    manager_reviewed_at: Optional[datetime] = None
    manager_reviewed_by: Optional[UUID] = None

    # Account ID validation
    account_id_validated: Optional[bool] = Field(default=False)
    account_id_validation_notes: Optional[str] = None

    # --- Validators to coerce incoming strings to proper types ---
    @field_validator("workflow_status", mode="before")
    @classmethod
    def _normalize_workflow_status(cls, value: Any):
        # Accept None/empty as default
        if value in (None, "", "null"):
            return WorkflowStatus.PO_CREATED
        # If already Enum, pass through
        if isinstance(value, WorkflowStatus):
            return value
        # Coerce strings like 'user_completed' to 'USER_COMPLETED'
        if isinstance(value, str):
            v = value.strip()
            if not v:
                return WorkflowStatus.PO_CREATED
            try:
                return WorkflowStatus(v.upper())
            except ValueError:
                # Provide clear error listing allowed values
                allowed = ", ".join([s.value for s in WorkflowStatus])
                raise ValueError(f"Invalid workflow_status '{value}'. Allowed: {allowed}")
        return value

    @field_validator("date_of_birth", "requested_disbursement_date", "loan_start_date", "loan_end_date", mode="before")
    @classmethod
    def _parse_optional_date(cls, value: Any):
        if value in (None, "", "null"):
            return None
        
        if isinstance(value, str):
            # Try parsing DD/MM/YYYY format first
            dd_mm_yyyy_pattern = r'^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/\d{4}$'
            if re.match(dd_mm_yyyy_pattern, value):
                try:
                    day, month, year = value.split('/')
                    parsed_date = date(int(year), int(month), int(day))
                    # Validate that the date is actually valid (handles cases like 31/02/2023)
                    if (parsed_date.day == int(day) and 
                        parsed_date.month == int(month) and 
                        parsed_date.year == int(year)):
                        return parsed_date
                except (ValueError, TypeError):
                    raise ValueError(f"Invalid date format. Expected DD/MM/YYYY, got: {value}")
            
            # Try parsing ISO datetime string and extract date
            try:
                dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                return dt.date()
            except:
                # Try parsing ISO date format (YYYY-MM-DD)
                try:
                    return datetime.strptime(value, '%Y-%m-%d').date()
                except:
                    raise ValueError(f"Invalid date format. Expected DD/MM/YYYY or ISO format, got: {value}")
        
        return value

    @field_validator("date_of_birth", mode="after")
    @classmethod
    def _validate_date_of_birth(cls, value: Optional[date]):
        if value is None:
            return value
        
        today = date.today()
        
        # Check if date is in the future
        if value > today:
            raise ValueError("Date of birth cannot be in the future")
        
        # Calculate age
        age = today.year - value.year
        if today.month < value.month or (today.month == value.month and today.day < value.day):
            age -= 1
        
        # Check minimum age (18 years)
        if age < 18:
            raise ValueError("Customer must be at least 18 years old")
        
        # Check maximum age (100 years)
        if age > 100:
            raise ValueError("Please enter a valid date of birth")
        
        return value
    
    @field_validator("account_id", mode="after")
    @classmethod
    def validate_account_id_format(cls, v):
        """Validate account_id format when provided"""
        if v is None:
            return v
        
        # Reject empty strings
        if v == "":
            raise ValueError('Account ID cannot be empty')
        
        # Allow fallback values (single digits) for system defaults
        if v in ['1', '0'] or (len(v) == 1 and v.isdigit()):
            return v
        
        # Allow 6-digit account IDs from external systems
        if re.match(r'^\d{6}$', v):
            # Validate it's not all zeros
            if v == '000000':
                raise ValueError('Account ID cannot be all zeros')
            return v.zfill(6)  # Ensure leading zeros are preserved
        
        # Allow 8-digit account IDs from external systems
        if re.match(r'^\d{8}$', v):
            # Validate it's not all zeros
            if v == '00000000':
                raise ValueError('Account ID cannot be all zeros')
            return v.zfill(8)  # Ensure leading zeros are preserved
        
        # Allow UUID format (36 characters with dashes)
        if re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', v, re.IGNORECASE):
            return v
        
        # Account ID should be alphanumeric and between 8-20 characters for real accounts
        if not re.match(r'^[A-Za-z0-9]{8,20}$', v):
            raise ValueError('Account ID must be 6-digit numeric, 8-digit numeric, 8-20 alphanumeric characters, or UUID format')
        
        return v
    
    @field_validator("desired_loan_term", mode="before")
    @classmethod
    def _normalize_desired_loan_term(cls, value: Any):
        """Normalize various inputs to a canonical '<n>_months|weeks|years' or None.
        Accepts numbers (treated as months) and flexible strings like '12', '12 months', '12m', '52_weeks', '1_year'.
        Provides clear error messages for unsupported formats while remaining user-friendly.
        """
        if value in (None, "", "null"):
            return None
        # Numeric inputs: interpret as months
        if isinstance(value, (int, float)):
            months = int(value)
            if months <= 0:
                # Provide clear guidance for invalid non-positive values
                raise ValueError("desired_loan_term must be a positive number of months or a string like '12_months', '52_weeks', '1_year'")
            return f"{months}_months"
        # String inputs: normalize
        if isinstance(value, str):
            s = value.strip().lower()
            if not s:
                return None
            s = s.replace(" ", "_")
            # Already canonical like '12_months', '52_weeks', '1_years'
            if re.fullmatch(r"\d+_(months|weeks|years)", s):
                return s
            # Digits only -> months
            if s.isdigit():
                n = int(s)
                if n <= 0:
                    raise ValueError("desired_loan_term must be a positive number of months or a string like '12_months', '52_weeks', '1_year'")
                return f"{n}_months"
            # Abbreviations and variants
            m = re.fullmatch(r"(\d+)_?(m|mo|mos|month|months)", s)
            if m:
                return f"{int(m.group(1))}_months"
            m = re.fullmatch(r"(\d+)_?(w|wk|wks|week|weeks)", s)
            if m:
                return f"{int(m.group(1))}_weeks"
            m = re.fullmatch(r"(\d+)_?(y|yr|yrs|year|years)", s)
            if m:
                return f"{int(m.group(1))}_years"
            # Unsupported pattern -> provide clear guidance
            raise ValueError(
                "desired_loan_term must be like '12_months', '52_weeks', '1_year', or a positive number representing months"
            )
        # Any other type -> error with guidance
        raise ValueError(
            "desired_loan_term must be a string or number; accepted examples: 12, '12 months', '12_months', '52_weeks', '1_year'"
        )

    @field_validator("loan_purposes", mode="before")
    @classmethod
    def _parse_loan_purposes(cls, value: Any):
        if value in (None, "", "null"):
            return None
        if isinstance(value, str):
            text = value.strip()
            if not text:  # Empty string after strip
                return None
            try:
                # Try to parse as JSON first
                if (text.startswith("[") and text.endswith("]")) or (
                    text.startswith("{") and text.endswith("}")
                ):
                    parsed = json.loads(text)
                    # Ensure result is a list
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if item]
                    elif isinstance(parsed, dict):
                        # Convert dict values to list
                        return [str(v).strip() for v in parsed.values() if v]
                    else:
                        return [str(parsed).strip()] if parsed else None
            except json.JSONDecodeError:
                pass  # Fall through to comma-separated parsing
            except Exception as e:
                print(f"Warning: Error parsing loan_purposes JSON: {e}")
                
            # Fallback: comma-separated values
            items = [item.strip() for item in text.split(",") if item.strip()]
            return items if items else None
            
        # If it's already a list, clean it up
        if isinstance(value, list):
            return [str(item).strip() for item in value if item]
            
        # If it's any other type, convert to string and wrap in list
        if value is not None:
            return [str(value).strip()]
            
        return None

    @field_validator("existing_loans", "collaterals", "documents", mode="before")
    @classmethod
    def _parse_json_arrays(cls, value: Any):
        if value in (None, "", "null"):
            return None
        if isinstance(value, str):
            value = value.strip()
            if not value:  # Empty string after strip
                return None
            try:
                parsed = json.loads(value)
                # Ensure result is a list for these fields
                if not isinstance(parsed, list):
                    return [parsed] if parsed is not None else None
                return parsed
            except json.JSONDecodeError as e:
                # Log the error for debugging but return None instead of raising
                # This allows the API to continue processing with None value
                print(f"Warning: Invalid JSON in field validation: {e}")
                return None
            except Exception as e:
                print(f"Warning: Unexpected error parsing JSON field: {e}")
                return None
        # If it's already a list or dict, return as-is
        if isinstance(value, (list, dict)):
            return value
        return None

class CustomerApplicationCreate(CustomerApplicationBase):
    pass

class CustomerApplicationUpdate(CustomerApplicationBase):
    status: Optional[str] = None

class CustomerApplicationResponse(CustomerApplicationBase):
    model_config = {
        "from_attributes": True,
        "extra": "ignore",
        "arbitrary_types_allowed": True,
        "populate_by_name": True
    }

    id: UUID
    user_id: UUID
    status: str
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime]
    approved_at: Optional[datetime]
    approved_by: Optional[UUID]
    rejected_at: Optional[datetime]
    rejected_by: Optional[UUID]
    rejection_reason: Optional[str]

    @classmethod
    def from_orm(cls, application):
        """Create CustomerApplicationResponse from CustomerApplication model"""
        data = {
            'id': application.id,
            'user_id': application.user_id,
            'status': application.status,
            'created_at': application.created_at,
            'updated_at': application.updated_at,
            'submitted_at': application.submitted_at,
            'approved_at': application.approved_at,
            'approved_by': application.approved_by,
            'rejected_at': application.rejected_at,
            'rejected_by': application.rejected_by,
            'rejection_reason': application.rejection_reason,
            # Include all base fields
            'account_id': application.account_id,
            'id_card_type': application.id_card_type,
            'id_number': application.id_number,
            'full_name_khmer': application.full_name_khmer,
            'full_name_latin': application.full_name_latin,
            'phone': application.phone,
            'date_of_birth': application.date_of_birth,
            'sex': application.sex,
            'marital_status': application.marital_status,
            'portfolio_officer_name': application.portfolio_officer_name,
            'current_address': application.current_address,
            'province': application.province,
            'district': application.district,
            'commune': application.commune,
            'village': application.village,
            'occupation': application.occupation,
            'employer_name': application.employer_name,
            'monthly_income': application.monthly_income,
            'income_source': application.income_source,
            'requested_amount': application.requested_amount,
            'loan_purposes': application.loan_purposes,
            'purpose_details': application.purpose_details,
            'product_type': application.product_type,
            'desired_loan_term': application.desired_loan_term,
            'requested_disbursement_date': application.requested_disbursement_date,
            'interest_rate': application.interest_rate,
            'loan_amount': application.loan_amount,
            'loan_status': application.loan_status,
            'loan_purpose': application.loan_purpose,
            'loan_start_date': application.loan_start_date,
            'loan_end_date': application.loan_end_date,
            'guarantor_name': application.guarantor_name,
            'guarantor_phone': application.guarantor_phone,
            'guarantor_id_number': application.guarantor_id_number,
            'guarantor_address': application.guarantor_address,
            'guarantor_relationship': application.guarantor_relationship,
            'existing_loans': application.existing_loans,
            'monthly_expenses': application.monthly_expenses,
            'assets_value': application.assets_value,
            'credit_score': application.credit_score,
            'risk_category': application.risk_category,
            'assessment_notes': application.assessment_notes,
            'collaterals': application.collaterals,
            'documents': application.documents,
            'profile_image': application.profile_image,
            'borrower_nid_photo_path': application.borrower_nid_photo_path,
            'borrower_home_or_land_photo_path': application.borrower_home_or_land_photo_path,
            'borrower_business_photo_path': application.borrower_business_photo_path,
            'guarantor_nid_photo_path': application.guarantor_nid_photo_path,
            'guarantor_home_or_land_photo_path': application.guarantor_home_or_land_photo_path,
            'guarantor_business_photo_path': application.guarantor_business_photo_path,
            'profile_photo_path': application.profile_photo_path,
            'workflow_stage': application.workflow_stage,
            'assigned_reviewer': application.assigned_reviewer,
            'priority_level': application.priority_level,
            'workflow_status': application.workflow_status,
            'po_created_at': application.po_created_at,
            'po_created_by': application.po_created_by,
            'user_completed_at': application.user_completed_at,
            'user_completed_by': application.user_completed_by,
            'teller_processed_at': application.teller_processed_at,
            'teller_processed_by': application.teller_processed_by,
            'manager_reviewed_at': application.manager_reviewed_at,
            'manager_reviewed_by': application.manager_reviewed_by,
            'account_id_validated': application.account_id_validated,
            'account_id_validation_notes': application.account_id_validation_notes,
        }
        return cls(**data)

class RejectionRequest(BaseSchema):
    rejection_reason: str

# Enhanced CustomerCard response for frontend UI
class CustomerCardResponse(BaseSchema):
    # Primary identification
    id: UUID
    display_name: str  # Computed from full_name_latin or full_name_khmer
    id_number: Optional[str] = None  # National ID for rapid identification
    phone: Optional[str] = None
    
    # Loan status and lifecycle
    loan_status: Optional[str] = None
    status: str  # Application status (draft, submitted, approved, etc.)
    loan_amount: Optional[float] = None  # Approved/current loan amount
    requested_amount: Optional[float] = None  # Original requested amount
    interest_rate: Optional[float] = None
    loan_start_date: Optional[date] = None  # Actual disbursement date
    loan_end_date: Optional[date] = None    # Loan maturity date
    
    # Loan details as chips
    loan_purposes: Optional[List[str]] = None
    product_type: Optional[str] = None
    desired_loan_term: Optional[str] = None
    
    # Secondary details
    portfolio_officer_name: Optional[str] = None
    risk_category: Optional[str] = None
    priority_level: Optional[str] = None
    
    # Visual elements
    profile_image: Optional[str] = None
    profile_photo_path: Optional[str] = None
    status_color: str  # Computed based on loan_status and status
    
    # Timestamps
    created_at: datetime  # Can be used as loanStartDate fallback
    updated_at: datetime
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    
    # System feedback
    sync_status: str = "synced"  # Default to synced, can be updated by frontend
    
    # Guarantor (if needed for card)
    guarantor_name: Optional[str] = None
    
    @field_validator("display_name", mode="before")
    @classmethod
    def compute_display_name(cls, v, info):
        # This will be computed in the API endpoint
        return v
    
    @field_validator("status_color", mode="before") 
    @classmethod
    def compute_status_color(cls, v, info):
        # This will be computed in the API endpoint
        return v

# File schemas
class FileBase(BaseSchema):
    filename: str
    original_filename: str
    display_name: Optional[str] = None
    file_size: int
    mime_type: str

class FileCreate(FileBase):
    file_path: str
    uploaded_by: UUID
    application_id: Optional[UUID] = None

class FileResponse(FileBase):
    id: UUID
    file_path: str
    uploaded_by: UUID
    application_id: Optional[UUID]
    folder_id: Optional[UUID] = None
    created_at: datetime
    url: Optional[str] = None
    preview_url: Optional[str] = None
    expires_at: Optional[datetime] = None

class FileFinalize(BaseSchema):
    object_name: str = Field(..., description="MinIO object name")
    original_filename: str = Field(..., description="Original filename")
    application_id: Optional[UUID] = Field(None, description="Related application ID")
    folder_id: Optional[UUID] = Field(None, description="Related folder ID")

class FileUploadRequest(BaseSchema):
    """Schema for file upload requests"""
    filename: str = Field(..., min_length=1, max_length=255, description="Original filename")
    file_size: int = Field(..., gt=0, description="File size in bytes")
    mime_type: str = Field(..., min_length=1, max_length=100, description="MIME type")
    application_id: Optional[UUID] = Field(None, description="Related application ID")
    folder_id: Optional[UUID] = Field(None, description="Related folder ID")
    display_name: Optional[str] = Field(None, max_length=255, description="Display name for the file")

class FileSearchParams(BaseSchema):
    """Schema for file search parameters"""
    filename: Optional[str] = Field(None, description="Search by filename")
    mime_type: Optional[str] = Field(None, description="Filter by MIME type")
    application_id: Optional[UUID] = Field(None, description="Filter by application ID")
    folder_id: Optional[UUID] = Field(None, description="Filter by folder ID")
    uploaded_by: Optional[UUID] = Field(None, description="Filter by uploader")
    min_size: Optional[int] = Field(None, ge=0, description="Minimum file size in bytes")
    max_size: Optional[int] = Field(None, ge=0, description="Maximum file size in bytes")
    created_after: Optional[datetime] = Field(None, description="Files created after this date")
    created_before: Optional[datetime] = Field(None, description="Files created before this date")
    page: int = Field(default=1, ge=1, description="Page number")
    size: int = Field(default=50, ge=1, le=1000, description="Page size")

class FileUpdateRequest(BaseSchema):
    """Schema for updating file metadata"""
    display_name: Optional[str] = Field(None, max_length=255, description="Updated display name")
    application_id: Optional[UUID] = Field(None, description="Updated application ID")
    folder_id: Optional[UUID] = Field(None, description="Updated folder ID")

class FileMoveRequest(BaseSchema):
    """Schema for moving files between folders"""
    target_folder_id: UUID = Field(..., description="Target folder ID")
    file_ids: List[UUID] = Field(..., min_items=1, description="List of file IDs to move")

class FileCopyRequest(BaseSchema):
    """Schema for copying files to another folder"""
    target_folder_id: UUID = Field(..., description="Target folder ID")
    file_ids: List[UUID] = Field(..., min_items=1, description="List of file IDs to copy")

class FileDeleteRequest(BaseSchema):
    """Schema for bulk file deletion"""
    file_ids: List[UUID] = Field(..., min_items=1, description="List of file IDs to delete")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for deletion")

class FileStatsResponse(BaseSchema):
    """Schema for file statistics"""
    total_files: int = Field(default=0, description="Total number of files")
    total_size: int = Field(default=0, description="Total size in bytes")
    file_count_by_type: Dict[str, int] = Field(default_factory=dict, description="File count by MIME type")
    total_size_by_type: Dict[str, int] = Field(default_factory=dict, description="Total size by MIME type")
    files_by_application: Dict[str, int] = Field(default_factory=dict, description="File count by application")
    recent_uploads: List[FileResponse] = Field(default_factory=list, description="Recent file uploads")

class FolderStatsResponse(BaseSchema):
    """Schema for folder statistics"""
    total_folders: int = Field(default=0, description="Total number of folders")
    folders_with_files: int = Field(default=0, description="Folders containing files")
    empty_folders: int = Field(default=0, description="Empty folders")
    nested_folders: int = Field(default=0, description="Folders with subfolders")
    total_files_in_folders: int = Field(default=0, description="Total files in all folders")

class FileValidationRequest(BaseSchema):
    """Schema for file validation requests"""
    file_id: UUID = Field(..., description="File ID to validate")
    is_valid: bool = Field(..., description="Whether file is valid")
    validation_notes: Optional[str] = Field(None, max_length=1000, description="Validation notes")
    detected_issues: Optional[List[str]] = Field(None, description="List of detected issues")

class FileValidationResponse(BaseSchema):
    """Schema for file validation responses"""
    file_id: UUID = Field(..., description="Validated file ID")
    is_valid: bool = Field(..., description="Validation result")
    validation_notes: Optional[str] = Field(None, description="Validation notes")
    detected_issues: Optional[List[str]] = Field(None, description="Detected issues")
    validated_by: UUID = Field(..., description="User who performed validation")
    validated_at: datetime = Field(..., description="Validation timestamp")

class FileDownloadRequest(BaseSchema):
    """Schema for file download requests"""
    file_id: UUID = Field(..., description="File ID to download")
    expires_in: Optional[int] = Field(3600, ge=60, le=86400, description="Download link expiry in seconds")

class FileDownloadResponse(BaseSchema):
    """Schema for file download responses"""
    file_id: UUID = Field(..., description="File ID")
    download_url: str = Field(..., description="Temporary download URL")
    expires_at: datetime = Field(..., description="URL expiry timestamp")
    filename: str = Field(..., description="Original filename")

# Validation and Account ID Schemas
class FieldAvailabilityRequest(BaseSchema):
    """Schema for checking field availability"""
    model_name: str = Field(..., description="Model name to check")
    field: str = Field(..., description="Field name to check")
    value: Any = Field(..., description="Value to check for availability")
    exclude_id: Optional[int] = Field(None, description="ID to exclude from uniqueness check")

class FieldAvailabilityResponse(BaseSchema):
    """Schema for field availability response"""
    available: bool = Field(..., description="Whether the field value is available")
    message: str = Field(..., description="Availability message")
    existing_id: Optional[int] = Field(None, description="Existing record ID if not available")

class DuplicateValidationRequest(BaseSchema):
    """Schema for duplicate validation request"""
    model_name: str = Field(..., description="Model name to validate")
    data: Dict[str, Any] = Field(..., description="Data to validate for duplicates")
    exclude_id: Optional[int] = Field(None, description="ID to exclude from duplicate check")

class DuplicateValidationResponse(BaseSchema):
    """Schema for duplicate validation response"""
    valid: bool = Field(..., description="Whether the data is valid (no duplicates)")
    errors: List[Dict[str, Any]] = Field(default_factory=list, description="Validation errors")
    warnings: List[Dict[str, Any]] = Field(default_factory=list, description="Validation warnings")

class DuplicateSuggestionsRequest(BaseSchema):
    """Schema for duplicate suggestions request"""
    model_name: str = Field(..., description="Model name to search")
    search_data: Dict[str, Any] = Field(..., description="Search criteria")

class DuplicateSuggestionsResponse(BaseSchema):
    """Schema for duplicate suggestions response"""
    suggestions: List[Dict[str, Any]] = Field(default_factory=list, description="Suggested similar records")

class AccountIDValidationRequest(BaseSchema):
    """Schema for account ID validation request"""
    account_id: str = Field(..., description="Account ID to validate")
    source_system: Optional[str] = Field("external", description="Source system identifier")
    application_id: Optional[UUID] = Field(None, description="Application ID for uniqueness check")

class AccountIDValidationResponse(BaseSchema):
    """Schema for account ID validation response"""
    original: str = Field(..., description="Original account ID")
    standardized: Optional[str] = Field(None, description="Standardized account ID")
    format: str = Field(..., description="Detected format")
    is_valid: bool = Field(..., description="Whether account ID is valid")
    is_unique: Optional[bool] = Field(None, description="Whether account ID is unique")
    generated_uuid: Optional[str] = Field(None, description="Generated UUID if applicable")
    existing_application_id: Optional[int] = Field(None, description="Existing application ID")
    validation_notes: List[str] = Field(default_factory=list, description="Validation notes")
    processed_at: str = Field(..., description="Processing timestamp")

class BulkAccountIDRequest(BaseSchema):
    """Schema for bulk account ID validation request"""
    account_ids: List[str] = Field(..., description="List of account IDs to validate")
    source_system: Optional[str] = Field("external", description="Source system identifier")

class BulkAccountIDResponse(BaseSchema):
    """Schema for bulk account ID validation response"""
    results: List[AccountIDValidationResponse] = Field(..., description="Individual validation results")
    summary: Dict[str, int] = Field(..., description="Summary statistics")

# Document Type and Upload Schemas
class DocumentTypeOption(BaseSchema):
    """Schema for document type options"""
    value: str = Field(..., description="Document type value")
    label: str = Field(..., description="Display label")

class ValidatedUploadParams(BaseSchema):
    """Schema for validated upload parameters"""
    application_id: Optional[UUID] = Field(None, description="Related application ID")
    folder_id: Optional[UUID] = Field(None, description="Related folder ID")
    document_type: Optional[str] = Field(None, description="Document type")
    field_name: Optional[str] = Field(None, description="Field name for upload")

class DocumentTypeResponse(BaseSchema):
    """Schema for available document types"""
    document_types: List[DocumentTypeOption] = Field(..., description="Available document types")

# Enhanced Workflow Schemas
class WorkflowTransition(BaseSchema):
    """Schema for workflow stage transitions"""
    from_status: WorkflowStatus = Field(..., description="Current workflow status")
    to_status: WorkflowStatus = Field(..., description="Target workflow status")
    required_role: str = Field(..., description="Role required for transition")
    validation_required: bool = Field(default=False, description="Whether validation is required")

class WorkflowStatusUpdate(BaseSchema):
    """Schema for updating workflow status"""
    new_status: WorkflowStatus = Field(..., description="New workflow status")
    notes: Optional[str] = Field(None, description="Transition notes")
    account_id: Optional[str] = Field(None, description="Account ID for teller processing")

class WorkflowHistory(BaseSchema):
    """Schema for workflow history tracking"""
    status: WorkflowStatus = Field(..., description="Workflow status")
    changed_at: datetime = Field(..., description="When status changed")
    changed_by: str = Field(..., description="User ID who changed status")
    notes: Optional[str] = Field(None, description="Change notes")

class WorkflowStatusResponse(BaseSchema):
    """Schema for workflow status information"""
    current_status: WorkflowStatus = Field(..., description="Current workflow status")
    can_edit: bool = Field(..., description="Whether form can be edited")
    next_possible_stages: List[WorkflowStatus] = Field(..., description="Next possible stages")
    requires_account_id: bool = Field(..., description="Whether account ID is required")
    workflow_history: List[WorkflowHistory] = Field(..., description="Workflow history")

# Authentication response
class TokenResponse(BaseSchema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 3600
    user: UserResponse

# Pagination schemas
class PaginationParams(BaseSchema):
    page: int = Field(default=1, ge=1)
    size: int = Field(default=10, ge=1, le=1000)

class PaginatedResponse(BaseSchema):
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int

# Folder schemas
class FolderBase(BaseSchema):
    name: str
    parent_id: Optional[UUID] = None
    application_id: Optional[UUID] = None

class FolderCreate(FolderBase):
    pass

class FolderUpdate(BaseSchema):
    name: Optional[str] = None
    parent_id: Optional[UUID] = None

class FolderResponse(FolderBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    file_count: int = 0

    @classmethod
    def from_orm(cls, folder):
        """Create FolderResponse from Folder model with computed file_count"""
        data = {
            'id': folder.id,
            'name': folder.name,
            'parent_id': folder.parent_id,
            'application_id': folder.application_id,
            'created_at': folder.created_at,
            'updated_at': folder.updated_at,
            'file_count': len(folder.files) if hasattr(folder, 'files') and folder.files else 0
        }
        return cls(**data)

# Setting schemas
class SettingBase(BaseSchema):
    key: str = Field(..., min_length=1, max_length=100, description="Setting key/identifier")
    value: Any = Field(..., description="Setting value (can be any JSON-serializable type)")
    category: str = Field(..., min_length=1, max_length=50, description="Setting category")
    description: Optional[str] = Field(None, description="Human-readable description")
    is_public: bool = Field(default=False, description="Whether non-admin users can read this setting")

class SettingCreate(SettingBase):
    """Schema for creating a new setting"""
    pass

class SettingUpdate(BaseSchema):
    """Schema for updating an existing setting"""
    value: Optional[Any] = Field(None, description="New setting value")
    description: Optional[str] = Field(None, description="Updated description")
    is_public: Optional[bool] = Field(None, description="Updated public visibility flag")

class SettingResponse(SettingBase):
    """Schema for setting responses"""
    id: UUID
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    creator: Optional[UserResponse] = None
    updater: Optional[UserResponse] = None

    @classmethod
    def from_orm(cls, setting):
        """Create SettingResponse from Setting model"""
        data = {
            'id': setting.id,
            'key': setting.key,
            'value': setting.value,
            'category': setting.category,
            'description': setting.description,
            'is_public': setting.is_public,
            'created_at': setting.created_at,
            'updated_at': setting.updated_at,
            'created_by': setting.created_by,
            'updated_by': setting.updated_by,
        }

        # Add nested user objects if relationships are loaded
        if hasattr(setting, 'creator') and setting.creator:
            data['creator'] = UserResponse.from_orm(setting.creator)
        if hasattr(setting, 'updater') and setting.updater:
            data['updater'] = UserResponse.from_orm(setting.updater)

        return cls(**data)

# Audit Log schemas
class AuditEventType(str, Enum):
    """Types of audit events"""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    VALIDATION = "validation"
    ACCESS = "access"
    ERROR = "error"
    SECURITY = "security"

class AuditLogBase(BaseSchema):
    event_type: AuditEventType = Field(..., description="Type of audit event")
    action: str = Field(..., min_length=1, max_length=100, description="Action performed")
    entity_type: Optional[str] = Field(None, min_length=1, max_length=50, description="Type of entity affected")
    entity_id: Optional[str] = Field(None, min_length=1, max_length=50, description="ID of affected entity")
    user_id: Optional[str] = Field(None, min_length=1, max_length=50, description="User who performed the action")
    ip_address: Optional[str] = Field(None, min_length=1, max_length=45, description="IP address of the request")
    user_agent: Optional[str] = Field(None, description="User agent string")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional event details")

class AuditLogResponse(AuditLogBase):
    """Schema for audit log responses"""
    id: int
    timestamp: datetime

    @classmethod
    def from_orm(cls, audit_log):
        """Create AuditLogResponse from AuditLog model"""
        return cls(
            id=audit_log.id,
            event_type=audit_log.event_type,
            action=audit_log.action,
            entity_type=audit_log.entity_type,
            entity_id=audit_log.entity_id,
            user_id=audit_log.user_id,
            ip_address=audit_log.ip_address,
            user_agent=audit_log.user_agent,
            details=audit_log.details,
            timestamp=audit_log.timestamp
        )

class AuditLogQueryParams(BaseSchema):
    """Schema for querying audit logs"""
    event_type: Optional[AuditEventType] = Field(None, description="Filter by event type")
    entity_type: Optional[str] = Field(None, description="Filter by entity type")
    user_id: Optional[str] = Field(None, description="Filter by user ID")
    start_date: Optional[datetime] = Field(None, description="Start date for timestamp filter")
    end_date: Optional[datetime] = Field(None, description="End date for timestamp filter")
    page: int = Field(default=1, ge=1, description="Page number")
    size: int = Field(default=50, ge=1, le=1000, description="Page size")

class AuditLogSummary(BaseSchema):
    """Schema for audit log summary statistics"""
    total_events: int
    event_type_breakdown: Dict[AuditEventType, int]
    entity_type_breakdown: Dict[str, int]
    recent_events: List[AuditLogResponse]

# Bulk Operation schemas
class BulkOperationBase(BaseSchema):
    operation_type: str = Field(..., min_length=1, max_length=50, description="Type of bulk operation")
    performed_by: UUID = Field(..., description="User who initiated the operation")
    target_criteria: Optional[Dict[str, Any]] = Field(None, description="Filters used to select records")
    changes_applied: Optional[Dict[str, Any]] = Field(None, description="Changes that were applied")
    total_records: int = Field(default=0, description="Total number of records processed")
    successful_records: int = Field(default=0, description="Number of successful operations")
    failed_records: int = Field(default=0, description="Number of failed operations")
    error_details: Optional[Dict[str, Any]] = Field(None, description="Details of any errors")
    status: str = Field(default="pending", min_length=1, max_length=20, description="Operation status")
    file_path: Optional[str] = Field(None, max_length=500, description="Path to import/export file")

class BulkOperationResponse(BulkOperationBase):
    """Schema for bulk operation responses"""
    id: UUID
    created_at: datetime
    completed_at: Optional[datetime] = None
    performer: Optional[UserResponse] = None

    @classmethod
    def from_orm(cls, bulk_operation):
        """Create BulkOperationResponse from BulkOperation model"""
        data = {
            'id': bulk_operation.id,
            'operation_type': bulk_operation.operation_type,
            'performed_by': bulk_operation.performed_by,
            'target_criteria': bulk_operation.target_criteria,
            'changes_applied': bulk_operation.changes_applied,
            'total_records': bulk_operation.total_records,
            'successful_records': bulk_operation.successful_records,
            'failed_records': bulk_operation.failed_records,
            'error_details': bulk_operation.error_details,
            'status': bulk_operation.status,
            'file_path': bulk_operation.file_path,
            'created_at': bulk_operation.created_at,
            'completed_at': bulk_operation.completed_at,
        }

        # Add nested user object if relationship is loaded
        if hasattr(bulk_operation, 'performer') and bulk_operation.performer:
            data['performer'] = UserResponse.from_orm(bulk_operation.performer)

        return cls(**data)

# Selfie capture and validation schemas for Flutter app
class SelfieType(str, Enum):
    CUSTOMER_PROFILE = "customer_profile"
    CUSTOMER_WITH_OFFICER = "customer_with_officer"
    ID_VERIFICATION = "id_verification"
    LOCATION_VERIFICATION = "location_verification"

class SelfieBase(BaseSchema):
    application_id: UUID = Field(..., description="Related application ID")
    file_id: UUID = Field(..., description="Related file ID")
    selfie_type: SelfieType = Field(..., description="Type of selfie")
    captured_at: datetime = Field(default_factory=datetime.now, description="When selfie was captured")
    captured_by_user_id: UUID = Field(..., description="User who captured the selfie")
    customer_id_number: Optional[str] = Field(None, max_length=50, description="Customer ID number")
    customer_name: Optional[str] = Field(None, max_length=255, description="Customer name")
    location_latitude: Optional[float] = Field(None, description="Capture location latitude")
    location_longitude: Optional[float] = Field(None, description="Capture location longitude")
    location_address: Optional[str] = Field(None, description="Capture location address")
    face_detection_confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="AI face detection confidence")
    image_quality_score: Optional[float] = Field(None, ge=0.0, le=10.0, description="Image quality score")
    status: str = Field(default="pending_validation", min_length=1, max_length=20, description="Validation status")
    is_validated: bool = Field(default=False, description="Whether selfie has been validated")
    validated_by: Optional[UUID] = Field(None, description="User who validated the selfie")
    validated_at: Optional[datetime] = Field(None, description="When selfie was validated")
    validation_notes: Optional[str] = Field(None, description="Validation notes")
    notes: Optional[str] = Field(None, description="General notes")

class SelfieCreate(SelfieBase):
    """Schema for creating a new selfie"""
    pass

class SelfieUpdate(BaseSchema):
    """Schema for updating an existing selfie"""
    customer_id_number: Optional[str] = Field(None, max_length=50, description="Updated customer ID")
    customer_name: Optional[str] = Field(None, max_length=255, description="Updated customer name")
    location_latitude: Optional[float] = Field(None, description="Updated latitude")
    location_longitude: Optional[float] = Field(None, description="Updated longitude")
    location_address: Optional[str] = Field(None, description="Updated address")
    face_detection_confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Updated face detection confidence")
    image_quality_score: Optional[float] = Field(None, ge=0.0, le=10.0, description="Updated image quality score")
    status: Optional[str] = Field(None, min_length=1, max_length=20, description="Updated status")
    is_validated: Optional[bool] = Field(None, description="Updated validation flag")
    validation_notes: Optional[str] = Field(None, description="Updated validation notes")
    notes: Optional[str] = Field(None, description="Updated general notes")

class SelfieResponse(SelfieBase):
    """Schema for selfie responses"""
    id: UUID
    created_at: datetime
    updated_at: datetime
    application: Optional[CustomerApplicationResponse] = None
    file: Optional[FileResponse] = None
    captured_by: Optional[UserResponse] = None
    validator: Optional[UserResponse] = None

    @classmethod
    def from_orm(cls, selfie):
        """Create SelfieResponse from Selfie model"""
        data = {
            'id': selfie.id,
            'application_id': selfie.application_id,
            'file_id': selfie.file_id,
            'selfie_type': selfie.selfie_type,
            'captured_at': selfie.captured_at,
            'captured_by_user_id': selfie.captured_by_user_id,
            'customer_id_number': selfie.customer_id_number,
            'customer_name': selfie.customer_name,
            'location_latitude': selfie.location_latitude,
            'location_longitude': selfie.location_longitude,
            'location_address': selfie.location_address,
            'face_detection_confidence': selfie.face_detection_confidence,
            'image_quality_score': selfie.image_quality_score,
            'status': selfie.status,
            'is_validated': selfie.is_validated,
            'validated_by': selfie.validated_by,
            'validated_at': selfie.validated_at,
            'validation_notes': selfie.validation_notes,
            'notes': selfie.notes,
            'created_at': selfie.created_at,
            'updated_at': selfie.updated_at,
        }

        # Add nested objects if relationships are loaded
        if hasattr(selfie, 'application') and selfie.application:
            data['application'] = CustomerApplicationResponse.from_orm(selfie.application)
        if hasattr(selfie, 'file') and selfie.file:
            data['file'] = FileResponse.from_orm(selfie.file)
        if hasattr(selfie, 'captured_by') and selfie.captured_by:
            data['captured_by'] = UserResponse.from_orm(selfie.captured_by)
        if hasattr(selfie, 'validator') and selfie.validator:
            data['validator'] = UserResponse.from_orm(selfie.validator)

        return cls(**data)

class SelfieValidationRequest(BaseSchema):
    """Schema for validating a selfie"""
    is_approved: bool = Field(..., description="Whether selfie is approved")
    validation_notes: Optional[str] = Field(None, max_length=500, description="Validation notes")
    face_detection_confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Updated face detection confidence")
    image_quality_score: Optional[float] = Field(None, ge=0.0, le=10.0, description="Updated image quality score")

class SelfieValidationResponse(BaseSchema):
    """Schema for selfie validation responses"""
    selfie_id: UUID
    is_approved: bool
    validation_notes: Optional[str] = None
    validated_by: UUID
    validated_at: datetime

class SelfieListResponse(BaseSchema):
    """Schema for listing selfies with minimal data"""
    id: UUID
    application_id: UUID
    customer_name: Optional[str] = None
    selfie_type: SelfieType
    captured_at: datetime
    captured_by: Optional[UserResponse] = None
    status: str
    is_validated: bool
    thumbnail_url: Optional[str] = None

    @classmethod
    def from_orm(cls, selfie):
        """Create SelfieListResponse from Selfie model"""
        return cls(
            id=selfie.id,
            application_id=selfie.application_id,
            customer_name=selfie.customer_name,
            selfie_type=selfie.selfie_type,
            captured_at=selfie.captured_at,
            captured_by=UserResponse.from_orm(selfie.captured_by) if hasattr(selfie, 'captured_by') and selfie.captured_by else None,
            status=selfie.status,
            is_validated=selfie.is_validated,
            thumbnail_url=None  # Would be computed based on file path
        )

class SelfieUploadRequest(BaseSchema):
    """Schema for uploading a selfie file"""
    application_id: UUID = Field(..., description="Related application ID")
    selfie_type: SelfieType = Field(..., description="Type of selfie")
    customer_id_number: Optional[str] = Field(None, max_length=50, description="Customer ID number")
    customer_name: Optional[str] = Field(None, max_length=255, description="Customer name")
    location_latitude: Optional[float] = Field(None, description="Capture location latitude")
    location_longitude: Optional[float] = Field(None, description="Capture location longitude")
    location_address: Optional[str] = Field(None, description="Capture location address")
    notes: Optional[str] = Field(None, max_length=500, description="Additional notes")

class SelfieMetadata(BaseSchema):
    """Schema for selfie metadata"""
    selfie_type: SelfieType = Field(..., description="Type of selfie")
    captured_at: datetime = Field(..., description="When selfie was captured")
    captured_by_user_id: UUID = Field(..., description="User who captured the selfie")
    customer_id_number: Optional[str] = Field(None, max_length=50, description="Customer ID number")
    customer_name: Optional[str] = Field(None, max_length=255, description="Customer name")
    location_latitude: Optional[float] = Field(None, description="Capture location latitude")
    location_longitude: Optional[float] = Field(None, description="Capture location longitude")
    location_address: Optional[str] = Field(None, description="Capture location address")
    face_detection_confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="AI face detection confidence")
    image_quality_score: Optional[float] = Field(None, ge=0.0, le=10.0, description="Image quality score")
    is_validated: bool = Field(default=False, description="Whether selfie has been validated")
    validation_notes: Optional[str] = Field(None, description="Validation notes")
    notes: Optional[str] = Field(None, description="General notes")

# Permission System Schemas
class PermissionBase(BaseSchema):
    """Base permission schema."""
    name: str = Field(..., min_length=1, max_length=100, description="Permission name")
    description: str = Field(..., min_length=1, max_length=500, description="Permission description")
    resource_type: str = Field(..., description="Type of resource this permission applies to")
    action: str = Field(..., description="Action that can be performed")
    scope: str = Field(default="own", description="Scope of the permission")
    conditions: Optional[Dict[str, Any]] = Field(None, description="Additional conditions for permission")

class PermissionCreate(PermissionBase):
    """Schema for creating a permission."""
    pass

class PermissionUpdate(BaseSchema):
    """Schema for updating a permission."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Updated permission name")
    description: Optional[str] = Field(None, min_length=1, max_length=500, description="Updated description")
    is_active: Optional[bool] = Field(None, description="Updated active status")
    conditions: Optional[Dict[str, Any]] = Field(None, description="Updated conditions")

class PermissionResponse(PermissionBase):
    """Schema for permission responses."""
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

class RoleBase(BaseSchema):
    """Base role schema."""
    name: str = Field(..., min_length=1, max_length=100, description="Role name")
    description: str = Field(..., min_length=1, max_length=500, description="Role description")
    is_active: bool = Field(default=True, description="Whether role is active")

class RoleCreate(RoleBase):
    """Schema for creating a role."""
    pass

class RoleUpdate(BaseSchema):
    """Schema for updating a role."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Updated role name")
    description: Optional[str] = Field(None, min_length=1, max_length=500, description="Updated description")
    is_active: Optional[bool] = Field(None, description="Updated active status")

class RoleResponse(RoleBase):
    """Schema for role responses."""
    id: UUID
    created_at: datetime
    updated_at: datetime

class RoleAssignmentCreate(BaseSchema):
    """Schema for role assignments."""
    user_id: UUID = Field(..., description="User ID to assign role to")
    role_id: UUID = Field(..., description="Role ID to assign")

class UserPermissionCreate(BaseSchema):
    """Schema for user permission assignments."""
    user_id: UUID = Field(..., description="User ID to assign permission to")
    permission_id: UUID = Field(..., description="Permission ID to assign")

class UserPermissionResponse(BaseSchema):
    """Schema for user permission responses."""
    id: UUID
    user_id: UUID
    permission_id: UUID
    created_at: datetime

class PermissionTemplateCreate(BaseSchema):
    """Schema for permission template creation."""
    name: str = Field(..., min_length=1, max_length=100, description="Template name")
    description: str = Field(..., min_length=1, max_length=500, description="Template description")
    permissions: List[UUID] = Field(..., min_items=1, description="List of permission IDs")

class PermissionTemplateResponse(BaseSchema):
    """Schema for permission template responses."""
    id: UUID
    name: str
    description: str
    permissions: List[PermissionResponse]
    created_at: datetime
    updated_at: datetime

class PermissionMatrixResponse(BaseSchema):
    """Schema for permission matrix responses."""
    users: List[Dict[str, Any]]
    permissions: List[PermissionResponse]
    matrix: List[List[bool]]

class BulkRoleAssignment(BaseSchema):
    """Schema for bulk role assignments."""
    user_ids: List[UUID] = Field(..., min_items=1, description="List of user IDs")
    role_id: UUID = Field(..., description="Role ID to assign")

# Enum Schemas for Application Data
class IDCardTypeOption(BaseSchema):
    """Schema for ID card type options"""
    value: str = Field(..., description="ID card type value")
    label: str = Field(..., description="Display label")

class LoanStatusOption(BaseSchema):
    """Schema for loan status options"""
    value: str = Field(..., description="Loan status value")
    label: str = Field(..., description="Display label")

class LoanPurposeOption(BaseSchema):
    """Schema for loan purpose options"""
    value: str = Field(..., description="Loan purpose value")
    label: str = Field(..., description="Display label")

class ProductTypeOption(BaseSchema):
    """Schema for product type options"""
    value: str = Field(..., description="Product type value")
    label: str = Field(..., description="Display label")

class RiskCategoryOption(BaseSchema):
    """Schema for risk category options"""
    value: str = Field(..., description="Risk category value")
    label: str = Field(..., description="Display label")

class PriorityLevelOption(BaseSchema):
    """Schema for priority level options"""
    value: str = Field(..., description="Priority level value")
    label: str = Field(..., description="Display label")

class ApplicationStatusOption(BaseSchema):
    """Schema for application status options"""
    value: str = Field(..., description="Application status value")
    label: str = Field(..., description="Display label")

class EnumOptionsResponse(BaseSchema):
    """Schema for all enum options response"""
    idCardTypes: List[IDCardTypeOption]
    loanStatuses: List[LoanStatusOption]
    loanPurposes: List[LoanPurposeOption]
    productTypes: List[ProductTypeOption]
    riskCategories: List[RiskCategoryOption]
    priorityLevels: List[PriorityLevelOption]
    applicationStatuses: List[ApplicationStatusOption]

# Dashboard Schemas
class ApplicationStats(BaseSchema):
    """Schema for application statistics"""
    total: int = Field(default=0, description="Total number of applications")
    draft: int = Field(default=0, description="Number of draft applications")
    submitted: int = Field(default=0, description="Number of submitted applications")
    pending: int = Field(default=0, description="Number of pending applications")
    under_review: int = Field(default=0, description="Number of applications under review")
    approved: int = Field(default=0, description="Number of approved applications")
    rejected: int = Field(default=0, description="Number of rejected applications")

class UserStats(BaseSchema):
    """Schema for user statistics"""
    total: int = Field(default=0, description="Total number of users")
    active: int = Field(default=0, description="Number of active users")
    inactive: int = Field(default=0, description="Number of inactive users")
    admins: int = Field(default=0, description="Number of admin users")
    managers: int = Field(default=0, description="Number of manager users")
    officers: int = Field(default=0, description="Number of officer users")
    viewers: int = Field(default=0, description="Number of viewer users")

class DepartmentStats(BaseSchema):
    """Schema for department statistics"""
    total: int = Field(default=0, description="Total number of departments")
    active: int = Field(default=0, description="Number of active departments")

class BranchStats(BaseSchema):
    """Schema for branch statistics"""
    total: int = Field(default=0, description="Total number of branches")
    active: int = Field(default=0, description="Number of active branches")

class FileStats(BaseSchema):
    """Schema for file statistics"""
    total: int = Field(default=0, description="Total number of files")
    total_size: int = Field(default=0, description="Total size of all files in bytes")

class DashboardStatsResponse(BaseSchema):
    """Schema for comprehensive dashboard statistics"""
    applications: ApplicationStats
    users: UserStats
    departments: DepartmentStats
    branches: BranchStats
    files: FileStats

class RecentApplicationResponse(BaseSchema):
    """Schema for recent application data"""
    id: str = Field(..., description="Application ID")
    full_name_latin: Optional[str] = Field(None, description="Customer name in Latin script")
    full_name_khmer: Optional[str] = Field(None, description="Customer name in Khmer script")
    requested_amount: Optional[float] = Field(None, description="Requested loan amount")
    phone: Optional[str] = Field(None, description="Customer phone number")
    portfolio_officer_name: Optional[str] = Field(None, description="Portfolio officer name")
    product_type: Optional[str] = Field(None, description="Product type")
    status: str = Field(..., description="Application status")
    created_at: str = Field(..., description="Creation timestamp")
    user_id: str = Field(..., description="User ID who created the application")
    account_id: Optional[str] = Field(None, description="Account ID")

class ActivityTimelineResponse(BaseSchema):
    """Schema for activity timeline data"""
    id: str = Field(..., description="Activity ID")
    type: str = Field(..., description="Type of activity (application, user)")
    action: str = Field(..., description="Action performed")
    title: str = Field(..., description="Activity title")
    description: str = Field(..., description="Activity description")
    status: str = Field(..., description="Current status")
    timestamp: str = Field(..., description="Activity timestamp")
    user_id: str = Field(..., description="User ID associated with the activity")

class PerformanceMetricsResponse(BaseSchema):
    """Schema for performance metrics"""
    applications_processed_30d: int = Field(default=0, description="Applications processed in last 30 days")
    average_processing_time_days: float = Field(default=0.0, description="Average processing time in days")
    approval_rate_percentage: float = Field(default=0.0, description="Approval rate as percentage")
    active_users_today: int = Field(default=0, description="Active users today")

class WorkflowTransitionRequest(BaseSchema):
    """Schema for requesting workflow transitions"""
    new_status: WorkflowStatus
    notes: Optional[str] = None
    account_id: Optional[str] = None  # Required for teller processing
    
    @field_validator('account_id')
    @classmethod
    def validate_account_id_for_transition(cls, v, info):
        """Validate account_id is provided for teller transitions"""
        data = info.data if hasattr(info, 'data') else {}
        new_status = data.get('new_status')
        
        if new_status == WorkflowStatus.MANAGER_REVIEW and not v:
            raise ValueError('Account ID is required when transitioning to manager review')
        
        if v:
            # Allow 6-digit numeric IDs from external systems
            if re.match(r'^\d{6}$', v):
                if v == '000000':
                    raise ValueError('Account ID cannot be all zeros')
                return v.zfill(6)
            # Allow UUID format
            elif re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', v, re.IGNORECASE):
                return v
            # Allow 8-20 alphanumeric
            elif not re.match(r'^[A-Za-z0-9]{8,20}$', v):
                raise ValueError('Account ID must be 6-digit numeric, 8-20 alphanumeric characters, or UUID format')
            
        return v

class WorkflowStatusInfo(BaseSchema):
    """Schema for workflow status information"""
    current_status: WorkflowStatus
    can_edit_form: bool
    can_transition: bool
    next_possible_stages: List[WorkflowStatus]
    requires_account_id: bool
    stage_description: str
    
class ApplicationWorkflowResponse(CustomerApplicationResponse):
    """Extended response with workflow information"""
    workflow_info: WorkflowStatusInfo
    po_creator: Optional[UserResponse] = None
    user_completer: Optional[UserResponse] = None
    teller_processor: Optional[UserResponse] = None
    manager_reviewer: Optional[UserResponse] = None

# Permission schemas will be imported directly where needed

class ApprovalRequest(BaseSchema):
    """Schema for manager approval payload"""
    approved_amount: Optional[float] = Field(None, description="Approved loan amount")
    approved_interest_rate: Optional[float] = Field(None, description="Approved interest rate")
    approved_loan_term: Optional[str] = Field(None, description="Approved loan term override")

# --- Resolve forward references after all models are defined ---
# List all models that need rebuilding to resolve forward references
_models_to_rebuild = [
    UserBase, UserCreate, UserUpdate, UserResponse, UserLogin, 
    UserStatusChange, UserStatusChangeResponse,
    BulkStatusUpdate, BulkStatusUpdateResponse, BulkOperationResponse,
    CSVImportRequest, CSVImportResponse, CSVImportRowResult,
    PositionBase, PositionCreate, PositionUpdate, PositionResponse,
    DepartmentBase, DepartmentCreate, DepartmentUpdate, DepartmentResponse,
    BranchBase, BranchCreate, BranchUpdate, BranchResponse,
    CustomerApplicationBase, CustomerApplicationCreate, CustomerApplicationUpdate, CustomerApplicationResponse,
    WorkflowTransitionRequest, WorkflowStatusInfo, ApplicationWorkflowResponse,
    TokenResponse, PaginatedResponse,
    FolderBase, FolderCreate, FolderUpdate, FolderResponse,
    FileBase, FileCreate, FileResponse, FileFinalize, FileUploadRequest,
    SelfieListResponse, ApprovalRequest
]

# Rebuild models to resolve forward references
for model in _models_to_rebuild:
    try:
        model.model_rebuild()
    except Exception as e:
        import warnings
        warnings.warn(f"Could not rebuild {model.__name__}: {e}")