from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func
from typing import List, Optional
from uuid import UUID
import uuid
import os
from datetime import datetime

from app.database import get_db
from app.models import File, User, CustomerApplication, Folder
from app.schemas import FileCreate, FileResponse, PaginatedResponse, FileFinalize
from app.routers.auth import get_current_user
from app.services.minio_service import minio_service
from app.core.config import settings

router = APIRouter()

@router.post("/upload", response_model=FileResponse)
async def upload_file(
    file: UploadFile = File(),
    application_id: Optional[UUID] = None,
    folder_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided"
        )
    
    # Authorization: if attaching to application, ensure user can access it
    if application_id is not None:
        app_q = await db.execute(select(CustomerApplication).where(CustomerApplication.id == application_id))
        app_obj = app_q.scalar_one_or_none()
        if not app_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
        if current_user.role not in ["admin", "manager"] and app_obj.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to attach to this application")

    if folder_id is not None:
        folder_q = await db.execute(select(Folder).where(Folder.id == folder_id))
        folder_obj = folder_q.scalar_one_or_none()
        if not folder_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
        # If folder is bound to an application, check same access
        if folder_obj.application_id:
            app_q = await db.execute(select(CustomerApplication).where(CustomerApplication.id == folder_obj.application_id))
            app_obj = app_q.scalar_one_or_none()
            if not app_obj:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
            if current_user.role not in ["admin", "manager"] and app_obj.user_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to attach to this folder/application")

    # Read file content
    content = await file.read()
    # Enforce max file size
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large")
    
    # Build storage prefix for logical organization
    storage_prefix = None
    if application_id is not None:
        # If folder provided, try to include folder name as role-based segment
        role_segment = None
        if folder_id is not None:
            folder_q2 = await db.execute(select(Folder).where(Folder.id == folder_id))
            folder_for_prefix = folder_q2.scalar_one_or_none()
            if folder_for_prefix and folder_for_prefix.name:
                role_segment = folder_for_prefix.name.lower()
        storage_prefix = f"applications/{application_id}"
        if role_segment:
            storage_prefix = f"{storage_prefix}/{role_segment}"

    # Upload to MinIO
    object_name = minio_service.upload_file(
        file_content=content,
        original_filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
        prefix=storage_prefix
    )
    
    # Create file record
    db_file = File(
        filename=os.path.basename(object_name),
        original_filename=file.filename,
        file_path=object_name,  # Store MinIO object name with prefix
        file_size=len(content),
        mime_type=file.content_type or "application/octet-stream",
        uploaded_by=current_user.id,
        application_id=application_id,
        folder_id=folder_id
    )
    
    db.add(db_file)
    await db.commit()
    await db.refresh(db_file)
    
    return FileResponse.from_orm(db_file)


@router.post("/upload-url")
async def create_upload_url(
    original_filename: str,
    application_id: Optional[UUID] = None,
    folder_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Authorization checks similar to binary upload
    if application_id is not None:
        app_q = await db.execute(select(CustomerApplication).where(CustomerApplication.id == application_id))
        app_obj = app_q.scalar_one_or_none()
        if not app_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
        if current_user.role not in ["admin", "manager"] and app_obj.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to attach to this application")
    if folder_id is not None:
        folder_q = await db.execute(select(Folder).where(Folder.id == folder_id))
        folder_obj = folder_q.scalar_one_or_none()
        if not folder_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
        if folder_obj.application_id:
            app_q = await db.execute(select(CustomerApplication).where(CustomerApplication.id == folder_obj.application_id))
            app_obj = app_q.scalar_one_or_none()
            if not app_obj:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
            if current_user.role not in ["admin", "manager"] and app_obj.user_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to attach to this folder/application")

    try:
        presign = minio_service.get_upload_url(original_filename)
        return presign
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/finalize", response_model=FileResponse)
async def finalize_uploaded_file(
    payload: FileFinalize,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Authorization re-checks
    if payload.application_id is not None:
        app_q = await db.execute(select(CustomerApplication).where(CustomerApplication.id == payload.application_id))
        app_obj = app_q.scalar_one_or_none()
        if not app_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
        if current_user.role not in ["admin", "manager"] and app_obj.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to attach to this application")
    if payload.folder_id is not None:
        folder_q = await db.execute(select(Folder).where(Folder.id == payload.folder_id))
        folder_obj = folder_q.scalar_one_or_none()
        if not folder_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
        if folder_obj.application_id:
            app_q = await db.execute(select(CustomerApplication).where(CustomerApplication.id == folder_obj.application_id))
            app_obj = app_q.scalar_one_or_none()
            if not app_obj:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
            if current_user.role not in ["admin", "manager"] and app_obj.user_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to attach to this folder/application")

    # Optionally verify the object exists on MinIO
    try:
        info = minio_service.get_file_info(payload.object_name)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Object not found in storage: {e}")

    db_file = File(
        filename=payload.object_name,
        original_filename=payload.original_filename,
        file_path=payload.object_name,
        file_size=info.get("size"),
        mime_type=info.get("content_type") or "application/octet-stream",
        uploaded_by=current_user.id,
        application_id=payload.application_id,
        folder_id=payload.folder_id,
    )
    db.add(db_file)
    await db.commit()
    await db.refresh(db_file)
    return FileResponse.from_orm(db_file)

@router.get("/", response_model=PaginatedResponse)
async def get_files(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=1000),
    application_id: Optional[UUID] = None,
    folder_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(File)
    
    if application_id:
        query = query.where(File.application_id == application_id)
    if folder_id:
        query = query.where(File.folder_id == folder_id)
    
    # Non-admin users can only see their own files
    if current_user.role != "admin":
        query = query.where(File.uploaded_by == current_user.id)
    
    query = query.order_by(desc(File.created_at))
    
    # Get total count
    count_query = select(func.count()).select_from(File)
    if application_id:
        count_query = count_query.where(File.application_id == application_id)
    if folder_id:
        count_query = count_query.where(File.folder_id == folder_id)
    if current_user.role != "admin":
        count_query = count_query.where(File.uploaded_by == current_user.id)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar_one() or 0
    
    # Apply pagination
    offset = (page - 1) * size
    query = query.offset(offset).limit(size)
    result = await db.execute(query)
    files = result.scalars().all()
    
    return PaginatedResponse(
        items=[FileResponse.from_orm(file) for file in files],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size
    )

@router.get("/{file_id}", response_model=FileResponse)
async def get_file(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(File).where(File.id == file_id)
    )
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Check permissions
    if current_user.role != "admin" and file.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this file"
        )
    
    return FileResponse.from_orm(file)

@router.delete("/{file_id}")
async def delete_file(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(File).where(File.id == file_id)
    )
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Check permissions
    if current_user.role not in ["admin", "manager"] and file.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this file"
        )
    
    # Delete from MinIO
    try:
        minio_service.delete_file(file.file_path)
    except Exception as e:
        # Log error but don't fail the request
        print(f"Error deleting file from MinIO: {e}")
    
    await db.delete(file)
    await db.commit()
    
    return {"message": "File deleted successfully"}

@router.get("/{file_id}/download")
async def download_file(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(File).where(File.id == file_id)
    )
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Check permissions
    if current_user.role != "admin" and file.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this file"
        )
    
    try:
        # Generate presigned URL for MinIO
        download_url = minio_service.get_file_url(file.file_path)
        return {"download_url": download_url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating download URL: {str(e)}"
        )