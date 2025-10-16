# Bug Fix: Employee Creation MissingGreenlet Error

## Issue Description

When creating or updating an employee via the API endpoint `POST /api/v1/employees/`, the application was throwing a `MissingGreenlet` error when trying to serialize the response:

```
fastapi.exceptions.ResponseValidationError: 3 validation errors:
- Error extracting attribute: department
- Error extracting attribute: branch  
- Error extracting attribute: linked_user
```

## Root Cause

The issue occurred because SQLAlchemy relationships (`department`, `branch`, `linked_user`) were not being eagerly loaded before the database session closed. When FastAPI tried to serialize the `EmployeeResponse` schema, it attempted to access these lazy-loaded relationships after the async session had already been committed and closed, resulting in the `MissingGreenlet` error.

## Solution

Added explicit eager loading of relationships using `db.refresh()` with `attribute_names` parameter before committing the transaction in both `create_employee()` and `update_employee()` methods.

### Changes Made

**File:** `le-backend/app/services/employee_service.py`

#### 1. Fixed `create_employee()` method:

```python
# Before
db.add(new_employee)
await db.flush()
await db.refresh(new_employee)
await db.commit()

# After
db.add(new_employee)
await db.flush()
await db.refresh(new_employee)

# Eagerly load relationships before commit to avoid MissingGreenlet error
await db.refresh(
    new_employee,
    attribute_names=['department', 'branch', 'linked_user']
)

await db.commit()
```

#### 2. Fixed `update_employee()` method:

```python
# Before
employee.updated_by = updated_by
await db.flush()
await db.refresh(employee)
await db.commit()

# After
employee.updated_by = updated_by
await db.flush()
await db.refresh(employee)

# Eagerly load relationships before commit to avoid MissingGreenlet error
await db.refresh(
    employee,
    attribute_names=['department', 'branch', 'linked_user']
)

await db.commit()
```

## Why This Works

By calling `db.refresh()` with specific `attribute_names` before the commit:
1. SQLAlchemy loads the relationship data while the session is still active
2. The relationship attributes are populated on the model instance
3. When FastAPI serializes the response after the session closes, the data is already available
4. No lazy loading is attempted, avoiding the `MissingGreenlet` error

## Testing

The fix has been verified to:
- ✅ Allow employee creation without errors
- ✅ Properly load department, branch, and linked_user relationships
- ✅ Return complete `EmployeeResponse` with all relationship data
- ✅ Work correctly when relationships are null/None

## Impact

This fix affects:
- `POST /api/v1/employees/` - Create employee endpoint
- `PATCH /api/v1/employees/{id}` - Update employee endpoint

Both endpoints now correctly return employee data with all relationships loaded.

## Related Issues

This is a common pattern in async SQLAlchemy applications where:
- Relationships are lazy-loaded by default
- Response serialization happens after session closure
- Explicit eager loading is required for relationships that will be accessed after commit

## Prevention

For future endpoints that return models with relationships:
1. Always use `selectinload()` in queries when fetching existing records
2. Always use `db.refresh()` with `attribute_names` after creating/updating records
3. Test endpoints to ensure relationships are accessible in responses

## Date
October 16, 2025

## Status
✅ Fixed and verified
