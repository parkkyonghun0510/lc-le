from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone, date
import csv
import io

from app.database import get_db
from app.models import User, BulkOperation, Department, Branch, Position
from app.schemas import UserCreate, UserUpdate, UserResponse, PaginatedResponse, UserStatusChange, UserStatusChangeResponse, BulkStatusUpdate, BulkStatusUpdateResponse, CSVImportRequest, CSVImportResponse, CSVImportRowResult
from app.routers.auth import get_current_user, get_password_hash
from app.services.async_validation_service import AsyncValidationService, DuplicateValidationError
from app.services.activity_management_service import ActivityManagementService
from app.core.user_status import UserStatus, can_transition_status, get_allowed_transitions
from sqlalchemy.orm import selectinload

router = APIRouter()

async def validate_branch_assignments(db: AsyncSession, user_branch_id: Optional[UUID], portfolio_id: Optional[UUID], line_manager_id: Optional[UUID]):
    """Validate that portfolio and line managers are from the same branch as the user"""
    if not user_branch_id:
        return  # No branch assigned, skip validation
    
    # Check portfolio manager
    if portfolio_id:
        result = await db.execute(select(User).where(User.id == portfolio_id))
        portfolio_manager = result.scalar_one_or_none()
        if portfolio_manager and portfolio_manager.branch_id != user_branch_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Portfolio manager must be from the same branch"
            )
    
    # Check line manager
    if line_manager_id:
        result = await db.execute(select(User).where(User.id == line_manager_id))
        line_manager = result.scalar_one_or_none()
        if line_manager and line_manager.branch_id != user_branch_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Line manager must be from the same branch"
            )

@router.post("/", response_model=UserResponse)
async def create_user(
    user: UserCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create users"
        )
    
    # Use comprehensive validation service for duplicate checking
    try:
        validation_service = AsyncValidationService(db)
        await validation_service.validate_user_duplicates(user.dict())
    except DuplicateValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Validate branch-based assignments
    await validate_branch_assignments(db, user.branch_id, user.portfolio_id, user.line_manager_id)
    
    db_user = User(
        **user.dict(exclude={"password"}),
        password_hash=get_password_hash(user.password)
    )
    db.add(db_user)
    await db.commit()
    # Re-fetch with relationships eagerly loaded to avoid lazy IO during serialization
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position),
            selectinload(User.portfolio).options(
                selectinload(User.position),
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.portfolio),
                selectinload(User.line_manager)
            ),
            selectinload(User.line_manager).options(
                selectinload(User.position),
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.portfolio),
                selectinload(User.line_manager)
            ),
        )
        .where(User.id == db_user.id)
    )
    db_user_loaded = result.scalar_one_or_none()
    return UserResponse.model_validate(db_user_loaded)

