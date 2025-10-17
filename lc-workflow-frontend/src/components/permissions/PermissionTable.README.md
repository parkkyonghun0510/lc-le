# PermissionTable Component

A comprehensive, feature-rich table component for displaying and managing permissions in the RBAC system.

## Features

### Core Features
- ✅ **Sortable Columns**: Click column headers to sort by name, resource type, action, scope, or created date
- ✅ **Multi-Select**: Checkbox selection for individual permissions or select all
- ✅ **Inline Actions**: Edit, delete, and toggle active status directly from the table
- ✅ **Bulk Operations**: Activate, deactivate, or delete multiple permissions at once
- ✅ **Search**: Real-time search across permission names and descriptions
- ✅ **Advanced Filters**: Filter by resource type, action, scope, and active status
- ✅ **Pagination**: Navigate through large datasets with 50 items per page
- ✅ **Loading States**: Skeleton loading animation while data is being fetched
- ✅ **Empty States**: Helpful messages when no permissions are found
- ✅ **Error Handling**: Clear error messages with retry options

### UI/UX Features
- Responsive design that works on all screen sizes
- Hover effects for better interactivity
- Color-coded badges for resource types, actions, and scopes
- System permission indicators
- Confirmation dialogs for destructive actions
- Disabled state for system permissions (cannot be edited/deleted)
- Accessible keyboard navigation

## Usage

### Basic Example

```tsx
import PermissionTable from '@/components/permissions/PermissionTable';
import { usePermissions } from '@/hooks/usePermissions';
import { useState } from 'react';

function PermissionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    resourceType: '',
    action: '',
    scope: '',
    isActive: null
  });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  const { data: permissions = [], isLoading, error } = usePermissions();

  return (
    <PermissionTable
      permissions={permissions}
      loading={isLoading}
      error={error?.message || null}
      selectedPermissions={selectedPermissions}
      onSelectAll={() => {/* handle select all */}}
      onSelectPermission={(id) => {/* handle select */}}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      filters={filters}
      onFilterChange={(key, value) => {/* handle filter change */}}
    />
  );
}
```

### With Full Features

See `PermissionTableExample.tsx` for a complete implementation with:
- Permission CRUD operations
- Bulk actions
- Pagination
- Search and filtering
- Toast notifications

## Props

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `permissions` | `Permission[]` | Array of permission objects to display |
| `selectedPermissions` | `string[]` | Array of selected permission IDs |
| `onSelectAll` | `() => void` | Handler for select all checkbox |
| `onSelectPermission` | `(id: string) => void` | Handler for individual permission selection |
| `searchTerm` | `string` | Current search term |
| `onSearchChange` | `(value: string) => void` | Handler for search input changes |
| `filters` | `FilterObject` | Current filter values |
| `onFilterChange` | `(key: string, value: any) => void` | Handler for filter changes |

### Optional Props

| Prop | Type | Description |
|------|------|-------------|
| `loading` | `boolean` | Show loading skeleton |
| `error` | `string \| null` | Error message to display |
| `pagination` | `PaginationObject` | Pagination configuration |
| `onEdit` | `(permission: Permission) => void` | Handler for edit action |
| `onDelete` | `(id: string) => void` | Handler for delete action |
| `onToggleActive` | `(id: string, isActive: boolean) => void` | Handler for toggle active status |
| `onBulkActivate` | `(ids: string[]) => void` | Handler for bulk activate |
| `onBulkDeactivate` | `(ids: string[]) => void` | Handler for bulk deactivate |
| `onBulkDelete` | `(ids: string[]) => void` | Handler for bulk delete |
| `className` | `string` | Additional CSS classes |

### Type Definitions

```typescript
interface FilterObject {
  resourceType: string;
  action: string;
  scope: string;
  isActive: boolean | null;
}

interface PaginationObject {
  page: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  resource_type: string;
  action: string;
  scope: string;
  is_active: boolean;
  is_system_permission: boolean;
  created_at: string;
  updated_at: string;
}
```

## Features in Detail

### Sorting

Click any sortable column header to sort the table. Click again to reverse the sort order. Sortable columns include:
- Name
- Resource Type
- Action
- Scope
- Created Date

