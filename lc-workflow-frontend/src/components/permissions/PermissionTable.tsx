"use client";

import React, { useState, useMemo } from 'react';
import {
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import type { Permission } from '@/hooks/usePermissions';

interface PermissionTableProps {
  permissions: Permission[];
  loading?: boolean;
  error?: string | null;
  
  // Pagination
  pagination?: {
    page: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
  };
  
  // Selection for bulk operations
  selectedPermissions: string[];
  onSelectAll: () => void;
  onSelectPermission: (permissionId: string) => void;
  
  // Actions
  onEdit?: (permission: Permission) => void;
  onDelete?: (permissionId: string) => void;
  onToggleActive?: (permissionId: string, isActive: boolean) => void;
  
  // Bulk actions
  onBulkActivate?: (permissionIds: string[]) => void;
  onBulkDeactivate?: (permissionIds: string[]) => void;
  onBulkDelete?: (permissionIds: string[]) => void;
  
  // Search and filters
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    resourceType: string;
    action: string;
    scope: string;
    isActive: boolean | null;
  };
  onFilterChange: (key: string, value: any) => void;
  
  className?: string;
}

export default function PermissionTable({
  permissions,
  loading = false,
  error = null,
  pagination,
  selectedPermissions,
  onSelectAll,
  onSelectPermission,
  onEdit,
  onDelete,
  onToggleActive,
  onBulkActivate,
  onBulkDeactivate,
  onBulkDelete,
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  className = ''
}: PermissionTableProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Get unique values for filter dropdowns
  const resourceTypes = useMemo(() => {
    return [...new Set(permissions.map(p => p.resource_type))];
  }, [permissions]);

  const actions = useMemo(() => {
    return [...new Set(permissions.map(p => p.action))];
  }, [permissions]);

  const scopes = useMemo(() => {
    return [...new Set(permissions.map(p => p.scope))];
  }, [permissions]);

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Sort permissions
  const sortedPermissions = useMemo(() => {
    const sorted = [...permissions].sort((a, b) => {
      let aValue: any = a[sortBy as keyof Permission];
      let bValue: any = b[sortBy as keyof Permission];

      // Handle date sorting
      if (sortBy === 'created_at' || sortBy === 'updated_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Handle string sorting
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [permissions, sortBy, sortOrder]);

  // Check if all visible permissions are selected
  const allSelected = permissions.length > 0 && 
    permissions.every(p => selectedPermissions.includes(p.id));

  // Handle bulk delete with confirmation
  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedPermissions.length} permission(s)?`)) {
      onBulkDelete?.(selectedPermissions);
    }
  };

  // Handle single delete with confirmation
  const handleDelete = (permission: Permission) => {
    if (window.confirm(`Are you sure you want to delete "${permission.name}"?`)) {
      onDelete?.(permission.id);
    }
  };

  // Render sort icon
  const renderSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4" />
    ) : (
      <ChevronDownIcon className="h-4 w-4" />
    );
  };

  // Loading skeleton
  if (loading) {
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

  // Error state
  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="p-6">
          <div className="text-center text-red-600">
            <p className="font-medium">Error loading permissions</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header with search and filters */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-full"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
            {(filters.resourceType || filters.action || filters.scope || filters.isActive !== null) && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                Active
              </span>
            )}
          </button>
        </div>

        {/* Filter controls */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Resource Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resource Type
                </label>
                <select
                  value={filters.resourceType}
                  onChange={(e) => onFilterChange('resourceType', e.target.value)}
                  className="w-full py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Resources</option>
                  {resourceTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action
                </label>
                <select
                  value={filters.action}
                  onChange={(e) => onFilterChange('action', e.target.value)}
                  className="w-full py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Actions</option>
                  {actions.map(action => (
                    <option key={action} value={action}>
                      {action.charAt(0).toUpperCase() + action.slice(1).replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scope Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scope
                </label>
                <select
                  value={filters.scope}
                  onChange={(e) => onFilterChange('scope', e.target.value)}
                  className="w-full py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Scopes</option>
                  {scopes.map(scope => (
                    <option key={scope} value={scope}>
                      {scope.charAt(0).toUpperCase() + scope.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Active Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.isActive === null ? '' : filters.isActive.toString()}
                  onChange={(e) => onFilterChange('isActive', e.target.value === '' ? null : e.target.value === 'true')}
                  className="w-full py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk action toolbar */}
      {selectedPermissions.length > 0 && (
        <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-indigo-900">
              {selectedPermissions.length} permission(s) selected
            </span>
            <div className="flex items-center space-x-2">
              {onBulkActivate && (
                <button
                  onClick={() => onBulkActivate(selectedPermissions)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <CheckCircleIcon className="h-4 w-4 mr-1.5" />
                  Activate
                </button>
              )}
              {onBulkDeactivate && (
                <button
                  onClick={() => onBulkDeactivate(selectedPermissions)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  <XCircleIcon className="h-4 w-4 mr-1.5" />
                  Deactivate
                </button>
              )}
              {onBulkDelete && (
                <button
                  onClick={handleBulkDelete}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <TrashIcon className="h-4 w-4 mr-1.5" />
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Checkbox column */}
              <th className="px-6 py-3 text-left">
                <button
                  onClick={onSelectAll}
                  className="flex items-center justify-center w-5 h-5 text-indigo-600 hover:text-indigo-800"
                >
                  {allSelected ? (
                    <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center">
                      <CheckIcon className="h-3 w-3 text-white" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 border-2 border-indigo-600 rounded"></div>
                  )}
                </button>
              </th>

              {/* Name column */}
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Name</span>
                  {renderSortIcon('name')}
                </div>
              </th>

              {/* Resource Type column */}
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('resource_type')}
              >
                <div className="flex items-center space-x-1">
                  <span>Resource Type</span>
                  {renderSortIcon('resource_type')}
                </div>
              </th>

              {/* Action column */}
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('action')}
              >
                <div className="flex items-center space-x-1">
                  <span>Action</span>
                  {renderSortIcon('action')}
                </div>
              </th>

              {/* Scope column */}
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('scope')}
              >
                <div className="flex items-center space-x-1">
                  <span>Scope</span>
                  {renderSortIcon('scope')}
                </div>
              </th>

              {/* Created Date column */}
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center space-x-1">
                  <span>Created</span>
                  {renderSortIcon('created_at')}
                </div>
              </th>

              {/* Status column */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>

              {/* Actions column */}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedPermissions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    <p className="text-lg font-medium">No permissions found</p>
                    <p className="text-sm mt-1">
                      {searchTerm || filters.resourceType || filters.action || filters.scope
                        ? 'Try adjusting your search or filters'
                        : 'Get started by creating a new permission'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedPermissions.map((permission) => (
                <tr key={permission.id} className="hover:bg-gray-50">
                  {/* Checkbox */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => onSelectPermission(permission.id)}
                      className="flex items-center justify-center w-5 h-5 text-indigo-600 hover:text-indigo-800"
                    >
                      {selectedPermissions.includes(permission.id) ? (
                        <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center">
                          <CheckIcon className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 border-2 border-indigo-600 rounded"></div>
                      )}
                    </button>
                  </td>

                  {/* Name */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="text-sm font-medium text-gray-900">
                        {permission.name}
                      </div>
                      <div className="text-sm text-gray-500 max-w-xs truncate" title={permission.description}>
                        {permission.description}
                      </div>
                      {permission.is_system_permission && (
                        <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 w-fit">
                          System
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Resource Type */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {permission.resource_type}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {permission.action.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Scope */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {permission.scope}
                    </span>
                  </td>

                  {/* Created Date */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(permission.created_at).toLocaleDateString()}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {onToggleActive ? (
                      <button
                        onClick={() => onToggleActive(permission.id, !permission.is_active)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          permission.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                        disabled={permission.is_system_permission}
                        title={permission.is_system_permission ? 'System permissions cannot be toggled' : ''}
                      >
                        {permission.is_active ? 'Active' : 'Inactive'}
                      </button>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        permission.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {permission.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(permission)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                          title="Edit permission"
                          disabled={permission.is_system_permission}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => handleDelete(permission)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Delete permission"
                          disabled={permission.is_system_permission}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing{' '}
              <span className="font-medium">
                {((pagination.page - 1) * pagination.itemsPerPage) + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.itemsPerPage, pagination.totalItems)}
              </span>{' '}
              of{' '}
              <span className="font-medium">{pagination.totalItems}</span>{' '}
              results
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => pagination.onPageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === pagination.page
                          ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                  disabled={pagination.page === pagination.totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