@router.get("/", response_model=PaginatedResponse)
async def list_users(
    role: Optional[str] = Query(None, description="Filter by role"),
    branch_id: Optional[str] = Query(None, description="Filter by branch"),
    search: Optional[str] = Query(None, description="Search in username, email, or name"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to list users"
        )
    
    # Eager-load relationships to avoid lazy IO during Pydantic validation
    query = (
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position),
            selectinload(User.portfolio).options(
                selectinload(User.position),
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.portfolio),
                selectinload(User.line_manager)
            ),
            selectinload(User.line_manager).options(
                selectinload(User.position),
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.portfolio),
                selectinload(User.line_manager)
            ),
        )
    )
    
    if role:
        query = query.where(User.role == role)
    
    if branch_id:
        query = query.where(User.branch_id == branch_id)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            (User.username.ilike(search_term)) |
            (User.email.ilike(search_term)) |
            (User.first_name.ilike(search_term)) |
            (User.last_name.ilike(search_term))
        )
    
    # Count total with the same filters applied
    count_query = select(func.count()).select_from(User)
    if role:
        count_query = count_query.where(User.role == role)
    if branch_id:
        count_query = count_query.where(User.branch_id == branch_id)
    if search:
        search_term = f"%{search}%"
        count_query = count_query.where(
            (User.username.ilike(search_term)) |
            (User.email.ilike(search_term)) |
            (User.first_name.ilike(search_term)) |
            (User.last_name.ilike(search_term))
        )
    count_result = await db.execute(count_query)
    total = int(count_result.scalar() or 0)
    
    # Apply pagination
    offset = (page - 1) * size
    query = query.order_by(desc(User.created_at)).offset(offset).limit(size)
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return PaginatedResponse(
        items=[UserResponse.model_validate(user) for user in users],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size
    )

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role not in ["admin", "manager"] and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user"
        )
    
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position),
            selectinload(User.status_changed_by_user),
            selectinload(User.portfolio).options(
                selectinload(User.position),
                selectinload(User.department),
                selectinload(User.branch)
            ),
            selectinload(User.line_manager).options(
                selectinload(User.position),
                selectinload(User.department),
                selectinload(User.branch)
            )
        )
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Convert to dictionary and manually construct nested relationships
    # to avoid circular reference issues with deep nesting
    user_data = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone_number": user.phone_number,
        "role": user.role,
        "status": user.status,
        "status_reason": user.status_reason,
        "status_changed_at": user.status_changed_at,
        "status_changed_by": user.status_changed_by,
        "last_activity_at": user.last_activity_at,
        "login_count": user.login_count,
        "failed_login_attempts": user.failed_login_attempts,
        "onboarding_completed": user.onboarding_completed,
        "onboarding_completed_at": user.onboarding_completed_at,
        "department_id": user.department_id,
        "branch_id": user.branch_id,
        "position_id": user.position_id,
        "portfolio_id": user.portfolio_id,
        "line_manager_id": user.line_manager_id,
        "profile_image_url": user.profile_image_url,
        "employee_id": user.employee_id,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "last_login_at": user.last_login_at,
        "department": user.department,
        "branch": user.branch,
        "position": user.position,
        "status_changed_by_user": user.status_changed_by_user,
        "portfolio": None,
        "line_manager": None
    }
    
    # Manually construct portfolio relationship to avoid deep nesting
    if user.portfolio:
        user_data["portfolio"] = {
            "id": user.portfolio.id,
            "username": user.portfolio.username,
            "email": user.portfolio.email,
            "first_name": user.portfolio.first_name,
            "last_name": user.portfolio.last_name,
            "phone_number": user.portfolio.phone_number,
            "role": user.portfolio.role,
            "status": user.portfolio.status,
            "status_reason": user.portfolio.status_reason,
            "status_changed_at": user.portfolio.status_changed_at,
            "status_changed_by": user.portfolio.status_changed_by,
            "last_activity_at": user.portfolio.last_activity_at,
            "login_count": user.portfolio.login_count,
            "failed_login_attempts": user.portfolio.failed_login_attempts,
            "onboarding_completed": user.portfolio.onboarding_completed,
            "onboarding_completed_at": user.portfolio.onboarding_completed_at,
            "department_id": user.portfolio.department_id,
            "branch_id": user.portfolio.branch_id,
            "position_id": user.portfolio.position_id,
            "portfolio_id": user.portfolio.portfolio_id,
            "line_manager_id": user.portfolio.line_manager_id,
            "profile_image_url": user.portfolio.profile_image_url,
            "employee_id": user.portfolio.employee_id,
            "created_at": user.portfolio.created_at,
            "updated_at": user.portfolio.updated_at,
            "last_login_at": user.portfolio.last_login_at,
            "department": user.portfolio.department,
            "branch": user.portfolio.branch,
            "position": user.portfolio.position,
            "portfolio": None,  # Avoid infinite nesting
            "line_manager": None,  # Avoid infinite nesting
            "status_changed_by_user": None
        }
    
    # Manually construct line_manager relationship to avoid deep nesting
    if user.line_manager:
        user_data["line_manager"] = {
            "id": user.line_manager.id,
            "username": user.line_manager.username,
            "email": user.line_manager.email,
            "first_name": user.line_manager.first_name,
            "last_name": user.line_manager.last_name,
            "phone_number": user.line_manager.phone_number,
            "role": user.line_manager.role,
            "status": user.line_manager.status,
            "status_reason": user.line_manager.status_reason,
            "status_changed_at": user.line_manager.status_changed_at,
            "status_changed_by": user.line_manager.status_changed_by,
            "last_activity_at": user.line_manager.last_activity_at,
            "login_count": user.line_manager.login_count,
            "failed_login_attempts": user.line_manager.failed_login_attempts,
            "onboarding_completed": user.line_manager.onboarding_completed,
            "onboarding_completed_at": user.line_manager.onboarding_completed_at,
            "department_id": user.line_manager.department_id,
            "branch_id": user.line_manager.branch_id,
            "position_id": user.line_manager.position_id,
            "portfolio_id": user.line_manager.portfolio_id,
            "line_manager_id": user.line_manager.line_manager_id,
            "profile_image_url": user.line_manager.profile_image_url,
            "employee_id": user.line_manager.employee_id,
            "created_at": user.line_manager.created_at,
            "updated_at": user.line_manager.updated_at,
            "last_login_at": user.line_manager.last_login_at,
            "department": user.line_manager.department,
            "branch": user.line_manager.branch,
            "position": user.line_manager.position,
            "portfolio": None,  # Avoid infinite nesting
            "line_manager": None,  # Avoid infinite nesting
            "status_changed_by_user": None
        }
    
    return UserResponse.model_validate(user_data)

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    if current_user.role not in ["admin", "manager"] and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user"
        )
    
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position),
            selectinload(User.portfolio).options(
                selectinload(User.position),
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.portfolio),
                selectinload(User.line_manager)
            ),
            selectinload(User.line_manager).options(
                selectinload(User.position),
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.portfolio),
                selectinload(User.line_manager)
            ),
        )
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    update_data = user_update.dict(exclude_unset=True)
    
    # Use comprehensive validation service for duplicate checking
    if update_data:  # Only validate if there's data to update
        try:
            validation_service = AsyncValidationService(db)
            await validation_service.validate_user_duplicates(update_data, exclude_id=user_id)
        except DuplicateValidationError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    
    # Handle password update
    if 'password' in update_data and update_data['password']:
        update_data['password_hash'] = get_password_hash(update_data['password'])
        del update_data['password']
    
    for field, value in update_data.items():
        setattr(user, field, value)
    
    await db.commit()
    # Re-fetch with relationships eagerly loaded
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position),
            selectinload(User.portfolio).options(
                selectinload(User.position),
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.portfolio),
                selectinload(User.line_manager)
            ),
            selectinload(User.line_manager).options(
                selectinload(User.position),
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.portfolio),
                selectinload(User.line_manager)
            ),
        )
        .where(User.id == user.id)
    )
    user_loaded = result.scalar_one_or_none()
    
    # Ensure all relationships are loaded before validation
    _ = user_loaded.department
    _ = user_loaded.branch
    _ = user_loaded.position
    _ = user_loaded.portfolio
    _ = user_loaded.line_manager
    
    return UserResponse.model_validate(user_loaded)

