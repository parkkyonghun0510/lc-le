# Position-Based Permissions System

## Overview
A robust, maintainable permission system that uses **Position IDs** instead of string matching to determine workflow permissions. This prevents breaking changes when position names are edited.

## Problem with String Matching

### ❌ Bad Approach (Fragile)
```typescript
// Breaks if user changes "Teller" to "Senior Teller"
const isTeller = position?.name.toLowerCase().includes('teller');

// Breaks if someone types "Teler" (typo)
const isTeller = position?.name === 'Teller';

// Breaks with different languages
const isTeller = position?.name === 'អ្នកទទួលប្រាក់'; // Khmer for Teller
```

### ✅ Good Approach (Robust)
```typescript
// Uses UUID - never changes even if name is edited
const isTeller = hasPositionCapability(position?.id, 'start_teller_processing');

// Or using the hook
const { canProcessAsTeller } = useWorkflowPermissions();
```

## Architecture

### 1. Permissions Configuration
**File**: `lc-workflow-frontend/src/config/permissions.ts`

Central registry mapping position IDs to capabilities:

```typescript
export const POSITION_PERMISSIONS: PositionCapability[] = [
  {
    positionId: 'uuid-for-teller-position',
    positionName: 'Teller', // For reference only
    capabilities: ['start_teller_processing', 'submit_to_manager'],
  },
  {
    positionId: 'uuid-for-manager-position',
    positionName: 'Branch Manager',
    capabilities: ['approve_application', 'reject_application'],
  },
];
```

### 2. Permission Hook
**File**: `lc-workflow-frontend/src/hooks/useWorkflowPermissions.ts`

Easy-to-use hook for components:

```typescript
const { 
  canProcessAsTeller,
  canReviewAsManager,
  can,
  canAny 
} = useWorkflowPermissions();
```

### 3. Component Integration
**File**: `lc-workflow-frontend/src/components/applications/WorkflowActions.tsx`

Uses the hook instead of direct role checks:

```typescript
// OLD (role-based only)
const canTellerProcess = userRole === 'officer';

// NEW (role + position hybrid)
const { canProcessAsTeller } = useWorkflowPermissions();
const canTellerProcess = canProcessAsTeller && workflowStatus === 'USER_COMPLETED';
```

## How It Works

### Hybrid Permission Check

```typescript
export const canPerformWorkflowAction = (
  userRole: string | undefined,
  positionId: string | null | undefined,
  action: WorkflowAction
): boolean => {
  // Check 1: Role-based (fallback)
  const hasRolePermission = rolePermissions[userRole]?.includes(action);
  
  // Check 2: Position-based (granular)
  const hasPositionPermission = hasPositionCapability(positionId, action);
  
  // User needs EITHER role OR position permission
  return hasRolePermission || hasPositionPermission;
};
```

### Permission Flow

```
User tries to perform action
         ↓
Check user's role
         ↓
    Has permission? ──Yes──→ Allow
         ↓ No
Check user's position ID
         ↓
    Has permission? ──Yes──→ Allow
         ↓ No
      Deny
```

## Benefits

### 1. Robust Against Changes
```typescript
// ✅ Position name can change without breaking code
Position: "Teller" → "Senior Teller" → "ប្រធានអ្នកទទួលប្រាក់"
Position ID: "uuid-123" (never changes)
```

### 2. Centralized Management
```typescript
// All permissions in ONE place
// Easy to audit and update
POSITION_PERMISSIONS array in permissions.ts
```

### 3. Type-Safe
```typescript
// TypeScript ensures valid actions
type WorkflowAction = 
  | 'start_teller_processing'
  | 'submit_to_manager'
  | 'approve_application'
  | 'reject_application';
```

### 4. Easy to Test
```typescript
// Mock position ID for testing
const mockUser = {
  role: 'officer',
  position: { id: 'test-teller-uuid' }
};
```

### 5. Flexible
```typescript
// Can grant permissions by:
// - Role (simple, broad)
// - Position (granular, specific)
// - Both (hybrid, flexible)
```

## Usage Examples

### Example 1: Check Single Permission
```typescript
import { useWorkflowPermissions } from '@/hooks/useWorkflowPermissions';

function MyComponent() {
  const { can } = useWorkflowPermissions();
  
  if (can('start_teller_processing')) {
    return <ProcessButton />;
  }
  
  return null;
}
```

### Example 2: Check Multiple Permissions
```typescript
const { canAny } = useWorkflowPermissions();

if (canAny(['approve_application', 'reject_application'])) {
  return <ManagerActions />;
}
```

### Example 3: Use Predefined Checks
```typescript
const { 
  canProcessAsTeller,
  canReviewAsManager 
} = useWorkflowPermissions();

return (
  <>
    {canProcessAsTeller && <TellerForm />}
    {canReviewAsManager && <ManagerButtons />}
  </>
);
```

