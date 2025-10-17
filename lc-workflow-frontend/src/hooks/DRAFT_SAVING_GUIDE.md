# Draft Saving Guide

## Overview

The draft saving system provides automatic form data persistence to localStorage, allowing users to recover their work if they navigate away or close the browser accidentally.

## Features

- ✅ **Auto-save**: Automatically saves form data every 30 seconds
- ✅ **Draft restoration**: Restores saved drafts when returning to the form
- ✅ **Unsaved changes detection**: Tracks when form has unsaved changes
- ✅ **Confirmation dialog**: Prompts user before discarding unsaved changes
- ✅ **Automatic cleanup**: Removes drafts older than 7 days
- ✅ **Type-safe**: Full TypeScript support with generics

## Usage

### Basic Example

```tsx
import { useDraftSaving } from '@/hooks/useDraftSaving';
import UnsavedChangesDialog from '@/components/ui/UnsavedChangesDialog';

function MyForm() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  
  const {
    hasDraft,
    restoreDraft,
    saveDraft,
    clearDraft,
    hasUnsavedChanges,
    setHasUnsavedChanges
  } = useDraftSaving({
    draftKey: 'my-form-draft',
    formType: 'my-form',
    autoSaveInterval: 30000, // 30 seconds
    onDraftRestored: () => toast.success('Draft restored')
  });
  
  // Restore draft on mount
  useEffect(() => {
    if (hasDraft) {
      const draft = restoreDraft();
      if (draft) {
        setFormData(draft);
      }
    }
  }, []);
  
  // Auto-save on form data change
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft(formData);
    }, 30000);
    
    return () => clearTimeout(timer);
  }, [formData]);
  
  // Track unsaved changes
  useEffect(() => {
    const hasChanges = formData.name !== '' || formData.email !== '';
    setHasUnsavedChanges(hasChanges);
  }, [formData]);
  
  const handleSubmit = async () => {
    await submitForm(formData);
    clearDraft(); // Clear draft on success
  };
  
  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      clearDraft();
      onClose();
    }
  };
  
  return (
    <>
      <form onSubmit={handleSubmit}>
        {/* Form fields */}
        <button type="button" onClick={handleClose}>Cancel</button>
        <button type="submit">Submit</button>
      </form>
      
      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onConfirm={() => {
          clearDraft();
          onClose();
        }}
        onCancel={() => setShowUnsavedDialog(false)}
      />
    </>
  );
}
```

### Hook API

#### `useDraftSaving<T>(options)`

**Options:**
- `draftKey` (string, required): Unique key for storing the draft in localStorage
- `formType` (string, required): Type of form (e.g., 'role', 'permission')
- `autoSaveInterval` (number, optional): Auto-save interval in milliseconds (default: 30000)
- `maxDraftAge` (number, optional): Maximum age of drafts in days (default: 7)
- `onDraftRestored` (function, optional): Callback when draft is restored
- `onDraftSaved` (function, optional): Callback when draft is saved

**Returns:**
- `hasDraft` (boolean): Whether a draft exists
- `restoreDraft` (() => T | null): Restore the saved draft
- `saveDraft` ((data: T) => void): Save the current form data as a draft
- `clearDraft` (() => void): Clear the saved draft
- `hasUnsavedChanges` (boolean): Whether the form has unsaved changes
- `setHasUnsavedChanges` ((value: boolean) => void): Mark the form as having unsaved changes
- `getDraftAge` (() => number | null): Get the age of the draft in milliseconds

### Cleanup Old Drafts

#### Automatic Cleanup Hook

```tsx
import { useCleanupOldDrafts } from '@/hooks/useDraftSaving';

function App() {
  // Cleanup drafts older than 7 days on mount
  useCleanupOldDrafts(7, 'draft-');
  
  return <div>...</div>;
}
```

#### Manual Cleanup

```tsx
import { cleanupOldDrafts } from '@/hooks/useDraftSaving';

// Clean up drafts older than 7 days
const cleanedCount = cleanupOldDrafts(7, 'draft-');
console.log(`Cleaned up ${cleanedCount} old drafts`);
```

## UnsavedChangesDialog Component

### Props

- `isOpen` (boolean, required): Whether the dialog is open
- `onConfirm` (function, required): Callback when user confirms discarding changes
- `onCancel` (function, required): Callback when user cancels
- `title` (string, optional): Dialog title (default: "Unsaved Changes")
- `message` (string, optional): Dialog message (default: "You have unsaved changes...")
- `confirmText` (string, optional): Confirm button text (default: "Discard Changes")
- `cancelText` (string, optional): Cancel button text (default: "Keep Editing")

### Example

```tsx
<UnsavedChangesDialog
  isOpen={showDialog}
  onConfirm={() => {
    clearDraft();
    onClose();
  }}
  onCancel={() => setShowDialog(false)}
  title="Unsaved Changes"
  message="You have unsaved changes. Are you sure you want to discard them?"
  confirmText="Discard"
  cancelText="Keep Editing"
/>
```

