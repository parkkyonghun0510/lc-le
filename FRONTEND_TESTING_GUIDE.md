# Frontend Testing Guide - Permission Management UI

## Overview

This guide provides step-by-step instructions for manually testing the Permission Management UI at `/admin/permissions`. All tests should be performed with an admin user account.

## Prerequisites

1. **Backend Running**: Ensure the backend server is running at `http://localhost:8000`
2. **Frontend Running**: Ensure the frontend is running at `http://localhost:3000`
3. **Database Seeded**: Run `python le-backend/scripts/seed_permissions.py` to ensure standard roles and permissions exist
4. **Admin Account**: Have an admin user account ready for testing

## Test Suite 7.1: Permission Matrix UI

### Setup
1. Navigate to `http://localhost:3000/admin/permissions`
2. Click on the "Matrix" tab

### Test Cases

#### TC 7.1.1: Grid Rendering
**Steps:**
1. Observe the permission matrix grid
2. Check that roles appear as rows (or columns)
3. Check that permissions appear as columns (or rows)

**Expected Results:**
- ✅ Grid renders without errors
- ✅ All roles are visible
- ✅ All permissions are visible
- ✅ Checkboxes/toggles show current permission assignments

#### TC 7.1.2: System Role Indicators
**Steps:**
1. Look for system roles (Admin, Branch Manager, Credit Officer, etc.)
2. Check for visual indicators (badges, icons, or different styling)

**Expected Results:**
- ✅ System roles have a badge or icon (e.g., "System" badge)
- ✅ System roles are visually distinct from custom roles
- ✅ Tooltip or label explains what "system role" means

#### TC 7.1.3: Filter by Resource Type
**Steps:**
1. Locate the "Resource Type" filter dropdown
2. Select "APPLICATION" from the dropdown
3. Observe the grid

**Expected Results:**
- ✅ Only APPLICATION permissions are shown
- ✅ Other resource type permissions are hidden
- ✅ Grid updates immediately without page reload
- ✅ Role rows remain visible

#### TC 7.1.4: Filter by Action
**Steps:**
1. Locate the "Action" filter dropdown
2. Select "APPROVE" from the dropdown
3. Observe the grid

**Expected Results:**
- ✅ Only permissions with APPROVE action are shown
- ✅ Other action permissions are hidden
- ✅ Grid updates immediately
- ✅ Can combine with resource type filter

#### TC 7.1.5: Toggle Permission (Non-System Role)
**Steps:**
1. Clear all filters
2. Find a non-system role (e.g., a custom role or "Credit Officer")
3. Find a permission that is currently NOT granted
4. Click the checkbox/toggle to grant the permission
5. Observe the UI

**Expected Results:**
- ✅ Checkbox updates immediately (optimistic update)
- ✅ No page reload occurs
- ✅ Success message or toast notification appears
- ✅ API call to `PUT /api/permissions/matrix/toggle` is made (check Network tab)
- ✅ Permission remains granted after page refresh

#### TC 7.1.6: Toggle Permission Error Handling
**Steps:**
1. Open browser DevTools Network tab
2. Toggle a permission
3. Simulate an API error (or disconnect network briefly)

**Expected Results:**
- ✅ Checkbox reverts to original state (rollback)
- ✅ Error message is displayed
- ✅ User is informed of the failure

#### TC 7.1.7: System Role Protection
**Steps:**
1. Find a system role (e.g., "Admin")
2. Try to toggle a permission for this role
3. Observe the behavior

**Expected Results:**
- ✅ Error message appears: "Cannot modify system role permissions"
- ✅ Checkbox does not change
- ✅ No API call is made
- ✅ OR: Checkbox is disabled for system roles

---

## Test Suite 7.2: Template Management UI

### Setup
1. Navigate to `http://localhost:3000/admin/permissions`
2. Click on the "Templates" tab

### Test Cases

#### TC 7.2.1: Template List Display
**Steps:**
1. Observe the templates list

