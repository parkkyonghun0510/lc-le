'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import useLocalStorage from './useLocalStorage';

interface DraftMetadata {
  savedAt: number;
  formType: string;
}

interface DraftData<T> {
  data: T;
  metadata: DraftMetadata;
}

interface UseDraftSavingOptions {
  /**
   * Unique key for storing the draft in localStorage
   */
  draftKey: string;
  
  /**
   * Type of form (e.g., 'role', 'permission')
   */
  formType: string;
  
  /**
   * Auto-save interval in milliseconds (default: 30000 = 30 seconds)
   */
  autoSaveInterval?: number;
  
  /**
   * Maximum age of drafts in days (default: 7)
   */
  maxDraftAge?: number;
  
  /**
   * Callback when draft is restored
   */
  onDraftRestored?: () => void;
  
  /**
   * Callback when draft is saved
   */
  onDraftSaved?: () => void;
}

interface UseDraftSavingReturn<T> {
  /**
   * Whether a draft exists
   */
  hasDraft: boolean;
  
  /**
   * Restore the saved draft
   */
  restoreDraft: () => T | null;
  
  /**
   * Save the current form data as a draft
   */
  saveDraft: (data: T) => void;
  
  /**
   * Clear the saved draft
   */
  clearDraft: () => void;
  
  /**
   * Whether the form has unsaved changes
   */
  hasUnsavedChanges: boolean;
  
  /**
   * Mark the form as having unsaved changes
   */
  setHasUnsavedChanges: (value: boolean) => void;
  
  /**
   * Get the age of the draft in milliseconds
   */
  getDraftAge: () => number | null;
}

/**
 * Hook for managing form draft saving and restoration
 * 
 * Features:
 * - Auto-save form data to localStorage at regular intervals
 * - Restore draft when returning to form
 * - Track unsaved changes
 * - Automatic cleanup of old drafts
 * 
 * @example
 * ```tsx
 * const { hasDraft, restoreDraft, saveDraft, clearDraft, hasUnsavedChanges } = useDraftSaving({
 *   draftKey: 'role-form-draft',
 *   formType: 'role',
 *   autoSaveInterval: 30000, // 30 seconds
 *   onDraftRestored: () => toast.info('Draft restored')
 * });
 * 
 * // In form initialization
 * useEffect(() => {
 *   if (hasDraft) {
 *     const draft = restoreDraft();
 *     if (draft) {
 *       setFormData(draft);
 *     }
 *   }
 * }, []);
 * 
 * // Auto-save on form data change
 * useEffect(() => {
 *   saveDraft(formData);
 * }, [formData]);
 * 
 * // Clear draft on successful submission
 * const handleSubmit = async () => {
 *   await submitForm();
 *   clearDraft();
 * };
 * ```
 */
export function useDraftSaving<T = any>({
  draftKey,
  formType,
  autoSaveInterval = 30000,
  maxDraftAge = 7,
  onDraftRestored,
  onDraftSaved
}: UseDraftSavingOptions): UseDraftSavingReturn<T> {
  const [draftData, setDraftData, removeDraftData] = useLocalStorage<DraftData<T> | null>(
    draftKey,
    null
  );
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string | null>(null);
  
  // Check if draft exists and is not expired
  const hasDraft = useCallback(() => {
    if (!draftData) return false;
    
    const age = Date.now() - draftData.metadata.savedAt;
    const maxAge = maxDraftAge * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    
    return age < maxAge;
  }, [draftData, maxDraftAge]);
  
  // Get draft age in milliseconds
  const getDraftAge = useCallback((): number | null => {
    if (!draftData) return null;
    return Date.now() - draftData.metadata.savedAt;
  }, [draftData]);
  
  // Restore draft
  const restoreDraft = useCallback((): T | null => {
    if (!hasDraft()) {
      return null;
    }
    
    onDraftRestored?.();
    return draftData!.data;
  }, [draftData, hasDraft, onDraftRestored]);
  
  // Save draft
  const saveDraft = useCallback((data: T) => {
    // Don't save if data hasn't changed
    const dataString = JSON.stringify(data);
    if (dataString === lastSavedDataRef.current) {
      return;
    }
    
    const draft: DraftData<T> = {
      data,
      metadata: {
        savedAt: Date.now(),
        formType
      }
    };
    
    setDraftData(draft);
    lastSavedDataRef.current = dataString;
    setHasUnsavedChanges(true);
    onDraftSaved?.();
  }, [formType, setDraftData, onDraftSaved]);
  
  // Clear draft
  const clearDraft = useCallback(() => {
    removeDraftData();
    lastSavedDataRef.current = null;
    setHasUnsavedChanges(false);
  }, [removeDraftData]);
  
  // Cleanup old drafts on mount
  useEffect(() => {
    if (draftData && !hasDraft()) {
      removeDraftData();
    }
  }, [draftData, hasDraft, removeDraftData]);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);
  
  return {
    hasDraft: hasDraft(),
    restoreDraft,
    saveDraft,
    clearDraft,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    getDraftAge
  };
}

/**
 * Utility function to clean up all old drafts from localStorage
 * 
 * @param maxAge Maximum age in days (default: 7)
 * @param draftKeyPrefix Prefix to identify draft keys (default: 'draft-')
 */
export function cleanupOldDrafts(maxAge: number = 7, draftKeyPrefix: string = 'draft-'): number {
  if (typeof window === 'undefined') return 0;
  
  const maxAgeMs = maxAge * 24 * 60 * 60 * 1000;
  const now = Date.now();
  let cleanedCount = 0;
  
  try {
    const keys = Object.keys(localStorage);
    
    for (const key of keys) {
      if (key.startsWith(draftKeyPrefix)) {
        try {
          const item = localStorage.getItem(key);
          if (!item) continue;
          
          const parsed = JSON.parse(item) as DraftData<any>;
          
          if (parsed.metadata && parsed.metadata.savedAt) {
            const age = now - parsed.metadata.savedAt;
            
            if (age > maxAgeMs) {
              localStorage.removeItem(key);
              cleanedCount++;
            }
          }
        } catch (error) {
          // Invalid draft data, remove it
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old drafts:', error);
  }
  
  return cleanedCount;
}

/**
 * Hook to automatically clean up old drafts on mount
 * 
 * @param maxAge Maximum age in days (default: 7)
 * @param draftKeyPrefix Prefix to identify draft keys (default: 'draft-')
 */
export function useCleanupOldDrafts(maxAge: number = 7, draftKeyPrefix: string = 'draft-') {
  useEffect(() => {
    cleanupOldDrafts(maxAge, draftKeyPrefix);
  }, [maxAge, draftKeyPrefix]);
}

export default useDraftSaving;
