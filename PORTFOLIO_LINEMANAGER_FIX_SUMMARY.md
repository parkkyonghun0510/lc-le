# Portfolio and Line Manager Relationship Fix

## Problem
The login endpoint was failing with error:
```
ORM mapped entity or attribute "User.department" does not link from relationship "User.portfolio"
```

## Root Cause
The `User` model has `portfolio` and `line_manager` relationships that reference the `employees` table (Employee model), not the `users` table. However, the code was incorrectly trying to:

1. **Backend selectinload**: Loading nested relationships as if they were User objects instead of Employee objects
2. **Backend serialization**: Converting Employee objects to UserSummary instead of EmployeeSummary
3. **Frontend types**: Defining portfolio and line_manager as User objects instead of Employee objects

## Changes Made

### Backend (le-backend/app/routers/auth.py)

1. **Import EmployeeSummary**:
   - Added `EmployeeSummary` to imports from `app.schemas`

2. **Fixed selectinload statements** (3 locations):
   - Changed from: `selectinload(User.portfolio).options(selectinload(User.department), ...)`
   - Changed to: `selectinload(User.portfolio).options(selectinload(Employee.department), ...)`
   - Applied to: `get_user_by_username()`, `get_current_user()`, and `login()` endpoint

3. **Fixed serialization in create_safe_user_response()**:
   - Changed from converting to `UserSummary` with fields: `username`, `first_name`, `last_name`, `email`, `role`, `status`, `employee_id`
   - Changed to converting to `EmployeeSummary` with fields: `employee_code`, `full_name_khmer`, `full_name_latin`, `position`, `is_active`
   - Applied to both the main conversion logic and the fallback error handling

### Backend (le-backend/app/routers/users.py)

1. **Import EmployeeSummary**:
   - Added `EmployeeSummary` to imports from `app.schemas`

2. **Fixed portfolio/line_manager serialization** (4 locations):
   - `get_user()` endpoint: Convert Employee objects to EmployeeSummary
   - `create_user()` endpoint: Convert Employee objects to EmployeeSummary
   - `update_user()` endpoint: Convert Employee objects to EmployeeSummary
   - `put_me()` endpoint: Convert Employee objects to EmployeeSummary
   - Removed incorrect User field access (username, first_name, last_name, email, role, status, etc.)
   - Added correct Employee field access (employee_code, full_name_khmer, full_name_latin, position, is_active)

### Frontend (lc-workflow-frontend/src/types/models.ts)

1. **Added EmployeeSummary interface**:
   ```typescript
   export interface EmployeeSummary {
     id: string;
     employee_code: string;
     full_name_khmer: string;
     full_name_latin: string;
     position?: string;
     is_active: boolean;
   }
   ```

2. **Updated User interface**:
   - Changed `portfolio?: User | null` to `portfolio?: EmployeeSummary | null`
   - Changed `line_manager?: User | null` to `line_manager?: EmployeeSummary | null`

### Frontend Components

1. **UserList.tsx**:
   - Changed from: `{user.portfolio.first_name} {user.portfolio.last_name}`
   - Changed to: `{user.portfolio.full_name_latin}`
   - Applied to both portfolio and line_manager displays

2. **UserCard.tsx**:
   - Changed from: `{user.portfolio.first_name} {user.portfolio.last_name}`
   - Changed to: `{user.portfolio.full_name_latin}`
   - Applied to both portfolio and line_manager displays

3. **UserManagerBadge.tsx**:
   - Updated interface to accept both User and Employee fields
   - Added logic to detect if manager is Employee (has `employee_code`) or User (has `username`)
   - Display name: Uses `full_name_latin` for employees, `first_name + last_name` for users
   - Display code: Shows `Code: {employee_code}` for employees, `@{username}` for users
   - Maintains backward compatibility with existing User-based managers

### Frontend Forms

1. **app/users/[id]/edit/page.tsx** (Edit User):
   - Changed from: `useUsers()` hook to `useEmployees()` hook
   - Changed from: `getFilteredManagers()` to `getFilteredEmployees()`
   - Updated dropdown options to show: `{employee.full_name_latin} ({employee.employee_code})`
   - Removed role filtering (manager/admin) since all active employees can be managers
   - Filter by branch and active status only

2. **app/users/new/page.tsx** (Create User):
   - Changed from: `useUsers()` hook to `useEmployees()` hook
   - Changed from: `getFilteredManagers()` to `getFilteredEmployees()`
   - Updated dropdown options to show: `{employee.full_name_latin} ({employee.employee_code})`
   - Removed role filtering (manager/admin) since all active employees can be managers
   - Filter by branch and active status only

## Schema Alignment

The backend schema (`le-backend/app/schemas.py`) already correctly defined:
```python
class UserResponse(UserBase):
    # ...
    portfolio: Optional['EmployeeSummary'] = None
    line_manager: Optional['EmployeeSummary'] = None
```

The issue was that the auth.py code wasn't following this schema definition.

## Testing
- Backend login endpoint now works without errors
- Frontend types are aligned with backend response structure
- Components display employee names correctly using `full_name_latin`
- User detail page displays portfolio and line manager information correctly
- User edit/create forms show employee dropdowns with proper filtering
- UserManagerBadge component handles both Employee and User types for backward compatibility

## Notes
- Employee objects have `full_name_khmer` and `full_name_latin` instead of `first_name` and `last_name`
- Employee objects have `employee_code` instead of `username`
- This change reflects the actual database structure where portfolio and line manager are employees, not users
