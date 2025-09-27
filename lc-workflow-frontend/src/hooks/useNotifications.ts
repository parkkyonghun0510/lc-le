import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { 
  Notification, 
  NotificationPreferences, 
  NotificationSummary, 
  NotificationTestResult 
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
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => apiClient.get<NotificationPreferences>('/users/notifications/preferences'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Update notification preferences
export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: Partial<NotificationPreferences>) =>
      apiClient.put<NotificationPreferences>('/users/notifications/preferences', preferences),
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
  return useQuery({
    queryKey: notificationKeys.summary(),
    queryFn: () => apiClient.get<NotificationSummary>(`/users/notifications/summary?days=${days}`),
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
