# Permission System Quick Reference

## Quick Start

```typescript
import { usePermissionCheck } from '@/hooks/usePermissionCheck';

function MyComponent() {
  const { can, hasRole, hasPermission, loading } = usePermissionCheck();
  
  return (
    <>
      {/* Check resource + action */}
      {can('application', 'create') && (
        <button>Create Application</button>
      )}
      
      {/* Check role */}
      {hasRole('admin') && (
        <button>Admin Only</button>
      )}
      
      {/* Check named permission */}
      {hasPermission('application:approve') && (
        <button>Approve</button>
      )}
    </>
  );
}
```

## Common Permission Checks

### Applications
```typescript
can('application', 'create')   // Create new application
can('application', 'read')     // View applications
can('application', 'update')   // Edit application
can('application', 'delete')   // Delete application
can('application', 'approve')  // Approve application
can('application', 'reject')   // Reject application
```

### Users
```typescript
can('user', 'create')   // Create new user
can('user', 'read')     // View users
can('user', 'update')   // Edit user
can('user', 'delete')   // Delete user
can('user', 'export')   // Export users to CSV
can('user', 'import')   // Import users from CSV
```

### Employees
```typescript
can('employee', 'create')    // Create new employee
can('employee', 'read')      // View employees
can('employee', 'update')    // Edit employee
can('employee', 'delete')    // Delete employee
can('employee', 'view_all')  // View all employees (workload dashboard)
```

### Branches
```typescript
can('branch', 'create')  // Create new branch
can('branch', 'read')    // View branches
can('branch', 'update')  // Edit branch
can('branch', 'delete')  // Delete branch
```

### Departments
```typescript
can('department', 'create')  // Create new department
can('department', 'read')    // View departments
can('department', 'update')  // Edit department
can('department', 'delete')  // Delete department
```

### System
```typescript
can('system', 'manage')      // Full system management
can('analytics', 'read')     // View analytics
can('notification', 'read')  // View notifications
can('file', 'read')          // Access files
```

## Navigation Permissions

```typescript
// Main Navigation
{ resource: 'application', action: 'read' }   // Applications
{ resource: 'employee', action: 'read' }      // Employees
{ resource: 'file', action: 'read' }          // Files

// Admin Navigation
{ resource: 'department', action: 'read' }    // Departments
{ resource: 'user', action: 'read' }          // Users
{ resource: 'branch', action: 'read' }        // Branches
{ resource: 'analytics', action: 'read' }     // Analytics
{ resource: 'notification', action: 'read' }  // Notifications
{ resource: 'system', action: 'manage' }      // Permissions, Security, Settings
```

## Common Patterns

### Button with Permission
```typescript
{can('resource', 'action') && (
  <button onClick={handleAction}>
    Action
  </button>
)}
```

### Link with Permission
```typescript
{can('resource', 'action') && (
  <Link href="/path">
    Link Text
  </Link>
)}
```

### Multiple Permissions (OR)
```typescript
{(can('resource', 'action1') || can('resource', 'action2')) && (
  <button>Action</button>
)}
```

### Multiple Permissions (AND)
```typescript
{(can('resource', 'action1') && can('resource', 'action2')) && (
  <button>Action</button>
)}
```

### Permission with Ownership
```typescript
{(can('application', 'update') || application.user_id === user?.id) && (
  <button>Edit</button>
)}
```

### Loading State
```typescript
{loading ? (
  <Skeleton />
) : can('resource', 'action') ? (
  <button>Action</button>
) : null}
```

## Resource Types

| Resource | Description |
|----------|-------------|
| `application` | Loan applications |
| `user` | System users |
| `employee` | Employees |
| `branch` | Branch locations |
| `department` | Departments |
| `file` | Files |
| `folder` | Folders |
| `analytics` | Analytics |
| `notification` | Notifications |
| `audit` | Audit logs |
| `system` | System operations |

## Action Types

| Action | Description |
|--------|-------------|
| `create` | Create new records |
| `read` | View records |
| `update` | Edit records |
| `delete` | Delete records |
| `approve` | Approve requests |
| `reject` | Reject requests |
| `assign` | Assign records |
| `export` | Export data |
| `import` | Import data |
| `manage` | Full management |
| `view_all` | View all records |
| `view_own` | View own records |
| `view_team` | View team records |
| `view_department` | View department records |
| `view_branch` | View branch records |

## Scope Types

| Scope | Description |
|-------|-------------|
| `global` | System-wide access |
| `department` | Department-level access |
| `branch` | Branch-level access |
| `team` | Team-level access |
| `own` | Own records only |

## Best Practices

### ✅ DO
- Use `can()` for resource/action checks
- Use `hasRole()` for role-specific features
- Use `hasPermission()` for named permissions
- Check `loading` state before rendering
- Combine with ownership checks when needed
- Document permission requirements

### ❌ DON'T
- Don't hardcode role checks (`user.role === 'admin'`)
- Don't trust frontend checks for security
- Don't skip loading state handling
- Don't forget to update documentation
- Don't mix permission and role checks unnecessarily

## Troubleshooting

### Permission not working?
1. Check if permission exists in backend
2. Verify user has the permission assigned
3. Check permission is active
4. Verify resource and action names match
5. Check for typos in permission names

### UI element not showing?
1. Check permission check syntax
2. Verify `loading` state is handled
3. Check browser console for errors
4. Verify backend API is returning permissions
5. Check network tab for permission API call

### Navigation item missing?
1. Check `requiredPermission` in navigation array
2. Verify permission check in `hasRequiredPermission`
3. Check role-based fallback during loading
4. Verify user has required permission

## Support

For more information:
- See `PERMISSION_INTEGRATION_GUIDE.md` for detailed documentation
- See `TASK_13_IMPLEMENTATION_SUMMARY.md` for implementation details
- Check `src/hooks/usePermissionCheck.ts` for hook implementation
- Review `src/types/permissions.ts` for type definitions