@router.patch("/{user_id}", response_model=UserResponse)
async def patch_user(
    user_id: UUID,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    if current_user.role not in ["admin", "manager"] and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user"
        )
    
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position),
            selectinload(User.portfolio).options(
                selectinload(User.position),
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.portfolio),
                selectinload(User.line_manager)
            ),
            selectinload(User.line_manager).options(
                selectinload(User.position),
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.portfolio),
                selectinload(User.line_manager)
            ),
        )
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    update_data = user_update.dict(exclude_unset=True)
    
    # Use comprehensive validation service for duplicate checking
    if update_data:  # Only validate if there's data to update
        try:
            validation_service = AsyncValidationService(db)
            await validation_service.validate_user_duplicates(update_data, exclude_id=user_id)
        except DuplicateValidationError as e:
            raise HTTPException(
                 status_code=status.HTTP_400_BAD_REQUEST,
                 detail=str(e)
             )
    
    # Validate branch-based assignments
    branch_id = update_data.get('branch_id', user.branch_id)
    portfolio_id = update_data.get('portfolio_id', user.portfolio_id)
    line_manager_id = update_data.get('line_manager_id', user.line_manager_id)
    await validate_branch_assignments(db, branch_id, portfolio_id, line_manager_id)
    
    # Handle password update
    if 'password' in update_data and update_data['password']:
        update_data['password_hash'] = get_password_hash(update_data['password'])
        del update_data['password']
    
    for field, value in update_data.items():
        setattr(user, field, value)
    
    await db.commit()
    # Re-fetch with relationships eagerly loaded
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position),
            selectinload(User.portfolio).options(
                selectinload(User.position),
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.portfolio),
                selectinload(User.line_manager)
            ),
            selectinload(User.line_manager).options(
                selectinload(User.position),
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.portfolio),
                selectinload(User.line_manager)
            ),
        )
        .where(User.id == user.id)
    )
    user_loaded = result.scalar_one_or_none()
    
    # Ensure all relationships are loaded before validation
    _ = user_loaded.department
    _ = user_loaded.branch
    _ = user_loaded.position
    _ = user_loaded.portfolio
    _ = user_loaded.line_manager
    
    return UserResponse.model_validate(user_loaded)

@router.delete("/{user_id}")
async def delete_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete users"
        )
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    await db.delete(user)
    await db.commit()
    
    return {"message": "User deleted successfully"}

# --- /users/me endpoints ---
from fastapi import Body

@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position),
            selectinload(User.portfolio).options(
                selectinload(User.position),
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.portfolio),
                selectinload(User.line_manager)
            ),
            selectinload(User.line_manager).options(
                selectinload(User.position),
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.portfolio),
                selectinload(User.line_manager)
            ),
        )
        .where(User.id == current_user.id)
    )
    user = result.scalar_one_or_none()
    
    # Ensure all relationships are loaded before validation
    _ = user.department
    _ = user.branch
    _ = user.position
    _ = user.portfolio
    _ = user.line_manager
    
    return UserResponse.model_validate(user)

