import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { 
  Notification, 
  NotificationPreferences, 
  NotificationSummary, 
  NotificationTestResult, 
  NotificationType,
  NotificationListResponse
} from '@/types/notifications';
import { useWebSocketNotifications } from './useWebSocketNotifications';
import toast from 'react-hot-toast';

// Notification query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
  summary: () => [...notificationKeys.all, 'summary'] as const,
  list: (filters: any) => [...notificationKeys.all, 'list', filters] as const,
};

// Get notification preferences
export const useNotificationPreferences = () => {
  const normalize = (p: any): NotificationPreferences => {
    const allTypes = Object.values(NotificationType) as NotificationType[];
    const defaultEmail = allTypes.reduce<Record<NotificationType, boolean>>((acc, t) => {
      acc[t] = t === NotificationType.BULK_OPERATION_COMPLETE ? false : true;
      return acc;
    }, {} as Record<NotificationType, boolean>);
    const defaultInApp = allTypes.reduce<Record<NotificationType, boolean>>((acc, t) => {
      acc[t] = true;
      return acc;
    }, {} as Record<NotificationType, boolean>);
    return {
      email_notifications: { ...defaultEmail, ...(p?.email_notifications || {}) },
      in_app_notifications: { ...defaultInApp, ...(p?.in_app_notifications || {}) },
      notification_frequency: p?.notification_frequency ?? 'immediate',
      quiet_hours: {
        enabled: p?.quiet_hours?.enabled ?? false,
        start_time: p?.quiet_hours?.start_time ?? '22:00',
        end_time: p?.quiet_hours?.end_time ?? '08:00',
      },
    };
  };

  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: async () => {
      const res = await apiClient.get<any>('/users/notifications/preferences');
      const raw = res?.preferences ?? res;
      return normalize(raw);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Update notification preferences
export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Partial<NotificationPreferences>) => {
      const res = await apiClient.put<any>('/users/notifications/preferences', preferences);
      const raw = res?.preferences ?? res;
      // Reuse same normalization as above
      const allTypes = Object.values(NotificationType) as NotificationType[];
      const defaultEmail = allTypes.reduce<Record<NotificationType, boolean>>((acc, t) => {
        acc[t] = t === NotificationType.BULK_OPERATION_COMPLETE ? false : true;
        return acc;
      }, {} as Record<NotificationType, boolean>);
      const defaultInApp = allTypes.reduce<Record<NotificationType, boolean>>((acc, t) => {
        acc[t] = true;
        return acc;
      }, {} as Record<NotificationType, boolean>);
      return {
        email_notifications: { ...defaultEmail, ...(raw?.email_notifications || {}) },
        in_app_notifications: { ...defaultInApp, ...(raw?.in_app_notifications || {}) },
        notification_frequency: raw?.notification_frequency ?? 'immediate',
        quiet_hours: {
          enabled: raw?.quiet_hours?.enabled ?? false,
          start_time: raw?.quiet_hours?.start_time ?? '22:00',
          end_time: raw?.quiet_hours?.end_time ?? '08:00',
        },
      } as NotificationPreferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() });
      toast.success('Notification preferences updated successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update notification preferences';
      toast.error(message);
    },
  });
};

// Get notification summary
export const useNotificationSummary = (days: number = 30) => {
  const emptySummary = (): NotificationSummary => ({
    total_notifications: 0,
    unread_count: 0,
    by_type: {} as Record<NotificationType, number>,
    by_priority: {} as Record<any, number>,
    recent_notifications: [],
  });

  return useQuery({
    queryKey: notificationKeys.summary(),
    queryFn: async () => {
      try {
        return await apiClient.get<NotificationSummary>(`/users/notifications/summary?days=${days}`);
      } catch (err: any) {
        if (err?.response?.status === 403) {
          // Not authorized to view summary; return empty summary to avoid UI errors
          return emptySummary();
        }
        throw err;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Test notification system (admin only)
export const useTestNotificationSystem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post<NotificationTestResult>('/users/notifications/test'),
    onSuccess: (data: any) => {
      if (data.success) {
        toast.success('Notification test sent successfully!');
      } else {
        toast.error(data.message || 'Notification test failed');
      }
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to test notification system';
      toast.error(message);
    },
  });
};

// Send onboarding reminders (admin/manager only)
export const useSendOnboardingReminders = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (daysThreshold: number = 7) =>
      apiClient.post(`/users/notifications/onboarding-reminders?days_threshold=${daysThreshold}`),
    onSuccess: () => {
      toast.success('Onboarding reminders sent successfully!');
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to send onboarding reminders';
      toast.error(message);
    },
  });
};

