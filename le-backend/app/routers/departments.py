from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
from uuid import UUID

from app.database import get_db
from app.models import Department, User
from app.schemas import DepartmentCreate, DepartmentUpdate, DepartmentResponse, PaginatedResponse
from app.routers.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=DepartmentResponse)
async def create_department(
    department: DepartmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> DepartmentResponse:
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create departments"
        )
    
    # Check if department name already exists
    result = await db.execute(
        select(Department).where(Department.name == department.name)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department name already exists"
        )
    
    # Check if department code already exists
    result = await db.execute(
        select(Department).where(Department.code == department.code)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department code already exists"
        )
    
    try:
        db_department = Department(**department.dict())
        db.add(db_department)

        await db.flush()
        await db.commit()
        await db.refresh(db_department)
        return DepartmentResponse.from_orm(db_department)
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create department: {str(e)}"
        )

@router.get("/", response_model=PaginatedResponse)
async def list_departments(
    search: Optional[str] = Query(None, description="Search in department name, code, or description"),
    status: Optional[str] = Query(None, description="Filter by status (active/inactive)"),
    manager_id: Optional[UUID] = Query(None, description="Filter by manager ID"),
    sort_by: Optional[str] = Query("created_at", description="Sort by field (name, code, created_at)"),
    sort_order: Optional[str] = Query("desc", description="Sort order (asc/desc)"),
    include_counts: Optional[bool] = Query(False, description="Include user and branch counts"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> PaginatedResponse:
    # Build base query
    if include_counts:
        # Include user count subquery
        user_count_subquery = select(func.count(User.id)).where(User.department_id == Department.id).scalar_subquery()
        query = select(Department, user_count_subquery.label('user_count')).options(selectinload(Department.manager))
    else:
        query = select(Department).options(selectinload(Department.manager))
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Department.name.ilike(search_term),
                Department.code.ilike(search_term),
                Department.description.ilike(search_term)
            )
        )
    
    # Apply status filter
    if status:
        if status.lower() == "active":
            query = query.where(Department.is_active == True)
        elif status.lower() == "inactive":
            query = query.where(Department.is_active == False)
    
    # Apply manager filter
    if manager_id:
        query = query.where(Department.manager_id == manager_id)
    
    # Build count query with same filters
    count_query = select(func.count(Department.id))
    if search:
        search_term = f"%{search}%"
        count_query = count_query.where(
            or_(
                Department.name.ilike(search_term),
                Department.code.ilike(search_term),
                Department.description.ilike(search_term)
            )
        )
    if status:
        if status.lower() == "active":
            count_query = count_query.where(Department.is_active == True)
        elif status.lower() == "inactive":
            count_query = count_query.where(Department.is_active == False)
    if manager_id:
        count_query = count_query.where(Department.manager_id == manager_id)
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply sorting
    if sort_by == "name":
        order_field = Department.name
    elif sort_by == "code":
        order_field = Department.code
    else:
        order_field = Department.created_at
    
    if sort_order.lower() == "asc":
        query = query.order_by(order_field)
    else:
        query = query.order_by(desc(order_field))
    
    # Apply pagination
    offset = (page - 1) * size
    query = query.offset(offset).limit(size)
    
    # Execute query and format results
    result = await db.execute(query)
    
    if include_counts:
        departments_with_counts = result.all()
        items = [{
            **DepartmentResponse.from_orm(dept).dict(),
            "user_count": user_count
        } for dept, user_count in departments_with_counts]
    else:
        departments = result.scalars().all()
        items = [DepartmentResponse.from_orm(dept) for dept in departments]
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size
    )

@router.get("/active", response_model=List[DepartmentResponse])
async def get_active_departments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[DepartmentResponse]:
    """Get all active departments for dropdowns/selects"""
    result = await db.execute(
        select(Department)
        .where(Department.is_active == True)
        .order_by(Department.name)
    )
    departments = result.scalars().all()
    return [DepartmentResponse.from_orm(dept) for dept in departments]

