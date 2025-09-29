from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey, Numeric, Date, JSON, BigInteger, Integer, Index
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
    employee_id = Column(String(4), unique=True, nullable=True, comment='4-digit HR employee ID')
    role = Column(String(20), nullable=False, default='officer')
    status = Column(String(20), nullable=False, default='active')
    # Enhanced status management fields
    status_reason = Column(String(100), nullable=True, comment='Reason for current status')
    status_changed_at = Column(DateTime(timezone=True), nullable=True, comment='When status was last changed')
    status_changed_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True, comment='User who changed the status')
    # Activity tracking fields
    last_activity_at = Column(DateTime(timezone=True), nullable=True, comment='Last recorded user activity')
    login_count = Column(Integer, default=0, comment='Total number of logins')
    failed_login_attempts = Column(Integer, default=0, comment='Consecutive failed login attempts')
    # Lifecycle management fields
    onboarding_completed = Column(Boolean, default=False, comment='Whether user onboarding is complete')
    onboarding_completed_at = Column(DateTime(timezone=True), nullable=True, comment='When onboarding was completed')
    department_id = Column(UUID(as_uuid=True), ForeignKey('departments.id'))
    branch_id = Column(UUID(as_uuid=True), ForeignKey('branches.id'))
    # New: position reference (nullable, indexed via migration)
    position_id = Column(UUID(as_uuid=True), ForeignKey('positions.id'), nullable=True)
    # New: portfolio and line manager references
    portfolio_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    line_manager_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    profile_image_url = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True))
    
    # Relationships
    department = relationship("Department", back_populates="users", foreign_keys=[department_id])
    branch = relationship("Branch", back_populates="users", foreign_keys=[branch_id])
    position = relationship("Position", back_populates="users", foreign_keys=[position_id])
    # Portfolio and line manager relationships
    portfolio = relationship("User", remote_side="User.id", foreign_keys=[portfolio_id])
    line_manager = relationship("User", remote_side="User.id", foreign_keys=[line_manager_id])
    # Status change tracking relationship
    status_changed_by_user = relationship("User", remote_side="User.id", foreign_keys=[status_changed_by])
    # Reverse relationships for portfolio and line management
    portfolio_members = relationship("User", foreign_keys="User.portfolio_id", back_populates="portfolio")
    direct_reports = relationship("User", foreign_keys="User.line_manager_id", back_populates="line_manager")
    applications = relationship("CustomerApplication", back_populates="user", foreign_keys="CustomerApplication.user_id")
    uploaded_files = relationship("File", back_populates="uploaded_by_user")
    
    # Permission system relationships
    user_roles = relationship("UserRole", foreign_keys="UserRole.user_id", cascade="all, delete-orphan")
    user_permissions = relationship("UserPermission", foreign_keys="UserPermission.user_id", cascade="all, delete-orphan")

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
    # External/customer account grouping identifier
    account_id = Column(String(100))
    
    # Borrower Information
    id_card_type = Column(String(50))  # national_id, passport, family_book
    id_number = Column(String(50))
    full_name_khmer = Column(String(255))
    full_name_latin = Column(String(255))
    phone = Column(String(20))
    date_of_birth = Column(Date)
    sex = Column(String(20))  # male, female, other
    marital_status = Column(String(20))  # single, married, divorced, widowed, separated
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
    
    # Loan Details - Consolidated fields for clarity
    requested_amount = Column(Numeric(15, 2), comment='Initial requested amount (consolidated from loan_amount)')
    loan_purposes = Column(JSON, comment='Multiple loan purposes as JSON array')
    purpose_details = Column(Text, comment='Detailed description of loan purposes')
    product_type = Column(String(50), comment='Type of loan product')
    desired_loan_term = Column(Integer, comment='Requested loan term in months')
    requested_disbursement_date = Column(Date, comment='When customer wants the loan disbursed')
    interest_rate = Column(Numeric(5, 2), comment='Annual percentage rate')

    # Additional loan fields from frontend - consolidated into requested_amount above
    # loan_amount field removed - use requested_amount instead
    loan_status = Column(String(20), comment='Current status of the loan application')
    loan_purpose = Column(String(255), comment='Primary loan purpose description')
    loan_start_date = Column(Date)  # Actual disbursement date
    loan_end_date = Column(Date)  # Loan maturity date
    
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
    
    # Photo/Document paths from frontend
    profile_image = Column(Text)  # Customer profile photo URL
    borrower_nid_photo_path = Column(Text)
    borrower_home_or_land_photo_path = Column(Text)
    borrower_business_photo_path = Column(Text)
    guarantor_nid_photo_path = Column(Text)
    guarantor_home_or_land_photo_path = Column(Text)
    guarantor_business_photo_path = Column(Text)
    profile_photo_path = Column(Text)
    
    # Workflow tracking
    workflow_stage = Column(String(50))  # initial_review, credit_check, approval_pending, etc.
    assigned_reviewer = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    priority_level = Column(String(20), default='normal')  # low, normal, high, urgent
    
    # Role-based workflow stages
    workflow_status = Column(String(50), default='po_created')  # po_created, user_completed, teller_processing, manager_review, approved, rejected
    po_created_at = Column(DateTime(timezone=True))  # When PO creates the form
    po_created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))  # PO who created the form
    user_completed_at = Column(DateTime(timezone=True))  # When User completes the form
    user_completed_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))  # User who completed the form
    teller_processed_at = Column(DateTime(timezone=True))  # When Teller processes account_id
    teller_processed_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))  # Teller who processed
    manager_reviewed_at = Column(DateTime(timezone=True))  # When Manager performs final approval
    manager_reviewed_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))  # Manager who reviewed
    
    # Account ID validation tracking
    account_id_validated = Column(Boolean, default=False)  # Whether account_id has been validated by Teller
    account_id_validation_notes = Column(Text)  # Teller's notes on account_id validation
    
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
    
    # Role-based workflow relationships
    po_creator = relationship("User", foreign_keys=[po_created_by])
    user_completer = relationship("User", foreign_keys=[user_completed_by])
    teller_processor = relationship("User", foreign_keys=[teller_processed_by])
    manager_reviewer = relationship("User", foreign_keys=[manager_reviewed_by])
    # Application-linked resources
    files = relationship(
        "File",
        primaryjoin="CustomerApplication.id==File.application_id",
        viewonly=True,
        lazy="selectin",
    )
    folders = relationship(
        "Folder",
        primaryjoin="CustomerApplication.id==Folder.application_id",
        viewonly=True,
        lazy="selectin",
    )

