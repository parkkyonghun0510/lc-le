"""
Feature Flags Management Router

Provides endpoints for managing feature flags, including creation, updates,
rollout control, and monitoring of feature flag usage.
"""

from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from datetime import datetime

from app.core.feature_flags import (
    feature_flags,
    FeatureFlag,
    FeatureFlagType,
    RolloutStrategy,
    is_feature_enabled,
    get_user_flags
)
from app.core.security import get_current_user
from app.models import User
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()


# Pydantic models for API requests/responses
class FeatureFlagRequest(BaseModel):
    name: str = Field(..., description="Unique name for the feature flag")
    description: str = Field(..., description="Description of the feature")
    flag_type: str = Field(..., description="Type of feature flag")
    enabled: bool = Field(default=False, description="Whether the flag is enabled")
    rollout_strategy: str = Field(..., description="Rollout strategy")
    rollout_percentage: float = Field(default=0.0, ge=0, le=100, description="Rollout percentage (0-100)")
    user_whitelist: List[str] = Field(default_factory=list, description="List of whitelisted users")
    role_whitelist: List[str] = Field(default_factory=list, description="List of whitelisted roles")
    start_date: Optional[datetime] = Field(None, description="Start date for the flag")
    end_date: Optional[datetime] = Field(None, description="End date for the flag")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class FeatureFlagUpdateRequest(BaseModel):
    description: Optional[str] = None
    enabled: Optional[bool] = None
    rollout_strategy: Optional[str] = None
    rollout_percentage: Optional[float] = Field(None, ge=0, le=100)
    user_whitelist: Optional[List[str]] = None
    role_whitelist: Optional[List[str]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None


class FeatureFlagResponse(BaseModel):
    name: str
    description: str
    flag_type: str
    enabled: bool
    rollout_strategy: str
    rollout_percentage: float
    user_whitelist: List[str]
    role_whitelist: List[str]
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    metadata: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_feature_flag(cls, flag: FeatureFlag) -> 'FeatureFlagResponse':
        return cls(
            name=flag.name,
            description=flag.description,
            flag_type=flag.flag_type.value,
            enabled=flag.enabled,
            rollout_strategy=flag.rollout_strategy.value,
            rollout_percentage=flag.rollout_percentage,
            user_whitelist=flag.user_whitelist,
            role_whitelist=flag.role_whitelist,
            start_date=flag.start_date,
            end_date=flag.end_date,
            metadata=flag.metadata,
            created_at=flag.created_at,
            updated_at=flag.updated_at
        )


class UserFlagsResponse(BaseModel):
    user_id: Optional[str]
    user_role: Optional[str]
    enabled_flags: Dict[str, bool]
    total_flags: int
    enabled_count: int


class FeatureFlagStatsResponse(BaseModel):
    total_flags: int
    enabled_flags: int
    disabled_flags: int
    flags_by_type: Dict[str, int]
    flags_by_strategy: Dict[str, int]


# Feature flag management endpoints
@router.get("/", response_model=List[FeatureFlagResponse])
async def get_all_feature_flags(
    enabled_only: bool = Query(False, description="Return only enabled flags"),
    flag_type: Optional[str] = Query(None, description="Filter by flag type"),
    current_user: User = Depends(get_current_user)
) -> List[FeatureFlagResponse]:
    """Get all feature flags"""
    
    # Only admin users can view all feature flags
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    all_flags = feature_flags.get_all_flags()
    
    # Apply filters
    filtered_flags = []
    for flag in all_flags.values():
        if enabled_only and not flag.enabled:
            continue
        if flag_type and flag.flag_type.value != flag_type:
            continue
        filtered_flags.append(FeatureFlagResponse.from_feature_flag(flag))
    
    return filtered_flags


@router.get("/{flag_name}", response_model=FeatureFlagResponse)
async def get_feature_flag(
    flag_name: str,
    current_user: User = Depends(get_current_user)
) -> FeatureFlagResponse:
    """Get a specific feature flag"""
    
    # Only admin users can view feature flag details
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    flag = feature_flags.get_flag(flag_name)
    if not flag:
        raise HTTPException(status_code=404, detail=f"Feature flag '{flag_name}' not found")
    
    return FeatureFlagResponse.from_feature_flag(flag)


@router.post("/", response_model=FeatureFlagResponse)
async def create_feature_flag(
    flag_request: FeatureFlagRequest,
    current_user: User = Depends(get_current_user)
) -> FeatureFlagResponse:
    """Create a new feature flag"""
    
    # Only admin users can create feature flags
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if flag already exists
    if feature_flags.get_flag(flag_request.name):
        raise HTTPException(status_code=400, detail=f"Feature flag '{flag_request.name}' already exists")
    
    # Validate flag type and rollout strategy
    try:
        flag_type = FeatureFlagType(flag_request.flag_type)
        rollout_strategy = RolloutStrategy(flag_request.rollout_strategy)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid flag type or rollout strategy: {e}")
    
    # Create the feature flag
    flag = FeatureFlag(
        name=flag_request.name,
        description=flag_request.description,
        flag_type=flag_type,
        enabled=flag_request.enabled,
        rollout_strategy=rollout_strategy,
        rollout_percentage=flag_request.rollout_percentage,
        user_whitelist=flag_request.user_whitelist,
        role_whitelist=flag_request.role_whitelist,
        start_date=flag_request.start_date,
        end_date=flag_request.end_date,
        metadata=flag_request.metadata
    )
    
    feature_flags.create_flag(flag)
    
    logger.info(f"Feature flag '{flag_request.name}' created by user {current_user.id}")
    
    return FeatureFlagResponse.from_feature_flag(flag)


@router.put("/{flag_name}", response_model=FeatureFlagResponse)
async def update_feature_flag(
    flag_name: str,
    flag_update: FeatureFlagUpdateRequest,
    current_user: User = Depends(get_current_user)
) -> FeatureFlagResponse:
    """Update an existing feature flag"""
    
    # Only admin users can update feature flags
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if flag exists
    flag = feature_flags.get_flag(flag_name)
    if not flag:
        raise HTTPException(status_code=404, detail=f"Feature flag '{flag_name}' not found")
    
    # Prepare update data
    update_data = {}
    for field, value in flag_update.dict(exclude_unset=True).items():
        if value is not None:
            if field == "rollout_strategy" and value:
                try:
                    update_data[field] = RolloutStrategy(value)
                except ValueError:
                    raise HTTPException(status_code=400, detail=f"Invalid rollout strategy: {value}")
            else:
                update_data[field] = value
    
    # Update the flag
    success = feature_flags.update_flag(flag_name, **update_data)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update feature flag")
    
    logger.info(f"Feature flag '{flag_name}' updated by user {current_user.id}")
    
    # Return updated flag
    updated_flag = feature_flags.get_flag(flag_name)
    return FeatureFlagResponse.from_feature_flag(updated_flag)


@router.delete("/{flag_name}")
async def delete_feature_flag(
    flag_name: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    """Delete a feature flag"""
    
    # Only admin users can delete feature flags
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if flag exists
    if not feature_flags.get_flag(flag_name):
        raise HTTPException(status_code=404, detail=f"Feature flag '{flag_name}' not found")
    
    # Delete the flag
    success = feature_flags.delete_flag(flag_name)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete feature flag")
    
    logger.info(f"Feature flag '{flag_name}' deleted by user {current_user.id}")
    
    return {"message": f"Feature flag '{flag_name}' deleted successfully"}


@router.post("/{flag_name}/enable")
async def enable_feature_flag(
    flag_name: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    """Enable a feature flag"""
    
    # Only admin users can enable/disable feature flags
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if flag exists
    if not feature_flags.get_flag(flag_name):
        raise HTTPException(status_code=404, detail=f"Feature flag '{flag_name}' not found")
    
    success = feature_flags.enable_flag(flag_name)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to enable feature flag")
    
    logger.info(f"Feature flag '{flag_name}' enabled by user {current_user.id}")
    
    return {"message": f"Feature flag '{flag_name}' enabled successfully"}


@router.post("/{flag_name}/disable")
async def disable_feature_flag(
    flag_name: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    """Disable a feature flag"""
    
    # Only admin users can enable/disable feature flags
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if flag exists
    if not feature_flags.get_flag(flag_name):
        raise HTTPException(status_code=404, detail=f"Feature flag '{flag_name}' not found")
    
    success = feature_flags.disable_flag(flag_name)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to disable feature flag")
    
    logger.info(f"Feature flag '{flag_name}' disabled by user {current_user.id}")
    
    return {"message": f"Feature flag '{flag_name}' disabled successfully"}


@router.post("/{flag_name}/rollout")
async def set_rollout_percentage(
    flag_name: str,
    percentage: float = Query(..., ge=0, le=100, description="Rollout percentage (0-100)"),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Set rollout percentage for a feature flag"""
    
    # Only admin users can modify rollout settings
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if flag exists
    if not feature_flags.get_flag(flag_name):
        raise HTTPException(status_code=404, detail=f"Feature flag '{flag_name}' not found")
    
    success = feature_flags.set_rollout_percentage(flag_name, percentage)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to set rollout percentage")
    
    logger.info(f"Feature flag '{flag_name}' rollout percentage set to {percentage}% by user {current_user.id}")
    
    return {
        "message": f"Rollout percentage for '{flag_name}' set to {percentage}%",
        "flag_name": flag_name,
        "rollout_percentage": percentage
    }


@router.post("/{flag_name}/whitelist/users/{user_id}")
async def add_user_to_whitelist(
    flag_name: str,
    user_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    """Add user to feature flag whitelist"""
    
    # Only admin users can modify whitelists
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if flag exists
    if not feature_flags.get_flag(flag_name):
        raise HTTPException(status_code=404, detail=f"Feature flag '{flag_name}' not found")
    
    success = feature_flags.add_user_to_whitelist(flag_name, user_id)
    if not success:
        raise HTTPException(status_code=400, detail="User already in whitelist or flag not found")
    
    logger.info(f"User {user_id} added to whitelist for flag '{flag_name}' by user {current_user.id}")
    
    return {"message": f"User {user_id} added to whitelist for '{flag_name}'"}


@router.delete("/{flag_name}/whitelist/users/{user_id}")
async def remove_user_from_whitelist(
    flag_name: str,
    user_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    """Remove user from feature flag whitelist"""
    
    # Only admin users can modify whitelists
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if flag exists
    if not feature_flags.get_flag(flag_name):
        raise HTTPException(status_code=404, detail=f"Feature flag '{flag_name}' not found")
    
    success = feature_flags.remove_user_from_whitelist(flag_name, user_id)
    if not success:
        raise HTTPException(status_code=400, detail="User not in whitelist or flag not found")
    
    logger.info(f"User {user_id} removed from whitelist for flag '{flag_name}' by user {current_user.id}")
    
    return {"message": f"User {user_id} removed from whitelist for '{flag_name}'"}


# Feature flag evaluation endpoints
@router.get("/{flag_name}/check")
async def check_feature_flag(
    flag_name: str,
    user_id: Optional[str] = Query(None, description="User ID to check flag for"),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Check if a feature flag is enabled for a specific user"""
    
    # Use provided user_id or current user's ID
    check_user_id = user_id or str(current_user.id)
    check_user_role = current_user.role
    
    # If checking for another user, require admin access
    if user_id and user_id != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required to check flags for other users")
    
    enabled = is_feature_enabled(flag_name, check_user_id, check_user_role)
    
    return {
        "flag_name": flag_name,
        "user_id": check_user_id,
        "user_role": check_user_role,
        "enabled": enabled
    }


@router.get("/user/flags", response_model=UserFlagsResponse)
async def get_user_feature_flags(
    user_id: Optional[str] = Query(None, description="User ID to get flags for"),
    current_user: User = Depends(get_current_user)
) -> UserFlagsResponse:
    """Get all enabled feature flags for a user"""
    
    # Use provided user_id or current user's ID
    check_user_id = user_id or str(current_user.id)
    check_user_role = current_user.role
    
    # If checking for another user, require admin access
    if user_id and user_id != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required to check flags for other users")
    
    enabled_flags = get_user_flags(check_user_id, check_user_role)
    enabled_count = sum(1 for enabled in enabled_flags.values() if enabled)
    
    return UserFlagsResponse(
        user_id=check_user_id,
        user_role=check_user_role,
        enabled_flags=enabled_flags,
        total_flags=len(enabled_flags),
        enabled_count=enabled_count
    )


@router.get("/stats", response_model=FeatureFlagStatsResponse)
async def get_feature_flag_stats(
    current_user: User = Depends(get_current_user)
) -> FeatureFlagStatsResponse:
    """Get feature flag statistics"""
    
    # Only admin users can view statistics
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    stats = feature_flags.get_flag_stats()
    
    return FeatureFlagStatsResponse(**stats)


# Feature flag types and strategies endpoints
@router.get("/meta/types")
async def get_feature_flag_types(
    current_user: User = Depends(get_current_user)
) -> Dict[str, List[str]]:
    """Get available feature flag types and rollout strategies"""
    
    return {
        "flag_types": [flag_type.value for flag_type in FeatureFlagType],
        "rollout_strategies": [strategy.value for strategy in RolloutStrategy]
    }


@router.get("/meta/system-flags")
async def get_system_feature_flags(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get system-defined feature flags for stability improvements"""
    
    system_flags = {}
    all_flags = feature_flags.get_all_flags()
    
    for name, flag in all_flags.items():
        if flag.metadata.get("component") in ["security", "monitoring", "data_sync", "error_handling"]:
            system_flags[name] = {
                "name": name,
                "description": flag.description,
                "component": flag.metadata.get("component"),
                "priority": flag.metadata.get("priority"),
                "enabled": flag.enabled,
                "user_enabled": is_feature_enabled(name, str(current_user.id), current_user.role)
            }
    
    return {
        "system_flags": system_flags,
        "total_system_flags": len(system_flags)
    }