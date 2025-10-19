'use client';

import { useState, useEffect } from 'react';
import { getAuthHeaders } from '../lib/api';

interface Role {
  id: string;
  name: string;
  display_name: string;
  level: number;
  is_system_role: boolean;
}

interface Permission {
  id: string;
  name: string;
  resource_type: string;
  action: string;
  scope: string | null;
  is_system_permission: boolean;
}

interface MatrixData {
  roles: Role[];
  permissions: Permission[];
  assignments: Record<string, string[]>;
}

export default function PermissionMatrixTab() {
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');

  useEffect(() => {
    fetchMatrixData();
  }, []);

  const fetchMatrixData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}permissions/matrix`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch permission matrix');
      }

      const data = await response.json();
      setMatrixData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (roleId: string, permissionId: string, currentlyGranted: boolean) => {
    const role = matrixData?.roles.find(r => r.id === roleId);
    
    if (role?.is_system_role) {
      alert('Cannot modify system role permissions');
      return;
    }

    // Optimistic update
    const previousData = matrixData;
    if (matrixData) {
      const newAssignments = { ...matrixData.assignments };
      if (currentlyGranted) {
        newAssignments[roleId] = newAssignments[roleId].filter(id => id !== permissionId);
      } else {
        newAssignments[roleId] = [...(newAssignments[roleId] || []), permissionId];
      }
      setMatrixData({ ...matrixData, assignments: newAssignments });
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}permissions/matrix/toggle`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role_id: roleId,
          permission_id: permissionId,
          is_granted: !currentlyGranted,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle permission');
      }
    } catch (err) {
      // Rollback on error
      if (previousData) {
        setMatrixData(previousData);
      }
      alert(err instanceof Error ? err.message : 'Failed to update permission');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading matrix...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800">Error: {error}</p>
          <button
            onClick={fetchMatrixData}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!matrixData) {
    return null;
  }

  // Get unique resource types, actions, and scopes for filters
  const resourceTypes = ['all', ...new Set(matrixData.permissions.map(p => p.resource_type))];
  const actions = ['all', ...new Set(matrixData.permissions.map(p => p.action))];
  const scopes = ['all', ...new Set(matrixData.permissions.map(p => p.scope).filter((s): s is string => s !== null))];

  // Filter permissions
  const filteredPermissions = matrixData.permissions.filter(p => {
    if (resourceFilter !== 'all' && p.resource_type !== resourceFilter) return false;
    if (actionFilter !== 'all' && p.action !== actionFilter) return false;
    if (scopeFilter !== 'all' && p.scope !== scopeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resource Type
            </label>
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {resourceTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Resources' : type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {actions.map(action => (
                <option key={action} value={action}>
                  {action === 'all' ? 'All Actions' : action}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scope
            </label>
            <select
              value={scopeFilter || ''}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {scopes.map(scope => (
                <option key={scope} value={scope}>
                  {scope === 'all' ? 'All Scopes' : scope}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Matrix */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Role
                </th>
                {filteredPermissions.map(permission => (
                  <th
                    key={permission.id}
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    title={permission.name}
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-semibold">{permission.resource_type}</span>
                      <span className="text-xs">{permission.action}</span>
                      {permission.scope && (
                        <span className="text-xs text-gray-400">{permission.scope}</span>
                      )}
                      {permission.is_system_permission && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                          System
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {matrixData.roles.map(role => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                    <div className="flex items-center space-x-2">
                      <span>{role.display_name}</span>
                      {role.is_system_role && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          System
                        </span>
                      )}
                      <span className="text-xs text-gray-500">L{role.level}</span>
                    </div>
                  </td>
                  {filteredPermissions.map(permission => {
                    const isGranted = matrixData.assignments[role.id]?.includes(permission.id) || false;
                    return (
                      <td key={permission.id} className="px-3 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isGranted}
                          onChange={() => togglePermission(role.id, permission.id, isGranted)}
                          disabled={role.is_system_role}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title={role.is_system_role ? 'Cannot modify system role' : undefined}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Legend</h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-2">
              System
            </span>
            <span className="text-gray-600">System role (cannot be modified)</span>
          </div>
          <div className="flex items-center">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mr-2">
              System
            </span>
            <span className="text-gray-600">System permission</span>
          </div>
        </div>
      </div>
    </div>
  );
}
