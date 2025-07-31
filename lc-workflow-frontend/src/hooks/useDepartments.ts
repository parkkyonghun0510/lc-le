import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Department, PaginatedResponse } from '@/types/models';
import toast from 'react-hot-toast';

// Department query keys
export const departmentKeys = {
  all: ['departments'] as const,
  lists: () => [...departmentKeys.all, 'list'] as const,
  list: (filters: any) => [...departmentKeys.lists(), filters] as const,
  details: () => [...departmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...departmentKeys.details(), id] as const,
};

// Department hooks
export const useDepartments = (filters: {
  page?: number;
  size?: number;
  search?: string;
  is_active?: boolean;
} = {}) => {
  return useQuery({
    queryKey: departmentKeys.list(filters),
    queryFn: () => apiClient.get<PaginatedResponse<Department>>('/departments', {
      params: filters,
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useActiveDepartments = () => {
  return useQuery({
    queryKey: departmentKeys.list({ is_active: true }),
    queryFn: () => apiClient.get<Department[]>('/departments/active'),
    staleTime: 5 * 60 * 1000,
  });
};

export const useDepartment = (id: string) => {
  return useQuery({
    queryKey: departmentKeys.detail(id),
    queryFn: () => apiClient.get<Department>(`/departments/${id}`),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
};

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; code: string; description?: string; manager_id?: string }) =>
      apiClient.post<Department>('/departments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.lists() });
      toast.success('Department created successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create department';
      toast.error(message);
    },
  });
};

export const useUpdateDepartment = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name?: string; code?: string; description?: string; manager_id?: string; is_active?: boolean }) =>
      apiClient.patch<Department>(`/departments/${id}`, data),
    onSuccess: (updatedDepartment) => {
      queryClient.setQueryData(departmentKeys.detail(id), updatedDepartment);
      queryClient.invalidateQueries({ queryKey: departmentKeys.lists() });
      toast.success('Department updated successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update department';
      toast.error(message);
    },
  });
};

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/departments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.lists() });
      toast.success('Department deleted successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete department';
      toast.error(message);
    },
  });
};