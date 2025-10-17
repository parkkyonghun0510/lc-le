# Workflow Permissions Matrix

## Summary
Comprehensive documentation of role-based permissions for workflow actions in the loan application system.

## Role Definitions

### 1. User (Application Owner)
- **Role Value**: N/A (checked by user ID match)
- **Description**: The person who created the application
- **Primary Responsibility**: Submit completed application

### 2. Officer (Teller)
- **Role Value**: `'officer'`
- **Description**: Front-line staff who process applications
- **Primary Responsibility**: Validate and process applications, assign reviewers

### 3. Manager
- **Role Value**: `'manager'`
- **Description**: Management staff who review and approve applications
- **Primary Responsibility**: Final review and decision (approve/reject)

### 4. Admin
- **Role Value**: `'admin'`
- **Description**: System administrators with elevated privileges
- **Primary Responsibility**: Can perform manager actions + system administration

## Workflow Status Flow

```
Draft (created by PO)
    ↓ [User Submit]
USER_COMPLETED (user filled form)
    ↓ [Teller Process + Account ID]
MANAGER_REVIEW (teller validated)
    ↓ [Manager Approve/Reject]
APPROVED / REJECTED (final decision)
```

## Permission Matrix

| Workflow Status | User (Owner) | Officer (Teller) | Manager | Admin |
|----------------|--------------|------------------|---------|-------|
| **Draft** | ✅ Submit | ❌ | ❌ | ❌ |
| **USER_COMPLETED** | ❌ | ✅ Process | ❌ | ❌ |
| **MANAGER_REVIEW** | ❌ | ❌ | ✅ Approve/Reject | ✅ Approve/Reject |
| **APPROVED** | ❌ | ❌ | ❌ | ❌ |
| **REJECTED** | ❌ | ❌ | ❌ | ❌ |

## Detailed Permission Rules

### 1. Submit Action
**Who**: Application Owner (User)
**When**: Application status is `'draft'`
**Condition**:
```typescript
canSubmit = userId === applicationUserId && status === 'draft'
```
**Action**: Moves application from Draft → USER_COMPLETED
**UI**: Submit button

---

### 2. Teller Process Action
**Who**: Officer (Teller) only
**When**: Workflow status is `'USER_COMPLETED'`
**Condition**:
```typescript
canTellerProcess = userRole === 'officer' && workflowStatus === 'USER_COMPLETED'
```
**Required Data**:
- Account ID (required)
- Reviewer Assignment (optional)
- Notes (optional)

**Action**: Moves application from USER_COMPLETED → MANAGER_REVIEW
**UI**: Process button with form

**Validation**:
- ✅ Must be officer role
- ✅ Must be in USER_COMPLETED status
- ✅ Must provide account ID
- ❌ Cannot process if already in MANAGER_REVIEW
- ❌ Cannot process if not officer

---

### 3. Manager Review Actions
**Who**: Manager or Admin only
**When**: Workflow status is `'MANAGER_REVIEW'`
**Condition**:
```typescript
canManagerReview = (userRole === 'manager' || userRole === 'admin') 
                   && workflowStatus === 'MANAGER_REVIEW'
```

**Available Actions**:
- **Approve**: Moves to APPROVED status
- **Reject**: Moves to REJECTED status (requires reason)

**UI**: Approve and Reject buttons

**Validation**:
- ✅ Must be manager or admin role
- ✅ Must be in MANAGER_REVIEW status
- ✅ Reject requires reason
- ❌ Cannot review if not manager/admin
- ❌ Cannot review if not in MANAGER_REVIEW status
- ❌ Cannot review if already approved/rejected

---

## Permission Check Implementation

### Frontend Component
**File**: `lc-workflow-frontend/src/components/applications/WorkflowActions.tsx`

```typescript
// Permission checks
const canSubmit = userId === applicationUserId && status === 'draft';

const canTellerProcess = userRole === 'officer' 
                         && workflowStatus === 'USER_COMPLETED';

const canManagerReview = (userRole === 'manager' || userRole === 'admin') 
                         && workflowStatus === 'MANAGER_REVIEW';

// Don't render if no actions available
if (!canSubmit && !canTellerProcess && !canManagerReview) {
  return null;
}
```

### Backend Validation
**File**: `le-backend/app/workflow.py`

```python
class WorkflowValidator:
    VALID_TRANSITIONS = {
        WorkflowStatus.PO_CREATED: [
            WorkflowTransition(
                from_status=WorkflowStatus.PO_CREATED,
                to_status=WorkflowStatus.USER_COMPLETED,
                required_role="user"
            )
        ],
        WorkflowStatus.USER_COMPLETED: [
            WorkflowTransition(
                from_status=WorkflowStatus.USER_COMPLETED,
                to_status=WorkflowStatus.TELLER_PROCESSING,
                required_role="teller",  # officer
                validation_required=True
            )
        ],
        WorkflowStatus.TELLER_PROCESSING: [
            WorkflowTransition(
                from_status=WorkflowStatus.TELLER_PROCESSING,
                to_status=WorkflowStatus.MANAGER_REVIEW,
                required_role="teller"  # officer
            )
        ],
        WorkflowStatus.MANAGER_REVIEW: [
            WorkflowTransition(
                from_status=WorkflowStatus.MANAGER_REVIEW,
                to_status=WorkflowStatus.APPROVED,
                required_role="manager"
            ),
            WorkflowTransition(
                from_status=WorkflowStatus.MANAGER_REVIEW,
                to_status=WorkflowStatus.REJECTED,
                required_role="manager"
            )
        ]
    }
```

