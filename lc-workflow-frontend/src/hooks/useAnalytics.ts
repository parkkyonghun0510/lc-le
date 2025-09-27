import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// Analytics query keys
export const analyticsKeys = {
  all: ['analytics'] as const,
  activityMetrics: (days?: number, departmentId?: string, branchId?: string) => 
    [...analyticsKeys.all, 'activity-metrics', days, departmentId, branchId] as const,
  organizationalMetrics: () => [...analyticsKeys.all, 'organizational-metrics'] as const,
  performanceDashboard: (userId: string, days?: number) => 
    [...analyticsKeys.all, 'performance-dashboard', userId, days] as const,
  activityTrends: (days?: number, metricType?: string, departmentId?: string, branchId?: string) => 
    [...analyticsKeys.all, 'activity-trends', days, metricType, departmentId, branchId] as const,
  summary: () => [...analyticsKeys.all, 'summary'] as const,
};

// Analytics interfaces
export interface ActivityMetrics {
  overview: {
    total_users: number;
    active_last_7_days: number;
    active_last_30_days: number;
    dormant_users: number;
    never_logged_in: number;
    activity_rates: {
      active_7_day_rate: number;
      active_30_day_rate: number;
      dormancy_rate: number;
      never_logged_rate: number;
    };
  };
  login_patterns: {
    login_frequency_distribution: {
      daily_active: number;
      weekly_active: number;
      monthly_active: number;
      infrequent: number;
    };
    total_logins: number;
    users_with_logins: number;
    average_logins_per_user: number;
    login_engagement_rate: number;
  };
  role_distribution: {
    role_counts: { [key: string]: number };
    role_activity_metrics: { 
      [key: string]: {
        total: number;
        active: number;
        login_count: number;
        activity_rate: number;
        avg_logins: number;
      };
    };
  };
  status_distribution: {
    status_counts: { [key: string]: number };
    status_trends: { [key: string]: any };
  };
  activity_levels: {
    categories: {
      highly_active: any[];
      moderately_active: any[];
      low_activity: any[];
      dormant: any[];
      never_logged_in: any[];
    };
    category_counts: { [key: string]: number };
  };
  onboarding_metrics: {
    total_users: number;
    completed_onboarding: number;
    pending_onboarding: number;
    completion_rate: number;
    average_onboarding_days: number;
  };
  geographic_distribution: {
    department_distribution: { [key: string]: any };
    branch_distribution: { [key: string]: any };
    total_departments: number;
    total_branches: number;
  };
  productivity_metrics: {
    total_applications: number;
    active_users: number;
    average_applications_per_active_user: number;
    user_productivity: { [key: string]: any };
  };
  trends: {
    daily_trends: Array<{
      date: string;
      users_created: number;
    }>;
    period_days: number;
  };
  generated_at: string;
  period_days: number;
  filters: {
    department_id: string | null;
    branch_id: string | null;
  };
}

export interface OrganizationalMetrics {
  departments: Array<{
    id: string;
    name: string;
    code: string;
    total_users: number;
    active_users: number;
    activity_rate: number;
    is_active: boolean;
    manager_id: string | null;
  }>;
  branches: Array<{
    id: string;
    name: string;
    code: string;
    total_users: number;
    active_users: number;
    activity_rate: number;
    is_active: boolean;
    manager_id: string | null;
  }>;
  positions: Array<{
    id: string;
    name: string;
    total_users: number;
    active_users: number;
    activity_rate: number;
    is_active: boolean;
  }>;
  summary: {
    total_departments: number;
    active_departments: number;
    total_branches: number;
    active_branches: number;
    total_positions: number;
    active_positions: number;
  };
  generated_at: string;
}

export interface UserPerformanceDashboard {
  user_info: {
    id: string;
    username: string;
    email: string;
    name: string;
    role: string;
    status: string;
    department: string | null;
    branch: string | null;
    position: string | null;
    login_count: number;
    last_login_at: string | null;
    onboarding_completed: boolean;
  };
  performance_metrics: {
    total_applications: number;
    approved_applications: number;
    rejected_applications: number;
    pending_applications: number;
    approval_rate: number;
    total_requested_amount: number;
    average_application_amount: number;
  };
  period_info: {
    days: number;
    start_date: string;
    end_date: string;
  };
  generated_at: string;
}

