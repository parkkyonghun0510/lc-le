from uuid import UUID
from typing import Dict, Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models import Folder, File
from app.core.logging import get_logger
from enum import Enum

logger = get_logger(__name__)

class DocumentType(Enum):
    """Document type enumeration for folder organization"""
    # Borrower documents
    BORROWER_PHOTO = "borrower_photo"
    BORROWER_ID_CARD = "borrower_id_card"
    BORROWER_FAMILY_BOOK = "borrower_family_book"
    BORROWER_INCOME_PROOF = "borrower_income_proof"
    BORROWER_BANK_STATEMENT = "borrower_bank_statement"
    
    # Guarantor documents
    GUARANTOR_PHOTO = "guarantor_photo"
    GUARANTOR_ID_CARD = "guarantor_id_card"
    GUARANTOR_FAMILY_BOOK = "guarantor_family_book"
    GUARANTOR_INCOME_PROOF = "guarantor_income_proof"
    GUARANTOR_BANK_STATEMENT = "guarantor_bank_statement"
    
    # Collateral documents
    LAND_TITLE = "land_title"
    PROPERTY_VALUATION = "property_valuation"
    PROPERTY_PHOTOS = "property_photos"
    VEHICLE_REGISTRATION = "vehicle_registration"
    VEHICLE_PHOTOS = "vehicle_photos"
    
    # Business documents
    BUSINESS_LICENSE = "business_license"
    BUSINESS_REGISTRATION = "business_registration"
    BUSINESS_FINANCIAL_STATEMENT = "business_financial_statement"
    
    # Supporting documents
    LOAN_APPLICATION_FORM = "loan_application_form"
    CREDIT_REPORT = "credit_report"
    REFERENCE_LETTER = "reference_letter"
    OTHER_SUPPORTING_DOC = "other_supporting_doc"
    OTHER = "other"
    
    # Legacy compatibility aliases
    BORROWER_ID = "borrower_id"  # alias for borrower_id_card
    GUARANTOR_ID = "guarantor_id"  # alias for guarantor_id_card
    COLLATERAL_PHOTO = "collateral_photo"  # alias for property_photos/vehicle_photos
    COLLATERAL_DOCUMENT = "collateral_document"  # alias for land_title/vehicle_registration
    CONTRACT = "contract"  # alias for loan_application_form


