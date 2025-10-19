# Admin Permission Management UI - Specification

## Overview

This specification defines the comprehensive admin interface for managing the Role-Based Access Control (RBAC) system. The system provides fine-grained permission management with support for roles, direct permissions, templates, and audit trails.

## Documentation Structure

### Core Specification Documents

1. **[requirements.md](./requirements.md)** - Functional requirements in EARS format
   - User stories and acceptance criteria
   - Complete feature requirements

2. **[design.md](./design.md)** - Technical design document
   - System architecture
   - Component specifications
   - API integration details
   - Data models and interfaces

3. **[tasks.md](./tasks.md)** - Implementation task list
   - Detailed implementation tasks
   - Task dependencies and status
   - Requirements traceability

### Migration Documents

4. **[MIGRATION_PLAN.md](./MIGRATION_PLAN.md)** - Overall migration strategy
   - Current state analysis
   - Migration phases and timeline
   - Files requiring migration
   - Testing and rollback plans

5. **[../../lc-workflow-frontend/PERMISSION_MIGRATION_GUIDE.md](../../lc-workflow-frontend/PERMISSION_MIGRATION_GUIDE.md)** - Developer migration guide
   - Quick migration examples
   - API reference
   - Common patterns
   - Best practices
   - Troubleshooting

## Quick Start

### For Administrators

To manage permissions in the system:

1. Navigate to `/admin/permissions` in the application
2. Use the tabs to access different management sections:
   - **Permission Matrix** - Visual grid of role-permission assignments
   - **Role Management** - Create and manage roles
   - **User Permissions** - Assign roles and permissions to users
   - **Permission Management** - Create and manage individual permissions
   - **Templates** - Use pre-configured permission sets
   - **Audit Trail** - View permission change history

### For Developers

To use the permission system in your code:

```typescript
import { usePermissionCheck } from '@/hooks/usePermissionCheck';

function MyComponent() {
  const { can, hasRole, isAdmin } = usePermissionCheck();
  
  // Check specific permission
  if (can('application', 'approve', 'department')) {
    // User can approve applications at department level
  }
  
  // Check role
  if (hasRole('admin')) {
    // User is an admin
  }
  
  // Check if admin (convenience method)
  if (isAdmin()) {
    // User is an admin
  }
}
```

**See [PERMISSION_MIGRATION_GUIDE.md](../../lc-workflow-frontend/PERMISSION_MIGRATION_GUIDE.md) for complete examples and API reference.**

## Implementation Status

### ✅ Completed Features

- [x] Permission Management UI (Tasks 1-9)
  - Permission CRUD operations
  - Role management with hierarchy
  - User permission assignment
  - Interactive permission matrix
  - Permission templates
  - Audit trail with filtering
  - Mobile-responsive design
  - Performance optimizations

- [x] Partial Application Migration (Tasks 11.1-11.4)
  - Dashboard pages
  - Application pages
  - User management pages
  - File components

- [x] Deprecation Infrastructure (Task 11.5)
  - useRole() hook deprecated with warnings
  - AuthProvider role flags deprecated
  - Comprehensive migration guide created

### 🔄 In Progress

- [ ] Final Migration Tasks (Task 11.6)
  - Complete codebase audit
  - Remove all remaining role checks
  - Final verification and testing

## Key Concepts

### Permission Structure

A permission consists of:
- **Resource**: What is being accessed (e.g., 'application', 'file', 'user')
- **Action**: What operation is being performed (e.g., 'create', 'read', 'update', 'delete')
- **Scope**: The access level (e.g., 'own', 'department', 'branch', 'global')

Example: `can('application', 'approve', 'department')` checks if the user can approve applications at the department level.

### Role Hierarchy

Roles can have different levels and inherit permissions. The system supports:
- System roles (cannot be deleted)
- Custom roles (can be created by admins)
- Role-based permission inheritance
- Direct permission grants/denials

### Permission Sources

Users can have permissions from multiple sources:
1. **Role-based**: Permissions granted through assigned roles
2. **Direct grants**: Permissions granted directly to the user
3. **Direct denials**: Permissions explicitly denied (override role grants)

