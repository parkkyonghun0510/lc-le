from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func, and_
from typing import List, Optional, Dict, Any
from uuid import UUID
import uuid
import os
import json
from datetime import datetime

from app.database import get_db
from app.models import Selfie, File as FileModel, User, CustomerApplication
from app.schemas import (
    SelfieUploadRequest, SelfieResponse, SelfieValidationRequest, 
    SelfieValidationResponse, SelfieListResponse, SelfieMetadata,
    SelfieType, PaginatedResponse
)
from app.routers.auth import get_current_user
from app.services.minio_service import minio_service
from app.core.config import settings

router = APIRouter()

@router.post("/upload")
async def upload_selfie(
    file: UploadFile = File(...),
    application_id: str = Form(...),
    selfie_type: str = Form(...),
    customer_id_number: Optional[str] = Form(None),
    customer_name: Optional[str] = Form(None),
    location_latitude: Optional[float] = Form(None),
    location_longitude: Optional[float] = Form(None),
    location_address: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a selfie captured by Flutter app.
    Supports all three user roles: admin, manager, officer.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided"
        )
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Check if application exists and user has access
    try:
        app_id = UUID(application_id)
        app_query = await db.execute(select(CustomerApplication).where(CustomerApplication.id == app_id))
        application = app_query.scalar_one_or_none()
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid application ID format"
        )
    
    # Role-based access control
    if current_user.role not in ["admin", "manager"] and str(application.user_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to upload selfies for this application"
        )
    
    # Read file content
    content = await file.read()
    
    # Enforce max file size for images (typically larger than documents)
    max_image_size = getattr(settings, 'MAX_IMAGE_SIZE', 10 * 1024 * 1024)  # 10MB default
    if len(content) > max_image_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image too large. Maximum size: {max_image_size // (1024*1024)}MB"
        )
    
    # Create storage prefix for selfies
    storage_prefix = f"applications/{application_id}/selfies/{selfie_type}"
    
    # Upload to MinIO
    object_name = minio_service.upload_file(
        file_content=content,
        original_filename=file.filename,
        content_type=file.content_type,
        prefix=storage_prefix
    )
    
    # Create file record
    db_file = FileModel(
        filename=os.path.basename(object_name),
        original_filename=file.filename,
        file_path=object_name,
        file_size=len(content),
        mime_type=file.content_type,
        uploaded_by=current_user.id,
        application_id=app_id
    )
    
    db.add(db_file)
    await db.commit()
    await db.refresh(db_file)
    
    # Create selfie record with metadata
    db_selfie = Selfie(
        application_id=app_id,
        file_id=db_file.id,
        selfie_type=selfie_type,
        captured_by_user_id=current_user.id,
        customer_id_number=customer_id_number,
        customer_name=customer_name,
        location_latitude=location_latitude,
        location_longitude=location_longitude,
        location_address=location_address,
        notes=notes,
        status='pending_validation'
    )
    
    db.add(db_selfie)
    await db.commit()
    await db.refresh(db_selfie)
    
    # Return response
    return {
        "id": str(db_selfie.id),
        "application_id": str(db_selfie.application_id),
        "file_path": db_file.file_path,
        "original_filename": db_file.original_filename,
        "selfie_type": db_selfie.selfie_type,
        "created_at": db_selfie.created_at.isoformat(),
        "status": db_selfie.status,
        "message": "Selfie uploaded successfully"
    }

