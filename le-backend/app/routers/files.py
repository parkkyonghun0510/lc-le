from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form, Request
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
from app.services.folder_service import (
    get_or_create_application_folder_structure,
    get_folder_for_document_type,
    FolderOrganizationConfig
)
from app.services.parameter_validation_service import UploadParameterValidator, ParameterLogger
from app.services.malware_scanner_service import scan_file_for_malware
from app.services.encryption_service import encrypt_sensitive_file, decrypt_file_content, EncryptionMetadata
from app.services.file_audit_service import get_file_audit_service, extract_client_info
from app.services.file_access_control_service import get_file_access_control_service, FilePermission
from app.core.config import settings
from app.core.logging import get_logger
from app.core.exceptions import SecurityError

logger = get_logger(__name__)

router = APIRouter()

@router.post("/upload", response_model=FileResponse)
async def upload_file(
    request: Request,
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
    
    # Get client information for audit logging
    client_info = extract_client_info(request)
    
    # Initialize security services
    audit_service = await get_file_audit_service(db)
    access_control_service = await get_file_access_control_service(db)
    
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
    
    # Security Enhancement: Malware scanning
    logger.info(f"Starting malware scan for file: {sanitized_filename} [correlation_id: {correlation_id}]")
    try:
        scan_result = await scan_file_for_malware(content, sanitized_filename, file.content_type)
        
        if not scan_result.is_safe:
            logger.warning(
                f"Malware detected in file {sanitized_filename} [correlation_id: {correlation_id}]: "
                f"threats={scan_result.threats_found}"
            )
            
            # Log security event
            await audit_service.log_malware_scan(
                file_id=uuid.uuid4(),  # Temporary ID for logging
                user_id=current_user.id,
                filename=sanitized_filename,
                scan_result=scan_result.__dict__,
                **client_info
            )
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File rejected due to security concerns: {', '.join(scan_result.threats_found)}"
            )
        
        logger.info(
            f"Malware scan completed successfully: {sanitized_filename} - CLEAN "
            f"[correlation_id: {correlation_id}] (duration: {scan_result.scan_duration:.2f}s)"
        )
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Malware scanning failed for {sanitized_filename}: {e}")
        # Continue with upload but log the error
        scan_result = None
    
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

    # Security Enhancement: File encryption for sensitive documents
    logger.info(f"Checking if file requires encryption: {sanitized_filename} [correlation_id: {correlation_id}]")
    try:
        encryption_result = await encrypt_sensitive_file(
            content, sanitized_filename, file.content_type
        )
        
        if encryption_result.success:
            if encryption_result.metadata.algorithm != "none":
                logger.info(
                    f"File encrypted: {sanitized_filename} [correlation_id: {correlation_id}] "
                    f"(algorithm: {encryption_result.metadata.algorithm})"
                )
                # Use encrypted content for upload
                upload_content = encryption_result.encrypted_data
                encryption_metadata = encryption_result.metadata
            else:
                logger.debug(f"File does not require encryption: {sanitized_filename}")
                upload_content = content
                encryption_metadata = encryption_result.metadata
        else:
            logger.error(f"Encryption failed for {sanitized_filename}: {encryption_result.error_message}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"File encryption failed: {encryption_result.error_message}"
            )
    except Exception as e:
        logger.error(f"Encryption process failed for {sanitized_filename}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File security processing failed: {str(e)}"
        )
    
    # Upload to MinIO with error handling
    logger.debug(
        f"Uploading file to MinIO [correlation_id: {correlation_id}]: "
        f"filename={sanitized_filename}, size={len(upload_content)}, "
        f"content_type={file.content_type}, prefix={storage_prefix}, "
        f"encrypted={encryption_metadata.algorithm != 'none'}"
    )
    
    try:
        object_name = minio_service.upload_file(
            file_content=upload_content,
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
    
    # Create file record with proper error handling and encryption metadata
    try:
        # Store encryption metadata in file record (you may need to add these fields to the File model)
        file_metadata = {
            "encryption": encryption_metadata.to_dict() if encryption_metadata else None,
            "scan_result": scan_result.__dict__ if scan_result else None,
            "upload_correlation_id": correlation_id
        }
        
        db_file = File(
            filename=os.path.basename(object_name),
            original_filename=file.filename,  # Keep original for display
            display_name=file.filename,  # Set display name from original filename
            file_path=object_name,  # Store MinIO object name with prefix
            file_size=len(content),  # Store original file size
            mime_type=file.content_type or "application/octet-stream",
            uploaded_by=current_user.id,
            application_id=application_uuid,
            folder_id=folder_uuid
        )
        
        # Note: In a full implementation, you would add encryption_metadata and security_metadata 
        # columns to the File model to store this information
        
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
        
        # Data Consistency: Invalidate caches and send real-time updates
        try:
            from app.services.cache_invalidation_service import invalidate_file_cache, InvalidationReason
            from app.services.realtime_update_service import notify_file_uploaded
            
            # Invalidate file and folder caches
            await invalidate_file_cache(
                file_id=str(db_file.id),
                folder_id=str(db_file.folder_id) if db_file.folder_id else None,
                application_id=str(db_file.application_id) if db_file.application_id else None,
                reason=InvalidationReason.CREATE
            )
            
            # Send real-time update notification
            await notify_file_uploaded(
                file_id=str(db_file.id),
                file_data={
                    "filename": db_file.filename,
                    "original_filename": db_file.original_filename,
                    "file_size": db_file.file_size,
                    "mime_type": db_file.mime_type,
                    "uploaded_by": str(db_file.uploaded_by)
                },
                folder_id=str(db_file.folder_id) if db_file.folder_id else None,
                application_id=str(db_file.application_id) if db_file.application_id else None,
                user_id=str(current_user.id)
            )
            
            logger.debug(f"Cache invalidation and real-time updates sent [correlation_id: {correlation_id}]")
            
        except Exception as cache_error:
            logger.error(f"Cache invalidation failed [correlation_id: {correlation_id}]: {cache_error}")
            # Don't fail the upload due to cache invalidation errors
        
        # Security Enhancement: Comprehensive audit logging
        try:
            await audit_service.log_file_upload(
                file_id=db_file.id,
                user_id=current_user.id,
                filename=sanitized_filename,
                file_size=len(content),
                content_type=file.content_type or "application/octet-stream",
                application_id=application_uuid,
                folder_id=folder_uuid,
                upload_method="direct",
                scan_result=scan_result.__dict__ if scan_result else None,
                encryption_status=encryption_metadata.to_dict() if encryption_metadata else None,
                metadata={
                    "correlation_id": correlation_id,
                    "document_type": validated_params.document_type,
                    "field_name": validated_params.field_name,
                    "storage_prefix": storage_prefix
                },
                **client_info
            )
            
            # Log encryption operation if file was encrypted
            if encryption_metadata and encryption_metadata.algorithm != "none":
                await audit_service.log_file_encryption(
                    file_id=db_file.id,
                    user_id=current_user.id,
                    filename=sanitized_filename,
                    encryption_algorithm=encryption_metadata.algorithm,
                    key_id=encryption_metadata.key_id,
                    encryption_reason="automatic_sensitive_file",
                    **client_info
                )
            
            # Log malware scan if performed
            if scan_result:
                await audit_service.log_malware_scan(
                    file_id=db_file.id,
                    user_id=current_user.id,
                    filename=sanitized_filename,
                    scan_result=scan_result.__dict__,
                    **client_info
                )
                
        except Exception as audit_error:
            logger.error(f"Audit logging failed [correlation_id: {correlation_id}]: {audit_error}")
            # Don't fail the upload due to audit logging errors
        
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
    
    return FileResponse.from_orm(file)

@router.delete("/{file_id}")
async def delete_file(
    request: Request,
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
    
    # Security Enhancement: Access control for deletion
    client_info = extract_client_info(request)
    access_control_service = await get_file_access_control_service(db)
    audit_service = await get_file_audit_service(db)
    
    # Check delete permission
    access_result = await access_control_service.check_access(
        user=current_user,
        file=file,
        permission=FilePermission.DELETE,
        **client_info
    )
    
    if not access_result.is_allowed:
        # Log access denial
        await audit_service.log_file_access_attempt(
            file_id=file.id,
            user_id=current_user.id,
            operation="delete",
            access_granted=False,
            denial_reason=access_result.reason,
            **client_info
        )
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: {access_result.reason}"
        )
    
    # Store file information for audit logging before deletion
    file_info = {
        "filename": file.filename,
        "file_path": file.file_path,
        "file_size": file.file_size,
        "mime_type": file.mime_type
    }
    
    # Delete from MinIO
    try:
        minio_service.delete_file(file.file_path)
        logger.info(f"Successfully deleted file from MinIO: {file.file_path}")
    except Exception as e:
        # Log error but don't fail the request
        logger.error(f"Error deleting file from MinIO: {e}, file_path: {file.file_path}")
    
    # Store file metadata for cache invalidation
    file_folder_id = str(file.folder_id) if file.folder_id else None
    file_application_id = str(file.application_id) if file.application_id else None
    
    # Delete from database
    await db.delete(file)
    await db.commit()
    
    # Data Consistency: Invalidate caches and send real-time updates
    try:
        from app.services.cache_invalidation_service import invalidate_file_cache, InvalidationReason
        from app.services.realtime_update_service import notify_file_deleted
        
        # Invalidate file and folder caches
        await invalidate_file_cache(
            file_id=str(file_id),
            folder_id=file_folder_id,
            application_id=file_application_id,
            reason=InvalidationReason.DELETE
        )
        
        # Send real-time update notification
        await notify_file_deleted(
            file_id=str(file_id),
            folder_id=file_folder_id,
            application_id=file_application_id,
            user_id=str(current_user.id)
        )
        
        logger.debug(f"Cache invalidation and real-time updates sent for deleted file: {file_id}")
        
    except Exception as cache_error:
        logger.error(f"Cache invalidation failed for file deletion {file_id}: {cache_error}")
        # Don't fail the deletion due to cache invalidation errors
    
    # Log file deletion
    try:
        await audit_service.log_file_deletion(
            file_id=file_id,
            user_id=current_user.id,
            filename=file_info["filename"],
            file_path=file_info["file_path"],
            deletion_reason="user_requested",
            **client_info
        )
    except Exception as audit_error:
        logger.error(f"Failed to log file deletion: {audit_error}")
    
    return {"message": "File deleted successfully"}

@router.get("/{file_id}/download")
async def download_file(
    request: Request,
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
    
    # Security Enhancement: Granular access control
    client_info = extract_client_info(request)
    access_control_service = await get_file_access_control_service(db)
    audit_service = await get_file_audit_service(db)
    
    # Check download permission
    access_result = await access_control_service.check_access(
        user=current_user,
        file=file,
        permission=FilePermission.DOWNLOAD,
        **client_info
    )
    
    if not access_result.is_allowed:
        # Log access denial
        await audit_service.log_file_access_attempt(
            file_id=file.id,
            user_id=current_user.id,
            operation="download",
            access_granted=False,
            denial_reason=access_result.reason,
            **client_info
        )
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: {access_result.reason}"
        )
    
    # Handle conditional access
    if access_result.is_conditional:
        logger.warning(
            f"Conditional access for file download: user={current_user.id}, "
            f"file={file.id}, conditions={access_result.conditions}"
        )
        # In a full implementation, you would handle conditions like 2FA, manager approval, etc.
        # For now, we'll allow but log the conditions
    
    try:
        # Generate presigned URL for MinIO
        download_url = minio_service.get_file_url(file.file_path)
        
        # Log successful download access
        await audit_service.log_file_download(
            file_id=file.id,
            user_id=current_user.id,
            filename=file.filename,
            download_method="presigned_url",
            access_granted=True,
            **client_info
        )
        
        return {"download_url": download_url}
        
    except Exception as e:
        logger.error(f"Error generating download URL for file {file.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating download URL: {str(e)}"
        )