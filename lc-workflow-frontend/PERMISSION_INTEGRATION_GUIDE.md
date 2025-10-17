# Permission Integration Guide

This document tracks which permissions control which UI elements throughout the application.

## Overview

The application now uses dynamic permission checks via the `usePermissionCheck` hook instead of hardcoded role checks. This provides more granular access control and allows administrators to manage permissions through the Permission Management System.

## Permission Check Hook

```typescript
import { usePermissionCheck } from '@/hooks/usePermissionCheck';

const { can, hasRole, hasPermission, loading } = usePermissionCheck();

// Check if user can perform an action on a resource
if (can('application', 'create')) {
  // Show create button
}

// Check if user has a specific role
if (hasRole('admin')) {
  // Show admin-only feature
}

// Check if user has a named permission
if (hasPermission('application:approve')) {
  // Show approve button
}
```

## Permission Mappings by Page

### Applications Page (`/applications`)

| UI Element | Permission Check | Resource | Action |
|------------|------------------|----------|--------|
| Create Application Button | `can('application', 'create')` | application | create |
| Edit Application Button | `can('application', 'update')` | application | update |
| Delete Application Button | `can('application', 'delete')` | application | delete |
| View Application Link | Always visible | - | - |
| Empty State Create Button | `can('application', 'create')` | application | create |

**Notes:**
- Edit and Delete buttons also check if the user owns the application (`application.user_id === user?.id`)
- Delete button only shows for draft applications

### Users Page (`/users`)

| UI Element | Permission Check | Resource | Action |
|------------|------------------|----------|--------|
| Add User Button | `can('user', 'create')` | user | create |
| Export CSV Button | `can('user', 'export')` | user | export |
| Import CSV Button | `can('user', 'import')` | user | import |
| Edit User Button | Handled by UserList component | user | update |
| Delete User Button | Handled by UserList component | user | delete |
| View User Button | Handled by UserList component | user | read |

**Notes:**
- Bulk operations require appropriate permissions
- User lifecycle management requires `user:manage` permission

### Employees Page (`/employees`)

| UI Element | Permission Check | Resource | Action |
|------------|------------------|----------|--------|
| Create Employee Button | `can('employee', 'create')` | employee | create |
| Workload Dashboard Link | `can('employee', 'view_all')` | employee | view_all |
| Edit Employee Button | `can('employee', 'update')` | employee | update |
| Delete Employee Button | `can('employee', 'delete')` | employee | delete |
| Empty State Create Button | `can('employee', 'create')` | employee | create |

**Notes:**
- Delete actually deactivates the employee (soft delete)

### Branches Page (`/branches`)

| UI Element | Permission Check | Resource | Action |
|------------|------------------|----------|--------|
| Add Branch Button | `can('branch', 'create')` | branch | create |
| View Branch Link | `can('branch', 'read')` | branch | read |
| Edit Branch Link | `can('branch', 'update')` | branch | update |
| Delete Branch Button | `can('branch', 'delete')` | branch | delete |
| Empty State Create Button | `can('branch', 'create')` | branch | create |

### Departments Page (`/departments`)

| UI Element | Permission Check | Resource | Action |
|------------|------------------|----------|--------|
| New Department Button | `can('department', 'create')` | department | create |
| View Details Link | `can('department', 'read')` | department | read |
| Edit Link | `can('department', 'update')` | department | update |
| Delete Button | `can('department', 'delete')` | department | delete |
| Empty State Create Button | `can('department', 'create')` | department | create |

### Navigation (Sidebar & Mobile Menu)

| Navigation Item | Permission Check | Resource | Action |
|----------------|------------------|----------|--------|
| Dashboard | Always visible | - | - |
| Applications | `can('application', 'read')` | application | read |
| Employees | `can('employee', 'read')` | employee | read |
| Files | `can('file', 'read')` | file | read |
| Departments | `can('department', 'read')` | department | read |
| Positions | `can('system', 'manage')` | system | manage |
| Users | `can('user', 'read')` | user | read |
| Branches | `can('branch', 'read')` | branch | read |
| Analytics | `can('analytics', 'read')` | analytics | read |
| Notifications | `can('notification', 'read')` | notification | read |
| Permissions | `can('system', 'manage')` | system | manage |
| Security | `can('system', 'manage')` | system | manage |
| Settings | `can('system', 'manage')` | system | manage |

**Notes:**
- Navigation items fall back to role-based checks while permissions are loading
- Both role-based and permission-based checks must pass for an item to be visible

## Resource Types

The following resource types are used throughout the application:

- `application` - Loan applications
- `user` - System users
- `employee` - Employees
- `branch` - Branch locations
- `department` - Organizational departments
- `file` - File management
- `folder` - Folder management
- `analytics` - Analytics and reporting
- `notification` - Notifications
- `audit` - Audit logs
- `system` - System-level operations

## Permission Actions

Common actions used across resources:

- `create` - Create new records
- `read` - View records
- `update` - Edit existing records
- `delete` - Delete records
- `approve` - Approve applications/requests
- `reject` - Reject applications/requests
- `assign` - Assign records to users
- `export` - Export data
- `import` - Import data
- `manage` - Full management access
- `view_all` - View all records (not just own)
- `view_own` - View only own records
- `view_team` - View team records
- `view_department` - View department records
- `view_branch` - View branch records

## Permission Scopes

Permissions can have different scopes:

- `global` - Access to all records system-wide
- `department` - Access limited to user's department
- `branch` - Access limited to user's branch
- `team` - Access limited to user's team
- `own` - Access limited to user's own records

## Implementation Notes

### Loading States

While permissions are loading (`permissionsLoading === true`), the application:
1. Falls back to role-based checks in navigation
2. Hides permission-gated buttons to prevent premature access
3. Shows loading indicators where appropriate

### Backward Compatibility

The implementation maintains backward compatibility by:
1. Keeping role-based checks as fallbacks
2. Allowing ownership checks (`application.user_id === user?.id`)
3. Supporting both permission-based and role-based navigation

### Testing Permissions

To test permission checks:

1. Log in as a user with specific permissions
2. Navigate to different pages
3. Verify that only authorized buttons/links are visible
4. Attempt to access restricted pages directly (should redirect or show error)

### Adding New Permission Checks

When adding new features that require permission checks:

1. Import the hook:
   ```typescript
   import { usePermissionCheck } from '@/hooks/usePermissionCheck';
   ```

2. Use the hook in your component:
   ```typescript
   const { can, loading } = usePermissionCheck();
   ```

3. Wrap UI elements with permission checks:
   ```typescript
   {can('resource', 'action') && (
     <button>Protected Action</button>
   )}
   ```

4. Update this documentation with the new permission mapping

## Backend Integration

All permission checks are validated on the backend. The frontend checks are for UX only and do not provide security. The backend:

1. Validates every API request
2. Returns 403 Forbidden for unauthorized requests
3. Maintains the source of truth for permissions
4. Provides the `/api/v1/permissions/me` endpoint for current user permissions

## Future Enhancements

Potential improvements to the permission system:

1. Add permission caching with longer TTL
2. Implement permission prefetching on login
3. Add permission-based route guards
4. Create a permission debugging tool
5. Add permission audit logging
6. Implement time-based permissions
7. Add conditional permissions based on resource state
