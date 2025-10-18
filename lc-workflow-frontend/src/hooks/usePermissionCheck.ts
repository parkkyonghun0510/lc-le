/**
 * usePermissionCheck Hook
 * 
 * Generalized permission checking hook for the entire application.
 * Provides functions to check permissions dynamically based on the backend RBAC system.
 * 
 * Features:
 * - can() - Check resource/action permissions with admin role support
 * - hasRole() - Check if user has a specific role
 * - hasPermission() - Check if user has a named permission
 * - Caching with 5-minute TTL
 * - Cache invalidation on permission changes
 * - Proper loading state handling to prevent premature access denial
 * - Admin role grants access to all permission management features
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
   * @returns true if user has permission, false if denied, null if still loading
   */
  can: (resource: ResourceType | string, action: PermissionAction | string, scope?: PermissionScope | string) => boolean | null;
  
  /**
   * Check if user has a specific role by name
   * @param roleName - The role name to check (e.g., 'admin', 'manager')
   * @returns true if user has the role, false if not, null if still loading
   */
  hasRole: (roleName: string) => boolean | null;
  
  /**
   * Check if user has a specific named permission
   * @param permissionName - The permission name to check (e.g., 'application:create')
   * @returns true if user has the permission, false if not, null if still loading
   */
  hasPermission: (permissionName: string) => boolean | null;
  
  /**
   * Check if user is admin (has admin role)
   * @returns true if user is admin, false if not, null if still loading
   */
  isAdmin: () => boolean | null;
  
  /**
   * Loading state - true while fetching permissions
   */
  loading: boolean;
  
  /**
   * Error state - contains error if permission fetch failed
   */
  error: any;
  
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
  
  /**
   * Refetch permissions data
   */
  refetch: () => Promise<void>;
}

/**
 * usePermissionCheck Hook
 * 
 * Fetches and caches current user's permissions with a 5-minute TTL.
 * Provides convenient functions for permission checking throughout the application.
 * Handles loading states properly and supports admin role access to all features.
 */
export const usePermissionCheck = (): UsePermissionCheckReturn => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // Fetch current user's permissions
  const {
    data: userPermissions,
    isLoading: permissionsLoading,
    error,
    refetch,
  } = useQuery<UserPermissionsResponse>({
    queryKey: permissionCheckKeys.currentUser(),
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return permissionsApi.getCurrentUserPermissions();
    },
    enabled: isAuthenticated && !!user?.id && !authLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: 1000,
  });
  
  // Overall loading state
  const loading = authLoading || permissionsLoading;
  
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
   * Refetch permissions data
   */
  const refetchPermissions = async (): Promise<void> => {
    await refetch();
  };
  
  /**
   * Check if user is admin
   */
  const isAdmin = (): boolean | null => {
    // Return null if still loading
    if (loading) {
      return null;
    }
    
    // Check if user has admin role (case-insensitive)
    if (user?.role === 'admin') {
      return true;
    }
    
    // Also check in permissions data if available
    if (userPermissions?.roles) {
      return userPermissions.roles.some(
        (role) => role.name.toLowerCase() === 'admin'
      );
    }
    
    return false;
  };
  
  /**
   * Check if user can perform an action on a resource
   */
  const can = (
    resource: ResourceType | string,
    action: PermissionAction | string,
    scope?: PermissionScope | string
  ): boolean | null => {
    // Return null if still loading - don't deny access while loading
    if (loading) {
      return null;
    }
    
    // Admin users have access to all permission management features
    const adminCheck = isAdmin();
    if (adminCheck === true) {
      // For system resources, admin always has access
      if (resource === 'system' || resource === ResourceType.SYSTEM) {
        return true;
      }
      // For permission management resources, admin always has access
      if (resource === 'permission' || resource === ResourceType.PERMISSION ||
          resource === 'role' || resource === ResourceType.ROLE) {
        return true;
      }
    }
    
    // If no permissions data available, deny access
    if (!userPermissions) {
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
  const hasRole = (roleName: string): boolean | null => {
    // Return null if still loading - don't deny access while loading
    if (loading) {
      return null;
    }
    
    // If there was an error fetching permissions, fall back to auth data only
    if (error && !userPermissions) {
      return user?.role?.toLowerCase() === roleName.toLowerCase() || false;
    }
    
    // If we have permissions data, use it (more authoritative)
    if (userPermissions) {
      return userPermissions.roles.some(
        (role) => role.name.toLowerCase() === roleName.toLowerCase()
      );
    }
    
    // Fallback to auth data if no permissions data yet
    return user?.role?.toLowerCase() === roleName.toLowerCase() || false;
  };
  
  /**
   * Check if user has a specific named permission
   */
  const hasPermission = (permissionName: string): boolean | null => {
    // Return null if still loading - don't deny access while loading
    if (loading) {
      return null;
    }
    
    // Admin users have all system permissions
    const adminCheck = isAdmin();
    if (adminCheck === true) {
      // Admin has all SYSTEM.* permissions
      if (permissionName.toLowerCase().startsWith('system.')) {
        return true;
      }
    }
    
    // If no permissions data available, deny access
    if (!userPermissions) {
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
    isAdmin,
    loading,
    error,
    user,
    permissions,
    roles,
    invalidateCache,
    refetch: refetchPermissions,
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
