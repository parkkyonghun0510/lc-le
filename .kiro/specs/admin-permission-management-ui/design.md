# Design Document

## Overview

This design document outlines the comprehensive admin interface for managing the existing backend RBAC (Role-Based Access Control) system. The backend already provides a full permission management API with roles, permissions, assignments, templates, and audit trails. The frontend will create an intuitive admin interface that leverages these existing capabilities.

## Architecture

### System Integration

The admin UI will integrate with the existing backend permission system through:

- **Backend API**: `/api/v1/permissions/*` endpoints (already implemented)
- **Authentication**: Existing JWT-based auth system with role-based access
- **Real-time Updates**: React Query for caching and optimistic updates
- **State Management**: React Query + local component state for UI interactions

### Component Architecture

```
PermissionsPage (Main Container)
├── PermissionMatrix (Visual grid view)
├── RoleManagement (CRUD operations for roles)
├── UserPermissionAssignment (User-role assignments)
├── PermissionManagement (CRUD operations for permissions)
├── PermissionTemplates (Template management)
└── PermissionAuditTrail (Audit log viewer)
```

### Data Flow

1. **API Layer**: Custom hooks using React Query for data fetching
2. **Component Layer**: Lazy-loaded components with error boundaries
3. **State Layer**: Optimistic updates with rollback on failure
4. **UI Layer**: Consistent design system with loading states

## Components and Interfaces

### 1. Permission Matrix Component

**Purpose**: Visual grid showing roles vs permissions with assignment indicators

**Key Features**:
- Interactive grid with role rows and permission columns
- Visual indicators for granted/denied permissions
- Click-to-toggle permission assignments
- Filtering by permission category and role level
- Export functionality for documentation

**API Integration**:
- `GET /api/v1/permissions/matrix` - Fetch matrix data
- `POST /api/v1/roles/{role_id}/permissions/{permission_id}` - Assign permission
- `DELETE /api/v1/roles/{role_id}/permissions/{permission_id}` - Revoke permission

**UI Components**:
```typescript
interface PermissionMatrixProps {
  roles: Role[];
  permissions: Permission[];
  assignments: Record<string, string[]>;
  onTogglePermission: (roleId: string, permissionId: string) => void;
}
```

### 2. Role Management Component

**Purpose**: CRUD operations for system roles

**Key Features**:
- Role list with search and filtering
- Create/edit role modal with form validation
- Role hierarchy visualization
- Permission assignment interface
- Bulk operations for multiple roles

**API Integration**:
- `GET /api/v1/permissions/roles` - List roles
- `POST /api/v1/permissions/roles` - Create role
- `PUT /api/v1/permissions/roles/{id}` - Update role
- `DELETE /api/v1/permissions/roles/{id}` - Delete role

**UI Components**:
```typescript
interface RoleManagementProps {
  onRoleSelect?: (role: Role) => void;
  showPermissionAssignment?: boolean;
}

interface RoleFormProps {
  role?: Role;
  onSave: (roleData: RoleCreate | RoleUpdate) => void;
  onCancel: () => void;
}
```

### 3. User Permission Assignment Component

**Purpose**: Assign roles and direct permissions to users

**Key Features**:
- User search with autocomplete
- Current role/permission display
- Role assignment with scope selection
- Direct permission grants/denials
- Effective permission calculation

**API Integration**:
- `GET /api/v1/users` - Search users
- `POST /api/v1/users/{id}/roles` - Assign role
- `DELETE /api/v1/users/{id}/roles/{role_id}` - Revoke role
- `GET /api/v1/users/{id}/permissions` - Get user permissions

**UI Components**:
```typescript
interface UserPermissionAssignmentProps {
  selectedUser?: User;
  onUserSelect: (user: User) => void;
}

interface UserPermissionDisplayProps {
  user: User;
  roles: Role[];
  permissions: UserPermission[];
  onRoleAssign: (roleId: string) => void;
  onPermissionGrant: (permissionId: string) => void;
}
```

### 4. Permission Management Component

**Purpose**: CRUD operations for individual permissions

**Key Features**:
- Permission list with categorization
- Create/edit permission forms
- Resource type and action selection
- Scope level configuration
- System permission protection

**API Integration**:
- `GET /api/v1/permissions` - List permissions
- `POST /api/v1/permissions` - Create permission
- `PUT /api/v1/permissions/{id}` - Update permission
- `DELETE /api/v1/permissions/{id}` - Delete permission

**UI Components**:
```typescript
interface PermissionManagementProps {
  onPermissionSelect?: (permission: Permission) => void;
}

interface PermissionFormProps {
  permission?: Permission;
  onSave: (permissionData: PermissionCreate | PermissionUpdate) => void;
  onCancel: () => void;
}
```

### 5. Permission Templates Component

