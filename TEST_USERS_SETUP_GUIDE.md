# Test Users Setup Guide

## Overview
This guide helps you set up test users with different roles and positions to test the workflow system from the frontend with realistic scenarios.

## Quick Start

### Step 1: Seed Permissions (If Not Done)
```bash
cd le-backend
python scripts/seed_permissions.py
```

This creates:
- 7 standard roles (admin, branch_manager, teller, etc.)
- Comprehensive permissions for all resources
- Permission templates

### Step 2: Seed Test Users
```bash
cd le-backend
python scripts/seed_test_users.py
```

This creates:
- 7 test users with different roles
- Test branch and department
- Test positions (Teller, Branch Manager, etc.)

## Test Users Created

### Default Password for All Users: `Test@123`

| Username | Email | Role | Position | Capabilities |
|----------|-------|------|----------|--------------|
| **admin** | admin@example.com | admin | None | Full system access, manage everything |
| **manager** | manager@example.com | manager | Branch Manager | Approve/reject applications in MANAGER_REVIEW |
| **teller** | teller@example.com | officer | Teller | Process applications in USER_COMPLETED status |
| **officer** | officer@example.com | officer | Credit Officer | Process applications, department-level tasks |
| **portfolio** | portfolio@example.com | officer | Portfolio Officer | Create applications for customers |
| **user1** | user1@example.com | user | None | Submit own applications |
| **user2** | user2@example.com | user | None | Submit own applications |

## Workflow Testing Scenarios

### Scenario 1: Standard Application Flow

#### Step 1: User Submits Application
1. Login as: `user1` / `Test@123`
2. Navigate to: Applications → Create New
3. Fill in application details
4. Click: **Submit** button
5. Status changes: `draft` → `USER_COMPLETED`

#### Step 2: Teller Processes Application
1. Logout and login as: `teller` / `Test@123`
2. Navigate to: Applications → View All
3. Find the application submitted by user1
4. Click: **Process** button
5. Fill in:
   - Account ID (required): e.g., "ACC001234"
   - Reviewer Assignment (optional)
   - Notes (optional)
6. Click: **Submit**
7. Status changes: `USER_COMPLETED` → `MANAGER_REVIEW`

#### Step 3: Manager Approves/Rejects
1. Logout and login as: `manager` / `Test@123`
2. Navigate to: Applications → View All
3. Find the application in MANAGER_REVIEW status
4. Click: **Approve** or **Reject** button
5. For Approve:
   - Provide approved amount, term, interest rate
6. For Reject:
   - Provide rejection reason (required)
7. Status changes: `MANAGER_REVIEW` → `APPROVED` or `REJECTED`

### Scenario 2: Portfolio Officer Creates Application

#### Step 1: Portfolio Officer Creates for Customer
1. Login as: `portfolio` / `Test@123`
2. Navigate to: Applications → Create New
3. Fill in customer details
4. Save as draft or submit directly
5. Application is created on behalf of customer

### Scenario 3: Multiple Users Testing

#### Test Concurrent Workflows
1. Login as `user1` and create Application A
2. Login as `user2` and create Application B
3. Login as `teller` and process both applications
4. Login as `manager` and approve one, reject the other

## Permission Testing

### Test Role-Based Permissions

#### As User (user1)
- ✅ Can see Submit button on own draft applications
- ❌ Cannot see Process button (teller only)
- ❌ Cannot see Approve/Reject buttons (manager only)
- ❌ Cannot submit other users' applications

#### As Teller (teller)
- ❌ Cannot see Submit button (user only)
- ✅ Can see Process button on USER_COMPLETED applications
- ❌ Cannot see Process button on MANAGER_REVIEW applications
- ❌ Cannot see Approve/Reject buttons (manager only)

#### As Manager (manager)
- ❌ Cannot see Submit button (user only)
- ❌ Cannot see Process button (teller only)
- ✅ Can see Approve/Reject buttons on MANAGER_REVIEW applications
- ❌ Cannot see Approve/Reject on USER_COMPLETED applications

#### As Admin (admin)
- ✅ Can manage users, roles, permissions
- ✅ Can view all applications
- ✅ Has same workflow permissions as Manager
- ✅ Can access system settings

### Test Position-Based Permissions

The system uses a hybrid role + position permission model:

1. **Role-based**: Broad permissions (admin, manager, officer, user)
2. **Position-based**: Granular permissions (Teller, Branch Manager, etc.)

To test position-based permissions:
1. Update `lc-workflow-frontend/src/config/permissions.ts`
2. Add position IDs from database
3. Test that users with specific positions can perform actions

## Database Verification

### Check Created Users
```sql
SELECT username, email, role, employee_id, status
FROM users
WHERE username IN ('admin', 'manager', 'teller', 'officer', 'portfolio', 'user1', 'user2')
ORDER BY employee_id;
```

