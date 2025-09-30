from typing import List, Optional
from uuid import UUID
import math
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, update as sql_update, delete as sql_delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app import models, schemas
from app.database import get_db

router = APIRouter()

@router.post("/", response_model=schemas.PositionResponse, status_code=status.HTTP_201_CREATED)
async def create_position(
    position: schemas.PositionCreate,
    db: AsyncSession = Depends(get_db),
) -> schemas.PositionResponse:
    db_position = models.Position(**position.model_dump())
    db.add(db_position)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        # Unique constraint on name -> conflict
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Position with this name already exists",
        )
    await db.refresh(db_position)
    return db_position

# Updated to use async SQLAlchemy syntax
@router.get("/", response_model=schemas.PaginatedResponse)
async def read_positions(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    is_active: Optional[bool] = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> schemas.PaginatedResponse:
    try:
        print(f"DEBUG: Starting read_positions endpoint")
        print(f"DEBUG: Parameters - page: {page}, size: {size}, search: {search}, is_active: {is_active}")

        # Build base query
        stmt = select(models.Position)
        print(f"DEBUG: Created base query")

        # Filtering
        if search:
            stmt = stmt.where(models.Position.name.ilike(f"%{search}%"))
            print(f"DEBUG: Applied search filter: {search}")
        if is_active is not None:
            stmt = stmt.where(models.Position.is_active == is_active)
            print(f"DEBUG: Applied is_active filter: {is_active}")

        # Get total count
        print(f"DEBUG: About to count total")
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0
        print(f"DEBUG: Total count: {total}")

        # Apply pagination
        offset = (page - 1) * size
        stmt = stmt.offset(offset).limit(size)
        print(f"DEBUG: Applied pagination - offset: {offset}, limit: {size}")

        # Execute query with eager loading to prevent lazy loading issues
        print(f"DEBUG: About to execute main query")
        stmt = stmt.options(selectinload(models.Position.users))
        result = await db.execute(stmt)
        positions = result.scalars().all()
        print(f"DEBUG: Fetched {len(positions)} positions")

        # Convert SQLAlchemy models to Pydantic schemas using the safe from_orm method
        print(f"DEBUG: About to convert to schemas")
        position_schemas = [schemas.PositionResponse.from_orm(position) for position in positions]
        print(f"DEBUG: Converted {len(position_schemas)} position schemas")

        # Calculate total pages
        pages = math.ceil(total / size) if total > 0 else 1
        print(f"DEBUG: Calculated pages: {pages}")

        result_response = schemas.PaginatedResponse(
            items=position_schemas,
            total=total,
            page=page,
            size=size,
            pages=pages
        )
        print(f"DEBUG: Created response successfully")
        return result_response

    except Exception as e:
        print(f"DEBUG: Error in read_positions: {str(e)}")
        print(f"DEBUG: Error type: {type(e)}")
        import traceback
        print(f"DEBUG: Traceback: {traceback.format_exc()}")
        raise e

@router.get("/{position_id}", response_model=schemas.PositionResponse)
async def read_position(position_id: UUID, db: AsyncSession = Depends(get_db)) -> schemas.PositionResponse:
    result = await db.execute(
        select(models.Position)
        .options(selectinload(models.Position.users))
        .where(models.Position.id == position_id)
    )
    position = result.scalar_one_or_none()
    if position is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found")
    return schemas.PositionResponse.from_orm(position)

@router.patch("/{position_id}", response_model=schemas.PositionResponse)
async def update_position(
    position_id: UUID,
    position: schemas.PositionUpdate,
    db: AsyncSession = Depends(get_db),
) -> schemas.PositionResponse:
    # Fetch existing
    result = await db.execute(
        select(models.Position).where(models.Position.id == position_id)
    )
    db_position = result.scalar_one_or_none()
    if db_position is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found")

    for key, value in position.model_dump(exclude_unset=True).items():
        setattr(db_position, key, value)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Position with this name already exists",
        )
    await db.refresh(db_position)
    return db_position

@router.delete("/{position_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_position(position_id: UUID, db: AsyncSession = Depends(get_db)) -> None:
    result = await db.execute(
        select(models.Position).where(models.Position.id == position_id)
    )
    db_position = result.scalar_one_or_none()
    if db_position is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found")
    await db.delete(db_position)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        # Likely FK constraint from users.position_id
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete position because it is referenced by other records",
        )
    return