### Example 4: Get User Info
```typescript
const { 
  userRole,
  positionId,
  positionName 
} = useWorkflowPermissions();

console.log(`User: ${userRole} - ${positionName} (${positionId})`);
```

## Setup Instructions

### Step 1: Get Position IDs from Database
```sql
SELECT id, name FROM positions;
```

### Step 2: Update Permissions Config
```typescript
// lc-workflow-frontend/src/config/permissions.ts
export const POSITION_PERMISSIONS: PositionCapability[] = [
  {
    positionId: 'actual-uuid-from-database',
    positionName: 'Teller',
    capabilities: ['start_teller_processing', 'submit_to_manager'],
  },
  // Add more positions...
];
```

### Step 3: Use in Components
```typescript
import { useWorkflowPermissions } from '@/hooks/useWorkflowPermissions';

const { canProcessAsTeller } = useWorkflowPermissions();
```

## Adding New Positions

### 1. Create Position in Database
```sql
INSERT INTO positions (id, name, description)
VALUES (gen_random_uuid(), 'Credit Analyst', 'Analyzes credit applications');
```

### 2. Add to Permissions Config
```typescript
{
  positionId: 'uuid-from-step-1',
  positionName: 'Credit Analyst',
  capabilities: ['start_teller_processing', 'submit_to_manager'],
}
```

### 3. Done!
No code changes needed in components - they automatically get the new permissions.

## Adding New Actions

### 1. Add to Type
```typescript
export type WorkflowAction = 
  | 'start_teller_processing'
  | 'submit_to_manager'
  | 'approve_application'
  | 'reject_application'
  | 'escalate_to_senior_manager'; // NEW
```

### 2. Add to Position Capabilities
```typescript
{
  positionId: 'senior-manager-uuid',
  positionName: 'Senior Manager',
  capabilities: [
    'approve_application',
    'reject_application',
    'escalate_to_senior_manager', // NEW
  ],
}
```

### 3. Use in Components
```typescript
const { can } = useWorkflowPermissions();

if (can('escalate_to_senior_manager')) {
  return <EscalateButton />;
}
```

## Migration from Old System

### Before (Role-Based Only)
```typescript
const canProcess = userRole === 'officer';
const canApprove = userRole === 'manager' || userRole === 'admin';
```

### After (Hybrid)
```typescript
const { canProcessAsTeller, canReviewAsManager } = useWorkflowPermissions();
```

### Migration Steps
1. ✅ Create permissions.ts config
2. ✅ Create useWorkflowPermissions hook
3. ✅ Update WorkflowActions component
4. ⏳ Get position IDs from database
5. ⏳ Update POSITION_PERMISSIONS array
6. ⏳ Test with real users

## Best Practices

### DO ✅
- Use position IDs (UUIDs) for permission checks
- Keep all permissions in central config file
- Use the hook for permission checks
- Add comments explaining each position's role
- Test permission changes thoroughly

### DON'T ❌
- Don't use string matching on position names
- Don't hardcode position names in components
- Don't check permissions in multiple places
- Don't forget to update permissions config when adding positions
- Don't skip testing after permission changes

## Security Notes

### Frontend Permissions
- ⚠️ Frontend checks are for **UX only**
- ⚠️ Always validate permissions on **backend**
- ⚠️ Never trust frontend permission checks for security

### Backend Validation
```python
# Backend should also check permissions
def can_process_application(user, application):
    # Check role
    if user.role != 'officer':
        return False
    
    # Check position (if configured)
    if user.position_id not in TELLER_POSITION_IDS:
        return False
    
    # Check workflow status
    if application.workflow_status != 'USER_COMPLETED':
        return False
    
    return True
```

## Troubleshooting

### Issue: User can't see actions they should have
**Solution**: Check if their position ID is in POSITION_PERMISSIONS array

### Issue: Position name changed, permissions broken
**Solution**: This shouldn't happen with ID-based system. Check if position ID changed (it shouldn't).

### Issue: New position not working
**Solution**: Make sure position ID is added to POSITION_PERMISSIONS array

### Issue: User has role but no position
**Solution**: Role-based fallback should work. Check if role permissions are configured.

## Summary

The position-based permissions system provides:
- ✅ **Robust**: Uses IDs, not strings
- ✅ **Maintainable**: Central configuration
- ✅ **Flexible**: Hybrid role + position
- ✅ **Type-safe**: TypeScript enforcement
- ✅ **Testable**: Easy to mock and test
- ✅ **Scalable**: Easy to add positions/actions

**Status**: ✅ IMPLEMENTED AND READY TO CONFIGURE