**Purpose**: Manage permission templates for quick role setup

**Key Features**:
- Template library with categories
- Template creation from existing roles
- Template preview and comparison
- Bulk template generation
- Template application to roles/users

**API Integration**:
- `GET /api/v1/permissions/templates` - List templates
- `POST /api/v1/permissions/templates` - Create template
- `POST /api/v1/permissions/templates/generate-from-roles` - Generate from roles
- `POST /api/v1/permissions/templates/{id}/apply/{type}/{target_id}` - Apply template

**UI Components**:
```typescript
interface PermissionTemplatesProps {
  onTemplateSelect?: (template: PermissionTemplate) => void;
}

interface TemplateGeneratorProps {
  sourceRoles: Role[];
  onGenerate: (config: TemplateGenerationRequest) => void;
}
```

### 6. Permission Audit Trail Component

**Purpose**: View and search permission change history

**Key Features**:
- Chronological audit log display
- Advanced filtering and search
- User action tracking
- Change detail visualization
- Export capabilities

**API Integration**:
- `GET /api/v1/permissions/audit` - Get audit trail with filters

**UI Components**:
```typescript
interface PermissionAuditTrailProps {
  filters?: AuditFilters;
  onFilterChange: (filters: AuditFilters) => void;
}

interface AuditEntryProps {
  entry: AuditEntry;
  showDetails?: boolean;
}
```

## Data Models

### Frontend Type Definitions

```typescript
// Core Types
interface Permission {
  id: string;
  name: string;
  description: string;
  resource_type: ResourceType;
  action: PermissionAction;
  scope: PermissionScope;
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
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

interface UserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  source: 'role' | 'direct';
  source_name?: string;
  granted: boolean;
  scope?: PermissionScope;
  created_at: string;
}

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  template_type: string;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
}

// Enums
enum ResourceType {
  SYSTEM = 'SYSTEM',
  USER = 'USER',
  APPLICATION = 'APPLICATION',
  DEPARTMENT = 'DEPARTMENT',
  BRANCH = 'BRANCH',
  FILE = 'FILE',
  ANALYTICS = 'ANALYTICS',
  NOTIFICATION = 'NOTIFICATION',
  AUDIT = 'AUDIT'
}

enum PermissionAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  MANAGE = 'MANAGE',
  VIEW_ALL = 'VIEW_ALL',
  ASSIGN = 'ASSIGN',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  EXPORT = 'EXPORT'
}

enum PermissionScope {
  OWN = 'OWN',
  DEPARTMENT = 'DEPARTMENT',
  BRANCH = 'BRANCH',
  GLOBAL = 'GLOBAL'
}
```

### API Response Types

```typescript
interface PermissionMatrixResponse {
  roles: PermissionMatrixRole[];
  permissions: PermissionMatrixPermission[];
  assignments: Record<string, string[]>;
}

interface AuditTrailResponse {
  items: AuditEntry[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
```

## Error Handling

### Error Boundary Strategy

1. **Component-Level Boundaries**: Each major component wrapped in error boundary
2. **Graceful Degradation**: Show partial UI when non-critical components fail
3. **User-Friendly Messages**: Convert technical errors to actionable messages
4. **Retry Mechanisms**: Automatic retry for network failures

### Error Types and Handling

```typescript
interface PermissionError {
  type: 'network' | 'authorization' | 'validation' | 'system';
  message: string;
  details?: any;
  retryable: boolean;
}

// Error handling patterns
const handlePermissionError = (error: PermissionError) => {
  switch (error.type) {
    case 'authorization':
      return 'You do not have permission to perform this action';
    case 'validation':
      return `Invalid data: ${error.message}`;
    case 'network':
      return 'Network error. Please check your connection and try again';
    default:
      return 'An unexpected error occurred. Please try again';
  }
};
```

## Testing Strategy

### Unit Testing

- **Component Testing**: React Testing Library for component behavior
- **Hook Testing**: Custom hook testing with mock API responses
- **Utility Testing**: Pure function testing for data transformations

### Integration Testing

- **API Integration**: Mock backend responses for component integration
- **User Flow Testing**: End-to-end user scenarios with Playwright
- **Permission Logic**: Test permission calculation and inheritance

### Performance Testing

- **Large Dataset Testing**: Test with 100+ roles and 200+ permissions
- **Render Performance**: Measure component render times
- **Memory Usage**: Monitor for memory leaks in long-running sessions

### Test Coverage Requirements

- **Components**: 90% coverage for critical permission logic
- **Hooks**: 95% coverage for API integration hooks
- **Utilities**: 100% coverage for permission calculation functions

## Security Considerations

### Frontend Security

1. **Input Validation**: Client-side validation with server-side verification
2. **XSS Prevention**: Sanitize all user inputs and API responses
3. **CSRF Protection**: Use existing CSRF tokens for state-changing operations
4. **Sensitive Data**: Never store sensitive permission data in localStorage

