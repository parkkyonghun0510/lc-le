# Permission Migration Utilities

## Overview

This module provides utilities to facilitate the migration from role-based to permission-based access control. It includes automatic fallback mechanisms, comprehensive logging, and developer-friendly React hooks.

## Quick Start

```typescript
import { usePermissionMigration } from '@/hooks/usePermissionMigration';

function MyComponent() {
  const { can, loading } = usePermissionMigration();
  
  if (loading) return <Spinner />;
  
  const canEdit = can('application', 'update', 'department');
  
  return canEdit ? <EditButton /> : null;
}
```

## Core Utilities

### `checkPermissionWithFallback()`

Checks permissions with automatic fallback to role-based checks.

```typescript
import { checkPermissionWithFallback } from '@/utils/permissionMigration';

const result = checkPermissionWithFallback(
  permissionCheck,  // Result from usePermissionCheck().can()
  userRole,         // User's role for fallback
  'application',    // Resource type
  'update',         // Action
  'department',     // Scope (optional)
  userId            // User ID for logging (optional)
);

console.log(result.allowed);  // true or false
console.log(result.source);   // 'permission', 'role', or 'fallback'
console.log(result.reason);   // Human-readable reason
```

### `createPermissionChecker()`

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
  const canDelete = checkPermission('application', 'delete', 'global');
}
```

### `permissionLogger`

Singleton logger for monitoring permission checks.

```typescript
import { permissionLogger } from '@/utils/permissionMigration';

// Enable logging (enabled by default in development)
permissionLogger.setEnabled(true);

// Get all logs
const logs = permissionLogger.getLogs();

// Get filtered logs
const userLogs = permissionLogger.getFilteredLogs({ userId: 'user-123' });

// Export logs as JSON
const json = permissionLogger.export();

// Clear logs
permissionLogger.clear();
```

### Role Mapping Functions

```typescript
import { 
  roleHasPermission, 
  getRolePermissions,
  DEFAULT_ROLE_MAPPINGS 
} from '@/utils/permissionMigration';

// Check if a role has a permission
const hasPermission = roleHasPermission('admin', 'system', 'manage', 'global');

// Get all permissions for a role
const permissions = getRolePermissions('manager');

// View default mappings
console.log(DEFAULT_ROLE_MAPPINGS);
```

### Migration Status

```typescript
import { 
  getMigrationStatus, 
  exportMigrationReport 
} from '@/utils/permissionMigration';

// Get migration statistics
const status = getMigrationStatus();
console.log(`Total checks: ${status.totalChecks}`);
console.log(`Using permissions: ${status.permissionChecks}`);
console.log(`Using fallback: ${status.fallbackChecks}`);

// Export detailed report
const report = exportMigrationReport();
```

## React Hooks

### `usePermissionMigration()`

Main hook with automatic fallback logic.

```typescript
import { usePermissionMigration } from '@/hooks/usePermissionMigration';

function MyComponent() {
  const { 
    can,              // Check permission with fallback
    canWithDetails,   // Get detailed result
    isAdmin,          // Check admin with fallback
    hasRole,          // Check role with fallback
    loading,          // Loading state
    error,            // Error state
    user,             // Current user
    userRole,         // User's role
    invalidateCache,  // Invalidate cache
    refetch           // Refetch permissions
  } = usePermissionMigration();
  
  if (loading) return <Spinner />;
  
  const canEdit = can('application', 'update', 'department');
  const isAdminUser = isAdmin();
  const isManager = hasRole('manager');
  
  return (
    <div>
      {canEdit && <EditButton />}
      {isAdminUser && <AdminPanel />}
      {isManager && <ManagerDashboard />}
    </div>
  );
}
```

### `usePermissions()`

Check multiple permissions at once.

```typescript
import { usePermissions } from '@/hooks/usePermissionMigration';

function MyComponent() {
  const permissions = usePermissions({
    canCreate: ['application', 'create', 'own'],
    canUpdate: ['application', 'update', 'own'],
    canDelete: ['application', 'delete', 'global'],
    canApprove: ['application', 'approve', 'department'],
  });
  
  if (permissions.loading) return <Spinner />;
  
  return (
    <div>
      {permissions.canCreate && <CreateButton />}
      {permissions.canUpdate && <EditButton />}
      {permissions.canDelete && <DeleteButton />}
      {permissions.canApprove && <ApproveButton />}
    </div>
  );
}
```

### `usePageAccess()`

Page-level access control.

```typescript
import { usePageAccess } from '@/hooks/usePermissionMigration';

