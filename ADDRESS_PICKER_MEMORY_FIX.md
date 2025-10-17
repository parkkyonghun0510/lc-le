# Address Picker Memory Fix

## Issue
The address picker was not remembering the user's previous selection when reopening the modal. Even though the address codes were stored in the form state, the modal would reset to empty selections each time it opened.

## Root Cause
The `AddressPickerModal` component had a `reset()` call in its `useEffect` that would clear all selections whenever the modal opened. This was overriding the `initialAddress` prop that was being passed to restore the previous selection.

## Solution

### 1. Removed Reset on Modal Open
**File**: `lc-workflow-frontend/src/components/AddressPickerModal.tsx`

**Before**:
```typescript
useEffect(() => {
  if (isOpen) {
    reset();  // This was clearing the selections!
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 50);
  }
}, [isOpen, reset]);
```

**After**:
```typescript
useEffect(() => {
  if (isOpen) {
    // Removed reset() - let initialAddress handle the state
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 50);
  }
}, [isOpen]);
```

### 2. Improved AddressPicker Initialization
**File**: `lc-workflow-frontend/src/components/AddressPicker.tsx`

**Changes**:
- Updated the dependency array to watch individual address code properties
- Added reset logic when no initialAddress is provided
- This ensures the picker properly updates when the initialAddress prop changes

**Before**:
```typescript
useEffect(() => {
  // ... initialization code
}, [initialAddress]);
```

**After**:
```typescript
useEffect(() => {
  if (initialAddress) {
    // ... load selections
  } else {
    // Reset if no initial address
    setSelectedProvince(null);
    setSelectedDistrict(null);
    setSelectedCommune(null);
    setSelectedVillage(null);
  }
}, [
  initialAddress?.province_code,
  initialAddress?.district_code,
  initialAddress?.commune_code,
  initialAddress?.village_code
]);
```

## How It Works Now

### Data Flow

1. **User Selects Address First Time**:
   ```
   User clicks address field
   → Modal opens (empty)
   → User selects: Province → District → Commune → Village
   → Modal closes, saves to form state:
     - current_address: "ភូមិ X, ឃុំ Y, ស្រុក Z, ខេត្ត W"
     - province: "01"
     - district: "0102"
     - commune: "010201"
     - village: "01020101"
   ```

2. **User Reopens Address Picker**:
   ```
   User clicks address field again
   → Modal opens with initialAddress prop containing codes
   → AddressPicker receives initialAddress
   → useEffect detects the codes and loads the selections
   → User sees their previous selection pre-filled
   → User can modify or confirm
   ```

3. **Form State Management**:
   ```typescript
   // In CustomerInformationStep.tsx
   <AddressField
     value={formValues.current_address}
     initialAddress={{
       province: formValues.province,    // Current form state
       district: formValues.district,    // Current form state
       commune: formValues.commune,      // Current form state
       village: formValues.village,      // Current form state
     }}
   />
   ```

## Testing Steps

1. **Create New Application**:
   - Open the application form
   - Click the address field
   - Select: Province → District → Commune → Village
   - Close the modal
   - **Reopen the address field** - should show your previous selection ✓

2. **Edit Existing Application**:
   - Open an application that has an address
   - Click the address field
   - Should show the saved address pre-selected ✓
   - Change the selection
   - Save and verify the new address is stored ✓

3. **Clear and Reselect**:
   - Select an address
   - Reopen and change to a different province
   - The district/commune/village should reset
   - Select new values
   - Reopen - should show the new selection ✓

## Benefits

1. **Better UX**: Users don't have to reselect the entire address hierarchy if they just want to change the village
2. **Faster Editing**: When editing applications, the address is pre-filled
3. **Reduced Errors**: Users can see what they previously selected
4. **Consistent Behavior**: Works the same way in both create and edit modes

## Technical Notes

- The address codes are stored in React state during form creation
- When editing, codes are loaded from the database
- The `initialAddress` prop is reactive - it updates when form values change
- The AddressPicker component watches the individual code properties to detect changes
- No cookies or localStorage needed - React state management handles everything

## No Additional Storage Needed

The solution uses React's built-in state management:
- **During Creation**: Form state (`formValues`) holds the codes
- **During Editing**: Codes are loaded from the database into form state
- **Modal State**: The `initialAddress` prop passes current values to the modal

This is more efficient than cookies/localStorage because:
- ✓ No serialization/deserialization overhead
- ✓ No storage quota concerns
- ✓ Automatically cleared when form is submitted or page is refreshed
- ✓ Works seamlessly with React's rendering cycle
- ✓ No privacy concerns with storing data in browser
