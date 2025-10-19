"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  XMarkIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { Permission } from '@/hooks/usePermissions';
import { useDraftSaving } from '@/hooks/useDraftSaving';

interface PermissionFormProps {
  permission?: Permission;
  onSubmit: (data: PermissionFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface PermissionFormData {
  name: string;
  description: string;
  resource_type: string;
  action: string;
  scope: string;
  conditions?: string;
  is_active: boolean;
}

const RESOURCE_TYPES = [
  { value: 'user', label: 'User' },
  { value: 'application', label: 'Application' },
  { value: 'department', label: 'Department' },
  { value: 'branch', label: 'Branch' },
  { value: 'file', label: 'File' },
  { value: 'folder', label: 'Folder' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'notification', label: 'Notification' },
  { value: 'audit', label: 'Audit' },
  { value: 'system', label: 'System' },
];

const ACTIONS = [
  { value: 'create', label: 'Create' },
  { value: 'read', label: 'Read' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
  { value: 'assign', label: 'Assign' },
  { value: 'export', label: 'Export' },
  { value: 'import', label: 'Import' },
  { value: 'manage', label: 'Manage' },
  { value: 'view_all', label: 'View All' },
  { value: 'view_own', label: 'View Own' },
  { value: 'view_team', label: 'View Team' },
  { value: 'view_department', label: 'View Department' },
  { value: 'view_branch', label: 'View Branch' },
];

const SCOPES = [
  { value: 'global', label: 'Global' },
  { value: 'department', label: 'Department' },
  { value: 'branch', label: 'Branch' },
  { value: 'team', label: 'Team' },
  { value: 'own', label: 'Own' },
];

export default function PermissionForm({
  permission,
  onSubmit,
  onCancel,
  loading = false,
}: PermissionFormProps) {
  const isEditMode = !!permission;
  const draftKey = `permission-form-${permission?.id || 'new'}`;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    setValue,
    reset,
  } = useForm<PermissionFormData>({
    defaultValues: permission
      ? {
          name: permission.name,
          description: permission.description,
          resource_type: permission.resource_type,
          action: permission.action,
          scope: permission.scope,
          conditions: '',
          is_active: permission.is_active,
        }
      : {
          name: '',
          description: '',
          resource_type: '',
          action: '',
          scope: '',
          conditions: '',
          is_active: true,
        },
  });

  // Draft saving with auto-save every 30 seconds
  const {
    saveDraft,
    restoreDraft,
    clearDraft,
    hasDraft,
    hasUnsavedChanges,
    setHasUnsavedChanges,
  } = useDraftSaving<PermissionFormData>({
    draftKey: draftKey,
    formType: 'permission',
    autoSaveInterval: 30000, // 30 seconds
  });

  // Restore draft on mount
  useEffect(() => {
    if (hasDraft) {
      const draft = restoreDraft();
      if (draft) {
        Object.entries(draft).forEach(([key, value]) => {
          setValue(key as keyof PermissionFormData, value);
        });
      }
    }
  }, []);

  // Watch form values for auto-save
  const formValues = watch();

  // Auto-save draft when form changes
  useEffect(() => {
    if (isDirty && !isEditMode) {
      saveDraft(formValues);
    }
  }, [formValues, isDirty, isEditMode, saveDraft]);

  // Load draft on mount (already handled above in the first useEffect)

  const handleFormSubmit = async (data: PermissionFormData) => {
    try {
      await onSubmit(data);
      clearDraft();
      reset();
    } catch (error) {
      // Error handling is done in parent component
      console.error('Form submission error:', error);
    }
  };

  const handleCancel = () => {
    if (isDirty && !isEditMode && hasUnsavedChanges) {
      // Show confirmation dialog for unsaved changes
      if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        clearDraft();
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  // Validate JSON conditions
  const validateConditions = (value: string) => {
    if (!value || value.trim() === '') return true;
    try {
      JSON.parse(value);
      return true;
    } catch {
      return 'Invalid JSON format';
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Name Field */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Permission Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            {...register('name', {
              required: 'Permission name is required',
              minLength: {
                value: 3,
                message: 'Name must be at least 3 characters',
              },
              maxLength: {
                value: 100,
                message: 'Name must not exceed 100 characters',
              },
              pattern: {
                value: /^[a-zA-Z0-9_]+$/,
                message: 'Name can only contain letters, numbers, and underscores',
              },
            })}
            disabled={loading || isEditMode}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="e.g., application_approve"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
          {isEditMode && (
            <p className="mt-1 text-xs text-gray-500">
              Permission name cannot be changed after creation
            </p>
          )}
        </div>

        {/* Description Field */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            rows={3}
            {...register('description', {
              required: 'Description is required',
              maxLength: {
                value: 500,
                message: 'Description must not exceed 500 characters',
              },
            })}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Describe what this permission allows users to do"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">
              {errors.description.message}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {watch('description')?.length || 0} / 500 characters
          </p>
        </div>

        {/* Resource Type Field */}
        <div>
          <label
            htmlFor="resource_type"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Resource Type <span className="text-red-500">*</span>
          </label>
          <select
            id="resource_type"
            {...register('resource_type', {
              required: 'Resource type is required',
            })}
            disabled={loading || isEditMode}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Select a resource type</option>
            {RESOURCE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {errors.resource_type && (
            <p className="mt-1 text-sm text-red-600">
              {errors.resource_type.message}
            </p>
          )}
        </div>

        {/* Action Field */}
        <div>
          <label
            htmlFor="action"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Action <span className="text-red-500">*</span>
          </label>
          <select
            id="action"
            {...register('action', {
              required: 'Action is required',
            })}
            disabled={loading || isEditMode}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Select an action</option>
            {ACTIONS.map((action) => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </select>
          {errors.action && (
            <p className="mt-1 text-sm text-red-600">{errors.action.message}</p>
          )}
        </div>

        {/* Scope Field */}
        <div>
          <label
            htmlFor="scope"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Scope <span className="text-red-500">*</span>
          </label>
          <select
            id="scope"
            {...register('scope', {
              required: 'Scope is required',
            })}
            disabled={loading || isEditMode}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Select a scope</option>
            {SCOPES.map((scope) => (
              <option key={scope.value} value={scope.value}>
                {scope.label}
              </option>
            ))}
          </select>
          {errors.scope && (
            <p className="mt-1 text-sm text-red-600">{errors.scope.message}</p>
          )}
        </div>

        {/* Conditions Field (Optional) */}
        <div>
          <label
            htmlFor="conditions"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Conditions (JSON)
          </label>
          <div className="relative">
            <textarea
              id="conditions"
              rows={5}
              {...register('conditions', {
                validate: (value) => {
                  if (!value || value.trim() === '') return true;
                  try {
                    JSON.parse(value);
                    return true;
                  } catch {
                    return 'Invalid JSON format';
                  }
                },
              })}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-sm"
              placeholder='{"department_id": "123", "branch_id": "456"}'
            />
            <div className="absolute top-2 right-2">
              <div className="group relative">
                <InformationCircleIcon className="h-5 w-5 text-gray-400 cursor-help" />
                <div className="hidden group-hover:block absolute right-0 top-6 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  Optional JSON object for additional permission conditions. Must be valid JSON format.
                </div>
              </div>
            </div>
          </div>
          {errors.conditions && (
            <p className="mt-1 text-sm text-red-600">
              {errors.conditions.message}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Optional: Add custom conditions as a JSON object
          </p>
        </div>

        {/* Active Status Field */}
        <div className="flex items-center">
          <input
            id="is_active"
            type="checkbox"
            {...register('is_active')}
            disabled={loading}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
            Active
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
          >
            {loading && (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            )}
            {isEditMode ? 'Update Permission' : 'Create Permission'}
          </button>
        </div>
      </form>


    </>
  );
}
