# Workflow Fields UI/UX Analysis

## Missing Workflow Data in UI

The following workflow tracking fields exist in the backend but are **NOT currently displayed** in the application detail page UI:

### 1. Workflow Status Fields
```json
{
  "workflow_stage": null,
  "workflow_status": "PO_CREATED",
  "priority_level": "normal"
}
```

### 2. Creation Tracking
```json
{
  "po_created_at": "2025-10-17T03:45:12.909212Z",
  "po_created_by": "5aaa98c4-3b1e-4a63-91c4-696f969cab65"
}
```

### 3. User Completion Tracking
```json
{
  "user_completed_at": null,
  "user_completed_by": null
}
```

### 4. Teller Processing Tracking
```json
{
  "teller_processed_at": null,
  "teller_processed_by": null
}
```

### 5. Manager Review Tracking
```json
{
  "manager_reviewed_at": null,
  "manager_reviewed_by": null
}
```

### 6. Reviewer Assignment
```json
{
  "assigned_reviewer": null
}
```

## Current UI Status

### ✅ What IS Currently Displayed:
1. **Basic Status**: Draft, Submitted, Pending, Under Review, Approved, Rejected
2. **Customer Information**: Name, ID, Phone, DOB, Address
3. **Loan Details**: Amount, Term, Product Type, Disbursement Date
4. **Employee Assignments**: Assigned employees with roles
5. **Guarantor Information**: Name, Phone
6. **Documents**: Uploaded files

### ❌ What is NOT Displayed:
1. **Workflow Status**: PO_CREATED, USER_COMPLETED, TELLER_PROCESSING, etc.
2. **Workflow Stage**: Current stage in the workflow
3. **Priority Level**: normal, high, urgent
4. **Creation Timestamp**: When PO created the application
5. **Created By**: Who created it (PO user ID)
6. **User Completion**: When/who completed user section
7. **Teller Processing**: When/who processed at teller
8. **Manager Review**: When/who reviewed as manager
9. **Assigned Reviewer**: Who is assigned to review

## Recommended UI/UX Implementation

### 1. Workflow Timeline Section
Add a new section showing the workflow progress:

```
┌─────────────────────────────────────────────────────────┐
│ 📊 Workflow Timeline / ដំណើរការ                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ● PO Created          ✓ Completed                      │
│   Oct 17, 2025 11:41 AM                                │
│   By: Portfolio Officer Name                           │
│                                                         │
│ ○ User Completed      ⏳ Pending                       │
│   Waiting for user to complete                         │
│                                                         │
│ ○ Teller Processing   ⏳ Pending                       │
│   Not started                                          │
│                                                         │
│ ○ Manager Review      ⏳ Pending                       │
│   Not started                                          │
└─────────────────────────────────────────────────────────┘
```

### 2. Status Badge Enhancement
Update the current status badge to show workflow status:

```
Current: [Draft] [Submitted] [Approved]
Enhanced: [PO Created] [User Completed] [Teller Processing] [Manager Review]
```

### 3. Priority Badge
Add priority indicator:

```
┌─────────────────┐
│ Priority: 🔴 High │
│ Priority: 🟡 Normal │
│ Priority: 🟢 Low │
└─────────────────┘
```

### 4. Assigned Reviewer Card
If reviewer is assigned, show:

```
┌─────────────────────────────────────┐
│ 👤 Assigned Reviewer                │
│    អ្នកពិនិត្យទទួលបន្ទុក              │
├─────────────────────────────────────┤
│ Name: John Doe                      │
│ Role: Senior Reviewer               │
│ Assigned: Oct 17, 2025             │
└─────────────────────────────────────┘
```

### 5. Audit Trail Section
Show who did what and when:

```
┌─────────────────────────────────────────────────────────┐
│ 📝 Activity Log / កំណត់ហេតុសកម្មភាព                    │
├─────────────────────────────────────────────────────────┤
│ Oct 17, 2025 11:41 AM                                  │
│ 👤 Portfolio Officer created application               │
│                                                         │
│ [Future activities will appear here]                   │
└─────────────────────────────────────────────────────────┘
```

## Proposed UI Layout

### Location 1: Top of Page (Status Bar)
```
┌─────────────────────────────────────────────────────────┐
│ Application #71c22362                                   │
│ [PO Created] [Priority: Normal] [Assigned: John Doe]   │
└─────────────────────────────────────────────────────────┘
```

