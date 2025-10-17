"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { showErrorToast, ErrorToasts } from '@/components/ui/ErrorToast';

interface Permission {
  id: string;
  name: string;
  description: string;
  resource_type: string;
  action: string;
  scope: string;
  is_active: boolean;
  is_system_permission: boolean;
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  level: number;
  is_active: boolean;
  is_system_role: boolean;
  permission_count: number;
}

interface PermissionMatrixData {
  roles: Role[];
  permissions: Permission[];
  matrix: Record<string, Record<string, boolean>>;
}

interface PermissionMatrixProps {
  className?: string;
}

// Memoized cell component to prevent unnecessary re-renders
interface MatrixCellProps {
  roleId: string;
  roleName: string;
  permissionId: string;
  permissionName: string;
  hasPermission: boolean;
  isReadOnly: boolean;
  isPending: boolean;
  onToggle: (roleId: string, permissionId: string, currentValue: boolean, roleName: string, permissionName: string) => void;
}

const MatrixCell = React.memo(({ 
  roleId, 
  roleName, 
  permissionId, 
  permissionName, 
  hasPermission, 
  isReadOnly, 
  isPending,
  onToggle 
}: MatrixCellProps) => {
  return (
    <td className="px-3 py-4 text-center" role="cell">
      <button
        onClick={() => !isReadOnly && onToggle(roleId, permissionId, hasPermission, roleName, permissionName)}
        disabled={isReadOnly || isPending}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
          hasPermission
            ? 'bg-green-100 text-green-600 hover:bg-green-200 focus:bg-green-200'
            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 focus:bg-gray-200'
        } ${
          isReadOnly
            ? 'cursor-not-allowed opacity-50'
            : 'cursor-pointer'
        }`}
        aria-label={`${permissionName} for ${roleName}: ${hasPermission ? 'Granted' : 'Not granted'}${isReadOnly ? ' (Read-only)' : '. Press Enter to toggle'}`}
        aria-pressed={hasPermission}
        aria-disabled={isReadOnly || isPending}
        title={`${hasPermission ? 'Granted' : 'Not granted'} ${isReadOnly ? '(Read-only)' : ''}`}
      >
        {hasPermission ? (
          <CheckSolidIcon className="h-5 w-5" aria-hidden="true" />
        ) : (
          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
    </td>
  );
});

MatrixCell.displayName = 'MatrixCell';

export default function PermissionMatrix({ className = '' }: PermissionMatrixProps) {
  const queryClient = useQueryClient();
  
  // State for filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [showInactiveRoles, setShowInactiveRoles] = useState(false);
  const [showInactivePermissions, setShowInactivePermissions] = useState(false);
  
  // Accessibility: Screen reader announcements
  const [announcement, setAnnouncement] = useState('');
  const announcementRef = useRef<HTMLDivElement>(null);

  // Debounce search term (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch permission matrix data
  const { data: matrixData, isLoading, error, refetch } = useQuery<PermissionMatrixData>({
    queryKey: ['permission-matrix'],
    queryFn: async () => {
      const response = await fetch('/api/v1/permissions/matrix', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error(errorData.detail || 'Failed to fetch permission matrix');
        error.status = response.status;
        error.response = { status: response.status, data: errorData };
        throw error;
      }
      return response.json();
    },
    retry: (failureCount, error: any) => {
      // Retry on network errors or 5xx errors, but not on 4xx errors
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    }
  });

  // Mutation for updating role permissions
  const updateRolePermissionMutation = useMutation({
    mutationFn: async ({ roleId, permissionId, grant }: { 
      roleId: string; 
      permissionId: string; 
      grant: boolean; 
    }) => {
      const url = `/api/v1/permissions/roles/${roleId}/permissions/${permissionId}`;
      const response = await fetch(url, {
        method: grant ? 'POST' : 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error(errorData.detail || `Failed to ${grant ? 'grant' : 'revoke'} permission`);
        error.status = response.status;
        error.response = { status: response.status, data: errorData };
        throw error;
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['permission-matrix'] });
      toast.success(
        `Permission ${variables.grant ? 'granted' : 'revoked'} successfully`,
        { duration: 3000 }
      );
    },
    onError: (error: any, variables) => {
      const status = error?.status || error?.response?.status;
      const action = variables.grant ? 'grant' : 'revoke';
      
      if (status === 403) {
        showErrorToast(
          'Permission denied',
          {
            context: `You don't have permission to ${action} permissions for this role.`,
            suggestions: [
              'Contact your administrator for access',
              'Verify your role has permission management rights',
              'Check if this is a system role that cannot be modified'
            ]
          }
        );
      } else if (status === 404) {
        showErrorToast(
          'Resource not found',
          {
            context: `The role or permission could not be found.`,
            suggestions: [
              'Refresh the page to reload the data',
              'The resource may have been deleted by another user',
              'Contact support if the problem persists'
            ],
            onRetry: () => refetch()
          }
        );
      } else if (status === 500 || status >= 500) {
        ErrorToasts.serverError(() => refetch());
      } else if (!status) {
        ErrorToasts.networkError(() => refetch());
      } else {
        showErrorToast(
          `Failed to ${action} permission`,
          {
            context: error.message || 'An unexpected error occurred',
            onRetry: () => refetch()
          }
        );
      }
    }
  });

  // Filter roles and permissions based on search and filters
  const filteredData = useMemo(() => {
    if (!matrixData) return null;

    const filteredRoles = matrixData.roles.filter(role => {
      const matchesSearch = role.display_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           role.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesActive = showInactiveRoles || role.is_active;
      return matchesSearch && matchesActive;
    });

    const filteredPermissions = matrixData.permissions.filter(permission => {
      const matchesSearch = permission.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           permission.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesResourceType = selectedResourceType === 'all' || permission.resource_type === selectedResourceType;
      const matchesAction = selectedAction === 'all' || permission.action === selectedAction;
      const matchesScope = selectedScope === 'all' || permission.scope === selectedScope;
      const matchesActive = showInactivePermissions || permission.is_active;
      
      return matchesSearch && matchesResourceType && matchesAction && matchesScope && matchesActive;
    });

    return {
      roles: filteredRoles,
      permissions: filteredPermissions,
      matrix: matrixData.matrix
    };
  }, [matrixData, debouncedSearchTerm, selectedResourceType, selectedAction, selectedScope, showInactiveRoles, showInactivePermissions]);

  // Get unique values for filter dropdowns
  const resourceTypes = useMemo(() => {
    if (!matrixData) return [];
    return [...new Set(matrixData.permissions.map(p => p.resource_type))];
  }, [matrixData]);

  const actions = useMemo(() => {
    if (!matrixData) return [];
    return [...new Set(matrixData.permissions.map(p => p.action))];
  }, [matrixData]);

  const scopes = useMemo(() => {
    if (!matrixData) return [];
    return [...new Set(matrixData.permissions.map(p => p.scope))];
  }, [matrixData]);

  // Handle permission toggle
  const handlePermissionToggle = (roleId: string, permissionId: string, currentValue: boolean, roleName: string, permissionName: string) => {
    const action = !currentValue ? 'granted' : 'revoked';
    updateRolePermissionMutation.mutate({
      roleId,
      permissionId,
      grant: !currentValue
    }, {
      onSuccess: () => {
        // Announce to screen readers
        setAnnouncement(`Permission ${permissionName} ${action} for role ${roleName}`);
      }
    });
  };

  // Export matrix data
  const handleExport = () => {
    if (!filteredData) return;
    
    const csvData = [
      ['Role', ...filteredData.permissions.map(p => p.name)],
      ...filteredData.roles.map(role => [
        role.display_name,
        ...filteredData.permissions.map(permission => 
          filteredData.matrix[role.id]?.[permission.id] ? 'Yes' : 'No'
        )
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'permission-matrix.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const errorObj = error as any;
    const status = errorObj?.status || errorObj?.response?.status;
    
    let errorMessage = 'Error loading permission matrix';
    let errorContext = errorObj.message || 'An unexpected error occurred';
    let suggestions: string[] = [];
    
    if (status === 403) {
      errorMessage = 'Access denied';
      errorContext = 'You don\'t have permission to view the permission matrix.';
      suggestions = [
        'Contact your administrator for access',
        'Verify you are logged in with the correct account',
        'Check if your role has permission management rights'
      ];
    } else if (status === 404) {
      errorMessage = 'Resource not found';
      errorContext = 'The permission matrix data could not be found.';
      suggestions = [
        'Refresh the page',
        'Contact support if the problem persists'
      ];
    } else if (status === 500 || status >= 500) {
      errorMessage = 'Server error';
      errorContext = 'The server encountered an error while loading the permission matrix.';
      suggestions = [
        'Try again in a few moments',
        'Refresh the page',
        'Contact support if the error continues'
      ];
    } else if (!status) {
      errorMessage = 'Network error';
      errorContext = 'Unable to connect to the server. Please check your internet connection.';
      suggestions = [
        'Check your internet connection',
        'Try refreshing the page',
        'Contact support if the problem persists'
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

  if (!filteredData) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`} role="region" aria-label="Permission Matrix">
      {/* Screen reader announcements */}
      <div
        ref={announcementRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
      
      {/* Skip link for matrix navigation */}
      <a
        href="#matrix-table"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-md"
      >
        Skip to permission matrix table
      </a>
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Permission Matrix</h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage role-based permissions across the system
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              aria-label="Export permission matrix to CSV file"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50" role="search" aria-label="Filter permission matrix">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label htmlFor="matrix-search" className="sr-only">
              Search roles or permissions
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" aria-hidden="true" />
              <input
                id="matrix-search"
                type="text"
                placeholder="Search roles or permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full"
                aria-describedby="matrix-search-description"
              />
              <span id="matrix-search-description" className="sr-only">
                Filter the permission matrix by role name or permission name
              </span>
            </div>
          </div>

          {/* Resource Type Filter */}
          <div>
            <label htmlFor="resource-type-filter" className="sr-only">
              Filter by resource type
            </label>
            <select
              id="resource-type-filter"
              value={selectedResourceType}
              onChange={(e) => setSelectedResourceType(e.target.value)}
              className="w-full py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              aria-label="Filter permissions by resource type"
            >
              <option value="all">All Resources</option>
              {resourceTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label htmlFor="action-filter" className="sr-only">
              Filter by action
            </label>
            <select
              id="action-filter"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              aria-label="Filter permissions by action type"
            >
              <option value="all">All Actions</option>
              {actions.map(action => (
                <option key={action} value={action}>
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Scope Filter */}
          <div>
            <label htmlFor="scope-filter" className="sr-only">
              Filter by scope
            </label>
            <select
              id="scope-filter"
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="w-full py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              aria-label="Filter permissions by scope"
            >
              <option value="all">All Scopes</option>
              {scopes.map(scope => (
                <option key={scope} value={scope}>
                  {scope.charAt(0).toUpperCase() + scope.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Show Inactive Toggles */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                id="show-inactive-roles"
                type="checkbox"
                checked={showInactiveRoles}
                onChange={(e) => setShowInactiveRoles(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-2 focus:ring-indigo-500 border-gray-300 rounded"
                aria-describedby="inactive-roles-description"
              />
              <span className="ml-2 text-sm text-gray-700">Inactive Roles</span>
              <span id="inactive-roles-description" className="sr-only">
                Show or hide inactive roles in the matrix
              </span>
            </label>
            <label className="flex items-center">
              <input
                id="show-inactive-permissions"
                type="checkbox"
                checked={showInactivePermissions}
                onChange={(e) => setShowInactivePermissions(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-2 focus:ring-indigo-500 border-gray-300 rounded"
                aria-describedby="inactive-permissions-description"
              />
              <span className="ml-2 text-sm text-gray-700">Inactive Permissions</span>
              <span id="inactive-permissions-description" className="sr-only">
                Show or hide inactive permissions in the matrix
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-auto max-h-96" id="matrix-table" tabIndex={0} role="region" aria-label="Permission matrix table">
        <table className="min-w-full divide-y divide-gray-200" role="table" aria-label="Role permissions matrix">
          <thead className="bg-gray-50 sticky top-0">
            <tr role="row">
              <th 
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10"
              >
                Role
              </th>
              {filteredData.permissions.map(permission => (
                <th
                  key={permission.id}
                  scope="col"
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]"
                  title={permission.description}
                  aria-label={`${permission.name} permission for ${permission.resource_type} ${permission.action}`}
                >
                  <div className="flex flex-col items-center">
                    <span className="truncate w-full">{permission.name}</span>
                    <span className="text-xs text-gray-400 mt-1" aria-hidden="true">
                      {permission.resource_type}:{permission.action}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.roles.map(role => (
              <tr key={role.id} className="hover:bg-gray-50" role="row">
                <th 
                  scope="row"
                  className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200"
                >
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {role.display_name}
                      </div>
                      <div className="text-sm text-gray-500" aria-label={`Level ${role.level}, ${role.permission_count} permissions`}>
                        Level {role.level} • {role.permission_count} permissions
                      </div>
                    </div>
                    {role.is_system_role && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800" aria-label="System role">
                        System
                      </span>
                    )}
                    {!role.is_active && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800" aria-label="Inactive role">
                        Inactive
                      </span>
                    )}
                  </div>
                </th>
                {filteredData.permissions.map(permission => {
                  const hasPermission = filteredData.matrix[role.id]?.[permission.id] || false;
                  const isSystemRole = role.is_system_role;
                  const isSystemPermission = permission.is_system_permission;
                  const isReadOnly = isSystemRole || isSystemPermission;

                  return (
                    <MatrixCell
                      key={permission.id}
                      roleId={role.id}
                      roleName={role.display_name}
                      permissionId={permission.id}
                      permissionName={permission.name}
                      hasPermission={hasPermission}
                      isReadOnly={isReadOnly}
                      isPending={updateRolePermissionMutation.isPending}
                      onToggle={handlePermissionToggle}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with summary */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>
            Showing {filteredData.roles.length} roles and {filteredData.permissions.length} permissions
          </span>
          <span>
            {updateRolePermissionMutation.isPending && (
              <span className="text-indigo-600">Updating permissions...</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}