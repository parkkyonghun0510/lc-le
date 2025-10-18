# Role Management Component - Visual Guide

## Component Layout

### 1. Header Section
```
┌─────────────────────────────────────────────────────────────────┐
│ Role Management                    [List View] [Hierarchy]  [+] │
│ Create and manage system roles                    Create Role   │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Filters Section (List View)
```
┌─────────────────────────────────────────────────────────────────┐
│ [🔍 Search roles...]                    [✓] Show inactive       │
│                                                                  │
│ Level: [Min] - [Max]  Sort by: [Level ▼]  [↓ Desc]  Clear     │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Bulk Actions Bar (When roles selected)
```
┌─────────────────────────────────────────────────────────────────┐
│ 3 roles selected              [Bulk Actions]  [Clear Selection] │
└─────────────────────────────────────────────────────────────────┘
```

### 4. List View - Role Items
```
┌─────────────────────────────────────────────────────────────────┐
│ [✓] 🛡️  System Administrator                    [👁️] [✏️] [🗑️] │
│         Full system access and control                          │
│         [Level 100] [System] [Active]                          │
│         50 permissions • Created Jan 15, 2024                   │
├─────────────────────────────────────────────────────────────────┤
│ [✓] 🛡️  Branch Manager                          [👁️] [✏️] [🗑️] │
│         Manage branch operations and staff                      │
│         [Level 70] [Active]                                     │
│         35 permissions • Created Feb 20, 2024                   │
├─────────────────────────────────────────────────────────────────┤
│ [ ] 🛡️  Loan Officer                            [👁️] [✏️] [🗑️] │
│         Process and review loan applications                    │
│         [Level 40] [Default] [Active]                          │
│         20 permissions • Created Mar 10, 2024                   │
└─────────────────────────────────────────────────────────────────┘
```

