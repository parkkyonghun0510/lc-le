# Design Document

## Overview

The Permission Management System provides a comprehensive frontend UI for managing the existing backend RBAC system. The system enables administrators to manage permissions, roles, and user access through an intuitive interface that integrates seamlessly with the existing LC Workflow application.

### Design Goals

1. **Intuitive Interface**: Provide a user-friendly interface for complex permission management
2. **Performance**: Handle large datasets (1000+ permissions, 100+ users) efficiently
3. **Security**: Ensure all permission checks are validated on the backend
4. **Accessibility**: Meet WCAG 2.1 AA standards for all users
5. **Integration**: Seamlessly integrate with existing workflow system

### Technology Stack

- **Frontend Framework**: Next.js 14 with App Router
- **UI Components**: React with TypeScript
- **State Management**: React hooks and context
- **Styling**: Tailwind CSS with existing theme system
- **Forms**: react-hook-form with validation
- **API Client**: Axios with TypeScript types
- **Data Tables**: Custom table components with sorting/filtering

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Permission  │  │     Role     │  │     User     │  │
│  │     Pages    │  │    Pages     │  │  Permission  │  │
│  │              │  │              │  │    Pages     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                  │                  │          │
│         └──────────────────┴──────────────────┘          │
│                           │                              │
│  ┌────────────────────────▼──────────────────────────┐  │
│  │           Component Layer                         │  │
│  │  - PermissionTable    - RolePermissionSelector   │  │
│  │  - PermissionForm     - PermissionMatrix         │  │
│  │  - RoleForm           - UserPermissionManager    │  │
│  └───────────────────────────────────────────────────┘  │
│                           │                              │
│  ┌────────────────────────▼──────────────────────────┐  │
│  │              Hook Layer                           │  │
│  │  - usePermissions     - useUserPermissions       │  │
│  │  - useRoles           - usePermissionCheck       │  │
│  └───────────────────────────────────────────────────┘  │
│                           │                              │
│  ┌────────────────────────▼──────────────────────────┐  │
│  │            API Client Layer                       │  │
│  │  - permissionsApi     - userPermissionsApi       │  │
│  │  - rolesApi           - matrixApi                │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           │ HTTP/REST
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend Layer                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Permission Service                       │   │
│  │  - Permission checking  - Role management       │   │
│  │  - User permissions     - Template management   │   │
│  └──────────────────────────────────────────────────┘   │
│                           │                              │
│  ┌────────────────────────▼──────────────────────────┐  │
│  │              Database Layer                       │  │
│  │  - permissions        - user_roles               │  │
│  │  - roles              - user_permissions         │  │
│  │  - role_permissions   - permission_templates     │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```


### Directory Structure

```
lc-workflow-frontend/
├── app/
│   └── admin/
│       └── permissions/
│           ├── page.tsx                    # Permission list page
│           ├── new/
│           │   └── page.tsx               # Create permission page
│           ├── [id]/
│           │   └── edit/
│           │       └── page.tsx           # Edit permission page
│           ├── roles/
│           │   ├── page.tsx               # Role list page
│           │   ├── new/
│           │   │   └── page.tsx           # Create role page
│           │   └── [id]/
│           │       ├── page.tsx           # Role detail page
│           │       └── edit/
│           │           └── page.tsx       # Edit role page
│           ├── users/
│           │   └── [id]/
│           │       └── page.tsx           # User permission management
│           └── matrix/
│               └── page.tsx               # Permission matrix view
├── src/
│   ├── components/
│   │   └── permissions/
│   │       ├── PermissionTable.tsx        # Permission list table
│   │       ├── PermissionForm.tsx         # Permission create/edit form
│   │       ├── RoleTable.tsx              # Role list table
│   │       ├── RoleForm.tsx               # Role create/edit form
│   │       ├── RolePermissionSelector.tsx # Permission selector for roles
│   │       ├── UserPermissionManager.tsx  # User permission management
│   │       ├── PermissionMatrix.tsx       # Matrix visualization
│   │       └── PermissionBadge.tsx        # Permission display badge
│   ├── hooks/
│   │   └── permissions/
│   │       ├── usePermissions.ts          # Permission CRUD operations
│   │       ├── useRoles.ts                # Role CRUD operations
│   │       ├── useUserPermissions.ts      # User permission operations
│   │       ├── usePermissionCheck.ts      # Permission checking hook
│   │       └── usePermissionMatrix.ts     # Matrix data management
│   ├── lib/
│   │   └── api/
│   │       └── permissions.ts             # API client functions
│   └── types/
│       └── permissions.ts                 # TypeScript type definitions
```

## Components and Interfaces

### 1. Permission Management Components

#### 1.1 PermissionTable Component

**Purpose**: Display a sortable, filterable table of permissions with bulk actions.

**Props Interface**:
```typescript
interface PermissionTableProps {
  permissions: Permission[];
  loading?: boolean;
  onEdit: (permission: Permission) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onBulkAction: (action: BulkAction, ids: string[]) => void;
}
```

**Features**:
- Column sorting (name, resource type, action, scope, created date)
- Multi-select with checkboxes
- Inline actions (edit, delete, toggle active)
- Bulk action toolbar (activate, deactivate, delete)
- Search and filter controls
- Pagination (50 items per page)
- Loading states and skeletons
- Empty state with create button

**State Management**:
- Selected rows tracked in local state
- Sort and filter state in URL query parameters
- Optimistic updates for toggle actions


#### 1.2 PermissionForm Component

**Purpose**: Create and edit permissions with validation.

**Props Interface**:
```typescript
interface PermissionFormProps {
  permission?: Permission;
  onSubmit: (data: PermissionFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface PermissionFormData {
  name: string;
  description: string;
  resource_type: ResourceType;
  action: PermissionAction;
  scope: PermissionScope;
  conditions?: Record<string, any>;
  is_active: boolean;
}
```

**Validation Rules**:
- Name: 3-100 characters, alphanumeric + underscore, unique
- Description: Max 500 characters
- Resource type, action, scope: Required enum values
- Conditions: Valid JSON object

**Features**:
- Auto-save draft to localStorage every 30 seconds
- Restore draft on return
- Confirmation dialog on cancel with unsaved changes
- Real-time validation feedback
- JSON editor for conditions field

#### 1.3 RoleTable Component

**Purpose**: Display roles with member and permission counts.

**Props Interface**:
```typescript
interface RoleTableProps {
  roles: Role[];
  loading?: boolean;
  onEdit: (role: Role) => void;
  onDelete: (id: string) => void;
  onViewMembers: (role: Role) => void;
  onManagePermissions: (role: Role) => void;
}
```

**Columns**:
- Name, Description, Members Count, Permissions Count, Active Status, Created Date, Actions

#### 1.4 RoleForm Component

**Purpose**: Create and edit roles with permission assignment.

**Sections**:
1. Basic Information (name, description, active status)
2. Permission Assignment (searchable, grouped by resource type)
3. Members (edit mode only - current members list)

#### 1.5 RolePermissionSelector Component

**Purpose**: Select permissions for a role with grouping and search.

**Props Interface**:
```typescript
interface RolePermissionSelectorProps {
  selectedPermissions: string[];
  onSelectionChange: (permissionIds: string[]) => void;
  disabled?: boolean;
}
```

**Features**:
- Group permissions by resource type
- Search/filter by name or action
- Select all/none by group
- Visual indicators for selected items
- Permission count badge

#### 1.6 UserPermissionManager Component

**Purpose**: Manage user roles and direct permissions.

**Sections**:
1. User Information (name, email, department, branch)
2. Role Assignments (add/remove roles)
3. Direct Permissions (grant/revoke specific permissions)
4. Effective Permissions (calculated view with source indication)

#### 1.7 PermissionMatrix Component

**Purpose**: Visualize user-permission relationships in a matrix.

**Props Interface**:
```typescript
interface PermissionMatrixProps {
  users: User[];
  permissions: Permission[];
  matrix: Record<string, Record<string, boolean>>;
  onTogglePermission: (userId: string, permissionId: string) => void;
  filters: MatrixFilters;
  onFiltersChange: (filters: MatrixFilters) => void;
}
```

**Features**:
- Virtual scrolling for performance (react-window)
- Sticky headers (users and permissions)
- Color-coded cells (green=granted, red=denied, gray=none)
- Click to toggle permissions
- Hover tooltips with details
- Export to CSV functionality
- Filter by department, branch, resource type, scope

### 2. Hook Specifications

#### 2.1 usePermissions Hook

**Purpose**: Manage permission CRUD operations and state.

```typescript
interface UsePermissionsOptions {
  filters?: PermissionFilters;
  page?: number;
  size?: number;
}

interface UsePermissionsReturn {
  permissions: Permission[];
  total: number;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  createPermission: (data: CreatePermissionRequest) => Promise<Permission>;
  updatePermission: (id: string, data: UpdatePermissionRequest) => Promise<Permission>;
  deletePermission: (id: string) => Promise<void>;
  togglePermission: (id: string, active: boolean) => Promise<Permission>;
}
```

**Implementation Details**:
- Uses React Query for caching and automatic refetching
- Optimistic updates for toggle operations
- Error handling with toast notifications
- Automatic retry on network failures (max 3 attempts)

#### 2.2 useRoles Hook

**Purpose**: Manage role CRUD operations and assignments.

```typescript
interface UseRolesReturn {
  roles: Role[];
  total: number;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  createRole: (data: CreateRoleRequest) => Promise<Role>;
  updateRole: (id: string, data: UpdateRoleRequest) => Promise<Role>;
  deleteRole: (id: string) => Promise<void>;
  assignRole: (roleId: string, userId: string) => Promise<void>;
  revokeRole: (roleId: string, userId: string) => Promise<void>;
}
```

#### 2.3 useUserPermissions Hook

**Purpose**: Manage user-specific permissions and roles.

```typescript
interface UseUserPermissionsReturn {
  userPermissions: UserPermissionsResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  grantPermission: (userId: string, permissionId: string) => Promise<void>;
  revokePermission: (userId: string, permissionId: string) => Promise<void>;
  assignRole: (userId: string, roleId: string) => Promise<void>;
  revokeRole: (userId: string, roleId: string) => Promise<void>;
}
```

#### 2.4 usePermissionCheck Hook

**Purpose**: Check current user's permissions for UI rendering.

```typescript
interface UsePermissionCheckReturn {
  can: (resource: ResourceType, action: PermissionAction, scope?: PermissionScope) => boolean;
  hasRole: (roleName: string) => boolean;
  hasPermission: (permissionName: string) => boolean;
  loading: boolean;
  user: User | null;
}

// Usage example:
const { can, hasRole } = usePermissionCheck();

if (can('application', 'create')) {
  // Show create button
}
```

**Implementation**:
- Fetches current user's permissions on mount
- Caches results for 5 minutes
- Invalidates cache on permission changes
- Provides loading state to prevent premature decisions

#### 2.5 usePermissionMatrix Hook

**Purpose**: Manage matrix data with filtering and export.

```typescript
interface UsePermissionMatrixReturn {
  users: User[];
  permissions: Permission[];
  matrix: Record<string, Record<string, boolean>>;
  loading: boolean;
  filters: MatrixFilters;
  setFilters: (filters: MatrixFilters) => void;
  exportToCSV: () => void;
  togglePermission: (userId: string, permissionId: string) => Promise<void>;
}
```

### 3. API Client Layer

#### 3.1 API Client Structure

```typescript
// src/lib/api/permissions.ts

export const permissionsApi = {
  // Permission CRUD
  list: (params: ListPermissionsParams) => Promise<ListPermissionsResponse>,
  get: (id: string) => Promise<Permission>,
  create: (data: CreatePermissionRequest) => Promise<Permission>,
  update: (id: string, data: UpdatePermissionRequest) => Promise<Permission>,
  delete: (id: string) => Promise<void>,
  
  // Role CRUD
  listRoles: (params: ListRolesParams) => Promise<ListRolesResponse>,
  getRole: (id: string) => Promise<Role>,
  createRole: (data: CreateRoleRequest) => Promise<Role>,
  updateRole: (id: string, data: UpdateRoleRequest) => Promise<Role>,
  deleteRole: (id: string) => Promise<void>,
  
  // Role-Permission Management
  assignPermissionToRole: (roleId: string, permissionId: string) => Promise<void>,
  revokePermissionFromRole: (roleId: string, permissionId: string) => Promise<void>,
  
  // User-Role Management
  assignRoleToUser: (userId: string, data: RoleAssignmentCreate) => Promise<void>,
  revokeRoleFromUser: (userId: string, roleId: string) => Promise<void>,
  getUserRoles: (userId: string) => Promise<Role[]>,
  
  // User-Permission Management
  grantPermissionToUser: (userId: string, data: UserPermissionCreate) => Promise<void>,
  getUserPermissions: (userId: string) => Promise<UserPermissionResponse[]>,
  
  // Matrix
  getPermissionMatrix: () => Promise<PermissionMatrixResponse>,
  
  // Bulk Operations
  bulkAssignRoles: (data: BulkRoleAssignment) => Promise<BulkOperationResult>,
};
```

**Error Handling**:
- Standardized error responses
- Automatic retry for 5xx errors
- Toast notifications for user-facing errors
- Detailed logging for debugging

**Request Interceptors**:
- Add authentication token
- Add request ID for tracing
- Log request details in development

**Response Interceptors**:
- Handle 401 (redirect to login)
- Handle 403 (show permission denied message)
- Handle 429 (rate limit - show retry message)
- Transform response data to match TypeScript types

### 4. Data Models

#### 4.1 TypeScript Type Definitions

```typescript
// src/types/permissions.ts

export enum ResourceType {
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

export enum PermissionAction {
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
  VIEW_ALL = 'view_all',
  VIEW_OWN = 'view_own',
  VIEW_TEAM = 'view_team',
  VIEW_DEPARTMENT = 'view_department',
  VIEW_BRANCH = 'view_branch',
}

export enum PermissionScope {
  GLOBAL = 'global',
  DEPARTMENT = 'department',
  BRANCH = 'branch',
  TEAM = 'team',
  OWN = 'own',
}

export interface Permission {
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

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  level: number;
  parent_role_id?: string;
  is_system_role: boolean;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  permissions?: Permission[];
  member_count?: number;
}

export interface UserPermissionResponse {
  user_id: string;
  roles: Role[];
  direct_permissions: Permission[];
  effective_permissions: EffectivePermission[];
}

export interface EffectivePermission {
  permission: Permission;
  source: 'role' | 'direct';
  role_name?: string;
  is_granted: boolean;
}
```

## Error Handling

### Error Types

1. **Validation Errors** (400)
   - Display field-specific errors in forms
   - Highlight invalid fields
   - Show error messages below fields

2. **Authentication Errors** (401)
   - Redirect to login page
   - Clear cached user data
   - Show session expired message

3. **Authorization Errors** (403)
   - Show permission denied modal
   - Suggest contacting administrator
   - Log attempt for audit

4. **Not Found Errors** (404)
   - Show friendly "not found" message
   - Provide navigation back to list
   - Suggest search or create new

5. **Rate Limit Errors** (429)
   - Show "too many requests" message
   - Display retry countdown
   - Automatically retry after delay

6. **Server Errors** (500)
   - Show generic error message
   - Provide retry button
   - Log error details for support

### Error Recovery Strategies

- **Optimistic Updates**: Revert on failure with notification
- **Automatic Retry**: Retry failed requests up to 3 times with exponential backoff
- **Offline Support**: Queue mutations when offline, sync when online
- **Error Boundaries**: Catch React errors and show fallback UI

## Testing Strategy

### Unit Tests

**Components**:
- PermissionTable: Rendering, sorting, filtering, selection
- PermissionForm: Validation, submission, draft saving
- RoleForm: Permission selection, member management
- PermissionMatrix: Cell rendering, filtering, export

**Hooks**:
- usePermissions: CRUD operations, caching, error handling
- useRoles: Role management, assignments
- usePermissionCheck: Permission checking logic

**API Client**:
- Request formatting
- Response parsing
- Error handling
- Retry logic

### Integration Tests

- Permission creation flow (form → API → list update)
- Role assignment flow (select role → assign → user permissions update)
- Matrix interaction (click cell → API call → matrix update)
- Bulk operations (select multiple → action → results)

### E2E Tests (Playwright)

1. **Permission Management Flow**
   - Login as admin
   - Navigate to permissions page
   - Create new permission
   - Edit permission
   - Delete permission

2. **Role Management Flow**
   - Create role with permissions
   - Assign role to user
   - Verify user has permissions
   - Revoke role
   - Verify permissions removed

3. **User Permission Management Flow**
   - Navigate to user permissions page
   - Assign role to user
   - Grant direct permission
   - Verify effective permissions
   - Revoke permissions

4. **Matrix View Flow**
   - Open matrix view
   - Apply filters
   - Toggle permissions
   - Export to CSV
   - Verify export contents

### Performance Tests

- Load 1000+ permissions in <2s
- Matrix with 100 users × 200 permissions in <3s
- Search results in <500ms
- Form submission in <1s
- Bulk operations (50 items) in <5s

## Security Considerations

### Frontend Security

1. **Input Validation**
   - Sanitize all user inputs
   - Validate on client and server
   - Prevent XSS attacks

2. **Authentication**
   - Store tokens securely (httpOnly cookies)
   - Refresh tokens before expiry
   - Clear tokens on logout

3. **Authorization**
   - Check permissions before rendering UI
   - Validate all actions on backend
   - Never trust client-side checks alone

4. **Data Protection**
   - Don't store sensitive data in localStorage
   - Encrypt sensitive data in transit (HTTPS)
   - Minimize data exposure in API responses

### Backend Validation

- All permission checks validated on backend
- Rate limiting on all endpoints
- Audit trail for all permission changes
- SQL injection prevention (parameterized queries)
- CSRF protection

## Performance Optimization

### Frontend Optimizations

1. **Code Splitting**
   - Lazy load permission pages
   - Dynamic imports for heavy components
   - Separate bundles for admin features

2. **Data Fetching**
   - React Query for caching
   - Prefetch on hover
   - Stale-while-revalidate strategy
   - Pagination for large lists

3. **Rendering**
   - Virtual scrolling for matrix (react-window)
   - Memoization for expensive calculations
   - Debounced search inputs
   - Optimistic updates

4. **Bundle Size**
   - Tree shaking unused code
   - Minimize dependencies
   - Compress images and assets
   - Use production builds

### Backend Optimizations

- Database indexing on frequently queried fields
- Query optimization with proper joins
- Caching frequently accessed data (Redis)
- Connection pooling
- Async operations where possible

## Accessibility

### WCAG 2.1 AA Compliance

1. **Keyboard Navigation**
   - All interactive elements keyboard accessible
   - Logical tab order
   - Skip links for main content
   - Keyboard shortcuts documented

2. **Screen Reader Support**
   - Semantic HTML elements
   - ARIA labels and descriptions
   - Live regions for dynamic content
   - Alt text for images

3. **Visual Design**
   - Sufficient color contrast (4.5:1 minimum)
   - Focus indicators visible
   - Text resizable up to 200%
   - No information conveyed by color alone

4. **Forms**
   - Clear labels for all inputs
   - Error messages associated with fields
   - Required fields indicated
   - Help text provided

## Deployment Strategy

### Phased Rollout

**Phase 1: Internal Testing** (Week 1)
- Deploy to staging environment
- Internal team testing
- Bug fixes and refinements

**Phase 2: Beta Release** (Week 2)
- Limited rollout to admin users
- Gather feedback
- Monitor performance and errors

**Phase 3: Full Release** (Week 3)
- Deploy to production
- Monitor closely for issues
- Provide user training and documentation

**Phase 4: Optimization** (Week 4)
- Performance tuning based on real usage
- Address user feedback
- Implement additional features

### Monitoring

- Error tracking (Sentry or similar)
- Performance monitoring (response times, load times)
- User analytics (feature usage, common workflows)
- API metrics (request counts, error rates)

## Success Metrics

### Functional Metrics
- 100% of permissions manageable through UI
- 0 hardcoded role checks remaining
- <2s average page load time
- 99.9% API uptime

### User Metrics
- Admin task completion time reduced by 80%
- User onboarding time reduced by 60%
- Permission-related support tickets reduced by 90%
- User satisfaction score >4.5/5

### Technical Metrics
- <100ms permission check response time
- <5% error rate on API calls
- 100% test coverage for critical paths
- 0 critical security vulnerabilities

## Future Enhancements

1. **Advanced Features**
   - Permission templates for common roles
   - Bulk import/export of permissions
   - Permission inheritance visualization
   - Time-based permission grants

2. **Analytics**
   - Permission usage analytics
   - Access pattern analysis
   - Anomaly detection
   - Compliance reporting

3. **Integration**
   - SSO integration
   - LDAP/Active Directory sync
   - Webhook notifications
   - API for external systems

4. **User Experience**
   - Guided setup wizard
   - Interactive tutorials
   - Contextual help
   - Mobile-responsive design improvements
