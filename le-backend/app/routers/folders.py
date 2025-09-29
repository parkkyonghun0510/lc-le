from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from uuid import UUID

from app.database import get_db
from app.models import Folder, User, CustomerApplication
from app.schemas import FolderResponse, FolderCreate, FolderUpdate
from app.routers.auth import get_current_user
from app.services.folder_service import (
    get_application_folder_hierarchy,
    get_folder_for_document_type,
    FolderOrganizationConfig,
    DocumentType,
    EnhancedFolderService
)
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.get("/")
async def get_folders(
    parent_id: Optional[UUID] = Query(None),
    application_id: Optional[UUID] = Query(None),
    page: Optional[int] = Query(None),
    size: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get folders with optional filtering by parent_id and/or application_id
    Returns paginated response if page/size provided, otherwise returns simple array
    """
    query = select(Folder).options(selectinload(Folder.files))
    
    # Apply filters
    if parent_id:
        query = query.where(Folder.parent_id == parent_id)
    if application_id:
        query = query.where(Folder.application_id == application_id)
        
        # Check permissions for application
        app_query = await db.execute(
            select(CustomerApplication).where(CustomerApplication.id == application_id)
        )
        application = app_query.scalar_one_or_none()
        
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )
        
        if current_user.role not in ["admin", "manager"] and application.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this application"
            )
    
    query = query.order_by(Folder.parent_id.asc(), Folder.name.asc())
    
    # Handle pagination if requested
    if page is not None and size is not None:
        # Get total count
        count_query = select(func.count(Folder.id))
        if parent_id:
            count_query = count_query.where(Folder.parent_id == parent_id)
        if application_id:
            count_query = count_query.where(Folder.application_id == application_id)
        
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()
        
        # Apply pagination
        offset = (page - 1) * size
        query = query.offset(offset).limit(size)
        
        folders_result = await db.execute(query)
        folders = folders_result.scalars().all()
        
        folder_responses = [FolderResponse.from_orm(folder) for folder in folders]
        
        return {
            "items": folder_responses,
            "total": total,
            "page": page,
            "size": size,
            "pages": (total + size - 1) // size
        }
    else:
        # Return simple array
        folders_result = await db.execute(query)
        folders = folders_result.scalars().all()
        
        return [FolderResponse.from_orm(folder) for folder in folders]


@router.get("/document-types", response_model=Dict[str, List[str]])
async def get_document_types() -> Dict[str, List[str]]:
    """
    Get all available document types organized by category
    """
    document_types = {
        "borrower": [
            DocumentType.BORROWER_PHOTO.value,
            DocumentType.BORROWER_ID_CARD.value,
            DocumentType.BORROWER_FAMILY_BOOK.value,
            DocumentType.BORROWER_INCOME_PROOF.value,
            DocumentType.BORROWER_BANK_STATEMENT.value,
        ],
        "guarantor": [
            DocumentType.GUARANTOR_PHOTO.value,
            DocumentType.GUARANTOR_ID_CARD.value,
            DocumentType.GUARANTOR_FAMILY_BOOK.value,
            DocumentType.GUARANTOR_INCOME_PROOF.value,
            DocumentType.GUARANTOR_BANK_STATEMENT.value,
        ],
        "collateral": [
            DocumentType.LAND_TITLE.value,
            DocumentType.PROPERTY_VALUATION.value,
            DocumentType.PROPERTY_PHOTOS.value,
            DocumentType.VEHICLE_REGISTRATION.value,
            DocumentType.VEHICLE_PHOTOS.value,
        ],
        "business": [
            DocumentType.BUSINESS_LICENSE.value,
            DocumentType.BUSINESS_REGISTRATION.value,
            DocumentType.BUSINESS_FINANCIAL_STATEMENT.value,
        ],
        "supporting": [
            DocumentType.LOAN_APPLICATION_FORM.value,
            DocumentType.CREDIT_REPORT.value,
            DocumentType.REFERENCE_LETTER.value,
            DocumentType.OTHER_SUPPORTING_DOC.value,
        ]
    }
    
    return document_types


@router.get("/document-type-mapping", response_model=Dict[str, str])
async def get_document_type_mapping() -> Dict[str, str]:
    """
    Get the mapping of document types to folder names
    """
    mapping = {}
    for doc_type, folder_name in FolderOrganizationConfig.DOCUMENT_TYPE_TO_FOLDER.items():
        mapping[doc_type.value] = folder_name
    
    return mapping


@router.get("/application/{application_id}/hierarchy")
async def get_application_folders(
    application_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get the complete folder hierarchy for an application
    """
    # Check if application exists and user has access
    app_query = await db.execute(
        select(CustomerApplication).where(CustomerApplication.id == application_id)
    )
    application = app_query.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Check permissions
    if current_user.role not in ["admin", "manager"] and application.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this application"
        )
    
    try:
        hierarchy = await get_application_folder_hierarchy(db, application_id)
        return hierarchy
    except Exception as e:
        logger.error(f"Error getting folder hierarchy for application {application_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving folder hierarchy"
        )


