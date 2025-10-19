'use client';

import { useState, useEffect } from 'react';
import { getAuthHeaders } from '../lib/api';

interface AuditEntry {
  id: number;
  action: string;
  entity_type: string;
  user_name?: string;
  target_user_name?: string;
  role_name?: string;
  permission_name?: string;
  reason?: string;
  timestamp: string;
  details?: Record<string, any>;
}

export default function AuditTrailTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  useEffect(() => {
    fetchAuditTrail();
  }, [page, actionFilter, entityFilter]);

  const fetchAuditTrail = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        size: '50',
      });
      if (actionFilter) params.append('action_type', actionFilter);
      if (entityFilter) params.append('entity_type', entityFilter);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}permissions/audit?${params}`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json();
      setEntries(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams({ format });
      if (actionFilter) params.append('action_type', actionFilter);
      if (entityFilter) params.append('entity_type', entityFilter);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}permissions/audit/export?${params}`,
        { headers: getAuthHeaders() }
      );

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_trail_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export audit trail');
    }
  };

  if (loading && entries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading audit trail...</span>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
      {/* Filters and Export */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action Type
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Actions</option>
              <option value="role_created">Role Created</option>
              <option value="role_assigned">Role Assigned</option>
              <option value="role_revoked">Role Revoked</option>
              <option value="permission_granted">Permission Granted</option>
              <option value="permission_revoked">Permission Revoked</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity Type
            </label>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Entities</option>
              <option value="role">Role</option>
              <option value="user_role">User Role</option>
              <option value="permission">Permission</option>
              <option value="user_permission">User Permission</option>
            </select>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map(entry => (
                <>
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.user_name || 'System'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {entry.target_user_name && <div>User: {entry.target_user_name}</div>}
                      {entry.role_name && <div>Role: {entry.role_name}</div>}
                      {entry.permission_name && <div>Permission: {entry.permission_name}</div>}
                      {entry.reason && <div className="text-xs text-gray-400">Reason: {entry.reason}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {expandedRow === entry.id ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  </tr>
                  {expandedRow === entry.id && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 bg-gray-50">
                        <div className="text-sm">
                          <h4 className="font-medium text-gray-900 mb-2">Full Details</h4>
                          <pre className="bg-white p-3 rounded border border-gray-200 overflow-x-auto text-xs">
                            {JSON.stringify(entry.details || entry, null, 2)}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-700">
            Showing page {page} of {totalPages} ({total} total entries)
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
