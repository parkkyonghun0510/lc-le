# Officer Information Display Guide (ព័ត៌មានមន្ត្រី)

## What Should Be Displayed

The "ព័ត៌មានមន្ត្រី" (Officer Information) section should display information about the employees/officers assigned to handle the loan application.

## Current Implementation

The section is currently labeled as:
- **English**: "Assigned Employees"
- **Khmer**: "បុគ្គលិកទទួលបន្ទុក"

## What to Display

### 1. Employee Assignments (New System)
For each assigned employee, display:

#### Employee Card Information:
- **Employee Name (Khmer)**: `employee.full_name_khmer`
- **Employee Name (Latin)**: `employee.full_name_latin`
- **Employee Code**: `employee.employee_code` (e.g., TEST46259B)
- **Assignment Role**: 
  - Primary Officer (មន្ត្រីទទួលបន្ទុកចម្បង)
  - Secondary Officer (មន្ត្រីទទួលបន្ទុករង)
  - Field Officer (មន្ត្រីទីវាល)
  - Reviewer (អ្នកពិនិត្យ)
  - Approver (អ្នកអនុម័ត)
- **Department**: `employee.department.name`
- **Branch**: `employee.branch.name`
- **Assigned Date**: When the employee was assigned
- **Notes**: Any special notes about the assignment

### 2. Legacy Portfolio Officer (Old System)
If the application has a legacy portfolio officer:

- **Label**: "មន្ត្រីទទួលបន្ទុក (Legacy)"
- **Name**: `application.portfolio_officer_name`
- **Status Badge**: "Not Migrated" if `portfolio_officer_migrated = false`
- **Note**: "This field is kept for backward compatibility"

## Display Logic

### Scenario 1: Has Employee Assignments
```
┌─────────────────────────────────────────┐
│ 👥 Assigned Employees                   │
│    បុគ្គលិកទទួលបន្ទុក                    │
├─────────────────────────────────────────┤
│                                         │
│ ┌─────────────┐  ┌─────────────┐      │
│ │ Employee 1  │  │ Employee 2  │      │
│ │ Name        │  │ Name        │      │
│ │ Code        │  │ Code        │      │
│ │ Role Badge  │  │ Role Badge  │      │
│ └─────────────┘  └─────────────┘      │
│                                         │
│ ─────────────────────────────────────  │
│ មន្ត្រីទទួលបន្ទុក (Legacy)              │
│ Long Phearath                           │
│ [Not Migrated]                          │
└─────────────────────────────────────────┘
```

### Scenario 2: No Employee Assignments (Legacy Only)
```
┌─────────────────────────────────────────┐
│ 👥 Assigned Employees                   │
│    បុគ្គលិកទទួលបន្ទុក                    │
├─────────────────────────────────────────┤
│                                         │
│ 👥 No employees assigned                │
│    to this application                  │
│                                         │
│ Employees can be assigned when          │
│ editing this application                │
│                                         │
│ [Edit Application]                      │
│                                         │
│ ─────────────────────────────────────────│
│ មន្ត្រីទទួលបន្ទុក (Legacy)              │
│ Long Phearath                           │
│ [Not Migrated]                          │
└─────────────────────────────────────────┘
```

### Scenario 3: No Data at All
```
┌─────────────────────────────────────────┐
│ 👥 Assigned Employees                   │
│    បុគ្គលិកទទួលបន្ទុក                    │
├─────────────────────────────────────────┤
│                                         │
│ 👥 No employees assigned                │
│    to this application                  │
│                                         │
│ Employees can be assigned when          │
│ editing this application                │
│                                         │
│ [Edit Application]                      │
└─────────────────────────────────────────┘
```

## Data Sources

### Employee Assignments
- **Hook**: `useApplicationAssignments(applicationId)`
- **Returns**: Array of employee assignment objects
- **Fields**: 
  - `id`: Assignment ID
  - `employee_id`: Employee ID
  - `employee`: Full employee object with name, code, department, branch
  - `assignment_role`: Role type
  - `assigned_at`: Assignment timestamp
  - `notes`: Optional notes

### Legacy Portfolio Officer
- **Source**: `application.portfolio_officer_name`
- **Migration Status**: `application.portfolio_officer_migrated`

## Why "មិនមានទិន្នន័យ" Might Show

If you're seeing "មិនមានទិន្នន័យ" (No data), it could be because:

1. **No Employee Assignments**: The `employeeAssignments` array is empty
2. **No Legacy Officer**: The `portfolio_officer_name` is null/empty
3. **API Not Loading**: The `useApplicationAssignments` hook isn't fetching data
4. **Wrong Section**: You might be looking at a different section

## Recommended Display

For the "ព័ត៌មានមន្ត្រី" section, we should show:

### Minimum Information:
1. **Employee Name** (both Khmer and Latin)
2. **Employee Code**
3. **Role** (with color-coded badge)
4. **Assignment Date**

### Optional Information:
5. Department
6. Branch
7. Notes
8. Contact information (if available)

### Always Show:
- Legacy portfolio officer (if exists)
- Edit button (if user has permission)

## Current Status

✅ **Implemented**:
- Employee assignments display with cards
- Role badges with colors
- Employee details (name, code, department, branch)
- Legacy portfolio officer display
- Empty state with edit button

❓ **To Verify**:
- Is the `useApplicationAssignments` hook fetching data correctly?
- Are employee assignments being returned from the API?
- Is the section rendering in the correct location?

## Troubleshooting

If "មិនមានទិន្នន័យ" shows:

1. **Check API Response**: 
   - Open browser console
   - Check network tab for `/applications/{id}/assignments` endpoint
   - Verify data is being returned

2. **Check Hook**:
   - Verify `useApplicationAssignments` is imported
   - Check if `employeeAssignments` variable has data

3. **Check Rendering**:
   - Verify the conditional rendering logic
   - Check if `employeeAssignments.length > 0` is working

4. **Check Legacy Data**:
   - Verify `application.portfolio_officer_name` exists
   - This should show even if no employee assignments exist

## Summary

The "ព័ត៌មានមន្ត្រី" (Officer Information) section should display:
- **Primary**: Employee assignments with full details
- **Secondary**: Legacy portfolio officer for backward compatibility
- **Fallback**: Empty state with option to edit

All of this is already implemented in the code. If you're seeing "មិនមានទិន្នន័យ", it's likely a data loading issue rather than a display issue.
