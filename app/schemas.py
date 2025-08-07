from __future__ import annotations
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

# Base schemas
class BaseSchema(BaseModel):
    model_config = {"from_attributes": True}

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
    employee_id: Optional[str] = Field(None, max_length=4, pattern='^\d{4}$')
    # Position FK (optional for compatibility)
    position_id: Optional[UUID] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    employee_id: Optional[str] = Field(None, max_length=4, pattern='^\d{4}$')

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
    employee_id: Optional[str] = Field(None, max_length=4, pattern='^\d{4}$')
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
    employee_id: Optional[str] = Field(None, max_length=4, pattern='^\d{4}$')
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
    # Borrower Information
    id_card_type: Optional[str] = Field(None, max_length=50)
    id_number: Optional[str] = Field(None, max_length=50)
    full_name_khmer: Optional[str] = Field(None, max_length=255)
    full_name_latin: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    date_of_birth: Optional[str] = None
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
    desired_loan_term: Optional[str] = Field(None, max_length=50)
    requested_disbursement_date: Optional[str] = None
    interest_rate: Optional[float] = None
    
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
    
    # Workflow tracking
    workflow_stage: Optional[str] = Field(None, max_length=50)
    assigned_reviewer: Optional[UUID] = None
    priority_level: Optional[str] = Field(default='normal', max_length=20)

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
    created_at: datetime

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
    size: int = Field(default=10, ge=1, le=100)

class PaginatedResponse(BaseSchema):
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int