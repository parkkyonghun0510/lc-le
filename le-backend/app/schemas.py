from __future__ import annotations
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import json
import re
from uuid import UUID
from enum import Enum
from .workflow import WorkflowStatus, WorkflowStatusUpdate, WorkflowStatusResponse

# Base schemas
class BaseSchema(BaseModel):
    model_config = {"from_attributes": True, "extra": "ignore"}

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
    is_active: Optional[bool] = None
    department_id: Optional[UUID] = None
    branch_id: Optional[UUID] = None
    profile_image_url: Optional[str] = None
    employee_id: Optional[str] = Field(None, max_length=4, pattern=r'^\d{4}$')
    position_id: Optional[UUID] = None

# Position schemas
class PositionBase(BaseSchema):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None

class PositionCreate(PositionBase):
    is_active: bool = True

class PositionUpdate(BaseSchema):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None

class Position(PositionBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime]
    employee_id: Optional[str] = Field(None, max_length=4, pattern=r'^\d{4}$')
    department: Optional['DepartmentResponse'] = None
    branch: Optional['BranchResponse'] = None
    # Replace prior string placeholder with nested position
    position: Optional['Position'] = None

class UserLogin(BaseSchema):
    username: str
    password: str

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

class FileFinalize(BaseSchema):
    object_name: str
    original_filename: str
    application_id: Optional[UUID] = None
    folder_id: Optional[UUID] = None

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

# Selfie capture and validation schemas for Flutter app
class SelfieType(str, Enum):
    CUSTOMER_PROFILE = "customer_profile"
    CUSTOMER_WITH_OFFICER = "customer_with_officer"
    ID_VERIFICATION = "id_verification"
    LOCATION_VERIFICATION = "location_verification"

class SelfieUploadRequest(BaseSchema):
    application_id: UUID
    selfie_type: SelfieType
    customer_id_number: Optional[str] = Field(None, max_length=50)
    customer_name: Optional[str] = Field(None, max_length=255)
    location_latitude: Optional[float] = None
    location_longitude: Optional[float] = None
    location_address: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=500)
    
class SelfieMetadata(BaseSchema):
    selfie_type: SelfieType
    captured_at: datetime
    captured_by_user_id: UUID
    customer_id_number: Optional[str] = None
    customer_name: Optional[str] = None
    location_latitude: Optional[float] = None
    location_longitude: Optional[float] = None
    location_address: Optional[str] = None
    face_detection_confidence: Optional[float] = None
    image_quality_score: Optional[float] = None
    is_validated: bool = False
    validation_notes: Optional[str] = None
    notes: Optional[str] = None

class SelfieResponse(BaseSchema):
    id: UUID
    application_id: UUID
    file_path: str
    original_filename: str
    selfie_type: SelfieType
    metadata: SelfieMetadata
    created_at: datetime
    status: str = "pending_validation"  # pending_validation, validated, rejected

class SelfieValidationRequest(BaseSchema):
    selfie_id: UUID
    is_approved: bool
    validation_notes: Optional[str] = Field(None, max_length=500)
    face_detection_confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    image_quality_score: Optional[float] = Field(None, ge=0.0, le=10.0)

class SelfieValidationResponse(BaseSchema):
    selfie_id: UUID
    is_approved: bool
    validation_notes: Optional[str] = None
    validated_by: UUID
    validated_at: datetime
    
class SelfieListResponse(BaseSchema):
    id: UUID
    application_id: UUID
    customer_name: Optional[str] = None
    selfie_type: SelfieType
    captured_at: datetime
    captured_by: UserResponse
    status: str
    thumbnail_url: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def _coerce_term_by_product_type(cls, data):
        """If desired_loan_term is a number, coerce it to the appropriate canonical
        string based on product_type period units.
        - monthly_loan: n -> n_months
        - weekly_loan: n -> n_weeks
        - biweekly_loan: n -> (n*2)_weeks
        - daily_loan: n -> n_days
        - default/unknown: treat as months
        """
        try:
            if isinstance(data, dict):
                term = data.get("desired_loan_term")
                product_type = data.get("product_type")
                if isinstance(term, (int, float)):
                    n = int(term)
                    if n <= 0:
                        raise ValueError("desired_loan_term must be a positive number of periods")
                    if product_type == "monthly_loan":
                        data["desired_loan_term"] = f"{n}_months"
                    elif product_type == "weekly_loan":
                        data["desired_loan_term"] = f"{n}_weeks"
                    elif product_type == "biweekly_loan":
                        data["desired_loan_term"] = f"{n * 2}_weeks"
                    elif product_type == "daily_loan":
                        data["desired_loan_term"] = f"{n}_days"
                    else:
                        # Fallback to months if product_type is missing or unknown
                        data["desired_loan_term"] = f"{n}_months"
        except Exception:
            # Let field validators raise precise errors later
            pass
        return data

# Workflow-specific schemas
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