# Permission System Audit - Backend vs Frontend

## Summary
The backend has a **comprehensive RBAC (Role-Based Access Control) system** with permissions, roles, and templates. The frontend has **basic role checks** but no UI for managing the permission system.

## Backend Permission System ✅

### 1. Database Models
**File**: `le-backend/app/models/permissions.py`

**Tables**:
- `permissions` - Individual permissions
- `roles` - User roles
- `role_permissions` - Many-to-many: roles ↔ permissions
- `user_roles` - Many-to-many: users ↔ roles
- `user_permissions` - Direct user permissions (overrides)
- `permission_templates` - Reusable permission sets

**Enums**:
```python
class ResourceType(Enum):
    SYSTEM = "system"
    APPLICATION = "application"
    USER = "user"
    DEPARTMENT = "department"
    # ... more

class PermissionAction(Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    VIEW_ALL = "view_all"
    # ... more

class PermissionScope(Enum):
    OWN = "own"           # Own resources only
    DEPARTMENT = "department"  # Department resources
    BRANCH = "branch"     # Branch resources
    ALL = "all"           # All resources
```

### 2. API Endpoints
**File**: `le-backend/app/routers/permissions.py`

**Available Endpoints**:
```
GET    /api/v1/permissions/              # List all permissions
POST   /api/v1/permissions/              # Create permission
GET    /api/v1/permissions/{id}          # Get permission
PUT    /api/v1/permissions/{id}          # Update permission
DELETE /api/v1/permissions/{id}          # Delete permission

GET    /api/v1/permissions/roles/        # List all roles
POST   /api/v1/permissions/roles/        # Create role
GET    /api/v1/permissions/roles/{id}    # Get role
PUT    /api/v1/permissions/roles/{id}    # Update role
DELETE /api/v1/permissions/roles/{id}    # Delete role

POST   /api/v1/permissions/roles/{id}/assign      # Assign role to user
DELETE /api/v1/permissions/roles/{id}/revoke      # Revoke role from user
GET    /api/v1/permissions/users/{id}/permissions # Get user permissions
POST   /api/v1/permissions/users/{id}/grant       # Grant permission to user
DELETE /api/v1/permissions/users/{id}/revoke      # Revoke permission from user

GET    /api/v1/permissions/templates/    # List templates
POST   /api/v1/permissions/templates/    # Create template
GET    /api/v1/permissions/matrix/       # Get permission matrix
```

### 3. Permission Service
**File**: `le-backend/app/services/permission_service.py`

**Features**:
- Permission checking
- Role management
- Template generation
- Bulk operations
- Permission inheritance
- Scope-based filtering

### 4. Current Usage in Backend
**Scattered role checks** throughout routers:
```python
# Example from departments.py
if current_user.role not in ["admin", "manager"]:
    raise HTTPException(status_code=403, detail="Forbidden")

# Example from customers.py
if current_user.role == "officer":
    # Officers only see their own applications
    query = query.where(CustomerApplication.user_id == current_user.id)
elif current_user.role == "manager":
    # Managers see department applications
    query = query.where(User.department_id == current_user.department_id)
```

## Frontend Permission System ⚠️

### 1. Current Implementation
**Files**:
- `lc-workflow-frontend/src/config/permissions.ts` - Position-based config ✅ NEW
- `lc-workflow-frontend/src/hooks/useWorkflowPermissions.ts` - Permission hook ✅ NEW
- Scattered role checks in components ⚠️ OLD

**Current Checks**:
```typescript
// Simple role checks
if (user?.role === 'admin') { ... }
if (user?.role === 'manager' || user?.role === 'admin') { ... }
if (user?.role === 'officer') { ... }
```

### 2. Missing UI Components ❌

**No UI for**:
- ❌ Viewing permissions
- ❌ Creating/editing permissions
- ❌ Managing roles
- ❌ Assigning roles to users
- ❌ Viewing permission matrix
- ❌ Managing permission templates
- ❌ Bulk role assignments

## Gap Analysis

### What Backend Has But Frontend Doesn't

| Feature | Backend | Frontend | Gap |
|---------|---------|----------|-----|
| **Permission CRUD** | ✅ Full API | ❌ No UI | Need admin UI |
| **Role Management** | ✅ Full API | ❌ No UI | Need admin UI |
| **Role Assignment** | ✅ Full API | ❌ No UI | Need admin UI |
| **Permission Templates** | ✅ Full API | ❌ No UI | Need admin UI |
| **Permission Matrix** | ✅ Full API | ❌ No UI | Need admin UI |
| **Scope-Based Access** | ✅ Implemented | ⚠️ Partial | Need enhancement |
| **Resource-Based Permissions** | ✅ Implemented | ❌ Not used | Need integration |

### What Frontend Has But Backend Doesn't

| Feature | Frontend | Backend | Gap |
|---------|----------|---------|-----|
| **Position-Based Permissions** | ✅ Config file | ❌ Not integrated | Need backend integration |
| **Workflow Action Permissions** | ✅ Defined | ⚠️ Partial | Need full integration |

