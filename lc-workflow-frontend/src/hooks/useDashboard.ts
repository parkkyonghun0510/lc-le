import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// Dashboard query keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  recentApplications: (limit?: number) => [...dashboardKeys.all, 'recent-applications', limit] as const,
  activityTimeline: (days?: number) => [...dashboardKeys.all, 'activity-timeline', days] as const,
  performanceMetrics: () => [...dashboardKeys.all, 'performance-metrics'] as const,
};

// Dashboard statistics interface
export interface DashboardStats {
  applications: {
    total: number;
    draft: number;
    submitted: number;
    pending: number;
    under_review: number;
    approved: number;
    rejected: number;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    admins: number;
    managers: number;
    officers: number;
    viewers: number;
  };
  departments: {
    total: number;
    active: number;
  };
  branches: {
    total: number;
    active: number;
  };
  files: {
    total: number;
    total_size: number;
  };
}

// Recent application interface
export interface RecentApplication {
  phone: any;
  portfolio_officer_name: any;
  id: string;
  full_name_latin?: string;
  full_name_khmer?: string;
  requested_amount?: number;
  status: string;
  created_at: string;
  user_id: string;
}

// Activity timeline interface
export interface ActivityItem {
  id: string;
  type: 'application' | 'user';
  action: string;
  title: string;
  description: string;
  status: string;
  timestamp: string;
  user_id: string;
}

// Performance metrics interface
export interface PerformanceMetrics {
  applications_processed_30d: number;
  average_processing_time_days: number;
  approval_rate_percentage: number;
  active_users_today: number;
}

// Dashboard hooks
export const useDashboardStats = () => {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: (): Promise<DashboardStats> => apiClient.get('/dashboard/stats'),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

export const useRecentApplications = (limit: number = 10) => {
  return useQuery({
    queryKey: dashboardKeys.recentApplications(limit),
    queryFn: (): Promise<RecentApplication[]> => 
      apiClient.get(`/dashboard/recent-applications?limit=${limit}`),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: true,
  });
};

export const useActivityTimeline = (days: number = 7) => {
  return useQuery({
    queryKey: dashboardKeys.activityTimeline(days),
    queryFn: (): Promise<ActivityItem[]> => 
      apiClient.get(`/dashboard/activity-timeline?days=${days}`),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
};

export const usePerformanceMetrics = () => {
  return useQuery({
    queryKey: dashboardKeys.performanceMetrics(),
    queryFn: (): Promise<PerformanceMetrics> => apiClient.get('/dashboard/performance-metrics'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus for performance metrics
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
};

// Legacy hooks for backward compatibility
export const useApplicationStats = () => {
  const { data: dashboardStats, ...rest } = useDashboardStats();
  
  return {
    data: dashboardStats?.applications,
    ...rest,
  };
};

export const useUserStats = () => {
  const { data: dashboardStats, ...rest } = useDashboardStats();
  
  return {
    data: {
      total_users: dashboardStats?.users.total,
      total_departments: dashboardStats?.departments.total,
      total_branches: dashboardStats?.branches.total,
      ...dashboardStats?.users,
    },
    ...rest,
  };
};