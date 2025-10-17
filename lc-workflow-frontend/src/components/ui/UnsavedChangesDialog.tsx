'use client';

import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  onDiscard?: () => void;
  onSave?: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  saveText?: string;
}

/**
 * Dialog component for confirming actions when there are unsaved changes
 * 
 * @example
 * ```tsx
 * <UnsavedChangesDialog
 *   isOpen={showDialog}
 *   onConfirm={() => {
 *     // Discard changes and close
 *     clearDraft();
 *     onClose();
 *   }}
 *   onCancel={() => setShowDialog(false)}
 * />
 * ```
 */
export default function UnsavedChangesDialog({
  isOpen,
  onConfirm,
  onCancel,
  onClose,
  onDiscard,
  onSave,
  title = 'Unsaved Changes',
  message = 'You have unsaved changes. Are you sure you want to discard them?',
  confirmText = 'Discard Changes',
  cancelText = 'Keep Editing',
  saveText = 'Save Changes'
}: UnsavedChangesDialogProps) {
  // Support both old and new prop patterns
  const handleConfirm = onConfirm || onDiscard;
  const handleCancel = onCancel || onClose;
  const hasSaveOption = !!onSave;
  
  // Handle Escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && handleCancel) {
        handleCancel();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleCancel]);
  
  if (!isOpen) return null;
  
  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-changes-title"
      aria-describedby="unsaved-changes-description"
    >
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
            <ExclamationTriangleIcon
              className="h-6 w-6 text-yellow-600"
              aria-hidden="true"
            />
          </div>
          
          {/* Title */}
          <h3
            id="unsaved-changes-title"
            className="text-lg font-medium text-gray-900 text-center mt-4"
          >
            {title}
          </h3>
          
          {/* Message */}
          <p
            id="unsaved-changes-description"
            className="text-sm text-gray-500 text-center mt-2"
          >
            {message}
          </p>
          
          {/* Actions */}
          <div className="flex items-center justify-center space-x-3 mt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              aria-label={cancelText}
            >
              {cancelText}
            </button>
            {hasSaveOption && (
              <button
                type="button"
                onClick={onSave}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                aria-label={saveText}
              >
                {saveText}
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              aria-label={confirmText}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