### Check User Positions
```sql
SELECT u.username, u.role, p.name as position_name
FROM users u
LEFT JOIN positions p ON u.position_id = p.id
WHERE u.username IN ('admin', 'manager', 'teller', 'officer', 'portfolio', 'user1', 'user2')
ORDER BY u.employee_id;
```

### Check User Roles (Permission System)
```sql
SELECT u.username, r.name as role_name, r.display_name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.username IN ('admin', 'manager', 'teller', 'officer', 'portfolio', 'user1', 'user2')
ORDER BY u.username;
```

### Check Position IDs for Frontend Config
```sql
SELECT id, name, description
FROM positions
WHERE name IN ('Teller', 'Branch Manager', 'Portfolio Officer', 'Credit Officer')
ORDER BY name;
```

## Frontend Configuration

### Update Position Permissions Config

1. Get position IDs from database (query above)
2. Update `lc-workflow-frontend/src/config/permissions.ts`:

```typescript
export const POSITION_PERMISSIONS: PositionCapability[] = [
  {
    positionId: 'uuid-from-database-for-teller',
    positionName: 'Teller',
    capabilities: ['start_teller_processing', 'submit_to_manager'],
  },
  {
    positionId: 'uuid-from-database-for-branch-manager',
    positionName: 'Branch Manager',
    capabilities: ['approve_application', 'reject_application'],
  },
  {
    positionId: 'uuid-from-database-for-portfolio-officer',
    positionName: 'Portfolio Officer',
    capabilities: ['create_application_for_customer'],
  },
  {
    positionId: 'uuid-from-database-for-credit-officer',
    positionName: 'Credit Officer',
    capabilities: ['start_teller_processing', 'submit_to_manager'],
  },
];
```

## Troubleshooting

### Issue: Cannot login with test users
**Solution**: Check that users were created successfully:
```bash
cd le-backend
python scripts/seed_test_users.py
```

### Issue: Users don't have permissions
**Solution**: Run permission seeding first:
```bash
cd le-backend
python scripts/seed_permissions.py
```

### Issue: Workflow buttons not showing
**Solution**: 
1. Check user role and position in database
2. Verify workflow status of application
3. Check browser console for errors
4. Verify permission checks in `WorkflowActions.tsx`

### Issue: Position-based permissions not working
**Solution**:
1. Get position IDs from database
2. Update `permissions.ts` with correct UUIDs
3. Restart frontend development server

## Adding More Test Users

### Manual Creation via Script

Edit `le-backend/scripts/seed_test_users.py` and add to `test_users` array:

```python
{
    "username": "newuser",
    "email": "newuser@example.com",
    "first_name": "New",
    "last_name": "User",
    "role": "officer",
    "employee_id": "0008",
    "position": positions.get("Teller"),
    "role_obj": teller_role
}
```

Then run:
```bash
python scripts/seed_test_users.py
```

### Manual Creation via API

Use the `/users` endpoint with admin credentials:

```bash
curl -X POST http://localhost:8000/users \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "Test@123",
    "first_name": "New",
    "last_name": "User",
    "role": "officer",
    "employee_id": "0008"
  }'
```

## Testing Checklist

### Basic Functionality
- [ ] All 7 test users can login
- [ ] Users can view their profile
- [ ] Users can see applications list
- [ ] Users can create new applications

### Workflow Permissions
- [ ] User can submit own draft applications
- [ ] Teller can process USER_COMPLETED applications
- [ ] Manager can approve/reject MANAGER_REVIEW applications
- [ ] Users cannot perform actions outside their role

### Status Transitions
- [ ] Draft → USER_COMPLETED (user submit)
- [ ] USER_COMPLETED → MANAGER_REVIEW (teller process)
- [ ] MANAGER_REVIEW → APPROVED (manager approve)
- [ ] MANAGER_REVIEW → REJECTED (manager reject)

### Data Validation
- [ ] Teller must provide account ID to process
- [ ] Manager must provide reason to reject
- [ ] Manager must provide approved details to approve
- [ ] Invalid transitions are prevented

### UI/UX
- [ ] Correct buttons show for each role
- [ ] Buttons are disabled for invalid states
- [ ] Success messages show after actions
- [ ] Error messages show for failures

## Next Steps

1. **Run the seeding scripts** to create test users
2. **Login with different users** to test workflow
3. **Update position permissions config** with real UUIDs
4. **Test all workflow scenarios** from the checklist
5. **Create additional test data** as needed

## Support

If you encounter issues:
1. Check the logs in `le-backend/logs/`
2. Verify database connection
3. Ensure all migrations are applied
4. Check that permissions were seeded correctly

## Summary

You now have:
- ✅ 7 test users with different roles
- ✅ Test branch and department
- ✅ Test positions (Teller, Manager, etc.)
- ✅ Permission system configured
- ✅ Ready to test workflow from frontend

**Default Password**: `Test@123`

**Next**: Login to the frontend and start testing the workflow!
