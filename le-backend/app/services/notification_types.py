"""
Notification Types and Enums

Centralized notification types and priority definitions to avoid circular imports.
"""

class NotificationType:
    """Notification types enum"""
    USER_WELCOME = "user_welcome"
    STATUS_CHANGE = "status_change" 
    ONBOARDING_REMINDER = "onboarding_reminder"
    ONBOARDING_COMPLETE = "onboarding_complete"
    OFFBOARDING_INITIATED = "offboarding_initiated"
    MANAGER_TEAM_CHANGE = "manager_team_change"
    BULK_OPERATION_COMPLETE = "bulk_operation_complete"
    SYSTEM_MAINTENANCE = "system_maintenance"
    PASSWORD_EXPIRY = "password_expiry"
    ACCOUNT_LOCKED = "account_locked"

class NotificationPriority:
    """Notification priority levels"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"
