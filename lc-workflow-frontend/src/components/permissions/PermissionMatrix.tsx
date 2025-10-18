"use client";

/**
 * Permission Matrix Component
 * 
 * Interactive grid showing roles vs permissions with visual indicators.
 * Supports click-to-toggle, filtering, search, and export functionality.
 */

import React, { useState, useMemo } from 'react';
import { 
  usePermissionMatrix, 
  useAssignPermissionToRole, 
  useRevokePermissionFromRole 
} from '@/hooks/usePermissionManagement';
import { PermissionMatrixSkeleton } from './PermissionLoadingStates';
import { 
  ResourceType, 
  PermissionAction,
  type PermissionMatrixRole,
  type PermissionMatrixPermission 
} from '@/types/permissions';
import { 
  Search, 
  Filter, 
  Download, 
  Check, 
  X, 
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PermissionMatrixProps {
  onPermissionChange?: () => void;
}

export default function PermissionMatrix({ onPermissionChange }: PermissionMatrixProps) {
  const { data: matrixData, isLoading, error } = usePermissionMatrix();
  const assignPermission = useAssignPermissionToRole();
  const revokePermission = useRevokePermissionFromRole();

  // Filter states
  const [roleSearch, setRoleSearch] = useState('');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<ResourceType[]>([]);
  const [selectedActions, setSelectedActions] = useState<PermissionAction[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    roleId: string;
    permissionId: string;
    roleName: string;
    permissionName: string;
    isGranting: boolean;
  } | null>(null);

  // Filter and search logic
  const filteredRoles = useMemo(() => {
    if (!matrixData?.roles) return [];
    
    return matrixData.roles.filter(role => {
      const matchesSearch = roleSearch === '' || 
        role.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
        role.display_name.toLowerCase().includes(roleSearch.toLowerCase());
      
      return matchesSearch;
    });
  }, [matrixData?.roles, roleSearch]);

  const filteredPermissions = useMemo(() => {
    if (!matrixData?.permissions) return [];
    
    return matrixData.permissions.filter(permission => {
      const matchesSearch = permissionSearch === '' ||
        permission.name.toLowerCase().includes(permissionSearch.toLowerCase()) ||
        permission.description.toLowerCase().includes(permissionSearch.toLowerCase());
      
      const matchesResourceType = selectedResourceTypes.length === 0 ||
        selectedResourceTypes.includes(permission.resource_type);
      
      const matchesAction = selectedActions.length === 0 ||
        selectedActions.includes(permission.action);
      
      return matchesSearch && matchesResourceType && matchesAction;
    });
  }, [matrixData?.permissions, permissionSearch, selectedResourceTypes, selectedActions]);

  // Group permissions by resource type for better organization
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, PermissionMatrixPermission[]> = {};
    
    filteredPermissions.forEach(permission => {
      const type = permission.resource_type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(permission);
    });
    
    return groups;
  }, [filteredPermissions]);

  // Check if a role has a permission
  const hasPermission = (roleId: string, permissionId: string): boolean => {
    return matrixData?.assignments[roleId]?.includes(permissionId) || false;
  };

  // Handle permission toggle
  const handleTogglePermission = async (
    roleId: string, 
    permissionId: string,
    roleName: string,
    permissionName: string,
    currentlyHas: boolean
  ) => {
    // Show confirmation for critical permissions
    const isCritical = permissionName.toLowerCase().includes('delete') || 
                       permissionName.toLowerCase().includes('manage') ||
                       permissionName.toLowerCase().includes('system');
    
    if (isCritical && !currentlyHas) {
      setConfirmDialog({
        show: true,
        roleId,
        permissionId,
        roleName,
        permissionName,
        isGranting: true
      });
      return;
    }

    await executeToggle(roleId, permissionId, currentlyHas);
  };

  const executeToggle = async (roleId: string, permissionId: string, currentlyHas: boolean) => {
    try {
      if (currentlyHas) {
        await revokePermission.mutateAsync({ roleId, permissionId });
      } else {
        await assignPermission.mutateAsync({ roleId, permissionId });
      }
      onPermissionChange?.();
    } catch (error: any) {
      // Error handling is done in the mutation hooks
      console.error('Failed to toggle permission:', error);
    }
  };

  const handleConfirmToggle = async () => {
    if (!confirmDialog) return;
    
    await executeToggle(
      confirmDialog.roleId, 
      confirmDialog.permissionId, 
      !confirmDialog.isGranting
    );
    setConfirmDialog(null);
  };

  // Export functionality
  const handleExport = () => {
    if (!matrixData) return;

    const csvRows: string[] = [];
    
    // Header row
    const headers = ['Role', ...filteredPermissions.map(p => p.name)];
    csvRows.push(headers.join(','));
    
    // Data rows
    filteredRoles.forEach(role => {
      const row = [
        role.display_name,
        ...filteredPermissions.map(permission => 
          hasPermission(role.id, permission.id) ? 'Yes' : 'No'
        )
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `permission-matrix-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Permission matrix exported successfully');
  };

  // Toggle resource type filter
  const toggleResourceType = (type: ResourceType) => {
    setSelectedResourceTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Toggle action filter
  const toggleAction = (action: PermissionAction) => {
    setSelectedActions(prev =>
      prev.includes(action)
        ? prev.filter(a => a !== action)
        : [...prev, action]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setRoleSearch('');
    setPermissionSearch('');
    setSelectedResourceTypes([]);
    setSelectedActions([]);
  };

  if (isLoading) {
    return <PermissionMatrixSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
          <AlertCircle className="h-5 w-5" />
          <h3 className="font-semibold">Failed to load permission matrix</h3>
        </div>
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
      </div>
    );
  }

  if (!matrixData) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Permission Matrix
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View and manage role-permission assignments
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Filter className="h-4 w-4" />
            Filters
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Role Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Roles
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  placeholder="Search by role name..."
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Permission Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Permissions
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={permissionSearch}
                  onChange={(e) => setPermissionSearch(e.target.value)}
                  placeholder="Search by permission name..."
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Resource Type Filters */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Resource Types
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.values(ResourceType).map(type => (
                <button
                  key={type}
                  onClick={() => toggleResourceType(type)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedResourceTypes.includes(type)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Action Filters */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Actions
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.values(PermissionAction).map(action => (
                <button
                  key={action}
                  onClick={() => toggleAction(action)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedActions.includes(action)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {(roleSearch || permissionSearch || selectedResourceTypes.length > 0 || selectedActions.length > 0) && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Matrix Grid */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden">
              {Object.entries(groupedPermissions).map(([resourceType, permissions]) => (
                <div key={resourceType} className="mb-6 last:mb-0">
                  {/* Resource Type Header */}
                  <div className="sticky left-0 bg-gray-50 dark:bg-gray-900 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                      {resourceType}
                    </h3>
                  </div>

                  {/* Matrix Table */}
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th 
                          scope="col" 
                          className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700"
                        >
                          Role
                        </th>
                        {permissions.map(permission => (
                          <th
                            key={permission.id}
                            scope="col"
                            className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[100px]"
                            title={permission.description}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-semibold">{permission.action}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredRoles.map(role => (
                        <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col">
                              <span>{role.display_name}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Level {role.level}
                              </span>
                            </div>
                          </td>
                          {permissions.map(permission => {
                            const has = hasPermission(role.id, permission.id);
                            return (
                              <td
                                key={permission.id}
                                className="px-3 py-3 whitespace-nowrap text-center"
                              >
                                <button
                                  onClick={() => handleTogglePermission(
                                    role.id,
                                    permission.id,
                                    role.display_name,
                                    permission.name,
                                    has
                                  )}
                                  disabled={assignPermission.isPending || revokePermission.isPending}
                                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                                    has
                                      ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-500 dark:hover:bg-gray-600'
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  title={has ? 'Click to revoke' : 'Click to grant'}
                                >
                                  {has ? (
                                    <Check className="h-5 w-5" />
                                  ) : (
                                    <X className="h-5 w-5" />
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
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredRoles.length} role{filteredRoles.length !== 1 ? 's' : ''} and{' '}
        {filteredPermissions.length} permission{filteredPermissions.length !== 1 ? 's' : ''}
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Confirm Critical Permission</h3>
            </div>
            
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              You are about to grant the permission <strong>{confirmDialog.permissionName}</strong> to the role{' '}
              <strong>{confirmDialog.roleName}</strong>. This is a critical permission that may affect system security.
            </p>
            
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to continue?
            </p>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmToggle}
                className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