### Scopes

Permissions can be scoped to different levels:
- **own**: User's own resources only
- **department**: All resources in user's department
- **branch**: All resources in user's branch
- **global**: All resources system-wide

## Architecture

### Frontend Components

```
PermissionsPage (Main Container)
├── PermissionMatrix (Visual grid view)
├── RoleManagement (CRUD operations for roles)
├── UserPermissionAssignment (User-role assignments)
├── PermissionManagement (CRUD operations for permissions)
├── PermissionTemplates (Template management)
└── PermissionAuditTrail (Audit log viewer)
```

### Backend Integration

The frontend integrates with existing backend APIs:
- `/api/v1/permissions/*` - Permission CRUD
- `/api/v1/permissions/roles/*` - Role management
- `/api/v1/users/{id}/roles` - User role assignments
- `/api/v1/permissions/matrix` - Permission matrix data
- `/api/v1/permissions/templates/*` - Template management
- `/api/v1/permissions/audit` - Audit trail

### State Management

- **React Query** for API data fetching and caching
- **Optimistic updates** for immediate UI feedback
- **Error boundaries** for graceful error handling
- **Loading states** with skeleton screens

## Migration Strategy

### Phase 1: Deprecation (Current)
- ✅ Add deprecation warnings to old APIs
- ✅ Create migration documentation
- ✅ Maintain backward compatibility

### Phase 2: Migration (In Progress)
- 🔄 Replace role checks with permission checks
- 🔄 Update components to use usePermissionCheck
- 🔄 Test thoroughly with different permission sets

### Phase 3: Cleanup (Future)
- ⏳ Remove deprecated APIs
- ⏳ Remove role-based infrastructure
- ⏳ Final verification and documentation

## Testing

### Unit Tests
- Component behavior testing
- Hook testing with mock data
- Utility function testing

### Integration Tests
- API integration testing
- User flow testing
- Permission calculation testing

### Performance Tests
- Large dataset handling (100+ roles, 200+ permissions)
- Render performance
- Memory leak detection

## Security Considerations

- Input validation on all forms
- XSS prevention through sanitization
- CSRF protection for state changes
- Audit logging for all permission changes
- IP tracking for security review

## Accessibility

- WCAG 2.1 AA compliant
- Full keyboard navigation
- Screen reader support
- Proper ARIA labels
- Focus management

## Resources

### Documentation
- [Requirements](./requirements.md) - What the system should do
- [Design](./design.md) - How the system is built
- [Tasks](./tasks.md) - Implementation checklist
- [Migration Plan](./MIGRATION_PLAN.md) - Migration strategy
- [Migration Guide](../../lc-workflow-frontend/PERMISSION_MIGRATION_GUIDE.md) - Developer guide

### Related Files
- `lc-workflow-frontend/src/hooks/usePermissionCheck.ts` - Permission check hook
- `lc-workflow-frontend/src/hooks/useAuth.ts` - Authentication hook (deprecated role methods)
- `lc-workflow-frontend/src/providers/AuthProvider.tsx` - Auth context provider
- `lc-workflow-frontend/src/app/admin/permissions/page.tsx` - Permission management UI

## Support

For questions or issues:
1. Check the [Migration Guide](../../lc-workflow-frontend/PERMISSION_MIGRATION_GUIDE.md) for common patterns
2. Review the [Migration Plan](./MIGRATION_PLAN.md) for overall strategy
3. Consult the [Design Document](./design.md) for technical details
4. Check the [Tasks](./tasks.md) for implementation status

## Changelog

### 2024-01-18
- ✅ Completed Task 11.5: Deprecated role-based infrastructure
- ✅ Added deprecation warnings to useRole() hook
- ✅ Added deprecation warnings to AuthProvider role flags
- ✅ Created comprehensive PERMISSION_MIGRATION_GUIDE.md
- ✅ Updated documentation with migration references

### Previous Updates
- ✅ Completed Tasks 1-9: Full permission management UI
- ✅ Completed Tasks 11.1-11.4: Partial application migration
- ✅ Created migration plan and strategy documents
