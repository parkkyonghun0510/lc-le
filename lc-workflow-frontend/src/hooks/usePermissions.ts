"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { handleApiError } from '@/lib/handleApiError';

// ==================== TYPES ====================

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource_type: string;
  action: string;
  scope: string;
  is_active: boolean;
  is_system_permission: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  level: number;
  is_active: boolean;
  is_system_role: boolean;
  is_default: boolean;
  parent_role_id?: string;
  permission_count: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: Role;
  department_id?: string;
  branch_id?: string;
  is_active: boolean;
  effective_from: string;
  effective_until?: string;
  assigned_by?: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission: Permission;
  is_granted: boolean;
  resource_id?: string;
  department_id?: string;
  branch_id?: string;
  conditions?: Record<string, any>;
  override_reason?: string;
  is_active: boolean;
  effective_from: string;
  effective_until?: string;
  granted_by?: string;
}

export interface PermissionMatrix {
  roles: Role[];
  permissions: Permission[];
  matrix: Record<string, Record<string, boolean>>;
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  template_type: string;
  permissions: string[];
  default_conditions?: Record<string, any>;
  is_system_template: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// ==================== API FUNCTIONS ====================

// Updated to use centralized apiClient for consistent error handling and authentication

// Permission API functions using centralized apiClient for consistent error handling
const permissionApi = {
  getAll: async (filters: {
    resource_type?: string;
    action?: string;
    scope?: string;
    is_active?: boolean;
    skip?: number;
    limit?: number;
  } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const url = queryString ? `/permissions?${queryString}` : '/permissions';
    return await apiClient.get<Permission[]>(url);
  },

  getById: async (id: string) => {
    return await apiClient.get<Permission>(`/permissions/${id}`);
  },

  create: async (data: {
    name: string;
    description: string;
    resource_type: string;
    action: string;
    scope: string;
    conditions?: Record<string, any>;
  }) => {
    return await apiClient.post<Permission>('/permissions', data);
  },

  update: async (id: string, data: {
    name?: string;
    description?: string;
    is_active?: boolean;
    conditions?: Record<string, any>;
  }) => {
    return await apiClient.put<Permission>(`/permissions/${id}`, data);
  },

  delete: async (id: string) => {
    return await apiClient.delete<Permission>(`/permissions/${id}`);
  }
};

// Role API functions using centralized apiClient for consistent error handling
const roleApi = {
  getAll: async (filters: {
    is_active?: boolean;
    level?: number;
    skip?: number;
    limit?: number;
  } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const url = queryString ? `/permissions/roles?${queryString}` : '/permissions/roles';
    return await apiClient.get<Role[]>(url);
  },

  getById: async (id: string) => {
    return await apiClient.get<Role>(`/permissions/roles/${id}`);
  },

  create: async (data: {
    name: string;
    display_name: string;
    description: string;
    level: number;
    parent_role_id?: string;
    department_restricted?: boolean;
    branch_restricted?: boolean;
    allowed_departments?: string[];
    allowed_branches?: string[];
  }) => {
    return await apiClient.post<Role>('/permissions/roles', data);
  },

  update: async (id: string, data: {
    display_name?: string;
    description?: string;
    level?: number;
    is_active?: boolean;
    department_restricted?: boolean;
    branch_restricted?: boolean;
    allowed_departments?: string[];
    allowed_branches?: string[];
  }) => {
    return await apiClient.put<Role>(`/permissions/roles/${id}`, data);
  },

  delete: async (id: string) => {
    return await apiClient.delete<Role>(`/permissions/roles/${id}`);
  },

  assignPermission: async (roleId: string, permissionId: string) => {
    return await apiClient.post(`/permissions/roles/${roleId}/permissions/${permissionId}`);
  },

  revokePermission: async (roleId: string, permissionId: string) => {
    return await apiClient.delete(`/permissions/roles/${roleId}/permissions/${permissionId}`);
  }
};

// User permission API functions using centralized apiClient for consistent error handling
const userPermissionApi = {
  getUserRoles: async (userId: string) => {
    return await apiClient.get<UserRole[]>(`/permissions/users/${userId}/roles`);
  },

  getUserPermissions: async (userId: string) => {
    return await apiClient.get<UserPermission[]>(`/permissions/users/${userId}/permissions`);
  },

  assignRole: async (userId: string, data: {
    role_id: string;
    department_id?: string;
    branch_id?: string;
    effective_until?: string;
  }) => {
    return await apiClient.post<UserRole>(`/permissions/users/${userId}/roles`, data);
  },

  revokeRole: async (userId: string, roleId: string) => {
    return await apiClient.delete(`/permissions/users/${userId}/roles/${roleId}`);
  },

  grantPermission: async (userId: string, data: {
    permission_id: string;
    resource_id?: string;
    department_id?: string;
    branch_id?: string;
    conditions?: Record<string, any>;
    reason?: string;
  }) => {
    return await apiClient.post<UserPermission>(`/permissions/users/${userId}/permissions`, data);
  },

  revokePermission: async (userId: string, permissionId: string) => {
    return await apiClient.delete(`/permissions/users/${userId}/permissions/${permissionId}`);
  }
};

// Matrix and template API functions using centralized apiClient for consistent error handling
const matrixApi = {
  getPermissionMatrix: async () => {
    return await apiClient.get<PermissionMatrix>('/permissions/matrix');
  }
};

const templateApi = {
  getAll: async (filters: {
    template_type?: string;
    skip?: number;
    limit?: number;
  } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const url = queryString ? `/permissions/templates?${queryString}` : '/permissions/templates';
    return await apiClient.get<PermissionTemplate[]>(url);
  },

  create: async (data: {
    name: string;
    description: string;
    template_type: string;
    permissions: string[];
    default_conditions?: Record<string, any>;
  }) => {
    return await apiClient.post<PermissionTemplate>('/permissions/templates', data);
  },

  apply: async (templateId: string, targetType: string, targetId: string) => {
    return await apiClient.post(`/permissions/templates/${templateId}/apply/${targetType}/${targetId}`);
  },

  generateFromRoles: async (data: {
    source_role_ids: string[];
    template_name: string;
    template_description: string;
    include_inactive_roles?: boolean;
  }) => {
    return await apiClient.post<PermissionTemplate>('/permissions/templates/generate-from-roles', data);
  },

  getSuggestions: async (data: {
    analysis_type: 'pattern' | 'usage' | 'similarity';
    role_limit?: number;
    min_permission_count?: number;
  }) => {
    return await apiClient.post<PermissionTemplate[]>('/permissions/templates/suggestions', data);
  },

  bulkGenerate: async (data: {
    generation_configs: Array<{
      source_role_ids: string[];
      template_name: string;
      template_description: string;
      include_inactive_roles?: boolean;
    }>;
  }) => {
    return await apiClient.post<PermissionTemplate[]>('/permissions/templates/bulk-generate', data);
  },

  previewGeneration: async (data: {
    source_role_ids: string[];
    include_inactive_roles?: boolean;
    preview_type: 'summary' | 'detailed' | 'comparison';
  }) => {
    return await apiClient.post('/permissions/templates/preview', data);
  }
};

// ==================== HOOKS ====================

// Permission hooks
export const usePermissions = (filters: Parameters<typeof permissionApi.getAll>[0] = {}) => {
  return useQuery<Permission[]>({
    queryKey: ['permissions', filters],
    queryFn: () => permissionApi.getAll(filters)
  });
};

export const usePermission = (id: string) => {
  return useQuery<Permission>({
    queryKey: ['permission', id],
    queryFn: () => permissionApi.getById(id),
    enabled: !!id
  });
};

export const useCreatePermission = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: permissionApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    }
  });
};

