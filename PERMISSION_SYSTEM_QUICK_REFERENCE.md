# Permission System - Quick Reference Guide

## 🚀 Quick Start

### Basic Usage

```typescript
import { usePermissionCheck } from '@/hooks/usePermissionCheck';

function MyComponent() {
  const { can, hasRole, isAdmin } = usePermissionCheck();
  
  // Check permission
  if (can('application', 'approve', 'department')) {
    // User can approve applications at department level
  }
  
  // Check role
  if (hasRole('manager')) {
    // User has manager role
  }
  
  // Check if admin
  if (isAdmin()) {
    // User is admin
  }
}
```

---

## 📋 Common Patterns

### Pattern 1: Simple Permission Check

```typescript
const { can } = usePermissionCheck();

// Check if user can create applications
if (can('application', 'create')) {
  return <CreateButton />;
}
```

### Pattern 2: Scoped Permission Check

```typescript
const { can } = usePermissionCheck();

// Check with specific scope
if (can('application', 'approve', 'department')) {
  // Can approve at department level
}

if (can('application', 'approve', 'branch')) {
  // Can approve at branch level
}

if (can('application', 'approve', 'global')) {
  // Can approve globally
}
```

### Pattern 3: Multiple Permission Check

```typescript
const { can } = usePermissionCheck();

const canManage = can('user', 'create') && 
                  can('user', 'update') && 
                  can('user', 'delete');

if (canManage) {
  return <UserManagementPanel />;
}
```

### Pattern 4: Role Check

```typescript
const { hasRole } = usePermissionCheck();

if (hasRole('admin') || hasRole('manager')) {
  return <AdminPanel />;
}
```

### Pattern 5: Admin Check

```typescript
const { isAdmin } = usePermissionCheck();

if (isAdmin()) {
  return <SystemSettings />;
}
```

### Pattern 6: Conditional Rendering

```typescript
const { can } = usePermissionCheck();

return (
  <div>
    {can('application', 'create') && <CreateButton />}
    {can('application', 'update', 'own') && <EditButton />}
    {can('application', 'delete', 'own') && <DeleteButton />}
  </div>
);
```

---

## 🚫 What NOT to Do

### ❌ Don't Use Deprecated APIs

```typescript
// ❌ WRONG - Deprecated
import { useRole } from '@/hooks/useAuth';
const { isAdmin, isManager } = useRole();

// ❌ WRONG - Deprecated
const { isAdmin } = useAuth();
if (isAdmin) { ... }

// ❌ WRONG - Deprecated
if (user?.role === 'admin') { ... }
```

### ✅ Use New Permission System

```typescript
// ✅ CORRECT
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
const { isAdmin, hasRole } = usePermissionCheck();

if (isAdmin()) { ... }
if (hasRole('manager')) { ... }
```

---

## 📚 Permission Reference

### Resource Types

- `system` - System-wide operations
- `user` - User management
- `application` - Application management
- `department` - Department management
- `branch` - Branch management
- `file` - File management
- `analytics` - Analytics and reports
- `notification` - Notification management
- `audit` - Audit trail access

### Actions

- `create` - Create new resources
- `read` - View resources
- `update` - Modify resources
- `delete` - Remove resources
- `manage` - Full management access
- `view_all` - View all resources
- `assign` - Assign resources to users
- `approve` - Approve requests
- `reject` - Reject requests
- `export` - Export data

### Scopes

- `own` - User's own resources only
- `department` - Department-level access
- `branch` - Branch-level access
- `global` - System-wide access

---

## 🔧 API Reference

### usePermissionCheck()

Returns an object with permission checking functions.

```typescript
const {
  can,           // Check specific permission
  hasRole,       // Check if user has role
  isAdmin,       // Check if user is admin
  userPermissions, // Array of user's permissions
  isLoading,     // Loading state
  error          // Error state
} = usePermissionCheck();
```

#### can(resource, action, scope?)

Check if user has a specific permission.

**Parameters**:
- `resource` (string): Resource type (e.g., 'application', 'user')
- `action` (string): Action type (e.g., 'create', 'update', 'delete')
- `scope` (string, optional): Scope level (e.g., 'own', 'department', 'branch', 'global')

**Returns**: `boolean`

**Examples**:
```typescript
can('application', 'create')                    // Can create applications
can('application', 'update', 'own')             // Can update own applications
can('application', 'approve', 'department')     // Can approve at department level
can('user', 'manage')                           // Can manage users
```

#### hasRole(roleName)

Check if user has a specific role.

**Parameters**:
- `roleName` (string): Role name (e.g., 'admin', 'manager', 'officer')

