# Management Structure Migration Complete

## Summary
Successfully migrated the management structure from User-based to Employee-based references. This change makes organizational management more logical by separating system access (Users) from organizational structure (Employees).

## Changes Made

### 1. Database Migration
**File**: `le-backend/migrations/versions/20251016_change_managers_to_employees.py`

- Dropped existing foreign key constraints for `portfolio_id` and `line_manager_id` in users table
- Cleared invalid data that referenced users instead of employees
- Created new foreign key constraints pointing to the employees table
- Added proper downgrade path for rollback capability

### 2. Model Updates
**File**: `le-backend/app/models.py`

#### User Model
- Changed `line_manager_id` foreign key from `users.id` to `employees.id`
- Updated `line_manager` relationship to reference `Employee` instead of `User`

#### Department Model
- Changed `manager_id` foreign key from `users.id` to `employees.id`
- Updated `manager` relationship to reference `Employee` instead of `User`

#### Branch Model
- Changed `manager_id` foreign key from `users.id` to `employees.id`
- Updated `manager` relationship to reference `Employee` instead of `User`

#### Employee Model
- Added management relationships:
  - `managed_departments`: Departments managed by this employee
  - `managed_branches`: Branches managed by this employee
  - `direct_reports`: Users reporting to this employee as line manager

### 3. Schema Updates
**File**: `le-backend/app/schemas.py`

- Updated field descriptions to clarify that manager IDs now reference employees
- Changed relationship types in response schemas:
  - `UserResponse.line_manager`: Changed from `UserResponse` to `EmployeeResponse`
  - `DepartmentResponse.manager`: Changed from `UserResponse` to `EmployeeResponse`
  - `BranchResponse.manager`: Changed from `UserResponse` to `EmployeeResponse`

### 4. Service Updates

#### Email Service
**File**: `le-backend/app/services/email_service.py`

- Updated `send_manager_notification()` method to accept Employee objects
- Added compatibility layer to handle both Employee and User objects during transition
- Changed manager name formatting to use `full_name_latin` for Employee objects

#### Notification Templates
**File**: `le-backend/app/services/notification_templates.py`

- Updated line manager name formatting to use `full_name_latin` instead of `first_name` + `last_name`

#### User Lifecycle Service
**File**: `le-backend/app/services/user_lifecycle_service.py`

- Updated all line manager references to use `full_name_latin` for Employee objects
- Modified user info serialization in onboarding and pending user reports

### 5. Controller Updates

#### Profile Controller
**File**: `le-backend/app/routers/users/controllers/profile_controller.py`

- Updated line manager serialization to use Employee fields:
  - `employee_code`, `full_name_khmer`, `full_name_latin`
  - Removed User-specific fields like `username`, `role`, `status`, etc.

#### Department Router
**File**: `le-backend/app/routers/departments.py`

- Updated department manager serialization to use Employee fields
- Changed from User fields to Employee fields in API responses

## Data Impact

### Cleared Data
The migration automatically cleared any `portfolio_id` or `line_manager_id` values in the users table that didn't correspond to existing employees. This was necessary because:

1. These fields previously referenced User IDs
2. Now they reference Employee IDs
3. Not all users have corresponding employee records

### Preservation Strategy
To preserve existing management relationships, you would need to:

1. Ensure all manager users have corresponding employee records
2. Run a data migration to map user IDs to employee IDs
3. Update the portfolio_id and line_manager_id fields accordingly

## Testing Recommendations

1. **Verify Manager Assignments**
   - Check that department managers display correctly
   - Verify branch managers are shown properly
   - Confirm line manager relationships work

2. **Test Manager Notifications**
   - Ensure email notifications to managers still work
   - Verify manager names display correctly in emails

3. **API Response Validation**
   - Test user profile endpoints return correct line manager data
   - Verify department endpoints show manager information
   - Check that employee fields are properly serialized

4. **Permission Checks**
   - Ensure manager-based permissions still function
   - Verify hierarchical access controls work correctly

## Migration Status

✅ Database schema updated
✅ Models updated
✅ Schemas updated
✅ Services updated
✅ Controllers updated
✅ No diagnostic errors

## Next Steps

1. Update frontend components to handle Employee-based manager data
2. Create UI for assigning employees as managers
3. Add data migration script if you need to preserve existing manager relationships
4. Update any reports or analytics that reference manager data
5. Review and update documentation

## Rollback Instructions

If you need to rollback this migration:

```bash
cd le-backend
source venv/bin/activate
alembic downgrade -1
```

Note: This will restore the foreign keys to point back to users, but any data cleared during the upgrade will not be restored.
