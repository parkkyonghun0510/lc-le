from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models import Setting, User
from app.routers.auth import get_current_user

router = APIRouter()

# Pydantic models for settings
class SettingCreate(BaseModel):
    key: str
    value: Any
    category: str
    description: Optional[str] = None
    is_public: bool = False

class SettingUpdate(BaseModel):
    value: Any
    description: Optional[str] = None
    is_public: Optional[bool] = None

class SettingResponse(BaseModel):
    id: str
    key: str
    value: Any
    category: str
    description: Optional[str]
    is_public: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

# Default settings that should be created on first run
DEFAULT_SETTINGS = {
    "general": {
        "app_name": {
            "value": "LC Workflow System",
            "description": "Application name displayed in the UI",
            "is_public": True
        },
        "company_name": {
            "value": "",
            "description": "Company name for branding",
            "is_public": True
        },
        "default_language": {
            "value": "en",
            "description": "Default language for the application",
            "is_public": True
        },
        "timezone": {
            "value": "Asia/Phnom_Penh",
            "description": "Default timezone for the application",
            "is_public": True
        },
        "company_logo_url": {
            "value": "",
            "description": "URL to company logo",
            "is_public": True
        },
        "company_address": {
            "value": "",
            "description": "Company address",
            "is_public": True
        },
        "company_phone": {
            "value": "",
            "description": "Company phone number",
            "is_public": True
        },
        "company_email": {
            "value": "",
            "description": "Company email address",
            "is_public": True
        }
    },
    "security": {
        "password_min_length": {
            "value": 8,
            "description": "Minimum password length",
            "is_public": False
        },
        "password_require_uppercase": {
            "value": True,
            "description": "Require uppercase letters in passwords",
            "is_public": False
        },
        "password_require_numbers": {
            "value": True,
            "description": "Require numbers in passwords",
            "is_public": False
        },
        "password_require_special": {
            "value": False,
            "description": "Require special characters in passwords",
            "is_public": False
        },
        "session_timeout_minutes": {
            "value": 30,
            "description": "Session timeout in minutes",
            "is_public": False
        },
        "force_logout_on_close": {
            "value": False,
            "description": "Force logout when browser is closed",
            "is_public": False
        }
    },
    "users": {
        "default_user_role": {
            "value": "officer",
            "description": "Default role for new users",
            "is_public": False
        },
        "require_admin_approval": {
            "value": False,
            "description": "Require admin approval for new user accounts",
            "is_public": False
        },
        "require_email_verification": {
            "value": False,
            "description": "Require email verification for new accounts",
            "is_public": False
        }
    },
    "applications": {
        "auto_assign_applications": {
            "value": False,
            "description": "Auto-assign applications to available officers",
            "is_public": False
        },
        "require_manager_approval": {
            "value": True,
            "description": "Require manager approval for applications over threshold",
            "is_public": False
        },
        "manager_approval_threshold": {
            "value": 10000,
            "description": "Manager approval threshold amount",
            "is_public": False
        }
    },
    "notifications": {
        "email_new_application": {
            "value": True,
            "description": "Email notifications for new applications",
            "is_public": False
        },
        "email_status_changes": {
            "value": True,
            "description": "Email notifications for status changes",
            "is_public": False
        },
        "email_system_maintenance": {
            "value": False,
            "description": "Email notifications for system maintenance",
            "is_public": False
        }
    }
}

@router.get("/")
async def get_all_settings(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get all settings, optionally filtered by category
    """
    try:
        query = select(Setting)
        
        # Non-admin users can only see public settings
        if current_user.role != 'admin':
            query = query.where(Setting.is_public == True)
        
        # Filter by category if provided
        if category:
            query = query.where(Setting.category == category)
        
        result = await db.execute(query)
        settings = result.scalars().all()
        
        # Group settings by category
        grouped_settings = {}
        for setting in settings:
            if setting.category not in grouped_settings:
                grouped_settings[setting.category] = {}
            
            grouped_settings[setting.category][setting.key] = {
                "id": str(setting.id),
                "value": setting.value,
                "description": setting.description,
                "is_public": setting.is_public,
                "created_at": setting.created_at.isoformat(),
                "updated_at": setting.updated_at.isoformat()
            }
        
        return grouped_settings
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching settings: {str(e)}"
        )

@router.get("/categories")
async def get_setting_categories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[str]:
    """
    Get all available setting categories
    """
    try:
        query = select(Setting.category).distinct()
        
        # Non-admin users can only see categories with public settings
        if current_user.role != 'admin':
            query = query.where(Setting.is_public == True)
        
        result = await db.execute(query)
        categories = [row[0] for row in result.fetchall()]
        
        return sorted(categories)
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching categories: {str(e)}"
        )

@router.get("/{key}")
async def get_setting(
    key: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get a specific setting by key
    """
    try:
        query = select(Setting).where(Setting.key == key)
        
        # Non-admin users can only see public settings
        if current_user.role != 'admin':
            query = query.where(Setting.is_public == True)
        
        result = await db.execute(query)
        setting = result.scalar_one_or_none()
        
        if not setting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Setting '{key}' not found or not accessible"
            )
        
        return {
            "id": str(setting.id),
            "key": setting.key,
            "value": setting.value,
            "category": setting.category,
            "description": setting.description,
            "is_public": setting.is_public,
            "created_at": setting.created_at.isoformat(),
            "updated_at": setting.updated_at.isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching setting: {str(e)}"
        )