### 5. Hierarchy View
```
┌─────────────────────────────────────────────────────────────────┐
│ Role Hierarchy                    [Expand All] [Collapse All]   │
├─────────────────────────────────────────────────────────────────┤
│ ▼ 🛡️ System Administrator [L100] [System]                      │
│   │   50 permissions                                            │
│   │                                                             │
│   ├─ ▼ 🛡️ Branch Manager [L70]                                │
│   │   │   35 permissions                                        │
│   │   │                                                         │
│   │   ├─ ▶ 🛡️ Loan Officer [L40] [Default]                    │
│   │   │     20 permissions                                      │
│   │   │                                                         │
│   │   └─ ▶ 🛡️ Teller [L30]                                    │
│   │         15 permissions                                      │
│   │                                                             │
│   └─ ▶ 🛡️ Auditor [L60]                                       │
│         25 permissions                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 6. Footer with Pagination
```
┌─────────────────────────────────────────────────────────────────┐
│ Showing 1 to 10 of 45 roles  [10 per page ▼]                   │
│                                                                  │
│              [First] [Previous] Page 1 of 5 [Next] [Last]      │
└─────────────────────────────────────────────────────────────────┘
```

## Modal Dialogs

### 1. Create/Edit Role Modal
```
┌─────────────────────────────────────────────────────────────────┐
│ Create New Role                                            [✕]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Role Name (System) *          Display Name *                    │
│ [branch_manager        ]      [Branch Manager          ]        │
│                                                                  │
│ Description *                                                    │
│ [Manage branch operations and staff                    ]        │
│ [                                                       ]        │
│                                                                  │
│ Level (0-100) *               Parent Role                       │
│ [70                    ]      [System Administrator ▼  ]        │
│                                                                  │
│ ─────────────────────────────────────────────────────────────── │
│                                                                  │
│ Permissions (35 selected)                      [Hide Permissions]│
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [🔍 Search permissions...]                                  │ │
│ │ [All Categories ▼]                                          │ │
│ │ [Select All Filtered] [Clear All]                           │ │
│ │                                                             │ │
│ │ [✓] application:create                                      │ │
│ │     Create new loan applications                            │ │
│ │     [application] [create] [branch]                         │ │
│ │                                                             │ │
│ │ [✓] application:read                                        │ │
│ │     View loan applications                                  │ │
│ │     [application] [read] [branch]                           │ │
│ │                                                             │ │
│ │ [ ] application:delete                                      │ │
│ │     Delete loan applications                                │ │
│ │     [application] [delete] [global]                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│                                    [Cancel]  [Create Role]      │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Role Details Modal
```
┌─────────────────────────────────────────────────────────────────┐
│ Role Details                                               [✕]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Display Name                                                     │
│ Branch Manager                                                   │
│                                                                  │
│ System Name                                                      │
│ branch_manager                                                   │
│                                                                  │
│ Description                                                      │
│ Manage branch operations and staff                              │
│                                                                  │
│ Level                         Permissions                        │
│ 70                            35                                 │
│                                                                  │
│ Status                                                           │
│ ✓ Active                                                         │
│                                                                  │
│ [System Role] [Default Role]                                    │
│                                                                  │
│                                          [Close]                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Bulk Operations Modal
```
┌─────────────────────────────────────────────────────────────────┐
│ Bulk Role Operations                                       [✕]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 3 roles selected                                            │ │
│ │                                                             │ │
│ │ • Branch Manager                              Level 70     │ │
│ │ • Loan Officer                                Level 40     │ │
│ │ • Teller                                      Level 30     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Select Operation                                                 │
│ [Activate Roles                                            ▼]   │
│                                                                  │
│ Options:                                                         │
│ • Activate Roles                                                │
│ • Deactivate Roles                                              │
│ • Change Level                                                  │
│ • Delete Roles                                                  │
│                                                                  │
│                                    [Cancel]  [Apply Operation]  │
└─────────────────────────────────────────────────────────────────┘
```

## Color Coding

### Role Level Badges
- **Level 80-100**: 🔴 Red (High Authority)
  - `bg-red-100 text-red-800`
- **Level 60-79**: 🟡 Yellow (Medium Authority)
  - `bg-yellow-100 text-yellow-800`
- **Level 0-59**: 🟢 Green (Standard Authority)
  - `bg-green-100 text-green-800`

### Status Badges
- **System Role**: 🔵 Blue
  - `bg-blue-100 text-blue-800`
- **Default Role**: 🟣 Purple
  - `bg-purple-100 text-purple-800`
- **Inactive**: ⚫ Gray
  - `bg-gray-100 text-gray-800`
- **Active**: 🟢 Green (icon)
  - `text-green-500`

### Permission Badges
- **Resource Type**: 🔵 Blue
  - `bg-blue-100 text-blue-800`
- **Action**: 🟢 Green
  - `bg-green-100 text-green-800`
- **Scope**: 🟣 Purple
  - `bg-purple-100 text-purple-800`

## Interaction Patterns

### 1. Role Selection
```
Click checkbox → Role selected → Bulk actions bar appears
Multiple selections → Count updates → Bulk operations available
```

### 2. View Switching
```
Click "List View" → Shows paginated table with filters
Click "Hierarchy" → Shows tree structure with expand/collapse
```

### 3. Role Creation Flow
```
Click "Create Role" → Modal opens
Fill form fields → Select permissions → Click "Create Role"
Success → Modal closes → List refreshes → Toast notification
```

### 4. Permission Assignment
```
Click "Show Permissions" → Permission list expands
Search/filter → Select checkboxes → Count updates
Click "Hide Permissions" → Section collapses
```

### 5. Bulk Operations Flow
```
Select roles → Click "Bulk Actions" → Modal opens
Choose operation → Configure options → Click "Apply"
Processing → Success/error feedback → List refreshes
```

### 6. Hierarchy Navigation
```
Click expand icon → Children appear with indentation
Click role → Role details modal opens
Click collapse icon → Children hide
```

## Responsive Behavior

### Desktop (1024px+)
- Full layout with all features visible
- Side-by-side filters and controls
- Multi-column forms
- Wide modals

### Tablet (768px-1023px)
- Stacked filters
- Single-column forms
- Medium-width modals
- Horizontal scroll for hierarchy

### Mobile (320px-767px)
- Vertical layout
- Collapsible sections
- Full-width modals
- Touch-optimized controls
- Simplified hierarchy view

## Keyboard Shortcuts

- **Tab**: Navigate between elements
- **Enter**: Activate buttons/links
- **Space**: Toggle checkboxes
- **Escape**: Close modals
- **Arrow Keys**: Navigate hierarchy tree
- **Ctrl/Cmd + F**: Focus search (browser default)

## Loading States

### Initial Load
```
┌─────────────────────────────────────────────────────────────────┐
│ [Animated skeleton rows]                                         │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└─────────────────────────────────────────────────────────────────┘
```

### Processing
```
┌─────────────────────────────────────────────────────────────────┐
│                         [⟳ Processing...]                        │
└─────────────────────────────────────────────────────────────────┘
```

### Empty State
```
┌─────────────────────────────────────────────────────────────────┐
│                            🛡️                                    │
│                       No roles found                             │
│              Try adjusting your search criteria                  │
└─────────────────────────────────────────────────────────────────┘
```

## Error States

### Network Error
```
┌─────────────────────────────────────────────────────────────────┐
│                            ⚠️                                    │
│                       Network Error                              │
│              Unable to connect to the server                     │
│                                                                  │
│ Try these solutions:                                             │
│ • Check your internet connection                                │
│ • Try refreshing the page                                       │
│                                                                  │
│                        [Try Again]                               │
└─────────────────────────────────────────────────────────────────┘
```

### Permission Denied
```
┌─────────────────────────────────────────────────────────────────┐
│                            🔒                                    │
│                      Access Denied                               │
│        You don't have permission to view roles                   │
│                                                                  │
│ Try these solutions:                                             │
│ • Contact your administrator for access                         │
│ • Verify you are logged in with the correct account            │
│                                                                  │
│                        [Go Back]                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Success Feedback

### Toast Notifications
```
┌─────────────────────────────────────────────────────────────────┐
│ ✓ Role "Branch Manager" created successfully                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ✓ Bulk operation completed: 3 roles updated                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ✓ Draft restored from 5 minutes ago                             │
└─────────────────────────────────────────────────────────────────┘
```

This visual guide provides a comprehensive overview of the Role Management component's UI and interaction patterns.
