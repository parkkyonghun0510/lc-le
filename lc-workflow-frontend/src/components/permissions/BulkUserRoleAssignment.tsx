"use client";

/**
 * Bulk User Role Assignment Modal
 * 
 * Allows assigning a role to multiple users at once.
 */

import React, { useState } from 'react';
import { X, Users, Shield, AlertCircle } from 'lucide-react';
import { useBulkAssignRoles, useRoleList } from '@/hooks/usePermissionManagement';
import { User } from '@/types/models';

interface BulkUserRoleAssignmentProps {
  selectedUsers: User[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function BulkUserRoleAssignment({ selectedUsers, onClose, onSuccess }: BulkUserRoleAssignmentProps) {
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: rolesData, isLoading: rolesLoading } = useRoleList({
    is_active: true,
    search: searchQuery,
    size: 100,
  });

  const bulkAssignMutation = useBulkAssignRoles();

  const roles = rolesData?.items || [];

  const handleAssign = async () => {
    if (!selectedRoleId || selectedUsers.length === 0) return;

    try {
      await bulkAssignMutation.mutateAsync({
        user_ids: selectedUsers.map(u => u.id),
        role_id: selectedRoleId,
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Bulk Role Assignment
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Assign a role to {selectedUsers.length} selected {selectedUsers.length === 1 ? 'user' : 'users'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Selected Users Summary */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Selected Users ({selectedUsers.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedUsers.slice(0, 5).map((user) => (
                <span
                  key={user.id}
                  className="px-2 py-1 bg-white dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600"
                >
                  {user.first_name} {user.last_name}
                </span>
              ))}
              {selectedUsers.length > 5 && (
                <span className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400">
                  +{selectedUsers.length - 5} more
                </span>
              )}
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Role to Assign
            </label>

            {/* Search */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search roles..."
              className="w-full px-4 py-2 mb-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />

            {/* Role List */}
            {rolesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : roles.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No roles found
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedRoleId === role.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role.id}
                      checked={selectedRoleId === role.id}
                      onChange={(e) => setSelectedRoleId(e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {role.display_name}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          Level {role.level}
                        </span>
                        {role.is_system_role && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
                            System
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {role.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium mb-1">Important</p>
              <p>
                This will assign the selected role to all {selectedUsers.length} users. 
                Users may already have other roles assigned.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedRoleId || bulkAssignMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bulkAssignMutation.isPending ? 'Assigning...' : `Assign to ${selectedUsers.length} Users`}
          </button>
        </div>
      </div>
    </div>
  );
}