@router.post("/")
async def create_setting(
    setting_data: SettingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Create a new setting (admin only)
    """
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create settings"
        )
    
    try:
        # Check if setting already exists
        existing_query = select(Setting).where(Setting.key == setting_data.key)
        existing_result = await db.execute(existing_query)
        existing_setting = existing_result.scalar_one_or_none()
        
        if existing_setting:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Setting '{setting_data.key}' already exists"
            )
        
        # Create new setting
        new_setting = Setting(
            key=setting_data.key,
            value=setting_data.value,
            category=setting_data.category,
            description=setting_data.description,
            is_public=setting_data.is_public,
            created_by=current_user.id,
            updated_by=current_user.id
        )
        
        db.add(new_setting)
        await db.commit()
        await db.refresh(new_setting)
        
        return {
            "id": str(new_setting.id),
            "key": new_setting.key,
            "value": new_setting.value,
            "category": new_setting.category,
            "description": new_setting.description,
            "is_public": new_setting.is_public,
            "created_at": new_setting.created_at.isoformat(),
            "updated_at": new_setting.updated_at.isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating setting: {str(e)}"
        )

@router.put("/{key}")
async def update_setting(
    key: str,
    setting_data: SettingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Update an existing setting (admin only)
    """
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update settings"
        )
    
    try:
        # Find existing setting
        query = select(Setting).where(Setting.key == key)
        result = await db.execute(query)
        setting = result.scalar_one_or_none()
        
        if not setting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Setting '{key}' not found"
            )
        
        # Update setting
        setting.value = setting_data.value
        if setting_data.description is not None:
            setting.description = setting_data.description
        if setting_data.is_public is not None:
            setting.is_public = setting_data.is_public
        setting.updated_by = current_user.id
        
        await db.commit()
        await db.refresh(setting)
        
        return {
            "id": str(setting.id),
            "key": setting.key,
            "value": setting.value,
            "category": setting.category,
            "description": setting.description,
            "is_public": setting.is_public,
            "created_at": setting.created_at.isoformat(),
            "updated_at": setting.updated_at.isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating setting: {str(e)}"
        )

@router.patch("/bulk")
async def bulk_update_settings(
    settings_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Bulk update multiple settings (admin only)
    """
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update settings"
        )
    
    try:
        updated_settings = {}
        
        for key, value in settings_data.items():
            # Find existing setting
            query = select(Setting).where(Setting.key == key)
            result = await db.execute(query)
            setting = result.scalar_one_or_none()
            
            if setting:
                # Update existing setting
                setting.value = value
                setting.updated_by = current_user.id
                updated_settings[key] = {
                    "id": str(setting.id),
                    "value": value,
                    "status": "updated"
                }
            else:
                # Create new setting (assume general category for bulk updates)
                new_setting = Setting(
                    key=key,
                    value=value,
                    category="general",
                    is_public=True,
                    created_by=current_user.id,
                    updated_by=current_user.id
                )
                db.add(new_setting)
                await db.flush()  # Get the ID without committing
                
                updated_settings[key] = {
                    "id": str(new_setting.id),
                    "value": value,
                    "status": "created"
                }
        
        await db.commit()
        
        return {
            "message": f"Successfully updated {len(updated_settings)} settings",
            "settings": updated_settings
        }
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error bulk updating settings: {str(e)}"
        )

@router.delete("/{key}")
async def delete_setting(
    key: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, str]:
    """
    Delete a setting (admin only)
    """
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete settings"
        )
    
    try:
        # Find existing setting
        query = select(Setting).where(Setting.key == key)
        result = await db.execute(query)
        setting = result.scalar_one_or_none()
        
        if not setting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Setting '{key}' not found"
            )
        
        await db.delete(setting)
        await db.commit()
        
        return {"message": f"Setting '{key}' deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting setting: {str(e)}"
        )

@router.post("/initialize")
async def initialize_default_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Initialize default settings (admin only)
    """
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can initialize settings"
        )
    
    try:
        created_count = 0
        skipped_count = 0
        
        for category, settings in DEFAULT_SETTINGS.items():
            for key, config in settings.items():
                # Check if setting already exists
                existing_query = select(Setting).where(Setting.key == key)
                existing_result = await db.execute(existing_query)
                existing_setting = existing_result.scalar_one_or_none()
                
                if not existing_setting:
                    # Create new setting
                    new_setting = Setting(
                        key=key,
                        value=config["value"],
                        category=category,
                        description=config["description"],
                        is_public=config["is_public"],
                        created_by=current_user.id,
                        updated_by=current_user.id
                    )
                    db.add(new_setting)
                    created_count += 1
                else:
                    skipped_count += 1
        
        await db.commit()
        
        return {
            "message": "Default settings initialized successfully",
            "created": created_count,
            "skipped": skipped_count,
            "total": created_count + skipped_count
        }
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error initializing settings: {str(e)}"
        )