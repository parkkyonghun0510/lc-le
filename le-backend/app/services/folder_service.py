from uuid import UUID
from typing import Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models import Folder

async def get_or_create_application_folder_structure(db: AsyncSession, application_id: UUID) -> Dict[str, UUID]:
    """
    Ensures the standard folder structure exists for an application, creating it if necessary.
    The structure is:
    - <application_id> (parent folder)
      - photos
      - references
      - supporting_docs
    """
    # Check for parent folder - handle multiple parent folders by taking the first one
    parent_folder_q = await db.execute(
        select(Folder).where(Folder.application_id == application_id, Folder.parent_id.is_(None))
    )
    parent_folders = parent_folder_q.scalars().all()
    
    if parent_folders:
        # If multiple parent folders exist, use the first one and clean up duplicates
        parent_folder = parent_folders[0]
        
        # Clean up duplicate parent folders if they exist
        if len(parent_folders) > 1:
            for duplicate_folder in parent_folders[1:]:
                # Move any child folders to the main parent folder
                child_folders_q = await db.execute(
                    select(Folder).where(Folder.parent_id == duplicate_folder.id)
                )
                child_folders = child_folders_q.scalars().all()
                
                for child_folder in child_folders:
                    # Check if a folder with the same name already exists under the main parent
                    existing_child_q = await db.execute(
                        select(Folder).where(
                            Folder.application_id == application_id,
                            Folder.parent_id == parent_folder.id,
                            Folder.name == child_folder.name
                        )
                    )
                    existing_child = existing_child_q.scalar_one_or_none()
                    
                    if existing_child:
                        # Move files from duplicate child to existing child
                        from app.models import File
                        files_q = await db.execute(
                            select(File).where(File.folder_id == child_folder.id)
                        )
                        files = files_q.scalars().all()
                        for file in files:
                            file.folder_id = existing_child.id
                        
                        # Delete the duplicate child folder
                        await db.delete(child_folder)
                    else:
                        # Move the child folder to the main parent
                        child_folder.parent_id = parent_folder.id
                
                # Delete the duplicate parent folder
                await db.delete(duplicate_folder)
            
            await db.commit()
    else:
        parent_folder = None

    if not parent_folder:
        parent_folder = Folder(
            name=f"Application {application_id} Files",
            application_id=application_id,
            parent_id=None
        )
        db.add(parent_folder)
        await db.flush()  # Flush to get the ID for child folders

    folder_names = ["photos", "references", "supporting_docs"]
    folder_ids = {"parent_id": parent_folder.id}

    for name in folder_names:
        child_folder_q = await db.execute(
            select(Folder).where(
                Folder.application_id == application_id,
                Folder.parent_id == parent_folder.id,
                Folder.name == name
            )
        )
        child_folder = child_folder_q.scalar_one_or_none()

        if not child_folder:
            child_folder = Folder(
                name=name,
                application_id=application_id,
                parent_id=parent_folder.id
            )
            db.add(child_folder)
            await db.flush()
        
        folder_ids[name] = child_folder.id

    await db.commit()
    
    # Refresh parent to ensure it's up-to-date
    await db.refresh(parent_folder)
    
    # Re-fetch all child folders to ensure we have the correct IDs after any cleanup
    for name in folder_names:
        child_folder_q = await db.execute(
            select(Folder).where(
                Folder.application_id == application_id,
                Folder.parent_id == parent_folder.id,
                Folder.name == name
            )
        )
        child_folder = child_folder_q.scalar_one_or_none()
        if child_folder:
            folder_ids[name] = child_folder.id

    return folder_ids