export interface ActivityTrends {
  trends: {
    daily_trends: Array<{
      date: string;
      users_created: number;
    }>;
    period_days: number;
  };
  period_days: number;
  metric_type: string;
  filters: {
    department_id: string | null;
    branch_id: string | null;
  };
  generated_at: string;
}

export interface AnalyticsSummary {
  activity_overview: ActivityMetrics['overview'];
  role_distribution: ActivityMetrics['role_distribution'];
  activity_levels: { [key: string]: number };
  onboarding_metrics: ActivityMetrics['onboarding_metrics'];
  organizational_summary: OrganizationalMetrics['summary'];
  geographic_distribution: ActivityMetrics['geographic_distribution'];
  generated_at: string;
}

// Analytics hooks
export const useActivityMetrics = (
  days: number = 30, 
  departmentId?: string, 
  branchId?: string
) => {
  return useQuery({
    queryKey: analyticsKeys.activityMetrics(days, departmentId, branchId),
    queryFn: (): Promise<ActivityMetrics> => {
      const params = new URLSearchParams({
        days: days.toString(),
      });
      
      if (departmentId) params.append('department_id', departmentId);
      if (branchId) params.append('branch_id', branchId);
      
      return apiClient.get(`/users/analytics/activity-metrics?${params}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    enabled: true,
  });
};

export const useOrganizationalMetrics = () => {
  return useQuery({
    queryKey: analyticsKeys.organizationalMetrics(),
    queryFn: (): Promise<OrganizationalMetrics> => 
      apiClient.get('/users/analytics/organizational-metrics'),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });
};

export const useUserPerformanceDashboard = (userId: string, days: number = 90) => {
  return useQuery({
    queryKey: analyticsKeys.performanceDashboard(userId, days),
    queryFn: (): Promise<UserPerformanceDashboard> => 
      apiClient.get(`/users/${userId}/analytics/performance-dashboard?days=${days}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    enabled: !!userId,
  });
};

export const useActivityTrends = (
  days: number = 30, 
  metricType: string = 'user_creation',
  departmentId?: string, 
  branchId?: string
) => {
  return useQuery({
    queryKey: analyticsKeys.activityTrends(days, metricType, departmentId, branchId),
    queryFn: (): Promise<ActivityTrends> => {
      const params = new URLSearchParams({
        days: days.toString(),
        metric_type: metricType,
      });
      
      if (departmentId) params.append('department_id', departmentId);
      if (branchId) params.append('branch_id', branchId);
      
      return apiClient.get(`/users/analytics/activity-trends?${params}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

export const useAnalyticsSummary = () => {
  return useQuery({
    queryKey: analyticsKeys.summary(),
    queryFn: (): Promise<AnalyticsSummary> => 
      apiClient.get('/users/analytics/summary'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
  });
};

// Utility hooks for specific metrics
export const useUserActivityOverview = (days: number = 30) => {
  const { data: activityMetrics, ...rest } = useActivityMetrics(days);
  
  return {
    data: activityMetrics?.overview,
    ...rest,
  };
};

export const useRoleDistribution = (days: number = 30) => {
  const { data: activityMetrics, ...rest } = useActivityMetrics(days);
  
  return {
    data: activityMetrics?.role_distribution,
    ...rest,
  };
};

export const useActivityLevels = (days: number = 30) => {
  const { data: activityMetrics, ...rest } = useActivityMetrics(days);
  
  return {
    data: activityMetrics?.activity_levels,
    ...rest,
  };
};

export const useOnboardingMetrics = (days: number = 30) => {
  const { data: activityMetrics, ...rest } = useActivityMetrics(days);
  
  return {
    data: activityMetrics?.onboarding_metrics,
    ...rest,
  };
};

export const useGeographicDistribution = (days: number = 30) => {
  const { data: activityMetrics, ...rest } = useActivityMetrics(days);
  
  return {
    data: activityMetrics?.geographic_distribution,
    ...rest,
  };
};