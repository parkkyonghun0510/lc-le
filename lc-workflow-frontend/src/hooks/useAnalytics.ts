import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { 
  ActivityMetrics, 
  OrganizationalMetrics, 
  UserPerformanceDashboard, 
  ActivityTrends, 
  AnalyticsSummary 
} from '@/types/analytics';

// Analytics query keys
export const analyticsKeys = {
  all: ['analytics'] as const,
  activityMetrics: (days: number, departmentId?: string, branchId?: string) => 
    [...analyticsKeys.all, 'activity-metrics', { days, departmentId, branchId }] as const,
  organizationalMetrics: () => [...analyticsKeys.all, 'organizational-metrics'] as const,
  userPerformance: (userId: string, days: number) => 
    [...analyticsKeys.all, 'user-performance', userId, days] as const,
  activityTrends: (days: number, metricType: string, departmentId?: string, branchId?: string) => 
    [...analyticsKeys.all, 'activity-trends', { days, metricType, departmentId, branchId }] as const,
  summary: () => [...analyticsKeys.all, 'summary'] as const,
};

// Get user activity metrics
export const useActivityMetrics = (
  days: number = 30,
  departmentId?: string,
  branchId?: string
) => {
  return useQuery({
    queryKey: analyticsKeys.activityMetrics(days, departmentId, branchId),
    queryFn: () => {
      const params = new URLSearchParams({ days: days.toString() });
      if (departmentId) params.append('department_id', departmentId);
      if (branchId) params.append('branch_id', branchId);
      
      return apiClient.get<ActivityMetrics>(`/users/analytics/activity-metrics?${params}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get organizational metrics
export const useOrganizationalMetrics = () => {
  return useQuery({
    queryKey: analyticsKeys.organizationalMetrics(),
    queryFn: () => apiClient.get<OrganizationalMetrics>('/users/analytics/organizational-metrics'),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Get user performance dashboard
export const useUserPerformanceDashboard = (userId: string, days: number = 90) => {
  return useQuery({
    queryKey: analyticsKeys.userPerformance(userId, days),
    queryFn: () => apiClient.get<UserPerformanceDashboard>(`/users/${userId}/analytics/performance-dashboard?days=${days}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId,
  });
};

// Get activity trends
export const useActivityTrends = (
  days: number = 30,
  metricType: string = 'user_creation',
  departmentId?: string,
  branchId?: string
) => {
  return useQuery({
    queryKey: analyticsKeys.activityTrends(days, metricType, departmentId, branchId),
    queryFn: () => {
      const params = new URLSearchParams({ 
        days: days.toString(),
        metric_type: metricType
      });
      if (departmentId) params.append('department_id', departmentId);
      if (branchId) params.append('branch_id', branchId);
      
      return apiClient.get<ActivityTrends>(`/users/analytics/activity-trends?${params}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get analytics summary
export const useAnalyticsSummary = () => {
  return useQuery({
    queryKey: analyticsKeys.summary(),
    queryFn: () => apiClient.get<AnalyticsSummary>('/users/analytics/summary'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};