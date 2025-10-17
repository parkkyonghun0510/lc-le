"use client";

import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import PermissionForm, { PermissionFormData } from './PermissionForm';
import { Permission } from '@/hooks/usePermissions';

interface PermissionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  permission?: Permission;
  onSubmit: (data: PermissionFormData) => Promise<void>;
  loading?: boolean;
}

export default function PermissionFormModal({
  isOpen,
  onClose,
  permission,
  onSubmit,
  loading = false,
}: PermissionFormModalProps) {
  if (!isOpen) return null;

  const isEditMode = !!permission;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900" id="modal-title">
                {isEditMode ? 'Edit Permission' : 'Create New Permission'}
              </h3>
              <button
                onClick={onClose}
                disabled={loading}
                className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Close modal"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {isEditMode
                ? 'Update the permission details below. Note that name, resource type, action, and scope cannot be changed.'
                : 'Fill in the details to create a new permission. All fields marked with * are required.'}
            </p>
          </div>

          {/* Form */}
          <div className="bg-white px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            <PermissionForm
              permission={permission}
              onSubmit={onSubmit}
              onCancel={onClose}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
