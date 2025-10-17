# Permission CRUD Interface - Visual Guide

## Overview

This visual guide shows the UI components and workflows for the Permission CRUD interface.

## Main Interface

### Permissions Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│ Permission Management                                               │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                       │
│ [Matrix] [Roles] [Users] [Permissions] [Templates] [Audit]          │
│                           ^^^^^^^^^^^                                 │
│                           Active Tab                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Permission Management Header

```
┌─────────────────────────────────────────────────────────────────────┐
│ Permissions                                    [+ Create Permission] │
│ Manage individual permissions that can be assigned to roles          │
└─────────────────────────────────────────────────────────────────────┘
```

## Permission Table

### Table Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ [🔍 Search permissions...]                          [⚙️ Filters]     │
├─────────────────────────────────────────────────────────────────────┤
│ ☐ │ Name ↕          │ Resource ↕ │ Action ↕ │ Scope ↕ │ Status │ ⚙️ │
├───┼─────────────────┼────────────┼──────────┼─────────┼────────┼───┤
│ ☐ │ application_    │ application│ approve  │ dept    │ Active │ ✏️🗑│
│   │ approve         │            │          │         │        │    │
│   │ Approve loans   │            │          │         │        │    │
├───┼─────────────────┼────────────┼──────────┼─────────┼────────┼───┤
│ ☐ │ user_create     │ user       │ create   │ global  │ Active │ ✏️🗑│
│   │ Create users    │            │          │         │        │    │
├───┼─────────────────┼────────────┼──────────┼─────────┼────────┼───┤
│ ☐ │ file_delete     │ file       │ delete   │ own     │Inactive│ ✏️🗑│
│   │ Delete files    │            │          │         │        │    │
└─────────────────────────────────────────────────────────────────────┘
│ Showing 1 to 50 of 150 results          [◀] [1] [2] [3] [4] [▶]    │
└─────────────────────────────────────────────────────────────────────┘
```

### With Filters Expanded

```
┌─────────────────────────────────────────────────────────────────────┐
│ [🔍 Search permissions...]                    [⚙️ Filters] [Active]  │
├─────────────────────────────────────────────────────────────────────┤
│ Resource Type ▼    │ Action ▼        │ Scope ▼         │ Status ▼  │
│ [Application   ]   │ [Approve    ]   │ [Department ]   │ [Active]  │
└─────────────────────────────────────────────────────────────────────┘
```

### With Bulk Selection

```
┌─────────────────────────────────────────────────────────────────────┐
│ 3 permission(s) selected        [✓ Activate] [⊗ Deactivate] [🗑 Delete]│
├─────────────────────────────────────────────────────────────────────┤
│ ☑ │ Name            │ Resource   │ Action   │ Scope   │ Status │ ⚙️ │
├───┼─────────────────┼────────────┼──────────┼─────────┼────────┼───┤
│ ☑ │ application_... │ application│ approve  │ dept    │ Active │ ✏️🗑│
│ ☑ │ user_create     │ user       │ create   │ global  │ Active │ ✏️🗑│
│ ☑ │ file_delete     │ file       │ delete   │ own     │Inactive│ ✏️🗑│
└─────────────────────────────────────────────────────────────────────┘
```

## Create Permission Modal

### Modal Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Create New Permission                                           [✕] │
│ Fill in the details to create a new permission. All fields marked   │
│ with * are required.                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ Permission Name *                                                    │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ application_approve                                             │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ e.g., application_approve                                            │
│                                                                       │
│ Description *                                                        │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Allows user to approve loan applications                        │ │
│ │                                                                  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ 42 / 500 characters                                                  │
│                                                                       │
│ Resource Type *                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Application                                                    ▼│ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│ Action *                                                             │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Approve                                                        ▼│ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│ Scope *                                                              │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Department                                                     ▼│ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│ Conditions (JSON)                                               [ℹ️] │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ {                                                                │ │
│ │   "min_amount": 1000,                                           │ │
│ │   "max_amount": 50000                                           │ │
│ │ }                                                                │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ Optional: Add custom conditions as a JSON object                    │
│                                                                       │
│ ☑ Active                                                             │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                          [Cancel] [Create Permission]│
└─────────────────────────────────────────────────────────────────────┘
```

