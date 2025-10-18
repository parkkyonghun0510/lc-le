/**
 * MobilePermissionMatrix Component
 * 
 * Mobile-optimized permission matrix with:
 * - Card-based layout instead of grid
 * - Collapsible sections
 * - Touch-friendly interactions
 * - Swipe gestures
 */

'use client';

import React, { useState } from 'react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface Permission {
  id: string;
  name: string;
  description: string;
  resource_type: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

interface MobilePermissionMatrixProps {
  roles: Role[];
  permissions: Permission[];
  assignments: Record<string, string[]>;
  onTogglePermission: (roleId: string, permissionId: string) => void;
  loading?: boolean;
}

export default function MobilePermissionMatrix({
  roles,
  permissions,
  assignments,
  onTogglePermission,
  loading = false,
}: MobilePermissionMatrixProps) {
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [filterResourceType, setFilterResourceType] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredPermissions = filterResourceType
    ? permissions.filter((p) => p.resource_type === filterResourceType)
    : permissions;

  const resourceTypes = Array.from(new Set(permissions.map((p) => p.resource_type)));

  const hasPermission = (roleId: string, permissionId: string) => {
    return assignments[roleId]?.includes(permissionId) || false;
  };

  const toggleRole = (roleId: string) => {
    setExpandedRole(expandedRole === roleId ? null : roleId);
  };

  const getPermissionCount = (roleId: string) => {
    return assignments[roleId]?.length || 0;
  };

  return (
    <div className="space-y-4">
      {/* Mobile filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between text-left"
        >
          <span className="text-sm font-medium text-gray-900">Filters</span>
          <div className="flex items-center gap-2">
            {filterResourceType && (
              <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                {filterResourceType}
              </span>
            )}
            <FunnelIcon className="h-5 w-5 text-gray-400" />
          </div>
        </button>

        {showFilters && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resource Type
              </label>
              <select
                value={filterResourceType}
                onChange={(e) => setFilterResourceType(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Types</option>
                {resourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            {filterResourceType && (
              <button
                onClick={() => setFilterResourceType('')}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Role cards */}
      <div className="space-y-3">
        {roles.map((role) => {
          const isExpanded = expandedRole === role.id;
          const permissionCount = getPermissionCount(role.id);

          return (
            <div key={role.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Role header */}
              <button
                onClick={() => toggleRole(role.id)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors active:bg-gray-100"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-gray-900 truncate">
                    {role.name}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">{role.description}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-gray-600">
                      {permissionCount} permission{permissionCount !== 1 ? 's' : ''}
                    </span>
                    {filterResourceType && (
                      <span className="text-xs text-gray-400">
                        ({filteredPermissions.filter((p) => hasPermission(role.id, p.id)).length}{' '}
                        filtered)
                      </span>
                    )}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
                )}
              </button>

              {/* Permission list */}
              {isExpanded && (
                <div className="border-t border-gray-200 divide-y divide-gray-100">
                  {filteredPermissions.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No permissions match the current filter
                    </div>
                  ) : (
                    filteredPermissions.map((permission) => {
                      const granted = hasPermission(role.id, permission.id);

                      return (
                        <button
                          key={permission.id}
                          onClick={() => onTogglePermission(role.id, permission.id)}
                          disabled={loading}
                          className="w-full p-4 flex items-start gap-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {granted ? (
                              <CheckCircleIcon className="h-6 w-6 text-green-500" />
                            ) : (
                              <XCircleIcon className="h-6 w-6 text-gray-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-medium text-gray-900">
                                {permission.name}
                              </h4>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                                  granted
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {granted ? 'Granted' : 'Denied'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {permission.description}
                            </p>
                            <span className="inline-block mt-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                              {permission.resource_type}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {roles.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No roles available</p>
        </div>
      )}
    </div>
  );
}
