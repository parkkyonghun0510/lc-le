/**
 * usePermissionCheck Hook
 * 
 * Generalized permission checking hook for the entire application.
 * Provides functions to check permissions dynamically based on the backend RBAC system.
 * 
 * Features:
 * - can() - Check resource/action permissions
 * - hasRole() - Check if user has a specific role
 * - hasPermission() - Check if user has a named permission
 * - Caching with 5-minute TTL
 * - Cache invalidation on permission changes
 * - Loading state to prevent premature access decisions
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { permissionsApi } from '@/lib/api/permissions';
import {
  ResourceType,
  PermissionAction,
  PermissionScope,
  UserPermissionsResponse,
  EffectivePermission,
} from '@/types/permissions';

// Query keys for permission data
export const permissionCheckKeys = {
  all: ['permissionCheck'] as const,
  currentUser: () => [...permissionCheckKeys.all, 'currentUser'] as const,
};

/**
 * Hook return type
 */
export interface UsePermissionCheckReturn {
  /**
   * Check if user can perform an action on a resource type with optional scope
   * @param resource - The resource type (e.g., 'application', 'user')
   * @param action - The action to perform (e.g., 'create', 'read', 'update')
   * @param scope - Optional scope (e.g., 'own', 'department', 'global')
   * @returns true if user has permission, false otherwise
   */
  can: (resource: ResourceType | string, action: PermissionAction | string, scope?: PermissionScope | string) => boolean;
  
  /**
   * Check if user has a specific role by name
   * @param roleName - The role name to check (e.g., 'admin', 'manager')
   * @returns true if user has the role, false otherwise
   */
  hasRole: (roleName: string) => boolean;
  
  /**
   * Check if user has a specific named permission
   * @param permissionName - The permission name to check (e.g., 'application:create')
   * @returns true if user has the permission, false otherwise
   */
  hasPermission: (permissionName: string) => boolean;
  
  /**
   * Loading state - true while fetching permissions
   */
  loading: boolean;
  
  /**
   * Current user object
   */
  user: any | null;
  
  /**
   * User's effective permissions
   */
  permissions: EffectivePermission[];
  
  /**
   * User's roles
   */
  roles: string[];
  
  /**
   * Invalidate the permission cache (call after permission changes)
   */
  invalidateCache: () => Promise<void>;
}

/**
 * usePermissionCheck Hook
 * 
 * Fetches and caches current user's permissions with a 5-minute TTL.
 * Provides convenient functions for permission checking throughout the application.
 */
export const usePermissionCheck = (): UsePermissionCheckReturn => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  // Fetch current user's permissions
  const {
    data: userPermissions,
    isLoading,
    error,
  } = useQuery<UserPermissionsResponse>({
    queryKey: permissionCheckKeys.currentUser(),
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return permissionsApi.getCurrentUserPermissions();
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: 1000,
  });
  
  /**
   * Invalidate permission cache
   * Call this after permission changes to force refetch
   */
  const invalidateCache = async (): Promise<void> => {
    await queryClient.invalidateQueries({ 
      queryKey: permissionCheckKeys.currentUser() 
    });
  };
  
  /**
   * Check if user can perform an action on a resource
   */
  const can = (
    resource: ResourceType | string,
    action: PermissionAction | string,
    scope?: PermissionScope | string
  ): boolean => {
    // Return false if still loading or no permissions data
    if (isLoading || !userPermissions) {
      return false;
    }
    
    // Get effective permissions that are granted
    const grantedPermissions = userPermissions.effective_permissions.filter(
      (ep) => ep.is_granted
    );
    
    // Check if any permission matches the criteria
    return grantedPermissions.some((ep) => {
      const permission = ep.permission;
      
      // Match resource type
      const resourceMatch = permission.resource_type === resource;
      
      // Match action
      const actionMatch = permission.action === action;
      
      // Match scope if provided, otherwise any scope is acceptable
      const scopeMatch = scope ? permission.scope === scope : true;
      
      return resourceMatch && actionMatch && scopeMatch;
    });
  };
  
  /**
   * Check if user has a specific role
   */
  const hasRole = (roleName: string): boolean => {
    // Return false if still loading or no permissions data
    if (isLoading || !userPermissions) {
      return false;
    }
    
    // Check if user has the role (case-insensitive)
    return userPermissions.roles.some(
      (role) => role.name.toLowerCase() === roleName.toLowerCase()
    );
  };
  
  /**
   * Check if user has a specific named permission
   */
  const hasPermission = (permissionName: string): boolean => {
    // Return false if still loading or no permissions data
    if (isLoading || !userPermissions) {
      return false;
    }
    
    // Get effective permissions that are granted
    const grantedPermissions = userPermissions.effective_permissions.filter(
      (ep) => ep.is_granted
    );
    
    // Check if any permission matches the name (case-insensitive)
    return grantedPermissions.some(
      (ep) => ep.permission.name.toLowerCase() === permissionName.toLowerCase()
    );
  };
  
  // Extract roles and permissions for convenience
  const roles = userPermissions?.roles.map((role) => role.name) || [];
  const permissions = userPermissions?.effective_permissions || [];
  
  return {
    can,
    hasRole,
    hasPermission,
    loading: isLoading,
    user,
    permissions,
    roles,
    invalidateCache,
  };
};

/**
 * Helper function to create permission name from resource and action
 * Format: resource_type:action
 */
export const createPermissionName = (
  resource: ResourceType | string,
  action: PermissionAction | string
): string => {
  return `${resource}:${action}`;
};

/**
 * Helper function to parse permission name into resource and action
 */
export const parsePermissionName = (
  permissionName: string
): { resource: string; action: string } | null => {
  const parts = permissionName.split(':');
  if (parts.length !== 2) {
    return null;
  }
  return {
    resource: parts[0],
    action: parts[1],
  };
};

export default usePermissionCheck;
