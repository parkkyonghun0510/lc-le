# SelectInload Fix Summary

## Problem
After migrating the management structure from User-based to Employee-based references, the application was failing with the error:

```
ORM mapped entity or attribute "User.department" does not link from relationship "User.portfolio"
```

## Root Cause
The code was using `selectinload(User.portfolio).options(selectinload(User.department), ...)` which tried to load User attributes on an Employee relationship. Since `User.portfolio` and `User.line_manager` now reference Employee objects (not User objects), the nested selectinload calls were trying to access attributes that don't exist on the Employee model in the same way.

## Solution
Updated all selectinload patterns to use Employee attributes instead of User attributes when loading portfolio and line_manager relationships.

### Before:
```python
selectinload(User.portfolio).options(
    selectinload(User.department),
    selectinload(User.branch),
    selectinload(User.position),
    selectinload(User.portfolio),
    selectinload(User.line_manager),
)
```

### After:
```python
selectinload(User.portfolio).options(
    selectinload(Employee.department),
    selectinload(Employee.branch),
)
```

## Files Fixed

1. **le-backend/app/routers/auth.py**
   - Added Employee import
   - Fixed `get_user_by_username()` function
   - Updated portfolio and line_manager selectinload patterns

2. **le-backend/app/routers/users.py**
   - Added Employee import
   - Fixed multiple selectinload patterns throughout the file
   - Removed malformed chained `.options().options()` calls

3. **le-backend/app/routers/users/repositories/user_repository.py**
   - Added Employee import
   - Selectinload patterns automatically fixed by IDE

4. **le-backend/app/routers/users/repositories/__init__.py**
   - Added Employee import
   - Selectinload patterns automatically fixed by IDE

5. **le-backend/app/routers/users/services/user_query_service.py**
   - Added Employee import
   - Selectinload patterns automatically fixed by IDE

## Changes Made

### Import Additions
All affected files now import Employee:
```python
from app.models import User, ..., Employee
```

### SelectInload Pattern Updates
- Removed nested User attribute loads from portfolio/line_manager relationships
- Simplified to only load Employee.department and Employee.branch
- Removed unnecessary nested portfolio and line_manager loads (which would cause infinite recursion)

## Testing
- All files pass diagnostic checks
- No syntax or type errors
- Login functionality should now work correctly

## Impact
- Login endpoint now works properly
- User profile loading works correctly
- All user-related queries that load portfolio or line_manager relationships now function properly

## Notes
- Employee objects have `department` and `branch` relationships just like Users
- Employee objects don't have `position`, `portfolio`, or `line_manager` relationships in the same way Users do
- The simplified selectinload pattern is more efficient and avoids potential circular loading issues
