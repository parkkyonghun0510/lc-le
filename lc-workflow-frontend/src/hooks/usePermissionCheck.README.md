# usePermissionCheck Hook

A generalized permission checking hook for dynamic RBAC (Role-Based Access Control) throughout the application.

## Overview

The `usePermissionCheck` hook replaces hardcoded role checks with dynamic permission checking based on the backend RBAC system. It provides a clean API for checking permissions, roles, and named permissions with automatic caching and loading states.

## Features

- ✅ **Dynamic Permission Checking**: Check permissions based on resource type, action, and scope
- ✅ **Role Checking**: Verify if user has specific roles
- ✅ **Named Permission Checking**: Check for specific permission names
- ✅ **Automatic Caching**: 5-minute TTL with React Query
- ✅ **Cache Invalidation**: Manual cache refresh after permission changes
- ✅ **Loading States**: Prevent premature access decisions
- ✅ **Type Safety**: Full TypeScript support
- ✅ **Error Handling**: Graceful fallback on errors

## Installation

The hook is already available in the project. Import it from the hooks directory:

```typescript
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
// or
import { usePermissionCheck } from '@/hooks';
```

## Basic Usage

```typescript
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { ResourceType, PermissionAction } from '@/types/permissions';

function MyComponent() {
  const { can, hasRole, loading } = usePermissionCheck();
  
  if (loading) {
    return <div>Loading permissions...</div>;
  }
  
  return (
    <div>
      {can(ResourceType.APPLICATION, PermissionAction.CREATE) && (
        <button>Create Application</button>
      )}
      
      {hasRole('admin') && (
        <button>Admin Panel</button>
      )}
    </div>
  );
}
```

## API Reference

### Hook Return Value

```typescript
interface UsePermissionCheckReturn {
  can: (resource: ResourceType | string, action: PermissionAction | string, scope?: PermissionScope | string) => boolean;
  hasRole: (roleName: string) => boolean;
  hasPermission: (permissionName: string) => boolean;
  loading: boolean;
  user: any | null;
  permissions: EffectivePermission[];
  roles: string[];
  invalidateCache: () => Promise<void>;
}
```

### Functions

#### `can(resource, action, scope?)`

Check if the current user can perform an action on a resource type.

**Parameters:**
- `resource` (ResourceType | string): The resource type (e.g., 'application', 'user')
- `action` (PermissionAction | string): The action to perform (e.g., 'create', 'read', 'update')
- `scope` (PermissionScope | string, optional): The scope (e.g., 'own', 'department', 'global')

**Returns:** `boolean` - true if user has permission, false otherwise

**Examples:**
```typescript
// Check if user can create applications
can(ResourceType.APPLICATION, PermissionAction.CREATE)

// Check if user can read their own applications
can(ResourceType.APPLICATION, PermissionAction.READ, PermissionScope.OWN)

// Check if user can update users globally
can(ResourceType.USER, PermissionAction.UPDATE, PermissionScope.GLOBAL)

// Using string values (also supported)
can('application', 'create')
```

#### `hasRole(roleName)`

Check if the current user has a specific role.

**Parameters:**
- `roleName` (string): The role name to check (case-insensitive)

**Returns:** `boolean` - true if user has the role, false otherwise

**Examples:**
```typescript
// Check if user is an admin
hasRole('admin')

// Check if user is a manager
hasRole('manager')

// Case-insensitive
hasRole('ADMIN') // Same as hasRole('admin')
```

#### `hasPermission(permissionName)`

Check if the current user has a specific named permission.

**Parameters:**
- `permissionName` (string): The permission name to check (case-insensitive)

**Returns:** `boolean` - true if user has the permission, false otherwise

**Examples:**
```typescript
// Check for specific permission names
hasPermission('application:approve')
hasPermission('user:manage')
hasPermission('analytics:export')
```

#### `invalidateCache()`

Invalidate the permission cache and force a refetch.

**Returns:** `Promise<void>`

**Example:**
```typescript
const { invalidateCache } = usePermissionCheck();

// After making permission changes
await invalidateCache();
```

### Properties

#### `loading`

Boolean indicating if permissions are currently being fetched.

**Type:** `boolean`

**Usage:**
```typescript
if (loading) {
  return <div>Loading permissions...</div>;
}
```

#### `user`

The current authenticated user object.

**Type:** `any | null`

#### `permissions`

Array of effective permissions for the current user.

**Type:** `EffectivePermission[]`

#### `roles`

Array of role names assigned to the current user.

**Type:** `string[]`

## Usage Examples

### Example 1: Basic Permission Checking