**Expected Results:**
- ✅ All templates are displayed
- ✅ Each template shows: name, description, type, permission count
- ✅ System templates have a visual indicator
- ✅ Templates are organized in a clear layout (cards or table)

#### TC 7.2.2: Create Template
**Steps:**
1. Click "Create Template" button
2. Fill in:
   - Name: "Test Template"
   - Description: "Template for testing"
   - Select 3-5 permissions from the list
3. Click "Save" or "Create"

**Expected Results:**
- ✅ Modal or form appears
- ✅ Permission selector allows multi-select
- ✅ Template is created successfully
- ✅ Success message appears
- ✅ New template appears in the list
- ✅ Template shows correct permission count

#### TC 7.2.3: Apply Template to User
**Steps:**
1. Find a template (e.g., "Credit Officer Template")
2. Click "Apply Template" button
3. Select a test user from the dropdown/search
4. Confirm the action

**Expected Results:**
- ✅ User selector modal appears
- ✅ Can search for users
- ✅ Confirmation dialog appears
- ✅ Success message after application
- ✅ User now has the template's permissions (verify in Users tab)

#### TC 7.2.4: Export Template
**Steps:**
1. Find a template
2. Click "Export" button
3. Check your downloads folder

**Expected Results:**
- ✅ JSON file downloads immediately
- ✅ Filename includes template name (e.g., `template_Credit_Officer.json`)
- ✅ File contains valid JSON
- ✅ JSON includes: template_name, template_description, permissions array
- ✅ Permissions are in portable format (resource_type, action, scope)

#### TC 7.2.5: Import Template (Valid File)
**Steps:**
1. Click "Import Template" button
2. Upload the JSON file exported in TC 7.2.4
3. Review the preview
4. Confirm the import

**Expected Results:**
- ✅ File upload dialog appears
- ✅ Preview modal shows template details
- ✅ Preview lists all permissions
- ✅ Shows mapped vs unmapped permissions count
- ✅ Success message after import
- ✅ Template appears in list (or existing template is updated)

#### TC 7.2.6: Import Template (Invalid File)
**Steps:**
1. Create a text file with invalid JSON: `{invalid json}`
2. Click "Import Template" button
3. Upload the invalid file

**Expected Results:**
- ✅ Error message: "Invalid JSON file"
- ✅ No template is created
- ✅ User can try again with a different file

---

## Test Suite 7.3: Role Management UI

### Setup
1. Navigate to `http://localhost:3000/admin/permissions`
2. Click on the "Roles" tab

### Test Cases

#### TC 7.3.1: Standard Roles Display
**Steps:**
1. Look for a "Standard Roles" section
2. Observe the roles listed

**Expected Results:**
- ✅ Section labeled "Standard Roles" or "System Roles" exists
- ✅ All 7 standard roles are displayed:
  - Admin
  - Branch Manager
  - Reviewer
  - Credit Officer
  - Portfolio Officer
  - Teller
  - Data Entry Clerk
- ✅ Each role shows: name, level, permission count
- ✅ System roles have a badge/indicator

#### TC 7.3.2: View Role Details
**Steps:**
1. Click on a standard role (e.g., "Branch Manager")
2. Observe the details modal/panel

**Expected Results:**
- ✅ Modal or detail panel opens
- ✅ Shows role name, display name, description
- ✅ Shows role level
- ✅ Lists all permissions assigned to the role
- ✅ Permissions are grouped by resource type or action
- ✅ Shows permission scopes (OWN, DEPARTMENT, BRANCH, GLOBAL)

#### TC 7.3.3: Create Role from Template
**Steps:**
1. Click "Create from Template" button
2. Select a template from dropdown (e.g., "Credit Officer Template")
3. Fill in:
   - Name: "test_custom_officer"
   - Display Name: "Test Custom Officer"
   - Description: "Custom officer role for testing"
   - Level: 55
4. Submit the form

