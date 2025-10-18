/**
 * Permission Migration Utilities
 * 
 * Helper functions to facilitate migration from role-based to permission-based access control.
 * Provides backward compatibility, logging, and mapping utilities.
 * 
 * @module permissionMigration
 */

import { ResourceType, PermissionAction, PermissionScope } from '@/types/permissions';

/**
 * Permission check result with metadata
 */
export interface PermissionCheckResult {
  allowed: boolean;
  source: 'permission' | 'role' | 'fallback';
  reason?: string;
  timestamp: Date;
}

/**
 * Permission check log entry
 */
export interface PermissionCheckLog {
  userId?: string;
  resource: string;
  action: string;
  scope?: string;
  result: PermissionCheckResult;
  context?: Record<string, any>;
}

/**
 * Role to permission mapping configuration
 */
export interface RolePermissionMapping {
  role: string;
  permissions: Array<{
    resource: ResourceType | string;
    action: PermissionAction | string;
    scope?: PermissionScope | string;
  }>;
}

/**
 * Default role to permission mappings
 * Based on the legacy role system
 */
export const DEFAULT_ROLE_MAPPINGS: RolePermissionMapping[] = [
  {
    role: 'admin',
    permissions: [
      { resource: 'system', action: 'manage', scope: 'global' },
      { resource: 'user', action: 'manage', scope: 'global' },
      { resource: 'application', action: 'manage', scope: 'global' },
      { resource: 'file', action: 'manage', scope: 'global' },
      { resource: 'branch', action: 'manage', scope: 'global' },
      { resource: 'department', action: 'manage', scope: 'global' },
      { resource: 'workload', action: 'view', scope: 'global' },
      { resource: 'notification', action: 'manage', scope: 'global' },
      { resource: 'report', action: 'view', scope: 'global' },
    ],
  },
  {
    role: 'manager',
    permissions: [
      { resource: 'application', action: 'approve', scope: 'department' },
      { resource: 'application', action: 'reject', scope: 'department' },
      { resource: 'application', action: 'read', scope: 'department' },
      { resource: 'application', action: 'update', scope: 'department' },
      { resource: 'user', action: 'read', scope: 'department' },
      { resource: 'workload', action: 'view', scope: 'department' },
      { resource: 'file', action: 'read', scope: 'department' },
      { resource: 'report', action: 'view', scope: 'department' },
    ],
  },
  {
    role: 'officer',
    permissions: [
      { resource: 'application', action: 'create', scope: 'own' },
      { resource: 'application', action: 'read', scope: 'own' },
      { resource: 'application', action: 'update', scope: 'own' },
      { resource: 'application', action: 'process', scope: 'own' },
      { resource: 'file', action: 'create', scope: 'own' },
      { resource: 'file', action: 'read', scope: 'own' },
      { resource: 'file', action: 'update', scope: 'own' },
      { resource: 'file', action: 'delete', scope: 'own' },
    ],
  },
];

/**
 * Permission check logger
 * Logs permission checks for monitoring and debugging
 */