// Send welcome notification to specific user
export const useSendWelcomeNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.post(`/users/${userId}/notifications/welcome`),
    onSuccess: () => {
      toast.success('Welcome notification sent successfully!');
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to send welcome notification';
      toast.error(message);
    },
  });
};

// Get user notifications
export const useUserNotifications = (limit: number = 50, offset: number = 0, unreadOnly: boolean = false) => {
  return useQuery({
    queryKey: [...notificationKeys.list({ limit, offset, unreadOnly })],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        unread_only: unreadOnly.toString(),
      });
      return await apiClient.get<NotificationListResponse>(`/users/notifications?${params}`);
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};

// Mark notification as read
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      apiClient.put(`/users/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to mark notification as read';
      toast.error(message);
    },
  });
};

// Dismiss notification
export const useDismissNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      apiClient.put(`/users/notifications/${notificationId}/dismiss`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to dismiss notification';
      toast.error(message);
    },
  });
};

// Mark all notifications as read
export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.put('/users/notifications/mark-all-read'),
    onSuccess: (data: any) => {
      toast.success(`Marked ${data.count} notifications as read`);
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to mark all notifications as read';
      toast.error(message);
    },
  });
};

// Send notification to multiple users
export const useSendNotificationToUsers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      user_ids: string[];
      notification_type: string;
      title: string;
      message: string;
      priority?: string;
      send_email?: boolean;
      send_in_app?: boolean;
      data?: Record<string, any>;
    }) => apiClient.post('/users/notifications/send', data),
    onSuccess: (data: any) => {
      toast.success(`Notification sent to ${data.total_users} users`);
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to send notification';
      toast.error(message);
    },
  });
};

// Send notification to department
export const useSendNotificationToDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      department_id: string;
      notification_type: string;
      title: string;
      message: string;
      priority?: string;
      send_email?: boolean;
      send_in_app?: boolean;
      data?: Record<string, any>;
    }) => apiClient.post('/users/notifications/send-to-department', data),
    onSuccess: (data: any) => {
      toast.success(`Notification sent to ${data.total_users} users in department`);
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to send notification to department';
      toast.error(message);
    },
  });
};

// Send notification to branch
export const useSendNotificationToBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      branch_id: string;
      notification_type: string;
      title: string;
      message: string;
      priority?: string;
      send_email?: boolean;
      send_in_app?: boolean;
      data?: Record<string, any>;
    }) => apiClient.post('/users/notifications/send-to-branch', data),
    onSuccess: (data: any) => {
      toast.success(`Notification sent to ${data.total_users} users in branch`);
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to send notification to branch';
      toast.error(message);
    },
  });
};

// Send notification to all users
export const useSendNotificationToAll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      notification_type: string;
      title: string;
      message: string;
      priority?: string;
      send_email?: boolean;
      send_in_app?: boolean;
      data?: Record<string, any>;
    }) => apiClient.post('/users/notifications/send-to-all', data),
    onSuccess: (data: any) => {
      toast.success(`Notification sent to ${data.total_users} users`);
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to send notification to all users';
      toast.error(message);
    },
  });
};

// Real-time notification hooks
export const useRealTimeNotifications = () => {
  return useWebSocketNotifications();
};

// Send real-time notification to specific user
export const useSendRealTimeNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      user_id: string;
      notification_type: string;
      title: string;
      message: string;
      priority?: string;
      data?: Record<string, any>;
    }) => apiClient.post('/notifications/send-realtime', data),
    onSuccess: (data: any) => {
      toast.success('Real-time notification sent');
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to send real-time notification';
      toast.error(message);
    },
  });
};

// Broadcast notification to pattern
export const useBroadcastNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      pattern: string;
      notification_type: string;
      title: string;
      message: string;
      priority?: string;
      data?: Record<string, any>;
    }) => apiClient.post('/notifications/broadcast', data),
    onSuccess: (data: any) => {
      toast.success(`Notification broadcasted to pattern ${data.pattern}`);
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to broadcast notification';
      toast.error(message);
    },
  });
};
