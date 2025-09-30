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
    mutationFn: async (roleId: string) => {
      const response = await fetch(`/api/v1/permissions/users/${userId}/roles/${roleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      if (!response.ok) throw new Error('Failed to revoke role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
    }
  });

  // Revoke permission mutation
  const revokePermissionMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      const response = await fetch(`/api/v1/permissions/users/${userId}/permissions/${permissionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      if (!response.ok) throw new Error('Failed to revoke permission');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
    }
  });

  const handleRevokeRole = (roleId: string, roleName: string) => {
    if (window.confirm(`Are you sure you want to revoke the "${roleName}" role from this user?`)) {
      revokeRoleMutation.mutate(roleId);
    }
  };

  const handleRevokePermission = (permissionId: string, permissionName: string) => {
    if (window.confirm(`Are you sure you want to revoke the "${permissionName}" permission from this user?`)) {
      revokePermissionMutation.mutate(permissionId);
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
    <div className={`bg-white rounded-lg shadow ${className}`}>
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
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          <button
            onClick={() => setActiveTab('roles')}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'roles'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Roles ({userRoles?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
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
          <div>
            {/* Add Role Button */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-gray-900">Assigned Roles</h3>
              <button
                onClick={() => setIsAssignRoleModalOpen(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Assign Role
              </button>
            </div>

            {/* Roles List */}
            {userRoles && userRoles.length > 0 ? (
              <div className="space-y-3">
                {userRoles.map((userRole) => (
                  <div key={userRole.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <ShieldCheckIcon className="h-8 w-8 text-indigo-500" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {userRole.role.display_name}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>Level {userRole.role.level}</span>
                          {userRole.department_id && <span>• Department scope</span>}
                          {userRole.branch_id && <span>• Branch scope</span>}
                          {userRole.effective_until && (
                            <span>• Expires {new Date(userRole.effective_until).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      {userRole.is_active ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <ExclamationCircleIcon className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                    <button
                      onClick={() => handleRevokeRole(userRole.role.id, userRole.role.display_name)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Revoke role"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <UserPlusIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No roles assigned</p>
                <p className="text-sm">Click "Assign Role" to add a role to this user</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'permissions' && (
          <div>
            {/* Add Permission Button */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-gray-900">Direct Permissions</h3>
              <button
                onClick={() => setIsGrantPermissionModalOpen(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Grant Permission
              </button>
            </div>

            {/* Permissions List */}
            {userPermissions && userPermissions.length > 0 ? (
              <div className="space-y-3">
                {userPermissions.map((userPermission) => (
                  <div key={userPermission.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <ShieldCheckIcon className={`h-8 w-8 ${
                        userPermission.is_granted ? 'text-green-500' : 'text-red-500'
                      }`} />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {userPermission.permission.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {userPermission.permission.description}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                          <span>{userPermission.permission.resource_type}:{userPermission.permission.action}</span>
                          <span>• {userPermission.permission.scope}</span>
                          {userPermission.override_reason && (
                            <span>• {userPermission.override_reason}</span>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        userPermission.is_granted
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {userPermission.is_granted ? 'Granted' : 'Denied'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRevokePermission(userPermission.permission.id, userPermission.permission.name)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Remove permission override"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <ShieldCheckIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
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

function AssignRoleModal({ userId, availableRoles, assignedRoleIds, isOpen, onClose, onSuccess }: AssignRoleModalProps) {
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
      if (!response.ok) throw new Error('Failed to assign role');
      return response.json();
    },
    onSuccess: () => {
      onSuccess();
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

  const unassignedRoles = availableRoles.filter(role => !assignedRoleIds.includes(role.id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Assign Role to User
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="">Select a role</option>
                {unassignedRoles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.display_name} (Level {role.level})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Effective Until (Optional)
              </label>
              <input
                type="date"
                value={effectiveUntil}
                onChange={(e) => setEffectiveUntil(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={assignRoleMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {assignRoleMutation.isPending ? 'Assigning...' : 'Assign Role'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Grant Permission Modal Component
interface GrantPermissionModalProps {
  userId: string;
  availablePermissions: Permission[];
  grantedPermissionIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function GrantPermissionModal({ userId, availablePermissions, grantedPermissionIds, isOpen, onClose, onSuccess }: GrantPermissionModalProps) {
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
      if (!response.ok) throw new Error('Failed to grant permission');
      return response.json();
    },
    onSuccess: () => {
      onSuccess();
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

  const filteredPermissions = availablePermissions.filter(permission =>
    permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Grant Permission to User
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Search Permissions
              </label>
              <div className="relative mt-1">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search permissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Permission
              </label>
              <select
                value={selectedPermissionId}
                onChange={(e) => setSelectedPermissionId(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 max-h-40 overflow-y-auto"
                required
                size={Math.min(filteredPermissions.length + 1, 6)}
              >
                <option value="">Select a permission</option>
                {filteredPermissions.map(permission => (
                  <option key={permission.id} value={permission.id}>
                    {permission.name} ({permission.resource_type}:{permission.action})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Grant Type
              </label>
              <div className="mt-1 space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={isGranted}
                    onChange={() => setIsGranted(true)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Grant permission</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!isGranted}
                    onChange={() => setIsGranted(false)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Explicitly deny permission</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Reason (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Explain why this permission override is necessary"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={grantPermissionMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {grantPermissionMutation.isPending ? 'Processing...' : (isGranted ? 'Grant' : 'Deny') + ' Permission'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}