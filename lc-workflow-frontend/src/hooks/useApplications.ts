import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { CustomerApplication, CustomerApplicationCreate, CustomerApplicationUpdate, PaginatedResponse } from '@/types/models';
import toast from 'react-hot-toast';
import { handleApiError } from '@/lib/handleApiError';
import { isValidUUID, validateUUID } from '@/lib/utils';

// Application query keys
export const applicationKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (filters: any) => [...applicationKeys.lists(), filters] as const,
  details: () => [...applicationKeys.all, 'detail'] as const,
  detail: (id: string) => [...applicationKeys.details(), id] as const,
};

// Application hooks
export const useApplications = (filters: {
  page?: number;
  size?: number;
  status?: string;
  search?: string;
  user_id?: string;
} = {}) => {
  return useQuery({
    queryKey: applicationKeys.list(filters),
    queryFn: () => apiClient.get<PaginatedResponse<CustomerApplication>>('/applications', {
      params: filters,
    }),
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useInfiniteApplications = (filters: {
  size?: number;
  status?: string;
  search?: string;
  user_id?: string;
} = {}) => {
  return useInfiniteQuery({
    queryKey: applicationKeys.list(filters),
    queryFn: ({ pageParam = 1 }) => 
      apiClient.get<PaginatedResponse<CustomerApplication>>('/applications', {
        params: { ...filters, page: pageParam },
      }),
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 60 * 1000,
  });
};

export const useApplication = (id: string) => {
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: () => apiClient.get<CustomerApplication>(`/applications/${id}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!id && isValidUUID(id),
  });
};

export const useCreateApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CustomerApplicationCreate) => 
      apiClient.post<CustomerApplication>('/applications', data),
    onSuccess: (newApplication) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
      toast.success('Application created successfully!');
    },
    onError: (error: any) => {
      handleApiError(error, 'Failed to create application');
    },
  });
};

export const useUpdateApplication = (id: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CustomerApplicationUpdate) => {
      validateUUID(id, 'Application');
      return apiClient.patch<CustomerApplication>(`/applications/${id}`, data);
    },
    onSuccess: (updatedApplication) => {
      queryClient.setQueryData(applicationKeys.detail(id), updatedApplication);
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
      toast.success('Application updated successfully!');
    },
    onError: (error) => {
      handleApiError(error, 'Failed to update application');
    },
  });
};

export const useDeleteApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => {
      validateUUID(id, 'Application');
      return apiClient.delete(`/applications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
      toast.success('Application deleted successfully!');
    },
    onError: (error) => {
      handleApiError(error, 'Failed to delete application');
    },
  });
};

// Status update hook
export const useUpdateApplicationStatus = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ status, rejection_reason }: { status: string; rejection_reason?: string }) => {
      validateUUID(id, 'Application');
      return apiClient.patch<CustomerApplication>(`/applications/${id}`, { 
        status, 
        rejection_reason 
      });
    },
    onSuccess: (updatedApplication) => {
      queryClient.setQueryData(applicationKeys.detail(id), updatedApplication);
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
      toast.success('Application status updated successfully!');
    },
    onError: (error: any) => {
      handleApiError(error, 'Failed to update status');
    },
  });
};

// Application statistics hook
export const useApplicationStats = () => {
  return useQuery({
    queryKey: [...applicationKeys.all, 'stats'],
    queryFn: () => apiClient.get('/applications/stats'),
    staleTime: 5 * 60 * 1000,
  });
};