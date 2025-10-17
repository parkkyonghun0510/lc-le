# Permission CRUD Interface - Quick Start Guide

## Overview

The Permission CRUD interface allows system administrators to directly manage individual permissions in the system. This complements role-based permission management by providing granular control over permission definitions.

## Accessing the Interface

1. Navigate to `/permissions` in your browser
2. Click on the **"Permissions"** tab (with key icon)
3. You'll see a table of all permissions in the system

## Creating a Permission

### Step-by-Step

1. Click the **"Create Permission"** button in the top-right corner
2. Fill in the required fields:
   - **Name**: Unique identifier (e.g., `application_approve`)
     - 3-100 characters
     - Only letters, numbers, and underscores
     - Cannot be changed after creation
   - **Description**: What this permission allows (up to 500 characters)
   - **Resource Type**: What the permission applies to (e.g., Application, User)
   - **Action**: What action is allowed (e.g., Create, Read, Update, Delete)
   - **Scope**: The boundary of access (e.g., Global, Department, Own)
   - **Conditions** (Optional): JSON object for additional rules
   - **Active**: Whether the permission is currently active
3. Click **"Create Permission"**
4. Success! The permission appears in the table

### Example

```json
{
  "name": "application_approve",
  "description": "Allows user to approve loan applications",
  "resource_type": "application",
  "action": "approve",
  "scope": "department",
  "conditions": {
    "min_amount": 1000,
    "max_amount": 50000
  },
  "is_active": true
}
```

## Editing a Permission

### Step-by-Step

1. Find the permission in the table
2. Click the **pencil icon** in the Actions column
3. Update the editable fields:
   - Description
   - Conditions
   - Active status
   - ⚠️ Note: Name, resource type, action, and scope cannot be changed
4. Click **"Update Permission"**
5. Success! The permission is updated

### What Can Be Edited?

✅ **Can Edit**:
- Description
- Conditions (JSON)
- Active status

❌ **Cannot Edit**:
- Name
- Resource Type
- Action
- Scope

## Deleting a Permission

### Step-by-Step

1. Find the permission in the table
2. Click the **trash icon** in the Actions column
3. Read the confirmation dialog carefully
4. Click **"Delete"** to confirm
5. Success! The permission is removed

### ⚠️ Important Warnings

- Deleting a permission is **permanent**
- All roles and users with this permission will **lose access**
- System permissions show an extra warning
- Consider **deactivating** instead of deleting if you might need it later

## Toggling Permission Status

### Quick Toggle

1. Find the permission in the table
2. Click on the **Active/Inactive badge** in the Status column
3. The status toggles immediately
4. Success! The permission is activated/deactivated

### When to Use

- **Deactivate**: Temporarily disable a permission without deleting it
- **Activate**: Re-enable a previously deactivated permission

## Bulk Operations

### Selecting Multiple Permissions

1. Click the **checkbox** in the header to select all visible permissions
2. Or click individual **checkboxes** to select specific permissions
3. A blue toolbar appears showing the count of selected permissions

### Available Bulk Actions

#### Activate Multiple
1. Select permissions
2. Click **"Activate"** in the bulk toolbar
3. All selected permissions are activated

#### Deactivate Multiple
1. Select permissions
2. Click **"Deactivate"** in the bulk toolbar
3. All selected permissions are deactivated

#### Delete Multiple
1. Select permissions
2. Click **"Delete"** in the bulk toolbar
3. Confirm the deletion
4. All selected permissions are deleted

## Search and Filtering

### Search by Name or Description

1. Type in the **search box** at the top
2. Results filter automatically as you type
3. Clear the search to see all permissions again

### Filter by Attributes

1. Click the **"Filters"** button
2. Select filters:
   - **Resource Type**: Filter by resource (e.g., Application, User)
   - **Action**: Filter by action (e.g., Create, Read)
   - **Scope**: Filter by scope (e.g., Global, Department)
   - **Status**: Filter by active/inactive
3. Filters apply immediately
4. An "Active" badge appears on the Filters button when filters are applied

### Combining Search and Filters

- Search and filters work together
- Use search for text matching
- Use filters for attribute matching
- Clear both to reset the view

## Sorting

### Sort by Column

1. Click on any **column header** to sort
2. Click again to reverse the sort order
3. An arrow icon shows the current sort direction

### Sortable Columns

- Name
- Resource Type
- Action
- Scope
- Created Date

## Pagination

### Navigating Pages

- **50 permissions per page**
- Use the **Previous/Next** buttons at the bottom
- Or click specific **page numbers**
- Page count shows total results

## Draft Saving

### Auto-Save Feature

