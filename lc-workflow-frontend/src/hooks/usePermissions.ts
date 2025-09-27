"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

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

const API_BASE = '/api/permissions';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

// Permission API functions
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
    
    const response = await fetch(`${API_BASE}?${params}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch permissions');
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE}/${id}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch permission');
    return response.json();
  },

  create: async (data: {
    name: string;
    description: string;
    resource_type: string;
    action: string;
    scope: string;
    conditions?: Record<string, any>;
  }) => {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create permission');
    return response.json();
  },

  update: async (id: string, data: {
    name?: string;
    description?: string;
    is_active?: boolean;
    conditions?: Record<string, any>;
  }) => {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update permission');
    return response.json();
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete permission');
    return response.json();
  }
};

// Role API functions
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
    
    const response = await fetch(`${API_BASE}/roles?${params}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch roles');
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE}/roles/${id}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch role');
    return response.json();
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
    const response = await fetch(`${API_BASE}/roles`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create role');
    return response.json();
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
    const response = await fetch(`${API_BASE}/roles/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update role');
    return response.json();
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE}/roles/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete role');
    return response.json();
  },

  assignPermission: async (roleId: string, permissionId: string) => {
    const response = await fetch(`${API_BASE}/roles/${roleId}/permissions/${permissionId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to assign permission to role');
    return response.json();
  },

  revokePermission: async (roleId: string, permissionId: string) => {
    const response = await fetch(`${API_BASE}/roles/${roleId}/permissions/${permissionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to revoke permission from role');
    return response.json();
  }
};

// User permission API functions
const userPermissionApi = {
  getUserRoles: async (userId: string) => {
    const response = await fetch(`${API_BASE}/users/${userId}/roles`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch user roles');
    return response.json();
  },

  getUserPermissions: async (userId: string) => {
    const response = await fetch(`${API_BASE}/users/${userId}/permissions`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch user permissions');
    return response.json();
  },

  assignRole: async (userId: string, data: {
    role_id: string;
    department_id?: string;
    branch_id?: string;
    effective_until?: string;
  }) => {
    const response = await fetch(`${API_BASE}/users/${userId}/roles`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to assign role to user');
    return response.json();
  },

  revokeRole: async (userId: string, roleId: string) => {
    const response = await fetch(`${API_BASE}/users/${userId}/roles/${roleId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to revoke role from user');
    return response.json();
  },

  grantPermission: async (userId: string, data: {
    permission_id: string;
    resource_id?: string;
    department_id?: string;
    branch_id?: string;
    conditions?: Record<string, any>;
    reason?: string;
  }) => {
    const response = await fetch(`${API_BASE}/users/${userId}/permissions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to grant permission to user');
    return response.json();
  },

  revokePermission: async (userId: string, permissionId: string) => {
    const response = await fetch(`${API_BASE}/users/${userId}/permissions/${permissionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to revoke permission from user');
    return response.json();
  }
};

// Matrix and template API functions
const matrixApi = {
  getPermissionMatrix: async () => {
    const response = await fetch(`${API_BASE}/matrix`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch permission matrix');
    return response.json();
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
    
    const response = await fetch(`${API_BASE}/templates?${params}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch permission templates');
    return response.json();
  },

  create: async (data: {
    name: string;
    description: string;
    template_type: string;
    permissions: string[];
    default_conditions?: Record<string, any>;
  }) => {
    const response = await fetch(`${API_BASE}/templates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create permission template');
    return response.json();
  },

  apply: async (templateId: string, targetType: string, targetId: string) => {
    const response = await fetch(`${API_BASE}/templates/${templateId}/apply/${targetType}/${targetId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to apply permission template');
    return response.json();
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