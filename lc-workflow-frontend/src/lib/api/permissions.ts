/**
 * Permission Management System - API Client
 * 
 * Comprehensive API client for managing permissions, roles, and user access.
 * Provides type-safe methods for all permission-related operations with enhanced error handling.
 */

import { AxiosError } from 'axios';
import { apiClient } from '../api';
import { 
  PermissionError, 
  ApiError, 
  NetworkError, 
  ValidationError,
  createErrorFromAxiosError,
  isPermissionError,
  isApiError,
  isNetworkError,
  isValidationError
} from './permissionErrors';
import {
  // Permission types
  Permission,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  ListPermissionsParams,
  ListPermissionsResponse,
  
  // Role types
  Role,
  CreateRoleRequest,
  UpdateRoleRequest,
  ListRolesParams,
  ListRolesResponse,
  
  // User permission types
  UserRole,
  RoleAssignmentCreate,
  UserPermission,
  UserPermissionCreate,
  UserPermissionsResponse,
  
  // Matrix types
  PermissionMatrixResponse,
  MatrixFilters,
  
  // Bulk operation types
  BulkOperationRequest,
  BulkOperationResult,
  BulkRoleAssignment,
  
  // Permission check types
  PermissionCheckRequest,
  PermissionCheckResponse,
} from '@/types/permissions';

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Enhanced error handler for permission API calls
 */
const handlePermissionApiError = (error: any, endpoint: string, method: string = 'GET'): never => {
  // Check if it's an Axios error (has response property or is network error)
  if (error && (error.response || error.code || error.isAxiosError)) {
    throw createErrorFromAxiosError(error as AxiosError, endpoint, method);
  }
  
  // If it's already one of our custom errors, re-throw it
  if (isPermissionError(error) || isApiError(error) || isNetworkError(error) || isValidationError(error)) {
    throw error;
  }
  
  // Fallback for unknown errors
  throw new ApiError(
    error.message || 'An unexpected error occurred',
    500,
    'unknown_error',
    error,
    endpoint,
    method
  );
};

/**
 * Permission Management API Client
 * 
 * Provides methods for all permission-related API operations with:
 * - Type safety
 * - Enhanced error handling with custom error classes
 * - Request/response transformation
 * - Retry logic (inherited from base apiClient)
 * - User-friendly error messages
 */
