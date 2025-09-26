from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, desc, func, case
from sqlalchemy.orm import selectinload, joinedload
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, date, timezone, timedelta

from app.database import get_db
from app.models import CustomerApplication, User, Department, Branch
from app.schemas import (
    CustomerApplicationCreate,
    CustomerApplicationUpdate,
    CustomerApplicationResponse,
    PaginatedResponse,
    RejectionRequest,
    BaseSchema,
    WorkflowTransitionRequest,
    WorkflowStatusInfo,
    ApplicationWorkflowResponse,
)
from app.workflow import WorkflowValidator, WorkflowStatus
from app.routers.auth import get_current_user
from datetime import timezone

from app.services.minio_service import minio_service

DEFAULT_MINIO_URL_EXPIRES = 3600  # 1 hour

def enrich_documents_with_minio_urls(documents: Optional[List[Dict[str, Any]]], expires: int = DEFAULT_MINIO_URL_EXPIRES) -> Optional[List[Dict[str, Any]]]:
    if not documents:
        return documents
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=expires)
    for doc in documents:
        object_name = doc.get("object_name")
        if object_name:
            try:
                doc["url"] = minio_service.get_file_url(object_name, expires=expires)
                doc["expires_at"] = expires_at
            except Exception:
                doc["url"] = None
                doc["expires_at"] = None
        else:
            doc["url"] = None
            doc["expires_at"] = None
        preview_object_name = doc.get("preview_object_name") or doc.get("thumbnail_object_name") or doc.get("thumbnail")
        if preview_object_name:
            try:
                doc["preview_url"] = minio_service.get_file_url(preview_object_name, expires=expires)
            except Exception:
                doc["preview_url"] = None
        else:
            doc["preview_url"] = None
    return documents

def enrich_application_response(app_data: Any, expires: int = DEFAULT_MINIO_URL_EXPIRES):
    # app_data can be a dict, pydantic model, or list thereof
    if isinstance(app_data, list):
        for item in app_data:
            enrich_application_response(item, expires)
        return app_data
    if hasattr(app_data, "documents"):
        docs = getattr(app_data, "documents", None)
        enriched = enrich_documents_with_minio_urls(docs, expires)
        setattr(app_data, "documents", enriched)
    elif isinstance(app_data, dict) and "documents" in app_data:
        app_data["documents"] = enrich_documents_with_minio_urls(app_data.get("documents"), expires)
    return app_data

router = APIRouter()

