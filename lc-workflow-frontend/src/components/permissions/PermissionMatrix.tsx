"use client";

import React, { useState, useMemo } from 'react';
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

export default function PermissionMatrix({ className = '' }: PermissionMatrixProps) {
  const queryClient = useQueryClient();
  
  // State for filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [showInactiveRoles, setShowInactiveRoles] = useState(false);
  const [showInactivePermissions, setShowInactivePermissions] = useState(false);

  // Fetch permission matrix data
  const { data: matrixData, isLoading, error } = useQuery<PermissionMatrixData>({
    queryKey: ['permission-matrix'],
    queryFn: async () => {
      const response = await fetch('/api/permissions/matrix', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch permission matrix');
      }
      return response.json();
    }
  });

  // Mutation for updating role permissions
  const updateRolePermissionMutation = useMutation({
    mutationFn: async ({ roleId, permissionId, grant }: { 
      roleId: string; 
      permissionId: string; 
      grant: boolean; 
    }) => {
      const url = `/api/permissions/roles/${roleId}/permissions/${permissionId}`;
      const response = await fetch(url, {
        method: grant ? 'POST' : 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to ${grant ? 'grant' : 'revoke'} permission`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-matrix'] });
    }
  });

  // Filter roles and permissions based on search and filters
  const filteredData = useMemo(() => {
    if (!matrixData) return null;

    const filteredRoles = matrixData.roles.filter(role => {
      const matchesSearch = role.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           role.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesActive = showInactiveRoles || role.is_active;
      return matchesSearch && matchesActive;
    });

    const filteredPermissions = matrixData.permissions.filter(permission => {
      const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           permission.description.toLowerCase().includes(searchTerm.toLowerCase());
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
  }, [matrixData, searchTerm, selectedResourceType, selectedAction, selectedScope, showInactiveRoles, showInactivePermissions]);

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
  const handlePermissionToggle = (roleId: string, permissionId: string, currentValue: boolean) => {
    updateRolePermissionMutation.mutate({
      roleId,
      permissionId,
      grant: !currentValue
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
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading permission matrix</p>
            <p className="text-sm text-gray-500 mt-1">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!filteredData) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
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
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1.5" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search roles or permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-full"
              />
            </div>
          </div>

          {/* Resource Type Filter */}
          <div>
            <select
              value={selectedResourceType}
              onChange={(e) => setSelectedResourceType(e.target.value)}
              className="w-full py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
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
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
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
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="w-full py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
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
                type="checkbox"
                checked={showInactiveRoles}
                onChange={(e) => setShowInactiveRoles(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Inactive Roles</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showInactivePermissions}
                onChange={(e) => setShowInactivePermissions(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Inactive Permissions</span>
            </label>
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-auto max-h-96">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                Role
              </th>
              {filteredData.permissions.map(permission => (
                <th
                  key={permission.id}
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]"
                  title={permission.description}
                >
                  <div className="flex flex-col items-center">
                    <span className="truncate w-full">{permission.name}</span>
                    <span className="text-xs text-gray-400 mt-1">
                      {permission.resource_type}:{permission.action}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.roles.map(role => (
              <tr key={role.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {role.display_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Level {role.level} • {role.permission_count} permissions
                      </div>
                    </div>
                    {role.is_system_role && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        System
                      </span>
                    )}
                    {!role.is_active && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    )}
                  </div>
                </td>
                {filteredData.permissions.map(permission => {
                  const hasPermission = filteredData.matrix[role.id]?.[permission.id] || false;
                  const isSystemRole = role.is_system_role;
                  const isSystemPermission = permission.is_system_permission;
                  const isReadOnly = isSystemRole || isSystemPermission;

                  return (
                    <td key={permission.id} className="px-3 py-4 text-center">
                      <button
                        onClick={() => !isReadOnly && handlePermissionToggle(role.id, permission.id, hasPermission)}
                        disabled={isReadOnly || updateRolePermissionMutation.isPending}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                          hasPermission
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        } ${
                          isReadOnly
                            ? 'cursor-not-allowed opacity-50'
                            : 'cursor-pointer'
                        }`}
                        title={`${hasPermission ? 'Granted' : 'Not granted'} ${isReadOnly ? '(Read-only)' : ''}`}
                      >
                        {hasPermission ? (
                          <CheckSolidIcon className="h-5 w-5" />
                        ) : (
                          <XMarkIcon className="h-5 w-5" />
                        )}
                      </button>
                    </td>
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