When creating a new permission:
- Your form data is **auto-saved every 30 seconds**
- If you navigate away and return, your draft is **restored**
- A notification appears when a draft is restored

### Unsaved Changes Warning

- If you try to cancel with unsaved changes, a dialog appears
- Options:
  - **Discard**: Lose your changes
  - **Save**: Submit the form
  - **Cancel**: Return to editing

### Clearing Drafts

- Drafts are automatically cleared when you:
  - Successfully submit the form
  - Explicitly discard changes
- Old drafts (7+ days) are automatically cleaned up

## System Permissions

### What Are System Permissions?

System permissions are built-in permissions that are critical for core functionality.

### Restrictions

- **Cannot be edited** (name, resource type, action, scope)
- **Cannot be deleted**
- **Cannot be toggled** (always active)
- Shown with a blue "System" badge

### Why?

System permissions ensure core functionality always works. Modifying them could break the application.

## Validation Rules

### Name Field

- ✅ 3-100 characters
- ✅ Letters, numbers, and underscores only
- ✅ Must be unique
- ❌ Cannot contain spaces or special characters

### Description Field

- ✅ Required
- ✅ Up to 500 characters
- Shows character count

### Resource Type, Action, Scope

- ✅ Must select from dropdown
- ✅ Cannot be empty

### Conditions Field

- ✅ Optional
- ✅ Must be valid JSON if provided
- Shows error if JSON is invalid

## Error Handling

### Form Validation Errors

- Shown **inline** below the field
- Prevents submission until fixed
- Clear, actionable messages

### API Errors

- Shown as **toast notifications**
- User-friendly messages
- Automatic retry for network errors

### Common Errors

1. **"Name already exists"**: Choose a different name
2. **"Invalid JSON"**: Fix the JSON syntax in conditions
3. **"Permission denied"**: Contact your administrator
4. **"Network error"**: Check your connection and try again

## Keyboard Shortcuts

### Modal Navigation

- **Tab**: Move to next field
- **Shift+Tab**: Move to previous field
- **Enter**: Submit form (when focused on button)
- **Escape**: Close modal (with unsaved changes warning)

### Table Navigation

- **Tab**: Navigate through interactive elements
- **Enter**: Activate buttons and checkboxes
- **Space**: Toggle checkboxes

## Best Practices

### Naming Conventions

Use a consistent format:
```
{resource}_{action}_{scope}
```

Examples:
- `application_create_own`
- `user_read_department`
- `file_delete_all`

### Descriptions

Write clear, concise descriptions:
- ✅ "Allows user to approve loan applications up to $50,000"
- ❌ "Approve apps"

### Conditions

Use conditions for complex rules:
```json
{
  "min_amount": 1000,
  "max_amount": 50000,
  "requires_review": true,
  "allowed_statuses": ["pending", "under_review"]
}
```

### Active Status

- Keep permissions **active** if they're in use
- **Deactivate** instead of deleting if you might need them later
- **Delete** only if you're certain you won't need them

## Troubleshooting

### "Permission not appearing in table"

- Check your filters and search
- Verify the permission was created successfully
- Refresh the page

### "Cannot edit permission"

- System permissions cannot be edited
- Check if you have the necessary permissions
- Contact your administrator

### "Form not saving"

- Check for validation errors
- Ensure all required fields are filled
- Check your network connection

### "Draft not restoring"

- Drafts are only saved for new permissions (not edits)
- Drafts older than 7 days are automatically deleted
- Clear your browser cache if issues persist

## Tips and Tricks

### Quick Status Toggle

Click directly on the Active/Inactive badge to toggle without opening the edit modal.

### Bulk Deactivate Instead of Delete

If you're unsure about deleting permissions, deactivate them first. You can always reactivate later.

### Use Filters to Find Related Permissions

Filter by resource type to see all permissions for a specific resource (e.g., all Application permissions).

### Copy Conditions from Existing Permissions

When creating similar permissions, copy the conditions JSON from an existing permission and modify as needed.

### Search by Description

The search box searches both name and description, making it easy to find permissions by what they do.

## Support

### Need Help?

- Check the implementation summary: `TASK_20_IMPLEMENTATION_SUMMARY.md`
- Review the requirements: `.kiro/specs/permission-management-system/requirements.md`
- Contact your system administrator

### Reporting Issues

When reporting issues, include:
- What you were trying to do
- What happened instead
- Any error messages
- Screenshots if applicable

## Related Documentation

- **Permission Matrix**: Assign permissions to roles
- **Role Management**: Create and manage roles
- **User Permissions**: Assign permissions to users
- **Permission Templates**: Quick permission setup

---

**Last Updated**: October 17, 2025  
**Version**: 1.0  
**Status**: Production Ready
