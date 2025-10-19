# Migration Plan: Role-Based to Permission-Based Access Control

> **📖 Developer Migration Guide:** For detailed step-by-step migration instructions, examples, and API reference, see [`lc-workflow-frontend/PERMISSION_MIGRATION_GUIDE.md`](../../lc-workflow-frontend/PERMISSION_MIGRATION_GUIDE.md)

## Current State Analysis

### Authentication Structure
- **Auth Provider**: `AuthProvider.tsx` wraps the app and provides auth context
- **Auth Hook**: `useAuth()` provides user data and authentication state
- **Role Hook**: `useRole()` provides role-based checks (isAdmin, isManager, isOfficer)
- **Permission Hook**: `usePermissionCheck()` provides RBAC permission checks (NEW)

### Current Access Control Pattern (OLD)
The codebase currently uses **role-based checks** throughout:

```typescript
// Old pattern - checking user roles directly
const { isAdmin, isManager, isOfficer } = useRole();
if (!isAdmin && !isManager) {
  // Deny access
}

// Or checking user.role directly
if (user?.role === 'admin' || user?.role === 'manager') {
  // Allow action
}
```

### New Permission-Based Pattern (IMPLEMENTED)
The new RBAC system is fully implemented but **not yet integrated** into the app:

```typescript
// New pattern - checking permissions
const { can, hasRole, isAdmin } = usePermissionCheck();

// Check specific permission
if (can('application', 'approve', 'department')) {
  // Allow action
}

// Check role (still supported)
if (hasRole('admin')) {
  // Allow action
}
```

## Files Requiring Migration

### High Priority - Core Access Control

1. **Dashboard** (`app/dashboard/page.tsx`)
   - Currently: No explicit role checks (accessible to all authenticated users)
   - Action: Add permission checks for viewing dashboard stats

2. **Applications** (`app/applications/page.tsx`)
   - Currently: Role-based filtering (officer sees USER_COMPLETED, manager sees TELLER_PROCESSING)
   - Action: Replace with permission-based filtering

3. **Application Detail** (`app/applications/[id]/page.tsx`)
   - Currently: `canEdit`, `canApprove` based on user.role
   - Action: Replace with `can('application', 'update')` and `can('application', 'approve')`

4. **Application Edit** (`app/applications/[id]/edit/page.tsx`)
   - Currently: Likely has role checks for editing
   - Action: Replace with permission checks

5. **Users Management** (`app/users/**`)
   - Currently: Role-based access
   - Action: Replace with permission checks for user CRUD operations

6. **Files** (`app/files/page.tsx`)
   - Currently: `user?.role === 'admin' || file.uploaded_by === user?.id`
   - Action: Replace with `can('file', 'delete', 'own')` or `can('file', 'delete', 'global')`

7. **Workload Overview** (`app/employees/workload/page.tsx`)
   - Currently: `if (!isAdmin && !isManager)` blocks access
   - Action: Replace with `can('workload', 'view')`

8. **Admin Migration** (`app/admin/migrate-employees/page.tsx`)
   - Currently: `if (user && user.role !== 'admin')`
   - Action: Replace with `can('system', 'migrate')`

### Medium Priority - Feature Access

9. **Branch Detail** (`app/branches/[id]/page.tsx`)
   - Currently: Displays role counts
   - Action: Add permission checks for branch management

10. **User Lifecycle** (`app/users/[id]/lifecycle/page.tsx`)
    - Currently: `isManager = ['admin', 'manager'].includes(currentUserRole)`
    - Action: Replace with permission checks

11. **Profile** (`app/profile/page.tsx`)
    - Currently: `isAdminOrManager = user?.role === 'admin' || user?.role === 'manager'`
    - Action: Replace with permission checks for profile editing

### Low Priority - Component Level

12. **File Components** (`src/components/files/**`)
    - Multiple components use `useAuth()` and check `user.role`
    - Action: Replace with permission checks

13. **Notification Management** (`src/components/notifications/NotificationManagement.tsx`)
    - Uses `useAuth()` for user context
    - Action: Add permission checks for notification management

## Migration Strategy

### Phase 1: Add Permission Checks Alongside Role Checks (Non-Breaking)
- Keep existing role checks working
- Add new permission checks in parallel
- Log when permission checks differ from role checks
- Test thoroughly in development

### Phase 2: Gradual Replacement (Feature by Feature)
- Replace role checks with permission checks one feature at a time
- Start with low-risk features (dashboard, viewing)
- Move to high-risk features (editing, deleting, approving)
- Maintain backward compatibility during transition

