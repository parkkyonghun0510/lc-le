# Permission Management System - API Client Documentation

This directory contains the API client and type definitions for the Permission Management System.

## Overview

The Permission Management System provides a comprehensive RBAC (Role-Based Access Control) implementation with:

- **Type-safe API client** with full TypeScript support
- **Comprehensive error handling** with user-friendly messages
- **Automatic retry logic** for network and server errors
- **Request/response transformation** utilities
- **Bulk operations** support

## Files

### `permissions.ts`
Main API client with methods for all permission-related operations:
- Permission CRUD
- Role CRUD
- User-Role management
- User-Permission management
- Permission matrix operations
- Bulk operations

### `permissionErrors.ts`
Error handling utilities:
- Error categorization
- User-friendly error messages
- Field error extraction
- Toast notification formatting

### Type Definitions (`src/types/permissions.ts`)
Comprehensive TypeScript types matching backend API:
- Enums (ResourceType, PermissionAction, PermissionScope)
- Core entities (Permission, Role, UserPermission)
- Request/response types
- Filter and pagination types

## Usage Examples

### Basic Permission Operations

```typescript
import { permissionsApi } from '@/lib/api/permissions';
import { ResourceType, PermissionAction, PermissionScope } from '@/types/permissions';

// List permissions with filters
const permissions = await permissionsApi.list({
  resource_type: ResourceType.APPLICATION,
  is_active: true,
  page: 1,
  size: 50,
});

// Create a new permission
const newPermission = await permissionsApi.create({
  name: 'application.create',
  description: 'Create new applications',
  resource_type: ResourceType.APPLICATION,
  action: PermissionAction.CREATE,
  scope: PermissionScope.OWN,
  is_active: true,
});

// Update a permission
const updated = await permissionsApi.update(permissionId, {
  description: 'Updated description',
  is_active: false,
});

// Delete a permission
await permissionsApi.delete(permissionId);
```

### Role Management

```typescript
// Create a role with permissions
const role = await permissionsApi.createRole({
  name: 'loan_officer',
  display_name: 'Loan Officer',
  description: 'Can process loan applications',
  permission_ids: [permission1Id, permission2Id],
  is_active: true,
});

// Assign role to user
await permissionsApi.assignRoleToUser(userId, {
  role_id: roleId,
});

// Get user's roles
const userRoles = await permissionsApi.getUserRoles(userId);
```

### User Permission Management

```typescript
// Get comprehensive user permissions
const userPerms = await permissionsApi.getUserPermissions(userId);
console.log(userPerms.roles); // Assigned roles
console.log(userPerms.direct_permissions); // Direct grants
console.log(userPerms.effective_permissions); // Calculated effective permissions

// Grant direct permission
await permissionsApi.grantPermissionToUser(userId, {
  permission_id: permissionId,
  is_granted: true,
});

// Revoke permission
await permissionsApi.revokePermissionFromUser(userId, permissionId);
```

### Permission Matrix

```typescript
// Get matrix data with filters
const matrix = await permissionsApi.getPermissionMatrix({
  department_id: 'dept-123',
  resource_type: ResourceType.APPLICATION,
});

// Toggle permission in matrix
await permissionsApi.toggleMatrixPermission(userId, permissionId, true);

// Export matrix to CSV
const csvBlob = await permissionsApi.exportMatrixToCSV({
  department_id: 'dept-123',
});
downloadBlob(csvBlob, 'permission-matrix.csv');
```

### Bulk Operations

```typescript
// Bulk activate permissions
const result = await permissionsApi.bulkActivatePermissions([id1, id2, id3]);
console.log(`Success: ${result.success_count}, Failed: ${result.failure_count}`);

// Bulk assign roles
await permissionsApi.bulkAssignRoles({
  user_ids: [user1, user2, user3],
  role_id: roleId,
});
```

### Error Handling

```typescript
import { handlePermissionError, formatErrorForToast } from '@/lib/api/permissionErrors';
import { useToast } from '@/components/ui/use-toast';

const { toast } = useToast();

try {
  await permissionsApi.create(data);
} catch (error) {
  // Option 1: Use convenience function
  handlePermissionError(error, toast, {
    operation: 'create',
    entityType: 'permission',
  });
  
  // Option 2: Manual handling
  if (error instanceof AxiosError) {
    const toastOptions = formatErrorForToast(error, {
      operation: 'create',
      entityType: 'permission',
    });
    toast(toastOptions);
  }
}
```

### With React Query

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsApi } from '@/lib/api/permissions';

// Query permissions
const { data, isLoading, error } = useQuery({
  queryKey: ['permissions', filters],
  queryFn: () => permissionsApi.list(filters),
});

// Mutation for creating permission
const queryClient = useQueryClient();
const createMutation = useMutation({
  mutationFn: permissionsApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['permissions'] });
    toast({ title: 'Success', description: 'Permission created' });
  },
  onError: (error) => {
    handlePermissionError(error, toast, {
      operation: 'create',
      entityType: 'permission',
    });
  },
});
```

## Type Definitions

### Enums

```typescript
enum ResourceType {
  USER = 'user',
  APPLICATION = 'application',
  DEPARTMENT = 'department',
  BRANCH = 'branch',
  FILE = 'file',
  FOLDER = 'folder',
  ANALYTICS = 'analytics',
  NOTIFICATION = 'notification',
  AUDIT = 'audit',
  SYSTEM = 'system',
}

enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  REJECT = 'reject',
  ASSIGN = 'assign',
  EXPORT = 'export',
  IMPORT = 'import',
  MANAGE = 'manage',
}

enum PermissionScope {
  GLOBAL = 'global',
  DEPARTMENT = 'department',
  BRANCH = 'branch',
  TEAM = 'team',
  OWN = 'own',
}
```

### Core Types

```typescript
interface Permission {
  id: string;
  name: string;
  description: string;
  resource_type: ResourceType;
  action: PermissionAction;
  scope: PermissionScope;
  conditions?: Record<string, any>;
  is_active: boolean;
  is_system_permission: boolean;
  created_at: string;
  updated_at: string;
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  level: number;
  is_active: boolean;
  permissions?: Permission[];
  member_count?: number;
}

interface EffectivePermission {
  permission: Permission;
  source: 'role' | 'direct';
  role_name?: string;
  is_granted: boolean;
}
```

## Error Handling

The API client includes comprehensive error handling:

### Error Categories

- `VALIDATION` - Invalid input data (400, 422)
- `DUPLICATE` - Duplicate entry (409)
- `NOT_FOUND` - Resource not found (404)
- `FORBIDDEN` - Insufficient permissions (403)
- `SYSTEM_PERMISSION` - Attempt to modify system-protected items
- `IN_USE` - Cannot delete item in use
- `NETWORK` - Network connectivity issues
- `SERVER` - Server errors (500+)
- `UNKNOWN` - Unexpected errors

### Error Utilities

```typescript
// Categorize error
const category = categorizePermissionError(error);

// Get user-friendly message
const message = getPermissionErrorMessage(error, {
  operation: 'create',
  entityType: 'permission',
});

// Extract field errors for form validation
const fieldErrors = extractFieldErrors(error);

// Check error type
if (isValidationError(error)) {
  // Handle validation error
}

// Get suggested action
const suggestion = getSuggestedAction(error);
```

## Best Practices

1. **Always use TypeScript types** - Import types from `@/types/permissions`
2. **Handle errors properly** - Use error handling utilities for consistent UX
3. **Use React Query** - Leverage caching and automatic refetching
4. **Implement optimistic updates** - For better perceived performance
5. **Show loading states** - Provide feedback during async operations
6. **Validate on client** - Before sending requests to reduce errors
7. **Use bulk operations** - When operating on multiple items
8. **Cache permission checks** - To avoid repeated API calls

## API Endpoints

All endpoints are relative to `/api/v1`:

### Permissions
- `GET /permissions` - List permissions
- `GET /permissions/:id` - Get permission
- `POST /permissions` - Create permission
- `PATCH /permissions/:id` - Update permission
- `DELETE /permissions/:id` - Delete permission
- `POST /permissions/bulk` - Bulk operations
- `POST /permissions/check` - Check permission

### Roles
- `GET /roles` - List roles
- `GET /roles/:id` - Get role
- `POST /roles` - Create role
- `PATCH /roles/:id` - Update role
- `DELETE /roles/:id` - Delete role
- `GET /roles/:id/permissions` - Get role permissions
- `PUT /roles/:id/permissions` - Update role permissions
- `GET /roles/:id/members` - Get role members

### User Permissions
- `GET /users/:id/roles` - Get user roles
- `POST /users/:id/roles` - Assign role to user
- `DELETE /users/:id/roles/:roleId` - Revoke role from user
- `GET /users/:id/permissions` - Get user direct permissions
- `POST /users/:id/permissions` - Grant permission to user
- `DELETE /users/:id/permissions/:permId` - Revoke permission from user
- `GET /users/:id/permissions/all` - Get all user permissions

### Matrix
- `GET /permissions/matrix` - Get permission matrix
- `GET /permissions/matrix/export` - Export matrix to CSV

## Testing

```typescript
import { permissionsApi } from '@/lib/api/permissions';

describe('Permission API', () => {
  it('should list permissions', async () => {
    const result = await permissionsApi.list({ page: 1, size: 10 });
    expect(result.items).toBeDefined();
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it('should create permission', async () => {
    const permission = await permissionsApi.create({
      name: 'test.permission',
      description: 'Test permission',
      resource_type: ResourceType.SYSTEM,
      action: PermissionAction.READ,
      scope: PermissionScope.OWN,
    });
    expect(permission.id).toBeDefined();
  });
});
```

## Migration from Legacy System

If migrating from hardcoded role checks:

```typescript
// Before (hardcoded)
if (user.role === 'admin') {
  // Show admin features
}

// After (dynamic permissions)
import { usePermissionCheck } from '@/hooks/permissions/usePermissionCheck';

const { can } = usePermissionCheck();

if (can(ResourceType.SYSTEM, PermissionAction.MANAGE)) {
  // Show admin features
}
```

## Support

For issues or questions:
1. Check this documentation
2. Review the design document at `.kiro/specs/permission-management-system/design.md`
3. Check the requirements at `.kiro/specs/permission-management-system/requirements.md`
4. Contact the development team