@router.get("/{department_id}", response_model=DepartmentResponse)
async def get_department(
    department_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> DepartmentResponse:
    result = await db.execute(
        select(Department).where(Department.id == department_id)
    )
    department = result.scalar_one_or_none()
    
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    return DepartmentResponse.from_orm(department)

@router.patch("/{department_id}", response_model=DepartmentResponse)
async def partial_update_department(
    department_id: UUID,
    department_update: DepartmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> DepartmentResponse:
    """Partial update department (PATCH method)"""
    return await update_department(department_id, department_update, current_user, db)

@router.put("/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: UUID,
    department_update: DepartmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> DepartmentResponse:
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update departments"
        )
    
    result = await db.execute(
        select(Department).where(Department.id == department_id)
    )
    department = result.scalar_one_or_none()
    
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    update_data = department_update.dict(exclude_unset=True)
    
    # Check if name is being updated and already exists
    if 'name' in update_data and update_data['name'] != department.name:
        result = await db.execute(
            select(Department).where(Department.name == update_data['name'])
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department name already exists"
            )
    
    # Check if code is being updated and already exists
    if 'code' in update_data and update_data['code'] != department.code:
        result = await db.execute(
            select(Department).where(Department.code == update_data['code'])
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department code already exists"
            )
    
    for field, value in update_data.items():
        setattr(department, field, value)
    
    await db.commit()
    await db.refresh(department)
    return DepartmentResponse.from_orm(department)

@router.delete("/{department_id}")
async def delete_department(
    department_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, str]:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete departments"
        )
    
    result = await db.execute(
        select(Department).where(Department.id == department_id)
    )
    department = result.scalar_one_or_none()
    
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    await db.delete(department)
    await db.commit()
    
    return {"message": "Department deleted successfully"}

@router.patch("/{department_id}/toggle-status")
async def toggle_department_status(
    department_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Toggle department active/inactive status"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to change department status"
        )
    
    result = await db.execute(
        select(Department).where(Department.id == department_id)
    )
    department = result.scalar_one_or_none()
    
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    department.is_active = not department.is_active
    await db.commit()
    await db.refresh(department)
    
    status_text = "activated" if department.is_active else "deactivated"
    return {
        "message": f"Department {status_text} successfully",
        "is_active": department.is_active
    }

@router.get("/{department_id}/stats")
async def get_department_stats(
    department_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get department statistics"""
    # Check if department exists
    result = await db.execute(
        select(Department).where(Department.id == department_id)
    )
    department = result.scalar_one_or_none()
    
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    # Get user count in this department
    user_count_result = await db.execute(
        select(func.count(User.id)).where(User.department_id == department_id)
    )
    user_count = user_count_result.scalar() or 0
    
    # Get application count from users in this department
    from app.models import CustomerApplication
    app_count_result = await db.execute(
        select(func.count(CustomerApplication.id))
        .join(User, CustomerApplication.user_id == User.id)
        .where(User.department_id == department_id)
    )
    app_count = app_count_result.scalar() or 0
    
    return {
        "department_id": str(department_id),
        "department_name": department.name,
        "user_count": user_count,
        "application_count": app_count,
        "is_active": department.is_active
    }

@router.get("/{department_id}/users", response_model=List[Dict[str, Any]])
async def get_department_users(
    department_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get users in a specific department"""
    # Check if department exists
    result = await db.execute(
        select(Department).where(Department.id == department_id)
    )
    department = result.scalar_one_or_none()
    
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    # Get users in this department
    users_result = await db.execute(
        select(User)
        .where(User.department_id == department_id)
        .order_by(User.first_name, User.last_name)
    )
    users = users_result.scalars().all()
    
    return [
        {
            "id": str(user.id),
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "role": user.role,
            "status": user.status
        }
        for user in users
    ]

@router.get("/{department_id}/with-relations")
async def get_department_with_relations(
    department_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get department with all its relationships in a single call"""
    # Check if department exists
    result = await db.execute(
        select(Department).options(selectinload(Department.manager)).where(Department.id == department_id)
    )
    department = result.scalar_one_or_none()
    
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    # Get user count in this department
    user_count_result = await db.execute(
        select(func.count(User.id)).where(User.department_id == department_id)
    )
    user_count = user_count_result.scalar() or 0
    
    # Get active user count
    active_user_count_result = await db.execute(
        select(func.count(User.id)).where(
            and_(User.department_id == department_id, User.status == 'active')
        )
    )
    active_user_count = active_user_count_result.scalar() or 0
    
    # Get users in this department
    users_result = await db.execute(
        select(User)
        .where(User.department_id == department_id)
        .order_by(User.first_name, User.last_name)
    )
    users = users_result.scalars().all()
    
    # Get branches count (we'll implement branches later if needed)
    branch_count = 0
    branches = []
    
    # Get application count from users in this department
    from app.models import CustomerApplication
    app_count_result = await db.execute(
        select(func.count(CustomerApplication.id))
        .join(User, CustomerApplication.user_id == User.id)
        .where(User.department_id == department_id)
    )
    app_count = app_count_result.scalar() or 0
    
    # Build response
    department_data = {
        "id": str(department.id),
        "name": department.name,
        "code": department.code,
        "description": department.description,
        "manager_id": str(department.manager_id) if department.manager_id else None,
        "is_active": department.is_active,
        "created_at": department.created_at.isoformat(),
        "updated_at": department.updated_at.isoformat(),
        "user_count": user_count,
        "branch_count": branch_count,
        "active_user_count": active_user_count,
        "application_count": app_count,
        "manager": {
            "id": str(department.manager.id),
            "employee_code": department.manager.employee_code,
            "full_name_khmer": department.manager.full_name_khmer,
            "full_name_latin": department.manager.full_name_latin,
            "email": department.manager.email,
            "phone_number": department.manager.phone_number,
            "position": department.manager.position,
            "is_active": department.manager.is_active
        } if department.manager else None,
        "users": [
            {
                "id": str(user.id),
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "role": user.role,
                "status": user.status
            }
            for user in users
        ],
        "branches": branches
    }
    
    return department_data