function AdminPage() {
  const { hasAccess, loading, reason } = usePageAccess(
    'system',
    'manage',
    'global'
  );
  
  if (loading) return <Spinner />;
  
  if (!hasAccess) {
    return <AccessDenied reason={reason} />;
  }
  
  return <AdminContent />;
}
```

### `useFeatureFlags()`

Permission-based feature flags.

```typescript
import { useFeatureFlags } from '@/hooks/usePermissionMigration';

function Navigation() {
  const features = useFeatureFlags({
    showAdminPanel: ['system', 'manage', 'global'],
    showUserManagement: ['user', 'manage', 'department'],
    showReports: ['report', 'view', 'department'],
  });
  
  return (
    <nav>
      <a href="/dashboard">Dashboard</a>
      {features.showUserManagement && <a href="/users">Users</a>}
      {features.showReports && <a href="/reports">Reports</a>}
      {features.showAdminPanel && <a href="/admin">Admin</a>}
    </nav>
  );
}
```

## Default Role Mappings

### Admin
- `system:manage:global`
- `user:manage:global`
- `application:manage:global`
- `file:manage:global`
- `branch:manage:global`
- `department:manage:global`
- `workload:view:global`
- `notification:manage:global`
- `report:view:global`

### Manager
- `application:approve:department`
- `application:reject:department`
- `application:read:department`
- `application:update:department`
- `user:read:department`
- `workload:view:department`
- `file:read:department`
- `report:view:department`

### Officer
- `application:create:own`
- `application:read:own`
- `application:update:own`
- `application:process:own`
- `file:create:own`
- `file:read:own`
- `file:update:own`
- `file:delete:own`

## Logging

All permission checks are automatically logged in development mode:

```
✅ Permission Check: application:update:department - permission - ALLOWED
✅ Permission Check: system:manage:global - fallback - ALLOWED
❌ Permission Check: application:delete:global - permission - DENIED
```

Each log entry includes:
- Resource and action
- Result (allowed/denied)
- Source (permission/role/fallback)
- Timestamp
- User context (if provided)

## Migration Strategy

### Phase 1: Add Utilities ✅
- Create migration utilities
- Create React hooks
- Write documentation

### Phase 2: Gradual Migration
- Migrate one component at a time
- Keep old role checks working
- Monitor with logging

### Phase 3: Cleanup
- Remove old role checks
- Remove useRole() hook
- Update documentation

## Best Practices

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

5. **Monitor migration progress**
   ```typescript
   const status = getMigrationStatus();
   console.log(`Fallback usage: ${status.fallbackChecks}/${status.totalChecks}`);
   ```

## Testing

```typescript
import { renderHook } from '@testing-library/react';
import { usePermissionMigration } from '@/hooks/usePermissionMigration';

// Mock the dependencies
jest.mock('@/hooks/usePermissionCheck');
jest.mock('@/hooks/useAuth');

test('should allow admin to delete', () => {
  // Mock permission check
  mockUsePermissionCheck.mockReturnValue({
    can: jest.fn(() => true),
    loading: false,
  });
  
  const { result } = renderHook(() => usePermissionMigration());
  
  expect(result.current.can('application', 'delete', 'global')).toBe(true);
});
```

## Troubleshooting

### Issue: Permission check returns null

**Cause:** Permissions are still loading.

**Solution:** Handle loading state:
```typescript
if (loading) return <Spinner />;
```

### Issue: Permission denied but role should allow

**Cause:** User doesn't have the permission in backend.

**Solution:** Use fallback during migration:
```typescript
const { can } = usePermissionMigration(); // Has automatic fallback
```

### Issue: Can't see logs

**Cause:** Logging disabled in production.

**Solution:** Enable in development:
```typescript
permissionLogger.setEnabled(true);
```

## API Reference

See the full API documentation in:
- [Migration Guide](../../docs/PERMISSION_MIGRATION_GUIDE.md)
- [Quick Reference](../../docs/PERMISSION_QUICK_REFERENCE.md)
- [Examples](./permissionMigration.example.tsx)

## Support

For questions or issues:
1. Check the [Migration Guide](../../docs/PERMISSION_MIGRATION_GUIDE.md)
2. Review [Examples](./permissionMigration.example.tsx)
3. Check permission logs in development
4. Contact the development team