class File(Base):
    __tablename__ = "files"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=True)
    file_path = Column(Text, nullable=False)
    file_size = Column(BigInteger, nullable=False)
    mime_type = Column(String(100), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    application_id = Column(UUID(as_uuid=True), ForeignKey('customer_applications.id'))
    folder_id = Column(UUID(as_uuid=True), ForeignKey('folders.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    uploaded_by_user = relationship("User", back_populates="uploaded_files", foreign_keys=[uploaded_by])
    folder = relationship("Folder", back_populates="files", foreign_keys=[folder_id])
    application = relationship("CustomerApplication", foreign_keys=[application_id])

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

class Position(Base):
    __tablename__ = "positions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    users = relationship("User", back_populates="position")


class Folder(Base):
    __tablename__ = "folders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey('folders.id'), nullable=True)
    application_id = Column(UUID(as_uuid=True), ForeignKey('customer_applications.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    parent = relationship("Folder", remote_side=[id], backref="children")
    files = relationship("File", back_populates="folder")
    application = relationship("CustomerApplication", foreign_keys=[application_id])

class Selfie(Base):
    __tablename__ = "selfies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey('customer_applications.id'), nullable=False)
    file_id = Column(UUID(as_uuid=True), ForeignKey('files.id'), nullable=False)
    
    # Selfie metadata
    selfie_type = Column(String(50), nullable=False)  # customer_profile, customer_with_officer, id_verification, location_verification
    captured_at = Column(DateTime(timezone=True), server_default=func.now())
    captured_by_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Customer information
    customer_id_number = Column(String(50))
    customer_name = Column(String(255))
    
    # Location data
    location_latitude = Column(Numeric(10, 8))
    location_longitude = Column(Numeric(11, 8))
    location_address = Column(Text)
    
    # AI/ML validation fields
    face_detection_confidence = Column(Numeric(5, 4))  # 0.0000 to 1.0000
    image_quality_score = Column(Numeric(4, 2))  # 0.00 to 10.00
    
    # Validation status
    status = Column(String(20), nullable=False, default='pending_validation')  # pending_validation, validated, rejected
    is_validated = Column(Boolean, default=False)
    validated_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    validated_at = Column(DateTime(timezone=True))
    validation_notes = Column(Text)
    
    # General notes
    notes = Column(Text)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    application = relationship("CustomerApplication", foreign_keys=[application_id])
    file = relationship("File", foreign_keys=[file_id])
    captured_by = relationship("User", foreign_keys=[captured_by_user_id])
    validator = relationship("User", foreign_keys=[validated_by])

class BulkOperation(Base):
    __tablename__ = "bulk_operations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    operation_type = Column(String(50), nullable=False)  # status_update, import, export
    performed_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    target_criteria = Column(JSON)  # Filters used to select records
    changes_applied = Column(JSON)  # What changes were made
    total_records = Column(Integer, default=0)
    successful_records = Column(Integer, default=0)
    failed_records = Column(Integer, default=0)
    error_details = Column(JSON)
    status = Column(String(20), default='pending')  # pending, processing, completed, failed
    file_path = Column(String(500))  # For import/export files
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    # Relationships
    performer = relationship("User", foreign_keys=[performed_by])