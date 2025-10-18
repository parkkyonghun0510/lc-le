/**
 * Optimized Permission Hooks
 * 
 * Enhanced React Query hooks with optimized caching strategies:
 * - Longer stale times for stable data
 * - Background refetching for fresh data
 * - Prefetching for better UX
 * - Optimistic updates for instant feedback
 */

'use client';

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { usePermissionRetry } from './usePermissionRetry';
import type { Permission, Role, PermissionTemplate } from '@/types/permissions';

// Optimized cache times
const CACHE_CONFIG = {
  permissions: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  },
  roles: {
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
  },
  matrix: {
    staleTime: 2 * 60 * 1000, // 2 minutes (more dynamic)
    cacheTime: 15 * 60 * 1000,
  },
  templates: {
    staleTime: 10 * 60 * 1000, // 10 minutes (rarely changes)
    cacheTime: 60 * 60 * 1000, // 1 hour
  },
  audit: {
    staleTime: 1 * 60 * 1000, // 1 minute (frequently updated)
    cacheTime: 10 * 60 * 1000,
  },
};

// Query keys factory
export const permissionQueryKeys = {
  all: ['permissions'] as const,
  lists: () => [...permissionQueryKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...permissionQueryKeys.lists(), filters] as const,
  details: () => [...permissionQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...permissionQueryKeys.details(), id] as const,
  
  roles: {
    all: ['roles'] as const,
    lists: () => [...permissionQueryKeys.roles.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...permissionQueryKeys.roles.lists(), filters] as const,
    details: () => [...permissionQueryKeys.roles.all, 'detail'] as const,
    detail: (id: string) => [...permissionQueryKeys.roles.details(), id] as const,
  },
  
  matrix: () => [...permissionQueryKeys.all, 'matrix'] as const,
  
  templates: {
    all: ['templates'] as const,
    lists: () => [...permissionQueryKeys.templates.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...permissionQueryKeys.templates.lists(), filters] as const,
  },
  
  audit: (filters?: Record<string, any>) => [...permissionQueryKeys.all, 'audit', filters] as const,
  
  userPermissions: (userId: string) => [...permissionQueryKeys.all, 'user', userId] as const,
  userRoles: (userId: string) => [...permissionQueryKeys.roles.all, 'user', userId] as const,
};

/**
 * Optimized hook for fetching permissions with smart caching
 */
export function useOptimizedPermissions(
  filters?: Record<string, any>,
  options?: Partial<UseQueryOptions<Permission[]>>
) {
  const { retryWithBackoff } = usePermissionRetry();

  return useQuery<Permission[]>({
    queryKey: permissionQueryKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
          }
        });
      }

      const response = await fetch(`/api/v1/permissions?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }
      return response.json();
    },
    staleTime: CACHE_CONFIG.permissions.staleTime,
    gcTime: CACHE_CONFIG.permissions.cacheTime,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
    retry: retryWithBackoff,
    ...options,
  });
}

/**
 * Optimized hook for fetching roles with smart caching
 */
export function useOptimizedRoles(
  filters?: Record<string, any>,
  options?: Partial<UseQueryOptions<Role[]>>
) {
  const { retryWithBackoff } = usePermissionRetry();

  return useQuery<Role[]>({
    queryKey: permissionQueryKeys.roles.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
          }
        });
      }

      const response = await fetch(`/api/v1/permissions/roles?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }
      return response.json();
    },
    staleTime: CACHE_CONFIG.roles.staleTime,
    gcTime: CACHE_CONFIG.roles.cacheTime,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
    retry: retryWithBackoff,
    ...options,
  });
}

/**
 * Optimized hook for fetching permission matrix
 */
export function useOptimizedMatrix(options?: Partial<UseQueryOptions<any>>) {
  const { retryWithBackoff } = usePermissionRetry();

  return useQuery({
    queryKey: permissionQueryKeys.matrix(),
    queryFn: async () => {
      const response = await fetch('/api/v1/permissions/matrix');
      if (!response.ok) {
        throw new Error('Failed to fetch permission matrix');
      }
      return response.json();
    },
    staleTime: CACHE_CONFIG.matrix.staleTime,
    gcTime: CACHE_CONFIG.matrix.cacheTime,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
    retry: retryWithBackoff,
    ...options,
  });
}

/**
 * Optimized hook for fetching templates
 */
export function useOptimizedTemplates(
  filters?: Record<string, any>,
  options?: Partial<UseQueryOptions<PermissionTemplate[]>>
) {
  const { retryWithBackoff } = usePermissionRetry();

  return useQuery<PermissionTemplate[]>({
    queryKey: permissionQueryKeys.templates.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
          }
        });
      }

      const response = await fetch(`/api/v1/permissions/templates?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      return response.json();
    },
    staleTime: CACHE_CONFIG.templates.staleTime,
    gcTime: CACHE_CONFIG.templates.cacheTime,
    refetchOnWindowFocus: false, // Templates rarely change
    refetchOnMount: false,
    retry: retryWithBackoff,
    ...options,
  });
}

/**
 * Hook for prefetching related data
 */
export function usePrefetchPermissionData() {
  const queryClient = useQueryClient();

  const prefetchPermissions = async (filters?: Record<string, any>) => {
    await queryClient.prefetchQuery({
      queryKey: permissionQueryKeys.list(filters),
      queryFn: async () => {
        const params = new URLSearchParams();
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              params.append(key, String(value));
            }
          });
        }
        const response = await fetch(`/api/v1/permissions?${params.toString()}`);
        return response.json();
      },
      staleTime: CACHE_CONFIG.permissions.staleTime,
    });
  };

  const prefetchRoles = async (filters?: Record<string, any>) => {
    await queryClient.prefetchQuery({
      queryKey: permissionQueryKeys.roles.list(filters),
      queryFn: async () => {
        const params = new URLSearchParams();
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              params.append(key, String(value));
            }
          });
        }
        const response = await fetch(`/api/v1/permissions/roles?${params.toString()}`);
        return response.json();
      },
      staleTime: CACHE_CONFIG.roles.staleTime,
    });
  };

  const prefetchMatrix = async () => {
    await queryClient.prefetchQuery({
      queryKey: permissionQueryKeys.matrix(),
      queryFn: async () => {
        const response = await fetch('/api/v1/permissions/matrix');
        return response.json();
      },
      staleTime: CACHE_CONFIG.matrix.staleTime,
    });
  };

  return {
    prefetchPermissions,
    prefetchRoles,
    prefetchMatrix,
  };
}

/**
 * Hook for invalidating permission caches
 */
export function useInvalidatePermissionCache() {
  const queryClient = useQueryClient();

  const invalidatePermissions = () => {
    queryClient.invalidateQueries({ queryKey: permissionQueryKeys.lists() });
  };

  const invalidateRoles = () => {
    queryClient.invalidateQueries({ queryKey: permissionQueryKeys.roles.lists() });
  };

  const invalidateMatrix = () => {
    queryClient.invalidateQueries({ queryKey: permissionQueryKeys.matrix() });
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: permissionQueryKeys.all });
  };

  return {
    invalidatePermissions,
    invalidateRoles,
    invalidateMatrix,
    invalidateAll,
  };
}