### Location 2: New Workflow Section (After Employee Assignments)
```
Customer Information
Loan Details
Assigned Employees
→ Workflow Timeline (NEW)
→ Activity Log (NEW)
Guarantor Information
Documents
```

### Location 3: Sidebar (If using sidebar layout)
```
┌─────────────────┐
│ Workflow Status │
│ ─────────────── │
│ Stage: Created  │
│ Priority: Normal│
│ Reviewer: TBD   │
│                 │
│ Timeline:       │
│ ✓ Created       │
│ ○ Completed     │
│ ○ Processing    │
│ ○ Review        │
└─────────────────┘
```

## Field Mapping for Display

### Workflow Status Mapping
```typescript
const workflowStatusLabels = {
  PO_CREATED: {
    en: 'PO Created',
    km: 'បង្កើតដោយមន្ត្រី',
    color: 'blue',
    icon: '📝'
  },
  USER_COMPLETED: {
    en: 'User Completed',
    km: 'អ្នកប្រើបានបំពេញ',
    color: 'green',
    icon: '✓'
  },
  TELLER_PROCESSING: {
    en: 'Teller Processing',
    km: 'កំពុងដំណើរការ',
    color: 'yellow',
    icon: '⏳'
  },
  MANAGER_REVIEW: {
    en: 'Manager Review',
    km: 'ពិនិត្យដោយអ្នកគ្រប់គ្រង',
    color: 'purple',
    icon: '👁️'
  },
  APPROVED: {
    en: 'Approved',
    km: 'អនុម័ត',
    color: 'green',
    icon: '✓'
  },
  REJECTED: {
    en: 'Rejected',
    km: 'បដិសេធ',
    color: 'red',
    icon: '✗'
  }
};
```

### Priority Level Mapping
```typescript
const priorityLevels = {
  low: {
    en: 'Low',
    km: 'ទាប',
    color: 'green',
    icon: '🟢'
  },
  normal: {
    en: 'Normal',
    km: 'ធម្មតា',
    color: 'blue',
    icon: '🔵'
  },
  high: {
    en: 'High',
    km: 'ខ្ពស់',
    color: 'orange',
    icon: '🟠'
  },
  urgent: {
    en: 'Urgent',
    km: 'បន្ទាន់',
    color: 'red',
    icon: '🔴'
  }
};
```

## Implementation Priority

### Phase 1: Essential (High Priority)
1. ✅ **Workflow Status Badge**: Show current workflow_status
2. ✅ **Priority Indicator**: Display priority_level
3. ✅ **Creation Info**: Show po_created_at and created by

### Phase 2: Important (Medium Priority)
4. **Workflow Timeline**: Visual timeline of stages
5. **Assigned Reviewer**: Show who is reviewing
6. **Stage Progress**: Show workflow_stage

### Phase 3: Nice to Have (Low Priority)
7. **Activity Log**: Full audit trail
8. **User Completion Tracking**: Show user_completed_at/by
9. **Teller Processing Tracking**: Show teller_processed_at/by
10. **Manager Review Tracking**: Show manager_reviewed_at/by

## Data Requirements

To display these fields, we need to ensure:

1. ✅ **Backend API**: Already returns these fields
2. ❌ **Frontend Types**: Need to add workflow fields to TypeScript types
3. ❌ **UI Components**: Need to create workflow display components
4. ❌ **User Lookup**: Need to resolve user IDs to names (po_created_by, etc.)

## Recommended Next Steps

1. **Add TypeScript Types**: Update `CustomerApplication` interface to include workflow fields
2. **Create Workflow Components**: 
   - `WorkflowStatusBadge`
   - `PriorityBadge`
   - `WorkflowTimeline`
   - `ActivityLog`
3. **Add to Detail Page**: Insert workflow section after employee assignments
4. **User Resolution**: Create hook to fetch user details by ID
5. **Testing**: Verify all workflow states display correctly

## Summary

**Current Status**: ❌ No UI/UX for workflow fields
**Data Available**: ✅ Yes, in API response
**Action Needed**: Create UI components to display workflow tracking data

These fields are crucial for tracking the application lifecycle and should be displayed to give users visibility into where their application is in the process.