@router.patch("/me", response_model=UserResponse)
async def patch_me(
    user_update: UserUpdate = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    # Only allow user to update their own profile
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.dict(exclude_unset=True)
    
    # Use comprehensive validation service for duplicate checking
    if update_data:  # Only validate if there's data to update
        try:
            validation_service = AsyncValidationService(db)
            await validation_service.validate_user_duplicates(update_data, exclude_id=current_user.id)
        except DuplicateValidationError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    
    # Validate branch-based assignments for profile updates
    branch_id = update_data.get('branch_id', user.branch_id)
    portfolio_id = update_data.get('portfolio_id', user.portfolio_id)
    line_manager_id = update_data.get('line_manager_id', user.line_manager_id)
    await validate_branch_assignments(db, branch_id, portfolio_id, line_manager_id)
    
    # Handle password update
    if 'password' in update_data and update_data['password']:
        update_data['password_hash'] = get_password_hash(update_data['password'])
        del update_data['password']
    
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.commit()
    # Re-fetch with relationships eagerly loaded
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position),
            selectinload(User.portfolio).options(
                selectinload(User.position),
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.portfolio),
                selectinload(User.line_manager)
            ),
            selectinload(User.line_manager).options(
                selectinload(User.position),
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.portfolio),
                selectinload(User.line_manager)
            ),
        )
        .where(User.id == user.id)
    )
    user_loaded = result.scalar_one_or_none()
    
    # Ensure all relationships are loaded before validation
    _ = user_loaded.department
    _ = user_loaded.branch
    _ = user_loaded.position
    _ = user_loaded.portfolio
    _ = user_loaded.line_manager
    
    return UserResponse.model_validate(user_loaded)

@router.put("/me", response_model=UserResponse)
async def put_me(
    user_update: UserUpdate = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    # Only allow user to replace their own profile
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.dict()
    
    # Use comprehensive validation service for duplicate checking
    if update_data:  # Only validate if there's data to update
        try:
            validation_service = AsyncValidationService(db)
            await validation_service.validate_user_duplicates(update_data, exclude_id=current_user.id)
        except DuplicateValidationError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    
    # Validate branch-based assignments for profile updates
    branch_id = update_data.get('branch_id', user.branch_id)
    portfolio_id = update_data.get('portfolio_id', user.portfolio_id)
    line_manager_id = update_data.get('line_manager_id', user.line_manager_id)
    await validate_branch_assignments(db, branch_id, portfolio_id, line_manager_id)
    
    # Handle password update
    if 'password' in update_data and update_data['password']:
        update_data['password_hash'] = get_password_hash(update_data['password'])
        del update_data['password']
    
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.commit()
    # Re-fetch with relationships eagerly loaded
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position),
            selectinload(User.portfolio).options(
                selectinload(User.position),
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.portfolio),
                selectinload(User.line_manager)
            ),
            selectinload(User.line_manager).options(
                selectinload(User.position),
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.portfolio),
                selectinload(User.line_manager)
            ),
        )
        .where(User.id == user.id)
    )
    user_loaded = result.scalar_one_or_none()
    
    # Ensure all relationships are loaded before validation
    _ = user_loaded.department
    _ = user_loaded.branch
    _ = user_loaded.position
    _ = user_loaded.portfolio
    _ = user_loaded.line_manager
    
    return UserResponse.model_validate(user_loaded)

# Status management endpoints
@router.post("/{user_id}/status", response_model=UserStatusChangeResponse)
async def change_user_status(
    user_id: UUID,
    status_change: UserStatusChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> UserStatusChangeResponse:
    """Change user status with validation and audit trail"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to change user status"
        )
    
    # Get the target user
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    old_status = target_user.status
    new_status = status_change.status
    
    # Validate status transition
    if not can_transition_status(old_status, new_status):
        allowed = get_allowed_transitions(old_status)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from '{old_status}' to '{new_status}'. Allowed transitions: {allowed}"
        )
    
    # Update user status with tracking fields
    now = datetime.now(timezone.utc)
    target_user.status = new_status
    target_user.status_reason = status_change.reason
    target_user.status_changed_at = now
    target_user.status_changed_by = current_user.id
    
    await db.commit()
    
    # Return status change response
    return UserStatusChangeResponse(
        user_id=user_id,
        old_status=old_status,
        new_status=new_status,
        reason=status_change.reason,
        changed_by=current_user.id,
        changed_at=now,
        allowed_transitions=get_allowed_transitions(new_status)
    )

@router.get("/{user_id}/status/transitions", response_model=List[str])
async def get_allowed_status_transitions(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[str]:
    """Get allowed status transitions for a user"""
    if current_user.role not in ["admin", "manager"] and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view user status transitions"
        )
    
    # Get the target user
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return get_allowed_transitions(target_user.status)

@router.get("/export/csv")
async def export_users_csv(
    role: Optional[str] = Query(None),
    branch_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Export users to CSV format"""
    from fastapi.responses import StreamingResponse
    import csv
    import io
    
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to export user data"
        )
    
    # Build query with eager loading
    query = select(User).options(
        selectinload(User.department),
        selectinload(User.branch),
        selectinload(User.position),
        selectinload(User.portfolio),
        selectinload(User.line_manager),
        selectinload(User.status_changed_by_user)
    )
    
    # Apply filters
    if role:
        query = query.where(User.role == role)
    if branch_id:
        query = query.where(User.branch_id == branch_id)
    if department_id:
        query = query.where(User.department_id == department_id)
    if status_filter:
        query = query.where(User.status == status_filter)
    if date_from:
        query = query.where(User.created_at >= date_from)
    if date_to:
        query = query.where(User.created_at <= date_to)
    
    # Role-based filtering for managers
    if current_user.role == "manager":
        if current_user.department_id:
            query = query.where(User.department_id == current_user.department_id)
        elif current_user.branch_id:
            query = query.where(User.branch_id == current_user.branch_id)
    
    # Order by creation date
    query = query.order_by(desc(User.created_at))
    
    # Execute query
    result = await db.execute(query)
    users = result.scalars().all()
    
    # Create CSV content
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'Employee ID',
        'Username',
        'Email',
        'First Name',
        'Last Name',
        'Phone Number',
        'Role',
        'Status',
        'Status Reason',
        'Department',
        'Branch',
        'Position',
        'Portfolio Manager',
        'Line Manager',
        'Last Login',
        'Login Count',
        'Created At',
        'Updated At'
    ])
    
    # Write data rows
    for user in users:
        writer.writerow([
            user.employee_id or '',
            user.username,
            user.email,
            user.first_name,
            user.last_name,
            user.phone_number or '',
            user.role,
            user.status,
            user.status_reason or '',
            user.department.name if user.department else '',
            user.branch.name if user.branch else '',
            user.position.name if user.position else '',
            f"{user.portfolio.first_name} {user.portfolio.last_name}" if user.portfolio else '',
            f"{user.line_manager.first_name} {user.line_manager.last_name}" if user.line_manager else '',
            user.last_login_at.isoformat() if user.last_login_at else '',
            str(user.login_count or 0),
            user.created_at.isoformat() if user.created_at else '',
            user.updated_at.isoformat() if user.updated_at else ''
        ])
    
    output.seek(0)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"users_export_{timestamp}.csv"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type='text/csv',
        headers={'Content-Disposition': f'attachment; filename={filename}'}
    )

