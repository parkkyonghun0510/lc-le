from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
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
) -> BranchResponse:
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

    await db.flush()

    await db.refresh(db_branch)
    await db.refresh(db_branch)
    return BranchResponse.from_orm(db_branch)

@router.get("/", response_model=PaginatedResponse)
async def list_branches(
    search: Optional[str] = Query(None, description="Search in branch name, code, or address"),
    status: Optional[str] = Query(None, description="Filter by status (active/inactive)"),
    manager_id: Optional[UUID] = Query(None, description="Filter by manager ID"),
    sort_by: Optional[str] = Query("created_at", description="Sort by field (name, code, created_at)"),
    sort_order: Optional[str] = Query("desc", description="Sort order (asc/desc)"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> PaginatedResponse:
    # Build base query with relationships
    query = select(Branch).options(selectinload(Branch.manager))
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Branch.name.ilike(search_term),
                Branch.code.ilike(search_term),
                Branch.address.ilike(search_term)
            )
        )
    
    # Apply status filter
    if status:
        if status.lower() == "active":
            query = query.where(Branch.is_active == True)
        elif status.lower() == "inactive":
            query = query.where(Branch.is_active == False)
    
    # Apply manager filter
    if manager_id:
        query = query.where(Branch.manager_id == manager_id)
    
    # Build count query with same filters
    count_query = select(func.count(Branch.id))
    if search:
        search_term = f"%{search}%"
        count_query = count_query.where(
            or_(
                Branch.name.ilike(search_term),
                Branch.code.ilike(search_term),
                Branch.address.ilike(search_term)
            )
        )
    if status:
        if status.lower() == "active":
            count_query = count_query.where(Branch.is_active == True)
        elif status.lower() == "inactive":
            count_query = count_query.where(Branch.is_active == False)
    if manager_id:
        count_query = count_query.where(Branch.manager_id == manager_id)
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply sorting
    if sort_by == "name":
        order_field = Branch.name
    elif sort_by == "code":
        order_field = Branch.code
    else:
        order_field = Branch.created_at
    
    if sort_order.lower() == "asc":
        query = query.order_by(order_field)
    else:
        query = query.order_by(desc(order_field))
    
    # Apply pagination
    offset = (page - 1) * size
    query = query.offset(offset).limit(size)
    
    result = await db.execute(query)
    branches = result.scalars().all()
    
    return PaginatedResponse(
        items=[BranchResponse.from_orm(branch) for branch in branches],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size
    )

@router.get("/active", response_model=List[BranchResponse])
async def get_active_branches(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[BranchResponse]:
    """Get all active branches for dropdowns/selects"""
    result = await db.execute(
        select(Branch)
        .where(Branch.is_active == True)
        .order_by(Branch.name)
    )
    branches = result.scalars().all()
    return [BranchResponse.from_orm(branch) for branch in branches]

@router.get("/{branch_id}", response_model=BranchResponse)
async def get_branch(
    branch_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> BranchResponse:
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

@router.patch("/{branch_id}", response_model=BranchResponse)
async def partial_update_branch(
    branch_id: UUID,
    branch_update: BranchUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> BranchResponse:
    # Similar logic can be added here for partial updates if different from full updates
    return await update_branch(branch_id, branch_update, current_user, db)


@router.put("/{branch_id}", response_model=BranchResponse)
async def update_branch(
    branch_id: UUID,
    branch_update: BranchUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> BranchResponse:
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
) -> Dict[str, str]:
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

@router.patch("/{branch_id}/toggle-status")
async def toggle_branch_status(
    branch_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Toggle branch active/inactive status"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to change branch status"
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
    
    branch.is_active = not branch.is_active
    await db.commit()
    await db.refresh(branch)
    
    status_text = "activated" if branch.is_active else "deactivated"
    return {
        "message": f"Branch {status_text} successfully",
        "is_active": branch.is_active
    }

@router.get("/{branch_id}/stats")
async def get_branch_stats(
    branch_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get branch statistics"""
    # Check if branch exists
    result = await db.execute(
        select(Branch).where(Branch.id == branch_id)
    )
    branch = result.scalar_one_or_none()
    
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found"
        )
    
    # Get user count in this branch
    user_count_result = await db.execute(
        select(func.count(User.id)).where(User.branch_id == branch_id)
    )
    user_count = user_count_result.scalar() or 0
    
    # Get application count from users in this branch
    from app.models import CustomerApplication
    app_count_result = await db.execute(
        select(func.count(CustomerApplication.id))
        .join(User, CustomerApplication.user_id == User.id)
        .where(User.branch_id == branch_id)
    )
    app_count = app_count_result.scalar() or 0
    
    return {
        "branch_id": str(branch_id),
        "branch_name": branch.name,
        "user_count": user_count,
        "application_count": app_count,
        "is_active": branch.is_active
    }

@router.get("/{branch_id}/users", response_model=List[Dict[str, Any]])
async def get_branch_users(
    branch_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get users in a specific branch"""
    # Check if branch exists
    result = await db.execute(
        select(Branch).where(Branch.id == branch_id)
    )
    branch = result.scalar_one_or_none()
    
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found"
        )
    
    # Get users in this branch
    users_result = await db.execute(
        select(User)
        .where(User.branch_id == branch_id)
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
