# Application Submission Status Fix

## Problem
When trying to submit a completed application, users received an error:

```json
{
  "success": false,
  "error": {
    "code": "HTTP_ERROR",
    "message": "Application is not in the correct status for submission",
    "timestamp": "2025-10-19T09:05:34.855555+00:00"
  }
}
```

## Root Cause
There were two related issues in the workflow status management:

### Issue 1: Role Mismatch in Update Endpoint
The `update_application` endpoint only handled workflow transitions for users with role "user":

```python
if current_user.role == "user" and application.workflow_status == WorkflowStatus.PO_CREATED:
    application.workflow_status = WorkflowStatus.USER_COMPLETED
```

However, the actual user role in the system is "officer", not "user". This meant that when officers updated the application through the multi-step form, the workflow_status remained as `PO_CREATED` instead of transitioning to `USER_COMPLETED`.

### Issue 2: Strict Status Check in Submit Endpoint
The `submit_application` endpoint only allowed submission from `PO_CREATED` status:

```python
if application.workflow_status != WorkflowStatus.PO_CREATED:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Application is not in the correct status for submission"
    )
```

This created a catch-22:
- If the workflow transitioned to `USER_COMPLETED` during updates, submission would fail
- If it stayed at `PO_CREATED`, it should still be submittable

## Solution

### Fix 1: Support Officer Role in Update Endpoint
Updated `le-backend/app/routers/applications.py` (lines 649-654) to include "officer" role:

**Before:**
```python
if current_user.role == "user" and application.workflow_status == WorkflowStatus.PO_CREATED:
    # User completing the form details
    application.workflow_status = WorkflowStatus.USER_COMPLETED
    application.user_completed_at = datetime.now(timezone.utc)
    application.user_completed_by = current_user.id
```

**After:**
```python
if current_user.role in ["user", "officer"] and application.workflow_status == WorkflowStatus.PO_CREATED:
    # User/Officer completing the form details
    application.workflow_status = WorkflowStatus.USER_COMPLETED
    application.user_completed_at = datetime.now(timezone.utc)
    application.user_completed_by = current_user.id
```

### Fix 2: Allow Submission from Multiple Statuses
Updated `le-backend/app/routers/applications.py` (lines 910-924) to accept both statuses:

**Before:**
```python
if application.workflow_status != WorkflowStatus.PO_CREATED:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Application is not in the correct status for submission"
    )

application.workflow_status = WorkflowStatus.USER_COMPLETED
application.user_completed_at = datetime.now(timezone.utc)
application.status = "submitted"
application.submitted_at = datetime.now(timezone.utc)
```

**After:**
```python
# Allow submission from PO_CREATED or USER_COMPLETED status
if application.workflow_status not in [WorkflowStatus.PO_CREATED, WorkflowStatus.USER_COMPLETED]:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Application is not in the correct status for submission"
    )

# Set workflow status to USER_COMPLETED if not already
if application.workflow_status == WorkflowStatus.PO_CREATED:
    application.workflow_status = WorkflowStatus.USER_COMPLETED
    application.user_completed_at = datetime.now(timezone.utc)
    application.user_completed_by = current_user.id

application.status = "submitted"
application.submitted_at = datetime.now(timezone.utc)
```

## Workflow Status Flow

### Before Fix
```
PO_CREATED (officer creates)
    ↓ (officer updates - NO TRANSITION)
PO_CREATED (still)
    ↓ (officer submits - FAILS!)
❌ Error: "Application is not in the correct status for submission"
```

### After Fix
```
PO_CREATED (officer creates)
    ↓ (officer updates - TRANSITIONS)
USER_COMPLETED (auto-transition)
    ↓ (officer submits - SUCCESS!)
✅ submitted status
```

OR

```
PO_CREATED (officer creates)
    ↓ (officer submits directly - SUCCESS!)
USER_COMPLETED (set during submission)
    ↓
✅ submitted status
```

## Testing
To test the fix:

1. Login as an officer user
2. Navigate to `/applications/new`
3. Complete all 4 steps:
   - Step 0: Customer Information
   - Step 1: Loan Information
   - Step 2: Guarantor Information
   - Step 3: Document Attachment
4. Click "Submit Application" button
5. **Expected Result:** 
   - Application submits successfully
   - Redirected to applications list
   - Success toast message appears
   - Application shows as "submitted" status

## Technical Details
- **File Modified:** `le-backend/app/routers/applications.py`
- **Lines Changed:** 649-654, 910-924
- **Impact:** Fixes application submission for officer role users
- **Backward Compatible:** Yes, still supports "user" role

## Related Files
- Backend Applications Router: `le-backend/app/routers/applications.py`
- Frontend Application Form: `lc-workflow-frontend/app/applications/new/page.tsx`
- Workflow Definitions: `le-backend/app/workflow.py`

## User Roles in System
The system has these user roles:
- **officer**: Portfolio officers who create and manage applications
- **user**: General users (if applicable)
- **teller**: Process applications and add account IDs
- **manager**: Review and approve applications
- **admin**: Full system access

This fix ensures that officers (the primary application creators) can properly submit applications through the workflow.
