import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Department, DepartmentWithRelations, PaginatedResponse } from '@/types/models';
import toast from 'react-hot-toast';
import { isValidUUID, validateUUID } from '@/lib/utils';

// Department query keys
export const departmentKeys = {
  all: ['departments'] as const,
  lists: () => [...departmentKeys.all, 'list'] as const,
  list: (filters: any) => [...departmentKeys.lists(), filters] as const,
  details: () => [...departmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...departmentKeys.details(), id] as const,
  withRelations: (id: string) => [...departmentKeys.detail(id), 'relations'] as const,
  stats: () => [...departmentKeys.all, 'stats'] as const,
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
    queryFn: () => apiClient.get<PaginatedResponse<Department>>('/departments/', {
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
    enabled: !!id && isValidUUID(id),
  });
};

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; code: string; description?: string; manager_id?: string }) =>
      apiClient.post<Department>('/departments/', data),
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
    mutationFn: (data: { name?: string; code?: string; description?: string; manager_id?: string; is_active?: boolean }) => {
      validateUUID(id, 'Department');
      return apiClient.patch<Department>(`/departments/${id}`, data);
    },
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
    mutationFn: (id: string) => {
      validateUUID(id, 'Department');
      return apiClient.delete(`/departments/${id}`);
    },
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

// Enhanced hooks with relationship queries

/**
 * Hook to fetch departments with counts optimized for list views
 * Uses the enhanced backend API with include_counts parameter
 */
export const useDepartmentsWithCounts = (filters: {
  page?: number;
  size?: number;
  search?: string;
  is_active?: boolean;
} = {}) => {
  return useQuery({
    queryKey: departmentKeys.list({ ...filters, include_counts: true }),
    queryFn: () => apiClient.get<PaginatedResponse<Department>>('/departments/', {
      params: { ...filters, include_counts: true },
    }),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to fetch a single department with all its relationships
 * Includes manager, users, branches with full details
 */
export const useDepartmentWithRelations = (id: string) => {
  return useQuery({
    queryKey: departmentKeys.withRelations(id),
    queryFn: async () => {
      try {
        // First try the enhanced endpoint with relations if it exists
        // Note: apiClient.get already extracts response.data, so departmentData is the actual data
        const departmentData = await apiClient.get<DepartmentWithRelations>(`/departments/${id}/with-relations`);
        
        return {
          ...departmentData,
          users: departmentData.users || [],
          branches: departmentData.branches || [],
          user_count: departmentData.user_count || 0,
          branch_count: departmentData.branch_count || 0,
          active_user_count: departmentData.active_user_count || 0,
        };
      } catch (error: any) {
        console.error('API Error:', error);
        // Fallback to multiple API calls if the enhanced endpoint doesn't exist
        if (error.response?.status === 404) {
          // Fetch department basic info
          const departmentResponse = await apiClient.get<Department>(`/departments/${id}`);
          
          // Fetch department statistics (includes user count)
          const statsResponse = await apiClient.get(`/departments/${id}/stats`);
          
          // Fetch users of department
          const usersResponse = await apiClient.get(`/departments/${id}/users`);

          // Create extended department object
          const departmentWithRelations: DepartmentWithRelations = {
            ...departmentResponse,
            users: (usersResponse as any) || [],
            branches: [], // We'll implement branches later if needed
            user_count: (statsResponse as any)?.user_count || 0,
            branch_count: (statsResponse as any)?.branch_count || 0,
            active_user_count: (usersResponse as any)?.filter((user: any) => user.status === 'active')?.length || 0,
          };

          return departmentWithRelations;
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!id && isValidUUID(id),
  });
};

/**
 * Hook to fetch department statistics
 * Useful for dashboard views
 */
export const useDepartmentStats = () => {
  return useQuery({
    queryKey: departmentKeys.stats(),
    queryFn: () => apiClient.get('/departments/stats'),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to fetch department summary with key metrics
 * Optimized for dashboard cards and overview displays
 */
export const useDepartmentSummary = (id: string) => {
  return useQuery({
    queryKey: [...departmentKeys.detail(id), 'summary'],
    queryFn: () => apiClient.get(`/departments/${id}/summary`),
    staleTime: 5 * 60 * 1000,
    enabled: !!id && isValidUUID(id),
  });
};

// Mutation hook with relationship invalidation
export const useUpdateDepartmentWithRelations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ departmentId, departmentData }: {
      departmentId: string;
      departmentData: { name?: string; code?: string; description?: string; manager_id?: string; is_active?: boolean };
    }) => {
      validateUUID(departmentId, 'Department');
      return apiClient.patch<Department>(`/departments/${departmentId}`, departmentData);
    },
    onSuccess: (updatedDepartment, variables) => {
      const { departmentId } = variables;
      
      // Update all related queries
      queryClient.setQueryData(departmentKeys.detail(departmentId), updatedDepartment);
      queryClient.invalidateQueries({ queryKey: departmentKeys.withRelations(departmentId) });
      queryClient.invalidateQueries({ queryKey: departmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: departmentKeys.stats() });
      
      toast.success('Department updated successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update department';
      toast.error(message);
    },
  });
};
