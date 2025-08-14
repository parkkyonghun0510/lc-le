from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, desc, func, case
from sqlalchemy.orm import selectinload, joinedload
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, date

from app.database import get_db
from app.models import CustomerApplication, User, Department, Branch
from app.schemas import (
    CustomerApplicationCreate, 
    CustomerApplicationUpdate, 
    CustomerApplicationResponse,
    PaginatedResponse,
    RejectionRequest,
    BaseSchema,
)
from app.routers.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=CustomerApplicationResponse)
async def create_application(
    application: CustomerApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    db_application = CustomerApplication(
        **application.model_dump(exclude_unset=True),
        user_id=current_user.id
    )
    db.add(db_application)
    await db.commit()
    await db.refresh(db_application)
    return CustomerApplicationResponse.from_orm(db_application)

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
):
    # Base query with relationships
    query = select(CustomerApplication).options(
        selectinload(CustomerApplication.user),
        selectinload(CustomerApplication.approver),
        selectinload(CustomerApplication.rejector),
        selectinload(CustomerApplication.reviewer)
    )
    
    # Apply filters based on user role
    if current_user.role == "officer":
        query = query.where(CustomerApplication.user_id == current_user.id)
    elif current_user.role == "manager":
        # Managers can see applications from their department/branch
        if current_user.department_id:
            dept_users = select(User.id).where(User.department_id == current_user.department_id)
            query = query.where(CustomerApplication.user_id.in_(dept_users))
        elif current_user.branch_id:
            branch_users = select(User.id).where(User.branch_id == current_user.branch_id)
            query = query.where(CustomerApplication.user_id.in_(branch_users))
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
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
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
        items=[CustomerApplicationResponse.from_orm(app) for app in applications],
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
):
    """Get customer cards optimized for UI display"""
    from app.schemas import CustomerCardResponse
    
    # Base query with relationships
    query = select(CustomerApplication).options(
        selectinload(CustomerApplication.user)
    )
    
    # Apply role-based filtering (same as list_applications)
    if current_user.role == "officer":
        query = query.where(CustomerApplication.user_id == current_user.id)
    elif current_user.role == "manager":
        if current_user.department_id:
            dept_users = select(User.id).where(User.department_id == current_user.department_id)
            query = query.where(CustomerApplication.user_id.in_(dept_users))
        elif current_user.branch_id:
            branch_users = select(User.id).where(User.branch_id == current_user.branch_id)
            query = query.where(CustomerApplication.user_id.in_(branch_users))
    
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
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
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
):
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
    
    return CustomerApplicationResponse.from_orm(application)

@router.put("/{application_id}", response_model=CustomerApplicationResponse)
async def update_application(
    application_id: UUID,
    application_update: CustomerApplicationUpdate,
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
            detail="Not authorized to update this application"
        )
    
    # Update fields
    update_data = application_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(application, field, value)
    
    await db.commit()
    await db.refresh(application)
    return CustomerApplicationResponse.from_orm(application)

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
    
    await db.delete(application)
    await db.commit()
    
    return {"message": "Application deleted successfully"}

@router.patch("/{application_id}/submit")
async def submit_application(
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
    if application.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to submit this application"
        )
    
    if application.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application is not in draft status"
        )
    
    application.status = "submitted"
    application.submitted_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(application)
    
    return CustomerApplicationResponse.from_orm(application)

class ApprovalRequest(BaseSchema):
    approved_amount: Optional[float] = None
    approved_interest_rate: Optional[float] = None
    approved_loan_term: Optional[str] = None

@router.patch("/{application_id}/approve")
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
    
    if application.status != "submitted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application is not in submitted status"
        )
    
    application.status = "approved"
    application.approved_at = datetime.utcnow()
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
    
    return CustomerApplicationResponse.from_orm(application)

@router.patch("/{application_id}/reject")
async def reject_application(
    application_id: UUID,
    payload: RejectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
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
    
    if application.status != "submitted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application is not in submitted status"
        )
    
    application.status = "rejected"
    application.rejected_at = datetime.utcnow()
    application.rejected_by = current_user.id
    application.rejection_reason = payload.rejection_reason
    
    await db.commit()
    await db.refresh(application)
    
    return CustomerApplicationResponse.from_orm(application)

