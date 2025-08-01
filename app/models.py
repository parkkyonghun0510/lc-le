from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey, Numeric, Date, JSON, BigInteger, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone_number = Column(String(20))
    role = Column(String(20), nullable=False, default='officer')
    status = Column(String(20), nullable=False, default='active')
    department_id = Column(UUID(as_uuid=True), ForeignKey('departments.id'))
    branch_id = Column(UUID(as_uuid=True), ForeignKey('branches.id'))
    profile_image_url = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True))
    
    # Relationships
    department = relationship("Department", back_populates="users", foreign_keys=[department_id])
    branch = relationship("Branch", back_populates="users", foreign_keys=[branch_id])
    applications = relationship("CustomerApplication", back_populates="user", foreign_keys="CustomerApplication.user_id")
    uploaded_files = relationship("File", back_populates="uploaded_by_user")

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    description = Column(Text)
    manager_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    users = relationship("User", back_populates="department", foreign_keys="User.department_id")
    manager = relationship("User", foreign_keys=[manager_id])

class Branch(Base):
    __tablename__ = "branches"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    address = Column(Text, nullable=False)
    phone_number = Column(String(20))
    email = Column(String(255))
    manager_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    latitude = Column(Numeric(10, 8))
    longitude = Column(Numeric(11, 8))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    users = relationship("User", back_populates="branch", foreign_keys="User.branch_id")
    manager = relationship("User", foreign_keys=[manager_id])

class CustomerApplication(Base):
    __tablename__ = "customer_applications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    status = Column(String(20), nullable=False, default='draft')
    
    # Borrower Information
    id_card_type = Column(String(50))  # national_id, passport, family_book
    id_number = Column(String(50))
    full_name_khmer = Column(String(255))
    full_name_latin = Column(String(255))
    phone = Column(String(20))
    date_of_birth = Column(Date)
    portfolio_officer_name = Column(String(255))
    
    # Address Information
    current_address = Column(Text)
    province = Column(String(100))
    district = Column(String(100))
    commune = Column(String(100))
    village = Column(String(100))
    
    # Employment Information
    occupation = Column(String(100))
    employer_name = Column(String(255))
    monthly_income = Column(Numeric(15, 2))
    income_source = Column(String(100))  # salary, business, agriculture, etc.
    
    # Loan Details
    requested_amount = Column(Numeric(15, 2))
    loan_purposes = Column(JSON)  # business, agriculture, education, housing, vehicle, medical, other
    purpose_details = Column(Text)
    product_type = Column(String(50))  # micro_loan, sme_loan, agriculture_loan, housing_loan, education_loan
    desired_loan_term = Column(String(50))  # 6_months, 12_months, etc.
    requested_disbursement_date = Column(Date)
    interest_rate = Column(Numeric(5, 2))  # Annual percentage rate
    
    # Guarantor Information
    guarantor_name = Column(String(255))
    guarantor_phone = Column(String(20))
    guarantor_id_number = Column(String(50))
    guarantor_address = Column(Text)
    guarantor_relationship = Column(String(100))  # family, friend, colleague, etc.
    
    # Financial Information
    existing_loans = Column(JSON)  # Array of existing loan details
    monthly_expenses = Column(Numeric(15, 2))
    assets_value = Column(Numeric(15, 2))
    
    # Risk Assessment
    credit_score = Column(Integer)
    risk_category = Column(String(20))  # low, medium, high
    assessment_notes = Column(Text)
    
    # Additional data
    collaterals = Column(JSON)  # Array of collateral details
    documents = Column(JSON)  # Array of document references
    
    # Workflow tracking
    workflow_stage = Column(String(50))  # initial_review, credit_check, approval_pending, etc.
    assigned_reviewer = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    priority_level = Column(String(20), default='normal')  # low, normal, high, urgent
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    submitted_at = Column(DateTime(timezone=True))
    approved_at = Column(DateTime(timezone=True))
    approved_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    rejected_at = Column(DateTime(timezone=True))
    rejected_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    rejection_reason = Column(Text)
    
    # Relationships
    user = relationship("User", back_populates="applications", foreign_keys=[user_id])
    approver = relationship("User", foreign_keys=[approved_by])
    rejector = relationship("User", foreign_keys=[rejected_by])
    reviewer = relationship("User", foreign_keys=[assigned_reviewer])

class File(Base):
    __tablename__ = "files"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    file_size = Column(BigInteger, nullable=False)
    mime_type = Column(String(100), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    application_id = Column(UUID(as_uuid=True), ForeignKey('customer_applications.id'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    uploaded_by_user = relationship("User", back_populates="uploaded_files", foreign_keys=[uploaded_by])

class Setting(Base):
    __tablename__ = "settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(JSON, nullable=False)
    category = Column(String(50), nullable=False)  # general, security, notifications, etc.
    description = Column(Text)
    is_public = Column(Boolean, default=False)  # Whether non-admin users can read this setting
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    updated_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])