export const useUpdatePermission = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...data }: Parameters<typeof permissionApi.update>[1] & { id: string }) =>
      permissionApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permission', variables.id] });
    }
  });
};

export const useDeletePermission = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: permissionApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    }
  });
};

// Role hooks
export const useRoles = (filters: Parameters<typeof roleApi.getAll>[0] = {}) => {
  return useQuery<Role[]>({
    queryKey: ['roles', filters],
    queryFn: () => roleApi.getAll(filters)
  });
};

export const useRole = (id: string) => {
  return useQuery<Role>({
    queryKey: ['role', id],
    queryFn: () => roleApi.getById(id),
    enabled: !!id
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: roleApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    }
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...data }: Parameters<typeof roleApi.update>[1] & { id: string }) =>
      roleApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role', variables.id] });
    }
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: roleApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    }
  });
};

export const useAssignPermissionToRole = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: string; permissionId: string }) =>
      roleApi.assignPermission(roleId, permissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permission-matrix'] });
    }
  });
};

export const useRevokePermissionFromRole = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: string; permissionId: string }) =>
      roleApi.revokePermission(roleId, permissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permission-matrix'] });
    }
  });
};

// User permission hooks
export const useUserRoles = (userId: string) => {
  return useQuery<UserRole[]>({
    queryKey: ['user-roles', userId],
    queryFn: () => userPermissionApi.getUserRoles(userId),
    enabled: !!userId
  });
};