class FolderOrganizationConfig:
    """Configuration for document type to folder mapping"""
    
    # Document type to folder name mapping
    DOCUMENT_TYPE_TO_FOLDER = {
        # Borrower documents
        DocumentType.BORROWER_PHOTO: "Borrower Documents",
        DocumentType.BORROWER_ID_CARD: "Borrower Documents", 
        DocumentType.BORROWER_FAMILY_BOOK: "Borrower Documents",
        DocumentType.BORROWER_INCOME_PROOF: "Borrower Documents",
        DocumentType.BORROWER_BANK_STATEMENT: "Borrower Documents",
        
        # Guarantor documents
        DocumentType.GUARANTOR_PHOTO: "Guarantor Documents",
        DocumentType.GUARANTOR_ID_CARD: "Guarantor Documents",
        DocumentType.GUARANTOR_FAMILY_BOOK: "Guarantor Documents", 
        DocumentType.GUARANTOR_INCOME_PROOF: "Guarantor Documents",
        DocumentType.GUARANTOR_BANK_STATEMENT: "Guarantor Documents",
        
        # Collateral documents
        DocumentType.LAND_TITLE: "Collateral Documents",
        DocumentType.PROPERTY_VALUATION: "Collateral Documents",
        DocumentType.PROPERTY_PHOTOS: "Collateral Documents",
        DocumentType.VEHICLE_REGISTRATION: "Collateral Documents",
        DocumentType.VEHICLE_PHOTOS: "Collateral Documents",
        
        # Business documents
        DocumentType.BUSINESS_LICENSE: "Business Documents",
        DocumentType.BUSINESS_REGISTRATION: "Business Documents", 
        DocumentType.BUSINESS_FINANCIAL_STATEMENT: "Business Documents",
        
        # Supporting documents
        DocumentType.LOAN_APPLICATION_FORM: "Supporting Documents",
        DocumentType.CREDIT_REPORT: "Supporting Documents",
        DocumentType.REFERENCE_LETTER: "Supporting Documents",
        DocumentType.OTHER_SUPPORTING_DOC: "Supporting Documents",
        DocumentType.OTHER: "Supporting Documents",
        
        # Legacy compatibility aliases
        DocumentType.BORROWER_ID: "Borrower Documents",  # alias for borrower_id_card
        DocumentType.GUARANTOR_ID: "Guarantor Documents",  # alias for guarantor_id_card
        DocumentType.COLLATERAL_PHOTO: "Collateral Documents",  # alias for property_photos/vehicle_photos
        DocumentType.COLLATERAL_DOCUMENT: "Collateral Documents",  # alias for land_title/vehicle_registration
        DocumentType.CONTRACT: "Supporting Documents",  # alias for loan_application_form
    }
    
    # Standard folder structure for applications
    STANDARD_FOLDERS = [
        "Borrower Documents",
        "Guarantor Documents", 
        "Collateral Documents",
        "Business Documents",
        "Supporting Documents"
    ]
    
    # Legacy folder mapping for backward compatibility
    LEGACY_FOLDER_MAPPING = {
        "photos": "Borrower Documents",
        "references": "Supporting Documents", 
        "supporting_docs": "Supporting Documents"
    }
    
    @classmethod
    def get_folder_name_for_document_type(cls, document_type: str) -> Optional[str]:
        """Get the folder name for a given document type"""
        try:
            doc_type_enum = DocumentType(document_type)
            return cls.DOCUMENT_TYPE_TO_FOLDER.get(doc_type_enum)
        except ValueError:
            logger.warning(f"Unknown document type: {document_type}")
            return None
    
    @classmethod
    def is_valid_document_type(cls, document_type: str) -> bool:
        """Check if a document type is valid"""
        try:
            DocumentType(document_type)
            return True
        except ValueError:
            return False


