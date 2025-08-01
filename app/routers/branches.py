from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models import Branch, Department, User
from app.schemas import BranchCreate, BranchUpdate, BranchResponse, PaginatedResponse
from app.routers.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=BranchResponse)
async def create_branch(
    branch: BranchCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create branches"
        )
    
    # Check if branch name already exists
    result = await db.execute(
        select(Branch).where(Branch.name == branch.name)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Branch name already exists"
        )
    
    # Check if branch code already exists
    result = await db.execute(
        select(Branch).where(Branch.code == branch.code)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Branch code already exists"
        )
    

    
    db_branch = Branch(**branch.dict())
    db.add(db_branch)
    await db.commit()
    await db.refresh(db_branch)
    return BranchResponse.from_orm(db_branch)

@router.get("/", response_model=PaginatedResponse)
async def list_branches(
    search: Optional[str] = Query(None, description="Search in branch name"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Branch)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(Branch.name.ilike(search_term))
    
    # Count total
    count_result = await db.execute(select(Branch))
    total = len(count_result.scalars().all())
    
    # Apply pagination
    offset = (page - 1) * size
    query = query.order_by(desc(Branch.created_at)).offset(offset).limit(size)
    
    result = await db.execute(query)
    branches = result.scalars().all()
    
    return PaginatedResponse(
        items=[BranchResponse.from_orm(branch) for branch in branches],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size
    )

@router.get("/{branch_id}", response_model=BranchResponse)
async def get_branch(
    branch_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Branch).where(Branch.id == branch_id)
    )
    branch = result.scalar_one_or_none()
    
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found"
        )
    
    return BranchResponse.from_orm(branch)

@router.put("/{branch_id}", response_model=BranchResponse)
async def update_branch(
    branch_id: UUID,
    branch_update: BranchUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update branches"
        )
    
    result = await db.execute(
        select(Branch).where(Branch.id == branch_id)
    )
    branch = result.scalar_one_or_none()
    
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found"
        )
    
    update_data = branch_update.dict(exclude_unset=True)
    
    # Check if name is being updated and already exists
    if 'name' in update_data and update_data['name'] != branch.name:
        result = await db.execute(
            select(Branch).where(Branch.name == update_data['name'])
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Branch name already exists"
            )
    
    # Check if code is being updated and already exists
    if 'code' in update_data and update_data['code'] != branch.code:
        result = await db.execute(
            select(Branch).where(Branch.code == update_data['code'])
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Branch code already exists"
            )
    
    for field, value in update_data.items():
        setattr(branch, field, value)
    
    await db.commit()
    await db.refresh(branch)
    return BranchResponse.from_orm(branch)

@router.delete("/{branch_id}")
async def delete_branch(
    branch_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete branches"
        )
    
    result = await db.execute(
        select(Branch).where(Branch.id == branch_id)
    )
    branch = result.scalar_one_or_none()
    
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found"
        )
    
    await db.delete(branch)
    await db.commit()
    
    return {"message": "Branch deleted successfully"}