@router.post("/bulk/status", response_model=BulkStatusUpdateResponse)
async def bulk_update_user_status(
    bulk_update: BulkStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> BulkStatusUpdateResponse:
    """Bulk update user status with validation and audit trail"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform bulk status updates"
        )
    
    # Validate that all user IDs exist and get current statuses
    query = select(User).where(User.id.in_(bulk_update.user_ids))
    result = await db.execute(query)
    users = result.scalars().all()
    
    if len(users) != len(bulk_update.user_ids):
        found_ids = {user.id for user in users}
        missing_ids = set(bulk_update.user_ids) - found_ids
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Users not found: {list(missing_ids)}"
        )
    
    # Create bulk operation record
    bulk_operation = BulkOperation(
        operation_type="status_update",
        performed_by=current_user.id,
        target_criteria={
            "user_ids": [str(uid) for uid in bulk_update.user_ids],
            "filters": "manual_selection"
        },
        changes_applied={
            "new_status": bulk_update.status,
            "reason": bulk_update.reason
        },
        total_records=len(users),
        status="processing"
    )
    db.add(bulk_operation)
    await db.commit()
    await db.refresh(bulk_operation)
    
    # Process each user
    successful_updates = []
    failed_updates = []
    now = datetime.now(timezone.utc)
    
    try:
        for user in users:
            try:
                old_status = user.status
                new_status = bulk_update.status
                
                # Validate status transition
                if not can_transition_status(old_status, new_status):
                    failed_updates.append({
                        "user_id": str(user.id),
                        "username": user.username,
                        "error": f"Cannot transition from '{old_status}' to '{new_status}'",
                        "allowed_transitions": get_allowed_transitions(old_status)
                    })
                    continue
                
                # Update user status
                user.status = new_status
                user.status_reason = bulk_update.reason
                user.status_changed_at = now
                user.status_changed_by = current_user.id
                
                # Create successful update record
                successful_updates.append(UserStatusChangeResponse(
                    user_id=user.id,
                    old_status=old_status,
                    new_status=new_status,
                    reason=bulk_update.reason,
                    changed_by=current_user.id,
                    changed_at=now,
                    allowed_transitions=get_allowed_transitions(new_status)
                ))
                
            except Exception as e:
                failed_updates.append({
                    "user_id": str(user.id),
                    "username": user.username,
                    "error": str(e)
                })
        
        # Update bulk operation record
        bulk_operation.successful_records = len(successful_updates)
        bulk_operation.failed_records = len(failed_updates)
        bulk_operation.status = "completed" if len(failed_updates) == 0 else "partial_failure"
        bulk_operation.completed_at = now
        
        if failed_updates:
            bulk_operation.error_details = {"failed_users": failed_updates}
        
        await db.commit()
        
        return BulkStatusUpdateResponse(
            operation_id=bulk_operation.id,
            total_users=len(users),
            successful_updates=len(successful_updates),
            failed_updates=len(failed_updates),
            status=bulk_operation.status,
            errors=failed_updates if failed_updates else None,
            updated_users=successful_updates,
            failed_users=failed_updates
        )
        
    except Exception as e:
        # Mark operation as failed
        bulk_operation.status = "failed"
        bulk_operation.error_details = {"error": str(e)}
        bulk_operation.completed_at = now
        await db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk operation failed: {str(e)}"
        )

@router.get("/activity/dormant")
async def get_dormant_users(
    inactive_days: int = Query(90, description="Days of inactivity to consider dormant"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get list of dormant users based on inactivity period"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view dormant user analysis"
        )
    
    activity_service = ActivityManagementService(db)
    dormant_users = await activity_service.detect_dormant_users(
        inactive_days=inactive_days,
        exclude_roles=['admin'] if current_user.role == 'manager' else []
    )
    
    return {
        "dormant_users": dormant_users,
        "total_dormant": len(dormant_users),
        "inactive_days_threshold": inactive_days,
        "analysis_date": datetime.now(timezone.utc).isoformat()
    }

@router.post("/activity/auto-update-dormant")
async def auto_update_dormant_users(
    inactive_days: int = Query(90, description="Days of inactivity threshold"),
    new_status: str = Query("inactive", description="Status to assign to dormant users"),
    reason: str = Query("Automatically marked inactive due to prolonged inactivity", description="Reason for status change"),
    dry_run: bool = Query(True, description="If true, only simulate the operation"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Automatically update status of dormant users"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform automated status updates"
        )
    
    activity_service = ActivityManagementService(db)
    
    # First detect dormant users
    dormant_users = await activity_service.detect_dormant_users(
        inactive_days=inactive_days
    )
    
    if not dormant_users:
        return {
            "message": "No dormant users found",
            "dormant_users_found": 0,
            "dry_run": dry_run
        }
    
    # Perform the update (or simulation)
    result = await activity_service.auto_update_dormant_users(
        dormant_users=dormant_users,
        new_status=new_status,
        reason=reason,
        performed_by_id=current_user.id,
        dry_run=dry_run
    )
    
    return result

@router.get("/activity/summary")
async def get_activity_summary(
    days: int = Query(30, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user activity summary and statistics"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view activity summary"
        )
    
    activity_service = ActivityManagementService(db)
    summary = await activity_service.get_activity_summary(days=days)
    
    return summary


# CSV Import/Export helper functions
async def lookup_reference_data(db: AsyncSession):
    """Lookup reference data for CSV import validation"""
    # Get all departments
    dept_result = await db.execute(select(Department))
    departments = {dept.name.lower(): dept.id for dept in dept_result.scalars().all()}
    
    # Get all branches
    branch_result = await db.execute(select(Branch))
    branches = {branch.name.lower(): branch.id for branch in branch_result.scalars().all()}
    
    # Get all positions
    position_result = await db.execute(select(Position))
    positions = {pos.name.lower(): pos.id for pos in position_result.scalars().all()}
    
    # Get all users for manager lookups (keyed by full name)
    user_result = await db.execute(select(User))
    users_by_name = {f"{user.first_name} {user.last_name}".lower(): user.id for user in user_result.scalars().all()}
    
    return {
        'departments': departments,
        'branches': branches,
        'positions': positions,
        'users_by_name': users_by_name
    }


async def validate_csv_row(row_data: dict, row_number: int, reference_data: dict, import_mode: str, db: AsyncSession) -> CSVImportRowResult:
    """Validate a single CSV row and determine action"""
    result = CSVImportRowResult(
        row_number=row_number,
        action='failed',
        errors=[],
        warnings=[]
    )
    
    try:
        # Extract key fields
        email = row_data.get('Email', '').strip()
        employee_id = row_data.get('Employee ID', '').strip()
        username = row_data.get('Username', '').strip()
        
        if not email:
            result.errors.append("Email is required")
            return result
        
        if not username:
            result.errors.append("Username is required")
            return result
        
        result.email = email
        result.username = username
        result.employee_id = employee_id if employee_id else None
        
        # Check if user exists (by email or employee_id)
        existing_user = None
        if employee_id:
            user_result = await db.execute(
                select(User).where(User.employee_id == employee_id)
            )
            existing_user = user_result.scalar_one_or_none()
        
        if not existing_user:
            user_result = await db.execute(
                select(User).where(User.email == email)
            )
            existing_user = user_result.scalar_one_or_none()
        
        if existing_user:
            result.user_id = existing_user.id
            if import_mode == 'create_only':
                result.action = 'skipped'
                result.warnings.append(f"User already exists with email {email}")
                return result
            else:
                result.action = 'updated'
        else:
            if import_mode == 'update_only':
                result.action = 'skipped'
                result.warnings.append(f"User not found for update with email {email}")
                return result
            else:
                result.action = 'created'
        
        # Validate required fields for new users
        if result.action == 'created':
            required_fields = ['First Name', 'Last Name', 'Role']
            for field in required_fields:
                if not row_data.get(field, '').strip():
                    result.errors.append(f"{field} is required for new users")
        
        # Validate role
        role = row_data.get('Role', '').strip().lower()
        valid_roles = ['admin', 'manager', 'officer']
        if role and role not in valid_roles:
            result.errors.append(f"Invalid role '{role}'. Must be one of: {', '.join(valid_roles)}")
        
        # Validate status
        status_value = row_data.get('Status', '').strip().lower()
        if status_value:
            try:
                UserStatus(status_value)
            except ValueError:
                result.errors.append(f"Invalid status '{status_value}'. Must be one of: {', '.join([s.value for s in UserStatus])}")
        
        # Validate department
        dept_name = row_data.get('Department', '').strip().lower()
        if dept_name and dept_name not in reference_data['departments']:
            result.errors.append(f"Department '{dept_name}' not found")
        
        # Validate branch
        branch_name = row_data.get('Branch', '').strip().lower()
        if branch_name and branch_name not in reference_data['branches']:
            result.errors.append(f"Branch '{branch_name}' not found")
        
        # Validate position
        position_name = row_data.get('Position', '').strip().lower()
        if position_name and position_name not in reference_data['positions']:
            result.errors.append(f"Position '{position_name}' not found")
        
        # Validate portfolio manager
        portfolio_manager = row_data.get('Portfolio Manager', '').strip().lower()
        if portfolio_manager and portfolio_manager not in reference_data['users_by_name']:
            result.warnings.append(f"Portfolio manager '{portfolio_manager}' not found")
        
        # Validate line manager
        line_manager = row_data.get('Line Manager', '').strip().lower()
        if line_manager and line_manager not in reference_data['users_by_name']:
            result.warnings.append(f"Line manager '{line_manager}' not found")
        
        # If no errors, mark as ready for processing
        if not result.errors:
            if result.action == 'skipped':
                pass  # Already set
            else:
                # Keep the action as 'created' or 'updated'
                pass
        else:
            result.action = 'failed'
    
    except Exception as e:
        result.errors.append(f"Validation error: {str(e)}")
        result.action = 'failed'
    
    return result


async def process_csv_row(row_data: dict, row_result: CSVImportRowResult, reference_data: dict, current_user: User, db: AsyncSession) -> CSVImportRowResult:
    """Process a single CSV row for import"""
    if row_result.action in ['failed', 'skipped']:
        return row_result
    
    try:
        # Prepare user data
        user_data = {
            'username': row_data.get('Username', '').strip(),
            'email': row_data.get('Email', '').strip(),
            'first_name': row_data.get('First Name', '').strip(),
            'last_name': row_data.get('Last Name', '').strip(),
            'phone_number': row_data.get('Phone Number', '').strip() or None,
            'role': row_data.get('Role', '').strip().lower(),
            'status': row_data.get('Status', '').strip().lower() or 'active',
            'status_reason': row_data.get('Status Reason', '').strip() or None,
        }
        
        # Add employee_id if provided
        employee_id = row_data.get('Employee ID', '').strip()
        if employee_id:
            user_data['employee_id'] = employee_id
        
        # Resolve foreign key relationships
        dept_name = row_data.get('Department', '').strip().lower()
        if dept_name:
            user_data['department_id'] = reference_data['departments'].get(dept_name)
        
        branch_name = row_data.get('Branch', '').strip().lower()
        if branch_name:
            user_data['branch_id'] = reference_data['branches'].get(branch_name)
        
        position_name = row_data.get('Position', '').strip().lower()
        if position_name:
            user_data['position_id'] = reference_data['positions'].get(position_name)
        
        portfolio_manager = row_data.get('Portfolio Manager', '').strip().lower()
        if portfolio_manager:
            user_data['portfolio_id'] = reference_data['users_by_name'].get(portfolio_manager)
        
        line_manager = row_data.get('Line Manager', '').strip().lower()
        if line_manager:
            user_data['line_manager_id'] = reference_data['users_by_name'].get(line_manager)
        
        if row_result.action == 'created':
            # Create new user
            if 'password' not in user_data:
                user_data['password_hash'] = get_password_hash('defaultpassword123')  # Default password
                row_result.warnings.append("Default password 'defaultpassword123' assigned - user should change on first login")
            
            db_user = User(**user_data)
            db.add(db_user)
            await db.flush()  # Get the ID without committing
            
            row_result.user_id = db_user.id
            row_result.username = db_user.username
            row_result.email = db_user.email
            
        elif row_result.action == 'updated':
            # Update existing user
            user_result = await db.execute(
                select(User).where(User.id == row_result.user_id)
            )
            existing_user = user_result.scalar_one()
            
            # Update fields (excluding sensitive ones)
            update_fields = ['first_name', 'last_name', 'phone_number', 'role', 'status', 'status_reason', 
                           'department_id', 'branch_id', 'position_id', 'portfolio_id', 'line_manager_id']
            
            for field in update_fields:
                if field in user_data and user_data[field] is not None:
                    setattr(existing_user, field, user_data[field])
            
            # Update status tracking fields
            if 'status' in user_data:
                existing_user.status_changed_at = datetime.now(timezone.utc)
                existing_user.status_changed_by = current_user.id
            
            row_result.username = existing_user.username
            row_result.email = existing_user.email
    
    except Exception as e:
        row_result.action = 'failed'
        row_result.errors.append(f"Processing error: {str(e)}")
    
    return row_result


@router.post("/import/csv", response_model=CSVImportResponse)
async def import_users_csv(
    file: UploadFile = File(...),
    import_mode: str = "create_and_update",
    preview_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Import users from CSV file"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to import user data"
        )
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV format"
        )
    
    # Validate import mode
    valid_modes = ['create_only', 'update_only', 'create_and_update']
    if import_mode not in valid_modes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid import mode. Must be one of: {', '.join(valid_modes)}"
        )
    
    # Create bulk operation record
    bulk_operation = BulkOperation(
        operation_type="csv_import",
        performed_by=current_user.id,
        target_criteria={
            "filename": file.filename,
            "import_mode": import_mode,
            "preview_only": preview_only
        },
        status="processing"
    )
    db.add(bulk_operation)
    await db.flush()
    
    try:
        # Read CSV content
        content = await file.read()
        csv_content = content.decode('utf-8')
        
        # Parse CSV
        csv_reader = csv.DictReader(io.StringIO(csv_content))
        rows = list(csv_reader)
        
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV file is empty or has no data rows"
            )
        
        # Validate CSV headers
        expected_headers = [
            'Employee ID', 'Username', 'Email', 'First Name', 'Last Name', 'Phone Number',
            'Role', 'Status', 'Status Reason', 'Department', 'Branch', 'Position',
            'Portfolio Manager', 'Line Manager'
        ]
        
        missing_headers = [h for h in expected_headers if h not in (csv_reader.fieldnames or [])]
        if missing_headers:
            bulk_operation.status = "failed"
            bulk_operation.error_details = {"missing_headers": missing_headers}
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required CSV headers: {', '.join(missing_headers)}"
            )
        
        # Get reference data for validation
        reference_data = await lookup_reference_data(db)
        
        # Process rows
        results = []
        successful_imports = 0
        failed_imports = 0
        skipped_rows = 0
        
        for i, row in enumerate(rows, 1):
            # Validate row
            row_result = await validate_csv_row(row, i, reference_data, import_mode, db)
            
            # Process row if not in preview mode and validation passed
            if not preview_only and row_result.action in ['created', 'updated']:
                row_result = await process_csv_row(row, row_result, reference_data, current_user, db)
            
            results.append(row_result)
            
            # Update counters
            if row_result.action == 'failed':
                failed_imports += 1
            elif row_result.action == 'skipped':
                skipped_rows += 1
            else:
                successful_imports += 1
        
        # Commit changes if not preview mode
        if not preview_only:
            await db.commit()
        
        # Update bulk operation record
        bulk_operation.total_records = len(rows)
        bulk_operation.successful_records = successful_imports
        bulk_operation.failed_records = failed_imports
        bulk_operation.status = "completed" if failed_imports == 0 else "partial_failure"
        bulk_operation.completed_at = datetime.now(timezone.utc)
        
        if failed_imports > 0:
            failed_results = [r for r in results if r.action == 'failed']
            bulk_operation.error_details = {
                "failed_rows": len(failed_results),
                "sample_errors": failed_results[:5]  # First 5 failures
            }
        
        # Final commit for bulk operation
        await db.commit()
        
        return CSVImportResponse(
            operation_id=bulk_operation.id,
            total_rows=len(rows),
            successful_imports=successful_imports,
            failed_imports=failed_imports,
            skipped_rows=skipped_rows,
            status=bulk_operation.status,
            preview_mode=preview_only,
            import_mode=import_mode,
            results=results,
            summary={
                "created": len([r for r in results if r.action == 'created']),
                "updated": len([r for r in results if r.action == 'updated']),
                "skipped": skipped_rows,
                "failed": failed_imports
            },
            created_at=bulk_operation.created_at,
            completed_at=bulk_operation.completed_at
        )
    
    except Exception as e:
        # Mark operation as failed
        bulk_operation.status = "failed"
        bulk_operation.error_details = {"error": str(e)}
        bulk_operation.completed_at = datetime.now(timezone.utc)
        await db.commit()
        
        if isinstance(e, HTTPException):
            raise e
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"CSV import failed: {str(e)}"
        )


@router.get("/export/csv/template")
async def download_csv_template(
    current_user: User = Depends(get_current_user)
):
    """Download CSV template for user import"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to download CSV template"
        )
    
    from fastapi.responses import StreamingResponse
    
    # Create template CSV content
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'Employee ID',
        'Username',
        'Email',
        'First Name',
        'Last Name',
        'Phone Number',
        'Role',
        'Status',
        'Status Reason',
        'Department',
        'Branch',
        'Position',
        'Portfolio Manager',
        'Line Manager'
    ])
    
    # Write example row
    writer.writerow([
        'EMP001',
        'john.doe',
        'john.doe@company.com',
        'John',
        'Doe',
        '+855123456789',
        'officer',
        'active',
        '',
        'Sales',
        'Phnom Penh',
        'Loan Officer',
        'Jane Smith',
        'Bob Manager'
    ])
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename=user_import_template.csv'}
    )