```typescript
function ApplicationActions() {
  const { can, loading } = usePermissionCheck();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {can(ResourceType.APPLICATION, PermissionAction.CREATE) && (
        <button>Create</button>
      )}
      {can(ResourceType.APPLICATION, PermissionAction.UPDATE) && (
        <button>Edit</button>
      )}
      {can(ResourceType.APPLICATION, PermissionAction.DELETE) && (
        <button>Delete</button>
      )}
    </div>
  );
}
```

### Example 2: Scope-Based Permissions

```typescript
function ApplicationList() {
  const { can } = usePermissionCheck();
  
  return (
    <div>
      {can(ResourceType.APPLICATION, PermissionAction.READ, PermissionScope.OWN) && (
        <Link href="/applications/my">My Applications</Link>
      )}
      {can(ResourceType.APPLICATION, PermissionAction.READ, PermissionScope.DEPARTMENT) && (
        <Link href="/applications/department">Department Applications</Link>
      )}
      {can(ResourceType.APPLICATION, PermissionAction.READ, PermissionScope.GLOBAL) && (
        <Link href="/applications/all">All Applications</Link>
      )}
    </div>
  );
}
```

### Example 3: Role-Based Features

```typescript
function Dashboard() {
  const { hasRole, loading } = usePermissionCheck();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {hasRole('admin') && (
        <section>
          <h2>Admin Panel</h2>
          <Link href="/admin/users">Manage Users</Link>
          <Link href="/admin/settings">System Settings</Link>
        </section>
      )}
      
      {hasRole('manager') && (
        <section>
          <h2>Manager Dashboard</h2>
          <Link href="/approvals">Pending Approvals</Link>
        </section>
      )}
    </div>
  );
}
```

### Example 4: Navigation Menu

```typescript
function NavigationMenu() {
  const { can, hasRole, loading } = usePermissionCheck();
  
  if (loading) return null;
  
  return (
    <nav>
      <ul>
        <li><Link href="/dashboard">Dashboard</Link></li>
        
        {can(ResourceType.APPLICATION, PermissionAction.READ) && (
          <li><Link href="/applications">Applications</Link></li>
        )}
        
        {can(ResourceType.USER, PermissionAction.MANAGE) && (
          <li><Link href="/users">Users</Link></li>
        )}
        
        {hasRole('admin') && (
          <li><Link href="/admin">Admin</Link></li>
        )}
      </ul>
    </nav>
  );
}
```

### Example 5: Cache Invalidation

```typescript
function UserPermissionManager() {
  const { can, invalidateCache } = usePermissionCheck();
  const [updating, setUpdating] = useState(false);
  
  const handleAssignRole = async (userId: string, roleId: string) => {
    setUpdating(true);
    try {
      await permissionsApi.assignRoleToUser(userId, { role_id: roleId });
      
      // Invalidate cache to refresh permissions
      await invalidateCache();
      
      toast.success('Role assigned successfully');
    } catch (error) {
      toast.error('Failed to assign role');
    } finally {
      setUpdating(false);
    }
  };
  
  return (
    <div>
      {/* Component content */}
    </div>
  );
}
```

### Example 6: Replacing Hardcoded Role Checks

**Before (Hardcoded):**
```typescript
function OldComponent({ user }: { user: User }) {
  return (
    <div>
      {user?.role === 'admin' && <button>Admin Action</button>}
      {user?.role === 'manager' && <button>Manager Action</button>}
      {(user?.role === 'admin' || user?.role === 'manager') && (
        <button>Approve</button>
      )}
    </div>
  );
}
```

**After (Dynamic Permissions):**
```typescript
function NewComponent() {
  const { hasRole, can } = usePermissionCheck();
  
  return (
    <div>
      {hasRole('admin') && <button>Admin Action</button>}
      {hasRole('manager') && <button>Manager Action</button>}
      {can(ResourceType.APPLICATION, PermissionAction.APPROVE) && (
        <button>Approve</button>
      )}
    </div>
  );
}
```

### Example 7: Custom Domain Hook

Create domain-specific hooks for cleaner code:

```typescript
// Custom hook for application permissions
export const useApplicationPermissions = () => {
  const { can, loading } = usePermissionCheck();
  
  return {
    canCreate: can(ResourceType.APPLICATION, PermissionAction.CREATE),
    canView: can(ResourceType.APPLICATION, PermissionAction.READ),
    canEdit: can(ResourceType.APPLICATION, PermissionAction.UPDATE),
    canDelete: can(ResourceType.APPLICATION, PermissionAction.DELETE),
    canApprove: can(ResourceType.APPLICATION, PermissionAction.APPROVE),
    canReject: can(ResourceType.APPLICATION, PermissionAction.REJECT),
    loading,
  };
};

// Usage
function ApplicationPage() {
  const { canCreate, canApprove, loading } = useApplicationPermissions();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {canCreate && <button>Create</button>}
      {canApprove && <button>Approve</button>}
    </div>
  );
}
```

## Caching Behavior

