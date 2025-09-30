"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface Role {
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
}

interface RoleFormData {
  name: string;
  display_name: string;
  description: string;
  level: number;
  parent_role_id?: string;
  department_restricted: boolean;
  branch_restricted: boolean;
  allowed_departments?: string[];
  allowed_branches?: string[];
}

interface RoleManagementProps {
  className?: string;
}

export default function RoleManagement({ className = '' }: RoleManagementProps) {
  const queryClient = useQueryClient();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Fetch roles
  const { data: roles, isLoading, error } = useQuery<Role[]>({
    queryKey: ['roles', { showInactive }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (!showInactive) params.append('is_active', 'true');
      
      const response = await fetch(`/api/v1/permissions/roles?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }
      
      return response.json();
    }
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: RoleFormData) => {
      const response = await fetch('/api/v1/permissions/roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(roleData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create role');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsCreateModalOpen(false);
    }
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, ...roleData }: RoleFormData & { id: string }) => {
      const response = await fetch(`/api/v1/permissions/roles/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(roleData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update role');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setEditingRole(null);
    }
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const response = await fetch(`/api/v1/permissions/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete role');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    }
  });

  // Filter roles based on search
  const filteredRoles = roles?.filter(role => 
    role.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Sort roles by level and then by name
  const sortedRoles = [...filteredRoles].sort((a, b) => {
    if (a.level !== b.level) return b.level - a.level; // Higher level first
    return a.display_name.localeCompare(b.display_name);
  });

  const handleCreateRole = (formData: RoleFormData) => {
    createRoleMutation.mutate(formData);
  };

  const handleUpdateRole = (formData: RoleFormData) => {
    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, ...formData });
    }
  };

  const handleDeleteRole = (role: Role) => {
    if (window.confirm(`Are you sure you want to delete the role "${role.display_name}"?`)) {
      deleteRoleMutation.mutate(role.id);
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading roles</p>
            <p className="text-sm text-gray-500 mt-1">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Role Management</h2>
            <p className="mt-1 text-sm text-gray-500">
              Create and manage system roles and their hierarchies
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Role
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-full"
            />
          </div>

          {/* Show inactive toggle */}
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Show inactive roles</span>
          </label>
        </div>
      </div>

      {/* Roles List */}
      <div className="divide-y divide-gray-200">
        {sortedRoles.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <UserGroupIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p>No roles found</p>
            {searchTerm && (
              <p className="text-sm">Try adjusting your search criteria</p>
            )}
          </div>
        ) : (
          sortedRoles.map(role => (
            <div key={role.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  {/* Role Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    role.is_active 
                      ? 'bg-indigo-100 text-indigo-600' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    <ShieldCheckIcon className="h-5 w-5" />
                  </div>

                  {/* Role Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {role.display_name}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        role.level >= 80 
                          ? 'bg-red-100 text-red-800'
                          : role.level >= 60
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        Level {role.level}
                      </span>
                      {role.is_system_role && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          System
                        </span>
                      )}
                      {role.is_default && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Default
                        </span>
                      )}
                      {!role.is_active && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {role.description}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>{role.permission_count} permissions</span>
                      <span>•</span>
                      <span>Created {new Date(role.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedRole(role)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="View details"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                  
                  {!role.is_system_role && (
                    <>
                      <button
                        onClick={() => setEditingRole(role)}
                        className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                        title="Edit role"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteRole(role)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete role"
                        disabled={deleteRoleMutation.isPending}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </>
                  )}
                  
                  <ChevronRightIcon className="h-5 w-5 text-gray-300" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>
            Showing {sortedRoles.length} of {roles?.length || 0} roles
          </span>
          <div className="flex items-center space-x-4">
            {(createRoleMutation.isPending || updateRoleMutation.isPending || deleteRoleMutation.isPending) && (
              <span className="text-indigo-600">Processing...</span>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Role Modal */}
      {(isCreateModalOpen || editingRole) && (
        <RoleFormModal
          role={editingRole}
          isOpen={isCreateModalOpen || !!editingRole}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingRole(null);
          }}
          onSubmit={editingRole ? handleUpdateRole : handleCreateRole}
          isLoading={createRoleMutation.isPending || updateRoleMutation.isPending}
          availableRoles={roles?.filter(r => r.id !== editingRole?.id) || []}
        />
      )}

      {/* Role Details Modal */}
      {selectedRole && (
        <RoleDetailsModal
          role={selectedRole}
          isOpen={!!selectedRole}
          onClose={() => setSelectedRole(null)}
        />
      )}
    </div>
  );
}

// Role Form Modal Component
interface RoleFormModalProps {
  role?: Role | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RoleFormData) => void;
  isLoading: boolean;
  availableRoles: Role[];
}

function RoleFormModal({ role, isOpen, onClose, onSubmit, isLoading, availableRoles }: RoleFormModalProps) {
  const [formData, setFormData] = useState<RoleFormData>({
    name: role?.name || '',
    display_name: role?.display_name || '',
    description: role?.description || '',
    level: role?.level || 0,
    parent_role_id: role?.parent_role_id || '',
    department_restricted: false,
    branch_restricted: false,
    allowed_departments: [],
    allowed_branches: []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {role ? 'Edit Role' : 'Create New Role'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role Name (System)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="admin, manager, officer"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="System Administrator"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Describe the role's responsibilities and scope"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Level (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Parent Role
                </label>
                <select
                  value={formData.parent_role_id}
                  onChange={(e) => setFormData({ ...formData, parent_role_id: e.target.value || undefined })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">No parent role</option>
                  {availableRoles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.display_name} (Level {r.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : (role ? 'Update' : 'Create')} Role
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Role Details Modal Component
interface RoleDetailsModalProps {
  role: Role;
  isOpen: boolean;
  onClose: () => void;
}

function RoleDetailsModal({ role, isOpen, onClose }: RoleDetailsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Role Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Display Name</label>
              <p className="mt-1 text-sm text-gray-900">{role.display_name}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">System Name</label>
              <p className="mt-1 text-sm text-gray-900 font-mono">{role.name}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <p className="mt-1 text-sm text-gray-900">{role.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Level</label>
                <p className="mt-1 text-sm text-gray-900">{role.level}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Permissions</label>
                <p className="mt-1 text-sm text-gray-900">{role.permission_count}</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <div className="mt-1 flex items-center space-x-2">
                {role.is_active ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm text-gray-900">
                  {role.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {role.is_system_role && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  System Role
                </span>
              )}
              {role.is_default && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Default Role
                </span>
              )}
            </div>
            
            <div className="pt-4 border-t">
              <button
                onClick={onClose}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}