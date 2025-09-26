"""User status enums and constants"""
from enum import Enum

class UserStatus(str, Enum):
    """Enhanced user status options"""
    PENDING = "pending"       # User account created but not yet activated
    ACTIVE = "active"         # User is active and can use the system
    INACTIVE = "inactive"     # User is temporarily inactive
    SUSPENDED = "suspended"   # User is suspended (disciplinary action)
    ARCHIVED = "archived"     # User account is archived (former employee)

# Status transition rules
STATUS_TRANSITION_RULES = {
    UserStatus.PENDING: [UserStatus.ACTIVE, UserStatus.ARCHIVED],
    UserStatus.ACTIVE: [UserStatus.INACTIVE, UserStatus.SUSPENDED, UserStatus.ARCHIVED],
    UserStatus.INACTIVE: [UserStatus.ACTIVE, UserStatus.SUSPENDED, UserStatus.ARCHIVED],
    UserStatus.SUSPENDED: [UserStatus.ACTIVE, UserStatus.ARCHIVED],
    UserStatus.ARCHIVED: []  # Archived users cannot change status
}

# Status descriptions for UI
STATUS_DESCRIPTIONS = {
    UserStatus.PENDING: "Account created, awaiting activation",
    UserStatus.ACTIVE: "User is active and can access the system",
    UserStatus.INACTIVE: "User is temporarily inactive",
    UserStatus.SUSPENDED: "User account is suspended",
    UserStatus.ARCHIVED: "User account is archived"
}

# Status colors for UI
STATUS_COLORS = {
    UserStatus.PENDING: "orange",
    UserStatus.ACTIVE: "green", 
    UserStatus.INACTIVE: "gray",
    UserStatus.SUSPENDED: "red",
    UserStatus.ARCHIVED: "purple"
}

def can_transition_status(from_status: str, to_status: str) -> bool:
    """Check if status transition is allowed"""
    from_enum = UserStatus(from_status)
    to_enum = UserStatus(to_status)
    return to_enum in STATUS_TRANSITION_RULES.get(from_enum, [])

def get_allowed_transitions(current_status: str) -> list[str]:
    """Get list of allowed status transitions from current status"""
    try:
        status_enum = UserStatus(current_status)
        return [status.value for status in STATUS_TRANSITION_RULES.get(status_enum, [])]
    except ValueError:
        return []