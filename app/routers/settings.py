from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_
from sqlalchemy.sql import func
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from datetime import datetime

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

# Pydantic model for theme updates
class ThemeUpdate(BaseModel):
    default_theme_mode: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    enable_high_contrast: Optional[bool] = None
    font_scale_factor: Optional[float] = None
    allow_user_theme_choice: Optional[bool] = None

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
    },
    "ui_theme": {
        "default_theme_mode": {
            "value": "system",
            "description": "Default theme mode (light, dark, or system)",
            "is_public": True
        },
        "allow_user_theme_choice": {
            "value": True,
            "description": "Allow users to choose their preferred theme",
            "is_public": True
        },
        "primary_color": {
            "value": "#2196F3",
            "description": "Primary color for the application theme",
            "is_public": True
        },
        "secondary_color": {
            "value": "#FF5722",
            "description": "Secondary/accent color for the application theme",
            "is_public": True
        },
        "light_theme_colors": {
            "value": {
                "background": "#FFFFFF",
                "surface": "#F5F5F5",
                "primary": "#2196F3",
                "secondary": "#FF5722",
                "text_primary": "#212121",
                "text_secondary": "#757575",
                "text_disabled": "#BDBDBD",
                "divider": "#E0E0E0",
                "error": "#F44336",
                "success": "#4CAF50",
                "warning": "#FF9800",
                "info": "#2196F3"
            },
            "description": "Color palette for light theme mode",
            "is_public": True
        },
        "dark_theme_colors": {
            "value": {
                "background": "#121212",
                "surface": "#1E1E1E",
                "primary": "#64B5F6",
                "secondary": "#FF8A65",
                "text_primary": "#FFFFFF",
                "text_secondary": "#E0E0E0",
                "text_disabled": "#9E9E9E",
                "divider": "#373737",
                "error": "#EF5350",
                "success": "#66BB6A",
                "warning": "#FFB74D",
                "info": "#64B5F6"
            },
            "description": "Color palette for dark theme mode",
            "is_public": True
        },
        "text_contrast_ratio": {
            "value": 4.5,
            "description": "Minimum text contrast ratio for accessibility (WCAG AA standard)",
            "is_public": True
        },
        "enable_high_contrast": {
            "value": False,
            "description": "Enable high contrast mode for better accessibility",
            "is_public": True
        },
        "font_scale_factor": {
            "value": 1.0,
            "description": "Font scale factor for text size adjustment",
            "is_public": True
        }
    },
    "ui_theme": {
        "default_theme_mode": {
            "value": "system",
            "description": "Default theme mode (light, dark, or system)",
            "is_public": True
        },
        "allow_user_theme_choice": {
            "value": True,
            "description": "Allow users to choose their preferred theme",
            "is_public": True
        },
        "primary_color": {
            "value": "#2196F3",
            "description": "Primary color for the application theme",
            "is_public": True
        },
        "secondary_color": {
            "value": "#FF5722",
            "description": "Secondary/accent color for the application theme",
            "is_public": True
        },
        "light_theme_colors": {
            "value": {
                "background": "#FFFFFF",
                "surface": "#F5F5F5",
                "primary": "#2196F3",
                "secondary": "#FF5722",
                "text_primary": "#212121",
                "text_secondary": "#757575",
                "text_disabled": "#BDBDBD",
                "divider": "#E0E0E0",
                "error": "#F44336",
                "success": "#4CAF50",
                "warning": "#FF9800",
                "info": "#2196F3"
            },
            "description": "Color palette for light theme mode",
            "is_public": True
        },
        "dark_theme_colors": {
            "value": {
                "background": "#121212",
                "surface": "#1E1E1E",
                "primary": "#64B5F6",
                "secondary": "#FF8A65",
                "text_primary": "#FFFFFF",
                "text_secondary": "#E0E0E0",
                "text_disabled": "#9E9E9E",
                "divider": "#373737",
                "error": "#EF5350",
                "success": "#66BB6A",
                "warning": "#FFB74D",
                "info": "#64B5F6"
            },
            "description": "Color palette for dark theme mode",
            "is_public": True
        },
        "text_contrast_ratio": {
            "value": 4.5,
            "description": "Minimum text contrast ratio for accessibility (WCAG AA standard)",
            "is_public": True
        },
        "enable_high_contrast": {
            "value": False,
            "description": "Enable high contrast mode for better accessibility",
            "is_public": True
        },
        "font_scale_factor": {
            "value": 1.0,
            "description": "Font scale factor for text size adjustment",
            "is_public": True
        }
    }
}

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