@router.get("/{application_id}/relationships")
async def get_application_relationships(
    application_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
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
    
    return {
        "application": CustomerApplicationResponse.from_orm(application),
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
):
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
    
    return CustomerApplicationResponse.from_orm(application)

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
    
    return CustomerApplicationResponse.from_orm(application)

@router.get("/stats/summary")
async def get_application_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
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
):
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
    
    return CustomerApplicationResponse.from_orm(application)

@router.get("/enums/options")
async def get_application_options():
    """Get all enum options for frontend dropdowns"""
    return {
        "id_card_types": [
            {"value": "cambodian_identity", "label": "Cambodian Identity Card"},
            {"value": "passport", "label": "Passport"},
            {"value": "family_book", "label": "Family Book"}
        ],
        "loan_statuses": [
            {"value": "draft", "label": "Draft"},
            {"value": "active", "label": "Active"},
            {"value": "disbursed", "label": "Disbursed"},
            {"value": "completed", "label": "Completed"},
            {"value": "defaulted", "label": "Defaulted"}
        ],
        "loan_purposes": [
            {"value": "commerce", "label": "Commerce/Business"},
            {"value": "agriculture", "label": "Agriculture"},
            {"value": "education", "label": "Education"},
            {"value": "housing", "label": "Housing"},
            {"value": "vehicle", "label": "Vehicle"},
            {"value": "medical", "label": "Medical"},
            {"value": "other", "label": "Other"}
        ],
        "product_types": [
            {"value": "micro_loan", "label": "Micro Loan"},
            {"value": "sme_loan", "label": "SME Loan"},
            {"value": "agriculture_loan", "label": "Agriculture Loan"},
            {"value": "housing_loan", "label": "Housing Loan"},
            {"value": "education_loan", "label": "Education Loan"},
            {"value": "monthly", "label": "Monthly Payment"},
            {"value": "weekly", "label": "Weekly Payment"}
        ],
        "loan_terms": [
            {"value": "3_months", "label": "3 Months"},
            {"value": "6_months", "label": "6 Months"},
            {"value": "12_months", "label": "12 Months"},
            {"value": "18_months", "label": "18 Months"},
            {"value": "24_months", "label": "24 Months"},
            {"value": "36_months", "label": "36 Months"}
        ],
        "risk_categories": [
            {"value": "low", "label": "Low Risk"},
            {"value": "medium", "label": "Medium Risk"},
            {"value": "high", "label": "High Risk"}
        ],
        "priority_levels": [
            {"value": "low", "label": "Low Priority"},
            {"value": "normal", "label": "Normal Priority"},
            {"value": "high", "label": "High Priority"},
            {"value": "urgent", "label": "Urgent"}
        ],
        "application_statuses": [
            {"value": "draft", "label": "Draft"},
            {"value": "submitted", "label": "Submitted"},
            {"value": "approved", "label": "Approved"},
            {"value": "rejected", "label": "Rejected"}
        ],
        "workflow_stages": [
            {"value": "initial_review", "label": "Initial Review"},
            {"value": "document_verification", "label": "Document Verification"},
            {"value": "credit_check", "label": "Credit Check"},
            {"value": "risk_assessment", "label": "Risk Assessment"},
            {"value": "approval_pending", "label": "Approval Pending"},
            {"value": "final_review", "label": "Final Review"},
            {"value": "under_review", "label": "Under Review"}
        ]
    }

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
        application.loan_start_date = datetime.utcnow().date()
        
        # Calculate loan end date based on desired term
        if application.desired_loan_term and not application.loan_end_date:
            application.loan_end_date = _calculate_loan_end_date(
                application.loan_start_date, 
                application.desired_loan_term
            )
    
    await db.commit()
    await db.refresh(application)
    
    return CustomerApplicationResponse.from_orm(application)

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