### With Validation Errors

```
┌─────────────────────────────────────────────────────────────────────┐
│ Permission Name *                                                    │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ app approve                                                     │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ ❌ Name can only contain letters, numbers, and underscores          │
│                                                                       │
│ Description *                                                        │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                                                                  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ ❌ Description is required                                           │
│                                                                       │
│ Conditions (JSON)                                               [ℹ️] │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ {invalid json                                                    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ ❌ Invalid JSON format                                               │
└─────────────────────────────────────────────────────────────────────┘
```

## Edit Permission Modal

### Modal Layout (Edit Mode)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Edit Permission                                                 [✕] │
│ Update the permission details below. Note that name, resource type, │
│ action, and scope cannot be changed.                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ Permission Name *                                                    │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ application_approve                                      [LOCKED]│ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ Permission name cannot be changed after creation                    │
│                                                                       │
│ Description *                                                        │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Allows user to approve loan applications up to $50,000          │ │
│ │                                                                  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ 54 / 500 characters                                                  │
│                                                                       │
│ Resource Type *                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Application                                             [LOCKED]│ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│ Action *                                                             │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Approve                                                 [LOCKED]│ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│ Scope *                                                              │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Department                                              [LOCKED]│ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│ Conditions (JSON)                                               [ℹ️] │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ {                                                                │ │
│ │   "min_amount": 1000,                                           │ │
│ │   "max_amount": 50000,                                          │ │
│ │   "requires_review": true                                       │ │
│ │ }                                                                │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ Optional: Add custom conditions as a JSON object                    │
│                                                                       │
│ ☑ Active                                                             │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                          [Cancel] [Update Permission]│
└─────────────────────────────────────────────────────────────────────┘
```

## Delete Confirmation Dialog

### Standard Permission

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⚠️  Delete Permission                                               │
│                                                                       │
│  Are you sure you want to delete the permission                     │
│  application_approve?                                                │
│                                                                       │
│  This action cannot be undone. All roles and users with this        │
│  permission will lose access.                                        │
│                                                                       │
│                                                    [Cancel] [Delete] │
└─────────────────────────────────────────────────────────────────────┘
```

### System Permission

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⚠️  Delete Permission                                               │
│                                                                       │
│  Are you sure you want to delete the permission                     │
│  system_admin_access?                                                │
│                                                                       │
│  This action cannot be undone. All roles and users with this        │
│  permission will lose access.                                        │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ ⚠️ Warning: This is a system permission. Deleting it may      │  │
│  │ affect core system functionality.                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│                                                    [Cancel] [Delete] │
└─────────────────────────────────────────────────────────────────────┘
```

## Unsaved Changes Dialog

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⚠️  Unsaved Changes                                                 │
│                                                                       │
│  You have unsaved changes. What would you like to do?               │
│                                                                       │
│  • Discard: Lose your changes and close the form                    │
│  • Save: Submit the form and save your changes                      │
│  • Cancel: Return to editing                                         │
│                                                                       │
│                                        [Discard] [Cancel] [Save]    │
└─────────────────────────────────────────────────────────────────────┘
```

## Toast Notifications

### Success Messages

```
┌─────────────────────────────────────────────┐
│ ✓ Permission created successfully           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ✓ Permission updated successfully           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ✓ Permission deleted successfully           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ✓ Permission activated successfully         │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ✓ 5 permission(s) deactivated successfully  │
└─────────────────────────────────────────────┘
```

### Error Messages

```
┌─────────────────────────────────────────────┐
│ ✗ Failed to create permission               │
│   Name already exists                       │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ✗ Failed to update permission               │
│   Permission denied                         │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ✗ Failed to delete permission               │
│   Network error - please try again          │
└─────────────────────────────────────────────┘
```

## Loading States

### Table Loading

```
┌─────────────────────────────────────────────────────────────────────┐
│ [🔍 Search permissions...]                          [⚙️ Filters]     │
├─────────────────────────────────────────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└─────────────────────────────────────────────────────────────────────┘
```

### Form Submitting

