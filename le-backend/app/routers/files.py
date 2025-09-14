from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func
from typing import List, Optional, Dict
from uuid import UUID
import uuid
import os
from datetime import datetime

from app.database import get_db
from app.models import File, User, CustomerApplication, Folder
from app.schemas import FileCreate, FileResponse, PaginatedResponse, FileFinalize
from app.routers.auth import get_current_user
from app.services.minio_service import minio_service
from app.services.folder_service import get_or_create_application_folder_structure
from app.core.config import settings

router = APIRouter()

@router.post("/upload", response_model=FileResponse)
async def upload_file(
    file: UploadFile = File(),
    application_id: Optional[UUID] = None,
    folder_id: Optional[UUID] = None, # This can now be used to specify a sub-folder
    document_type: Optional[str] = Query(None, enum=["photos", "references", "supporting_docs"]),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> FileResponse:
    # Validate file presence and filename
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided or filename is empty"
        )
    
    # Sanitize filename to prevent security issues
    from app.core.security_utils import sanitize_filename
    sanitized_filename = sanitize_filename(file.filename)
    if not sanitized_filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename provided"
        )

    # Validate file type with better error handling
    if not file.content_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content type could not be determined. Please ensure the file is valid."
        )
    
    if file.content_type not in settings.ALLOWED_FILE_TYPES:
        allowed_types_display = []
        for mime_type in settings.ALLOWED_FILE_TYPES:
            if mime_type.startswith('image/'):
                allowed_types_display.append(mime_type.replace('image/', '').upper())
            elif mime_type == 'application/pdf':
                allowed_types_display.append('PDF')
            elif 'word' in mime_type:
                allowed_types_display.append('Word Document')
            else:
                allowed_types_display.append(mime_type)
        
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{file.content_type}'. Allowed formats: {', '.join(set(allowed_types_display))}"
        )
    
    # If application_id is provided, ensure folder structure exists
    if application_id:
        folder_ids = await get_or_create_application_folder_structure(db, application_id)
        
        # If a specific document_type is given, use its folder
        if document_type and document_type in folder_ids:
            folder_id = folder_ids[document_type]
        # If no specific type, but a folder_id is passed, use it (optional)
        elif not folder_id:
            # Default to parent application folder if no specific folder is chosen
            folder_id = folder_ids.get("parent_id")

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

    # Read file content with size validation
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file content: {str(e)}"
        )
    
    # Validate file is not empty
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty. Please select a valid file."
        )
    
    # Enforce max file size with detailed error message
    max_size_mb = settings.MAX_FILE_SIZE / (1024 * 1024)
    current_size_mb = len(content) / (1024 * 1024)
    
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({current_size_mb:.1f}MB) exceeds maximum allowed size ({max_size_mb:.0f}MB). Please compress or select a smaller file."
        )
    
    # Basic file content validation for images
    if file.content_type.startswith('image/'):
        # Check for basic image file signatures
        image_signatures = {
            b'\xff\xd8\xff': 'image/jpeg',
            b'\x89PNG\r\n\x1a\n': 'image/png',
            b'GIF87a': 'image/gif',
            b'GIF89a': 'image/gif',
            b'RIFF': 'image/webp'  # WebP files start with RIFF
        }
        
        is_valid_image = False
        for signature, expected_type in image_signatures.items():
            if content.startswith(signature):
                # For WebP, need additional check
                if signature == b'RIFF' and len(content) > 12:
                    if content[8:12] == b'WEBP':
                        is_valid_image = True
                        break
                elif signature != b'RIFF':
                    is_valid_image = True
                    break
        
        if not is_valid_image:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File appears to be corrupted or is not a valid image file. Please select a different file."
            )
    
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

    # Upload to MinIO with error handling
    try:
        object_name = minio_service.upload_file(
            file_content=content,
            original_filename=sanitized_filename,
            content_type=file.content_type or "application/octet-stream",
            prefix=storage_prefix
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file to storage: {str(e)}"
        )
    
    # Create file record with proper error handling
    try:
        db_file = File(
            filename=os.path.basename(object_name),
            original_filename=file.filename,  # Keep original for display
            display_name=file.filename,  # Set display name from original filename
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
        
    except Exception as e:
        # If database operation fails, try to clean up the uploaded file
        try:
            minio_service.delete_file(object_name)
        except:
            pass  # Ignore cleanup errors
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file record: {str(e)}"
        )
    
    return FileResponse.from_orm(db_file)


@router.post("/upload-url")
async def create_upload_url(
    original_filename: str,
    application_id: Optional[UUID] = None,
    folder_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict:
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
) -> FileResponse:
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
) -> PaginatedResponse:
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
) -> FileResponse:
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
) -> Dict[str, str]:
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
) -> Dict[str, str]:
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