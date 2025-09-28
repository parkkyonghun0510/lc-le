import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { 
  Notification, 
  NotificationPreferences, 
  NotificationSummary, 
  NotificationTestResult, 
  NotificationType 
} from '@/types/notifications';
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
    onSuccess: (data) => {
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
