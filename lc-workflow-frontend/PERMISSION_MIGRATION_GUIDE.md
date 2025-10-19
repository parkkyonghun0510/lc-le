# Permission Migration Guide

## Overview

This guide helps developers migrate from the deprecated role-based access control to the new permission-based RBAC system.

## Why Migrate?

The old role-based system (`useRole()`, `isAdmin`, `isManager`, `isOfficer`) is being deprecated in favor of a more flexible permission-based system that:

- ✅ Provides fine-grained access control
- ✅ Supports scope-based permissions (own, department, branch, global)
- ✅ Allows dynamic permission assignment without code changes
- ✅ Enables better audit trails and security
- ✅ Scales better for complex authorization requirements

## Quick Migration Examples

### Example 1: Simple Admin Check

**Before (Deprecated):**
```typescript
import { useRole } from '@/hooks/useAuth';

function MyComponent() {
  const { isAdmin } = useRole();
  
  if (!isAdmin) {
    return <div>Access denied</div>;
  }
  
  return <div>Admin content</div>;
}
```

**After (Recommended):**
```typescript
import { usePermissionCheck } from '@/hooks/usePermissionCheck';

function MyComponent() {
  const { isAdmin } = usePermissionCheck();
  
  if (!isAdmin()) {
    return <div>Access denied</div>;
  }
  
  return <div>Admin content</div>;
}
```

### Example 2: Role-Based Access

**Before (Deprecated):**
```typescript
import { useRole } from '@/hooks/useAuth';

function MyComponent() {
  const { isAdmin, isManager } = useRole();
  
  if (!isAdmin && !isManager) {
    return <div>Access denied</div>;
  }
  
  return <div>Manager content</div>;
}
```

**After (Recommended):**
```typescript
import { usePermissionCheck } from '@/hooks/usePermissionCheck';

function MyComponent() {
  const { hasRole } = usePermissionCheck();
  
  if (!hasRole('admin') && !hasRole('manager')) {
    return <div>Access denied</div>;
  }
  
  return <div>Manager content</div>;
}
```

### Example 3: Permission-Based Access (Best Practice)

**Before (Deprecated):**
```typescript
import { useRole } from '@/hooks/useAuth';

function DeleteButton({ fileId }: { fileId: string }) {
  const { isAdmin } = useRole();
  
  if (!isAdmin) {
    return null;
  }
  
  return <button onClick={() => deleteFile(fileId)}>Delete</button>;
}
```

**After (Recommended):**
```typescript
import { usePermissionCheck } from '@/hooks/usePermissionCheck';

function DeleteButton({ fileId }: { fileId: string }) {
  const { can } = usePermissionCheck();
  
  // Check specific permission with scope
  if (!can('file', 'delete', 'global')) {
    return null;
  }
  
  return <button onClick={() => deleteFile(fileId)}>Delete</button>;
}
```

### Example 4: Conditional Rendering with Multiple Permissions

**Before (Deprecated):**
```typescript
import { useRole } from '@/hooks/useAuth';

function ApplicationActions({ application }: { application: Application }) {
  const { isAdmin, isManager, isOfficer } = useRole();
  
  return (
    <div>
      {(isAdmin || isManager) && (
        <button>Approve</button>
      )}
      {isOfficer && (
        <button>Process</button>
      )}
    </div>
  );
}
```

**After (Recommended):**
```typescript
import { usePermissionCheck } from '@/hooks/usePermissionCheck';

function ApplicationActions({ application }: { application: Application }) {
  const { can } = usePermissionCheck();
  
  return (
    <div>
      {can('application', 'approve', 'department') && (
        <button>Approve</button>
      )}
      {can('application', 'process', 'own') && (
        <button>Process</button>
      )}
    </div>
  );
}
```

## API Reference

### usePermissionCheck Hook

```typescript
const {
  can,           // Check specific permission
  hasRole,       // Check if user has a role
  isAdmin,       // Check if user is admin
  hasAnyRole,    // Check if user has any of the specified roles
  permissions,   // All user permissions
  roles,         // All user roles
  isLoading,     // Loading state
} = usePermissionCheck();
```

#### `can(resource, action, scope?)`

Check if the user has a specific permission.

