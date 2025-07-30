from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from typing import List, Optional
from uuid import UUID
import uuid
import os
from datetime import datetime

from app.database import get_db
from app.models import File, User
from app.schemas import FileCreate, FileResponse, PaginatedResponse
from app.routers.auth import get_current_user

router = APIRouter()

# In production, this should be MinIO or S3
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/upload", response_model=FileResponse)
async def upload_file(
    file: UploadFile = File(),
    application_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided"
        )
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Create file record
    db_file = File(
        filename=unique_filename,
        original_filename=file.filename,
        file_path=file_path,
        file_size=len(content),
        mime_type=file.content_type or "application/octet-stream",
        uploaded_by=current_user.id,
        application_id=application_id
    )
    
    db.add(db_file)
    await db.commit()
    await db.refresh(db_file)
    
    return FileResponse.from_orm(db_file)

@router.get("/", response_model=PaginatedResponse)
async def get_files(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    application_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(File)
    
    if application_id:
        query = query.where(File.application_id == application_id)
    
    # Non-admin users can only see their own files
    if current_user.role != "admin":
        query = query.where(File.uploaded_by == current_user.id)
    
    query = query.order_by(desc(File.created_at))
    
    # Get total count
    count_query = select(File.id)
    if application_id:
        count_query = count_query.where(File.application_id == application_id)
    if current_user.role != "admin":
        count_query = count_query.where(File.uploaded_by == current_user.id)
    
    total_result = await db.execute(count_query)
    total = len(total_result.scalars().all())
    
    # Get paginated results
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    files = result.scalars().all()
    
    return PaginatedResponse(
        items=[FileResponse.from_orm(file) for file in files],
        total=total,
        skip=skip,
        limit=limit
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
    if current_user.role != "admin" and file.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this file"
        )
    
    # Delete physical file
    try:
        if os.path.exists(file.file_path):
            os.remove(file.file_path)
    except Exception as e:
        # Log error but don't fail the request
        print(f"Error deleting file: {e}")
    
    await db.delete(file)
    await db.commit()
    
    return {"message": "File deleted successfully"}

@router.get("/{file_id}/download")
async def download_file(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from fastapi.responses import FileResponse
    
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
    
    if not os.path.exists(file.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk"
        )
    
    return FileResponse(
        path=file.file_path,
        filename=file.filename,
        media_type=file.mime_type
    )