import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Branch, PaginatedResponse } from '@/types/models';
import toast from 'react-hot-toast';

// Branch query keys
export const branchKeys = {
  all: ['branches'] as const,
  lists: () => [...branchKeys.all, 'list'] as const,
  list: (filters: any) => [...branchKeys.lists(), filters] as const,
  details: () => [...branchKeys.all, 'detail'] as const,
  detail: (id: string) => [...branchKeys.details(), id] as const,
};

// Branch hooks
export const useBranches = (filters: {
  page?: number;
  size?: number;
  search?: string;
  is_active?: boolean;
} = {}) => {
  // Check if user is authenticated before making API calls
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const isAuthenticated = !!token;


  return useQuery({
    queryKey: branchKeys.list(filters),
    queryFn: () => {
      return apiClient.get<PaginatedResponse<Branch>>('/branches/', {
        params: filters,
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
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

export const useActiveBranches = () => {
  return useQuery({
    queryKey: branchKeys.list({ is_active: true }),
    queryFn: () => apiClient.get<Branch[]>('/branches/active'),
    staleTime: 5 * 60 * 1000,
  });
};

export const useBranch = (id: string) => {
  return useQuery({
    queryKey: branchKeys.detail(id),
    queryFn: () => apiClient.get<Branch>(`/branches/${id}`),
    staleTime: 5 * 60 * 1000,
    enabled: !!id && id !== 'undefined' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id),
  });
};

export const useCreateBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      code: string;
      address: string;
      phone_number?: string;
      email?: string;
      manager_id?: string;
      latitude?: number;
      longitude?: number;
    }) => apiClient.post<Branch>('/branches/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchKeys.lists() });
      toast.success('Branch created successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create branch';
      toast.error(message);
    },
  });
};

export const useUpdateBranch = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name?: string;
      code?: string;
      address?: string;
      phone_number?: string;
      email?: string;
      manager_id?: string;
      latitude?: number;
      longitude?: number;
      is_active?: boolean;
    }) => {
      if (!id || id === 'undefined' || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)) {
        throw new Error('Invalid branch ID format');
      }
      return apiClient.patch<Branch>(`/branches/${id}`, data);
    },
    onSuccess: (updatedBranch) => {
      queryClient.setQueryData(branchKeys.detail(id), updatedBranch);
      queryClient.invalidateQueries({ queryKey: branchKeys.lists() });
      toast.success('Branch updated successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update branch';
      toast.error(message);
    },
  });
};

export const useDeleteBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      if (!id || id === 'undefined' || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)) {
        throw new Error('Invalid branch ID format');
      }
      return apiClient.delete(`/branches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchKeys.lists() });
      toast.success('Branch deleted successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete branch';
      toast.error(message);
    },
  });
};