@router.get("/")
async def get_selfies(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    application_id: Optional[str] = Query(None),
    selfie_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of selfies with filtering and pagination.
    Role-based access: admin/manager see all, officers see only their own.
    """
    # Build query
    query = select(Selfie)
    
    # Apply role-based filtering
    if current_user.role == "officer":
        # Officers can only see selfies they captured
        query = query.where(Selfie.captured_by_user_id == current_user.id)
    
    # Apply filters
    if application_id:
        try:
            app_id = UUID(application_id)
            query = query.where(Selfie.application_id == app_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid application ID format"
            )
    
    if selfie_type:
        query = query.where(Selfie.selfie_type == selfie_type)
    if status:
        query = query.where(Selfie.status == status)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Paginate
    offset = (page - 1) * size
    query = query.offset(offset).limit(size).order_by(desc(Selfie.created_at))
    
    result = await db.execute(query)
    selfies = result.scalars().all()
    
    # Build response items
    items = []
    for selfie in selfies:
        items.append({
            "id": str(selfie.id),
            "application_id": str(selfie.application_id),
            "customer_name": selfie.customer_name,
            "selfie_type": selfie.selfie_type,
            "captured_at": selfie.captured_at.isoformat() if selfie.captured_at else None,
            "status": selfie.status,
            "notes": selfie.notes
        })
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size if total > 0 else 0
    }

@router.get("/{selfie_id}")
async def get_selfie(
    selfie_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific selfie by ID."""
    try:
        selfie_uuid = UUID(selfie_id)
        result = await db.get(Selfie, selfie_uuid)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selfie not found"
            )
        
        # Check access permissions for officers
        if current_user.role == "officer" and str(result.captured_by_user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this selfie"
            )
        
        # Get associated file
        file_result = await db.get(FileModel, result.file_id)
        
        return {
            "id": str(result.id),
            "application_id": str(result.application_id),
            "file_path": file_result.file_path if file_result else None,
            "original_filename": file_result.original_filename if file_result else None,
            "selfie_type": result.selfie_type,
            "customer_name": result.customer_name,
            "customer_id_number": result.customer_id_number,
            "location_latitude": float(result.location_latitude) if result.location_latitude else None,
            "location_longitude": float(result.location_longitude) if result.location_longitude else None,
            "location_address": result.location_address,
            "notes": result.notes,
            "status": result.status,
            "is_validated": result.is_validated,
            "validation_notes": result.validation_notes,
            "created_at": result.created_at.isoformat() if result.created_at else None
        }
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid selfie ID format"
        )

@router.post("/{selfie_id}/validate")
async def validate_selfie(
    selfie_id: str,
    is_approved: bool = Form(...),
    validation_notes: Optional[str] = Form(None),
    face_detection_confidence: Optional[float] = Form(None),
    image_quality_score: Optional[float] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Validate a selfie. Only managers and admins can validate selfies.
    """
    # Only managers and admins can validate
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and admins can validate selfies"
        )
    
    try:
        selfie_uuid = UUID(selfie_id)
        selfie = await db.get(Selfie, selfie_uuid)
        if not selfie:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selfie not found"
            )
        
        # Update validation status - use update query to avoid ORM column issues
        from sqlalchemy import update
        
        update_data = {
            "is_validated": is_approved,
            "status": "validated" if is_approved else "rejected",
            "validated_by": current_user.id,
            "validated_at": datetime.utcnow(),
            "validation_notes": validation_notes
        }
        
        if face_detection_confidence is not None:
            update_data["face_detection_confidence"] = face_detection_confidence
        if image_quality_score is not None:
            update_data["image_quality_score"] = image_quality_score
        
        await db.execute(
            update(Selfie)
            .where(Selfie.id == selfie_uuid)
            .values(update_data)
        )
        await db.commit()
        
        return {
            "selfie_id": selfie_id,
            "is_approved": is_approved,
            "validation_notes": validation_notes,
            "validated_by": str(current_user.id),
            "validated_at": datetime.utcnow().isoformat(),
            "message": "Selfie validation completed successfully"
        }
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid selfie ID format"
        )

@router.delete("/{selfie_id}")
async def delete_selfie(
    selfie_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a selfie. Only admins or the user who captured it can delete.
    """
    try:
        selfie_uuid = UUID(selfie_id)
        selfie = await db.get(Selfie, selfie_uuid)
        if not selfie:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selfie not found"
            )
        
        # Check permissions
        if current_user.role != "admin" and str(selfie.captured_by_user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this selfie"
            )
        
        # Get associated file
        file_obj = await db.get(FileModel, selfie.file_id)
        
        # Delete from MinIO
        if file_obj:
            try:
                minio_service.delete_file(file_obj.file_path)
            except Exception as e:
                # Log the error but don't fail the request
                print(f"Warning: Failed to delete file from MinIO: {e}")
        
        # Delete records from database
        await db.delete(selfie)
        if file_obj:
            await db.delete(file_obj)
        await db.commit()
        
        return {"message": "Selfie deleted successfully"}
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid selfie ID format"
        )

