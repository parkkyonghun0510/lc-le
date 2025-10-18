# Permission Management Infrastructure

This directory contains the core infrastructure for the admin permission management UI.

## Overview

Task 1 has been completed, setting up the foundation for the permission management system with:
- Type definitions and enums
- React Query hooks for API integration
- Error boundaries and loading components
- Retry mechanisms for failed API calls

## Files Created

### Type Definitions
- **`src/types/permissions.ts`** (updated)
  - Added `PermissionTemplate` types
  - Added `RolePermissionMatrixResponse` for role-based matrix view
  - Added template generation and application types
  - Added template comparison types

### API Hooks
- **`src/hooks/usePermissionManagement.ts`** (new)
  - Comprehensive React Query hooks for all permission operations
  - Optimistic updates for matrix operations
  - Proper error handling with toast notifications
  - Query key management for efficient caching
  - Hooks for:
    - Permissions CRUD
    - Roles CRUD
    - Permission Matrix
    - Templates CRUD and operations
    - Audit Trail
    - User Permission assignments
    - Bulk operations

### Error Handling
- **`src/components/permissions/PermissionErrorBoundary.tsx`** (new)
  - Class-based error boundary for permission components
  - Graceful error handling with fallback UI
  - Retry mechanisms
  - Development mode error details
  - `InlineError` component for inline error display

### Loading States
- **`src/components/permissions/PermissionLoadingStates.tsx`** (new)
  - Skeleton components for all major sections:
    - `PermissionListSkeleton`
    - `RoleListSkeleton`
    - `PermissionMatrixSkeleton`
    - `UserPermissionSkeleton`
    - `TemplateListSkeleton`
    - `AuditTrailSkeleton`
    - `FormSkeleton`
    - `TableSkeleton`
    - `PermissionPageSkeleton`
  - `LoadingSpinner` for inline loading
  - `LoadingOverlay` for modal loading states

### Retry Mechanisms
- **`src/hooks/usePermissionRetry.ts`** (new)
  - Exponential backoff retry logic
  - Network error detection
  - Retryable error detection
  - React Query retry configurations
  - Automatic retry with customizable options

## Usage Examples

### Using Permission Hooks

```typescript
import { usePermissionList, useCreatePermission } from '@/hooks/usePermissionManagement';

function PermissionList() {
  const { data, isLoading, error } = usePermissionList({ page: 1, size: 20 });
  const createPermission = useCreatePermission();

  if (isLoading) return <PermissionListSkeleton />;
  if (error) return <InlineError error={error} />;

  return (
    <div>
      {data?.items.map(permission => (
        <div key={permission.id}>{permission.name}</div>
      ))}
    </div>
  );
}
```

### Using Error Boundary

```typescript
import { PermissionErrorBoundary } from '@/components/permissions/PermissionErrorBoundary';

function App() {
  return (
    <PermissionErrorBoundary>
      <PermissionManagementUI />
    </PermissionErrorBoundary>
  );
}
```

### Using Loading States

```typescript
import { PermissionMatrixSkeleton } from '@/components/permissions/PermissionLoadingStates';

function PermissionMatrix() {
  const { data, isLoading } = usePermissionMatrix();

  if (isLoading) return <PermissionMatrixSkeleton />;

  return <MatrixGrid data={data} />;
}
```

### Using Retry Hook

```typescript
import { usePermissionRetry } from '@/hooks/usePermissionRetry';

function MyComponent() {
  const { retry, isRetrying } = usePermissionRetry({
    maxRetries: 3,
    onMaxRetriesReached: () => console.log('Max retries reached'),
  });

  const handleOperation = async () => {
    await retry(async () => {
      return await someApiCall();
    });
  };

  return <button onClick={handleOperation} disabled={isRetrying}>Submit</button>;
}
```

## Query Keys

All query keys are centralized for easy cache invalidation:

```typescript
import { permissionKeys, roleKeys, matrixKeys, templateKeys, auditKeys } from '@/hooks/usePermissionManagement';

// Invalidate all permissions
queryClient.invalidateQueries({ queryKey: permissionKeys.all });

// Invalidate specific permission
queryClient.invalidateQueries({ queryKey: permissionKeys.detail(id) });

// Invalidate permission matrix
queryClient.invalidateQueries({ queryKey: matrixKeys.all });
```

## Features

### Optimistic Updates
- Matrix operations update the UI immediately
- Automatic rollback on error
- Smooth user experience

### Error Handling
- Toast notifications for all operations
- Detailed error messages
- Retry mechanisms for network errors
- Error boundaries for component failures

### Caching Strategy
- 5-minute stale time for lists
- 2-minute stale time for matrix
- 1-minute stale time for audit trail
- Automatic cache invalidation on mutations

### Loading States
- Skeleton loaders for all major components
- Consistent loading experience
- Accessible loading indicators

## Next Steps

With the infrastructure in place, the next tasks will implement:
1. Permission Matrix component (Task 2)
2. Role Management component (Task 3)
3. User Permission Assignment component (Task 4)
4. Permission Management component (Task 5)
5. Permission Templates component (Task 6)
6. Permission Audit Trail component (Task 7)
7. Integration into main permissions page (Task 8)

## Notes

- All hooks use `react-hot-toast` for notifications
- Error boundaries catch React component errors
- Retry logic handles network failures automatically
- All types are fully typed with TypeScript
- Components follow the existing design system