**Returns**: `boolean`

**Examples**:
```typescript
hasRole('admin')      // Is admin
hasRole('manager')    // Is manager
hasRole('officer')    // Is officer
```

#### isAdmin()

Check if user is an admin.

**Returns**: `boolean`

**Example**:
```typescript
if (isAdmin()) {
  // User is admin
}
```

---

## 🎯 Common Use Cases

### Use Case 1: Conditional Button Display

```typescript
function ApplicationActions({ application }) {
  const { can } = usePermissionCheck();
  const { user } = useAuth();
  
  const canEdit = can('application', 'update', 'own') && 
                  application.user_id === user?.id;
  const canApprove = can('application', 'approve', 'department');
  const canDelete = can('application', 'delete', 'own') && 
                    application.user_id === user?.id;
  
  return (
    <div>
      {canEdit && <EditButton />}
      {canApprove && <ApproveButton />}
      {canDelete && <DeleteButton />}
    </div>
  );
}
```

### Use Case 2: Page Access Control

```typescript
function AdminPage() {
  const { isAdmin } = usePermissionCheck();
  const router = useRouter();
  
  useEffect(() => {
    if (!isAdmin()) {
      router.push('/unauthorized');
    }
  }, [isAdmin, router]);
  
  if (!isAdmin()) {
    return <LoadingSpinner />;
  }
  
  return <AdminContent />;
}
```

### Use Case 3: Navigation Menu Filtering

```typescript
function Navigation() {
  const { can, hasRole } = usePermissionCheck();
  
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', show: true },
    { path: '/applications', label: 'Applications', show: can('application', 'read') },
    { path: '/users', label: 'Users', show: can('user', 'read') },
    { path: '/admin', label: 'Admin', show: hasRole('admin') },
  ].filter(item => item.show);
  
  return (
    <nav>
      {menuItems.map(item => (
        <Link key={item.path} href={item.path}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

### Use Case 4: Form Field Visibility

```typescript
function UserForm() {
  const { can, hasRole } = usePermissionCheck();
  
  const canEditRole = hasRole('admin');
  const canEditDepartment = can('user', 'assign', 'department');
  
  return (
    <form>
      <Input name="name" label="Name" />
      <Input name="email" label="Email" />
      
      {canEditRole && (
        <Select name="role" label="Role">
          <option value="officer">Officer</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </Select>
      )}
      
      {canEditDepartment && (
        <Select name="department" label="Department">
          {/* Department options */}
        </Select>
      )}
    </form>
  );
}
```

---

## 🐛 Troubleshooting

### Issue: Permission check always returns false

**Solution**: Check if user is authenticated and permissions are loaded

```typescript
const { can, isLoading, error } = usePermissionCheck();

if (isLoading) {
  return <LoadingSpinner />;
}

if (error) {
  console.error('Permission error:', error);
  return <ErrorMessage />;
}

// Now safe to check permissions
if (can('application', 'create')) {
  // ...
}
```

### Issue: Deprecation warnings in console

**Solution**: Migrate to new permission system

```typescript
// ❌ Old way (causes warning)
const { isAdmin } = useAuth();

// ✅ New way (no warning)
const { isAdmin } = usePermissionCheck();
```

### Issue: Permission check not updating after role change

**Solution**: React Query will automatically refetch. If needed, manually invalidate:

```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// After role change
queryClient.invalidateQueries({ queryKey: ['permissions'] });
```

---

## 📖 Additional Resources

- **Full Migration Guide**: [PERMISSION_MIGRATION_GUIDE.md](./lc-workflow-frontend/PERMISSION_MIGRATION_GUIDE.md)
- **Migration Status**: [FINAL_MIGRATION_STATUS.md](./FINAL_MIGRATION_STATUS.md)
- **Remaining Work**: [PERMISSION_MIGRATION_CHECKLIST.md](./PERMISSION_MIGRATION_CHECKLIST.md)
- **Verification Report**: [TASK_11.6_FINAL_CLEANUP_VERIFICATION.md](./TASK_11.6_FINAL_CLEANUP_VERIFICATION.md)

---

## 💡 Tips

1. **Always check loading state** before using permission checks
2. **Use specific permissions** instead of role checks when possible
3. **Scope permissions appropriately** (own, department, branch, global)
4. **Handle errors gracefully** with fallback UI
5. **Test with different user roles** to ensure correct behavior
6. **Avoid nested permission checks** - combine them logically
7. **Cache permission results** if checking multiple times in same component

---

**Last Updated**: 2025-10-18  
**Version**: 1.0  
**Status**: Production Ready