**Expected Results:**
- ✅ Modal appears with template selector
- ✅ Form fields are present and validated
- ✅ Role is created successfully
- ✅ Success message appears
- ✅ New role appears in the roles list
- ✅ New role has all permissions from the selected template

#### TC 7.3.4: System Role Edit Protection
**Steps:**
1. Find a system role (e.g., "Admin")
2. Look for an "Edit" button
3. Try to click it (if enabled)

**Expected Results:**
- ✅ Edit button is disabled OR
- ✅ Clicking edit shows warning: "Cannot edit system roles" OR
- ✅ Edit form is read-only for system roles

#### TC 7.3.5: System Role Delete Protection
**Steps:**
1. Find a system role
2. Look for a "Delete" button
3. Try to click it (if enabled)

**Expected Results:**
- ✅ Delete button is disabled OR
- ✅ Clicking delete shows warning: "Cannot delete system roles" OR
- ✅ Delete action is blocked with error message

---

## Test Suite 7.4: Audit Trail UI

### Setup
1. Navigate to `http://localhost:3000/admin/permissions`
2. Click on the "Audit Trail" tab

### Test Cases

#### TC 7.4.1: Audit Entries Display
**Steps:**
1. Observe the audit trail table

**Expected Results:**
- ✅ Table displays audit entries
- ✅ Columns include: Timestamp, Action, User, Entity Type, Details
- ✅ Entries are sorted by timestamp (newest first)
- ✅ Pagination controls are visible
- ✅ Shows total count of entries

#### TC 7.4.2: Filter by Action Type
**Steps:**
1. Locate the "Action" filter dropdown
2. Select "role_assigned"
3. Observe the table

**Expected Results:**
- ✅ Only entries with action "role_assigned" are shown
- ✅ Other action types are filtered out
- ✅ Table updates immediately
- ✅ Pagination resets to page 1

#### TC 7.4.3: Filter by Entity Type
**Steps:**
1. Locate the "Entity Type" filter dropdown
2. Select "user_role"
3. Observe the table

**Expected Results:**
- ✅ Only entries with entity_type "user_role" are shown
- ✅ Table updates immediately
- ✅ Can combine with action filter

#### TC 7.4.4: Filter by Date Range
**Steps:**
1. Locate the date range picker
2. Select "Last 7 days" or set custom date range
3. Observe the table

**Expected Results:**
- ✅ Only entries within the date range are shown
- ✅ Entries outside the range are filtered out
- ✅ Date picker is user-friendly
- ✅ Can clear date filter

#### TC 7.4.5: Expandable Row Details
**Steps:**
1. Click on an audit entry row
2. Observe the expanded details

**Expected Results:**
- ✅ Row expands to show full details
- ✅ Shows complete JSON of the audit entry
- ✅ Includes: user_id, target_user_id, permission_id, role_id, reason, IP address
- ✅ JSON is formatted and readable
- ✅ Can collapse the row

#### TC 7.4.6: Export Audit Trail (CSV)
**Steps:**
1. Click "Export" button
2. Select "CSV" format
3. Check your downloads folder

**Expected Results:**
- ✅ CSV file downloads immediately
- ✅ Filename includes timestamp (e.g., `audit_trail_2025-01-19.csv`)
- ✅ CSV contains all visible entries (respecting filters)
- ✅ CSV has proper headers
- ✅ Data is correctly formatted

#### TC 7.4.7: Export Audit Trail (JSON)
**Steps:**
1. Click "Export" button
2. Select "JSON" format
3. Check your downloads folder
4. Open the JSON file

**Expected Results:**
- ✅ JSON file downloads immediately
- ✅ File contains valid JSON array
- ✅ Each entry has all audit fields
- ✅ Data matches what's displayed in the UI

---

## Test Suite 8: Integration Testing

### TC 8.1: End-to-End Standard Role Workflow

