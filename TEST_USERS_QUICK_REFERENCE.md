# Test Users Quick Reference Card

## 🚀 Quick Setup

```bash
# Windows PowerShell
.\setup-test-users.ps1

# Or manually
cd le-backend
python scripts/setup_test_environment.py
```

## 👥 Test Users (Password: `Test@123`)

| Login | Role | Position | Use Case |
|-------|------|----------|----------|
| **admin** | admin | - | System administration |
| **manager** | manager | Branch Manager | Approve/reject applications |
| **teller** | officer | Teller | Process applications |
| **officer** | officer | Credit Officer | Department-level tasks |
| **portfolio** | officer | Portfolio Officer | Create customer applications |
| **user1** | user | - | Submit applications |
| **user2** | user | - | Submit applications |

## 🔄 Workflow Test Flow

```
1. Login: user1 → Create application → Submit
   Status: draft → USER_COMPLETED

2. Login: teller → Process application → Add account ID
   Status: USER_COMPLETED → MANAGER_REVIEW

3. Login: manager → Approve or Reject
   Status: MANAGER_REVIEW → APPROVED/REJECTED
```

## 🎯 Quick Test Scenarios

### Test 1: Basic Workflow
```
user1 → Submit → teller → Process → manager → Approve
```

### Test 2: Rejection Flow
```
user1 → Submit → teller → Process → manager → Reject (with reason)
```

### Test 3: Portfolio Officer
```
portfolio → Create for customer → Submit → teller → Process → manager → Approve
```

### Test 4: Multiple Applications
```
user1 → Submit App A
user2 → Submit App B
teller → Process both
manager → Approve A, Reject B
```

## 🔐 Permission Matrix

| Action | User | Teller | Manager | Admin |
|--------|------|--------|---------|-------|
| Submit (draft) | ✅ | ❌ | ❌ | ❌ |
| Process (USER_COMPLETED) | ❌ | ✅ | ❌ | ❌ |
| Approve/Reject (MANAGER_REVIEW) | ❌ | ❌ | ✅ | ✅ |

## 📊 Status Flow

```
draft
  ↓ [User Submit]
USER_COMPLETED
  ↓ [Teller Process + Account ID]
MANAGER_REVIEW
  ↓ [Manager Approve/Reject]
APPROVED / REJECTED
```

## 🔧 Troubleshooting

### Can't login?
```bash
cd le-backend
python scripts/seed_test_users.py
```

### No permissions?
```bash
cd le-backend
python scripts/seed_permissions.py
```

### Buttons not showing?
1. Check user role in database
2. Check application status
3. Verify workflow status matches expected state

## 📝 Database Queries

### Check users
```sql
SELECT username, email, role, employee_id 
FROM users 
WHERE username IN ('admin', 'manager', 'teller', 'user1');
```

### Check positions
```sql
SELECT u.username, p.name as position 
FROM users u 
LEFT JOIN positions p ON u.position_id = p.id;
```

### Get position IDs for frontend config
```sql
SELECT id, name FROM positions;
```

## 🎨 Frontend Config

Update `lc-workflow-frontend/src/config/permissions.ts`:

```typescript
export const POSITION_PERMISSIONS: PositionCapability[] = [
  {
    positionId: '<uuid-from-database>',
    positionName: 'Teller',
    capabilities: ['start_teller_processing'],
  },
  // Add more positions...
];
```

## 📚 Full Documentation

- **Complete Guide**: `TEST_USERS_SETUP_GUIDE.md`
- **Workflow Permissions**: `WORKFLOW_PERMISSIONS_MATRIX.md`
- **Position System**: `POSITION_PERMISSIONS_SYSTEM.md`

## ✅ Testing Checklist

- [ ] All users can login
- [ ] User can submit draft applications
- [ ] Teller can process USER_COMPLETED
- [ ] Manager can approve/reject MANAGER_REVIEW
- [ ] Correct buttons show for each role
- [ ] Invalid actions are prevented
- [ ] Status transitions work correctly

## 🆘 Need Help?

1. Check logs: `le-backend/logs/`
2. Verify database connection
3. Ensure migrations applied
4. Review error messages in console

---

**Remember**: Default password is `Test@123` for all test users!