@router.post("/", response_model=CustomerApplicationResponse)
async def create_application(
    application: CustomerApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> CustomerApplicationResponse:
    db_application = CustomerApplication(
        **application.model_dump(exclude_unset=True),
        user_id=current_user.id,
        workflow_status=WorkflowStatus.PO_CREATED,
        po_created_at=datetime.now(timezone.utc),
        po_created_by=current_user.id
    )
    db.add(db_application)
    await db.commit()
    await db.refresh(db_application)
    resp = CustomerApplicationResponse.model_validate(db_application)
    enrich_application_response(resp)
    return resp

@router.get("/", response_model=PaginatedResponse)
async def list_applications(
    status: Optional[str] = Query(None, description="Filter by status"),
    account_id: Optional[str] = Query(None, description="Filter by account id"),
    search: Optional[str] = Query(None, description="Search in name or ID"),
    risk_category: Optional[str] = Query(None, description="Filter by risk category"),
    product_type: Optional[str] = Query(None, description="Filter by product type"),
    amount_min: Optional[float] = Query(None, description="Minimum loan amount"),
    amount_max: Optional[float] = Query(None, description="Maximum loan amount"),
    date_from: Optional[date] = Query(None, description="Filter from date"),
    date_to: Optional[date] = Query(None, description="Filter to date"),
    assigned_reviewer: Optional[UUID] = Query(None, description="Filter by assigned reviewer"),
    priority_level: Optional[str] = Query(None, description="Filter by priority level"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> PaginatedResponse:
    # Base query with relationships
    query = select(CustomerApplication).options(
        selectinload(CustomerApplication.user),
        selectinload(CustomerApplication.approver),
        selectinload(CustomerApplication.rejector),
        selectinload(CustomerApplication.reviewer)
    )
    
    # Apply filters based on user role - optimized to avoid subqueries
    if current_user.role == "officer":
        query = query.where(CustomerApplication.user_id == current_user.id)
    elif current_user.role == "manager":
        # Managers can see applications from their department/branch - use joins instead of subqueries
        if current_user.department_id:
            query = query.join(User, CustomerApplication.user_id == User.id).where(
                User.department_id == current_user.department_id
            )
        elif current_user.branch_id:
            query = query.join(User, CustomerApplication.user_id == User.id).where(
                User.branch_id == current_user.branch_id
            )
    # Admins can see all applications
    
    # Apply filters
    if status:
        query = query.where(CustomerApplication.status == status)
    
    if risk_category:
        query = query.where(CustomerApplication.risk_category == risk_category)
    
    if product_type:
        query = query.where(CustomerApplication.product_type == product_type)
    if account_id:
        query = query.where(CustomerApplication.account_id == account_id)
    
    if amount_min is not None:
        query = query.where(CustomerApplication.requested_amount >= amount_min)
    
    if amount_max is not None:
        query = query.where(CustomerApplication.requested_amount <= amount_max)
    
    if date_from:
        query = query.where(CustomerApplication.created_at >= date_from)
    
    if date_to:
        query = query.where(CustomerApplication.created_at <= date_to)
    
    if assigned_reviewer:
        query = query.where(CustomerApplication.assigned_reviewer == assigned_reviewer)
    
    if priority_level:
        query = query.where(CustomerApplication.priority_level == priority_level)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                CustomerApplication.full_name_khmer.ilike(search_term),
                CustomerApplication.full_name_latin.ilike(search_term),
                CustomerApplication.id_number.ilike(search_term),
                CustomerApplication.phone.ilike(search_term),
                CustomerApplication.portfolio_officer_name.ilike(search_term)
            )
        )
    
    # Count total - optimized to avoid subquery
    count_query = query.with_only_columns(func.count(CustomerApplication.id))
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination and ordering
    offset = (page - 1) * size
    query = query.order_by(
        desc(CustomerApplication.priority_level == 'urgent'),
        desc(CustomerApplication.priority_level == 'high'),
        desc(CustomerApplication.created_at)
    ).offset(offset).limit(size)
    
    result = await db.execute(query)
    applications = result.scalars().all()
    
    return PaginatedResponse(
        items=[
            enrich_application_response(CustomerApplicationResponse.model_validate(app))
            for app in applications
        ],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size
    )

@router.get("/cards", response_model=PaginatedResponse)
async def get_customer_cards(
    status: Optional[str] = Query(None, description="Filter by status"),
    loan_status: Optional[str] = Query(None, description="Filter by loan status"),
    search: Optional[str] = Query(None, description="Search in name or ID"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> PaginatedResponse:
    """Get customer cards optimized for UI display"""
    from app.schemas import CustomerCardResponse
    
    # Base query with relationships
    query = select(CustomerApplication).options(
        selectinload(CustomerApplication.user)
    )
    
    # Apply role-based filtering - optimized to avoid subqueries
    if current_user.role == "officer":
        query = query.where(CustomerApplication.user_id == current_user.id)
    elif current_user.role == "manager":
        if current_user.department_id:
            query = query.join(User, CustomerApplication.user_id == User.id).where(
                User.department_id == current_user.department_id
            )
        elif current_user.branch_id:
            query = query.join(User, CustomerApplication.user_id == User.id).where(
                User.branch_id == current_user.branch_id
            )
    
    # Apply filters
    if status:
        query = query.where(CustomerApplication.status == status)
    
    if loan_status:
        query = query.where(CustomerApplication.loan_status == loan_status)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                CustomerApplication.full_name_khmer.ilike(search_term),
                CustomerApplication.full_name_latin.ilike(search_term),
                CustomerApplication.id_number.ilike(search_term),
                CustomerApplication.phone.ilike(search_term),
                CustomerApplication.portfolio_officer_name.ilike(search_term)
            )
        )
    
    # Count total - optimized to avoid subquery
    count_query = query.with_only_columns(func.count(CustomerApplication.id))
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination and ordering
    offset = (page - 1) * size
    query = query.order_by(
        desc(CustomerApplication.priority_level == 'urgent'),
        desc(CustomerApplication.priority_level == 'high'),
        desc(CustomerApplication.created_at)
    ).offset(offset).limit(size)
    
    result = await db.execute(query)
    applications = result.scalars().all()
    
    # Transform to CustomerCardResponse
    cards = []
    for app in applications:
        # Compute display name
        display_name = app.full_name_latin or app.full_name_khmer or f"Customer {app.id_number or 'Unknown'}"
        
        # Compute status color
        status_color = _get_status_color(app.status, app.loan_status)
        
        card_data = {
            "id": app.id,
            "display_name": display_name,
            "id_number": app.id_number,
            "phone": app.phone,
            "loan_status": app.loan_status,
            "status": app.status,
            "loan_amount": float(app.loan_amount) if app.loan_amount else None,
            "requested_amount": float(app.requested_amount) if app.requested_amount else None,
            "interest_rate": float(app.interest_rate) if app.interest_rate else None,
            "loan_start_date": app.loan_start_date,
            "loan_end_date": app.loan_end_date,
            "loan_purposes": app.loan_purposes,
            "product_type": app.product_type,
            "desired_loan_term": app.desired_loan_term,
            "portfolio_officer_name": app.portfolio_officer_name,
            "risk_category": app.risk_category,
            "priority_level": app.priority_level,
            "profile_image": app.profile_image,
            "profile_photo_path": app.profile_photo_path,
            "status_color": status_color,
            "created_at": app.created_at,
            "updated_at": app.updated_at,
            "submitted_at": app.submitted_at,
            "approved_at": app.approved_at,
            "sync_status": "synced",
            "guarantor_name": app.guarantor_name
        }
        
        cards.append(CustomerCardResponse(**card_data))
    
    return PaginatedResponse(
        items=cards,
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size
    )

@router.get("/{application_id}", response_model=CustomerApplicationResponse)
async def get_application(
    application_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> CustomerApplicationResponse:
    result = await db.execute(
        select(CustomerApplication)
        .options(
            selectinload(CustomerApplication.user).selectinload(User.department),
            selectinload(CustomerApplication.user).selectinload(User.branch),
            selectinload(CustomerApplication.approver),
            selectinload(CustomerApplication.rejector),
            selectinload(CustomerApplication.reviewer)
        )
        .where(CustomerApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Check permissions
    if current_user.role == "officer" and application.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this application"
        )
    elif current_user.role == "manager":
        # Check if application belongs to manager's department/branch
        if current_user.department_id and application.user.department_id != current_user.department_id:
            if current_user.branch_id and application.user.branch_id != current_user.branch_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to access this application"
                )
    
    resp = CustomerApplicationResponse.model_validate(application)
    enrich_application_response(resp)
    return resp

@router.put("/{application_id}", response_model=CustomerApplicationResponse)
async def update_application(
    application_id: UUID,
    application_update: CustomerApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> CustomerApplicationResponse:
    result = await db.execute(
        select(CustomerApplication).where(CustomerApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Check permissions
    if current_user.role not in ["admin", "manager"] and application.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this application"
        )
    
    # Update fields
    update_data = application_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(application, field, value)
    
    # Handle workflow transitions based on user role and current status
    if current_user.role == "user" and application.workflow_status == WorkflowStatus.PO_CREATED:
        # User completing the form details
        application.workflow_status = WorkflowStatus.USER_COMPLETED
        application.user_completed_at = datetime.now(timezone.utc)
        application.user_completed_by = current_user.id
    elif current_user.role == "teller" and application.workflow_status == WorkflowStatus.USER_COMPLETED:
        # Teller processing and adding account_id
        if "account_id" in update_data:
            account_id = update_data["account_id"]
            
            # Validate account_id format - support 6-digit, 8-digit, UUID, and 8-20 alphanumeric
            if not account_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Account ID is required"
                )
            
            account_id = account_id.strip()
            
            # Use AccountIDService for validation
            from app.services.account_id_service import AccountIDService
            account_service = AccountIDService(db)
            
            try:
                # Validate and standardize the account ID
                validation_result = account_service.validate_and_standardize(account_id, "teller_input")
                
                if not validation_result['is_valid']:
                    error_details = "; ".join(validation_result['validation_notes'])
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid account ID: {error_details}"
                    )
                
                # Check uniqueness
                is_unique, existing_id = await account_service.check_account_id_uniqueness(
                    validation_result['standardized'], 
                    application.id
                )
                
                if not is_unique:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Account ID already exists in application {existing_id}"
                    )
                
                # Update the account_id with standardized format
                update_data["account_id"] = validation_result['standardized']
                
                # Create validation notes
                validation_notes = f"Validated by teller {current_user.username} on {datetime.now(timezone.utc).isoformat()}"
                validation_notes += f" - Format: {validation_result['format']}"
                if validation_result.get('generated_uuid'):
                    validation_notes += f" - Generated UUID: {validation_result['generated_uuid']}"
                validation_notes += f" - Notes: {'; '.join(validation_result['validation_notes'])}"
                
            except Exception as e:
                if isinstance(e, HTTPException):
                    raise e
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Account ID validation failed: {str(e)}"
                )
            
            # Update workflow status and validation flags
            application.workflow_status = WorkflowStatus.TELLER_PROCESSING
            application.teller_processed_at = datetime.now(timezone.utc)
            application.teller_processed_by = current_user.id
            application.account_id_validated = True
            application.account_id_validation_notes = validation_notes
    
    await db.commit()
    await db.refresh(application)
    resp = CustomerApplicationResponse.model_validate(application)
    enrich_application_response(resp)
    return resp

