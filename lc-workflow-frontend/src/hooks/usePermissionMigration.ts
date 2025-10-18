/**
 * usePermissionMigration Hook
 * 
 * React hook that provides permission checking with automatic fallback to role-based checks.
 * Useful during the migration period from role-based to permission-based access control.
 * 
 * @module usePermissionMigration
 */

import { useMemo, useCallback } from 'react';
import { usePermissionCheck } from './usePermissionCheck';
import { useAuth } from './useAuth';
import {
  createPermissionChecker,
  checkPermissionWithFallback,
  isAdminWithFallback,
  hasRoleWithFallback,
  PermissionCheckResult,
} from '@/utils/permissionMigration';
import { ResourceType, PermissionAction, PermissionScope } from '@/types/permissions';

/**
 * Hook return type
 */
export interface UsePermissionMigrationReturn {
  /**
   * Check if user can perform an action with automatic fallback
   * @param resource - The resource type
   * @param action - The action to perform
   * @param scope - Optional scope
   * @returns true if allowed, false if denied
   */
  can: (resource: ResourceType | string, action: PermissionAction | string, scope?: PermissionScope | string) => boolean;
  
  /**
   * Check if user can perform an action with detailed result
   * @param resource - The resource type
   * @param action - The action to perform
   * @param scope - Optional scope
   * @returns Detailed permission check result
   */
  canWithDetails: (
    resource: ResourceType | string,
    action: PermissionAction | string,
    scope?: PermissionScope | string
  ) => PermissionCheckResult;
  
  /**
   * Check if user is admin with fallback
   * @returns true if admin, false otherwise
   */
  isAdmin: () => boolean;
  
  /**
   * Check if user has a specific role with fallback
   * @param roleName - The role name to check
   * @returns true if user has role, false otherwise
   */
  hasRole: (roleName: string) => boolean;
  
  /**
   * Loading state
   */
  loading: boolean;
  
  /**
   * Error state
   */
  error: any;
  
  /**
   * Current user
   */
  user: any | null;
  
  /**
   * User's role (for fallback)
   */
  userRole: string | undefined;
  
  /**
   * Invalidate permission cache
   */
  invalidateCache: () => Promise<void>;
  
  /**
   * Refetch permissions
   */
  refetch: () => Promise<void>;
}

/**
 * usePermissionMigration Hook
 * 
 * Provides permission checking with automatic fallback to role-based checks.
 * This hook is designed to be used during the migration period to ensure
 * backward compatibility while transitioning to the new permission system.
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { can, isAdmin, loading } = usePermissionMigration();
 *   
 *   if (loading) return <Spinner />;
 *   
 *   const canEdit = can('application', 'update', 'department');
 *   const isAdminUser = isAdmin();
 *   
 *   return (
 *     <div>
 *       {canEdit && <button>Edit</button>}
 *       {isAdminUser && <button>Admin Panel</button>}
 *     </div>
 *   );
 * }
 * ```
 */
export const usePermissionMigration = (): UsePermissionMigrationReturn => {
  const { user } = useAuth();
  const permissionCheck = usePermissionCheck();
  
  const {
    can: permissionCan,
    hasRole: permissionHasRole,
    isAdmin: permissionIsAdmin,
    loading,
    error,
    invalidateCache,
    refetch,
  } = permissionCheck;
  
  const userRole = user?.role;
  const userId = user?.id;
  
  /**
   * Create memoized permission checker with fallback
   */
  const checkPermission = useMemo(
    () => createPermissionChecker(permissionCan, userRole, userId),
    [permissionCan, userRole, userId]
  );
  
  /**
   * Check permission with detailed result
   */
  const canWithDetails = useCallback(
    (
      resource: ResourceType | string,
      action: PermissionAction | string,
      scope?: PermissionScope | string
    ): PermissionCheckResult => {
      const permissionResult = permissionCan(resource, action, scope);
      return checkPermissionWithFallback(
        permissionResult,
        userRole,
        resource,
        action,
        scope,
        userId
      );
    },
    [permissionCan, userRole, userId]
  );
  
  /**
   * Check if user is admin with fallback
   */
  const isAdmin = useCallback((): boolean => {
    const adminCheck = permissionIsAdmin();
    return isAdminWithFallback(adminCheck, userRole);
  }, [permissionIsAdmin, userRole]);
  
  /**
   * Check if user has role with fallback
   */
  const hasRole = useCallback(
    (roleName: string): boolean => {
      const roleCheck = permissionHasRole(roleName);
      return hasRoleWithFallback(roleCheck, userRole, roleName);
    },
    [permissionHasRole, userRole]
  );
  
  return {
    can: checkPermission,
    canWithDetails,
    isAdmin,
    hasRole,
    loading,
    error,
    user,
    userRole,
    invalidateCache,
    refetch,
  };
};

/**
 * Hook for checking multiple permissions at once
 * 
 * @example
 * ```typescript
 * const permissions = usePermissions({
 *   canCreate: ['application', 'create', 'own'],
 *   canUpdate: ['application', 'update', 'own'],
 *   canDelete: ['application', 'delete', 'global'],
 * });
 * 
 * if (permissions.canCreate) {
 *   // Show create button
 * }
 * ```
 */
export function usePermissions<T extends Record<string, [string, string, string?]>>(
  permissionMap: T
): Record<keyof T, boolean> & { loading: boolean } {
  const { can, loading } = usePermissionMigration();
  
  const permissions = useMemo(() => {
    const result: any = { loading };
    
    for (const [key, [resource, action, scope]] of Object.entries(permissionMap)) {
      result[key] = can(resource, action, scope);
    }
    
    return result;
  }, [can, loading, permissionMap]);
  
  return permissions;
}

/**
 * Hook for page-level access control with automatic redirect
 * 
 * @example
 * ```typescript
 * function AdminPage() {
 *   const { hasAccess, loading } = usePageAccess('system', 'manage', 'global');
 *   
 *   if (loading) return <Spinner />;
 *   if (!hasAccess) return <AccessDenied />;
 *   
 *   return <div>Admin Content</div>;
 * }
 * ```
 */
export function usePageAccess(
  resource: ResourceType | string,
  action: PermissionAction | string,
  scope?: PermissionScope | string
): {
  hasAccess: boolean;
  loading: boolean;
  reason?: string;
} {
  const { canWithDetails, loading } = usePermissionMigration();
  
  const result = useMemo(() => {
    if (loading) {
      return { hasAccess: false, loading: true };
    }
    
    const checkResult = canWithDetails(resource, action, scope);
    
    return {
      hasAccess: checkResult.allowed,
      loading: false,
      reason: checkResult.reason,
    };
  }, [canWithDetails, loading, resource, action, scope]);
  
  return result;
}

/**
 * Hook for conditional feature rendering
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const features = useFeatureFlags({
 *     showEditButton: ['application', 'update', 'own'],
 *     showDeleteButton: ['application', 'delete', 'global'],
 *     showApproveButton: ['application', 'approve', 'department'],
 *   });
 *   
 *   return (
 *     <div>
 *       {features.showEditButton && <button>Edit</button>}
 *       {features.showDeleteButton && <button>Delete</button>}
 *       {features.showApproveButton && <button>Approve</button>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFeatureFlags<T extends Record<string, [string, string, string?]>>(
  featureMap: T
): Record<keyof T, boolean> & { loading: boolean } {
  return usePermissions(featureMap);
}

export default usePermissionMigration;
