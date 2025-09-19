# Portfolio and Line Manager Implementation Test

## Backend Changes Made:
1. ✅ Added `portfolio_id` and `line_manager_id` columns to User model
2. ✅ Added relationships for portfolio and line manager in User model
3. ✅ Updated UserBase, UserCreate, UserUpdate, and UserResponse schemas
4. ✅ Updated all user API endpoints to include new relationships
5. ✅ Created database migration for new columns

## Frontend Changes Made:
1. ✅ Updated User interface in types/models.ts
2. ✅ Updated UserCreate and UserUpdate interfaces
3. ✅ Added portfolio and line manager fields to user creation form
4. ✅ Added portfolio and line manager fields to user edit form
5. ✅ Added portfolio and line manager columns to user list table
6. ✅ Added portfolio and line manager information to user detail page

## Testing Steps:

### 1. Backend Testing
```bash
# Run the migration
cd le-backend
alembic upgrade head

# Test the API endpoints
curl -X GET "http://localhost:8000/users/" -H "Authorization: Bearer <token>"
```

### 2. Frontend Testing
1. Navigate to `/users/new`
2. Verify Portfolio Manager and Line Manager dropdowns are disabled initially
3. Select a branch - verify dropdowns become enabled and show only same-branch managers
4. Try changing branch - verify portfolio and line manager selections are cleared
5. Create a new user with portfolio and line manager assignments
6. Navigate to `/users` and verify the new columns show the assignments
7. Check for "Different branch" warnings in the user list
8. Navigate to user detail page and verify management structure section
9. Edit the user and verify the fields are populated correctly with branch filtering

### 3. Database Verification
```sql
-- Check the new columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('portfolio_id', 'line_manager_id');

-- Test the relationships with branch information
SELECT 
    u1.username as user, 
    b1.name as user_branch,
    u2.username as portfolio_manager, 
    b2.name as portfolio_branch,
    u3.username as line_manager,
    b3.name as line_manager_branch,
    CASE WHEN u2.branch_id != u1.branch_id THEN 'CROSS-BRANCH PORTFOLIO' ELSE 'OK' END as portfolio_check,
    CASE WHEN u3.branch_id != u1.branch_id THEN 'CROSS-BRANCH LINE MGR' ELSE 'OK' END as line_mgr_check
FROM users u1
LEFT JOIN branches b1 ON u1.branch_id = b1.id
LEFT JOIN users u2 ON u1.portfolio_id = u2.id
LEFT JOIN branches b2 ON u2.branch_id = b2.id
LEFT JOIN users u3 ON u1.line_manager_id = u3.id
LEFT JOIN branches b3 ON u3.branch_id = b3.id
WHERE u1.portfolio_id IS NOT NULL OR u1.line_manager_id IS NOT NULL;

-- Test branch validation constraint
-- This should fail if validation is working:
-- UPDATE users SET portfolio_id = (SELECT id FROM users WHERE branch_id != (SELECT branch_id FROM users WHERE id = 'target_user_id') LIMIT 1) WHERE id = 'target_user_id';
```

## Expected Behavior:
- Users can be assigned a portfolio manager (typically a manager/admin role)
- Users can be assigned a line manager (typically a manager/admin role)
- **Branch Restriction**: Portfolio and line managers can only be assigned from the same branch
- Both fields are optional and can be null
- The relationships are properly displayed in the UI
- Self-referential relationships work correctly (users can manage other users)
- Foreign key constraints prevent invalid assignments

## Branch-Based Filtering:
- Portfolio and line manager dropdowns are disabled until a branch is selected
- Only users with 'manager' or 'admin' roles from the same branch are shown
- When branch is changed, portfolio and line manager selections are cleared
- Backend API supports branch_id filtering for efficient queries
- User list shows warnings for cross-branch management assignments

## Notes:
- Portfolio managers and line managers are filtered to show only users with 'manager' or 'admin' roles **within the same branch**
- The implementation supports hierarchical management structures within branch boundaries
- Both fields are optional to maintain backward compatibility
- Cross-branch assignments are visually flagged in the user list for administrative review