# Guarantor Step Missing Field Fix

## Issues Fixed

### Issue 1: Missing Required Field (requested_amount)
When submitting the Guarantor Information step (step 2) in the customer application form, the API returned a validation error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "field_errors": [{
        "field": "requested_amount",
        "message": "Field required",
        "type": "missing"
      }]
    }
  }
}
```

## Root Cause
The backend schema (`le-backend/app/schemas.py`) defines `requested_amount` as a **required field**:

```python
requested_amount: float = Field(..., gt=0, description="Loan amount must be greater than 0")
```

However, when updating the application in step 2 (Guarantor Information), the frontend was only sending the guarantor-specific fields without including the required `requested_amount` field from the previous step.

## Solution
Updated `lc-workflow-frontend/app/applications/new/page.tsx` to include all required fields when updating each step:

### Step 2 (Guarantor Information) - Line 283-303
**Before:**
```typescript
await updateApplicationMutation.mutateAsync({
  id: currentApplicationId,
  data: {
    guarantor_name: formValues.guarantor_name,
    guarantor_phone: formValues.guarantor_phone,
  },
});
```

**After:**
```typescript
await updateApplicationMutation.mutateAsync({
  id: currentApplicationId,
  data: {
    guarantor_name: formValues.guarantor_name,
    guarantor_phone: formValues.guarantor_phone,
    guarantor_id_number: formValues.guarantor_id_number,
    guarantor_address: formValues.guarantor_address,
    guarantor_relationship: formValues.guarantor_relationship,
    // Include required fields from previous steps
    requested_amount: parseFloat(formValues.requested_amount),
    product_type: formValues.product_type,
    loan_purposes: formValues.loan_purposes,
  },
});
```

### Step 1 (Loan Information) - Line 265-281
Also added `interest_rate` to ensure all loan-related fields are saved together.

## Testing
To test the fix:

1. Navigate to `/applications/new`
2. Fill in Step 0 (Customer Information)
3. Fill in Step 1 (Loan Information) with a valid loan amount (e.g., 5000)
4. Fill in Step 2 (Guarantor Information)
5. Click "Next" - the guarantor information should now save successfully without validation errors

## Technical Details
- **File Modified:** `lc-workflow-frontend/app/applications/new/page.tsx`
- **Lines Changed:** 265-303
- **Impact:** Ensures all required backend fields are included in partial updates during multi-step form navigation
- **Backward Compatible:** Yes, only adds missing required fields

### Issue 2: SQLAlchemy Async/Await Error (greenlet_spawn)
After fixing the first issue, a second error occurred:

```json
{
  "success": false,
  "error": {
    "code": "HTTP_ERROR",
    "message": "Failed to update application: greenlet_spawn has not been called; can't call await_only() here. Was IO attempted in an unexpected place?"
  }
}
```

**Root Cause:**
The backend code was trying to import and use `AccountIDService` which doesn't exist yet. This caused an import error that manifested as an async/await issue.

**Solution:**
Replaced the non-existent `AccountIDService` with a simplified inline validation in `le-backend/app/routers/applications.py` (lines 668-695):

```python
# Basic account ID validation (simplified until AccountIDService is implemented)
if not account_id or len(account_id) < 1:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Account ID cannot be empty"
    )

# Check for duplicate account_id
duplicate_check = await db.execute(
    select(CustomerApplication).where(
        and_(
            CustomerApplication.account_id == account_id,
            CustomerApplication.id != application.id
        )
    )
)
existing_app = duplicate_check.scalar_one_or_none()

if existing_app:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Account ID already exists in application {existing_app.id}"
    )
```

## Related Files
- Backend Schema: `le-backend/app/schemas.py` (line 387)
- Backend Router: `le-backend/app/routers/applications.py` (lines 265-303, 668-695)
- Frontend Form: `lc-workflow-frontend/app/applications/new/page.tsx`