export const permissionsApi = {
  // ============================================================================
  // Permission CRUD Operations
  // ============================================================================

  /**
   * List all permissions with optional filtering and pagination
   */
  list: async (params?: ListPermissionsParams): Promise<ListPermissionsResponse> => {
    const queryParams = new URLSearchParams();
    
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params?.sort_order) queryParams.append('sort_order', params.sort_order);
    if (params?.resource_type) queryParams.append('resource_type', params.resource_type);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.scope) queryParams.append('scope', params.scope);
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
    if (params?.search) queryParams.append('search', params.search);
    
    const url = `/permissions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get<ListPermissionsResponse>(url);
  },

  /**
   * Get a single permission by ID
   */
  get: async (id: string): Promise<Permission> => {
    return apiClient.get<Permission>(`/permissions/${id}`);
  },

  /**
   * Create a new permission
   */
  create: async (data: CreatePermissionRequest): Promise<Permission> => {
    return apiClient.post<Permission>('/permissions', data);
  },

  /**
   * Update an existing permission
   */
  update: async (id: string, data: UpdatePermissionRequest): Promise<Permission> => {
    return apiClient.patch<Permission>(`/permissions/${id}`, data);
  },

  /**
   * Delete a permission
   */
  delete: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/permissions/${id}`);
  },

  /**
   * Toggle permission active status
   */
  toggleActive: async (id: string, is_active: boolean): Promise<Permission> => {
    return apiClient.patch<Permission>(`/permissions/${id}`, { is_active });
  },

  // ============================================================================
  // Role CRUD Operations
  // ============================================================================

  /**
   * List all roles with optional filtering and pagination
   */
  listRoles: async (params?: ListRolesParams): Promise<ListRolesResponse> => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.page !== undefined) queryParams.append('page', params.page.toString());
      if (params?.size !== undefined) queryParams.append('size', params.size.toString());
      if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
      if (params?.sort_order) queryParams.append('sort_order', params.sort_order);
      if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
      if (params?.is_system_role !== undefined) queryParams.append('is_system_role', params.is_system_role.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.min_member_count !== undefined) queryParams.append('min_member_count', params.min_member_count.toString());
      if (params?.max_member_count !== undefined) queryParams.append('max_member_count', params.max_member_count.toString());
      
      const url = `/roles${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      return await apiClient.get<ListRolesResponse>(url);
    } catch (error) {
      return handlePermissionApiError(error, '/roles', 'GET');
    }
  },

  /**
   * Get a single role by ID with permissions
   */
  getRole: async (id: string): Promise<Role> => {
    return apiClient.get<Role>(`/roles/${id}`);
  },

  /**
   * Create a new role
   */
  createRole: async (data: CreateRoleRequest): Promise<Role> => {
    return apiClient.post<Role>('/roles', data);
  },

  /**
   * Update an existing role
   */
  updateRole: async (id: string, data: UpdateRoleRequest): Promise<Role> => {
    return apiClient.patch<Role>(`/roles/${id}`, data);
  },

  /**
   * Delete a role
   */
  deleteRole: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/roles/${id}`);
  },

  // ============================================================================
  // Permission Templates Operations
  // ============================================================================

  /**
   * List all permission templates
   */
  listTemplates: async (): Promise<any[]> => {
    try {
      return await apiClient.get<any[]>('/permissions/templates');
    } catch (error) {
      return handlePermissionApiError(error, '/permissions/templates', 'GET');
    }
  },

  // ============================================================================
  // Role-Permission Management
  // ============================================================================

  /**
   * Assign a permission to a role
   */
  assignPermissionToRole: async (roleId: string, permissionId: string): Promise<void> => {
    return apiClient.post<void>(`/roles/${roleId}/permissions/${permissionId}`);
  },

  /**
   * Revoke a permission from a role
   */
  revokePermissionFromRole: async (roleId: string, permissionId: string): Promise<void> => {
    return apiClient.delete<void>(`/roles/${roleId}/permissions/${permissionId}`);
  },

  /**
   * Get all permissions for a role
   */
  getRolePermissions: async (roleId: string): Promise<Permission[]> => {
    return apiClient.get<Permission[]>(`/roles/${roleId}/permissions`);
  },

  /**
   * Update all permissions for a role (replaces existing)
   */
  updateRolePermissions: async (roleId: string, permissionIds: string[]): Promise<Role> => {
    return apiClient.put<Role>(`/roles/${roleId}/permissions`, { permission_ids: permissionIds });
  },

  // ============================================================================
  // User-Role Management
  // ============================================================================

  /**
   * Assign a role to a user
   */
  assignRoleToUser: async (userId: string, data: RoleAssignmentCreate): Promise<UserRole> => {
    return apiClient.post<UserRole>(`/users/${userId}/roles`, data);
  },

  /**
   * Revoke a role from a user
   */
  revokeRoleFromUser: async (userId: string, roleId: string): Promise<void> => {
    return apiClient.delete<void>(`/users/${userId}/roles/${roleId}`);
  },

  /**
   * Get all roles assigned to a user
   */
  getUserRoles: async (userId: string): Promise<Role[]> => {
    return apiClient.get<Role[]>(`/users/${userId}/roles`);
  },

  /**
   * Get all members of a role
   */
  getRoleMembers: async (roleId: string): Promise<Array<{ id: string; username: string; email: string }>> => {
    return apiClient.get<Array<{ id: string; username: string; email: string }>>(`/roles/${roleId}/members`);
  },

  // ============================================================================
  // User-Permission Management
  // ============================================================================

  /**
   * Grant a direct permission to a user
   */
  grantPermissionToUser: async (userId: string, data: UserPermissionCreate): Promise<UserPermission> => {
    return apiClient.post<UserPermission>(`/users/${userId}/permissions`, data);
  },

  /**
   * Revoke a direct permission from a user
   */
  revokePermissionFromUser: async (userId: string, permissionId: string): Promise<void> => {
    return apiClient.delete<void>(`/users/${userId}/permissions/${permissionId}`);
  },

  /**
   * Get all direct permissions for a user
   */
  getUserDirectPermissions: async (userId: string): Promise<UserPermission[]> => {
    return apiClient.get<UserPermission[]>(`/users/${userId}/permissions`);
  },

  /**
   * Get comprehensive user permissions (roles + direct + effective)
   */
  getUserPermissions: async (userId: string): Promise<UserPermissionsResponse> => {
    return apiClient.get<UserPermissionsResponse>(`/users/${userId}/permissions/all`);
  },

  // ============================================================================
  // Permission Matrix
  // ============================================================================

  /**
   * Get permission matrix data with optional filters
   */
  getPermissionMatrix: async (filters?: MatrixFilters): Promise<PermissionMatrixResponse> => {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters?.department_id) queryParams.append('department_id', filters.department_id);
      if (filters?.branch_id) queryParams.append('branch_id', filters.branch_id);
      if (filters?.resource_type) queryParams.append('resource_type', filters.resource_type);
      if (filters?.scope) queryParams.append('scope', filters.scope);
      if (filters?.user_search) queryParams.append('user_search', filters.user_search);
      if (filters?.permission_search) queryParams.append('permission_search', filters.permission_search);
      
      const url = `/permissions/matrix${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      return await apiClient.get<PermissionMatrixResponse>(url);
    } catch (error) {
      return handlePermissionApiError(error, '/permissions/matrix', 'GET');
    }
  },

  /**
   * Alias for getPermissionMatrix for backward compatibility
   */
  getMatrix: async (filters?: MatrixFilters): Promise<PermissionMatrixResponse> => {
    return permissionsApi.getPermissionMatrix(filters);
  },

  /**
   * Toggle a permission in the matrix (grant or revoke)
   */
  toggleMatrixPermission: async (userId: string, permissionId: string, isGranted: boolean): Promise<void> => {
    if (isGranted) {
      await permissionsApi.grantPermissionToUser(userId, {
        permission_id: permissionId,
        is_granted: true,
      });
    } else {
      await permissionsApi.revokePermissionFromUser(userId, permissionId);
    }
  },

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Perform bulk operation on permissions
   */
  bulkOperationPermissions: async (request: BulkOperationRequest): Promise<BulkOperationResult> => {
    return apiClient.post<BulkOperationResult>('/permissions/bulk', request);
  },

  /**
   * Bulk assign roles to multiple users
   */
  bulkAssignRoles: async (data: BulkRoleAssignment): Promise<BulkOperationResult> => {
    return apiClient.post<BulkOperationResult>('/roles/bulk-assign', data);
  },

  /**
   * Bulk activate permissions
   */
  bulkActivatePermissions: async (ids: string[]): Promise<BulkOperationResult> => {
    return permissionsApi.bulkOperationPermissions({ action: 'activate', ids });
  },

  /**
   * Bulk deactivate permissions
   */
  bulkDeactivatePermissions: async (ids: string[]): Promise<BulkOperationResult> => {
    return permissionsApi.bulkOperationPermissions({ action: 'deactivate', ids });
  },

  /**
   * Bulk delete permissions
   */
  bulkDeletePermissions: async (ids: string[]): Promise<BulkOperationResult> => {
    return permissionsApi.bulkOperationPermissions({ action: 'delete', ids });
  },

  // ============================================================================
  // Permission Checking
  // ============================================================================

  /**
   * Check if current user has a specific permission
   */
  checkPermission: async (request: PermissionCheckRequest): Promise<PermissionCheckResponse> => {
    return apiClient.post<PermissionCheckResponse>('/permissions/check', request);
  },

  /**
   * Get current user's effective permissions
   */
  getCurrentUserPermissions: async (): Promise<UserPermissionsResponse> => {
    return apiClient.get<UserPermissionsResponse>('/auth/me/permissions');
  },

  // ============================================================================
  // Export Operations
  // ============================================================================

  /**
   * Export permission matrix to CSV
   */
  exportMatrixToCSV: async (filters?: MatrixFilters): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    
    if (filters?.department_id) queryParams.append('department_id', filters.department_id);
    if (filters?.branch_id) queryParams.append('branch_id', filters.branch_id);
    if (filters?.resource_type) queryParams.append('resource_type', filters.resource_type);
    if (filters?.scope) queryParams.append('scope', filters.scope);
    
    const url = `/permissions/matrix/export${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    // Use axios directly for blob response
    const response = await apiClient.get<Blob>(url, {
      responseType: 'blob',
    });
    
    return response as unknown as Blob;
  },

  // ============================================================================
  // Enhanced Error Handling Methods
  // ============================================================================

  /**
   * Test permission API connectivity
   */
  testConnection: async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiClient.get('/permissions/health');
      return { success: true };
    } catch (error) {
      // Convert to our custom error types first
      let customError;
      try {
        handlePermissionApiError(error, '/permissions/health', 'GET');
      } catch (e) {
        customError = e;
      }

      if (isNetworkError(customError)) {
        return { 
          success: false, 
          error: 'Network connection failed. Please check your internet connection.' 
        };
      } else if (isApiError(customError)) {
        return { 
          success: false, 
          error: `API error: ${customError.getUserFriendlyMessage()}` 
        };
      } else if (isPermissionError(customError)) {
        return { 
          success: false, 
          error: `Permission error: ${customError.getUserFriendlyMessage()}` 
        };
      }
      return { 
        success: false, 
        error: 'Unknown error occurred while testing connection' 
      };
    }
  },

  /**
   * Get user-friendly error message from any error
   */
  getErrorMessage: (error: any): string => {
    if (isPermissionError(error)) {
      return error.getUserFriendlyMessage();
    } else if (isApiError(error)) {
      return error.getUserFriendlyMessage();
    } else if (isNetworkError(error)) {
      return error.getUserFriendlyMessage();
    } else if (isValidationError(error)) {
      return error.getUserFriendlyMessage();
    }
    return error.message || 'An unexpected error occurred';
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transform permission form data to API request
 */
export const transformPermissionFormToRequest = (
  formData: { 
    name: string;
    description: string;
    resource_type: string;
    action: string;
    scope: string;
    conditions?: string;
    is_active: boolean;
  }
): CreatePermissionRequest | UpdatePermissionRequest => {
  const request: any = {
    name: formData.name,
    description: formData.description,
    resource_type: formData.resource_type,
    action: formData.action,
    scope: formData.scope,
    is_active: formData.is_active,
  };

  // Parse conditions if provided
  if (formData.conditions) {
    try {
      request.conditions = JSON.parse(formData.conditions);
    } catch (error) {
      // Invalid JSON, skip conditions
      console.warn('Invalid JSON in conditions field:', error);
    }
  }

  return request;
};

/**
 * Transform permission to form data
 */
export const transformPermissionToForm = (
  permission: Permission
): {
  name: string;
  description: string;
  resource_type: string;
  action: string;
  scope: string;
  conditions?: string;
  is_active: boolean;
} => {
  return {
    name: permission.name,
    description: permission.description,
    resource_type: permission.resource_type,
    action: permission.action,
    scope: permission.scope,
    conditions: permission.conditions ? JSON.stringify(permission.conditions, null, 2) : undefined,
    is_active: permission.is_active,
  };
};

/**
 * Build query string from object
 */
export const buildQueryString = (params: Record<string, any>): string => {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value));
    }
  });
  
  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Download blob as file
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// ============================================================================
// Audit Trail API
// ============================================================================

