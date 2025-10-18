# Permission Matrix Component

## Overview

The Permission Matrix component provides an interactive grid interface for managing role-permission assignments in the RBAC system. It displays roles as rows and permissions as columns, allowing administrators to quickly view and modify permission assignments.

## Features

### Core Functionality

1. **Interactive Grid Layout**
   - Responsive table with sticky headers for easy navigation
   - Roles displayed as rows with display name and level
   - Permissions grouped by resource type for better organization
   - Visual indicators (checkmarks/crosses) for granted/denied permissions

2. **Click-to-Toggle Permissions**
   - Single-click to grant or revoke permissions
   - Optimistic UI updates for immediate feedback
   - Automatic rollback on API errors
   - Confirmation dialogs for critical permissions (delete, manage, system)

3. **Advanced Filtering**
   - Search roles by name or display name
   - Search permissions by name or description
   - Filter by resource type (user, application, department, etc.)
   - Filter by action (create, read, update, delete, etc.)
   - Collapsible filter panel to save screen space

4. **Export Functionality**
   - Export matrix to CSV format
   - Includes all filtered roles and permissions
   - Timestamped filename for easy organization
   - Useful for documentation and compliance

## Usage

```tsx
import PermissionMatrix from '@/components/permissions/PermissionMatrix';

function PermissionsPage() {
  return (
    <PermissionMatrix 
      onPermissionChange={() => {
        // Optional callback when permissions are modified
        console.log('Permissions updated');
      }}
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onPermissionChange` | `() => void` | No | Callback function triggered after successful permission changes |

## API Integration

The component uses the following hooks from `usePermissionManagement`:

- `usePermissionMatrix()` - Fetches the role-permission matrix data
- `useAssignPermissionToRole()` - Grants a permission to a role
- `useRevokePermissionFromRole()` - Revokes a permission from a role

## Data Structure

The component expects the following data structure from the API:

```typescript
interface RolePermissionMatrixResponse {
  roles: PermissionMatrixRole[];
  permissions: PermissionMatrixPermission[];
  assignments: Record<string, string[]>; // roleId -> permissionIds[]
}
```

## Visual Indicators

- ✅ **Green checkmark**: Permission is granted
- ❌ **Gray cross**: Permission is not granted
- **Hover effects**: Indicates clickable cells
- **Disabled state**: Shows when mutations are in progress

## Confirmation Dialogs

Critical permissions trigger a confirmation dialog before granting:
- Permissions containing "delete"
- Permissions containing "manage"
- Permissions containing "system"

## Filtering

### Role Search
- Searches in role name and display name
- Case-insensitive
- Real-time filtering

### Permission Search
- Searches in permission name and description
- Case-insensitive
- Real-time filtering

### Resource Type Filter
- Multiple selection supported
- Shows all resource types as filter chips
- Active filters highlighted in blue

### Action Filter
- Multiple selection supported
- Shows all actions as filter chips
- Active filters highlighted in blue

## Export Format

CSV export includes:
- Header row with "Role" and permission names
- Data rows with role display names and Yes/No values
- Filename format: `permission-matrix-YYYY-MM-DD.csv`

## Loading States

The component shows a skeleton loader while fetching data:
- Animated placeholder for the matrix grid
- Maintains layout structure during loading
- Smooth transition to actual content

## Error Handling

- Displays user-friendly error messages
- Shows retry options for failed operations
- Maintains data consistency with optimistic updates
- Automatic rollback on mutation failures

## Responsive Design

- **Desktop**: Full matrix view with all features
- **Tablet**: Horizontal scrolling for wide matrices
- **Mobile**: Optimized layout with collapsible filters

## Performance Considerations

- Permissions grouped by resource type to reduce visual clutter
- Sticky headers for easy navigation in large matrices
- Optimistic updates for instant feedback
- Efficient re-rendering with React Query caching

## Accessibility

- Keyboard navigation support
- ARIA labels for screen readers
- Focus management for modals
- High contrast visual indicators
- Descriptive button titles

## Related Components

- `PermissionLoadingStates` - Loading skeletons
- `PermissionErrorBoundary` - Error handling
- `usePermissionManagement` - API integration hooks

## Requirements Fulfilled

This component fulfills the following requirements from the spec:

- **Requirement 4.1**: Display permission matrix grid
- **Requirement 4.2**: Visual indicators for permission assignments
- **Requirement 4.4**: Click-to-toggle functionality
- **Requirement 4.5**: Filtering and export capabilities