class EnhancedFolderService:
    """Enhanced folder service with document type organization"""
    
    @staticmethod
    async def get_or_create_folder_for_document_type(
        db: AsyncSession, 
        application_id: UUID, 
        document_type: str
    ) -> Optional[UUID]:
        """
        Get or create a folder for a specific document type
        
        Args:
            db: Database session
            application_id: Application UUID
            document_type: Document type string
            
        Returns:
            Folder UUID if successful, None if document type is invalid
        """
        folder_name = FolderOrganizationConfig.get_folder_name_for_document_type(document_type)
        if not folder_name:
            logger.warning(f"No folder mapping found for document type: {document_type}")
            return None
        
        return await EnhancedFolderService._get_or_create_folder_by_name(
            db, application_id, folder_name
        )
    
    @staticmethod
    async def _get_or_create_folder_by_name(
        db: AsyncSession,
        application_id: UUID, 
        folder_name: str
    ) -> UUID:
        """
        Get or create a folder by name within an application
        
        Args:
            db: Database session
            application_id: Application UUID
            folder_name: Name of the folder to create/find
            
        Returns:
            Folder UUID
        """
        # Ensure parent folder exists first
        parent_folder = await EnhancedFolderService._get_or_create_parent_folder(
            db, application_id
        )
        
        # Look for existing folder with this name
        existing_folder_query = await db.execute(
            select(Folder).where(
                Folder.application_id == application_id,
                Folder.parent_id == parent_folder.id,
                Folder.name == folder_name
            )
        )
        existing_folder = existing_folder_query.scalar_one_or_none()
        
        if existing_folder:
            logger.debug(f"Found existing folder: {folder_name} for application {application_id}")
            return existing_folder.id
        
        # Create new folder
        new_folder = Folder(
            name=folder_name,
            application_id=application_id,
            parent_id=parent_folder.id
        )
        db.add(new_folder)

        await db.flush()

        await db.refresh(new_folder)

        await db.commit()

        logger.info(f"Created new folder: {folder_name} for application {application_id}")
        return new_folder.id
    
    @staticmethod
    async def _get_or_create_parent_folder(
        db: AsyncSession,
        application_id: UUID
    ) -> Folder:
        """
        Get or create the parent folder for an application, handling duplicates
        
        Args:
            db: Database session
            application_id: Application UUID
            
        Returns:
            Parent Folder object
        """
        # Look for existing parent folders
        parent_folders_query = await db.execute(
            select(Folder).where(
                Folder.application_id == application_id,
                Folder.parent_id.is_(None)
            )
        )
        parent_folders = parent_folders_query.scalars().all()
        
        if len(parent_folders) == 0:
            # Create new parent folder
            parent_folder = Folder(
                name=f"Application {application_id} Files",
                application_id=application_id,
                parent_id=None
            )
            db.add(parent_folder)

            await db.flush()

            await db.refresh(parent_folder)

            await db.commit()
            logger.info(f"Created new parent folder for application {application_id}")
            return parent_folder
        
        elif len(parent_folders) == 1:
            # Single parent folder exists
            return parent_folders[0]
        
        else:
            # Multiple parent folders - consolidate them
            logger.warning(f"Found {len(parent_folders)} parent folders for application {application_id}, consolidating...")
            return await EnhancedFolderService._consolidate_duplicate_parent_folders(
                db, parent_folders
            )
    
    @staticmethod
    async def _consolidate_duplicate_parent_folders(
        db: AsyncSession,
        duplicate_folders: List[Folder]
    ) -> Folder:
        """
        Consolidate duplicate parent folders while preserving all data
        
        Args:
            db: Database session
            duplicate_folders: List of duplicate parent folders
            
        Returns:
            Primary parent folder after consolidation
        """
        primary_folder = duplicate_folders[0]
        
        for duplicate in duplicate_folders[1:]:
            # Move child folders to primary folder
            child_folders_query = await db.execute(
                select(Folder).where(Folder.parent_id == duplicate.id)
            )
            child_folders = child_folders_query.scalars().all()
            
            for child_folder in child_folders:
                # Check if a folder with the same name already exists under primary
                existing_child_query = await db.execute(
                    select(Folder).where(
                        Folder.application_id == primary_folder.application_id,
                        Folder.parent_id == primary_folder.id,
                        Folder.name == child_folder.name
                    )
                )
                existing_child = existing_child_query.scalar_one_or_none()
                
                if existing_child:
                    # Move files from duplicate child to existing child
                    await EnhancedFolderService._move_files_between_folders(
                        db, child_folder.id, existing_child.id
                    )
                    # Delete duplicate child folder
                    await db.delete(child_folder)
                    logger.info(f"Merged duplicate child folder: {child_folder.name}")
                else:
                    # Move child folder to primary parent
                    child_folder.parent_id = primary_folder.id
                    logger.info(f"Moved child folder to primary parent: {child_folder.name}")
            
            # Move files directly attached to duplicate parent
            await EnhancedFolderService._move_files_between_folders(
                db, duplicate.id, primary_folder.id
            )
            
            # Delete duplicate parent folder
            await db.delete(duplicate)
            logger.info(f"Deleted duplicate parent folder: {duplicate.name}")
        
        await db.commit()
        return primary_folder
    
    @staticmethod
    async def _move_files_between_folders(
        db: AsyncSession,
        source_folder_id: UUID,
        target_folder_id: UUID
    ) -> int:
        """
        Move all files from source folder to target folder
        
        Args:
            db: Database session
            source_folder_id: Source folder UUID
            target_folder_id: Target folder UUID
            
        Returns:
            Number of files moved
        """
        files_query = await db.execute(
            select(File).where(File.folder_id == source_folder_id)
        )
        files = files_query.scalars().all()
        
        files_moved = 0
        for file in files:
            file.folder_id = target_folder_id
            files_moved += 1
        
        if files_moved > 0:
            logger.info(f"Moved {files_moved} files from folder {source_folder_id} to {target_folder_id}")
        
        return files_moved
    
    @staticmethod
    async def get_application_folder_hierarchy(
        db: AsyncSession,
        application_id: UUID
    ) -> Dict[str, any]:
        """
        Get the complete folder hierarchy for an application
        
        Args:
            db: Database session
            application_id: Application UUID
            
        Returns:
            Dictionary containing folder hierarchy with file counts
        """
        # Get all folders for the application
        folders_query = await db.execute(
            select(Folder)
            .options(selectinload(Folder.files))
            .where(Folder.application_id == application_id)
            .order_by(Folder.parent_id.asc(), Folder.name.asc())
        )
        folders = folders_query.scalars().all()
        
        # Build hierarchy
        hierarchy = {
            "application_id": str(application_id),
            "folders": [],
            "total_files": 0
        }
        
        # Find parent folders
        parent_folders = [f for f in folders if f.parent_id is None]
        
        for parent in parent_folders:
            parent_data = {
                "id": str(parent.id),
                "name": parent.name,
                "file_count": len(parent.files),
                "children": []
            }
            
            # Find child folders
            child_folders = [f for f in folders if f.parent_id == parent.id]
            for child in child_folders:
                child_data = {
                    "id": str(child.id),
                    "name": child.name,
                    "file_count": len(child.files)
                }
                parent_data["children"].append(child_data)
                parent_data["file_count"] += child_data["file_count"]
            
            hierarchy["folders"].append(parent_data)
            hierarchy["total_files"] += parent_data["file_count"]
        
        return hierarchy


