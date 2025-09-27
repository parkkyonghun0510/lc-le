export interface ActivityMetrics {
  overview: {
    total_users: number;
    active_users: number;
    new_users: number;
    dormant_users: number;
    never_logged_in: number;
  };
  role_distribution: Record<string, number>;
  activity_levels: {
    category_counts: Record<string, number>;
    highly_active: number;
    moderately_active: number;
    dormant: number;
    never_logged: number;
  };
  onboarding_metrics: {
    total_onboarding: number;
    completed_onboarding: number;
    pending_onboarding: number;
    completion_rate: number;
  };
  geographic_distribution: Record<string, number>;
  trends: {
    user_creation: Array<{ date: string; count: number }>;
    login_activity: Array<{ date: string; count: number }>;
    status_changes: Array<{ date: string; count: number }>;
  };
}

export interface OrganizationalMetrics {
  summary: {
    total_departments: number;
    total_branches: number;
    total_positions: number;
    average_users_per_department: number;
    average_users_per_branch: number;
  };
  department_breakdown: Array<{
    department_id: string;
    department_name: string;
    user_count: number;
    active_users: number;
    completion_rate: number;
  }>;
  branch_breakdown: Array<{
    branch_id: string;
    branch_name: string;
    user_count: number;
    active_users: number;
    completion_rate: number;
  }>;
  position_breakdown: Array<{
    position_id: string;
    position_name: string;
    user_count: number;
    active_users: number;
    completion_rate: number;
  }>;
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
    user_creation: Array<{ date: string; count: number }>;
    login_activity: Array<{ date: string; count: number }>;
    status_changes: Array<{ date: string; count: number }>;
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
  activity_overview: Record<string, any>;
  role_distribution: Record<string, number>;
  activity_levels: Record<string, number>;
  onboarding_metrics: Record<string, any>;
  organizational_summary: Record<string, any>;
  geographic_distribution: Record<string, number>;
  generated_at: string;
}
