"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlusIcon,
  ShieldCheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { showErrorToast, ErrorToasts } from '@/components/ui/ErrorToast';

interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  department?: {
    id: string;
    name: string;
  };
  branch?: {
    id: string;
    name: string;
  };
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  level: number;
  is_active: boolean;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  resource_type: string;
  action: string;
  scope: string;
}

interface UserRole {
  id: string;
  role: Role;
  department_id?: string;
  branch_id?: string;
  is_active: boolean;
  effective_from: string;
  effective_until?: string;
  assigned_by?: string;
}

interface UserPermission {
  id: string;
  permission: Permission;
  is_granted: boolean;
  resource_id?: string;
  department_id?: string;
  branch_id?: string;
  override_reason?: string;
  effective_until?: string;
  granted_by?: string;
}

interface UserPermissionAssignmentProps {
  userId: string;
  className?: string;
}

export default function UserPermissionAssignment({ userId, className = '' }: UserPermissionAssignmentProps) {
  const queryClient = useQueryClient();
  
  // State
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions'>('roles');
  const [isAssignRoleModalOpen, setIsAssignRoleModalOpen] = useState(false);
  const [isGrantPermissionModalOpen, setIsGrantPermissionModalOpen] = useState(false);
  
  // Accessibility: Screen reader announcements
  const [announcement, setAnnouncement] = useState('');

  // Fetch user data
  const { data: user } = useQuery<User>({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    }
  });

  // Fetch user roles
  const { data: userRoles, isLoading: rolesLoading } = useQuery<UserRole[]>({
    queryKey: ['user-roles', userId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/permissions/users/${userId}/roles`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch user roles');
      return response.json();
    }
  });

  // Fetch user permissions
  const { data: userPermissions, isLoading: permissionsLoading } = useQuery<UserPermission[]>({
    queryKey: ['user-permissions', userId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/permissions/users/${userId}/permissions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch user permissions');
      return response.json();
    }
  });

  // Fetch available roles
  const { data: availableRoles } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await fetch('/api/v1/permissions/roles?is_active=true', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch roles');
      return response.json();
    }
  });

  // Fetch available permissions
  const { data: availablePermissions } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await fetch('/api/v1/permissions?is_active=true', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch permissions');
      return response.json();
    }
  });

  // Revoke role mutation
  const revokeRoleMutation = useMutation({
    mutationFn: async ({ roleId, roleName }: { roleId: string; roleName: string }) => {
      const response = await fetch(`/api/v1/permissions/users/${userId}/roles/${roleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error(errorData.detail || 'Failed to revoke role');
        error.status = response.status;
        error.response = { status: response.status, data: errorData };
        throw error;
      }
      return { roleName };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
      setAnnouncement(`Role ${data.roleName} revoked from user`);
      toast.success(`Role "${data.roleName}" revoked successfully`, { duration: 3000 });
    },
    onError: (error: any, variables) => {
      const status = error?.status || error?.response?.status;
      
      if (status === 403) {
        showErrorToast(
          'Permission denied',
          {
            context: 'You don\'t have permission to revoke roles from this user.',
            suggestions: [
              'Contact your administrator for access',
              'Verify your role has user management rights'
            ]
          }
        );
      } else if (status === 404) {
        showErrorToast(
          'Role assignment not found',
          {
            context: 'The role assignment no longer exists.',
            suggestions: [
              'Refresh the page to reload the data',
              'The role may have already been revoked'
            ]
          }
        );
      } else if (status === 500 || status >= 500) {
        ErrorToasts.serverError();
      } else if (!status) {
        ErrorToasts.networkError();
      } else {
        showErrorToast('Failed to revoke role', {
          context: error.message || 'An unexpected error occurred'
        });
      }
    }
  });

  // Revoke permission mutation
  const revokePermissionMutation = useMutation({
    mutationFn: async ({ permissionId, permissionName }: { permissionId: string; permissionName: string }) => {
      const response = await fetch(`/api/v1/permissions/users/${userId}/permissions/${permissionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error(errorData.detail || 'Failed to revoke permission');
        error.status = response.status;
        error.response = { status: response.status, data: errorData };
        throw error;
      }
      return { permissionName };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
      setAnnouncement(`Permission ${data.permissionName} revoked from user`);
      toast.success(`Permission "${data.permissionName}" removed successfully`, { duration: 3000 });
    },
    onError: (error: any, variables) => {
      const status = error?.status || error?.response?.status;
      
      if (status === 403) {
        showErrorToast(
          'Permission denied',
          {
            context: 'You don\'t have permission to modify this user\'s permissions.',
            suggestions: [
              'Contact your administrator for access',
              'Verify your role has user management rights'
            ]
          }
        );
      } else if (status === 404) {
        showErrorToast(
          'Permission override not found',
          {
            context: 'The permission override no longer exists.',
            suggestions: [
              'Refresh the page to reload the data',
              'The permission may have already been removed'
            ]
          }
        );
      } else if (status === 500 || status >= 500) {
        ErrorToasts.serverError();
      } else if (!status) {
        ErrorToasts.networkError();
      } else {
        showErrorToast('Failed to remove permission', {
          context: error.message || 'An unexpected error occurred'
        });
      }
    }
  });

  const handleRevokeRole = (roleId: string, roleName: string) => {
    if (window.confirm(`Are you sure you want to revoke the "${roleName}" role from this user?`)) {
      revokeRoleMutation.mutate({ roleId, roleName });
    }
  };

  const handleRevokePermission = (permissionId: string, permissionName: string) => {
    if (window.confirm(`Are you sure you want to revoke the "${permissionName}" permission from this user?`)) {
      revokePermissionMutation.mutate({ permissionId, permissionName });
    }
  };

  const isLoading = rolesLoading || permissionsLoading;

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`} role="region" aria-label="User Permission Assignment">
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              Permission Assignment
            </h2>
            {user && (
              <p className="mt-1 text-sm text-gray-500">
                Manage roles and permissions for {user.first_name} {user.last_name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200" role="tablist" aria-label="Permission assignment tabs">
        <nav className="-mb-px flex">
          <button
            role="tab"
            aria-selected={activeTab === 'roles'}
            aria-controls="roles-panel"
            id="roles-tab"
            onClick={() => setActiveTab('roles')}
            className={`py-2 px-4 border-b-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${
              activeTab === 'roles'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Roles ({userRoles?.length || 0})
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'permissions'}
            aria-controls="permissions-panel"
            id="permissions-tab"
            onClick={() => setActiveTab('permissions')}
            className={`py-2 px-4 border-b-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${
              activeTab === 'permissions'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Direct Permissions ({userPermissions?.length || 0})
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'roles' && (
          <div role="tabpanel" id="roles-panel" aria-labelledby="roles-tab">
            {/* Add Role Button */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-gray-900">Assigned Roles</h3>
              <button
                onClick={() => setIsAssignRoleModalOpen(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                aria-label="Assign new role to user"
              >
                <PlusIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                Assign Role
              </button>
            </div>

            {/* Roles List */}
            {userRoles && userRoles.length > 0 ? (
              <div className="space-y-3" role="list" aria-label="Assigned roles">
                {userRoles.map((userRole) => (
                  <div key={userRole.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg" role="listitem">
                    <div className="flex items-center space-x-3">
                      <ShieldCheckIcon className="h-8 w-8 text-indigo-500" aria-hidden="true" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {userRole.role.display_name}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-gray-500" aria-label={`Level ${userRole.role.level}${userRole.department_id ? ', Department scope' : ''}${userRole.branch_id ? ', Branch scope' : ''}${userRole.effective_until ? `, Expires ${new Date(userRole.effective_until).toLocaleDateString()}` : ''}`}>
                          <span>Level {userRole.role.level}</span>
                          {userRole.department_id && <span aria-hidden="true">• Department scope</span>}
                          {userRole.branch_id && <span aria-hidden="true">• Branch scope</span>}
                          {userRole.effective_until && (
                            <span aria-hidden="true">• Expires {new Date(userRole.effective_until).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      {userRole.is_active ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" aria-label="Active role" />
                      ) : (
                        <ExclamationCircleIcon className="h-5 w-5 text-yellow-500" aria-label="Inactive role" />
                      )}
                    </div>
                    <button
                      onClick={() => handleRevokeRole(userRole.role.id, userRole.role.display_name)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Revoke ${userRole.role.display_name} role`}
                      title={revokeRoleMutation.isPending ? "Revoking..." : "Revoke role"}
                      disabled={revokeRoleMutation.isPending}
                    >
                      {revokeRoleMutation.isPending ? (
                        <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" aria-hidden="true" />
                      ) : (
                        <TrashIcon className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500" role="status">
                <UserPlusIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" aria-hidden="true" />
                <p>No roles assigned</p>
                <p className="text-sm">Click "Assign Role" to add a role to this user</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'permissions' && (
          <div role="tabpanel" id="permissions-panel" aria-labelledby="permissions-tab">
            {/* Add Permission Button */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-gray-900">Direct Permissions</h3>
              <button
                onClick={() => setIsGrantPermissionModalOpen(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                aria-label="Grant new permission to user"
              >
                <PlusIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                Grant Permission
              </button>
            </div>

            {/* Permissions List */}
            {userPermissions && userPermissions.length > 0 ? (
              <div className="space-y-3" role="list" aria-label="Direct permissions">
                {userPermissions.map((userPermission) => (
                  <div key={userPermission.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg" role="listitem">
                    <div className="flex items-center space-x-3">
                      <ShieldCheckIcon 
                        className={`h-8 w-8 ${
                          userPermission.is_granted ? 'text-green-500' : 'text-red-500'
                        }`}
                        aria-hidden="true"
                      />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {userPermission.permission.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {userPermission.permission.description}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1" aria-label={`${userPermission.permission.resource_type} ${userPermission.permission.action}, ${userPermission.permission.scope} scope${userPermission.override_reason ? `, ${userPermission.override_reason}` : ''}`}>
                          <span>{userPermission.permission.resource_type}:{userPermission.permission.action}</span>
                          <span aria-hidden="true">• {userPermission.permission.scope}</span>
                          {userPermission.override_reason && (
                            <span aria-hidden="true">• {userPermission.override_reason}</span>
                          )}
                        </div>
                      </div>
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          userPermission.is_granted
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                        aria-label={userPermission.is_granted ? 'Permission granted' : 'Permission denied'}
                      >
                        {userPermission.is_granted ? 'Granted' : 'Denied'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRevokePermission(userPermission.permission.id, userPermission.permission.name)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Remove ${userPermission.permission.name} permission override`}
                      title={revokePermissionMutation.isPending ? "Removing..." : "Remove permission override"}
                      disabled={revokePermissionMutation.isPending}
                    >
                      {revokePermissionMutation.isPending ? (
                        <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" aria-hidden="true" />
                      ) : (
                        <TrashIcon className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500" role="status">
                <ShieldCheckIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" aria-hidden="true" />
                <p>No direct permissions assigned</p>
                <p className="text-sm">Click "Grant Permission" to add specific permissions to this user</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assign Role Modal */}
      {isAssignRoleModalOpen && (
        <AssignRoleModal
          userId={userId}
          availableRoles={availableRoles || []}
          assignedRoleIds={userRoles?.map(ur => ur.role.id) || []}
          isOpen={isAssignRoleModalOpen}
          onClose={() => setIsAssignRoleModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
            setIsAssignRoleModalOpen(false);
          }}
        />
      )}

      {/* Grant Permission Modal */}
      {isGrantPermissionModalOpen && (
        <GrantPermissionModal
          userId={userId}
          availablePermissions={availablePermissions || []}
          grantedPermissionIds={userPermissions?.map(up => up.permission.id) || []}
          isOpen={isGrantPermissionModalOpen}
          onClose={() => setIsGrantPermissionModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
            setIsGrantPermissionModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

// Assign Role Modal Component
interface AssignRoleModalProps {
  userId: string;
  availableRoles: Role[];
  assignedRoleIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AssignRoleModal = React.memo(({ userId, availableRoles, assignedRoleIds, isOpen, onClose, onSuccess }: AssignRoleModalProps) => {
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [effectiveUntil, setEffectiveUntil] = useState('');

  const assignRoleMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/v1/permissions/users/${userId}/roles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error(errorData.detail || 'Failed to assign role');
        error.status = response.status;
        error.response = { status: response.status, data: errorData };
        throw error;
      }
      return response.json();
    },
    onSuccess: (data) => {
      onSuccess();
      toast.success('Role assigned successfully', { duration: 3000 });
    },
    onError: (error: any) => {
      const status = error?.status || error?.response?.status;
      
      if (status === 403) {
        showErrorToast(
          'Permission denied',
          {
            context: 'You don\'t have permission to assign roles to this user.',
            suggestions: [
              'Contact your administrator for access',
              'Verify your role has user management rights'
            ]
          }
        );
      } else if (status === 409) {
        showErrorToast(
          'Role already assigned',
          {
            context: 'This role is already assigned to the user.',
            suggestions: ['Choose a different role', 'Refresh the page to see current assignments']
          }
        );
      } else if (status === 422) {
        showErrorToast(
          'Invalid data',
          {
            context: error.message || 'Please check your input and try again.',
            suggestions: ['Ensure all required fields are filled', 'Check that the date format is correct']
          }
        );
      } else if (status === 500 || status >= 500) {
        ErrorToasts.serverError();
      } else if (!status) {
        ErrorToasts.networkError();
      } else {
        showErrorToast('Failed to assign role', {
          context: error.message || 'An unexpected error occurred'
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    assignRoleMutation.mutate({
      role_id: selectedRoleId,
      department_id: departmentId || null,
      branch_id: branchId || null,
      effective_until: effectiveUntil || null
    });
  };
  
  // Handle Escape key to close modal
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const unassignedRoles = availableRoles.filter(role => !assignedRoleIds.includes(role.id));

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-role-title"
    >
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 id="assign-role-title" className="text-lg font-medium text-gray-900 mb-4">
            Assign Role to User
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4" aria-label="Assign role form">
            <div>
              <label htmlFor="role-select" className="block text-sm font-medium text-gray-700">
                Role <span className="text-red-500" aria-label="required">*</span>
              </label>
              <select
                id="role-select"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
                aria-required="true"
                aria-describedby="role-select-description"
              >
                <option value="">Select a role</option>
                {unassignedRoles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.display_name} (Level {role.level})
                  </option>
                ))}
              </select>
              <span id="role-select-description" className="sr-only">
                Select a role to assign to the user
              </span>
            </div>

            <div>
              <label htmlFor="effective-until" className="block text-sm font-medium text-gray-700">
                Effective Until (Optional)
              </label>
              <input
                id="effective-until"
                type="date"
                value={effectiveUntil}
                onChange={(e) => setEffectiveUntil(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                aria-describedby="effective-until-description"
              />
              <span id="effective-until-description" className="sr-only">
                Optionally set an expiration date for this role assignment
              </span>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                aria-label="Cancel and close form"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={assignRoleMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                aria-label={assignRoleMutation.isPending ? 'Assigning role' : 'Assign role to user'}
                aria-disabled={assignRoleMutation.isPending}
              >
                {assignRoleMutation.isPending ? 'Assigning...' : 'Assign Role'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

AssignRoleModal.displayName = 'AssignRoleModal';

// Grant Permission Modal Component
interface GrantPermissionModalProps {
  userId: string;
  availablePermissions: Permission[];
  grantedPermissionIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const GrantPermissionModal = React.memo(({ userId, availablePermissions, grantedPermissionIds, isOpen, onClose, onSuccess }: GrantPermissionModalProps) => {
  const [selectedPermissionId, setSelectedPermissionId] = useState('');
  const [isGranted, setIsGranted] = useState(true);
  const [reason, setReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const grantPermissionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/v1/permissions/users/${userId}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error(errorData.detail || 'Failed to grant permission');
        error.status = response.status;
        error.response = { status: response.status, data: errorData };
        throw error;
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      onSuccess();
      const action = variables.is_granted ? 'granted' : 'denied';
      toast.success(`Permission ${action} successfully`, { duration: 3000 });
    },
    onError: (error: any) => {
      const status = error?.status || error?.response?.status;
      
      if (status === 403) {
        showErrorToast(
          'Permission denied',
          {
            context: 'You don\'t have permission to modify this user\'s permissions.',
            suggestions: [
              'Contact your administrator for access',
              'Verify your role has user management rights'
            ]
          }
        );
      } else if (status === 409) {
        showErrorToast(
          'Permission override already exists',
          {
            context: 'This permission override is already set for the user.',
            suggestions: ['Choose a different permission', 'Refresh the page to see current overrides']
          }
        );
      } else if (status === 422) {
        showErrorToast(
          'Invalid data',
          {
            context: error.message || 'Please check your input and try again.',
            suggestions: ['Ensure all required fields are filled', 'Provide a reason for the override']
          }
        );
      } else if (status === 500 || status >= 500) {
        ErrorToasts.serverError();
      } else if (!status) {
        ErrorToasts.networkError();
      } else {
        showErrorToast('Failed to grant permission', {
          context: error.message || 'An unexpected error occurred'
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    grantPermissionMutation.mutate({
      permission_id: selectedPermissionId,
      is_granted: isGranted,
      reason: reason || null
    });
  };
  
  // Handle Escape key to close modal
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const filteredPermissions = availablePermissions.filter(permission =>
    permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grant-permission-title"
    >
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 id="grant-permission-title" className="text-lg font-medium text-gray-900 mb-4">
            Grant Permission to User
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4" aria-label="Grant permission form">
            <div>
              <label htmlFor="permission-search" className="block text-sm font-medium text-gray-700">
                Search Permissions
              </label>
              <div className="relative mt-1">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" aria-hidden="true" />
                <input
                  id="permission-search"
                  type="text"
                  placeholder="Search permissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full"
                  aria-describedby="permission-search-description"
                />
                <span id="permission-search-description" className="sr-only">
                  Filter permissions by name or description
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="permission-select" className="block text-sm font-medium text-gray-700">
                Permission <span className="text-red-500" aria-label="required">*</span>
              </label>
              <select
                id="permission-select"
                value={selectedPermissionId}
                onChange={(e) => setSelectedPermissionId(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 max-h-40 overflow-y-auto"
                required
                aria-required="true"
                aria-describedby="permission-select-description"
                size={Math.min(filteredPermissions.length + 1, 6)}
              >
                <option value="">Select a permission</option>
                {filteredPermissions.map(permission => (
                  <option key={permission.id} value={permission.id}>
                    {permission.name} ({permission.resource_type}:{permission.action})
                  </option>
                ))}
              </select>
              <span id="permission-select-description" className="sr-only">
                Select a permission to grant or deny to the user
              </span>
            </div>

            <div>
              <fieldset>
                <legend className="block text-sm font-medium text-gray-700">
                  Grant Type <span className="text-red-500" aria-label="required">*</span>
                </legend>
                <div className="mt-1 space-y-2" role="radiogroup" aria-describedby="grant-type-description">
                  <label className="flex items-center">
                    <input
                      id="grant-permission"
                      type="radio"
                      name="grant-type"
                      checked={isGranted}
                      onChange={() => setIsGranted(true)}
                      className="h-4 w-4 text-indigo-600 focus:ring-2 focus:ring-indigo-500 border-gray-300"
                      aria-describedby="grant-permission-description"
                    />
                    <span className="ml-2 text-sm text-gray-700">Grant permission</span>
                    <span id="grant-permission-description" className="sr-only">
                      Allow the user to perform this action
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      id="deny-permission"
                      type="radio"
                      name="grant-type"
                      checked={!isGranted}
                      onChange={() => setIsGranted(false)}
                      className="h-4 w-4 text-indigo-600 focus:ring-2 focus:ring-indigo-500 border-gray-300"
                      aria-describedby="deny-permission-description"
                    />
                    <span className="ml-2 text-sm text-gray-700">Explicitly deny permission</span>
                    <span id="deny-permission-description" className="sr-only">
                      Prevent the user from performing this action, overriding role permissions
                    </span>
                  </label>
                </div>
                <span id="grant-type-description" className="sr-only">
                  Choose whether to grant or deny this permission
                </span>
              </fieldset>
            </div>

            <div>
              <label htmlFor="permission-reason" className="block text-sm font-medium text-gray-700">
                Reason (Optional)
              </label>
              <textarea
                id="permission-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Explain why this permission override is necessary"
                aria-describedby="permission-reason-description"
              />
              <span id="permission-reason-description" className="sr-only">
                Optionally provide a reason for this permission override
              </span>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                aria-label="Cancel and close form"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={grantPermissionMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                aria-label={grantPermissionMutation.isPending ? 'Processing permission' : `${isGranted ? 'Grant' : 'Deny'} permission to user`}
                aria-disabled={grantPermissionMutation.isPending}
              >
                {grantPermissionMutation.isPending ? 'Processing...' : (isGranted ? 'Grant' : 'Deny') + ' Permission'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

GrantPermissionModal.displayName = 'GrantPermissionModal';