async def get_or_create_application_folder_structure(db: AsyncSession, application_id: UUID) -> Dict[str, UUID]:
    """
    Ensures the standard folder structure exists for an application, creating it if necessary.
    Now uses the enhanced folder organization system with document type mapping.
    
    Returns a dictionary with folder names mapped to UUIDs for backward compatibility.
    """
    logger.info(f"Creating/retrieving folder structure for application {application_id}")
    
    # Get or create parent folder (handles duplicates automatically)
    parent_folder = await EnhancedFolderService._get_or_create_parent_folder(db, application_id)
    
    # Initialize folder IDs dictionary with parent
    folder_ids = {"parent_id": parent_folder.id}
    
    # Create standard folders using the new organization system
    for folder_name in FolderOrganizationConfig.STANDARD_FOLDERS:
        folder_id = await EnhancedFolderService._get_or_create_folder_by_name(
            db, application_id, folder_name
        )
        folder_ids[folder_name] = folder_id
    
    # Maintain backward compatibility with legacy folder names
    for legacy_name, modern_name in FolderOrganizationConfig.LEGACY_FOLDER_MAPPING.items():
        if modern_name in folder_ids:
            folder_ids[legacy_name] = folder_ids[modern_name]
    
    await db.commit()
    
    logger.info(f"Folder structure ready for application {application_id}: {list(folder_ids.keys())}")
    return folder_ids


async def get_folder_for_document_type(
    db: AsyncSession,
    application_id: UUID,
    document_type: str
) -> Optional[UUID]:
    """
    Get or create a folder for a specific document type.
    This is the main entry point for document type-based folder organization.
    
    Args:
        db: Database session
        application_id: Application UUID
        document_type: Document type string (e.g., 'borrower_photo', 'land_title')
        
    Returns:
        Folder UUID if successful, None if document type is invalid
    """
    return await EnhancedFolderService.get_or_create_folder_for_document_type(
        db, application_id, document_type
    )


async def get_application_folder_hierarchy(
    db: AsyncSession,
    application_id: UUID
) -> Dict[str, any]:
    """
    Get the complete folder hierarchy for an application with file counts.
    
    Args:
        db: Database session
        application_id: Application UUID
        
    Returns:
        Dictionary containing folder hierarchy information
    """
    return await EnhancedFolderService.get_application_folder_hierarchy(
        db, application_id
    )