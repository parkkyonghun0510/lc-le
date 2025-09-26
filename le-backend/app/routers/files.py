from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func
from typing import List, Optional, Dict
from uuid import UUID
import uuid
import os
from datetime import datetime, timedelta

from app.database import get_db
from app.models import File as FileModel, User, CustomerApplication, Folder
from app.schemas import FileCreate, FileResponse, PaginatedResponse, FileFinalize
from app.routers.auth import get_current_user
from app.services.minio_service import minio_service
from app.services.folder_service import (
    get_or_create_application_folder_structure,
    get_folder_for_document_type,
    FolderOrganizationConfig
)
from app.services.parameter_validation_service import UploadParameterValidator, ParameterLogger
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()

# Helper function to populate file URLs
def _populate_file_urls(file: FileModel, expires_in: int = 3600) -> FileResponse:
    response = FileResponse.from_orm(file)
    if minio_service.enabled:
        try:
            response.url = minio_service.get_file_url(file.file_path, expires=expires_in)
            # TODO: Implement thumbnail generation and separate preview URL
            response.preview_url = response.url  # For now, preview is same as full download
            response.expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        except Exception as e:
            logger.error(f"Failed to generate MinIO URL for file {file.id}: {e}")
            response.url = None
            response.preview_url = None
            response.expires_at = None
    return response

