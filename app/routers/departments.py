from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from typing import List, Optional
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
):
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
    
    db_department = Department(**department.dict())
    db.add(db_department)
    await db.commit()
    await db.refresh(db_department)
    return DepartmentResponse.from_orm(db_department)

@router.get("/", response_model=PaginatedResponse)
async def list_departments(
    search: Optional[str] = Query(None, description="Search in department name"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Department)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(Department.name.ilike(search_term))
    
    # Count total
    count_result = await db.execute(select(Department))
    total = len(count_result.scalars().all())
    
    # Apply pagination
    offset = (page - 1) * size
    query = query.order_by(desc(Department.created_at)).offset(offset).limit(size)
    
    result = await db.execute(query)
    departments = result.scalars().all()
    
    return PaginatedResponse(
        items=[DepartmentResponse.from_orm(dept) for dept in departments],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size
    )

@router.get("/{department_id}", response_model=DepartmentResponse)
async def get_department(
    department_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
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

@router.put("/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: UUID,
    department_update: DepartmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
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
):
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