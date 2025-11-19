from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models import User, CustomerApplication, File
from app.schemas import PaginatedResponse, UserResponse, CustomerApplicationResponse
from app.routers.auth import get_current_user

router = APIRouter()

@router.get("/")
async def get_customers(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> PaginatedResponse:
    """Get all customers with file counts"""
    # For this implementation, "customers" are Users who have at least one CustomerApplication
    # Build a role-filtered subquery of distinct applicant user_ids
    base_app_q = select(CustomerApplication.user_id).distinct()

    # Role-based filtering on the applications and/or users
    # if current_user.role == "officer":
    #     # Officers only see applications they created
    #     base_app_q = base_app_q.where(CustomerApplication.user_id == current_user.id)
    # elif current_user.role == "manager":
    #     # Managers see applicants within their department/branch
    #     # Need to constrain by the User owning the application
    #     # We'll use a correlated EXISTS by filtering Users later; here we keep app user_ids distinct
    #     pass
    # Admins: no restriction

    # Build the users query from the filtered distinct applicant IDs with eager loading
    users_q = select(User).options(
        selectinload(User.department),
        selectinload(User.branch),
        selectinload(User.position)
    ).where(User.id.in_(base_app_q.subquery()))

    # if current_user.role == "manager":
    #     if current_user.department_id:
    #         users_q = users_q.where(User.department_id == current_user.department_id)
    #     elif current_user.branch_id:
    #         users_q = users_q.where(User.branch_id == current_user.branch_id)

    # Order and paginate
    users_q = users_q.order_by(desc(User.created_at)).offset((page - 1) * size).limit(size)

    # Count total customers using the same filtered set
    count_q = select(func.count()).select_from(
        select(User.id).where(User.id.in_(base_app_q.subquery())).subquery()
    )
    # if current_user.role == "manager":
    #     if current_user.department_id:
    #         count_q = select(func.count()).select_from(
    #             select(User.id)
    #             .where(User.id.in_(base_app_q.subquery()))
    #             .where(User.department_id == current_user.department_id)
    #             .subquery()
    #         )
    #     elif current_user.branch_id:
    #         count_q = select(func.count()).select_from(
    #             select(User.id)
    #             .where(User.id.in_(base_app_q.subquery()))
    #             .where(User.branch_id == current_user.branch_id)
    #             .subquery()
    #         )

    # Execute queries
    result = await db.execute(users_q)
    customers = result.scalars().all()
    
    count_result = await db.execute(count_q)
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
    
    # Prepare response - use safe serialization to avoid async context issues
    customer_responses = []
    for customer in customers:
        # Use safe serialization to handle circular references and async context issues
        from app.routers.auth import create_safe_user_response
        customer_response = create_safe_user_response(customer, max_depth=1)
        customer_dict = customer_response.model_dump()
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
) -> List[dict]:
    """Get applications for a customer with file counts"""
    # Verify customer exists with eager loading
    customer_query = select(User).options(
        selectinload(User.department),
        selectinload(User.branch),
        selectinload(User.position)
    ).where(User.id == customer_id)
    customer_result = await db.execute(customer_query)
    customer = customer_result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    
    # Check permissions based on role
    # if current_user.role == "officer" and current_user.id != customer_id:
    #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this customer's applications")
    
    # if current_user.role == "manager":
    #     if current_user.department_id and customer.department_id != current_user.department_id:
    #         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this customer's applications")
    #     if current_user.branch_id and customer.branch_id != current_user.branch_id:
    #         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this customer's applications")
    
    # Get applications for this customer
    applications_query = (
        select(CustomerApplication)
        .where(CustomerApplication.user_id == customer_id)
        .order_by(desc(CustomerApplication.created_at))
    )
    
    applications_result = await db.execute(applications_query)
    applications = applications_result.scalars().all()
    
    # Get file counts for each application and serialize properly
    application_responses = []
    for application in applications:
        # Count files for this application
        file_count_query = (
            select(func.count(File.id))
            .where(File.application_id == application.id)
        )
        file_count_result = await db.execute(file_count_query)
        file_count = file_count_result.scalar_one() or 0
        
        # Use safe serialization to avoid async context issues
        try:
            app_response = CustomerApplicationResponse.from_orm(application)
            app_dict = app_response.model_dump()
        except Exception as e:
            print(f"Warning: Failed to serialize application {application.id}: {e}")
            # Fallback to manual serialization
            app_dict = {
                "id": application.id,
                "user_id": application.user_id,
                "application_type": application.application_type,
                "status": application.status,
                "submitted_at": application.submitted_at,
                "reviewed_at": application.reviewed_at,
                "reviewed_by": application.reviewed_by,
                "created_at": application.created_at,
                "updated_at": application.updated_at,
            }
        app_dict["file_count"] = file_count
        application_responses.append(app_dict)
    
    return application_responses