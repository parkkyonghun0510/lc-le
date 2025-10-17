/**
 * PermissionAuditTrail Component
 * 
 * Displays audit trail for permission changes with filtering, pagination, and export.
 * Tracks all permission-related actions including permission changes, role assignments,
 * and direct permission grants/revocations.
 */

'use client';

import React, { useState } from 'react';
import {
  ChartBarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  ShieldCheckIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useAuditTrailRealtime } from '@/hooks/useAuditTrail';
import type { AuditActionType, AuditEntityType } from '@/types/permissions';

export default function PermissionAuditTrail() {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    action_type: '' as AuditActionType | '',
    entity_type: '' as AuditEntityType | '',
    search: '',
    start_date: '',
    end_date: '',
  });

  const {
    entries,
    total,
    page,
    size,
    pages,
    isLoading,
    setFilters: applyFilters,
    setPage,
    clearFilters,
    exportToCSV,
    refetch,
  } = useAuditTrailRealtime(
    {
      ...filters,
      action_type: filters.action_type || undefined,
      entity_type: filters.entity_type || undefined,
      search: filters.search || undefined,
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
    },
    30000 // Poll every 30 seconds
  );

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    applyFilters({
      action_type: filters.action_type || undefined,
      entity_type: filters.entity_type || undefined,
      search: filters.search || undefined,
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
    });
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setFilters({
      action_type: '',
      entity_type: '',
      search: '',
      start_date: '',
      end_date: '',
    });
    clearFilters();
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('created') || action.includes('granted') || action.includes('assigned')) {
      return 'bg-green-100 text-green-800';
    }
    if (action.includes('deleted') || action.includes('revoked')) {
      return 'bg-red-100 text-red-800';
    }
    if (action.includes('updated') || action.includes('toggled')) {
      return 'bg-blue-100 text-blue-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getActionIcon = (action: string) => {
    if (action.includes('created') || action.includes('granted') || action.includes('assigned')) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    }
    if (action.includes('deleted') || action.includes('revoked')) {
      return <XCircleIcon className="h-5 w-5 text-red-500" />;
    }
    return <ChartBarIcon className="h-5 w-5 text-blue-500" />;
  };

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const hasActiveFilters = filters.action_type || filters.entity_type || filters.search || filters.start_date || filters.end_date;

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
            aria-label="Toggle filters"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-600 text-white text-xs">
                !
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              aria-label="Clear all filters"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            aria-label="Refresh audit trail"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={exportToCSV}
            disabled={isLoading || entries.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Export audit trail to CSV"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Action Type Filter */}
            <div>
              <label htmlFor="action-type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Action Type
              </label>
              <select
                id="action-type-filter"
                value={filters.action_type}
                onChange={(e) => handleFilterChange('action_type', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Actions</option>
                <option value="permission_created">Permission Created</option>
                <option value="permission_updated">Permission Updated</option>
                <option value="permission_deleted">Permission Deleted</option>
                <option value="permission_toggled">Permission Toggled</option>
                <option value="role_created">Role Created</option>
                <option value="role_updated">Role Updated</option>
                <option value="role_deleted">Role Deleted</option>
                <option value="role_assigned">Role Assigned</option>
                <option value="role_revoked">Role Revoked</option>
                <option value="permission_granted">Permission Granted</option>
                <option value="permission_revoked">Permission Revoked</option>
                <option value="role_permission_assigned">Role Permission Assigned</option>
                <option value="role_permission_revoked">Role Permission Revoked</option>
              </select>
            </div>

            {/* Entity Type Filter */}
            <div>
              <label htmlFor="entity-type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Entity Type
              </label>
              <select
                id="entity-type-filter"
                value={filters.entity_type}
                onChange={(e) => handleFilterChange('entity_type', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Types</option>
                <option value="permission">Permission</option>
                <option value="role">Role</option>
                <option value="user_role">User Role</option>
                <option value="user_permission">User Permission</option>
                <option value="role_permission">Role Permission</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label htmlFor="search-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  id="search-filter"
                  type="text"
                  placeholder="Search in details..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label htmlFor="start-date-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                id="start-date-filter"
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="end-date-filter" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                id="end-date-filter"
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Filter Actions */}
          <div className="mt-4 flex justify-end space-x-3">
            <button
              onClick={() => setShowFilters(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Audit Entries */}
      <div className="bg-white rounded-lg shadow">
        {isLoading && entries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Loading audit trail...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <ChartBarIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Audit Entries</h3>
            <p className="text-gray-500">
              {hasActiveFilters
                ? 'No audit entries match your filters. Try adjusting your search criteria.'
                : 'No audit entries have been recorded yet.'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                  role="article"
                  aria-label={`Audit entry: ${formatAction(entry.action)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getActionIcon(entry.action)}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionBadgeColor(
                            entry.action
                          )}`}
                        >
                          {formatAction(entry.action)}
                        </span>
                        {entry.entity_type && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {entry.entity_type}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {/* Target Information */}
                        {entry.target_user_name && (
                          <div className="flex items-center text-sm text-gray-900">
                            <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="font-medium">Target:</span>
                            <span className="ml-1">{entry.target_user_name}</span>
                          </div>
                        )}

                        {/* Permission/Role Information */}
                        {(entry.permission_name || entry.role_name) && (
                          <div className="flex items-center text-sm text-gray-900">
                            <ShieldCheckIcon className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="font-medium">
                              {entry.permission_name ? 'Permission:' : 'Role:'}
                            </span>
                            <span className="ml-1">{entry.permission_name || entry.role_name}</span>
                          </div>
                        )}

                        {/* Reason */}
                        {entry.reason && (
                          <div className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Reason:</span> {entry.reason}
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                          <div className="flex items-center">
                            <UserIcon className="h-3 w-3 mr-1" />
                            <span>by {entry.user_name || entry.user_id || 'System'}</span>
                          </div>
                          <div className="flex items-center">
                            <ClockIcon className="h-3 w-3 mr-1" />
                            <span>{new Date(entry.timestamp).toLocaleString()}</span>
                          </div>
                          {entry.ip_address && (
                            <span className="text-gray-400">IP: {entry.ip_address}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Showing {(page - 1) * size + 1}-{Math.min(page * size, total)} of {total} entries
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Previous page"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    Page {page} of {pages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === pages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Next page"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