The hook uses React Query for caching with the following configuration:

- **Stale Time**: 5 minutes - Data is considered fresh for 5 minutes
- **Cache Time**: 10 minutes - Data is kept in cache for 10 minutes
- **Retry**: 2 attempts with 1 second delay
- **Automatic Refetch**: On window focus and network reconnection

### Manual Cache Invalidation

Call `invalidateCache()` after:
- Assigning/revoking roles
- Granting/revoking permissions
- Any permission-related changes

```typescript
const { invalidateCache } = usePermissionCheck();

// After permission change
await permissionsApi.assignRoleToUser(userId, { role_id: roleId });
await invalidateCache(); // Force refetch
```

## Loading State Best Practices

Always handle the loading state to prevent premature access decisions:

```typescript
function SecureComponent() {
  const { can, loading } = usePermissionCheck();
  
  // Option 1: Show loading indicator
  if (loading) {
    return <div>Loading permissions...</div>;
  }
  
  // Option 2: Disable buttons while loading
  return (
    <button disabled={loading || !can(ResourceType.APPLICATION, PermissionAction.CREATE)}>
      Create Application
    </button>
  );
  
  // Option 3: Hide sensitive content while loading
  return (
    <div>
      {!loading && can(ResourceType.APPLICATION, PermissionAction.CREATE) && (
        <button>Create Application</button>
      )}
    </div>
  );
}
```

## Error Handling

The hook gracefully handles errors:

- Returns `false` for all permission checks if data is unavailable
- Retries failed requests automatically (up to 2 times)
- Falls back to safe defaults (no permissions) on error

```typescript
const { can, loading } = usePermissionCheck();

// If error occurs, can() returns false (safe default)
// User won't see unauthorized content
```

## TypeScript Support

Full TypeScript support with type-safe enums:

```typescript
import { ResourceType, PermissionAction, PermissionScope } from '@/types/permissions';

// Type-safe permission checking
can(ResourceType.APPLICATION, PermissionAction.CREATE, PermissionScope.OWN);

// String values also supported for flexibility
can('application', 'create', 'own');
```

## Integration with Existing Code

### Replacing useWorkflowPermissions

The `usePermissionCheck` hook is a generalized version of `useWorkflowPermissions`:

**Before:**
```typescript
import { useWorkflowPermissions } from '@/hooks/useWorkflowPermissions';

const { can, canApprove } = useWorkflowPermissions();
```

**After:**
```typescript
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { ResourceType, PermissionAction } from '@/types/permissions';

const { can } = usePermissionCheck();
const canApprove = can(ResourceType.APPLICATION, PermissionAction.APPROVE);
```

## Performance Considerations

- **Caching**: Permissions are cached for 5 minutes, reducing API calls
- **Lazy Loading**: Only fetches when user is authenticated
- **Memoization**: Permission checks are fast (array lookups)
- **No Re-renders**: Uses React Query's optimized caching

## Testing

Example test for components using the hook:

```typescript
import { renderHook } from '@testing-library/react';
import { usePermissionCheck } from './usePermissionCheck';

// Mock the hook in tests
jest.mock('./usePermissionCheck');

test('shows create button when user has permission', () => {
  (usePermissionCheck as jest.Mock).mockReturnValue({
    can: (resource: string, action: string) => 
      resource === 'application' && action === 'create',
    loading: false,
  });
  
  const { getByText } = render(<MyComponent />);
  expect(getByText('Create Application')).toBeInTheDocument();
});
```

## Troubleshooting

### Permissions not updating after changes

**Solution:** Call `invalidateCache()` after permission changes:

```typescript
await permissionsApi.assignRoleToUser(userId, { role_id: roleId });
await invalidateCache();
```

### Always returns false

**Possible causes:**
1. User not authenticated - Check `isAuthenticated` from `useAuth()`
2. Still loading - Check `loading` state
3. Backend API error - Check network tab and console

### Performance issues

**Solution:** The hook is already optimized with caching. If you need more control:

```typescript
// Create domain-specific hooks to avoid repeated checks
const useApplicationPermissions = () => {
  const { can, loading } = usePermissionCheck();
  
  return useMemo(() => ({
    canCreate: can(ResourceType.APPLICATION, PermissionAction.CREATE),
    canEdit: can(ResourceType.APPLICATION, PermissionAction.UPDATE),
    loading,
  }), [can, loading]);
};
```

## Related Documentation

- [Permission Management System Design](../../.kiro/specs/permission-management-system/design.md)
- [Permission Types](../types/permissions.ts)
- [Permissions API Client](../lib/api/permissions.ts)
- [Usage Examples](./usePermissionCheck.example.tsx)

## Support

For issues or questions:
1. Check the examples in `usePermissionCheck.example.tsx`
2. Review the design document
3. Check the backend API documentation
4. Contact the development team
