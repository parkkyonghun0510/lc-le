# usePermissionCheck - Quick Start Guide

## 5-Minute Quick Start

### 1. Import the Hook

```typescript
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { ResourceType, PermissionAction } from '@/types/permissions';
```

### 2. Use in Your Component

```typescript
function MyComponent() {
  const { can, hasRole, loading } = usePermissionCheck();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div>
      {/* Show button only if user can create applications */}
      {can(ResourceType.APPLICATION, PermissionAction.CREATE) && (
        <button>Create Application</button>
      )}
      
      {/* Show admin panel only for admins */}
      {hasRole('admin') && (
        <div>Admin Panel</div>
      )}
    </div>
  );
}
```

## Common Use Cases

### Check Permission for Action

```typescript
const { can } = usePermissionCheck();

// Can user create applications?
can(ResourceType.APPLICATION, PermissionAction.CREATE)

// Can user approve applications?
can(ResourceType.APPLICATION, PermissionAction.APPROVE)

// Can user delete users?
can(ResourceType.USER, PermissionAction.DELETE)
```

### Check Permission with Scope

```typescript
const { can } = usePermissionCheck();

// Can user view their own applications?
can(ResourceType.APPLICATION, PermissionAction.READ, PermissionScope.OWN)

// Can user view department applications?
can(ResourceType.APPLICATION, PermissionAction.READ, PermissionScope.DEPARTMENT)

// Can user view all applications?
can(ResourceType.APPLICATION, PermissionAction.READ, PermissionScope.GLOBAL)
```

### Check User Role

```typescript
const { hasRole } = usePermissionCheck();

// Is user an admin?
hasRole('admin')

// Is user a manager?
hasRole('manager')

// Is user an officer?
hasRole('officer')
```

### Check Named Permission

```typescript
const { hasPermission } = usePermissionCheck();

// Does user have application:approve permission?
hasPermission('application:approve')

// Does user have user:manage permission?
hasPermission('user:manage')
```

## Replacing Hardcoded Role Checks

### ❌ Before (Hardcoded)

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

### ✅ After (Dynamic Permissions)

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

## Navigation Menu Example

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

## Action Buttons Example

```typescript
function ApplicationActions({ applicationId }: { applicationId: string }) {
  const { can, loading } = usePermissionCheck();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="flex gap-2">
      {can(ResourceType.APPLICATION, PermissionAction.UPDATE) && (
        <button>Edit</button>
      )}
      
      {can(ResourceType.APPLICATION, PermissionAction.DELETE) && (
        <button>Delete</button>
      )}
      
      {can(ResourceType.APPLICATION, PermissionAction.APPROVE) && (
        <button>Approve</button>
      )}
      
      {can(ResourceType.APPLICATION, PermissionAction.REJECT) && (
        <button>Reject</button>
      )}
    </div>
  );
}
```

## Invalidate Cache After Changes

```typescript
function UserRoleManager() {
  const { invalidateCache } = usePermissionCheck();
  
  const handleAssignRole = async (userId: string, roleId: string) => {
    // Assign role via API
    await permissionsApi.assignRoleToUser(userId, { role_id: roleId });
    
    // Refresh permissions
    await invalidateCache();
    
    toast.success('Role assigned successfully');
  };
  
  return (
    <button onClick={() => handleAssignRole('user-123', 'role-456')}>
      Assign Role
    </button>
  );
}
```

## Available Resource Types

```typescript
ResourceType.USER
ResourceType.APPLICATION
ResourceType.DEPARTMENT
ResourceType.BRANCH
ResourceType.FILE
ResourceType.FOLDER
ResourceType.ANALYTICS
ResourceType.NOTIFICATION
ResourceType.AUDIT
ResourceType.SYSTEM
ResourceType.POSITION
ResourceType.EMPLOYEE
ResourceType.ROLE
ResourceType.PERMISSION
```

## Available Actions

```typescript
PermissionAction.CREATE
PermissionAction.READ
PermissionAction.UPDATE
PermissionAction.DELETE
PermissionAction.APPROVE
PermissionAction.REJECT
PermissionAction.ASSIGN
PermissionAction.EXPORT
PermissionAction.IMPORT
PermissionAction.MANAGE
PermissionAction.VIEW_ALL
PermissionAction.VIEW_OWN
PermissionAction.VIEW_TEAM
PermissionAction.VIEW_DEPARTMENT
PermissionAction.VIEW_BRANCH
```

## Available Scopes

```typescript
PermissionScope.GLOBAL
PermissionScope.DEPARTMENT
PermissionScope.BRANCH
PermissionScope.TEAM
PermissionScope.OWN
```

## Tips

1. **Always handle loading state** - Don't show sensitive content while loading
2. **Use TypeScript enums** - For type safety and autocomplete
3. **Invalidate cache after changes** - Call `invalidateCache()` after permission updates
4. **Create domain hooks** - For cleaner code in specific domains
5. **Test your components** - Mock the hook in tests

## Need More Help?

- **Full Documentation:** `usePermissionCheck.README.md`
- **Examples:** `usePermissionCheck.example.tsx`
- **Tests:** `__tests__/usePermissionCheck.test.tsx`
- **Design Doc:** `.kiro/specs/permission-management-system/design.md`
