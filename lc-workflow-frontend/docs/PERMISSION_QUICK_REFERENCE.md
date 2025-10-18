# Permission Migration Quick Reference

## 🚀 Quick Start

### Import the Hook

```typescript
import { usePermissionMigration } from '@/hooks/usePermissionMigration';
```

### Basic Usage

```typescript
function MyComponent() {
  const { can, loading } = usePermissionMigration();
  
  if (loading) return <Spinner />;
  
  const canEdit = can('application', 'update', 'department');
  
  return canEdit ? <button>Edit</button> : null;
}
```

## 📋 Common Patterns

### Pattern 1: Page Access Control

```typescript
const { can, loading } = usePermissionMigration();

if (loading) return <Spinner />;
if (!can('application', 'read', 'department')) {
  return <AccessDenied />;
}
```

### Pattern 2: Conditional Rendering

```typescript
const { can } = usePermissionMigration();

return (
  <>
    {can('application', 'update') && <EditButton />}
    {can('application', 'delete', 'global') && <DeleteButton />}
  </>
);
```

### Pattern 3: Multiple Permissions

```typescript
const permissions = usePermissions({
  canCreate: ['application', 'create', 'own'],
  canUpdate: ['application', 'update', 'own'],
  canDelete: ['application', 'delete', 'global'],
});

return (
  <>
    {permissions.canCreate && <CreateButton />}
    {permissions.canUpdate && <EditButton />}
    {permissions.canDelete && <DeleteButton />}
  </>
);
```

### Pattern 4: Admin Check

```typescript
const { isAdmin } = usePermissionMigration();

if (isAdmin()) {
  // Show admin features
}
```

### Pattern 5: Role Check

```typescript
const { hasRole } = usePermissionMigration();

if (hasRole('manager')) {
  // Show manager features
}
```

## 🔄 Migration Cheat Sheet

| Old Code | New Code |
|----------|----------|
| `const { isAdmin } = useRole()` | `const { isAdmin } = usePermissionMigration()` |
| `if (isAdmin)` | `if (isAdmin())` |
| `if (isManager)` | `if (hasRole('manager'))` |
| `if (user.role === 'admin')` | `if (hasRole('admin'))` |
| `if (isAdmin \|\| isManager)` | `if (can('resource', 'action', 'scope'))` |

## 🎯 Resource Types

- `system` - System administration
- `user` - User management
- `application` - Loan applications
- `file` - File management
- `branch` - Branch management
- `department` - Department management
- `workload` - Workload viewing
- `notification` - Notifications
- `report` - Reports

## ⚡ Actions

- `create` - Create resources
- `read` - View resources
- `update` - Edit resources
- `delete` - Delete resources
- `manage` - Full management
- `approve` - Approve applications
- `reject` - Reject applications
- `process` - Process applications
- `assign` - Assign resources
- `view` - View data
- `export` - Export data

## 🎚️ Scopes

- `own` - User's own resources
- `department` - Department-level
- `branch` - Branch-level
- `global` - System-wide

## 💡 Tips

1. **Always handle loading states**
   ```typescript
   if (loading) return <Spinner />;
   ```

2. **Use specific permissions over role checks**
   ```typescript
   // ❌ Bad
   if (isAdmin()) { ... }
   
   // ✅ Good
   if (can('application', 'delete', 'global')) { ... }
   ```

3. **Memoize expensive checks**
   ```typescript
   const permissions = useMemo(() => ({
     canEdit: can('application', 'update'),
     canDelete: can('application', 'delete'),
   }), [can]);
   ```

4. **Use helper hooks for multiple checks**
   ```typescript
   const permissions = usePermissions({
     canEdit: ['application', 'update', 'own'],
     canDelete: ['application', 'delete', 'global'],
   });
   ```

## 🐛 Debugging

### Enable Logging

```typescript
import { permissionLogger } from '@/utils/permissionMigration';

permissionLogger.setEnabled(true);
```

### View Logs

```typescript
console.log(permissionLogger.getLogs());
```

### Export Report

```typescript
import { exportMigrationReport } from '@/utils/permissionMigration';

const report = exportMigrationReport();
console.log(report);
```

## ⚠️ Common Mistakes

### Mistake 1: Not handling loading state

```typescript
// ❌ Bad - Denies access while loading
const { can } = usePermissionMigration();
if (!can('application', 'read')) return <AccessDenied />;

// ✅ Good - Shows loading state
const { can, loading } = usePermissionMigration();
if (loading) return <Spinner />;
if (!can('application', 'read')) return <AccessDenied />;
```

### Mistake 2: Using isAdmin as a boolean

```typescript
// ❌ Bad - isAdmin is a function
const { isAdmin } = usePermissionMigration();
if (isAdmin) { ... }

// ✅ Good - Call the function
if (isAdmin()) { ... }
```

### Mistake 3: Not using specific permissions

```typescript
// ❌ Bad - Too broad
if (isAdmin()) {
  // Allow action
}

// ✅ Good - Specific permission
if (can('application', 'delete', 'global')) {
  // Allow action
}
```

## 📚 More Resources

- [Full Migration Guide](./PERMISSION_MIGRATION_GUIDE.md)
- [Migration Plan](./.kiro/specs/admin-permission-management-ui/MIGRATION_PLAN.md)
- [usePermissionCheck Documentation](../lc-workflow-frontend/src/hooks/usePermissionCheck.README.md)
- [Examples](../lc-workflow-frontend/src/utils/permissionMigration.example.tsx)
