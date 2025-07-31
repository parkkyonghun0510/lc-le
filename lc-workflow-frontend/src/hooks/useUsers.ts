import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { User, UserCreate, UserUpdate, PaginatedResponse } from '@/types/models';
import toast from 'react-hot-toast';
import { isValidUUID, validateUUID } from '@/lib/utils';

// User query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: any) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// User hooks
export const useUsers = (filters: {
  page?: number;
  size?: number;
  role?: string;
  department_id?: string;
  branch_id?: string;
  search?: string;
  status?: string;
} = {}) => {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => apiClient.get<PaginatedResponse<User>>('/users', {
      params: filters,
    }),
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useInfiniteUsers = (filters: {
  size?: number;
  role?: string;
  department_id?: string;
  branch_id?: string;
  search?: string;
  status?: string;
} = {}) => {
  return useInfiniteQuery({
    queryKey: userKeys.list(filters),
    queryFn: ({ pageParam = 1 }) => 
      apiClient.get<PaginatedResponse<User>>('/users', {
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

export const useUser = (id: string) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => apiClient.get<User>(`/users/${id}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!id && isValidUUID(id),
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserCreate) => apiClient.post<User>('/users', data),
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success('User created successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create user';
      toast.error(message);
    },
  });
};

export const useUpdateUser = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserUpdate) => {
      validateUUID(id, 'User');
      return apiClient.patch<User>(`/users/${id}`, data);
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(userKeys.detail(id), updatedUser);
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success('User updated successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update user';
      toast.error(message);
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      validateUUID(id, 'User');
      return apiClient.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success('User deleted successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete user';
      toast.error(message);
    },
  });
};

// User profile hooks
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UserUpdate>) => 
      apiClient.patch<User>('/users/me', data),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['auth', 'user'], updatedUser);
      toast.success('Profile updated successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update profile';
      toast.error(message);
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: ({ old_password, new_password }: { old_password: string; new_password: string }) =>
      apiClient.patch('/users/me/change-password', { old_password, new_password }),
    onSuccess: () => {
      toast.success('Password changed successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to change password';
      toast.error(message);
    },
  });
};

// User statistics hook
export const useUserStats = () => {
  return useQuery({
    queryKey: [...userKeys.all, 'stats'],
    queryFn: () => apiClient.get('/users/stats'),
    staleTime: 5 * 60 * 1000,
  });
};