/**
 * Get audit trail entries
 */
export const getAuditTrail = async (
  params: import('@/types/permissions').AuditTrailParams = {}
): Promise<import('@/types/permissions').AuditTrailResponse> => {
  try {
    const queryString = buildQueryString({
      page: params.page || 1,
      size: params.size || 50,
      action_type: params.action_type,
      entity_type: params.entity_type,
      user_id: params.user_id,
      target_user_id: params.target_user_id,
      start_date: params.start_date,
      end_date: params.end_date,
      search: params.search,
    });

    const response = await apiClient.get<any>(`/permissions/audit${queryString}`);
    return response;
  } catch (error) {
    return handlePermissionApiError(error, '/permissions/audit', 'GET');
  }
};

/**
 * Export audit trail to CSV
 */
export const exportAuditTrailToCSV = async (
  params: import('@/types/permissions').AuditTrailFilters = {}
): Promise<void> => {
  try {
    const queryString = buildQueryString({
      action_type: params.action_type,
      entity_type: params.entity_type,
      user_id: params.user_id,
      target_user_id: params.target_user_id,
      start_date: params.start_date,
      end_date: params.end_date,
      search: params.search,
    });

    // Get all entries (no pagination for export)
    const data = await apiClient.get<any>(`/permissions/audit${queryString}&size=10000`);

    // Convert to CSV
    const entries = data.items as import('@/types/permissions').PermissionAuditEntry[];
    
    if (entries.length === 0) {
      throw new ValidationError('No audit entries to export');
    }

    const headers = [
      'ID',
      'Timestamp',
      'Action',
      'Entity Type',
      'Performed By',
      'Target User',
      'Permission/Role',
      'Reason',
      'IP Address'
    ];

    const rows = entries.map(entry => [
      entry.id,
      new Date(entry.timestamp).toLocaleString(),
      entry.action,
      entry.entity_type,
      entry.user_name || entry.user_id || 'System',
      entry.target_user_name || entry.target_user_id || '-',
      entry.permission_name || entry.role_name || '-',
      entry.reason || '-',
      entry.ip_address || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    downloadBlob(blob, filename);
  } catch (error) {
    handlePermissionApiError(error, '/permissions/audit', 'GET');
  }
};

export default permissionsApi;