@router.delete("/{application_id}")
async def delete_application(
    application_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(CustomerApplication).where(CustomerApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Check permissions
    if current_user.role not in ["admin", "manager"] and application.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this application"
        )
    
    # Only allow deletion of draft applications to maintain data integrity
    if application.status != 'draft':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft applications can be deleted"
        )
    
    try:
        # Delete related entities in the correct order to avoid foreign key violations
        
        # 1. Delete selfies first (they reference files)
        from app.models import Selfie
        await db.execute(
            select(Selfie).where(Selfie.application_id == application_id)
        )
        selfies_result = await db.execute(
            select(Selfie).where(Selfie.application_id == application_id)
        )
        selfies = selfies_result.scalars().all()
        for selfie in selfies:
            await db.delete(selfie)
        
        # 2. Delete files (they reference folders and applications)
        from app.models import File
        files_result = await db.execute(
            select(File).where(File.application_id == application_id)
        )
        files = files_result.scalars().all()
        for file in files:
            await db.delete(file)
        
        # 3. Delete folders (they reference applications)
        from app.models import Folder
        folders_result = await db.execute(
            select(Folder).where(Folder.application_id == application_id)
        )
        folders = folders_result.scalars().all()
        for folder in folders:
            await db.delete(folder)
        
        # 4. Finally delete the application
        await db.delete(application)
        await db.commit()
        
        return {"message": "Draft application deleted successfully"}
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete application: {str(e)}"
        )

