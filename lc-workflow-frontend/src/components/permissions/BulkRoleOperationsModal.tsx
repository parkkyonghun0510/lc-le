"use client";

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Role {
  id: string;
  name: string;
  display_name: string;
  level: number;
  is_active: boolean;
}

interface BulkRoleOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRoles: Role[];
  onComplete: () => void;
}

type BulkOperation = 'activate' | 'deactivate' | 'delete' | 'change_level';

export default function BulkRoleOperationsModal({
  isOpen,
  onClose,
  selectedRoles,
  onComplete
}: BulkRoleOperationsModalProps) {
  const [operation, setOperation] = useState<BulkOperation>('activate');
  const [newLevel, setNewLevel] = useState<number>(50);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const roleIds = selectedRoles.map(r => r.id);
      
      let endpoint = '';
      let body: any = { role_ids: roleIds };

      switch (operation) {
        case 'activate':
          endpoint = '/api/v1/permissions/roles/bulk-activate';
          break;
        case 'deactivate':
          endpoint = '/api/v1/permissions/roles/bulk-deactivate';
          break;
        case 'delete':
          endpoint = '/api/v1/permissions/roles/bulk-delete';
          break;
        case 'change_level':
          endpoint = '/api/v1/permissions/roles/bulk-update-level';
          body.new_level = newLevel;
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error('Bulk operation failed');
      }

      const result = await response.json();
      
      toast.success(
        `Bulk operation completed: ${result.success_count || selectedRoles.length} roles updated`,
        { duration: 4000 }
      );
      
      onComplete();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Bulk operation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-operations-title"
    >
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 id="bulk-operations-title" className="text-lg font-medium text-gray-900">
              Bulk Role Operations
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded"
              aria-label="Close bulk operations"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{selectedRoles.length}</span> role
              {selectedRoles.length !== 1 ? 's' : ''} selected
            </p>
            <div className="mt-2 max-h-32 overflow-y-auto">
              <ul className="text-xs text-gray-600 space-y-1">
                {selectedRoles.map(role => (
                  <li key={role.id} className="flex items-center justify-between">
                    <span>{role.display_name}</span>
                    <span className="text-gray-400">Level {role.level}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="operation" className="block text-sm font-medium text-gray-700 mb-2">
                Select Operation
              </label>
              <select
                id="operation"
                value={operation}
                onChange={(e) => setOperation(e.target.value as BulkOperation)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="activate">Activate Roles</option>
                <option value="deactivate">Deactivate Roles</option>
                <option value="change_level">Change Level</option>
                <option value="delete">Delete Roles</option>
              </select>
            </div>

            {operation === 'change_level' && (
              <div>
                <label htmlFor="new-level" className="block text-sm font-medium text-gray-700 mb-2">
                  New Level (0-100)
                </label>
                <input
                  id="new-level"
                  type="number"
                  min="0"
                  max="100"
                  value={newLevel}
                  onChange={(e) => setNewLevel(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            )}

            {operation === 'delete' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This action cannot be undone. Roles that are assigned to users cannot be deleted.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 ${
                  operation === 'delete'
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                }`}
              >
                {isProcessing ? 'Processing...' : 'Apply Operation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
