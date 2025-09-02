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
    # Check for parent folder
    parent_folder_q = await db.execute(
        select(Folder).where(Folder.application_id == application_id, Folder.parent_id.is_(None))
    )
    parent_folder = parent_folder_q.scalar_one_or_none()

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
    for name in folder_names:
        # Re-fetch to get the final state
        child_folder_q = await db.execute(
            select(Folder).where(
                Folder.application_id == application_id,
                Folder.parent_id == parent_folder.id,
                Folder.name == name
            )
        )
        child_folder = child_folder_q.scalar_one()
        folder_ids[name] = child_folder.id


    return folder_ids