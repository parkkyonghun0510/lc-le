"use client";

/**
 * Permission Management Hooks
 * 
 * Comprehensive React Query hooks for the admin permission management UI.
 * Provides CRUD operations with optimistic updates, error handling, and caching.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import type {
  Permission,
  Role,
  PermissionTemplate,
  RolePermissionMatrixResponse,
  AuditTrailResponse,
  ListPermissionsParams,
  ListPermissionsResponse,
  ListRolesParams,
  ListRolesResponse,
  ListTemplatesParams,
  ListTemplatesResponse,
  AuditTrailParams,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  CreateRoleRequest,
  UpdateRoleRequest,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateGenerationRequest,
  TemplateApplicationRequest,
  UserPermissionsResponse,
  RoleAssignmentCreate,
  UserPermissionCreate,
  BulkOperationRequest,
  BulkOperationResult,
  BulkRoleAssignment,
} from '@/types/permissions';

// ============================================================================
// Query Keys
// ============================================================================

export const permissionKeys = {
  all: ['permissions'] as const,
  lists: () => [...permissionKeys.all, 'list'] as const,
  list: (params: ListPermissionsParams) => [...permissionKeys.lists(), params] as const,
  details: () => [...permissionKeys.all, 'detail'] as const,
  detail: (id: string) => [...permissionKeys.details(), id] as const,
};

export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (params: ListRolesParams) => [...roleKeys.lists(), params] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (id: string) => [...roleKeys.details(), id] as const,
};

export const matrixKeys = {
  all: ['permission-matrix'] as const,
  role: () => [...matrixKeys.all, 'role'] as const,
};

export const templateKeys = {
  all: ['permission-templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (params: ListTemplatesParams) => [...templateKeys.lists(), params] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateKeys.details(), id] as const,
};

export const auditKeys = {
  all: ['permission-audit'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (params: AuditTrailParams) => [...auditKeys.lists(), params] as const,
};

export const userPermissionKeys = {
  all: ['user-permissions'] as const,
  user: (userId: string) => [...userPermissionKeys.all, userId] as const,
};

// ============================================================================
// API Functions
// ============================================================================

const permissionApi = {
  list: async (params: ListPermissionsParams = {}): Promise<ListPermissionsResponse> => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const query = searchParams.toString();
    return apiClient.get(`/permissions${query ? `?${query}` : ''}`);
  },

  get: async (id: string): Promise<Permission> => {
    return apiClient.get(`/permissions/${id}`);
  },

  create: async (data: CreatePermissionRequest): Promise<Permission> => {
    return apiClient.post('/permissions', data);
  },

  update: async (id: string, data: UpdatePermissionRequest): Promise<Permission> => {
    return apiClient.put(`/permissions/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/permissions/${id}`);
  },

  bulkOperation: async (data: BulkOperationRequest): Promise<BulkOperationResult> => {
    return apiClient.post('/permissions/bulk', data);
  },
};

const roleApi = {
  list: async (params: ListRolesParams = {}): Promise<ListRolesResponse> => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const query = searchParams.toString();
    return apiClient.get(`/permissions/roles${query ? `?${query}` : ''}`);
  },

  get: async (id: string): Promise<Role> => {
    return apiClient.get(`/permissions/roles/${id}`);
  },

  create: async (data: CreateRoleRequest): Promise<Role> => {
    return apiClient.post('/permissions/roles', data);
  },

  update: async (id: string, data: UpdateRoleRequest): Promise<Role> => {
    return apiClient.put(`/permissions/roles/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/permissions/roles/${id}`);
  },

  assignPermission: async (roleId: string, permissionId: string): Promise<void> => {
    return apiClient.post(`/permissions/roles/${roleId}/permissions/${permissionId}`, {});
  },

  revokePermission: async (roleId: string, permissionId: string): Promise<void> => {
    return apiClient.delete(`/permissions/roles/${roleId}/permissions/${permissionId}`);
  },

  bulkOperation: async (data: BulkOperationRequest): Promise<BulkOperationResult> => {
    return apiClient.post('/permissions/roles/bulk', data);
  },
};

const matrixApi = {
  getRoleMatrix: async (): Promise<RolePermissionMatrixResponse> => {
    return apiClient.get('/permissions/matrix');
  },
};

const templateApi = {
  list: async (params: ListTemplatesParams = {}): Promise<ListTemplatesResponse> => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const query = searchParams.toString();
    return apiClient.get(`/permissions/templates${query ? `?${query}` : ''}`);
  },

  get: async (id: string): Promise<PermissionTemplate> => {
    return apiClient.get(`/permissions/templates/${id}`);
  },

  create: async (data: CreateTemplateRequest): Promise<PermissionTemplate> => {
    return apiClient.post('/permissions/templates', data);
  },

  update: async (id: string, data: UpdateTemplateRequest): Promise<PermissionTemplate> => {
    return apiClient.put(`/permissions/templates/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/permissions/templates/${id}`);
  },

  generateFromRoles: async (data: TemplateGenerationRequest): Promise<PermissionTemplate> => {
    return apiClient.post('/permissions/templates/generate-from-roles', data);
  },

  apply: async (data: TemplateApplicationRequest): Promise<void> => {
    const { template_id, target_type, target_id } = data;
    return apiClient.post(`/permissions/templates/${template_id}/apply/${target_type}/${target_id}`, data);
  },
};

const auditApi = {
  list: async (params: AuditTrailParams = {}): Promise<AuditTrailResponse> => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const query = searchParams.toString();
    return apiClient.get(`/permissions/audit${query ? `?${query}` : ''}`);
  },
};

const userPermissionApi = {
  getUserPermissions: async (userId: string): Promise<UserPermissionsResponse> => {
    return apiClient.get(`/users/${userId}/permissions`);
  },

  assignRole: async (userId: string, data: RoleAssignmentCreate): Promise<void> => {
    return apiClient.post(`/users/${userId}/roles`, data);
  },

  revokeRole: async (userId: string, roleId: string): Promise<void> => {
    return apiClient.delete(`/users/${userId}/roles/${roleId}`);
  },

  grantPermission: async (userId: string, data: UserPermissionCreate): Promise<void> => {
    return apiClient.post(`/users/${userId}/permissions`, data);
  },

  revokePermission: async (userId: string, permissionId: string): Promise<void> => {
    return apiClient.delete(`/users/${userId}/permissions/${permissionId}`);
  },

  bulkAssignRoles: async (data: BulkRoleAssignment): Promise<BulkOperationResult> => {
    return apiClient.post('/users/bulk-assign-roles', data);
  },
};

// ============================================================================
// Permission Hooks
// ============================================================================

export function usePermissionList(params: ListPermissionsParams = {}) {
  return useQuery({
    queryKey: permissionKeys.list(params),
    queryFn: () => permissionApi.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePermissionDetail(id: string, options?: Omit<UseQueryOptions<Permission>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: permissionKeys.detail(id),
    queryFn: () => permissionApi.get(id),
    enabled: !!id,
    ...options,
  });
}

export function useCreatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: permissionApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.lists() });
      toast.success('Permission created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create permission');
    },
  });
}

export function useUpdatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePermissionRequest }) =>
      permissionApi.update(id, data),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: permissionKeys.detail(id) });
      const previous = queryClient.getQueryData(permissionKeys.detail(id));
      return { previous, id };
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: permissionKeys.detail(id) });
      toast.success('Permission updated successfully');
    },
    onError: (error: any, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(permissionKeys.detail(context.id), context.previous);
      }
      toast.error(error?.message || 'Failed to update permission');
    },
  });
}

export function useDeletePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: permissionApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: matrixKeys.all });
      toast.success('Permission deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete permission');
    },
  });
}

export function useBulkPermissionOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: permissionApi.bulkOperation,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.lists() });
      toast.success(`Bulk operation completed: ${result.success_count} succeeded, ${result.failure_count} failed`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Bulk operation failed');
    },
  });
}

// ============================================================================
// Role Hooks
// ============================================================================

export function useRoleList(params: ListRolesParams = {}) {
  return useQuery({
    queryKey: roleKeys.list(params),
    queryFn: () => roleApi.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useRoleDetail(id: string, options?: Omit<UseQueryOptions<Role>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: () => roleApi.get(id),
    enabled: !!id,
    ...options,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: roleApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: matrixKeys.all });
      toast.success('Role created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create role');
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleRequest }) =>
      roleApi.update(id, data),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: roleKeys.detail(id) });
      const previous = queryClient.getQueryData(roleKeys.detail(id));
      return { previous, id };
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: matrixKeys.all });
      toast.success('Role updated successfully');
    },
    onError: (error: any, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(roleKeys.detail(context.id), context.previous);
      }
      toast.error(error?.message || 'Failed to update role');
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: roleApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: matrixKeys.all });
      toast.success('Role deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete role');
    },
  });
}

export function useAssignPermissionToRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: string; permissionId: string }) =>
      roleApi.assignPermission(roleId, permissionId),
    onMutate: async ({ roleId, permissionId }) => {
      // Optimistic update for matrix
      await queryClient.cancelQueries({ queryKey: matrixKeys.role() });
      const previousMatrix = queryClient.getQueryData<RolePermissionMatrixResponse>(matrixKeys.role());
      
      if (previousMatrix) {
        const newMatrix = { ...previousMatrix };
        if (!newMatrix.assignments[roleId]) {
          newMatrix.assignments[roleId] = [];
        }
        if (!newMatrix.assignments[roleId].includes(permissionId)) {
          newMatrix.assignments[roleId] = [...newMatrix.assignments[roleId], permissionId];
        }
        queryClient.setQueryData(matrixKeys.role(), newMatrix);
      }

      return { previousMatrix, roleId, permissionId };
    },
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) });
      queryClient.invalidateQueries({ queryKey: matrixKeys.all });
    },
    onError: (error: any, _, context) => {
      if (context?.previousMatrix) {
        queryClient.setQueryData(matrixKeys.role(), context.previousMatrix);
      }
      toast.error(error?.message || 'Failed to assign permission');
    },
  });
}

export function useRevokePermissionFromRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: string; permissionId: string }) =>
      roleApi.revokePermission(roleId, permissionId),
    onMutate: async ({ roleId, permissionId }) => {
      // Optimistic update for matrix
      await queryClient.cancelQueries({ queryKey: matrixKeys.role() });
      const previousMatrix = queryClient.getQueryData<RolePermissionMatrixResponse>(matrixKeys.role());
      
      if (previousMatrix) {
        const newMatrix = { ...previousMatrix };
        if (newMatrix.assignments[roleId]) {
          newMatrix.assignments[roleId] = newMatrix.assignments[roleId].filter(id => id !== permissionId);
        }
        queryClient.setQueryData(matrixKeys.role(), newMatrix);
      }

      return { previousMatrix, roleId, permissionId };
    },
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) });
      queryClient.invalidateQueries({ queryKey: matrixKeys.all });
    },
    onError: (error: any, _, context) => {
      if (context?.previousMatrix) {
        queryClient.setQueryData(matrixKeys.role(), context.previousMatrix);
      }
      toast.error(error?.message || 'Failed to revoke permission');
    },
  });
}

export function useBulkRoleOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: roleApi.bulkOperation,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: matrixKeys.all });
      toast.success(`Bulk operation completed: ${result.success_count} succeeded, ${result.failure_count} failed`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Bulk operation failed');
    },
  });
}

// ============================================================================
// Permission Matrix Hooks
// ============================================================================

export function usePermissionMatrix() {
  return useQuery({
    queryKey: matrixKeys.role(),
    queryFn: matrixApi.getRoleMatrix,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ============================================================================
// Template Hooks
// ============================================================================

export function useTemplateList(params: ListTemplatesParams = {}) {
  return useQuery({
    queryKey: templateKeys.list(params),
    queryFn: () => templateApi.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTemplateDetail(id: string, options?: Omit<UseQueryOptions<PermissionTemplate>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => templateApi.get(id),
    enabled: !!id,
    ...options,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: templateApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      toast.success('Template created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create template');
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTemplateRequest }) =>
      templateApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(id) });
      toast.success('Template updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update template');
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: templateApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      toast.success('Template deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete template');
    },
  });
}

export function useGenerateTemplateFromRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: templateApi.generateFromRoles,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      toast.success('Template generated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to generate template');
    },
  });
}

export function useApplyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: templateApi.apply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userPermissionKeys.all });
      queryClient.invalidateQueries({ queryKey: matrixKeys.all });
      toast.success('Template applied successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to apply template');
    },
  });
}

// ============================================================================
// Audit Trail Hooks
// ============================================================================

export function useAuditTrail(params: AuditTrailParams = {}) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => auditApi.list(params),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// ============================================================================
// User Permission Hooks
// ============================================================================

export function useUserPermissions(userId: string) {
  return useQuery({
    queryKey: userPermissionKeys.user(userId),
    queryFn: () => userPermissionApi.getUserPermissions(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useAssignRoleToUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: RoleAssignmentCreate }) =>
      userPermissionApi.assignRole(userId, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userPermissionKeys.user(userId) });
      toast.success('Role assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to assign role');
    },
  });
}

export function useRevokeRoleFromUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      userPermissionApi.revokeRole(userId, roleId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userPermissionKeys.user(userId) });
      toast.success('Role revoked successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to revoke role');
    },
  });
}

export function useGrantPermissionToUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UserPermissionCreate }) =>
      userPermissionApi.grantPermission(userId, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userPermissionKeys.user(userId) });
      toast.success('Permission granted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to grant permission');
    },
  });
}

export function useRevokePermissionFromUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, permissionId }: { userId: string; permissionId: string }) =>
      userPermissionApi.revokePermission(userId, permissionId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userPermissionKeys.user(userId) });
      toast.success('Permission revoked successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to revoke permission');
    },
  });
}

export function useBulkAssignRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userPermissionApi.bulkAssignRoles,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: userPermissionKeys.all });
      toast.success(`Bulk assignment completed: ${result.success_count} succeeded, ${result.failure_count} failed`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Bulk assignment failed');
    },
  });
}
