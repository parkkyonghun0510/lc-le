import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Employee, EmployeeCreate, EmployeeUpdate, PaginatedResponse } from '@/types/models';
import toast from 'react-hot-toast';
import { isValidUUID, validateUUID } from '@/lib/utils';

// Employee filters interface
export interface EmployeeFilters {
  page?: number;
  size?: number;
  search?: string;
  department_id?: string;
  branch_id?: string;
  is_active?: boolean;
}

// Employee query keys
export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (filters: EmployeeFilters) => [...employeeKeys.lists(), filters] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
};

// Employee hooks
export const useEmployees = (filters: EmployeeFilters = {}) => {
  // Check if user is authenticated before making API calls
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const isAuthenticated = !!token;

  return useQuery({
    queryKey: employeeKeys.list(filters),
    queryFn: () => {
      return apiClient.get<PaginatedResponse<Employee>>('/employees/', {
        params: filters,
      });
    },
    staleTime: 60 * 1000, // 1 minute
    enabled: isAuthenticated, // Only run query if user is authenticated
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

export const useEmployee = (id: string) => {
  // Check if user is authenticated before making API calls
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const isAuthenticated = !!token;

  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => {
      return apiClient.get<Employee>(`/employees/${id}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isAuthenticated && !!id && isValidUUID(id), // Only run if authenticated and valid ID
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

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EmployeeCreate) => apiClient.post<Employee>('/employees/', data),
    onSuccess: (newEmployee) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      toast.success('Employee created successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create employee';
      toast.error(message);
    },
  });
};

export const useUpdateEmployee = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EmployeeUpdate) => {
      validateUUID(id, 'Employee');
      return apiClient.patch<Employee>(`/employees/${id}`, data);
    },
    onSuccess: (updatedEmployee) => {
      queryClient.setQueryData(employeeKeys.detail(id), updatedEmployee);
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
      toast.success('Employee updated successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update employee';
      toast.error(message);
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      validateUUID(id, 'Employee');
      return apiClient.delete(`/employees/${id}`);
    },
    onSuccess: () => {
      // Invalidate and refetch employees list
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.refetchQueries({ queryKey: employeeKeys.lists() });
      toast.success('Employee deactivated successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to deactivate employee';
      toast.error(message);
    },
  });
};