@router.post("/upload", response_model=FileResponse)
async def upload_file(
    file: UploadFile = File(),
    # Form data parameters (primary)
    application_id: Optional[str] = Form(None),
    folder_id: Optional[str] = Form(None),
    document_type: Optional[str] = Form(None),
    field_name: Optional[str] = Form(None),
    # Query parameters (fallback for backward compatibility)
    query_application_id: Optional[str] = Query(None, alias="application_id"),
    query_folder_id: Optional[str] = Query(None, alias="folder_id"),
    query_document_type: Optional[str] = Query(None, alias="document_type"),
    query_field_name: Optional[str] = Query(None, alias="field_name"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> FileResponse:
    # Generate correlation ID for request tracking
    correlation_id = str(uuid.uuid4())
    
    logger.info(f"File upload request started [correlation_id: {correlation_id}]")
    
    # Log received parameters
    ParameterLogger.log_parameter_processing(
        stage="received",
        params={
            "form_data": {
                "application_id": application_id,
                "folder_id": folder_id,
                "document_type": document_type,
                "field_name": field_name
            },
            "query_params": {
                "application_id": query_application_id,
                "folder_id": query_folder_id,
                "document_type": query_document_type,
                "field_name": query_field_name
            },
            "file": {
                "filename": file.filename,
                "content_type": file.content_type,
                "size": getattr(file, 'size', 'unknown')
            }
        },
        correlation_id=correlation_id
    )
    
    # Validate and convert parameters using the new validation service
    try:
        validated_params = await UploadParameterValidator.validate_upload_parameters(
            application_id=application_id,
            folder_id=folder_id,
            document_type=document_type,
            field_name=field_name,
            query_application_id=query_application_id,
            query_folder_id=query_folder_id,
            query_document_type=query_document_type,
            query_field_name=query_field_name
        )
        
        # Log validated parameters
        ParameterLogger.log_parameter_processing(
            stage="validated",
            params={
                "application_id": str(validated_params.application_id) if validated_params.application_id else None,
                "folder_id": str(validated_params.folder_id) if validated_params.folder_id else None,
                "document_type": validated_params.document_type,
                "field_name": validated_params.field_name
            },
            correlation_id=correlation_id
        )
        
    except HTTPException as e:
        logger.error(f"Parameter validation failed [correlation_id: {correlation_id}]: {e.detail}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during parameter validation [correlation_id: {correlation_id}]: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error during parameter validation"
        )
    
    # Extract validated UUIDs for backward compatibility with existing code
    application_uuid = validated_params.application_id
    folder_uuid = validated_params.folder_id
    
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
    if application_uuid:
        logger.debug(f"Creating/retrieving folder structure for application {application_uuid} [correlation_id: {correlation_id}]")
        
        # If a specific document_type is provided, use the new document type-based organization
        if validated_params.document_type:
            if FolderOrganizationConfig.is_valid_document_type(validated_params.document_type):
                # Use the new document type-based folder organization
                document_folder_id = await get_folder_for_document_type(
                    db, application_uuid, validated_params.document_type
                )
                if document_folder_id:
                    original_folder_uuid = folder_uuid
                    folder_uuid = document_folder_id
                    logger.info(
                        f"Using document type-based folder [correlation_id: {correlation_id}]: "
                        f"document_type={validated_params.document_type}, "
                        f"folder_id={folder_uuid} (was: {original_folder_uuid})"
                    )
                else:
                    logger.warning(
                        f"Failed to create folder for document type [correlation_id: {correlation_id}]: "
                        f"document_type={validated_params.document_type}"
                    )
            else:
                logger.warning(
                    f"Invalid document type provided [correlation_id: {correlation_id}]: "
                    f"document_type={validated_params.document_type}"
                )
        
        # If no document type or document type failed, fall back to legacy system
        if not folder_uuid:
            folder_ids = await get_or_create_application_folder_structure(db, application_uuid)
            logger.debug(f"Available folder structure [correlation_id: {correlation_id}]: {folder_ids}")
            
            # Check if document_type maps to a legacy folder name
            if validated_params.document_type and validated_params.document_type in folder_ids:
                folder_uuid = folder_ids[validated_params.document_type]
                logger.info(
                    f"Using legacy folder mapping [correlation_id: {correlation_id}]: "
                    f"document_type={validated_params.document_type}, "
                    f"folder_id={folder_uuid}"
                )
            else:
                # Default to parent application folder if no specific folder is chosen
                folder_uuid = folder_ids.get("parent_id")
                logger.info(
                    f"Using default parent folder [correlation_id: {correlation_id}]: "
                    f"folder_id={folder_uuid}"
                )

    # Authorization: if attaching to application, ensure user can access it
    if application_uuid is not None:
        app_q = await db.execute(select(CustomerApplication).where(CustomerApplication.id == application_uuid))
        app_obj = app_q.scalar_one_or_none()
        if not app_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
        if current_user.role not in ["admin", "manager"] and app_obj.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to attach to this application")

    if folder_uuid is not None:
        folder_q = await db.execute(select(Folder).where(Folder.id == folder_uuid))
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
    if application_uuid is not None:
        # If folder provided, try to include folder name as role-based segment
        role_segment = None
        if folder_uuid is not None:
            folder_q2 = await db.execute(select(Folder).where(Folder.id == folder_uuid))
            folder_for_prefix = folder_q2.scalar_one_or_none()
            if folder_for_prefix and folder_for_prefix.name:
                role_segment = folder_for_prefix.name.lower()
        storage_prefix = f"applications/{application_uuid}"
        if role_segment:
            storage_prefix = f"{storage_prefix}/{role_segment}"

    # Upload to MinIO with error handling
    logger.debug(
        f"Uploading file to MinIO [correlation_id: {correlation_id}]: "
        f"filename={sanitized_filename}, size={len(content)}, "
        f"content_type={file.content_type}, prefix={storage_prefix}"
    )
    
    try:
        object_name = minio_service.upload_file(
            file_content=content,
            original_filename=sanitized_filename,
            content_type=file.content_type or "application/octet-stream",
            prefix=storage_prefix,
            field_name=validated_params.field_name
        )
        logger.info(
            f"File uploaded to MinIO successfully [correlation_id: {correlation_id}]: "
            f"object_name={object_name}"
        )
    except Exception as e:
        logger.error(
            f"Failed to upload file to MinIO [correlation_id: {correlation_id}]: "
            f"error={str(e)}, filename={sanitized_filename}"
        )
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
            application_id=application_uuid,
            folder_id=folder_uuid
        )
        
        # Debug logging to verify file record creation
        logger.debug(
            f"Creating file record [correlation_id: {correlation_id}]: "
            f"application_id={application_uuid}, folder_id={folder_uuid}, "
            f"filename={db_file.filename}, file_size={db_file.file_size}"
        )
        
        db.add(db_file)
        await db.commit()
        await db.refresh(db_file)
        
        logger.info(
            f"File record created successfully [correlation_id: {correlation_id}]: "
            f"file_id={db_file.id}, folder_id={db_file.folder_id}, "
            f"application_id={db_file.application_id}"
        )
        
    except Exception as e:
        logger.error(
            f"Failed to save file record [correlation_id: {correlation_id}]: "
            f"error={str(e)}, attempting cleanup"
        )
        
        # If database operation fails, try to clean up the uploaded file
        try:
            minio_service.delete_file(object_name)
            logger.info(f"Successfully cleaned up MinIO file after database error [correlation_id: {correlation_id}]: {object_name}")
        except Exception as cleanup_error:
            logger.error(f"Failed to cleanup MinIO file after database error [correlation_id: {correlation_id}]: {cleanup_error}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file record: {str(e)}"
        )
    
    # Log final success and parameter verification
    logger.info(
        f"File upload completed successfully [correlation_id: {correlation_id}]: "
        f"file_id={db_file.id}, final_folder_id={db_file.folder_id}, "
        f"final_application_id={db_file.application_id}, object_name={object_name}"
    )
    
    # Log parameter processing completion
    ParameterLogger.log_parameter_processing(
        stage="completed",
        params={
            "file_id": str(db_file.id),
            "final_application_id": str(db_file.application_id) if db_file.application_id else None,
            "final_folder_id": str(db_file.folder_id) if db_file.folder_id else None,
            "object_name": object_name
        },
        correlation_id=correlation_id
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
    
    return _populate_file_urls(file)

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
        logger.info(f"Successfully deleted file from MinIO: {file.file_path}")
    except Exception as e:
        # Log error but don't fail the request
        logger.error(f"Error deleting file from MinIO: {e}, file_path: {file.file_path}")
    
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