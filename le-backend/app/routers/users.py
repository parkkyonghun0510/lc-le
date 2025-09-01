from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserUpdate, UserResponse, PaginatedResponse
from app.routers.auth import get_current_user, get_password_hash
from app.services.async_validation_service import AsyncValidationService, DuplicateValidationError
from sqlalchemy.orm import selectinload

router = APIRouter()

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
        )
        .where(User.id == db_user.id)
    )
    db_user_loaded = result.scalar_one_or_none()
    return UserResponse.model_validate(db_user_loaded)

@router.get("/", response_model=PaginatedResponse)
async def list_users(
    role: Optional[str] = Query(None, description="Filter by role"),
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
        )
    )
    
    if role:
        query = query.where(User.role == role)
    
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
        )
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.model_validate(user)

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
    await db.refresh(user)
    return UserResponse.model_validate(user)

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
    await db.refresh(user)
    return UserResponse.model_validate(user)

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
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.from_orm(current_user)

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
    
    # Handle password update
    if 'password' in update_data and update_data['password']:
        update_data['password_hash'] = get_password_hash(update_data['password'])
        del update_data['password']
    
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return UserResponse.from_orm(user)

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
    
    # Handle password update
    if 'password' in update_data and update_data['password']:
        update_data['password_hash'] = get_password_hash(update_data['password'])
        del update_data['password']
    
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return UserResponse.from_orm(user)