**Parameters:**
- `resource` (string): The resource type (e.g., 'application', 'file', 'user')
- `action` (string): The action (e.g., 'create', 'read', 'update', 'delete', 'approve')
- `scope` (string, optional): The scope level ('own', 'department', 'branch', 'global')

**Returns:** `boolean`

**Examples:**
```typescript
// Check if user can create applications
can('application', 'create')

// Check if user can approve applications at department level
can('application', 'approve', 'department')

// Check if user can delete files globally
can('file', 'delete', 'global')

// Check if user can update their own profile
can('user', 'update', 'own')
```

#### `hasRole(roleName)`

Check if the user has a specific role.

**Parameters:**
- `roleName` (string): The role name (e.g., 'admin', 'manager', 'officer')

**Returns:** `boolean`

**Examples:**
```typescript
hasRole('admin')      // true if user is admin
hasRole('manager')    // true if user is manager
hasRole('officer')    // true if user is officer
```

#### `isAdmin()`

Convenience method to check if user is an admin.

**Returns:** `boolean`

**Example:**
```typescript
if (isAdmin()) {
  // Admin-only code
}
```

#### `hasAnyRole(roleNames)`

Check if the user has any of the specified roles.

**Parameters:**
- `roleNames` (string[]): Array of role names

**Returns:** `boolean`

**Example:**
```typescript
hasAnyRole(['admin', 'manager'])  // true if user is admin OR manager
```

## Common Migration Patterns

### Pattern 1: AuthContext Role Flags

**Before (Deprecated):**
```typescript
import { useAuthContext } from '@/providers/AuthProvider';

function MyComponent() {
  const { isAdmin, isManager, isOfficer } = useAuthContext();
  
  // Use role flags...
}
```

**After (Recommended):**
```typescript
import { usePermissionCheck } from '@/hooks/usePermissionCheck';

function MyComponent() {
  const { hasRole, isAdmin } = usePermissionCheck();
  
  // Use permission checks...
}
```

### Pattern 2: Direct User Role Checks

**Before (Deprecated):**
```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user } = useAuth();
  
  if (user?.role === 'admin') {
    // Admin code
  }
}
```

**After (Recommended):**
```typescript
import { usePermissionCheck } from '@/hooks/usePermissionCheck';

function MyComponent() {
  const { hasRole } = usePermissionCheck();
  
  if (hasRole('admin')) {
    // Admin code
  }
}
```

### Pattern 3: Multiple Role Checks

**Before (Deprecated):**
```typescript
import { useRole } from '@/hooks/useAuth';

function MyComponent() {
  const { role } = useRole();
  
  if (['admin', 'manager'].includes(role || '')) {
    // Admin or manager code
  }
}
```

**After (Recommended):**
```typescript
import { usePermissionCheck } from '@/hooks/usePermissionCheck';

function MyComponent() {
  const { hasAnyRole } = usePermissionCheck();
  
  if (hasAnyRole(['admin', 'manager'])) {
    // Admin or manager code
  }
}
```

## Resource Types and Actions

### Available Resource Types

| Resource | Description |
|----------|-------------|
| `application` | Loan applications |
| `user` | User management |
| `file` | File management |
| `branch` | Branch management |
| `department` | Department management |
| `workload` | Workload viewing |
| `system` | System administration |
| `notification` | Notification management |
| `report` | Report generation |
| `analytics` | Analytics and dashboards |

### Available Actions

| Action | Description |
|--------|-------------|
| `create` | Create new resources |
| `read` | View resources |
| `update` | Edit resources |
| `delete` | Delete resources |
| `approve` | Approve applications |
| `reject` | Reject applications |
| `process` | Process applications |
| `assign` | Assign resources |
| `view` | View specific data |
| `manage` | Full management access |
| `export` | Export data |

### Available Scopes

| Scope | Description |
|-------|-------------|
| `own` | User's own resources only |
| `department` | Department-level access |
| `branch` | Branch-level access |
| `global` | System-wide access |

## Role to Permission Mapping