**Steps:**
1. Open terminal and run: `python le-backend/scripts/seed_permissions.py`
2. Check the output for success messages
3. Open database tool and query: `SELECT * FROM roles WHERE is_system_role = true`
4. Navigate to `/admin/permissions` → Roles tab
5. Verify all 7 standard roles are displayed
6. Click on "Credit Officer" role
7. Review the permissions list
8. Navigate to Users tab
9. Search for a test user
10. Assign "Credit Officer" role to the user
11. Logout and login as the test user
12. Try to create an application
13. Try to approve an application

**Expected Results:**
- ✅ Seeding script completes successfully
- ✅ Database shows 7 system roles
- ✅ UI displays all 7 roles with correct details
- ✅ Credit Officer has appropriate permissions
- ✅ Role assignment succeeds
- ✅ Test user can create applications (has APPLICATION.CREATE.DEPARTMENT)
- ✅ Test user can only approve own applications (has APPLICATION.APPROVE.OWN)
- ✅ Test user cannot approve department applications (lacks APPLICATION.APPROVE.DEPARTMENT)

### TC 8.2: End-to-End Template Workflow

**Steps:**
1. Login as admin
2. Navigate to Templates tab
3. Click "Create Template"
4. Name: "Custom Reviewer"
5. Select permissions:
   - APPLICATION.READ.GLOBAL
   - AUDIT.READ.GLOBAL
   - ANALYTICS.VIEW_ALL.GLOBAL
6. Save template
7. Navigate to Users tab
8. Search for test user
9. Click "Apply Template" → Select "Custom Reviewer"
10. Confirm
11. Check user's permissions in the UI
12. Go back to Templates tab
13. Click "Export" on "Custom Reviewer" template
14. Download JSON file
15. Open new incognito browser window
16. Login as admin
17. Navigate to Templates tab
18. Click "Import Template"
19. Upload the downloaded JSON
20. Review preview
21. Confirm import

**Expected Results:**
- ✅ Template created successfully
- ✅ Template shows 3 permissions
- ✅ Template applied to user successfully
- ✅ User has the 3 selected permissions
- ✅ Export downloads valid JSON file
- ✅ Import preview shows correct permissions
- ✅ Import succeeds (creates or updates template)
- ✅ Imported template matches original

### TC 8.3: End-to-End Audit Trail Workflow

**Steps:**
1. Login as admin
2. Navigate to Roles tab
3. Create a new role: "Test Role"
4. Navigate to Matrix tab
5. Assign a permission to "Test Role"
6. Navigate to Users tab
7. Assign "Test Role" to a test user
8. Grant a direct permission to another user
9. Navigate to Audit Trail tab
10. Observe the entries
11. Filter by action type "role_created"
12. Filter by user (admin user)
13. Set date range to today
14. Set date range to yesterday
15. Click "Export" → CSV
16. Download and open CSV
17. Export as JSON

**Expected Results:**
- ✅ All 4 operations appear in audit log:
  - role_created
  - permission_granted (to role)
  - role_assigned (to user)
  - permission_granted (direct to user)
- ✅ Filter by "role_created" shows only 1 entry
- ✅ Filter by admin user shows all 4 entries
- ✅ Date range "today" shows all entries
- ✅ Date range "yesterday" shows no entries
- ✅ CSV export contains all 4 operations
- ✅ CSV has correct columns and data
- ✅ JSON export is valid and complete

---

## Reporting Issues

If any test fails, please document:
1. Test case number (e.g., TC 7.1.3)
2. Steps performed
3. Expected result
4. Actual result
5. Screenshots (if applicable)
6. Browser console errors (if any)
7. Network tab errors (if any)

## Test Completion Checklist

- [ ] All Test Suite 7.1 tests passed
- [ ] All Test Suite 7.2 tests passed
- [ ] All Test Suite 7.3 tests passed
- [ ] All Test Suite 7.4 tests passed
- [ ] All Test Suite 8 integration tests passed
- [ ] No critical bugs found
- [ ] All issues documented

---

**Note**: These are manual tests. Take your time and verify each expected result carefully. The UI should be intuitive and error-free for a production-ready system.
