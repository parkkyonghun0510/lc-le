/**
 * Template for Adding Draft Saving to Forms
 * 
 * This template shows how to add draft saving functionality to any form component.
 * Copy and adapt this pattern to your form components.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useDraftSaving, useCleanupOldDrafts } from '@/hooks/useDraftSaving';
import UnsavedChangesDialog from '@/components/ui/UnsavedChangesDialog';
import toast from 'react-hot-toast';

// 1. Define your form data interface
interface MyFormData {
  name: string;
  description: string;
  // ... other fields
}

// 2. Define your form component props
interface MyFormProps {
  existingData?: MyFormData | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MyFormData) => void;
  isLoading?: boolean;
}

export default function MyFormWithDraftSaving({
  existingData,
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}: MyFormProps) {
  // 3. Initialize form state
  const [formData, setFormData] = useState<MyFormData>({
    name: existingData?.name || '',
    description: existingData?.description || '',
  });
  
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  
  // 4. Setup draft saving hook
  const {
    hasDraft,
    restoreDraft,
    saveDraft,
    clearDraft,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    getDraftAge
  } = useDraftSaving<MyFormData>({
    // Use unique key for create vs edit
    draftKey: existingData ? `draft-myform-edit-${existingData.name}` : 'draft-myform-create',
    formType: existingData ? 'myform-edit' : 'myform-create',
    autoSaveInterval: 30000, // 30 seconds
    maxDraftAge: 7, // 7 days
    onDraftRestored: () => {
      const age = getDraftAge();
      const ageInMinutes = age ? Math.floor(age / 60000) : 0;
      toast.success(
        `Draft restored from ${ageInMinutes} minute${ageInMinutes !== 1 ? 's' : ''} ago`,
        { duration: 4000 }
      );
    },
    onDraftSaved: () => {
      // Optional: Show subtle indicator that draft was saved
      // toast.success('Draft saved', { duration: 1000 });
    }
  });
  
  // 5. Cleanup old drafts on mount
  useCleanupOldDrafts(7, 'draft-myform-');
  
  // 6. Restore draft on mount if available (only for create forms)
  useEffect(() => {
    if (isOpen && !existingData && hasDraft && !draftRestored) {
      const draft = restoreDraft();
      if (draft) {
        setFormData(draft);
        setDraftRestored(true);
      }
    }
  }, [isOpen, existingData, hasDraft, restoreDraft, draftRestored]);
  
  // 7. Auto-save draft when form data changes (only for create forms)
  useEffect(() => {
    if (isOpen && !existingData) {
      const timer = setTimeout(() => {
        saveDraft(formData);
      }, 30000); // 30 seconds
      
      return () => clearTimeout(timer);
    }
  }, [formData, isOpen, existingData, saveDraft]);
  
  // 8. Track unsaved changes by comparing with original data
  useEffect(() => {
    if (isOpen) {
      const hasChanges = 
        formData.name !== (existingData?.name || '') ||
        formData.description !== (existingData?.description || '');
      
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, existingData, isOpen, setHasUnsavedChanges]);
  
  // 9. Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    // Clear draft on successful submission
    clearDraft();
  };
  
  // 10. Handle close with unsaved changes check
  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      clearDraft();
      onClose();
    }
  };
  
  // 11. Handle confirm close (discard changes)
  const handleConfirmClose = () => {
    clearDraft();
    setShowUnsavedDialog(false);
    onClose();
  };
  
  // 12. Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleClose]);
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* 13. Your form JSX */}
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
          <form onSubmit={handleSubmit}>
            <h2 className="text-lg font-medium mb-4">
              {existingData ? 'Edit Item' : 'Create New Item'}
            </h2>
            
            {/* Form fields */}
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
              </div>
            </div>
            
            {/* Form actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : (existingData ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* 14. Unsaved changes dialog */}
      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onConfirm={handleConfirmClose}
        onCancel={() => setShowUnsavedDialog(false)}
      />
    </>
  );
}

/**
 * CHECKLIST FOR ADDING DRAFT SAVING TO YOUR FORM:
 * 
 * [ ] 1. Import useDraftSaving, useCleanupOldDrafts, and UnsavedChangesDialog
 * [ ] 2. Define form data interface
 * [ ] 3. Add state for showUnsavedDialog and draftRestored
 * [ ] 4. Setup useDraftSaving hook with unique draftKey
 * [ ] 5. Add useCleanupOldDrafts hook
 * [ ] 6. Restore draft on mount (only for create forms)
 * [ ] 7. Auto-save draft on form data changes (only for create forms)
 * [ ] 8. Track unsaved changes by comparing with original
 * [ ] 9. Clear draft on successful submission
 * [ ] 10. Create handleClose function with unsaved check
 * [ ] 11. Create handleConfirmClose function
 * [ ] 12. Update Escape key handler to use handleClose
 * [ ] 13. Update Cancel button to use handleClose
 * [ ] 14. Add UnsavedChangesDialog component
 * [ ] 15. Test all flows (create, edit, cancel, submit, restore)
 */

/**
 * CUSTOMIZATION OPTIONS:
 * 
 * 1. Auto-save Interval:
 *    - Default: 30000ms (30 seconds)
 *    - Adjust based on form complexity and user needs
 *    - Shorter for critical data, longer for simple forms
 * 
 * 2. Draft Expiration:
 *    - Default: 7 days
 *    - Adjust based on business requirements
 *    - Shorter for temporary data, longer for important drafts
 * 
 * 3. Draft Key Strategy:
 *    - Create: 'draft-{formType}-create'
 *    - Edit: 'draft-{formType}-edit-{id}'
 *    - Ensures unique drafts per form instance
 * 
 * 4. Draft Restoration:
 *    - Only for create forms by default
 *    - Can enable for edit forms if needed
 *    - Consider UX implications
 * 
 * 5. Notifications:
 *    - Show toast on draft restored
 *    - Optional toast on auto-save
 *    - Customize messages and duration
 */

/**
 * COMMON PITFALLS TO AVOID:
 * 
 * 1. Don't use the same draftKey for different forms
 * 2. Don't forget to clear draft on successful submission
 * 3. Don't auto-save edit forms (can confuse users)
 * 4. Don't restore drafts for edit forms (can overwrite current data)
 * 5. Don't forget to cleanup old drafts
 * 6. Don't store sensitive data in drafts (localStorage is not encrypted)
 * 7. Don't forget to handle Escape key with handleClose
 * 8. Don't call onClose directly - always use handleClose
 */