# Theme-specific endpoints for better frontend integration
@router.get("/theme")
async def get_theme_settings(
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get all UI theme-related settings in a structured format optimized for frontend use
    This endpoint is public and does not require authentication
    """
    try:
        query = select(Setting).where(
            and_(
                Setting.category == "ui_theme",
                Setting.is_public == True
            )
        )
        
        result = await db.execute(query)
        settings = result.scalars().all()
        
        # Structure the theme settings for easy frontend consumption
        theme_config = {
            "mode": "system",  # default
            "colors": {
                "light": {},
                "dark": {}
            },
            "accessibility": {},
            "preferences": {}
        }
        
        for setting in settings:
            key = setting.key
            value = setting.value
            
            if key == "default_theme_mode":
                theme_config["mode"] = value
            elif key == "light_theme_colors":
                theme_config["colors"]["light"] = value
            elif key == "dark_theme_colors":
                theme_config["colors"]["dark"] = value
            elif key in ["text_contrast_ratio", "enable_high_contrast", "font_scale_factor"]:
                theme_config["accessibility"][key] = value
            else:
                theme_config["preferences"][key] = value
        
        return {
            "theme_config": theme_config,
            "last_updated": settings[0].updated_at.isoformat() if settings else None,
            "settings_count": len(settings)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching theme settings: {str(e)}"
        )

@router.put("/theme")
async def update_theme_settings(
    theme_updates: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Update theme settings with validation
    """
    try:
        updated_settings = {}
        
        # Define allowed theme keys and their validation
        allowed_updates = {
            "default_theme_mode": lambda x: x in ["light", "dark", "system"],
            "primary_color": lambda x: isinstance(x, str) and x.startswith('#') and len(x) == 7,
            "secondary_color": lambda x: isinstance(x, str) and x.startswith('#') and len(x) == 7,
            "enable_high_contrast": lambda x: isinstance(x, bool),
            "font_scale_factor": lambda x: isinstance(x, (int, float)) and 0.5 <= x <= 2.0,
            "allow_user_theme_choice": lambda x: isinstance(x, bool)
        }
        
        for key, value in theme_updates.items():
            if key in allowed_updates:
                # Validate the value
                if not allowed_updates[key](value):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid value for {key}: {value}"
                    )
                
                # Find and update the setting
                query = select(Setting).where(Setting.key == key)
                result = await db.execute(query)
                setting = result.scalar_one_or_none()
                
                if setting:
                    setting.value = value
                    setting.updated_by = current_user.id
                    updated_settings[key] = value
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Theme setting '{key}' not found"
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid theme setting key: {key}"
                )
        
        await db.commit()
        
        return {
            "message": f"Updated {len(updated_settings)} theme settings",
            "updated_settings": updated_settings,
            "updated_at": datetime.now().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating theme settings: {str(e)}"
        )

@router.get("/theme/colors")
async def get_color_palettes(
    theme_mode: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get color palettes for light and/or dark themes
    This endpoint is public and does not require authentication
    """
    try:
        color_settings = []
        
        if theme_mode and theme_mode in ["light", "dark"]:
            # Get specific theme colors
            key = f"{theme_mode}_theme_colors"
            query = select(Setting).where(Setting.key == key)
        else:
            # Get both light and dark theme colors
            query = select(Setting).where(
                Setting.key.in_(["light_theme_colors", "dark_theme_colors"])
            )
        
        result = await db.execute(query)
        settings = result.scalars().all()
        
        color_palettes = {}
        for setting in settings:
            if setting.key == "light_theme_colors":
                color_palettes["light"] = setting.value
            elif setting.key == "dark_theme_colors":
                color_palettes["dark"] = setting.value
        
        return {
            "color_palettes": color_palettes,
            "requested_mode": theme_mode,
            "available_modes": list(color_palettes.keys())
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching color palettes: {str(e)}"
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