## Security Considerations

### 1. Frontend Validation
- ✅ Hide actions user cannot perform
- ✅ Disable buttons for invalid states
- ✅ Check role before showing UI
- ⚠️ Frontend checks are for UX only, not security

### 2. Backend Validation
- ✅ Validate role on every API call
- ✅ Validate workflow status transitions
- ✅ Validate required data (account ID, etc.)
- ✅ Return 403 Forbidden for unauthorized actions
- ✅ Log all workflow transitions for audit

### 3. Role Verification
```typescript
// Frontend: Check user role from auth context
const { user } = useAuth();
const userRole = user?.role; // 'officer', 'manager', 'admin'

// Backend: Verify role from JWT token
current_user = get_current_user(token)
if current_user.role not in allowed_roles:
    raise HTTPException(status_code=403, detail="Insufficient permissions")
```

## Common Permission Errors

### Error 1: Officer trying to approve
**Symptom**: Approve/Reject buttons not showing for officer
**Cause**: Officer role cannot perform manager actions
**Solution**: ✅ Working as intended - only managers can approve/reject

### Error 2: Manager trying to process
**Symptom**: Process button not showing for manager
**Cause**: Manager role cannot perform teller actions
**Solution**: ✅ Working as intended - only officers can process

### Error 3: Actions showing for wrong status
**Symptom**: Process button showing when status is MANAGER_REVIEW
**Cause**: Incorrect workflow status check
**Solution**: ✅ Fixed - now checks `workflowStatus === 'MANAGER_REVIEW'`

### Error 4: User can't submit own application
**Symptom**: Submit button not showing for application owner
**Cause**: User ID mismatch or status not 'draft'
**Solution**: Check `userId === applicationUserId` and `status === 'draft'`

## Testing Checklist

### Role-Based Testing

#### Test as User (Application Owner)
- [ ] Can see Submit button when status is 'draft'
- [ ] Cannot see Submit button when status is not 'draft'
- [ ] Cannot see Process button (officer only)
- [ ] Cannot see Approve/Reject buttons (manager only)
- [ ] Cannot submit other users' applications

#### Test as Officer (Teller)
- [ ] Cannot see Submit button (user only)
- [ ] Can see Process button when status is 'USER_COMPLETED'
- [ ] Cannot see Process button when status is 'MANAGER_REVIEW'
- [ ] Cannot see Approve/Reject buttons (manager only)
- [ ] Can assign reviewer when processing
- [ ] Must provide account ID to process

#### Test as Manager
- [ ] Cannot see Submit button (user only)
- [ ] Cannot see Process button (officer only)
- [ ] Can see Approve/Reject when status is 'MANAGER_REVIEW'
- [ ] Cannot see Approve/Reject when status is 'USER_COMPLETED'
- [ ] Must provide reason to reject
- [ ] Can approve without additional data

#### Test as Admin
- [ ] Cannot see Submit button (user only)
- [ ] Cannot see Process button (officer only)
- [ ] Can see Approve/Reject when status is 'MANAGER_REVIEW'
- [ ] Has same permissions as Manager for workflow actions

### Status-Based Testing

#### Draft Status
- [ ] Only owner can submit
- [ ] No other actions available

#### USER_COMPLETED Status
- [ ] Only officers can process
- [ ] No other actions available

#### MANAGER_REVIEW Status
- [ ] Only managers/admins can approve/reject
- [ ] No other actions available

#### APPROVED/REJECTED Status
- [ ] No actions available for anyone
- [ ] Application is read-only

## API Endpoints & Permissions

### Submit Application
```
POST /applications/{id}/submit
Required Role: Application Owner
Required Status: draft
```

### Workflow Transition (Teller Process)
```
POST /applications/{id}/workflow/transition
Required Role: officer
Required Status: USER_COMPLETED
Required Data: account_id
```

### Approve Application
```
POST /applications/{id}/approve
Required Role: manager, admin
Required Status: MANAGER_REVIEW
Required Data: approved_amount, approved_term, interest_rate
```

### Reject Application
```
POST /applications/{id}/reject
Required Role: manager, admin
Required Status: MANAGER_REVIEW
Required Data: reason
```

## Audit Trail

All workflow actions should be logged:
```json
{
  "application_id": "uuid",
  "action": "TELLER_PROCESS",
  "performed_by": "user_uuid",
  "user_role": "officer",
  "from_status": "USER_COMPLETED",
  "to_status": "MANAGER_REVIEW",
  "timestamp": "2025-10-17T10:30:00Z",
  "data": {
    "account_id": "00012345",
    "reviewer_id": "reviewer_uuid",
    "notes": "Validated successfully"
  }
}
```

## Summary

The workflow permission system ensures:
- ✅ **Role-based access control**: Only authorized roles can perform specific actions
- ✅ **Status-based validation**: Actions only available at appropriate workflow stages
- ✅ **Data validation**: Required fields enforced before transitions
- ✅ **Audit trail**: All actions logged for accountability
- ✅ **Security**: Backend validates all permissions, frontend provides UX

**Key Fix**: Changed manager review permission check from `workflowStatus === 'TELLER_PROCESSING'` to `workflowStatus === 'MANAGER_REVIEW'` to correctly match the workflow status after teller processing.
