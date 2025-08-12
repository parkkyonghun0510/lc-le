from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models import User, CustomerApplication, File
from app.schemas import PaginatedResponse, UserResponse
from app.routers.auth import get_current_user

router = APIRouter()

@router.get("/")
async def get_customers(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all customers with file counts"""
    # For this implementation, we'll use the users who have applications as "customers"
    # Get distinct users who have applications
    query = (
        select(User)
        .join(CustomerApplication, User.id == CustomerApplication.user_id)
        .group_by(User.id)
    )
    
    # Apply role-based filtering
    if current_user.role == "officer":
        # Officers can only see their own customers
        query = query.where(CustomerApplication.user_id == current_user.id)
    elif current_user.role == "manager":
        # Managers can see customers from their department/branch
        if current_user.department_id:
            query = query.where(User.department_id == current_user.department_id)
        elif current_user.branch_id:
            query = query.where(User.branch_id == current_user.branch_id)
    # Admins can see all customers
    
    # Count total customers
    count_query = select(func.count()).select_from(
        select(User.id)
        .join(CustomerApplication, User.id == CustomerApplication.user_id)
        .group_by(User.id)
        .subquery()
    )
    
    # Apply pagination
    query = query.offset((page - 1) * size).limit(size)
    
    # Execute queries
    result = await db.execute(query)
    customers = result.scalars().all()
    
    count_result = await db.execute(count_query)
    total = count_result.scalar_one() or 0
    
    # Get file counts for each customer
    customer_file_counts = {}
    for customer in customers:
        # Count files associated with this customer's applications
        file_count_query = (
            select(func.count(File.id))
            .join(CustomerApplication, File.application_id == CustomerApplication.id)
            .where(CustomerApplication.user_id == customer.id)
        )
        file_count_result = await db.execute(file_count_query)
        file_count = file_count_result.scalar_one() or 0
        customer_file_counts[str(customer.id)] = file_count
    
    # Prepare response
    customer_responses = []
    for customer in customers:
        customer_dict = UserResponse.from_orm(customer).model_dump()
        customer_dict["file_count"] = customer_file_counts.get(str(customer.id), 0)
        customer_responses.append(customer_dict)
    
    return PaginatedResponse(
        items=customer_responses,
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size
    )

@router.get("/{customer_id}/applications")
async def get_customer_applications(
    customer_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get applications for a customer with file counts"""
    # Verify customer exists
    customer_query = select(User).where(User.id == customer_id)
    customer_result = await db.execute(customer_query)
    customer = customer_result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    
    # Check permissions based on role
    if current_user.role == "officer" and current_user.id != customer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this customer's applications")
    
    if current_user.role == "manager":
        if current_user.department_id and customer.department_id != current_user.department_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this customer's applications")
        if current_user.branch_id and customer.branch_id != current_user.branch_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this customer's applications")
    
    # Get applications for this customer
    applications_query = (
        select(CustomerApplication)
        .where(CustomerApplication.user_id == customer_id)
        .order_by(desc(CustomerApplication.created_at))
    )
    
    applications_result = await db.execute(applications_query)
    applications = applications_result.scalars().all()
    
    # Get file counts for each application
    application_responses = []
    for application in applications:
        # Count files for this application
        file_count_query = (
            select(func.count(File.id))
            .where(File.application_id == application.id)
        )
        file_count_result = await db.execute(file_count_query)
        file_count = file_count_result.scalar_one() or 0
        
        # Create response with file count
        app_dict = application.__dict__.copy()
        if "_sa_instance_state" in app_dict:
            del app_dict["_sa_instance_state"]
        app_dict["file_count"] = file_count
        application_responses.append(app_dict)
    
    return application_responses