## Recommended Implementation Plan

### Phase 1: Admin Permission Management UI (High Priority)

#### 1.1 Permission List Page
**Route**: `/admin/permissions`
**Features**:
- List all permissions with filters
- Search by name, resource type, action
- Filter by scope, active status
- Pagination

#### 1.2 Permission Create/Edit Form
**Features**:
- Name, description fields
- Resource type dropdown
- Action dropdown
- Scope dropdown
- Active toggle
- Conditions JSON editor (advanced)

#### 1.3 Role Management Page
**Route**: `/admin/roles`
**Features**:
- List all roles
- Create/edit roles
- Assign permissions to roles
- View role members
- Bulk operations

#### 1.4 User Permission Assignment
**Route**: `/admin/users/{id}/permissions`
**Features**:
- View user's roles
- View user's direct permissions
- Assign/revoke roles
- Grant/revoke permissions
- Permission inheritance view

#### 1.5 Permission Matrix View
**Route**: `/admin/permissions/matrix`
**Features**:
- Visual matrix: users × permissions
- Color-coded access levels
- Quick assign/revoke
- Export to CSV

### Phase 2: Integration with Existing System (Medium Priority)

#### 2.1 Replace Hardcoded Role Checks
**Current**:
```typescript
if (user?.role === 'admin') { ... }
```

**Replace with**:
```typescript
const { can } = usePermissions();
if (can('system', 'manage_users')) { ... }
```

#### 2.2 Integrate Position Permissions
- Sync frontend position config with backend
- Use backend permission API
- Remove hardcoded position IDs

#### 2.3 Add Permission Checks to All Actions
- Application creation
- Application editing
- Workflow transitions
- Document uploads
- User management
- Department management

### Phase 3: Advanced Features (Low Priority)

#### 3.1 Permission Templates
- Create templates from existing roles
- Apply templates to users
- Template marketplace

#### 3.2 Audit Trail
- Log all permission changes
- View permission history
- Compliance reports

#### 3.3 Conditional Permissions
- Time-based permissions
- Location-based permissions
- Context-based permissions

## Immediate Action Items

### 1. Create Permission Management UI
**Priority**: HIGH
**Effort**: 2-3 days
**Files to Create**:
```
lc-workflow-frontend/app/admin/permissions/
├── page.tsx                    # Permission list
├── new/page.tsx               # Create permission
├── [id]/edit/page.tsx         # Edit permission
└── components/
    ├── PermissionList.tsx
    ├── PermissionForm.tsx
    └── PermissionFilters.tsx

lc-workflow-frontend/app/admin/roles/
├── page.tsx                    # Role list
├── new/page.tsx               # Create role
├── [id]/edit/page.tsx         # Edit role
└── components/
    ├── RoleList.tsx
    ├── RoleForm.tsx
    ├── RolePermissions.tsx
    └── RoleMembers.tsx
```

### 2. Create Permission Hooks
**Priority**: HIGH
**Effort**: 1 day
**Files to Create**:
```
lc-workflow-frontend/src/hooks/
├── usePermissions.ts          # Main permission hook
├── useRoles.ts                # Role management hook
└── usePermissionMatrix.ts     # Matrix view hook
```

### 3. Update Navigation
**Priority**: MEDIUM
**Effort**: 1 hour
**Add to Admin Menu**:
- Permissions
- Roles
- Permission Matrix

### 4. Create API Client Functions
**Priority**: HIGH
**Effort**: 1 day
**File**: `lc-workflow-frontend/src/lib/api/permissions.ts`
```typescript
export const permissionsApi = {
  list: (filters) => apiClient.get('/permissions', { params: filters }),
  create: (data) => apiClient.post('/permissions', data),
  update: (id, data) => apiClient.put(`/permissions/${id}`, data),
  delete: (id) => apiClient.delete(`/permissions/${id}`),
  
  listRoles: () => apiClient.get('/permissions/roles'),
  createRole: (data) => apiClient.post('/permissions/roles', data),
  assignRole: (roleId, userId) => apiClient.post(`/permissions/roles/${roleId}/assign`, { user_id: userId }),
  
  getMatrix: () => apiClient.get('/permissions/matrix'),
};
```

## Security Considerations

### Backend ✅
- Permission checks on all endpoints
- Role-based access control
- Scope-based filtering
- Audit logging

### Frontend ⚠️
- UI-only permission checks (not security)
- Need backend validation
- Add loading states
- Handle permission errors gracefully

## Summary

**Backend**: ✅ Comprehensive RBAC system with full API
**Frontend**: ⚠️ Basic role checks, no management UI

**Immediate Need**: Build admin UI for permission management

**Estimated Effort**:
- Phase 1 (Admin UI): 3-5 days
- Phase 2 (Integration): 2-3 days
- Phase 3 (Advanced): 5-7 days

**Total**: 10-15 days for complete implementation

**Priority Order**:
1. Permission/Role management UI (Admin only)
2. Replace hardcoded role checks with permission API
3. Integrate position-based permissions
4. Add advanced features (templates, audit, etc.)
