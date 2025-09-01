from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models import Folder, User, CustomerApplication
from app.schemas import FolderCreate, FolderUpdate, FolderResponse
from app.routers.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[FolderResponse])
async def list_folders(
    parent_id: Optional[UUID] = Query(None),
    application_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[FolderResponse]:
    query = select(Folder)
    if parent_id is None:
        query = query.where(Folder.parent_id.is_(None))
    else:
        query = query.where(Folder.parent_id == parent_id)
    if application_id is not None:
        query = query.where(Folder.application_id == application_id)

    result = await db.execute(query)
    folders = result.scalars().all()
    return [FolderResponse.from_orm(f) for f in folders]


@router.post("/", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
async def create_folder(
    payload: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> FolderResponse:
    # If folder is for an application, ensure user can access that application
    if payload.application_id is not None:
        app_res = await db.execute(select(CustomerApplication).where(CustomerApplication.id == payload.application_id))
        app_obj = app_res.scalar_one_or_none()
        if not app_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
        if current_user.role not in ["admin", "manager"] and app_obj.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to create folder for this application")

    folder = Folder(
        name=payload.name,
        parent_id=payload.parent_id,
        application_id=payload.application_id,
    )
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return FolderResponse.from_orm(folder)


@router.patch("/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: UUID,
    payload: FolderUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> FolderResponse:
    result = await db.execute(select(Folder).where(Folder.id == folder_id))
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(folder, field, value)

    await db.commit()
    await db.refresh(folder)
    return FolderResponse.from_orm(folder)


@router.delete("/{folder_id}")
async def delete_folder(
    folder_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    result = await db.execute(select(Folder).where(Folder.id == folder_id))
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    # Optional: enforce no children/files before delete
    # Authorization: if folder is tied to app, enforce access
    if folder.application_id is not None:
        app_res = await db.execute(select(CustomerApplication).where(CustomerApplication.id == folder.application_id))
        app_obj = app_res.scalar_one_or_none()
        if not app_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
        if current_user.role not in ["admin", "manager"] and app_obj.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete folder for this application")

    # TODO: optionally check children/files
    await db.delete(folder)
    await db.commit()
    return {"message": "Folder deleted"}


