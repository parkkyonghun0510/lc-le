# User Permission Assignment Component

## Overview

The User Permission Assignment component provides a comprehensive interface for managing user roles and permissions in the admin permission management system. It allows administrators to search for users, assign roles, grant direct permissions, and view effective permissions.

## Features

### 1. User Search and Selection (Subtask 4.1)

- **Autocomplete Search**: Real-time user search with debouncing (300ms delay)
- **Advanced Filtering**: Filter users by role, department, and branch
- **User Profile Display**: Shows user avatar, name, email, and department
- **Current Permission Summary**: Displays role count, direct permissions, and total effective permissions

### 2. Role Assignment (Subtask 4.2)

- **Role Assignment Modal**: Select and assign roles to users
- **Role Search**: Search available roles within the assignment modal
- **Role Removal**: Remove roles with confirmation dialog
- **System Role Protection**: Prevents removal of system-critical roles
- **Bulk Role Assignment**: Assign roles to multiple users at once (via BulkUserRoleAssignment component)

### 3. Direct Permission Management (Subtask 4.3)

- **Grant Permissions**: Directly grant permissions to users
- **Deny Permissions**: Override role-based permissions with explicit denials
- **Permission Search**: Search and filter available permissions
- **Resource Type Filtering**: Filter permissions by resource type
- **Permission Revocation**: Remove direct permissions with confirmation

### 4. Effective Permissions Display (Subtask 4.3)

- **Comprehensive View**: Shows all active permissions from all sources
- **Source Attribution**: Clearly indicates whether permissions come from roles or direct grants
- **Grouped Display**: Permissions grouped by resource type
- **Advanced Filtering**: Filter by search query, resource type, and source
- **Permission Details**: Shows permission name, description, action, scope, and source

## Component Structure

```
UserPermissionAssignment (Main Container)
├── UserSearchPanel
│   ├── Search Input (with debouncing)
│   ├── Filter Controls
│   └── UserListItem (for each user)
├── UserPermissionsPanel
│   ├── UserProfileSummary
│   ├── RoleAssignmentSection
│   │   ├── RoleAssignmentCard (for each role)
│   │   ├── AssignRoleModal
│   │   └── RemoveRoleConfirmation
│   ├── DirectPermissionsSection
│   │   ├── DirectPermissionCard (for each permission)
│   │   ├── GrantPermissionModal
│   │   └── RevokePermissionConfirmation
│   └── EffectivePermissionsSection
│       └── EffectivePermissionCard (for each permission)
└── BulkUserRoleAssignment (separate component)
```

## Usage

### Basic Usage

```tsx
import { UserPermissionAssignment } from '@/components/permissions/UserPermissionAssignment';

function PermissionsPage() {
  return (
    <div>
      <UserPermissionAssignment />
    </div>
  );
}
```

### With Custom Styling

```tsx
<UserPermissionAssignment className="my-custom-class" />
```

## API Integration

The component uses the following hooks from `usePermissionManagement`:

- `useUserPermissions(userId)` - Fetch user's roles and permissions
- `useAssignRoleToUser()` - Assign a role to a user
- `useRevokeRoleFromUser()` - Remove a role from a user
- `useGrantPermissionToUser()` - Grant a direct permission
- `useRevokePermissionFromUser()` - Revoke a direct permission
- `useRoleList(params)` - List available roles
- `usePermissionList(params)` - List available permissions
- `useBulkAssignRoles()` - Assign roles to multiple users

## User Flows

### Assigning a Role to a User

1. Search for and select a user from the left panel
2. Click "Assign Role" in the Role Assignments section
3. Search for the desired role in the modal
4. Select the role and click "Assign Role"
5. The role is immediately assigned and the UI updates

### Granting a Direct Permission

1. Select a user from the search panel
2. Click "Grant Permission" in the Direct Permissions section
3. Choose whether to grant or deny the permission
4. Search and filter to find the desired permission
5. Select the permission and click "Grant Permission" or "Deny Permission"
6. The permission is immediately applied

### Viewing Effective Permissions

1. Select a user from the search panel
2. Scroll to the Effective Permissions section
3. Use filters to narrow down the permission list
4. View permissions grouped by resource type
5. Each permission shows its source (role or direct)

## Accessibility

- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Focus Management**: Clear focus indicators and logical tab order
- **Color Contrast**: WCAG 2.1 AA compliant color contrast ratios

## Performance Optimizations

- **Debounced Search**: 300ms debounce on user search to reduce API calls
- **Optimistic Updates**: Immediate UI updates with rollback on failure
- **React Query Caching**: Intelligent caching of user and permission data
- **Lazy Loading**: Components loaded on demand

## Error Handling

- **Error Boundaries**: Graceful error handling with PermissionErrorBoundary
- **Loading States**: Skeleton loaders during data fetching
- **Toast Notifications**: User-friendly error and success messages
- **Retry Mechanisms**: Automatic retry for failed API calls

## Bulk Operations

The `BulkUserRoleAssignment` component allows assigning a role to multiple users:

```tsx
import { BulkUserRoleAssignment } from '@/components/permissions/BulkUserRoleAssignment';

function MyComponent() {
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowBulkModal(true)}>
        Bulk Assign Roles
      </button>
      
      {showBulkModal && (
        <BulkUserRoleAssignment
          selectedUsers={selectedUsers}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            // Handle success
          }}
        />
      )}
    </>
  );
}
```

## Requirements Mapping

This component fulfills the following requirements from the spec:

- **Requirement 3.1**: Display all users with current role assignments ✓
- **Requirement 3.2**: Assign roles to users with immediate updates ✓
- **Requirement 3.3**: Remove roles with confirmation ✓
- **Requirement 3.4**: Show both role-based and direct permissions ✓
- **Requirement 3.5**: Support bulk role assignment ✓

## Future Enhancements

- Export user permissions to CSV/PDF
- Permission comparison between users
- Permission history timeline
- Advanced permission analytics
- Custom permission templates per user

## Related Components

- `RoleManagement` - Manage roles and their permissions
- `PermissionMatrix` - Visual matrix of role-permission assignments
- `PermissionAuditTrail` - View permission change history
- `PermissionTemplates` - Manage permission templates

## Testing

The component should be tested for:

1. User search and filtering functionality
2. Role assignment and removal
3. Direct permission grants and denials
4. Effective permission calculation
5. Error handling and loading states
6. Accessibility compliance
7. Bulk operations

## Notes

- System roles cannot be removed from users
- Direct permission denials override role-based grants
- Effective permissions are calculated server-side
- All operations are logged in the audit trail
