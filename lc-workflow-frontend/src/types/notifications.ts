export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  read_at?: string;
  dismissed_at?: string;
  expires_at?: string;
  data?: Record<string, any>;
}

export enum NotificationType {
  USER_WELCOME = "user_welcome",
  STATUS_CHANGE = "status_change",
  ONBOARDING_REMINDER = "onboarding_reminder",
  ONBOARDING_COMPLETE = "onboarding_complete",
  OFFBOARDING_INITIATED = "offboarding_initiated",
  MANAGER_TEAM_CHANGE = "manager_team_change",
  BULK_OPERATION_COMPLETE = "bulk_operation_complete",
  SYSTEM_MAINTENANCE = "system_maintenance",
  PASSWORD_EXPIRY = "password_expiry",
  ACCOUNT_LOCKED = "account_locked"
}

export enum NotificationPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent"
}

export interface NotificationPreferences {
  email_notifications: Record<NotificationType, boolean>;
  in_app_notifications: Record<NotificationType, boolean>;
  notification_frequency: 'immediate' | 'daily' | 'weekly';
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
  };
}

export interface NotificationSummary {
  period_days?: number;
  total_notifications: number;
  unread_count: number;
  by_type: Record<string, number>; // Changed to string to handle dynamic types
  by_priority: Record<string, number>; // Changed to string to handle dynamic priorities
  recent_notifications: Notification[];
  generated_at?: string;
}

export interface NotificationTestResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total_count: number;
  has_more: boolean;
}
