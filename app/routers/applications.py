from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, desc
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.database import get_db
from app.models import CustomerApplication, User
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
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(CustomerApplication)
    
    # Apply filters based on user role
    if current_user.role not in ["admin", "manager"]:
        query = query.where(CustomerApplication.user_id == current_user.id)
    
    if status:
        query = query.where(CustomerApplication.status == status)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                CustomerApplication.full_name_khmer.ilike(search_term),
                CustomerApplication.full_name_latin.ilike(search_term),
                CustomerApplication.id_number.ilike(search_term)
            )
        )
    
    # Count total
    count_query = select(CustomerApplication).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = len(total_result.all())
    
    # Apply pagination
    offset = (page - 1) * size
    query = query.order_by(desc(CustomerApplication.created_at)).offset(offset).limit(size)
    
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