### Filtering

The filter panel provides four filter options:
1. **Resource Type**: Filter by specific resource (user, application, etc.)
2. **Action**: Filter by permission action (create, read, update, etc.)
3. **Scope**: Filter by permission scope (global, department, branch, etc.)
4. **Status**: Filter by active/inactive status

Filters can be combined and work together using AND logic.

### Bulk Operations

1. Select multiple permissions using checkboxes
2. A bulk action toolbar appears showing the number of selected items
3. Choose from:
   - **Activate**: Enable selected permissions
   - **Deactivate**: Disable selected permissions
   - **Delete**: Remove selected permissions (with confirmation)

### Pagination

- Default page size: 50 items
- Shows current page range (e.g., "Showing 1 to 50 of 150 results")
- Previous/Next navigation buttons
- Direct page number buttons (shows up to 5 pages)
- Automatically disabled when on first/last page

### System Permissions

Permissions marked as `is_system_permission: true` have special handling:
- Display a "System" badge
- Edit and delete buttons are disabled
- Cannot be toggled active/inactive
- Tooltip explains they cannot be modified

## Styling

The component uses Tailwind CSS classes and follows the existing design system:
- Primary color: Indigo (indigo-600, indigo-700)
- Success: Green (green-100, green-800)
- Warning: Yellow (yellow-100, yellow-800)
- Danger: Red (red-100, red-800)
- Info: Blue (blue-100, blue-800)
- Purple badges for resource types
- Blue badges for actions
- Green badges for scopes

## Accessibility

- Keyboard navigation support
- ARIA labels on interactive elements
- Focus indicators on all interactive elements
- Screen reader compatible
- Semantic HTML structure
- Color contrast meets WCAG AA standards

## Performance Considerations

- Client-side sorting for better UX
- Memoized filter calculations
- Efficient re-rendering with React keys
- Pagination to limit DOM nodes
- Loading skeletons prevent layout shift

## Integration with Backend

The component is designed to work with the permission management API:
- Uses `usePermissions` hook for data fetching
- Uses `useUpdatePermission` for status toggles
- Uses `useDeletePermission` for deletions
- Supports React Query caching and optimistic updates

## Future Enhancements

Potential improvements for future iterations:
- Virtual scrolling for very large datasets
- Column visibility toggles
- Export to CSV functionality
- Saved filter presets
- Drag-and-drop reordering
- Inline editing
- Batch import from CSV

## Related Components

- `PermissionForm`: For creating/editing permissions
- `PermissionMatrix`: For visualizing role-permission relationships
- `RoleManagement`: For managing roles
- `UserPermissionAssignment`: For assigning permissions to users

## Requirements Satisfied

This component satisfies the following requirements from the spec:
- ✅ Requirement 1.1: Display list of all permissions
- ✅ Requirement 6.1: Search functionality with 500ms response time
- ✅ Requirement 6.2: Multiple filter support
- ✅ Requirement 6.4: Combined filter logic (AND)
- ✅ Requirement 13.1: Multi-select with checkboxes
- ✅ Requirement 13.2: Bulk action toolbar

## Testing

To test the component:

1. **Unit Tests**: Test sorting, filtering, selection logic
2. **Integration Tests**: Test with real API data
3. **E2E Tests**: Test user workflows (search, filter, bulk actions)
4. **Accessibility Tests**: Test keyboard navigation and screen readers

Example test scenarios:
- Sort by each column
- Filter by each filter type
- Select all/deselect all
- Bulk operations
- Pagination navigation
- Search functionality
- Error states
- Loading states
- Empty states

## Troubleshooting

### Permissions not showing
- Check that `permissions` prop is an array
- Verify API is returning data
- Check for filter conflicts

### Sorting not working
- Ensure permission objects have the expected properties
- Check console for errors

### Bulk actions not working
- Verify handlers are passed as props
- Check that selected permissions array is managed correctly
- Ensure API endpoints are working

### Styling issues
- Verify Tailwind CSS is configured correctly
- Check for CSS conflicts
- Ensure Heroicons are installed