## Implementation in RoleManagement

The RoleManagement component demonstrates a complete implementation:

1. **Draft Key**: Uses unique keys for create vs edit forms
   - Create: `draft-role-create`
   - Edit: `draft-role-edit-{roleId}`

2. **Auto-save**: Saves draft every 30 seconds when form data changes

3. **Draft Restoration**: Automatically restores draft on mount with toast notification

4. **Unsaved Changes**: Tracks changes by comparing current form data with original

5. **Confirmation Dialog**: Shows dialog when user tries to close with unsaved changes

6. **Cleanup**: Automatically cleans up drafts older than 7 days on component mount

## Best Practices

### 1. Use Unique Draft Keys

```tsx
// Good: Unique keys for different forms
const draftKey = role ? `draft-role-edit-${role.id}` : 'draft-role-create';

// Bad: Same key for all forms
const draftKey = 'draft-form';
```

### 2. Clear Drafts on Success

```tsx
const handleSubmit = async () => {
  await submitForm(formData);
  clearDraft(); // Always clear draft after successful submission
};
```

### 3. Track Unsaved Changes Accurately

```tsx
// Compare current form data with original data
useEffect(() => {
  const hasChanges = 
    formData.name !== (originalData?.name || '') ||
    formData.email !== (originalData?.email || '');
  
  setHasUnsavedChanges(hasChanges);
}, [formData, originalData]);
```

### 4. Handle Escape Key

```tsx
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      handleClose(); // Use handleClose, not onClose directly
    }
  };
  
  if (isOpen) {
    document.addEventListener('keydown', handleEscape);
  }
  
  return () => {
    document.removeEventListener('keydown', handleEscape);
  };
}, [isOpen, handleClose]);
```

### 5. Provide User Feedback

```tsx
const {
  hasDraft,
  restoreDraft,
  getDraftAge
} = useDraftSaving({
  draftKey: 'my-form',
  formType: 'my-form',
  onDraftRestored: () => {
    const age = getDraftAge();
    const ageInMinutes = age ? Math.floor(age / 60000) : 0;
    toast.success(
      `Draft restored from ${ageInMinutes} minute${ageInMinutes !== 1 ? 's' : ''} ago`,
      { duration: 4000 }
    );
  }
});
```

## Accessibility

The UnsavedChangesDialog component is fully accessible:

- ✅ ARIA attributes (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`)
- ✅ Keyboard navigation (Escape key to cancel)
- ✅ Focus management
- ✅ Screen reader support

## Browser Compatibility

The draft saving system uses localStorage, which is supported in:
- Chrome 4+
- Firefox 3.5+
- Safari 4+
- Edge (all versions)
- IE 8+

## Limitations

1. **Storage Limit**: localStorage has a 5-10MB limit per domain
2. **Synchronous**: localStorage operations are synchronous and may block the main thread
3. **No Encryption**: Data is stored in plain text (don't store sensitive data)
4. **Same Origin**: Drafts are only accessible from the same origin (protocol + domain + port)

## Troubleshooting

### Draft Not Restoring

1. Check if draft key is consistent between saves and restores
2. Verify draft is not expired (older than maxDraftAge)
3. Check browser console for localStorage errors

### Auto-save Not Working

1. Verify autoSaveInterval is set correctly
2. Check if form data is actually changing
3. Ensure component is not unmounting before auto-save timer fires

### Unsaved Changes Dialog Not Showing

1. Verify hasUnsavedChanges is being set correctly
2. Check if handleClose is being called instead of onClose directly
3. Ensure showUnsavedDialog state is managed properly

## Testing

```tsx
import { renderHook, act } from '@testing-library/react';
import { useDraftSaving } from '@/hooks/useDraftSaving';

describe('useDraftSaving', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  
  it('should save and restore draft', () => {
    const { result } = renderHook(() =>
      useDraftSaving({
        draftKey: 'test-draft',
        formType: 'test'
      })
    );
    
    const testData = { name: 'Test', email: 'test@example.com' };
    
    act(() => {
      result.current.saveDraft(testData);
    });
    
    expect(result.current.hasDraft).toBe(true);
    
    const restored = result.current.restoreDraft();
    expect(restored).toEqual(testData);
  });
  
  it('should clear draft', () => {
    const { result } = renderHook(() =>
      useDraftSaving({
        draftKey: 'test-draft',
        formType: 'test'
      })
    );
    
    act(() => {
      result.current.saveDraft({ name: 'Test' });
      result.current.clearDraft();
    });
    
    expect(result.current.hasDraft).toBe(false);
  });
});
```

## Future Enhancements

- [ ] IndexedDB support for larger drafts
- [ ] Compression for large form data
- [ ] Cloud sync for drafts across devices
- [ ] Draft versioning and history
- [ ] Conflict resolution for concurrent edits
