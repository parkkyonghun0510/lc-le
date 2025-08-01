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
    PaginatedResponse
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
        **application.dict(),
        user_id=current_user.id
    )
    db.add(db_application)
    await db.commit()
    await db.refresh(db_application)
    return CustomerApplicationResponse.from_orm(db_application)

@router.get("/", response_model=PaginatedResponse)
async def list_applications(
    status: Optional[str] = Query(None, description="Filter by status"),
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
    size: int = Query(10, ge=1, le=100),
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
    update_data = application_update.dict(exclude_unset=True)
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

@router.patch("/{application_id}/approve")
async def approve_application(
    application_id: UUID,
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
    
    await db.commit()
    await db.refresh(application)
    
    return CustomerApplicationResponse.from_orm(application)

@router.patch("/{application_id}/reject")
async def reject_application(
    application_id: UUID,
    rejection_reason: str,
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
    application.rejection_reason = rejection_reason
    
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
    
    return {
        "status_distribution": {row.status: row.count for row in status_counts},
        "risk_distribution": {row.risk_category: row.count for row in risk_counts},
        "product_distribution": {row.product_type: row.count for row in product_counts},
        "amount_statistics": dict(amount_stats.first()._asdict()) if amount_stats.first() else {}
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