export const useUserPermissions = (userId: string) => {
  return useQuery<UserPermission[]>({
    queryKey: ['user-permissions', userId],
    queryFn: () => userPermissionApi.getUserPermissions(userId),
    enabled: !!userId
  });
};

export const useAssignRoleToUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, ...data }: Parameters<typeof userPermissionApi.assignRole>[1] & { userId: string }) =>
      userPermissionApi.assignRole(userId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId] });
    }
  });
};

export const useRevokeRoleFromUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      userPermissionApi.revokeRole(userId, roleId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId] });
    }
  });
};

export const useGrantPermissionToUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, ...data }: Parameters<typeof userPermissionApi.grantPermission>[1] & { userId: string }) =>
      userPermissionApi.grantPermission(userId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', variables.userId] });
    }
  });
};

export const useRevokePermissionFromUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, permissionId }: { userId: string; permissionId: string }) =>
      userPermissionApi.revokePermission(userId, permissionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', variables.userId] });
    }
  });
};

// Matrix and template hooks
export const usePermissionMatrix = () => {
  return useQuery<PermissionMatrix>({
    queryKey: ['permission-matrix'],
    queryFn: matrixApi.getPermissionMatrix
  });
};

export const usePermissionTemplates = (filters: Parameters<typeof templateApi.getAll>[0] = {}) => {
  return useQuery<PermissionTemplate[]>({
    queryKey: ['permission-templates', filters],
    queryFn: () => templateApi.getAll(filters)
  });
};

export const useCreatePermissionTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: templateApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-templates'] });
    }
  });
};

export const useUpdatePermissionTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; template_type?: string; permissions?: string[]; is_active?: boolean }) =>
      apiClient.put<PermissionTemplate>(`/permissions/templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-templates'] });
    }
  });
};

export const useDeletePermissionTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/permissions/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-templates'] });
    }
  });
};

export const useApplyPermissionTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, targetType, targetId }: { templateId: string; targetType: string; targetId: string }) =>
      templateApi.apply(templateId, targetType, targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
    }
  });
};

export const useGenerateTemplateFromRoles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: templateApi.generateFromRoles,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-templates'] });
    }
  });
};

export const useTemplateSuggestions = () => {
  return useQuery({
    queryKey: ['template-suggestions'],
    queryFn: () => templateApi.getSuggestions({
      analysis_type: 'pattern',
      role_limit: 10
    }),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
};

export const useBulkGenerateTemplates = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: templateApi.bulkGenerate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-templates'] });
    }
  });
};

export const usePreviewTemplateGeneration = () => {
  return useMutation({
    mutationFn: templateApi.previewGeneration
  });
};

// ==================== UTILITY HOOKS ====================

export const usePermissionFilters = () => {
  const [filters, setFilters] = useState({
    resource_type: '',
    action: '',
    scope: '',
    is_active: true,
    search: ''
  });

  const updateFilter = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      resource_type: '',
      action: '',
      scope: '',
      is_active: true,
      search: ''
    });
  };

  return {
    filters,
    updateFilter,
    resetFilters
  };
};

export const useRoleFilters = () => {
  const [filters, setFilters] = useState({
    is_active: true,
    level: undefined as number | undefined,
    search: ''
  });

  const updateFilter = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      is_active: true,
      level: undefined,
      search: ''
    });
  };

  return {
    filters,
    updateFilter,
    resetFilters
  };
};