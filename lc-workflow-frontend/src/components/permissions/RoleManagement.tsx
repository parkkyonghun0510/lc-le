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
import toast from 'react-hot-toast';
import { showErrorToast, ErrorToasts } from '@/components/ui/ErrorToast';
import { useDraftSaving, useCleanupOldDrafts } from '@/hooks/useDraftSaving';
import UnsavedChangesDialog from '@/components/ui/UnsavedChangesDialog';
import RoleHierarchyView from './RoleHierarchyView';
import BulkRoleOperationsModal from './BulkRoleOperationsModal';

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
  permission_ids?: string[];
}

interface Permission {
  id: string;
  name: string;
  description: string;
  resource_type: string;
  action: string;
  scope: string;
  is_active: boolean;
}

interface RoleManagementProps {
  className?: string;
}

export default function RoleManagement({ className = '' }: RoleManagementProps) {
  const queryClient = useQueryClient();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Sorting state
  const [sortBy, setSortBy] = useState<'name' | 'level' | 'created_at' | 'permission_count'>('level');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Filter state
  const [minLevel, setMinLevel] = useState<number | undefined>(undefined);
  const [maxLevel, setMaxLevel] = useState<number | undefined>(undefined);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  
  // View mode state
  const [viewMode, setViewMode] = useState<'list' | 'hierarchy'>('list');
  const [showBulkModal, setShowBulkModal] = useState(false);
  
  // Accessibility: Screen reader announcements
  const [announcement, setAnnouncement] = useState('');
  
  // Cleanup old drafts on mount (drafts older than 7 days)
  useCleanupOldDrafts(7, 'draft-role-');

  // Debounce search term (300ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch roles
  const { data: roles, isLoading, error, refetch } = useQuery<Role[]>({
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
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error(errorData.detail || 'Failed to fetch roles');
        error.status = response.status;
        error.response = { status: response.status, data: errorData };
        throw error;
      }
      
      return response.json();
    },
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
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
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error(errorData.detail || 'Failed to create role');
        error.status = response.status;
        error.response = { status: response.status, data: errorData };
        throw error;
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsCreateModalOpen(false);
      setAnnouncement(`Role ${data.display_name} created successfully`);
      toast.success(`Role "${data.display_name}" created successfully`, { duration: 3000 });
    },
    onError: (error: any) => {
      const status = error?.status || error?.response?.status;
      
      if (status === 403) {
        showErrorToast(
          'Permission denied',
          {
            context: 'You don\'t have permission to create roles.',
            suggestions: [
              'Contact your administrator for access',
              'Verify your role has role management rights'
            ]
          }
        );
      } else if (status === 409) {
        showErrorToast(
          'Role already exists',
          {
            context: 'A role with this name already exists.',
            suggestions: [
              'Choose a different role name',
              'Check if the role was already created'
            ]
          }
        );
      } else if (status === 422) {
        showErrorToast(
          'Invalid data',
          {
            context: error.message || 'Please check your input and try again.',
            suggestions: [
              'Review all required fields',
              'Ensure the role level is between 0 and 100',
              'Check that the role name contains only valid characters'
            ]
          }
        );
      } else if (status === 500 || status >= 500) {
        ErrorToasts.serverError();
      } else if (!status) {
        ErrorToasts.networkError();
      } else {
        showErrorToast('Failed to create role', {
          context: error.message || 'An unexpected error occurred'
        });
      }
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
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error(errorData.detail || 'Failed to update role');
        error.status = response.status;
        error.response = { status: response.status, data: errorData };
        throw error;
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setEditingRole(null);
      setAnnouncement(`Role ${data.display_name} updated successfully`);
      toast.success(`Role "${data.display_name}" updated successfully`, { duration: 3000 });
    },
    onError: (error: any) => {
      const status = error?.status || error?.response?.status;
      
      if (status === 403) {
        showErrorToast(
          'Permission denied',
          {
            context: 'You don\'t have permission to update this role.',
            suggestions: [
              'Contact your administrator for access',
              'Check if this is a system role that cannot be modified'
            ]
          }
        );
      } else if (status === 404) {
        showErrorToast(
          'Role not found',
          {
            context: 'The role you are trying to update no longer exists.',
            suggestions: [
              'Refresh the page to reload the data',
              'The role may have been deleted by another user'
            ],
            onRetry: () => refetch()
          }
        );
      } else if (status === 422) {
        showErrorToast(
          'Invalid data',
          {
            context: error.message || 'Please check your input and try again.',
            suggestions: [
              'Review all required fields',
              'Ensure the role level is between 0 and 100'
            ]
          }
        );
      } else if (status === 500 || status >= 500) {
        ErrorToasts.serverError();
      } else if (!status) {
        ErrorToasts.networkError();
      } else {
        showErrorToast('Failed to update role', {
          context: error.message || 'An unexpected error occurred'
        });
      }
    }
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async ({ roleId, roleName }: { roleId: string; roleName: string }) => {
      const response = await fetch(`/api/v1/permissions/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error(errorData.detail || 'Failed to delete role');
        error.status = response.status;
        error.response = { status: response.status, data: errorData };
        throw error;
      }
      
      return { roleName };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setAnnouncement(`Role ${data.roleName} deleted successfully`);
      toast.success(`Role "${data.roleName}" deleted successfully`, { duration: 3000 });
    },
    onError: (error: any, variables) => {
      const status = error?.status || error?.response?.status;
      
      if (status === 403) {
        showErrorToast(
          'Permission denied',
          {
            context: 'You don\'t have permission to delete this role.',
            suggestions: [
              'Contact your administrator for access',
              'Check if this is a system role that cannot be deleted'
            ]
          }
        );
      } else if (status === 404) {
        showErrorToast(
          'Role not found',
          {
            context: 'The role you are trying to delete no longer exists.',
            suggestions: [
              'Refresh the page to reload the data',
              'The role may have already been deleted'
            ],
            onRetry: () => refetch()
          }
        );
      } else if (status === 409) {
        showErrorToast(
          'Cannot delete role',
          {
            context: 'This role is currently assigned to users and cannot be deleted.',
            suggestions: [
              'Remove all users from this role first',
              'Deactivate the role instead of deleting it'
            ]
          }
        );
      } else if (status === 500 || status >= 500) {
        ErrorToasts.serverError();
      } else if (!status) {
        ErrorToasts.networkError();
      } else {
        showErrorToast('Failed to delete role', {
          context: error.message || 'An unexpected error occurred'
        });
      }
    }
  });

  // Filter roles based on search and level range
  const filteredRoles = roles?.filter(role => {
    const matchesSearch = 
      role.display_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      role.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    
    const matchesMinLevel = minLevel === undefined || role.level >= minLevel;
    const matchesMaxLevel = maxLevel === undefined || role.level <= maxLevel;
    
    return matchesSearch && matchesMinLevel && matchesMaxLevel;
  }) || [];

  // Sort roles based on selected criteria
  const sortedRoles = [...filteredRoles].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.display_name.localeCompare(b.display_name);
        break;
      case 'level':
        comparison = a.level - b.level;
        break;
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'permission_count':
        comparison = a.permission_count - b.permission_count;
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  
  // Paginate roles
  const totalPages = Math.ceil(sortedRoles.length / pageSize);
  const paginatedRoles = sortedRoles.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  
  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, showInactive, minLevel, maxLevel, sortBy, sortOrder]);

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
      deleteRoleMutation.mutate({ roleId: role.id, roleName: role.display_name });
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
    const errorObj = error as any;
    const status = errorObj?.status || errorObj?.response?.status;
    
    let errorMessage = 'Error loading roles';
    let errorContext = errorObj.message || 'An unexpected error occurred';
    let suggestions: string[] = [];
    
    if (status === 403) {
      errorMessage = 'Access denied';
      errorContext = 'You don\'t have permission to view roles.';
      suggestions = [
        'Contact your administrator for access',
        'Verify you are logged in with the correct account'
      ];
    } else if (status === 404) {
      errorMessage = 'Resource not found';
      errorContext = 'The roles data could not be found.';
      suggestions = ['Refresh the page', 'Contact support if the problem persists'];
    } else if (status === 500 || status >= 500) {
      errorMessage = 'Server error';
      errorContext = 'The server encountered an error while loading roles.';
      suggestions = [
        'Try again in a few moments',
        'Refresh the page',
        'Contact support if the error continues'
      ];
    } else if (!status) {
      errorMessage = 'Network error';
      errorContext = 'Unable to connect to the server.';
      suggestions = [
        'Check your internet connection',
        'Try refreshing the page'
      ];
    }
    
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="p-6">
          <div className="text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{errorMessage}</h3>
            <p className="text-sm text-gray-500 mb-4">{errorContext}</p>
            {suggestions.length > 0 && (
              <div className="text-left max-w-md mx-auto mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Try these solutions:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`} role="region" aria-label="Role Management">
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Role Management</h2>
            <p className="mt-1 text-sm text-gray-500">
              Create and manage system roles and their hierarchies
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                  viewMode === 'list'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              >
                List View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('hierarchy')}
                className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                  viewMode === 'hierarchy'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              >
                Hierarchy
              </button>
            </div>
            
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              aria-label="Create new role"
            >
              <PlusIcon className="h-4 w-4 mr-2" aria-hidden="true" />
              Create Role
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50" role="search" aria-label="Filter roles">
        <div className="space-y-4">
          {/* Search and Toggle Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <label htmlFor="role-search" className="sr-only">
                Search roles
              </label>
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" aria-hidden="true" />
              <input
                id="role-search"
                type="text"
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full"
                aria-describedby="role-search-description"
              />
              <span id="role-search-description" className="sr-only">
                Filter roles by name or description
              </span>
            </div>

            {/* Show inactive toggle */}
            <label className="flex items-center whitespace-nowrap">
              <input
                id="show-inactive-roles-toggle"
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-2 focus:ring-indigo-500 border-gray-300 rounded"
                aria-describedby="show-inactive-description"
              />
              <span className="ml-2 text-sm text-gray-700">Show inactive</span>
              <span id="show-inactive-description" className="sr-only">
                Toggle to show or hide inactive roles in the list
              </span>
            </label>
          </div>
          
          {/* Advanced Filters Row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Level Range Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="min-level" className="text-sm text-gray-700 whitespace-nowrap">
                Level:
              </label>
              <input
                id="min-level"
                type="number"
                min="0"
                max="100"
                placeholder="Min"
                value={minLevel ?? ''}
                onChange={(e) => setMinLevel(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                aria-label="Minimum role level"
              />
              <span className="text-gray-500">-</span>
              <input
                id="max-level"
                type="number"
                min="0"
                max="100"
                placeholder="Max"
                value={maxLevel ?? ''}
                onChange={(e) => setMaxLevel(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                aria-label="Maximum role level"
              />
            </div>
            
            {/* Sort By */}
            <div className="flex items-center gap-2">
              <label htmlFor="sort-by" className="text-sm text-gray-700 whitespace-nowrap">
                Sort by:
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                aria-label="Sort roles by"
              >
                <option value="level">Level</option>
                <option value="name">Name</option>
                <option value="created_at">Created Date</option>
                <option value="permission_count">Permissions</option>
              </select>
            </div>
            
            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label={`Sort order: ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
              title={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
            >
              {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>
            
            {/* Clear Filters */}
            {(minLevel !== undefined || maxLevel !== undefined || searchTerm) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setMinLevel(undefined);
                  setMaxLevel(undefined);
                }}
                className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                aria-label="Clear all filters"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedRoles.size > 0 && viewMode === 'list' && (
        <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-indigo-700">
              {selectedRoles.size} role{selectedRoles.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkModal(true)}
                className="px-3 py-1 text-sm text-indigo-700 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
              >
                Bulk Actions
              </button>
              <button
                onClick={() => setSelectedRoles(new Set())}
                className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Hierarchy View */}
      {viewMode === 'hierarchy' ? (
        <div className="p-6">
          <RoleHierarchyView
            roles={sortedRoles}
            onRoleSelect={(role) => setSelectedRole(role)}
            selectedRoleId={selectedRole?.id}
          />
        </div>
      ) : (
        /* Roles List */
        <div className="divide-y divide-gray-200" role="list" aria-label="Roles list">
        {paginatedRoles.length === 0 ? (
          <div className="p-6 text-center text-gray-500" role="status">
            <UserGroupIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" aria-hidden="true" />
            <p>No roles found</p>
            {searchTerm && (
              <p className="text-sm">Try adjusting your search criteria</p>
            )}
          </div>
        ) : (
          paginatedRoles.map(role => (
            <div key={role.id} className="p-6 hover:bg-gray-50" role="listitem">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  {/* Checkbox for bulk selection */}
                  {!role.is_system_role && (
                    <input
                      type="checkbox"
                      checked={selectedRoles.has(role.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedRoles);
                        if (e.target.checked) {
                          newSelected.add(role.id);
                        } else {
                          newSelected.delete(role.id);
                        }
                        setSelectedRoles(newSelected);
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-2 focus:ring-indigo-500 border-gray-300 rounded"
                      aria-label={`Select ${role.display_name}`}
                    />
                  )}
                  
                  {/* Role Icon */}
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      role.is_active 
                        ? 'bg-indigo-100 text-indigo-600' 
                        : 'bg-gray-100 text-gray-400'
                    }`}
                    aria-hidden="true"
                  >
                    <ShieldCheckIcon className="h-5 w-5" />
                  </div>

                  {/* Role Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {role.display_name}
                      </h3>
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          role.level >= 80 
                            ? 'bg-red-100 text-red-800'
                            : role.level >= 60
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                        aria-label={`Role level ${role.level}`}
                      >
                        Level {role.level}
                      </span>
                      {role.is_system_role && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800" aria-label="System role">
                          System
                        </span>
                      )}
                      {role.is_default && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800" aria-label="Default role">
                          Default
                        </span>
                      )}
                      {!role.is_active && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800" aria-label="Inactive role">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {role.description}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500" aria-label={`${role.permission_count} permissions, created ${new Date(role.created_at).toLocaleDateString()}`}>
                      <span>{role.permission_count} permissions</span>
                      <span aria-hidden="true">•</span>
                      <span>Created {new Date(role.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2" role="group" aria-label={`Actions for ${role.display_name}`}>
                  <button
                    onClick={() => setSelectedRole(role)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded"
                    aria-label={`View details for ${role.display_name}`}
                    title="View details"
                  >
                    <EyeIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                  
                  {!role.is_system_role && (
                    <>
                      <button
                        onClick={() => setEditingRole(role)}
                        className="p-2 text-gray-400 hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded"
                        aria-label={`Edit ${role.display_name}`}
                        title="Edit role"
                      >
                        <PencilIcon className="h-5 w-5" aria-hidden="true" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteRole(role)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Delete ${role.display_name}`}
                        title={deleteRoleMutation.isPending ? "Deleting..." : "Delete role"}
                        disabled={deleteRoleMutation.isPending}
                      >
                        {deleteRoleMutation.isPending ? (
                          <div className="animate-spin h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full" aria-hidden="true" />
                        ) : (
                          <TrashIcon className="h-5 w-5" aria-hidden="true" />
                        )}
                      </button>
                    </>
                  )}
                  
                  <ChevronRightIcon className="h-5 w-5 text-gray-300" aria-hidden="true" />
                </div>
              </div>
            </div>
          ))
        )}
        </div>
      )}

      {/* Footer with Pagination */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Results info */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Showing {paginatedRoles.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, sortedRoles.length)} of {sortedRoles.length} roles
            </span>
            
            {/* Page size selector */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Roles per page"
            >
              <option value="5">5 per page</option>
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
            </select>
          </div>
          
          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="First page"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Previous page"
              >
                Previous
              </button>
              
              <span className="px-3 py-1 text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Next page"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Last page"
              >
                Last
              </button>
            </div>
          )}
          
          {/* Processing indicator */}
          {(createRoleMutation.isPending || updateRoleMutation.isPending || deleteRoleMutation.isPending) && (
            <span className="text-sm text-indigo-600">Processing...</span>
          )}
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
      
      {/* Bulk Operations Modal */}
      {showBulkModal && (
        <BulkRoleOperationsModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          selectedRoles={roles?.filter(r => selectedRoles.has(r.id)) || []}
          onComplete={() => {
            setSelectedRoles(new Set());
            refetch();
          }}
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

const RoleFormModal = React.memo(({ role, isOpen, onClose, onSubmit, isLoading, availableRoles }: RoleFormModalProps) => {
  const [formData, setFormData] = useState<RoleFormData>({
    name: role?.name || '',
    display_name: role?.display_name || '',
    description: role?.description || '',
    level: role?.level || 0,
    parent_role_id: role?.parent_role_id || '',
    department_restricted: false,
    branch_restricted: false,
    allowed_departments: [],
    allowed_branches: [],
    permission_ids: []
  });
  
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Fetch available permissions
  const { data: permissions, isLoading: permissionsLoading } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await fetch('/api/v1/permissions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch permissions');
      return response.json();
    },
    enabled: isOpen
  });
  
  // Fetch role permissions if editing
  React.useEffect(() => {
    if (role && isOpen) {
      fetch(`/api/v1/permissions/roles/${role.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.permissions) {
            setFormData(prev => ({
              ...prev,
              permission_ids: data.permissions.map((p: Permission) => p.id)
            }));
          }
        })
        .catch(err => console.error('Failed to fetch role permissions:', err));
    }
  }, [role, isOpen]);
  
  // Draft saving hook
  const {
    hasDraft,
    restoreDraft,
    saveDraft,
    clearDraft,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    getDraftAge
  } = useDraftSaving<RoleFormData>({
    draftKey: role ? `draft-role-edit-${role.id}` : 'draft-role-create',
    formType: role ? 'role-edit' : 'role-create',
    autoSaveInterval: 30000, // 30 seconds
    onDraftRestored: () => {
      const age = getDraftAge();
      const ageInMinutes = age ? Math.floor(age / 60000) : 0;
      toast.success(
        `Draft restored from ${ageInMinutes} minute${ageInMinutes !== 1 ? 's' : ''} ago`,
        { duration: 4000 }
      );
    },
    onDraftSaved: () => {
      // Silent auto-save
    }
  });
  
  // Restore draft on mount if available
  React.useEffect(() => {
    if (isOpen && !role && hasDraft && !draftRestored) {
      const draft = restoreDraft();
      if (draft) {
        setFormData(draft);
        setDraftRestored(true);
      }
    }
  }, [isOpen, role, hasDraft, restoreDraft, draftRestored]);
  
  // Auto-save draft every 30 seconds when form data changes
  React.useEffect(() => {
    if (isOpen && !role) {
      // Only auto-save for create form, not edit
      const timer = setTimeout(() => {
        saveDraft(formData);
      }, 30000);
      
      return () => clearTimeout(timer);
    }
  }, [formData, isOpen, role, saveDraft]);
  
  // Track unsaved changes
  React.useEffect(() => {
    if (isOpen) {
      const hasChanges = 
        formData.name !== (role?.name || '') ||
        formData.display_name !== (role?.display_name || '') ||
        formData.description !== (role?.description || '') ||
        formData.level !== (role?.level || 0) ||
        formData.parent_role_id !== (role?.parent_role_id || '');
      
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, role, isOpen, setHasUnsavedChanges]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    // Clear draft on successful submission
    clearDraft();
  };
  
  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      clearDraft();
      onClose();
    }
  };
  
  const handleConfirmClose = () => {
    clearDraft();
    setShowUnsavedDialog(false);
    onClose();
  };
  
  // Handle Escape key to close modal
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Trap focus in modal
      const modal = document.getElementById('role-form-modal');
      if (modal) {
        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        firstElement?.focus();
      }
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-form-title"
    >
      <div id="role-form-modal" className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 id="role-form-title" className="text-lg font-medium text-gray-900 mb-4">
            {role ? 'Edit Role' : 'Create New Role'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4" aria-label={role ? 'Edit role form' : 'Create role form'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="role-name" className="block text-sm font-medium text-gray-700">
                  Role Name (System) <span className="text-red-500" aria-label="required">*</span>
                </label>
                <input
                  id="role-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="admin, manager, officer"
                  required
                  aria-required="true"
                  aria-describedby="role-name-description"
                />
                <span id="role-name-description" className="sr-only">
                  Enter a system name for the role using lowercase letters and underscores
                </span>
              </div>
              
              <div>
                <label htmlFor="role-display-name" className="block text-sm font-medium text-gray-700">
                  Display Name <span className="text-red-500" aria-label="required">*</span>
                </label>
                <input
                  id="role-display-name"
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="System Administrator"
                  required
                  aria-required="true"
                  aria-describedby="role-display-name-description"
                />
                <span id="role-display-name-description" className="sr-only">
                  Enter a user-friendly display name for the role
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="role-description" className="block text-sm font-medium text-gray-700">
                Description <span className="text-red-500" aria-label="required">*</span>
              </label>
              <textarea
                id="role-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Describe the role's responsibilities and scope"
                required
                aria-required="true"
                aria-describedby="role-description-description"
              />
              <span id="role-description-description" className="sr-only">
                Describe the role's responsibilities and scope of access
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="role-level" className="block text-sm font-medium text-gray-700">
                  Level (0-100) <span className="text-red-500" aria-label="required">*</span>
                </label>
                <input
                  id="role-level"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                  aria-required="true"
                  aria-describedby="role-level-description"
                />
                <span id="role-level-description" className="sr-only">
                  Enter a level between 0 and 100, where higher numbers indicate more authority
                </span>
              </div>
              
              <div>
                <label htmlFor="role-parent" className="block text-sm font-medium text-gray-700">
                  Parent Role
                </label>
                <select
                  id="role-parent"
                  value={formData.parent_role_id}
                  onChange={(e) => setFormData({ ...formData, parent_role_id: e.target.value || undefined })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  aria-describedby="role-parent-description"
                >
                  <option value="">No parent role</option>
                  {availableRoles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.display_name} (Level {r.level})
                    </option>
                  ))}
                </select>
                <span id="role-parent-description" className="sr-only">
                  Optionally select a parent role for inheritance
                </span>
              </div>
            </div>
            
            {/* Permission Assignment Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Permissions ({formData.permission_ids?.length || 0} selected)
                </label>
                <button
                  type="button"
                  onClick={() => setShowPermissions(!showPermissions)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                >
                  {showPermissions ? 'Hide' : 'Show'} Permissions
                </button>
              </div>
              
              {showPermissions && (
                <div className="border border-gray-300 rounded-md p-4 max-h-96 overflow-y-auto">
                  {permissionsLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" />
                      <p className="text-sm text-gray-500 mt-2">Loading permissions...</p>
                    </div>
                  ) : (
                    <>
                      {/* Permission Search and Filter */}
                      <div className="mb-4 space-y-2">
                        <input
                          type="text"
                          placeholder="Search permissions..."
                          value={permissionSearch}
                          onChange={(e) => setPermissionSearch(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="all">All Categories</option>
                          {Array.from(new Set(permissions?.map(p => p.resource_type) || [])).map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const filtered = permissions?.filter(p => {
                                const matchesSearch = p.name.toLowerCase().includes(permissionSearch.toLowerCase());
                                const matchesCategory = selectedCategory === 'all' || p.resource_type === selectedCategory;
                                return matchesSearch && matchesCategory;
                              }) || [];
                              setFormData({
                                ...formData,
                                permission_ids: filtered.map(p => p.id)
                              });
                            }}
                            className="px-3 py-1 text-xs text-indigo-600 hover:text-indigo-700 focus:outline-none"
                          >
                            Select All Filtered
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, permission_ids: [] })}
                            className="px-3 py-1 text-xs text-gray-600 hover:text-gray-700 focus:outline-none"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>
                      
                      {/* Permission List */}
                      <div className="space-y-2">
                        {permissions
                          ?.filter(p => {
                            const matchesSearch = p.name.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                                                 p.description.toLowerCase().includes(permissionSearch.toLowerCase());
                            const matchesCategory = selectedCategory === 'all' || p.resource_type === selectedCategory;
                            return matchesSearch && matchesCategory;
                          })
                          .map(permission => (
                            <label
                              key={permission.id}
                              className="flex items-start p-2 hover:bg-gray-50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={formData.permission_ids?.includes(permission.id) || false}
                                onChange={(e) => {
                                  const currentIds = formData.permission_ids || [];
                                  const newIds = e.target.checked
                                    ? [...currentIds, permission.id]
                                    : currentIds.filter(id => id !== permission.id);
                                  setFormData({ ...formData, permission_ids: newIds });
                                }}
                                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-2 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                              <div className="ml-3 flex-1">
                                <div className="text-sm font-medium text-gray-900">{permission.name}</div>
                                <div className="text-xs text-gray-500">{permission.description}</div>
                                <div className="flex gap-2 mt-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    {permission.resource_type}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    {permission.action}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                    {permission.scope}
                                  </span>
                                </div>
                              </div>
                            </label>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                aria-label="Cancel and close form"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                aria-label={isLoading ? 'Saving role' : (role ? 'Update role' : 'Create role')}
                aria-disabled={isLoading}
              >
                {isLoading ? 'Saving...' : (role ? 'Update' : 'Create')} Role
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onConfirm={handleConfirmClose}
        onCancel={() => setShowUnsavedDialog(false)}
      />
    </div>
  );
});

RoleFormModal.displayName = 'RoleFormModal';

// Role Details Modal Component
interface RoleDetailsModalProps {
  role: Role;
  isOpen: boolean;
  onClose: () => void;
}

const RoleDetailsModal = React.memo(({ role, isOpen, onClose }: RoleDetailsModalProps) => {
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
  
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-details-title"
    >
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 id="role-details-title" className="text-lg font-medium text-gray-900">
              Role Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded"
              aria-label="Close role details"
            >
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
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
});

RoleDetailsModal.displayName = 'RoleDetailsModal';