@router.patch("/{application_id}/submit")
async def submit_application(
    application_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> CustomerApplicationResponse:
    result = await db.execute(
        select(CustomerApplication).where(CustomerApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Check permissions
    if application.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to submit this application"
        )
    
    if application.workflow_status != WorkflowStatus.PO_CREATED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application is not in the correct status for submission"
        )
    
    application.workflow_status = WorkflowStatus.USER_COMPLETED
    application.user_completed_at = datetime.now(timezone.utc)
    application.status = "submitted"
    application.submitted_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(application)
    
    resp = CustomerApplicationResponse.model_validate(application)
    enrich_application_response(resp)
    return resp

class ApprovalRequest(BaseSchema):
    approved_amount: Optional[float] = None
    approved_interest_rate: Optional[float] = None
    approved_loan_term: Optional[str] = None

@router.patch("/{application_id}/approve", response_model=CustomerApplicationResponse)
async def approve_application(
    application_id: UUID,
    approval_data: Optional[ApprovalRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to approve applications"
        )
    
    result = await db.execute(
        select(CustomerApplication).where(CustomerApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    if application.workflow_status != WorkflowStatus.MANAGER_REVIEW:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application must be under manager review before approval"
        )
    
    # Update workflow status to approved
    application.workflow_status = WorkflowStatus.APPROVED
    application.manager_reviewed_at = datetime.now(timezone.utc)
    application.manager_reviewed_by = current_user.id
    
    # Update legacy status fields for compatibility
    application.status = "approved"
    application.approved_at = datetime.now(timezone.utc)
    application.approved_by = current_user.id
    application.loan_status = "active"  # Set to active when approved
    
    # Set approved amounts (use requested if not specified)
    if approval_data:
        application.loan_amount = approval_data.approved_amount or application.requested_amount
        if approval_data.approved_interest_rate:
            application.interest_rate = approval_data.approved_interest_rate
        if approval_data.approved_loan_term:
            application.desired_loan_term = approval_data.approved_loan_term
    else:
        # Default: approved amount equals requested amount
        application.loan_amount = application.requested_amount
    
    await db.commit()
    await db.refresh(application)
    
    resp = CustomerApplicationResponse.model_validate(application)
    enrich_application_response(resp)
    return resp

@router.patch("/{application_id}/reject", response_model=CustomerApplicationResponse)
async def reject_application(
    application_id: UUID,
    payload: RejectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> CustomerApplicationResponse:
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to reject applications"
        )
    
    result = await db.execute(
        select(CustomerApplication).where(CustomerApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    if application.workflow_status not in [WorkflowStatus.TELLER_PROCESSING, WorkflowStatus.MANAGER_REVIEW]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application is not in a status that can be rejected"
        )
    
    # Update workflow status to rejected
    application.workflow_status = WorkflowStatus.REJECTED
    application.manager_reviewed_at = datetime.now(timezone.utc)
    application.manager_reviewed_by = current_user.id
    
    # Update legacy status fields for compatibility
    application.status = "rejected"
    application.rejected_at = datetime.now(timezone.utc)
    application.rejected_by = current_user.id
    application.rejection_reason = payload.rejection_reason
    
    await db.commit()
    await db.refresh(application)
    
    return CustomerApplicationResponse.model_validate(application)

@router.get("/{application_id}/relationships")
async def get_application_relationships(
    application_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get detailed relationship information for an application"""
    result = await db.execute(
        select(CustomerApplication)
        .options(
            selectinload(CustomerApplication.user).selectinload(User.department).selectinload(Department.manager),
            selectinload(CustomerApplication.user).selectinload(User.branch).selectinload(Branch.manager),
            selectinload(CustomerApplication.approver),
            selectinload(CustomerApplication.rejector),
            selectinload(CustomerApplication.reviewer)
        )
        .where(CustomerApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Check permissions (same as get_application)
    if current_user.role == "officer" and application.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this application"
        )
    
    officer = application.user
    department = officer.department if officer else None
    branch = officer.branch if officer else None
    department_manager = department.manager if department else None
    branch_manager = branch.manager if branch else None
    
    app_resp = CustomerApplicationResponse.model_validate(application)
    enrich_application_response(app_resp)
    return {
        "application": app_resp,
        "officer": {
            "id": officer.id,
            "first_name": officer.first_name,
            "last_name": officer.last_name,
            "email": officer.email,
            "phone_number": officer.phone_number,
            "role": officer.role
        } if officer else None,
        "department": {
            "id": department.id,
            "name": department.name,
            "code": department.code,
            "description": department.description
        } if department else None,
        "branch": {
            "id": branch.id,
            "name": branch.name,
            "code": branch.code,
            "address": branch.address,
            "phone_number": branch.phone_number,
            "email": branch.email
        } if branch else None,
        "department_manager": {
            "id": department_manager.id,
            "first_name": department_manager.first_name,
            "last_name": department_manager.last_name,
            "email": department_manager.email,
            "phone_number": department_manager.phone_number
        } if department_manager else None,
        "branch_manager": {
            "id": branch_manager.id,
            "first_name": branch_manager.first_name,
            "last_name": branch_manager.last_name,
            "email": branch_manager.email,
            "phone_number": branch_manager.phone_number
        } if branch_manager else None,
        "approver": {
            "id": application.approver.id,
            "first_name": application.approver.first_name,
            "last_name": application.approver.last_name,
            "email": application.approver.email
        } if application.approver else None,
        "rejector": {
            "id": application.rejector.id,
            "first_name": application.rejector.first_name,
            "last_name": application.rejector.last_name,
            "email": application.rejector.email
        } if application.rejector else None,
        "reviewer": {
            "id": application.reviewer.id,
            "first_name": application.reviewer.first_name,
            "last_name": application.reviewer.last_name,
            "email": application.reviewer.email
        } if application.reviewer else None
    }

@router.patch("/{application_id}/assign-reviewer")
async def assign_reviewer(
    application_id: UUID,
    reviewer_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> CustomerApplicationResponse:
    """Assign a reviewer to an application"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to assign reviewers"
        )
    
    # Check if reviewer exists and has appropriate role
    reviewer_result = await db.execute(
        select(User).where(User.id == reviewer_id)
    )
    reviewer = reviewer_result.scalar_one_or_none()
    
    if not reviewer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reviewer not found"
        )
    
    if reviewer.role not in ["manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User cannot be assigned as reviewer"
        )
    
    # Get application
    result = await db.execute(
        select(CustomerApplication).where(CustomerApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    application.assigned_reviewer = reviewer_id
    application.workflow_stage = "under_review"
    
    await db.commit()
    await db.refresh(application)
    
    return CustomerApplicationResponse.model_validate(application)

@router.patch("/{application_id}/priority")
async def update_priority(
    application_id: UUID,
    priority_level: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update application priority level"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update priority"
        )
    
    if priority_level not in ["low", "normal", "high", "urgent"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid priority level"
        )
    
    result = await db.execute(
        select(CustomerApplication).where(CustomerApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    application.priority_level = priority_level
    
    await db.commit()
    await db.refresh(application)
    
    return CustomerApplicationResponse.model_validate(application)

@router.get("/stats/summary")
async def get_application_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get application statistics summary"""
    base_query = select(CustomerApplication)
    
    # Apply role-based filtering
    if current_user.role == "officer":
        base_query = base_query.where(CustomerApplication.user_id == current_user.id)
    elif current_user.role == "manager":
        if current_user.department_id:
            dept_users = select(User.id).where(User.department_id == current_user.department_id)
            base_query = base_query.where(CustomerApplication.user_id.in_(dept_users))
        elif current_user.branch_id:
            branch_users = select(User.id).where(User.branch_id == current_user.branch_id)
            base_query = base_query.where(CustomerApplication.user_id.in_(branch_users))
    
    # Status counts
    status_counts = await db.execute(
        select(
            CustomerApplication.status,
            func.count(CustomerApplication.id).label('count')
        )
        .select_from(base_query.subquery())
        .group_by(CustomerApplication.status)
    )
    
    # Risk category counts
    risk_counts = await db.execute(
        select(
            CustomerApplication.risk_category,
            func.count(CustomerApplication.id).label('count')
        )
        .select_from(base_query.subquery())
        .where(CustomerApplication.risk_category.isnot(None))
        .group_by(CustomerApplication.risk_category)
    )
    
    # Product type counts
    product_counts = await db.execute(
        select(
            CustomerApplication.product_type,
            func.count(CustomerApplication.id).label('count')
        )
        .select_from(base_query.subquery())
        .where(CustomerApplication.product_type.isnot(None))
        .group_by(CustomerApplication.product_type)
    )
    
    # Amount statistics
    amount_stats = await db.execute(
        select(
            func.count(CustomerApplication.id).label('total_applications'),
            func.sum(CustomerApplication.requested_amount).label('total_amount'),
            func.avg(CustomerApplication.requested_amount).label('average_amount'),
            func.min(CustomerApplication.requested_amount).label('min_amount'),
            func.max(CustomerApplication.requested_amount).label('max_amount')
        )
        .select_from(base_query.subquery())
        .where(CustomerApplication.requested_amount.isnot(None))
    )
    
    amount_row = amount_stats.first()
    return {
        "status_distribution": {row.status: row.count for row in status_counts},
        "risk_distribution": {row.risk_category: row.count for row in risk_counts},
        "product_distribution": {row.product_type: row.count for row in product_counts},
        "amount_statistics": dict(amount_row._mapping) if amount_row else {}
    }

@router.get("/export/csv")
async def export_applications_csv(
    status: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Export applications to CSV format"""
    from fastapi.responses import StreamingResponse
    import csv
    import io
    
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to export data"
        )
    
    query = select(CustomerApplication).options(
        selectinload(CustomerApplication.user)
    )
    
    # Apply filters
    if status:
        query = query.where(CustomerApplication.status == status)
    if date_from:
        query = query.where(CustomerApplication.created_at >= date_from)
    if date_to:
        query = query.where(CustomerApplication.created_at <= date_to)
    
    # Role-based filtering
    if current_user.role == "manager":
        if current_user.department_id:
            dept_users = select(User.id).where(User.department_id == current_user.department_id)
            query = query.where(CustomerApplication.user_id.in_(dept_users))
        elif current_user.branch_id:
            branch_users = select(User.id).where(User.branch_id == current_user.branch_id)
            query = query.where(CustomerApplication.user_id.in_(branch_users))
    
    result = await db.execute(query)
    applications = result.scalars().all()
    
    # Create CSV content
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'ID', 'Status', 'Customer Name (Khmer)', 'Customer Name (Latin)',
        'ID Number', 'Phone', 'Requested Amount', 'Product Type',
        'Loan Purposes', 'Officer', 'Created At', 'Submitted At',
        'Risk Category', 'Priority Level'
    ])
    
    # Write data
    for app in applications:
        writer.writerow([
            str(app.id),
            app.status,
            app.full_name_khmer or '',
            app.full_name_latin or '',
            app.id_number or '',
            app.phone or '',
            app.requested_amount or '',
            app.product_type or '',
            ', '.join(app.loan_purposes) if app.loan_purposes else '',
            app.portfolio_officer_name or '',
            app.created_at.isoformat() if app.created_at else '',
            app.submitted_at.isoformat() if app.submitted_at else '',
            app.risk_category or '',
            app.priority_level or ''
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename=applications.csv'}
    )
 

def _get_status_color(status: str, loan_status: Optional[str] = None) -> str:
    """Compute status color based on application and loan status"""
    if status == "rejected":
        return "red"
    elif status == "approved" and loan_status == "disbursed":
        return "green"
    elif status == "approved" and loan_status == "active":
        return "blue"
    elif status == "approved" and loan_status == "completed":
        return "gray"
    elif status == "approved" and loan_status == "defaulted":
        return "red"
    elif status == "submitted":
        return "yellow"
    elif status == "draft":
        return "gray"
    else:
        return "blue"  # default

@router.patch("/{application_id}/workflow-stage")
async def update_workflow_stage(
    application_id: UUID,
    workflow_stage: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> CustomerApplicationResponse:
    """Update application workflow stage"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update workflow stage"
        )
    
    valid_stages = [
        "initial_review", "document_verification", "credit_check", 
        "risk_assessment", "approval_pending", "final_review"
    ]
    
    if workflow_stage not in valid_stages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid workflow stage. Must be one of: {', '.join(valid_stages)}"
        )
    
    result = await db.execute(
        select(CustomerApplication).where(CustomerApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    application.workflow_stage = workflow_stage
    
    await db.commit()
    await db.refresh(application)
    
    return CustomerApplicationResponse.model_validate(application)



@router.patch("/{application_id}/loan-status")
async def update_loan_status(
    application_id: UUID,
    loan_status: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update loan status (for disbursed loans)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update loan status"
        )
    
    valid_statuses = ["draft", "active", "disbursed", "completed", "defaulted"]
    if loan_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid loan status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    result = await db.execute(
        select(CustomerApplication).where(CustomerApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    application.loan_status = loan_status
    
    # Set loan start date when disbursed
    if loan_status == "disbursed" and not application.loan_start_date:
        application.loan_start_date = datetime.now(timezone.utc).date()
        
        # Calculate loan end date based on desired term
        if application.desired_loan_term and not application.loan_end_date:
            application.loan_end_date = _calculate_loan_end_date(
                application.loan_start_date, 
                application.desired_loan_term
            )
    
    await db.commit()
    await db.refresh(application)
    
    return CustomerApplicationResponse.model_validate(application)


# Workflow Management Endpoints

@router.post("/{application_id}/workflow/transition", response_model=ApplicationWorkflowResponse)
async def transition_workflow(
    application_id: UUID,
    transition_request: WorkflowTransitionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ApplicationWorkflowResponse:
    """Transition application to next workflow stage"""
    # Get application with all relationships
    result = await db.execute(
        select(CustomerApplication)
        .options(
            selectinload(CustomerApplication.user),
            selectinload(CustomerApplication.po_creator),
            selectinload(CustomerApplication.user_completer),
            selectinload(CustomerApplication.teller_processor),
            selectinload(CustomerApplication.manager_reviewer)
        )
        .where(CustomerApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Validate transition using WorkflowValidator
    validator = WorkflowValidator()
    
    try:
        # Validate the transition
        validator.validate_transition(
            current_status=application.workflow_status,
            new_status=transition_request.new_status,
            user_role=current_user.role,
            account_id=transition_request.account_id
        )
        
        # Apply the transition
        updated_application = validator.apply_transition(
            application=application,
            new_status=transition_request.new_status,
            user=current_user,
            account_id=transition_request.account_id,
            notes=transition_request.notes
        )
        
        # Save changes
        await db.commit()
        await db.refresh(updated_application)
        
        # Build workflow info
        workflow_info = _build_workflow_info(updated_application, current_user)
        
        # Return extended response
        response_data = CustomerApplicationResponse.model_validate(updated_application)
        enrich_application_response(response_data)
        return ApplicationWorkflowResponse(
            **response_data.model_dump(),
            workflow_info=workflow_info,
            po_creator=updated_application.po_creator,
            user_completer=updated_application.user_completer,
            teller_processor=updated_application.teller_processor,
            manager_reviewer=updated_application.manager_reviewer
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{application_id}/workflow/status", response_model=WorkflowStatusInfo)
async def get_workflow_status(
    application_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> WorkflowStatusInfo:
    """Get current workflow status and available actions"""
    result = await db.execute(
        select(CustomerApplication)
        .where(CustomerApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    return _build_workflow_info(application, current_user)

@router.get("/{application_id}/workflow/history")
async def get_workflow_history(
    application_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get workflow transition history"""
    result = await db.execute(
        select(CustomerApplication)
        .options(
            selectinload(CustomerApplication.po_creator),
            selectinload(CustomerApplication.user_completer),
            selectinload(CustomerApplication.teller_processor),
            selectinload(CustomerApplication.manager_reviewer)
        )
        .where(CustomerApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    history = []
    
    # Build history from workflow fields
    if application.po_created_at:
        history.append({
            "status": WorkflowStatus.PO_CREATED.value,
            "timestamp": application.po_created_at,
            "user": application.po_creator.first_name + " " + application.po_creator.last_name if application.po_creator else "Unknown",
            "user_role": "PO",
            "description": "Application created by PO"
        })
    
    if application.user_completed_at:
        history.append({
            "status": WorkflowStatus.USER_COMPLETED.value,
            "timestamp": application.user_completed_at,
            "user": application.user_completer.first_name + " " + application.user_completer.last_name if application.user_completer else "Unknown",
            "user_role": "User",
            "description": "Form completed by user"
        })
    
    if application.teller_processed_at:
        history.append({
            "status": WorkflowStatus.TELLER_PROCESSING.value,
            "timestamp": application.teller_processed_at,
            "user": application.teller_processor.first_name + " " + application.teller_processor.last_name if application.teller_processor else "Unknown",
            "user_role": "Teller",
            "description": f"Account ID processed: {application.account_id or 'N/A'}",
            "account_id": application.account_id,
            "validation_notes": application.account_id_validation_notes
        })
    
    if application.manager_reviewed_at:
        history.append({
            "status": WorkflowStatus.MANAGER_REVIEW.value,
            "timestamp": application.manager_reviewed_at,
            "user": application.manager_reviewer.first_name + " " + application.manager_reviewer.last_name if application.manager_reviewer else "Unknown",
            "user_role": "Manager",
            "description": "Final review completed by manager"
        })
    
    # Sort by timestamp
    history.sort(key=lambda x: x["timestamp"])
    
    return history

def _build_workflow_info(application: CustomerApplication, current_user: User) -> WorkflowStatusInfo:
    """Build workflow status information"""
    validator = WorkflowValidator()
    current_status = application.workflow_status or WorkflowStatus.PO_CREATED
    
    # Determine permissions
    can_edit_form = validator.can_edit_form(current_status, current_user.role)
    can_transition = len(validator.get_next_stages(current_status, current_user.role)) > 0
    next_possible_stages = validator.get_next_stages(current_status, current_user.role)
    requires_account_id = any(
        validator.requires_account_id(current_status, stage) 
        for stage in next_possible_stages
    )
    
    # Get stage description
    stage_descriptions = {
        WorkflowStatus.PO_CREATED: "Application created by PO - awaiting user completion",
        WorkflowStatus.USER_COMPLETED: "Form completed by user - awaiting teller processing",
        WorkflowStatus.TELLER_PROCESSING: "Account ID processed by teller - awaiting manager review",
        WorkflowStatus.MANAGER_REVIEW: "Awaiting manager decision",
        WorkflowStatus.APPROVED: "Application approved",
        WorkflowStatus.REJECTED: "Application rejected"
    }
    
    return WorkflowStatusInfo(
        current_status=current_status,
        can_edit_form=can_edit_form,
        can_transition=can_transition,
        next_possible_stages=next_possible_stages,
        requires_account_id=requires_account_id,
        stage_description=stage_descriptions.get(current_status, "Unknown stage")
    )


def _calculate_loan_end_date(start_date: date, loan_term: str) -> date:
    """Calculate loan end date based on start date and term"""
    from dateutil.relativedelta import relativedelta
    
    # Parse loan term (e.g., "12_months", "6_months")
    if "_months" in loan_term:
        months = int(loan_term.split("_")[0])
        return start_date + relativedelta(months=months)
    elif "_weeks" in loan_term:
        weeks = int(loan_term.split("_")[0])
        return start_date + relativedelta(weeks=weeks)
    elif "_years" in loan_term:
        years = int(loan_term.split("_")[0])
        return start_date + relativedelta(years=years)
    else:
        # Default to 12 months if term format is unclear
        return start_date + relativedelta(months=12)
