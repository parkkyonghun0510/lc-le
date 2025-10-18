# Permission Migration Guide

## Overview

This guide helps developers migrate from the old role-based access control to the new permission-based RBAC system.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Migration Utilities](#migration-utilities)
3. [Common Patterns](#common-patterns)
4. [Role to Permission Mapping](#role-to-permission-mapping)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

## Quick Start

### Before (Old Pattern)

```typescript
import { useAuth, useRole } from '@/hooks/useAuth';

function MyComponent() {
  const { user } = useAuth();
  const { isAdmin, isManager, isOfficer } = useRole();
  
  // Old role-based checks
  if (!isAdmin && !isManager) {
    return <div>Access Denied</div>;
  }
  
  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const canDelete = user?.role === 'admin';
  
  return (
    <div>
      {canEdit && <button>Edit</button>}
      {canDelete && <button>Delete</button>}
    </div>
  );
}
```

### After (New Pattern)

```typescript
import { usePermissionCheck } from '@/hooks/usePermissionCheck';

function MyComponent() {
  const { can, hasRole, isAdmin, loading } = usePermissionCheck();
  
  // Show loading state while permissions are being fetched
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // New permission-based checks
  const canViewPage = can('application', 'read', 'department');
  if (!canViewPage) {
    return <div>Access Denied</div>;
  }
  
  const canEdit = can('application', 'update', 'department');
  const canDelete = can('application', 'delete', 'global');
  
  return (
    <div>
      {canEdit && <button>Edit</button>}
      {canDelete && <button>Delete</button>}
    </div>
  );
}
```

### With Fallback (Transition Pattern)

```typescript
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { useAuth } from '@/hooks/useAuth';
import { createPermissionChecker } from '@/utils/permissionMigration';

function MyComponent() {
  const { user } = useAuth();
  const { can, loading } = usePermissionCheck();
  
  // Create permission checker with automatic fallback
  const checkPermission = createPermissionChecker(can, user?.role, user?.id);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // This will use permission system first, then fall back to role-based check
  const canEdit = checkPermission('application', 'update', 'department');
  const canDelete = checkPermission('application', 'delete', 'global');
  
  return (
    <div>
      {canEdit && <button>Edit</button>}
      {canDelete && <button>Delete</button>}
    </div>
  );
}
```

## Migration Utilities

### `checkPermissionWithFallback`

Checks permissions with automatic fallback to role-based checks. Includes logging for monitoring.

```typescript
import { checkPermissionWithFallback } from '@/utils/permissionMigration';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user } = useAuth();
  const { can } = usePermissionCheck();
  
  const permissionCheck = can('application', 'update', 'department');
  const result = checkPermissionWithFallback(
    permissionCheck,
    user?.role,
    'application',
    'update',
    'department',
    user?.id
  );
  
  if (!result.allowed) {
    console.log(`Access denied: ${result.reason}`);
    return <div>Access Denied</div>;
  }
  
  return <div>Content</div>;
}
```

### `createPermissionChecker`

Creates a permission checker function with built-in fallback logic.

```typescript
import { createPermissionChecker } from '@/utils/permissionMigration';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user } = useAuth();
  const { can } = usePermissionCheck();
  
  // Create checker once
  const checkPermission = createPermissionChecker(can, user?.role, user?.id);
  
  // Use it multiple times
  const canCreate = checkPermission('application', 'create', 'own');
  const canUpdate = checkPermission('application', 'update', 'own');
  const canDelete = checkPermission('application', 'delete', 'own');
  
  return (
    <div>
      {canCreate && <button>Create</button>}
      {canUpdate && <button>Update</button>}
      {canDelete && <button>Delete</button>}
    </div>
  );
}
```

### Permission Logger

Monitor permission checks in development:

```typescript
import { permissionLogger } from '@/utils/permissionMigration';

// View all logs
console.log(permissionLogger.getLogs());

// View filtered logs
const userLogs = permissionLogger.getFilteredLogs({ userId: 'user-123' });

// Export logs
const logsJson = permissionLogger.export();

// Clear logs
permissionLogger.clear();

// Enable/disable logging
permissionLogger.setEnabled(true);
```

## Common Patterns

### Pattern 1: Page-Level Access Control

**Before:**
```typescript
const { isAdmin, isManager } = useRole();

if (!isAdmin && !isManager) {
  return <div>Access Denied</div>;
}
```

**After:**
```typescript
const { can, loading } = usePermissionCheck();

if (loading) return <div>Loading...</div>;

if (!can('application', 'read', 'department')) {
  return <div>Access Denied</div>;
}
```

### Pattern 2: Conditional Rendering

**Before:**
```typescript
const { isAdmin } = useRole();

return (
  <div>
    {isAdmin && <button>Delete</button>}
  </div>
);
```

**After:**
```typescript
const { can } = usePermissionCheck();

return (
  <div>
    {can('application', 'delete', 'global') && <button>Delete</button>}
  </div>
);
```

### Pattern 3: Multiple Role Checks

**Before:**
```typescript
const { user } = useAuth();
const canApprove = user?.role === 'admin' || user?.role === 'manager';
```

**After:**
```typescript
const { can } = usePermissionCheck();
const canApprove = can('application', 'approve', 'department');
```

### Pattern 4: Owner-Based Access

**Before:**
```typescript
const { user } = useAuth();
const canEdit = user?.id === item.created_by || user?.role === 'admin';
```

**After:**
```typescript
const { can, isAdmin } = usePermissionCheck();
const canEditOwn = can('application', 'update', 'own');
const canEditAll = can('application', 'update', 'global');
const canEdit = (canEditOwn && user?.id === item.created_by) || canEditAll || isAdmin();
```

### Pattern 5: Loading States

**Always handle loading states:**

```typescript
const { can, loading } = usePermissionCheck();

// Option 1: Show loading indicator
if (loading) {
  return <Spinner />;
}

// Option 2: Disable buttons while loading
<button disabled={loading || !can('application', 'update')}>
  Edit
</button>

// Option 3: Hide features while loading
{!loading && can('application', 'delete') && <button>Delete</button>}
```

## Role to Permission Mapping

### Admin Role

| Old Check | New Permission Check |
|-----------|---------------------|
| `isAdmin` | `isAdmin()` or `hasRole('admin')` |
| `user.role === 'admin'` | `hasRole('admin')` |
| Admin can do anything | `can('resource', 'manage', 'global')` |

**Admin Permissions:**
- `system:manage:global` - System administration
- `user:manage:global` - User management
- `application:manage:global` - Application management
- `file:manage:global` - File management
- `branch:manage:global` - Branch management
- `department:manage:global` - Department management
- `workload:view:global` - Workload viewing
- `notification:manage:global` - Notification management
- `report:view:global` - Report viewing

### Manager Role

| Old Check | New Permission Check |
|-----------|---------------------|
| `isManager` | `hasRole('manager')` |
| `user.role === 'manager'` | `hasRole('manager')` |
| Manager can approve | `can('application', 'approve', 'department')` |
| Manager can view team | `can('user', 'read', 'department')` |

**Manager Permissions:**
- `application:approve:department` - Approve applications
- `application:reject:department` - Reject applications
- `application:read:department` - View applications
- `application:update:department` - Edit applications
- `user:read:department` - View team members
- `workload:view:department` - View team workload
- `file:read:department` - View team files
- `report:view:department` - View team reports

### Officer Role

| Old Check | New Permission Check |
|-----------|---------------------|
| `isOfficer` | `hasRole('officer')` |
| `user.role === 'officer'` | `hasRole('officer')` |
| Officer can create | `can('application', 'create', 'own')` |
| Officer can edit own | `can('application', 'update', 'own')` |

**Officer Permissions:**
- `application:create:own` - Create applications
- `application:read:own` - View own applications
- `application:update:own` - Edit own applications
- `application:process:own` - Process own applications
- `file:create:own` - Upload files
- `file:read:own` - View own files
- `file:update:own` - Edit own files
- `file:delete:own` - Delete own files

## Resource Types

Available resource types in the system:

- `system` - System administration
- `user` - User management
- `application` - Loan applications
- `file` - File management
- `branch` - Branch management
- `department` - Department management
- `workload` - Workload viewing
- `notification` - Notification management
- `report` - Report generation
- `permission` - Permission management
- `role` - Role management

## Permission Actions

Available actions:

- `create` - Create new resources
- `read` - View resources
- `update` - Edit resources
- `delete` - Delete resources
- `manage` - Full management access
- `approve` - Approve applications
- `reject` - Reject applications
- `process` - Process applications
- `assign` - Assign resources
- `view` - View specific data
- `export` - Export data

## Permission Scopes

Available scopes:

- `own` - User's own resources only
- `department` - Department-level access
- `branch` - Branch-level access
- `global` - System-wide access

## Testing

### Unit Testing

```typescript
import { renderHook } from '@testing-library/react';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';

describe('Permission Checks', () => {
  it('should allow admin to delete', () => {
    const { result } = renderHook(() => usePermissionCheck());
    
    expect(result.current.can('application', 'delete', 'global')).toBe(true);
  });
  
  it('should deny officer from deleting', () => {
    const { result } = renderHook(() => usePermissionCheck());
    
    expect(result.current.can('application', 'delete', 'global')).toBe(false);
  });
});
```

### Integration Testing

```typescript
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should show edit button for users with update permission', () => {
    render(<MyComponent />);
    
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });
  
  it('should hide delete button for users without delete permission', () => {
    render(<MyComponent />);
    
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });
});
```

### Manual Testing

1. **Test with different roles:**
   - Login as admin, manager, officer
   - Verify each role has appropriate access

2. **Test permission changes:**
   - Change user permissions in admin UI
   - Verify changes take effect immediately

3. **Test loading states:**
   - Slow down network in DevTools
   - Verify loading states display correctly

4. **Test fallback behavior:**
   - Check console logs for fallback usage
   - Verify fallback works when permission system fails

## Troubleshooting

### Issue: Permission check returns null

**Cause:** Permissions are still loading.

**Solution:** Always handle loading state:

```typescript
const { can, loading } = usePermissionCheck();

if (loading) {
  return <Spinner />;
}
```

### Issue: Permission denied but role should allow

**Cause:** User doesn't have the permission assigned in the backend.

**Solution:** 
1. Check user's permissions in admin UI
2. Assign the required permission to the user's role
3. Use fallback during migration:

```typescript
import { createPermissionChecker } from '@/utils/permissionMigration';

const checkPermission = createPermissionChecker(can, user?.role, user?.id);
```

### Issue: Can't see permission logs

**Cause:** Logging is disabled in production.

**Solution:** Enable logging in development:

```typescript
import { permissionLogger } from '@/utils/permissionMigration';

permissionLogger.setEnabled(true);
```

### Issue: Fallback not working

**Cause:** User role not passed correctly.

**Solution:** Ensure user role is passed:

```typescript
const { user } = useAuth();
const checkPermission = createPermissionChecker(can, user?.role, user?.id);
```

### Issue: Performance problems with many permission checks

**Cause:** Too many permission checks causing re-renders.

**Solution:** Memoize permission checks:

```typescript
import { useMemo } from 'react';

const permissions = useMemo(() => ({
  canCreate: can('application', 'create', 'own'),
  canUpdate: can('application', 'update', 'own'),
  canDelete: can('application', 'delete', 'own'),
}), [can]);
```

## Migration Checklist

- [ ] Replace `useRole()` with `usePermissionCheck()`
- [ ] Replace `isAdmin` with `isAdmin()` or `hasRole('admin')`
- [ ] Replace `isManager` with `hasRole('manager')`
- [ ] Replace `isOfficer` with `hasRole('officer')`
- [ ] Replace `user.role === 'admin'` with `hasRole('admin')`
- [ ] Add loading state handling
- [ ] Test with different user roles
- [ ] Test with different permission sets
- [ ] Add fallback for backward compatibility
- [ ] Monitor permission logs in development
- [ ] Update tests to use new permission system
- [ ] Remove old role-based checks after migration

## Best Practices

1. **Always handle loading states** - Don't deny access while loading
2. **Use specific permissions** - Prefer `can('application', 'update')` over `isAdmin()`
3. **Use appropriate scopes** - Match scope to the actual access level needed
4. **Log permission checks** - Use logger in development to monitor behavior
5. **Test thoroughly** - Test with multiple roles and permission sets
6. **Use fallback during migration** - Ensure backward compatibility
7. **Memoize expensive checks** - Cache permission results when appropriate
8. **Document custom permissions** - Add comments for non-obvious permission checks

## Support

For questions or issues:
1. Check this guide first
2. Review the MIGRATION_PLAN.md
3. Check permission logs in development
4. Contact the development team

## Additional Resources

- [Permission Management UI Guide](../lc-workflow-frontend/src/components/permissions/README.md)
- [usePermissionCheck Hook Documentation](../lc-workflow-frontend/src/hooks/usePermissionCheck.README.md)
- [Backend RBAC API Documentation](../le-backend/docs/API_DOCUMENTATION.md)
