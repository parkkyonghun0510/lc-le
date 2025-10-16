import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { isValidUUID } from '@/lib/utils';

// Workload filters interface
export interface WorkloadFilters {
  status?: string;
  date_from?: string;
  date_to?: string;
  department_id?: string;
  branch_id?: string;
}

// Workload response types
export interface EmployeeWorkload {
  employee_id: string;
  employee_code: string;
  full_name_khmer: string;
  full_name_latin: string;
  total_assignments: number;
  assignments_by_status: {
    [status: string]: number;
  };
  active_assignments: number;
  completed_assignments: number;
}

export interface WorkloadSummary {
  employee_id: string;
  employee_code: string;
  full_name_khmer: string;
  full_name_latin: string;
  department?: string;
  branch?: string;
  total_assignments: number;
  assignments_by_status: {
    [status: string]: number;
  };
}

// Workload query keys
export const workloadKeys = {
  all: ['employee-workload'] as const,
  employeeWorkload: (employeeId: string, filters: WorkloadFilters) => 
    ['employee-workload', employeeId, filters] as const,
  workloadSummary: (filters: WorkloadFilters) => 
    ['workload-summary', filters] as const,
};

// Hook to get workload for a specific employee
export const useEmployeeWorkload = (employeeId: string, filters: WorkloadFilters = {}) => {
  // Check if user is authenticated before making API calls
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const isAuthenticated = !!token;

  return useQuery({
    queryKey: workloadKeys.employeeWorkload(employeeId, filters),
    queryFn: () => {
      return apiClient.get<EmployeeWorkload>(`/employees/${employeeId}/workload`, {
        params: filters,
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isAuthenticated && !!employeeId && isValidUUID(employeeId),
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors - user needs to login
      if (error.response?.status === 401) {
        return false;
      }
      // Retry other errors up to 2 times
      return failureCount < 2;
    },
  });
};

// Hook to get workload summary for all employees
export const useWorkloadSummary = (filters: WorkloadFilters = {}) => {
  // Check if user is authenticated before making API calls
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const isAuthenticated = !!token;

  return useQuery({
    queryKey: workloadKeys.workloadSummary(filters),
    queryFn: () => {
      return apiClient.get<WorkloadSummary[]>('/employees/reports/workload-summary', {
        params: filters,
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isAuthenticated,
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors - user needs to login
      if (error.response?.status === 401) {
        return false;
      }
      // Retry other errors up to 2 times
      return failureCount < 2;
    },
  });
};