### Phase 3: Remove Old Role Checks (Breaking Change)
- Remove `useRole()` hook entirely
- Remove role-based checks from components
- Update all components to use `usePermissionCheck()`
- Deploy with proper testing and rollback plan

## Implementation Tasks

### Task 11: Migrate Core Features to Permission-Based Access Control

- [ ] 11.1 Create permission migration utility functions
  - Create helper functions to map old role checks to new permission checks
  - Add logging/monitoring for permission check failures
  - Create fallback mechanisms for backward compatibility
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_

- [ ] 11.2 Migrate Dashboard and Application pages
  - Replace role checks in dashboard with permission checks
  - Update application list filtering to use permissions
  - Update application detail page (canEdit, canApprove) with permission checks
  - Update application edit page with permission checks
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 4.1_

- [ ] 11.3 Migrate User and Admin pages
  - Replace role checks in user management pages
  - Update admin pages (migration, settings) with permission checks
  - Update user lifecycle management with permission checks
  - Update profile page with permission checks
  - _Requirements: 1.1, 2.1, 3.1_

- [ ] 11.4 Migrate File and Branch management
  - Replace role checks in file management with permission checks
  - Update branch management with permission checks
  - Update workload overview with permission checks
  - _Requirements: 1.1, 4.1_

- [ ] 11.5 Update component-level access control
  - Replace role checks in file components
  - Update notification management with permission checks
  - Update any remaining components using role checks
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_

- [x] 11.5 Remove deprecated role-based infrastructure (COMPLETED)
  - ✅ Deprecated `useRole()` hook with console warnings
  - ✅ Added deprecation warnings to AuthProvider role flags
  - ✅ Updated TypeScript interfaces with @deprecated JSDoc tags
  - ✅ Created comprehensive PERMISSION_MIGRATION_GUIDE.md
  - ✅ Updated documentation to reflect permission-based approach
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_

- [ ] 11.6 Final cleanup and verification
  - Search codebase for any remaining `user?.role` or `user.role` checks
  - Search for any remaining useRole() usage
  - Verify all pages and components use usePermissionCheck
  - Run full application test to ensure no broken functionality
  - Update all relevant documentation
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_

## Permission Mapping Guide

### Common Role-to-Permission Mappings

| Old Role Check | New Permission Check |
|---------------|---------------------|
| `isAdmin` | `isAdmin()` or `hasRole('admin')` |
| `isManager` | `hasRole('manager')` |
| `isOfficer` | `hasRole('officer')` |
| `user.role === 'admin'` | `hasRole('admin')` |
| Admin or Manager can edit | `can('resource', 'update', 'department')` |
| Admin can delete | `can('resource', 'delete', 'global')` |
| User can edit own | `can('resource', 'update', 'own')` |
| Manager can approve | `can('application', 'approve', 'department')` |
| Officer can process | `can('application', 'process', 'own')` |

### Resource Types to Define

Based on the codebase analysis, we need these resource types:
- `application` - Loan applications
- `user` - User management
- `file` - File management
- `branch` - Branch management
- `department` - Department management
- `workload` - Workload viewing
- `system` - System administration
- `notification` - Notification management
- `report` - Report generation

### Actions to Define

- `create` - Create new resources
- `read` - View resources
- `update` - Edit resources
- `delete` - Delete resources
- `approve` - Approve applications
- `reject` - Reject applications
- `process` - Process applications
- `assign` - Assign resources
- `view` - View specific data
- `manage` - Full management access

### Scopes to Define

- `own` - User's own resources
- `department` - Department-level access
- `branch` - Branch-level access
- `global` - System-wide access

## Testing Strategy

1. **Unit Tests**: Test permission check logic in isolation
2. **Integration Tests**: Test permission checks in component context
3. **E2E Tests**: Test complete user flows with different permission sets
4. **Manual Testing**: Test with different user roles and permission combinations

## Rollback Plan

1. Keep old role-based checks in place during Phase 1
2. Feature flags to toggle between old and new systems
3. Database backup before deploying permission changes
4. Quick rollback script to revert to role-based checks if needed

## Success Criteria

- [ ] All role-based checks replaced with permission checks
- [ ] No breaking changes to existing functionality
- [ ] All tests passing
- [ ] Performance metrics maintained or improved
- [ ] Documentation updated
- [ ] Team trained on new permission system