@router.post("/application/{application_id}/folder-for-document-type")
async def create_folder_for_document_type(
    application_id: UUID,
    document_type: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Create or get a folder for a specific document type
    """
    # Check if application exists and user has access
    app_query = await db.execute(
        select(CustomerApplication).where(CustomerApplication.id == application_id)
    )
    application = app_query.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Check permissions
    if current_user.role not in ["admin", "manager"] and application.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this application"
        )
    
    # Validate document type
    if not FolderOrganizationConfig.is_valid_document_type(document_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document type: {document_type}"
        )
    
    try:
        folder_id = await get_folder_for_document_type(db, application_id, document_type)
        
        if not folder_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create folder for document type"
            )
        
        # Get folder details
        folder_query = await db.execute(
            select(Folder).where(Folder.id == folder_id)
        )
        folder = folder_query.scalar_one_or_none()
        
        folder_name = FolderOrganizationConfig.get_folder_name_for_document_type(document_type)
        
        return {
            "folder_id": str(folder_id),
            "folder_name": folder.name if folder else folder_name,
            "document_type": document_type,
            "created": True
        }
        
    except Exception as e:
        logger.error(f"Error creating folder for document type {document_type}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating folder for document type"
        )


@router.get("/application/{application_id}")
async def get_application_folders_list(
    application_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[FolderResponse]:
    """
    Get all folders for an application as a flat list
    """
    # Check if application exists and user has access
    app_query = await db.execute(
        select(CustomerApplication).where(CustomerApplication.id == application_id)
    )
    application = app_query.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Check permissions
    if current_user.role not in ["admin", "manager"] and application.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this application"
        )
    
    # Get all folders for the application
    folders_query = await db.execute(
        select(Folder)
        .options(selectinload(Folder.files))
        .where(Folder.application_id == application_id)
        .order_by(Folder.parent_id.asc(), Folder.name.asc())
    )
    folders = folders_query.scalars().all()
    
    return [FolderResponse.from_orm(folder) for folder in folders]


@router.get("/{folder_id}")
async def get_folder(
    folder_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> FolderResponse:
    """
    Get a specific folder by ID
    """
    folder_query = await db.execute(
        select(Folder)
        .options(selectinload(Folder.files))
        .where(Folder.id == folder_id)
    )
    folder = folder_query.scalar_one_or_none()
    
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    # Check permissions if folder is associated with an application
    if folder.application_id:
        app_query = await db.execute(
            select(CustomerApplication).where(CustomerApplication.id == folder.application_id)
        )
        application = app_query.scalar_one_or_none()
        
        if application and current_user.role not in ["admin", "manager"] and application.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this folder"
            )
    
    return FolderResponse.from_orm(folder)


@router.post("/", response_model=FolderResponse)
async def create_folder(
    folder_data: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> FolderResponse:
    """
    Create a new folder
    """
    # Check permissions if folder is associated with an application
    if folder_data.application_id:
        app_query = await db.execute(
            select(CustomerApplication).where(CustomerApplication.id == folder_data.application_id)
        )
        application = app_query.scalar_one_or_none()
        
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )
        
        if current_user.role not in ["admin", "manager"] and application.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to create folders for this application"
            )
    
    # Check if parent folder exists and belongs to same application
    if folder_data.parent_id:
        parent_query = await db.execute(
            select(Folder).where(Folder.id == folder_data.parent_id)
        )
        parent_folder = parent_query.scalar_one_or_none()
        
        if not parent_folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent folder not found"
            )
        
        if parent_folder.application_id != folder_data.application_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent folder must belong to the same application"
            )
    
    try:
        new_folder = Folder(
            name=folder_data.name,
            parent_id=folder_data.parent_id,
            application_id=folder_data.application_id
        )
        
        db.add(new_folder)

        
        await db.flush()

        
        await db.refresh(new_folder)
        await db.refresh(new_folder)
        
        logger.info(f"Created new folder: {new_folder.name} for application {folder_data.application_id}")
        
        return FolderResponse.from_orm(new_folder)
        
    except Exception as e:
        logger.error(f"Error creating folder: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating folder"
        )


@router.put("/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: UUID,
    folder_data: FolderUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> FolderResponse:
    """
    Update a folder
    """
    folder_query = await db.execute(
        select(Folder).where(Folder.id == folder_id)
    )
    folder = folder_query.scalar_one_or_none()
    
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    # Check permissions
    if folder.application_id:
        app_query = await db.execute(
            select(CustomerApplication).where(CustomerApplication.id == folder.application_id)
        )
        application = app_query.scalar_one_or_none()
        
        if application and current_user.role not in ["admin", "manager"] and application.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this folder"
            )
    
    try:
        # Update folder fields
        if folder_data.name is not None:
            folder.name = folder_data.name
        
        await db.commit()
        await db.refresh(folder)
        
        logger.info(f"Updated folder: {folder.name}")
        
        return FolderResponse.from_orm(folder)
        
    except Exception as e:
        logger.error(f"Error updating folder: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating folder"
        )


@router.delete("/{folder_id}")
async def delete_folder(
    folder_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, str]:
    """
    Delete a folder (only if it's empty)
    """
    folder_query = await db.execute(
        select(Folder)
        .options(selectinload(Folder.files), selectinload(Folder.children))
        .where(Folder.id == folder_id)
    )
    folder = folder_query.scalar_one_or_none()
    
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    # Check permissions
    if folder.application_id:
        app_query = await db.execute(
            select(CustomerApplication).where(CustomerApplication.id == folder.application_id)
        )
        application = app_query.scalar_one_or_none()
        
        if application and current_user.role not in ["admin", "manager"] and application.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this folder"
            )
    
    # Check if folder is empty
    if folder.files or folder.children:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete folder that contains files or subfolders"
        )
    
    try:
        await db.delete(folder)
        await db.commit()
        
        logger.info(f"Deleted folder: {folder.name}")
        
        return {"message": "Folder deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting folder: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting folder"
        )