| Old Role Check | New Permission Check |
|---------------|---------------------|
| `isAdmin` | `isAdmin()` or `hasRole('admin')` |
| `isManager` | `hasRole('manager')` |
| `isOfficer` | `hasRole('officer')` |
| `user.role === 'admin'` | `hasRole('admin')` |
| Admin or Manager can edit | `can('resource', 'update', 'department')` |
| Admin can delete | `can('resource', 'delete', 'global')` |
| User can edit own | `can('resource', 'update', 'own')` |
| Manager can approve | `can('application', 'approve', 'department')` |
| Officer can process | `can('application', 'process', 'own')` |

## Best Practices

### 1. Use Specific Permissions Over Role Checks

**❌ Avoid:**
```typescript
if (hasRole('admin')) {
  // Allow delete
}
```

**✅ Prefer:**
```typescript
if (can('file', 'delete', 'global')) {
  // Allow delete
}
```

**Why?** Permission checks are more specific and allow for fine-grained control. Roles can change, but permissions are more stable.

### 2. Specify Scope When Possible

**❌ Avoid:**
```typescript
if (can('application', 'update')) {
  // Update application
}
```

**✅ Prefer:**
```typescript
if (can('application', 'update', 'department')) {
  // Update application
}
```

**Why?** Explicit scopes make the code more readable and secure.

### 3. Use Descriptive Resource and Action Names

**❌ Avoid:**
```typescript
if (can('app', 'edit')) {
  // ...
}
```

**✅ Prefer:**
```typescript
if (can('application', 'update')) {
  // ...
}
```

**Why?** Clear naming makes the code self-documenting.

### 4. Handle Loading States

```typescript
const { can, isLoading } = usePermissionCheck();

if (isLoading) {
  return <LoadingSpinner />;
}

if (!can('application', 'read')) {
  return <AccessDenied />;
}

return <ApplicationList />;
```

### 5. Combine Multiple Permission Checks

```typescript
const { can } = usePermissionCheck();

const canManageApplication = 
  can('application', 'update', 'department') &&
  can('application', 'approve', 'department');

if (canManageApplication) {
  // Show management UI
}
```

## Deprecation Timeline

| Phase | Timeline | Status |
|-------|----------|--------|
| Phase 1: Add deprecation warnings | Current | ✅ Complete |
| Phase 2: Migrate core features | In Progress | 🔄 Ongoing |
| Phase 3: Remove deprecated APIs | Future | ⏳ Planned |

## Troubleshooting

### Issue: "usePermissionCheck is not defined"

**Solution:** Import the hook:
```typescript
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
```

### Issue: Permission check always returns false

**Solution:** Verify that:
1. The user has the required role assigned
2. The role has the required permission
3. The permission has the correct scope
4. The resource and action names match exactly

### Issue: Deprecation warnings in console

**Solution:** This is expected during migration. Follow this guide to update your code to use `usePermissionCheck()`.

## Getting Help

- **Documentation:** See `.kiro/specs/admin-permission-management-ui/` for detailed specs
- **Migration Plan:** See `.kiro/specs/admin-permission-management-ui/MIGRATION_PLAN.md`
- **Permission Admin UI:** Access `/admin/permissions` to manage roles and permissions

## Examples from Codebase

### Dashboard Access
```typescript
// Before
const { isAdmin, isManager } = useRole();
if (!isAdmin && !isManager) {
  return <AccessDenied />;
}

// After
const { can } = usePermissionCheck();
if (!can('analytics', 'view', 'department')) {
  return <AccessDenied />;
}
```

### Application Approval
```typescript
// Before
const { isAdmin, isManager } = useRole();
const canApprove = isAdmin || isManager;

// After
const { can } = usePermissionCheck();
const canApprove = can('application', 'approve', 'department');
```

### File Deletion
```typescript
// Before
const { user } = useAuth();
const canDelete = user?.role === 'admin' || file.uploaded_by === user?.id;

// After
const { can } = usePermissionCheck();
const canDelete = can('file', 'delete', 'global') || can('file', 'delete', 'own');
```

## Summary

1. Replace `useRole()` with `usePermissionCheck()`
2. Replace `isAdmin`, `isManager`, `isOfficer` with `hasRole()` or `isAdmin()`
3. Use `can(resource, action, scope)` for specific permission checks
4. Prefer permission checks over role checks for better security
5. Always specify scope when possible
6. Handle loading states appropriately

For more information, see the [Migration Plan](.kiro/specs/admin-permission-management-ui/MIGRATION_PLAN.md).
