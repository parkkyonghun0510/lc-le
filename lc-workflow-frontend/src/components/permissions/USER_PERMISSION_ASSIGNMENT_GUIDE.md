# User Permission Assignment - Visual Guide

## Component Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    User Permission Assignment                            │
│                 Assign roles and permissions to users                    │
├──────────────────────────┬──────────────────────────────────────────────┤
│  USER SEARCH PANEL       │  USER DETAILS & PERMISSIONS PANEL            │
│  (1/3 width)             │  (2/3 width)                                 │
│                          │                                              │
│  ┌────────────────────┐  │  ┌────────────────────────────────────────┐ │
│  │ 🔍 Search users... │  │  │  USER PROFILE SUMMARY                  │ │
│  └────────────────────┘  │  │  ┌──────────────────────────────────┐ │ │
│  [Show Filters ▼]        │  │  │ 👤 John Doe                      │ │ │
│                          │  │  │    john.doe@example.com          │ │ │
│  ┌────────────────────┐  │  │  │    🛡️ 2 Roles  ✓ 3 Direct      │ │ │
│  │ Role: [All Roles▼]│  │  │  │    🔒 15 Total Permissions       │ │ │
│  └────────────────────┘  │  │  └──────────────────────────────────┘ │ │
│                          │  └────────────────────────────────────────┘ │
│  ┌────────────────────┐  │                                              │
│  │ 👤 John Doe       │  │  ┌────────────────────────────────────────┐ │
│  │    john@email.com │◄─┼──┤  ROLE ASSIGNMENTS        [+ Assign]   │ │
│  │    Engineering    │  │  │  ┌──────────────────────────────────┐ │ │
│  └────────────────────┘  │  │  │ 🛡️ Admin                        │ │ │
│                          │  │  │    System administrator role     │ │ │
│  ┌────────────────────┐  │  │  │    Level 10 • System      [🗑️]  │ │ │
│  │ 👤 Jane Smith     │  │  │  └──────────────────────────────────┘ │ │
│  │    jane@email.com │  │  │  ┌──────────────────────────────────┐ │ │
│  │    Sales          │  │  │  │ 🛡️ Manager                      │ │ │
│  └────────────────────┘  │  │  │    Department manager role       │ │ │
│                          │  │  │    Level 5                [🗑️]  │ │ │
│  ┌────────────────────┐  │  │  └──────────────────────────────────┘ │ │
│  │ 👤 Bob Wilson     │  │  └────────────────────────────────────────┘ │
│  │    bob@email.com  │  │                                              │
│  │    Marketing      │  │  ┌────────────────────────────────────────┐ │
│  └────────────────────┘  │  │  DIRECT PERMISSIONS      [+ Grant]    │ │
│                          │  │  ┌──────────────────────────────────┐ │ │
│  Showing 3 of 45 users   │  │  │ ✅ user:create                   │ │ │
│                          │  │  │    Create new users              │ │ │
│                          │  │  │    user • create • global  [🗑️] │ │ │
│                          │  │  └──────────────────────────────────┘ │ │
│                          │  │  ┌──────────────────────────────────┐ │ │
│                          │  │  │ ❌ application:delete            │ │ │
│                          │  │  │    Delete applications           │ │ │
│                          │  │  │    application • delete    [🗑️] │ │ │
│                          │  │  └──────────────────────────────────┘ │ │
│                          │  └────────────────────────────────────────┘ │
│                          │                                              │
│                          │  ┌────────────────────────────────────────┐ │
│                          │  │  EFFECTIVE PERMISSIONS                 │ │
│                          │  │  All permissions from all sources      │ │
│                          │  │                                        │ │
│                          │  │  🔍 Search  [Resource▼]  [Source▼]   │ │
│                          │  │  Showing 15 of 15 permissions          │ │
│                          │  │                                        │ │
│                          │  │  User Permissions (5)                  │ │
│                          │  │  ┌──────────────────────────────────┐ │ │
│                          │  │  │ user:create • create • global    │ │ │
│                          │  │  │ Create new users                 │ │ │
│                          │  │  │ [From Role: Admin]               │ │ │
│                          │  │  └──────────────────────────────────┘ │ │
│                          │  │                                        │ │
│                          │  │  Application Permissions (8)           │ │
│                          │  │  ┌──────────────────────────────────┐ │ │
│                          │  │  │ application:read • read • branch │ │ │
│                          │  │  │ View applications                │ │ │
│                          │  │  │ [From Role: Manager]             │ │ │
│                          │  │  └──────────────────────────────────┘ │ │
│                          │  └────────────────────────────────────────┘ │
└──────────────────────────┴──────────────────────────────────────────────┘
```

## Modal Dialogs

### Assign Role Modal

```
┌─────────────────────────────────────────────────────────┐
│  Assign Role                                        [✕] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🔍 Search roles...                                     │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ○ Admin                              Level 10     │ │
│  │   System administrator role          [System]     │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ● Manager                            Level 5      │ │
│  │   Department manager role                         │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ○ Officer                            Level 1      │ │
│  │   Basic user role                                 │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                              [Cancel]  [Assign Role]    │
└─────────────────────────────────────────────────────────┘
```

### Grant Permission Modal

```
┌─────────────────────────────────────────────────────────┐
│  Grant Direct Permission                            [✕] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Permission Type                                        │
│  ○ Grant (Allow access)                                │
│  ● Deny (Override role permissions)                    │
│  Deny this permission, overriding any role-based grants│
│                                                         │
│  🔍 Search permissions...  [Resource Type ▼]           │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ○ user:create                                     │ │
│  │   [user] [create] [global]                        │ │
│  │   Create new users in the system                  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ● application:delete                              │ │
│  │   [application] [delete] [branch]                 │ │
│  │   Delete applications                             │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                          [Cancel]  [Deny Permission]    │
└─────────────────────────────────────────────────────────┘
```

### Bulk Role Assignment Modal

```
┌─────────────────────────────────────────────────────────┐
│  Bulk Role Assignment                               [✕] │
│  Assign a role to 5 selected users                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  👥 Selected Users (5)                                  │
│  ┌───────────────────────────────────────────────────┐ │
│  │ [John Doe] [Jane Smith] [Bob Wilson]             │ │
│  │ [Alice Brown] [Charlie Davis]                     │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Select Role to Assign                                  │
│  🔍 Search roles...                                     │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ○ Admin                              Level 10     │ │
│  │   System administrator role          [System]     │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ● Manager                            Level 5      │ │
│  │   Department manager role                         │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ⚠️ Important                                           │
│  This will assign the selected role to all 5 users.    │
│  Users may already have other roles assigned.          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                    [Cancel]  [Assign to 5 Users]        │
└─────────────────────────────────────────────────────────┘
```

## Color Coding

### Role Assignment Cards
- **Blue** (🛡️): Regular roles
- **Purple** (System badge): System roles (cannot be removed)
- **Gray** (Inactive badge): Inactive roles

### Direct Permission Cards
- **Green** (✅): Granted permissions
- **Red** (❌): Denied permissions (override role grants)

### Effective Permission Cards
- **Blue badge**: From Role source
- **Green badge**: Direct Permission source
- **Red background**: Denied permissions

## User Interactions

### Search and Filter Flow
1. Type in search box → Debounced search (300ms)
2. Click "Show Filters" → Expand filter options
3. Select filters → Immediate results update
4. Click user → Load user details in right panel

### Role Assignment Flow
1. Select user → View current roles
2. Click "+ Assign Role" → Open modal
3. Search/select role → Click "Assign Role"
4. Success toast → UI updates immediately

### Permission Grant Flow
1. Select user → View direct permissions
2. Click "+ Grant Permission" → Open modal
3. Choose Grant/Deny → Search permission
4. Select permission → Click action button
5. Success toast → UI updates immediately

### Effective Permissions View
1. Select user → Scroll to effective permissions
2. Use filters → Narrow down list
3. View grouped by resource type
4. See source attribution for each permission

## Responsive Behavior

### Desktop (1024px+)
- 3-column layout (1/3 search, 2/3 details)
- All sections visible
- Side-by-side panels

### Tablet (768px-1024px)
- 2-column layout
- Stacked sections in details panel
- Horizontal scroll for tables

### Mobile (320px-768px)
- Single column layout
- Search panel collapses
- Full-width details panel
- Touch-optimized buttons

## Accessibility Features

- **Keyboard Navigation**: Tab through all interactive elements
- **Screen Readers**: ARIA labels on all controls
- **Focus Indicators**: Clear blue outline on focused elements
- **Color Independence**: Icons and text labels, not just color
- **High Contrast**: WCAG AA compliant contrast ratios

## Performance Indicators

- **Loading States**: Skeleton loaders during data fetch
- **Optimistic Updates**: Immediate UI feedback
- **Error States**: Clear error messages with retry options
- **Success Feedback**: Toast notifications for actions

## Status Indicators

- 🛡️ Role/Permission icon
- ✅ Granted permission
- ❌ Denied permission
- 👤 User avatar
- 🔍 Search icon
- ➕ Add/Assign action
- 🗑️ Remove/Delete action
- ⚠️ Warning/Important notice
- 👥 Multiple users (bulk)