```
┌─────────────────────────────────────────────────────────────────────┐
│                                [Cancel] [⟳ Creating Permission...]  │
└─────────────────────────────────────────────────────────────────────┘
```

### Delete Confirming

```
┌─────────────────────────────────────────────────────────────────────┐
│                                [Cancel] [⟳ Deleting...]             │
└─────────────────────────────────────────────────────────────────────┘
```

## Empty States

### No Permissions

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                       │
│                              🔑                                       │
│                                                                       │
│                      No permissions found                            │
│                                                                       │
│              Get started by creating a new permission                │
│                                                                       │
│                      [+ Create Permission]                           │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### No Search Results

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                       │
│                              🔍                                       │
│                                                                       │
│                      No permissions found                            │
│                                                                       │
│              Try adjusting your search or filters                    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Responsive Design

### Mobile View

```
┌─────────────────────────┐
│ Permissions             │
│ [+ Create]              │
├─────────────────────────┤
│ [🔍 Search...]          │
│ [⚙️ Filters]            │
├─────────────────────────┤
│ ☐ application_approve   │
│ Application • Approve   │
│ Department • Active     │
│ [✏️] [🗑]                │
├─────────────────────────┤
│ ☐ user_create           │
│ User • Create           │
│ Global • Active         │
│ [✏️] [🗑]                │
├─────────────────────────┤
│ ☐ file_delete           │
│ File • Delete           │
│ Own • Inactive          │
│ [✏️] [🗑]                │
└─────────────────────────┘
```

## Color Coding

### Status Badges

- **Active**: Green background (#10B981)
- **Inactive**: Gray background (#6B7280)
- **System**: Blue background (#3B82F6)

### Resource Type Badges

- Purple background (#8B5CF6)

### Action Badges

- Blue background (#3B82F6)

### Scope Badges

- Green background (#10B981)

## Accessibility Features

### Keyboard Navigation

```
Tab Order:
1. Search input
2. Filters button
3. Create Permission button
4. Select all checkbox
5. First permission checkbox
6. First permission edit button
7. First permission delete button
8. Second permission checkbox
... and so on
```

### Screen Reader Announcements

- "Permission created successfully"
- "Permission updated successfully"
- "Permission deleted successfully"
- "3 permissions selected"
- "Filters active"
- "Sorting by name ascending"

### Focus Indicators

All interactive elements have visible focus indicators:
- Blue outline (2px solid #3B82F6)
- Sufficient contrast ratio (4.5:1)

## User Flows

### Create Flow

```
1. Click "Create Permission"
   ↓
2. Modal opens
   ↓
3. Fill in form fields
   ↓
4. Form validates in real-time
   ↓
5. Click "Create Permission"
   ↓
6. Loading state shown
   ↓
7. Success toast appears
   ↓
8. Modal closes
   ↓
9. Table refreshes
   ↓
10. New permission visible
```

### Edit Flow

```
1. Click edit icon (✏️)
   ↓
2. Modal opens with data
   ↓
3. Modify editable fields
   ↓
4. Form validates in real-time
   ↓
5. Click "Update Permission"
   ↓
6. Loading state shown
   ↓
7. Success toast appears
   ↓
8. Modal closes
   ↓
9. Table refreshes
   ↓
10. Updated permission visible
```

### Delete Flow

```
1. Click delete icon (🗑)
   ↓
2. Confirmation dialog opens
   ↓
3. Read warning message
   ↓
4. Click "Delete"
   ↓
5. Loading state shown
   ↓
6. Success toast appears
   ↓
7. Dialog closes
   ↓
8. Table refreshes
   ↓
9. Permission removed
```

### Bulk Delete Flow

```
1. Select multiple permissions
   ↓
2. Bulk toolbar appears
   ↓
3. Click "Delete"
   ↓
4. Confirmation dialog opens
   ↓
5. Shows count (e.g., "5 permissions")
   ↓
6. Click "Delete"
   ↓
7. Loading state shown
   ↓
8. Success toast with count
   ↓
9. Dialog closes
   ↓
10. Table refreshes
   ↓
11. Permissions removed
   ↓
12. Selection cleared
```

---

**Last Updated**: October 17, 2025  
**Version**: 1.0  
**Status**: Production Ready
