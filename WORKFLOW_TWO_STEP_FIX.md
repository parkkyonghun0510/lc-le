# Workflow Two-Step Teller Process Fix

## Problem
The backend requires a TWO-STEP process for tellers, but the frontend was trying to do it in ONE step:

### Backend Flow (Correct)
```
USER_COMPLETED 
  ↓ [Teller: Start Processing]
TELLER_PROCESSING
  ↓ [Teller: Submit to Manager + Account ID]
MANAGER_REVIEW
```

### Frontend Flow (Was Wrong)
```
USER_COMPLETED
  ↓ [Teller: Process + Account ID]
MANAGER_REVIEW  ❌ SKIPPED TELLER_PROCESSING!
```

## Error Message
```
400: Invalid transition from USER_COMPLETED to MANAGER_REVIEW for role officer
```

## Root Cause
The frontend was trying to transition directly from `USER_COMPLETED` to `MANAGER_REVIEW`, but the backend requires going through `TELLER_PROCESSING` first.

## Solution

### 1. Updated Permission Check
Allow tellers to process in BOTH statuses:

```typescript
// BEFORE (Wrong)
const canTellerProcess = userRole === 'officer' && workflowStatus === 'USER_COMPLETED';

// AFTER (Correct)
const canTellerProcess = userRole === 'officer' && 
                         (workflowStatus === 'USER_COMPLETED' || 
                          workflowStatus === 'TELLER_PROCESSING');
```

### 2. Updated Button Text
Show different text based on current status:

```typescript
{workflowStatus === 'USER_COMPLETED' 
  ? 'ចាប់ផ្តើមដំណើរការ (Start Processing)' 
  : 'ដាក់ទៅអ្នកគ្រប់គ្រង (Submit to Manager)'}
```

### 3. Updated Handler Logic
Determine next status based on current status:

```typescript
const handleTellerProcess = (accountId, reviewerId, notes, currentStatus) => {
  let nextStatus;
  
  if (currentStatus === 'USER_COMPLETED') {
    // First step: Start processing
    nextStatus = 'TELLER_PROCESSING';
  } else if (currentStatus === 'TELLER_PROCESSING') {
    // Second step: Submit to manager
    nextStatus = 'MANAGER_REVIEW';
  }
  
  workflowTransition.mutate({
    id: applicationId,
    data: {
      new_status: nextStatus,
      account_id: accountId,
      notes: notes,
    },
  });
};
```

## Correct Workflow Flow

### Step 1: User Submits
```
Draft → USER_COMPLETED
```
**Who**: Application owner
**Action**: Submit button

### Step 2: Teller Starts Processing
```
USER_COMPLETED → TELLER_PROCESSING
```
**Who**: Officer (Teller)
**Action**: "ចាប់ផ្តើមដំណើរការ (Start Processing)" button
**UI**: Opens form (can enter account ID, assign reviewer, add notes)
**Required**: Nothing yet (can save progress)

### Step 3: Teller Submits to Manager
```
TELLER_PROCESSING → MANAGER_REVIEW
```
**Who**: Officer (Teller)
**Action**: "ដាក់ទៅអ្នកគ្រប់គ្រង (Submit to Manager)" button
**UI**: Same form
**Required**: Account ID (must be provided before submitting to manager)

### Step 4: Manager Reviews
```
MANAGER_REVIEW → APPROVED / REJECTED
```
**Who**: Manager or Admin
**Action**: Approve or Reject buttons

## Why Two Steps?

### Benefits of Two-Step Process:
1. **Save Progress**: Teller can start processing and save work
2. **Validation**: Ensures account ID is provided before manager review
3. **Audit Trail**: Clear record of when teller started vs completed
4. **Flexibility**: Teller can work on application over time

### Backend Validation:
```python
WorkflowStatus.USER_COMPLETED: [
    WorkflowTransition(
        from_status=WorkflowStatus.USER_COMPLETED,
        to_status=WorkflowStatus.TELLER_PROCESSING,
        required_role="teller"
    )
],
WorkflowStatus.TELLER_PROCESSING: [
    WorkflowTransition(
        from_status=WorkflowStatus.TELLER_PROCESSING,
        to_status=WorkflowStatus.MANAGER_REVIEW,
        required_role="teller"
    )
]
```

## UI Changes

### When Status = USER_COMPLETED
```
┌─────────────────────────────────┐
│ ✓ Workflow Actions              │
├─────────────────────────────────┤
│                                 │
│ [→ ចាប់ផ្តើមដំណើរការ]           │
│    (Start Processing)           │
│                                 │
└─────────────────────────────────┘
```

### When Status = TELLER_PROCESSING
```
┌─────────────────────────────────┐
│ ✓ Workflow Actions              │
├─────────────────────────────────┤
│                                 │
│ [→ ដាក់ទៅអ្នកគ្រប់គ្រង]         │
│    (Submit to Manager)          │
│                                 │
└─────────────────────────────────┘
```

## Files Modified

1. **lc-workflow-frontend/src/components/applications/WorkflowActions.tsx**
   - Updated permission check to allow both statuses
   - Updated button text based on status
   - Updated handler to pass current status

2. **lc-workflow-frontend/app/applications/[id]/page.tsx**
   - Updated handleTellerProcess to determine next status
   - Added logic for two-step transition

## Testing

### Test Scenario 1: Start Processing
1. Login as officer
2. Open application with status USER_COMPLETED
3. Click "ចាប់ផ្តើមដំណើរការ (Start Processing)"
4. Enter account ID (optional at this stage)
5. Click Submit
6. ✅ Status should change to TELLER_PROCESSING

### Test Scenario 2: Submit to Manager
1. Login as officer
2. Open application with status TELLER_PROCESSING
3. Click "ដាក់ទៅអ្នកគ្រប់គ្រង (Submit to Manager)"
4. Enter account ID (required)
5. Optionally assign reviewer
6. Click Submit
7. ✅ Status should change to MANAGER_REVIEW

### Test Scenario 3: Manager Review
1. Login as manager
2. Open application with status MANAGER_REVIEW
3. Click Approve or Reject
4. ✅ Status should change to APPROVED or REJECTED

## Summary

Fixed the workflow to match backend's two-step teller process:
- ✅ Step 1: USER_COMPLETED → TELLER_PROCESSING (start processing)
- ✅ Step 2: TELLER_PROCESSING → MANAGER_REVIEW (submit to manager)
- ✅ Button text changes based on current status
- ✅ Handler determines correct next status
- ✅ Permissions allow teller to act in both statuses

The workflow now correctly follows the backend's validation rules!