class PermissionCheckLogger {
  private logs: PermissionCheckLog[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory
  private enabled = process.env.NODE_ENV === 'development';

  /**
   * Log a permission check
   */
  log(entry: PermissionCheckLog): void {
    if (!this.enabled) return;

    this.logs.push(entry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console log in development
    if (process.env.NODE_ENV === 'development') {
      const { result, resource, action, scope } = entry;
      const emoji = result.allowed ? '✅' : '❌';
      console.log(
        `${emoji} Permission Check: ${resource}:${action}${scope ? `:${scope}` : ''} - ${result.source} - ${result.allowed ? 'ALLOWED' : 'DENIED'}`,
        entry.context
      );
    }
  }

  /**
   * Get all logs
   */
  getLogs(): PermissionCheckLog[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by criteria
   */
  getFilteredLogs(filter: Partial<PermissionCheckLog>): PermissionCheckLog[] {
    return this.logs.filter((log) => {
      if (filter.userId && log.userId !== filter.userId) return false;
      if (filter.resource && log.resource !== filter.resource) return false;
      if (filter.action && log.action !== filter.action) return false;
      return true;
    });
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Enable or disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Singleton logger instance
export const permissionLogger = new PermissionCheckLogger();

/**
 * Check if a role has a specific permission based on default mappings
 */
export function roleHasPermission(
  role: string,
  resource: ResourceType | string,
  action: PermissionAction | string,
  scope?: PermissionScope | string
): boolean {
  const mapping = DEFAULT_ROLE_MAPPINGS.find((m) => m.role.toLowerCase() === role.toLowerCase());
  
  if (!mapping) return false;

  return mapping.permissions.some((perm) => {
    const resourceMatch = perm.resource === resource;
    const actionMatch = perm.action === action;
    const scopeMatch = scope ? perm.scope === scope : true;
    
    return resourceMatch && actionMatch && scopeMatch;
  });
}

/**
 * Get all permissions for a role based on default mappings
 */
export function getRolePermissions(role: string): Array<{
  resource: string;
  action: string;
  scope?: string;
}> {
  const mapping = DEFAULT_ROLE_MAPPINGS.find((m) => m.role.toLowerCase() === role.toLowerCase());
  return mapping?.permissions || [];
}

/**
 * Permission check with fallback to role-based check
 * 
 * This function provides backward compatibility during migration.
 * It first tries the new permission system, then falls back to role-based checks.
 * 
 * @param permissionCheck - Result from usePermissionCheck().can()
 * @param userRole - User's role for fallback
 * @param resource - Resource type
 * @param action - Action to perform
 * @param scope - Optional scope
 * @param userId - Optional user ID for logging
 * @returns Permission check result with metadata
 */
export function checkPermissionWithFallback(
  permissionCheck: boolean | null,
  userRole: string | undefined,
  resource: ResourceType | string,
  action: PermissionAction | string,
  scope?: PermissionScope | string,
  userId?: string
): PermissionCheckResult {
  const timestamp = new Date();

  // If permission check is loading (null), deny access but mark as loading
  if (permissionCheck === null) {
    const result: PermissionCheckResult = {
      allowed: false,
      source: 'permission',
      reason: 'Permission check still loading',
      timestamp,
    };

    permissionLogger.log({
      userId,
      resource: String(resource),
      action: String(action),
      scope: scope ? String(scope) : undefined,
      result,
      context: { loading: true },
    });

    return result;
  }

  // If permission check succeeded, use it
  if (permissionCheck === true) {
    const result: PermissionCheckResult = {
      allowed: true,
      source: 'permission',
      reason: 'Permission granted by RBAC system',
      timestamp,
    };

    permissionLogger.log({
      userId,
      resource: String(resource),
      action: String(action),
      scope: scope ? String(scope) : undefined,
      result,
    });

    return result;
  }

  // Permission check failed, try role-based fallback
  if (userRole) {
    const roleFallback = roleHasPermission(userRole, resource, action, scope);
    
    if (roleFallback) {
      const result: PermissionCheckResult = {
        allowed: true,
        source: 'fallback',
        reason: `Permission granted by role fallback (${userRole})`,
        timestamp,
      };

      permissionLogger.log({
        userId,
        resource: String(resource),
        action: String(action),
        scope: scope ? String(scope) : undefined,
        result,
        context: { role: userRole, fallbackUsed: true },
      });

      return result;
    }
  }

  // Both permission and role checks failed
  const result: PermissionCheckResult = {
    allowed: false,
    source: 'permission',
    reason: 'Permission denied by RBAC system and role fallback',
    timestamp,
  };

  permissionLogger.log({
    userId,
    resource: String(resource),
    action: String(action),
    scope: scope ? String(scope) : undefined,
    result,
    context: { role: userRole },
  });

  return result;
}

/**
 * Helper to check if user is admin (with fallback)
 */
export function isAdminWithFallback(
  isAdminCheck: boolean | null,
  userRole: string | undefined
): boolean {
  if (isAdminCheck === true) return true;
  if (isAdminCheck === null) return false; // Loading, deny access
  return userRole?.toLowerCase() === 'admin';
}

/**
 * Helper to check if user has role (with fallback)
 */
export function hasRoleWithFallback(
  hasRoleCheck: boolean | null,
  userRole: string | undefined,
  targetRole: string
): boolean {
  if (hasRoleCheck === true) return true;
  if (hasRoleCheck === null) return false; // Loading, deny access
  return userRole?.toLowerCase() === targetRole.toLowerCase();
}

/**
 * Create a permission check function with automatic fallback
 * 
 * This is a higher-order function that creates a permission checker
 * with built-in fallback logic.
 * 
 * @example
 * const checkPermission = createPermissionChecker(can, user?.role, user?.id);
 * const canEdit = checkPermission('application', 'update', 'own');
 */
export function createPermissionChecker(
  canFn: (resource: ResourceType | string, action: PermissionAction | string, scope?: PermissionScope | string) => boolean | null,
  userRole: string | undefined,
  userId?: string
) {
  return (
    resource: ResourceType | string,
    action: PermissionAction | string,
    scope?: PermissionScope | string
  ): boolean => {
    const permissionCheck = canFn(resource, action, scope);
    const result = checkPermissionWithFallback(
      permissionCheck,
      userRole,
      resource,
      action,
      scope,
      userId
    );
    return result.allowed;
  };
}

/**
 * Migration status tracker
 */
export interface MigrationStatus {
  totalChecks: number;
  permissionChecks: number;
  roleChecks: number;
  fallbackChecks: number;
  deniedChecks: number;
}

/**
 * Get migration status from logs
 */
export function getMigrationStatus(): MigrationStatus {
  const logs = permissionLogger.getLogs();
  
  return {
    totalChecks: logs.length,
    permissionChecks: logs.filter((l) => l.result.source === 'permission' && l.result.allowed).length,
    roleChecks: logs.filter((l) => l.result.source === 'role' && l.result.allowed).length,
    fallbackChecks: logs.filter((l) => l.result.source === 'fallback').length,
    deniedChecks: logs.filter((l) => !l.result.allowed).length,
  };
}

/**
 * Export migration report
 */
export function exportMigrationReport(): string {
  const status = getMigrationStatus();
  const logs = permissionLogger.getLogs();
  
  const report = {
    generatedAt: new Date().toISOString(),
    status,
    logs: logs.slice(-100), // Last 100 logs
  };
  
  return JSON.stringify(report, null, 2);
}
