"""
Feature Flags System

This module provides a comprehensive feature flag system for gradual rollout
of new functionality, A/B testing, and safe deployment practices.
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List, Union
from enum import Enum
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)


class FeatureFlagType(Enum):
    """Types of feature flags"""
    BOOLEAN = "boolean"
    PERCENTAGE = "percentage"
    USER_LIST = "user_list"
    ROLE_BASED = "role_based"
    DATE_RANGE = "date_range"


class RolloutStrategy(Enum):
    """Rollout strategies for feature flags"""
    ALL_USERS = "all_users"
    PERCENTAGE_BASED = "percentage_based"
    USER_WHITELIST = "user_whitelist"
    ROLE_BASED = "role_based"
    GRADUAL_ROLLOUT = "gradual_rollout"


@dataclass
class FeatureFlag:
    """Feature flag configuration"""
    name: str
    description: str
    flag_type: FeatureFlagType
    enabled: bool
    rollout_strategy: RolloutStrategy
    rollout_percentage: float = 0.0
    user_whitelist: List[str] = None
    role_whitelist: List[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    metadata: Dict[str, Any] = None
    created_at: datetime = None
    updated_at: datetime = None

    def __post_init__(self):
        if self.user_whitelist is None:
            self.user_whitelist = []
        if self.role_whitelist is None:
            self.role_whitelist = []
        if self.metadata is None:
            self.metadata = {}
        if self.created_at is None:
            self.created_at = datetime.now(timezone.utc)
        if self.updated_at is None:
            self.updated_at = datetime.now(timezone.utc)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        data = asdict(self)
        # Convert enums to strings
        data['flag_type'] = self.flag_type.value
        data['rollout_strategy'] = self.rollout_strategy.value
        # Convert datetime to ISO string
        if self.start_date:
            data['start_date'] = self.start_date.isoformat()
        if self.end_date:
            data['end_date'] = self.end_date.isoformat()
        data['created_at'] = self.created_at.isoformat()
        data['updated_at'] = self.updated_at.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FeatureFlag':
        """Create from dictionary"""
        # Convert string enums back to enum objects
        data['flag_type'] = FeatureFlagType(data['flag_type'])
        data['rollout_strategy'] = RolloutStrategy(data['rollout_strategy'])
        
        # Convert ISO strings back to datetime
        if data.get('start_date'):
            data['start_date'] = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        if data.get('end_date'):
            data['end_date'] = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
        if data.get('created_at'):
            data['created_at'] = datetime.fromisoformat(data['created_at'].replace('Z', '+00:00'))
        if data.get('updated_at'):
            data['updated_at'] = datetime.fromisoformat(data['updated_at'].replace('Z', '+00:00'))
        
        return cls(**data)


class FeatureFlagManager:
    """Manages feature flags for the application"""
    
    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path or os.getenv('FEATURE_FLAGS_CONFIG', 'feature_flags.json')
        self.flags: Dict[str, FeatureFlag] = {}
        self._load_flags()
        
        # Initialize default flags for system stability improvements
        self._initialize_default_flags()
    
    def _load_flags(self) -> None:
        """Load feature flags from configuration file"""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    data = json.load(f)
                    for flag_name, flag_data in data.items():
                        self.flags[flag_name] = FeatureFlag.from_dict(flag_data)
                logger.info(f"Loaded {len(self.flags)} feature flags from {self.config_path}")
            else:
                logger.info(f"Feature flags config file not found: {self.config_path}")
        except Exception as e:
            logger.error(f"Error loading feature flags: {e}")
    
    def _save_flags(self) -> None:
        """Save feature flags to configuration file"""
        try:
            # Ensure directory exists
            Path(self.config_path).parent.mkdir(parents=True, exist_ok=True)
            
            data = {name: flag.to_dict() for name, flag in self.flags.items()}
            with open(self.config_path, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info(f"Saved {len(self.flags)} feature flags to {self.config_path}")
        except Exception as e:
            logger.error(f"Error saving feature flags: {e}")
    
    def _initialize_default_flags(self) -> None:
        """Initialize default feature flags for system stability improvements"""
        default_flags = [
            # Security enhancements
            FeatureFlag(
                name="enhanced_malware_scanning",
                description="Enhanced malware scanning with multiple engines",
                flag_type=FeatureFlagType.BOOLEAN,
                enabled=True,
                rollout_strategy=RolloutStrategy.ALL_USERS,
                metadata={"component": "security", "priority": "high"}
            ),
            FeatureFlag(
                name="file_encryption",
                description="Automatic encryption of sensitive files",
                flag_type=FeatureFlagType.BOOLEAN,
                enabled=True,
                rollout_strategy=RolloutStrategy.ALL_USERS,
                metadata={"component": "security", "priority": "high"}
            ),
            FeatureFlag(
                name="comprehensive_audit_logging",
                description="Detailed audit logging for all operations",
                flag_type=FeatureFlagType.BOOLEAN,
                enabled=True,
                rollout_strategy=RolloutStrategy.ALL_USERS,
                metadata={"component": "security", "priority": "medium"}
            ),
            
            # Performance and monitoring
            FeatureFlag(
                name="advanced_health_monitoring",
                description="Comprehensive system health monitoring",
                flag_type=FeatureFlagType.BOOLEAN,
                enabled=True,
                rollout_strategy=RolloutStrategy.ALL_USERS,
                metadata={"component": "monitoring", "priority": "high"}
            ),
            FeatureFlag(
                name="real_time_metrics",
                description="Real-time metrics collection and reporting",
                flag_type=FeatureFlagType.BOOLEAN,
                enabled=True,
                rollout_strategy=RolloutStrategy.ALL_USERS,
                metadata={"component": "monitoring", "priority": "medium"}
            ),
            FeatureFlag(
                name="automated_alerting",
                description="Automated alerting for system issues",
                flag_type=FeatureFlagType.BOOLEAN,
                enabled=True,
                rollout_strategy=RolloutStrategy.ALL_USERS,
                metadata={"component": "monitoring", "priority": "high"}
            ),
            
            # Data consistency and synchronization
            FeatureFlag(
                name="real_time_updates",
                description="Real-time data synchronization updates",
                flag_type=FeatureFlagType.PERCENTAGE,
                enabled=True,
                rollout_strategy=RolloutStrategy.PERCENTAGE_BASED,
                rollout_percentage=100.0,
                metadata={"component": "data_sync", "priority": "medium"}
            ),
            FeatureFlag(
                name="automatic_cache_invalidation",
                description="Automatic cache invalidation on data changes",
                flag_type=FeatureFlagType.BOOLEAN,
                enabled=True,
                rollout_strategy=RolloutStrategy.ALL_USERS,
                metadata={"component": "data_sync", "priority": "high"}
            ),
            FeatureFlag(
                name="data_consistency_checks",
                description="Automated data consistency verification",
                flag_type=FeatureFlagType.BOOLEAN,
                enabled=True,
                rollout_strategy=RolloutStrategy.ALL_USERS,
                metadata={"component": "data_sync", "priority": "high"}
            ),
            
            # Enhanced error handling
            FeatureFlag(
                name="enhanced_error_responses",
                description="Detailed error responses with correlation IDs",
                flag_type=FeatureFlagType.BOOLEAN,
                enabled=True,
                rollout_strategy=RolloutStrategy.ALL_USERS,
                metadata={"component": "error_handling", "priority": "high"}
            ),
            FeatureFlag(
                name="automatic_retry_logic",
                description="Automatic retry logic for failed operations",
                flag_type=FeatureFlagType.BOOLEAN,
                enabled=True,
                rollout_strategy=RolloutStrategy.ALL_USERS,
                metadata={"component": "error_handling", "priority": "medium"}
            ),
            
            # Experimental features
            FeatureFlag(
                name="advanced_file_validation",
                description="Advanced file content validation and analysis",
                flag_type=FeatureFlagType.PERCENTAGE,
                enabled=False,
                rollout_strategy=RolloutStrategy.PERCENTAGE_BASED,
                rollout_percentage=10.0,
                metadata={"component": "experimental", "priority": "low"}
            ),
            FeatureFlag(
                name="ml_based_document_classification",
                description="Machine learning based document classification",
                flag_type=FeatureFlagType.USER_LIST,
                enabled=False,
                rollout_strategy=RolloutStrategy.USER_WHITELIST,
                user_whitelist=["admin", "test_user"],
                metadata={"component": "experimental", "priority": "low"}
            ),
            FeatureFlag(
                name="enhanced_folder_organization",
                description="AI-powered folder organization suggestions",
                flag_type=FeatureFlagType.ROLE_BASED,
                enabled=False,
                rollout_strategy=RolloutStrategy.ROLE_BASED,
                role_whitelist=["admin", "manager"],
                metadata={"component": "experimental", "priority": "low"}
            )
        ]
        
        # Add default flags if they don't exist
        for flag in default_flags:
            if flag.name not in self.flags:
                self.flags[flag.name] = flag
        
        # Save the updated flags
        self._save_flags()
    
    def is_enabled(self, flag_name: str, user_id: Optional[str] = None, 
                   user_role: Optional[str] = None, context: Optional[Dict[str, Any]] = None) -> bool:
        """
        Check if a feature flag is enabled for the given context
        
        Args:
            flag_name: Name of the feature flag
            user_id: ID of the current user
            user_role: Role of the current user
            context: Additional context for flag evaluation
            
        Returns:
            True if the feature is enabled, False otherwise
        """
        if flag_name not in self.flags:
            logger.warning(f"Feature flag '{flag_name}' not found, defaulting to False")
            return False
        
        flag = self.flags[flag_name]
        
        # Check if flag is globally disabled
        if not flag.enabled:
            return False
        
        # Check date range if specified
        now = datetime.now(timezone.utc)
        if flag.start_date and now < flag.start_date:
            return False
        if flag.end_date and now > flag.end_date:
            return False
        
        # Evaluate based on rollout strategy
        if flag.rollout_strategy == RolloutStrategy.ALL_USERS:
            return True
        
        elif flag.rollout_strategy == RolloutStrategy.PERCENTAGE_BASED:
            if user_id:
                # Use consistent hash-based percentage calculation
                import hashlib
                hash_value = int(hashlib.md5(f"{flag_name}:{user_id}".encode()).hexdigest()[:8], 16)
                percentage = (hash_value % 100) + 1
                return percentage <= flag.rollout_percentage
            return False
        
        elif flag.rollout_strategy == RolloutStrategy.USER_WHITELIST:
            return user_id in flag.user_whitelist if user_id else False
        
        elif flag.rollout_strategy == RolloutStrategy.ROLE_BASED:
            return user_role in flag.role_whitelist if user_role else False
        
        elif flag.rollout_strategy == RolloutStrategy.GRADUAL_ROLLOUT:
            # Implement gradual rollout logic based on time and percentage
            if user_id:
                import hashlib
                hash_value = int(hashlib.md5(f"{flag_name}:{user_id}".encode()).hexdigest()[:8], 16)
                percentage = (hash_value % 100) + 1
                
                # Gradually increase rollout percentage over time
                if flag.start_date:
                    days_since_start = (now - flag.start_date).days
                    # Increase by 10% every day, up to the target percentage
                    current_percentage = min(flag.rollout_percentage, days_since_start * 10)
                    return percentage <= current_percentage
                else:
                    return percentage <= flag.rollout_percentage
            return False
        
        return False
    
    def get_flag(self, flag_name: str) -> Optional[FeatureFlag]:
        """Get a feature flag by name"""
        return self.flags.get(flag_name)
    
    def get_all_flags(self) -> Dict[str, FeatureFlag]:
        """Get all feature flags"""
        return self.flags.copy()
    
    def get_enabled_flags(self, user_id: Optional[str] = None, 
                         user_role: Optional[str] = None) -> Dict[str, bool]:
        """Get all enabled flags for a user"""
        return {
            name: self.is_enabled(name, user_id, user_role)
            for name in self.flags.keys()
        }
    
    def create_flag(self, flag: FeatureFlag) -> None:
        """Create a new feature flag"""
        flag.created_at = datetime.now(timezone.utc)
        flag.updated_at = datetime.now(timezone.utc)
        self.flags[flag.name] = flag
        self._save_flags()
        logger.info(f"Created feature flag: {flag.name}")
    
    def update_flag(self, flag_name: str, **kwargs) -> bool:
        """Update an existing feature flag"""
        if flag_name not in self.flags:
            return False
        
        flag = self.flags[flag_name]
        
        # Update allowed fields
        updatable_fields = [
            'description', 'enabled', 'rollout_strategy', 'rollout_percentage',
            'user_whitelist', 'role_whitelist', 'start_date', 'end_date', 'metadata'
        ]
        
        for field, value in kwargs.items():
            if field in updatable_fields:
                setattr(flag, field, value)
        
        flag.updated_at = datetime.now(timezone.utc)
        self._save_flags()
        logger.info(f"Updated feature flag: {flag_name}")
        return True
    
    def delete_flag(self, flag_name: str) -> bool:
        """Delete a feature flag"""
        if flag_name in self.flags:
            del self.flags[flag_name]
            self._save_flags()
            logger.info(f"Deleted feature flag: {flag_name}")
            return True
        return False
    
    def enable_flag(self, flag_name: str) -> bool:
        """Enable a feature flag"""
        return self.update_flag(flag_name, enabled=True)
    
    def disable_flag(self, flag_name: str) -> bool:
        """Disable a feature flag"""
        return self.update_flag(flag_name, enabled=False)
    
    def set_rollout_percentage(self, flag_name: str, percentage: float) -> bool:
        """Set rollout percentage for a flag"""
        if 0 <= percentage <= 100:
            return self.update_flag(flag_name, rollout_percentage=percentage)
        return False
    
    def add_user_to_whitelist(self, flag_name: str, user_id: str) -> bool:
        """Add user to flag whitelist"""
        if flag_name in self.flags:
            flag = self.flags[flag_name]
            if user_id not in flag.user_whitelist:
                flag.user_whitelist.append(user_id)
                flag.updated_at = datetime.now(timezone.utc)
                self._save_flags()
                return True
        return False
    
    def remove_user_from_whitelist(self, flag_name: str, user_id: str) -> bool:
        """Remove user from flag whitelist"""
        if flag_name in self.flags:
            flag = self.flags[flag_name]
            if user_id in flag.user_whitelist:
                flag.user_whitelist.remove(user_id)
                flag.updated_at = datetime.now(timezone.utc)
                self._save_flags()
                return True
        return False
    
    def get_flag_stats(self) -> Dict[str, Any]:
        """Get statistics about feature flags"""
        total_flags = len(self.flags)
        enabled_flags = sum(1 for flag in self.flags.values() if flag.enabled)
        
        flags_by_type = {}
        flags_by_strategy = {}
        
        for flag in self.flags.values():
            flag_type = flag.flag_type.value
            strategy = flag.rollout_strategy.value
            
            flags_by_type[flag_type] = flags_by_type.get(flag_type, 0) + 1
            flags_by_strategy[strategy] = flags_by_strategy.get(strategy, 0) + 1
        
        return {
            "total_flags": total_flags,
            "enabled_flags": enabled_flags,
            "disabled_flags": total_flags - enabled_flags,
            "flags_by_type": flags_by_type,
            "flags_by_strategy": flags_by_strategy
        }


# Global feature flag manager instance
feature_flags = FeatureFlagManager()


def is_feature_enabled(flag_name: str, user_id: Optional[str] = None, 
                      user_role: Optional[str] = None, context: Optional[Dict[str, Any]] = None) -> bool:
    """
    Convenience function to check if a feature flag is enabled
    
    Args:
        flag_name: Name of the feature flag
        user_id: ID of the current user
        user_role: Role of the current user
        context: Additional context for flag evaluation
        
    Returns:
        True if the feature is enabled, False otherwise
    """
    return feature_flags.is_enabled(flag_name, user_id, user_role, context)


def get_user_flags(user_id: Optional[str] = None, user_role: Optional[str] = None) -> Dict[str, bool]:
    """
    Get all enabled flags for a user
    
    Args:
        user_id: ID of the current user
        user_role: Role of the current user
        
    Returns:
        Dictionary of flag names and their enabled status
    """
    return feature_flags.get_enabled_flags(user_id, user_role)


# Feature flag decorators for easy use in code
def feature_flag(flag_name: str, default: bool = False):
    """
    Decorator to conditionally execute functions based on feature flags
    
    Args:
        flag_name: Name of the feature flag
        default: Default value if flag is not found
        
    Returns:
        Decorator function
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Try to extract user context from kwargs or function arguments
            user_id = kwargs.get('user_id')
            user_role = kwargs.get('user_role')
            
            # Check if function has a 'current_user' parameter
            if not user_id and 'current_user' in kwargs:
                current_user = kwargs['current_user']
                if hasattr(current_user, 'id'):
                    user_id = str(current_user.id)
                if hasattr(current_user, 'role'):
                    user_role = current_user.role
            
            if is_feature_enabled(flag_name, user_id, user_role):
                return func(*args, **kwargs)
            else:
                # Return default behavior or raise exception
                if default:
                    return func(*args, **kwargs)
                else:
                    from fastapi import HTTPException
                    raise HTTPException(
                        status_code=501,
                        detail=f"Feature '{flag_name}' is not enabled"
                    )
        return wrapper
    return decorator


def conditional_feature(flag_name: str, enabled_func, disabled_func=None):
    """
    Execute different functions based on feature flag status
    
    Args:
        flag_name: Name of the feature flag
        enabled_func: Function to execute when flag is enabled
        disabled_func: Function to execute when flag is disabled
        
    Returns:
        Result of the appropriate function
    """
    def wrapper(user_id: Optional[str] = None, user_role: Optional[str] = None, **kwargs):
        if is_feature_enabled(flag_name, user_id, user_role):
            return enabled_func(**kwargs)
        elif disabled_func:
            return disabled_func(**kwargs)
        else:
            return None
    return wrapper