### Permission Checks

1. **Component-Level**: Check permissions before rendering sensitive components
2. **Action-Level**: Verify permissions before allowing user actions
3. **Real-Time**: Refresh permissions on role/permission changes
4. **Fallback**: Graceful degradation when permission checks fail

### Audit Trail

1. **User Actions**: Log all permission changes with user context
2. **IP Tracking**: Include IP addresses in audit logs
3. **Session Tracking**: Link actions to user sessions
4. **Data Integrity**: Ensure audit logs cannot be modified

## Performance Optimization

### Code Splitting

```typescript
// Lazy load heavy components
const PermissionMatrix = lazy(() => import('@/components/permissions/PermissionMatrix'));
const RoleManagement = lazy(() => import('@/components/permissions/RoleManagement'));
const UserPermissionAssignment = lazy(() => import('@/components/permissions/UserPermissionAssignment'));
```

### Data Optimization

1. **Pagination**: Implement pagination for large datasets
2. **Caching**: Use React Query for intelligent caching
3. **Optimistic Updates**: Update UI immediately, rollback on failure
4. **Debouncing**: Debounce search inputs to reduce API calls

### Rendering Optimization

1. **Virtualization**: Use virtual scrolling for large lists
2. **Memoization**: Memoize expensive calculations
3. **Selective Rendering**: Only re-render changed components
4. **Loading States**: Show skeletons during data loading

## Accessibility

### WCAG 2.1 AA Compliance

1. **Keyboard Navigation**: Full keyboard accessibility for all interactions
2. **Screen Reader Support**: Proper ARIA labels and descriptions
3. **Color Contrast**: Ensure sufficient contrast for all text and UI elements
4. **Focus Management**: Clear focus indicators and logical tab order

### Specific Accessibility Features

1. **Permission Matrix**: Screen reader announcements for permission changes
2. **Form Validation**: Clear error messages with ARIA live regions
3. **Modal Dialogs**: Proper focus trapping and escape key handling
4. **Data Tables**: Sortable headers with screen reader announcements

## Responsive Design

### Breakpoint Strategy

- **Mobile (320px-768px)**: Stacked layout with collapsible sections
- **Tablet (768px-1024px)**: Two-column layout with side navigation
- **Desktop (1024px+)**: Full multi-column layout with all features visible

### Mobile Adaptations

1. **Permission Matrix**: Horizontal scrolling with sticky headers
2. **Forms**: Single-column layout with larger touch targets
3. **Navigation**: Hamburger menu with slide-out navigation
4. **Tables**: Responsive tables with horizontal scroll

## Integration Points

### Existing System Integration

1. **Authentication**: Use existing JWT token system
2. **User Management**: Integrate with existing user endpoints
3. **Navigation**: Fit into existing admin navigation structure
4. **Styling**: Use existing Tailwind CSS design system

### API Endpoints Used

```typescript
// Permission Management
GET    /api/v1/permissions
POST   /api/v1/permissions
PUT    /api/v1/permissions/{id}
DELETE /api/v1/permissions/{id}

// Role Management
GET    /api/v1/permissions/roles
POST   /api/v1/permissions/roles
PUT    /api/v1/permissions/roles/{id}
DELETE /api/v1/permissions/roles/{id}

// User Assignments
GET    /api/v1/users/{id}/roles
POST   /api/v1/users/{id}/roles
DELETE /api/v1/users/{id}/roles/{role_id}
GET    /api/v1/users/{id}/permissions

// Permission Matrix
GET    /api/v1/permissions/matrix
POST   /api/v1/roles/{role_id}/permissions/{permission_id}
DELETE /api/v1/roles/{role_id}/permissions/{permission_id}

// Templates
GET    /api/v1/permissions/templates
POST   /api/v1/permissions/templates
POST   /api/v1/permissions/templates/generate-from-roles
POST   /api/v1/permissions/templates/{id}/apply/{type}/{target_id}

// Audit Trail
GET    /api/v1/permissions/audit
```

### State Management Integration

```typescript
// React Query keys for consistent caching
export const permissionKeys = {
  all: ['permissions'] as const,
  lists: () => [...permissionKeys.all, 'list'] as const,
  list: (filters: string) => [...permissionKeys.lists(), { filters }] as const,
  details: () => [...permissionKeys.all, 'detail'] as const,
  detail: (id: string) => [...permissionKeys.details(), id] as const,
  matrix: () => [...permissionKeys.all, 'matrix'] as const,
  audit: (filters: string) => [...permissionKeys.all, 'audit', { filters }] as const,
};
```

This design provides a comprehensive, scalable, and maintainable admin interface that fully leverages the existing backend permission system while providing an intuitive user experience for administrators.