# Test Users - Login Credentials

## ✅ Setup Complete!

All test users have been created successfully. Use these credentials to test the workflow system.

## 🔐 Login Credentials

**Default Password for ALL users**: `Test@123`

### Test Users

| # | Username | Email | Role | Position | Employee ID |
|---|----------|-------|------|----------|-------------|
| 1 | **test_admin** | test_admin@example.com | admin | - | 9001 |
| 2 | **test_manager** | test_manager@example.com | manager | Branch Manager | 9002 |
| 3 | **test_teller** | test_teller@example.com | officer | Teller | 9003 |
| 4 | **test_officer** | test_officer@example.com | officer | Credit Officer | 9004 |
| 5 | **test_portfolio** | test_portfolio@example.com | officer | Portfolio Officer | 9005 |
| 6 | **test_user1** | test_user1@example.com | user | - | 9006 |
| 7 | **test_user2** | test_user2@example.com | user | - | 9007 |

## 🎯 Quick Test Workflow

### Step 1: User Submits Application
```
Login: test_user1 / Test@123
Action: Create and submit an application
Result: Status changes from 'draft' to 'USER_COMPLETED'
```

### Step 2: Teller Processes Application
```
Login: test_teller / Test@123
Action: Process the application
Required: Add Account ID (e.g., "ACC001234")
Optional: Assign reviewer, add notes
Result: Status changes from 'USER_COMPLETED' to 'MANAGER_REVIEW'
```

### Step 3: Manager Approves/Rejects
```
Login: test_manager / Test@123
Action: Approve or Reject the application
For Approve: Provide approved amount, term, interest rate
For Reject: Provide rejection reason (required)
Result: Status changes to 'APPROVED' or 'REJECTED'
```

## 📊 User Capabilities

### test_admin
- ✅ Full system access
- ✅ Manage users, roles, permissions
- ✅ View all applications
- ✅ System configuration

### test_manager
- ✅ Approve applications (MANAGER_REVIEW status)
- ✅ Reject applications (MANAGER_REVIEW status)
- ✅ View branch analytics
- ✅ Manage branch users

### test_teller
- ✅ Process applications (USER_COMPLETED status)
- ✅ Add account ID
- ✅ Assign reviewers
- ✅ Validate customer information

### test_officer
- ✅ Process applications
- ✅ Department-level access
- ✅ Analyze credit applications

### test_portfolio
- ✅ Create applications for customers
- ✅ Manage customer portfolios
- ✅ Submit on behalf of customers

### test_user1 & test_user2
- ✅ Create own applications
- ✅ Submit draft applications
- ✅ View own applications

## 🔄 Workflow Status Flow

```
draft
  ↓ [test_user1 Submit]
USER_COMPLETED
  ↓ [test_teller Process + Account ID]
MANAGER_REVIEW
  ↓ [test_manager Approve/Reject]
APPROVED / REJECTED
```

## 🎨 Frontend Configuration

Update `lc-workflow-frontend/src/config/permissions.ts` with these position IDs:

```typescript
export const POSITION_PERMISSIONS: PositionCapability[] = [
  {
    positionId: 'ba4d3024-a065-455c-ab1c-78955cd86e95',
    positionName: 'Teller',
    capabilities: ['start_teller_processing', 'submit_to_manager'],
  },
  {
    positionId: '2253e277-7b25-405d-9926-561940c318a8',
    positionName: 'Branch Manager',
    capabilities: ['approve_application', 'reject_application'],
  },
  {
    positionId: '578dfcaf-5a98-41b8-a353-1d4abfdba66b',
    positionName: 'Portfolio Officer',
    capabilities: ['create_application_for_customer'],
  },
  {
    positionId: 'a9861484-6a88-455f-9d23-734f824aa5a5',
    positionName: 'Credit Officer',
    capabilities: ['start_teller_processing', 'submit_to_manager'],
  },
];
```

## 🚀 Start Testing

1. **Start Backend**:
   ```bash
   cd le-backend
   python -m uvicorn app.main:app --reload
   ```

2. **Start Frontend**:
   ```bash
   cd lc-workflow-frontend
   npm run dev
   ```

3. **Login and Test**:
   - Open browser to frontend URL
   - Login with any test user
   - Test the workflow!

## 📝 Test Scenarios

### Scenario 1: Happy Path
```
test_user1 → Submit → test_teller → Process → test_manager → Approve ✅
```

### Scenario 2: Rejection
```
test_user1 → Submit → test_teller → Process → test_manager → Reject ❌
```

### Scenario 3: Portfolio Officer
```
test_portfolio → Create for customer → Submit → test_teller → Process → test_manager → Approve ✅
```

### Scenario 4: Multiple Applications
```
test_user1 → Submit App A
test_user2 → Submit App B
test_teller → Process both
test_manager → Approve A, Reject B
```

## ✅ Verification

Check that users were created:
```sql
SELECT username, email, role, employee_id 
FROM users 
WHERE username LIKE 'test_%'
ORDER BY employee_id;
```

Check user positions:
```sql
SELECT u.username, u.role, p.name as position_name
FROM users u
LEFT JOIN positions p ON u.position_id = p.id
WHERE u.username LIKE 'test_%'
ORDER BY u.employee_id;
```

## 🆘 Troubleshooting

### Can't login?
- Verify users exist in database
- Check password is exactly: `Test@123`
- Ensure backend is running

### Buttons not showing?
- Check user role matches expected
- Verify application workflow status
- Check browser console for errors
- Ensure position IDs are configured in frontend

### Permission errors?
- Verify user has correct role
- Check position assignment
- Ensure permissions were seeded

## 📚 Documentation

- **Quick Reference**: [TEST_USERS_QUICK_REFERENCE.md](TEST_USERS_QUICK_REFERENCE.md)
- **Visual Guide**: [TEST_USERS_VISUAL_GUIDE.md](TEST_USERS_VISUAL_GUIDE.md)
- **Complete Guide**: [TEST_USERS_SETUP_GUIDE.md](TEST_USERS_SETUP_GUIDE.md)

---

**Remember**: Default password is `Test@123` for all test users!

**Ready to test!** 🚀
