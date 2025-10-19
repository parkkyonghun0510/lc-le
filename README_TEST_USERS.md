# Test Users & Workflow Testing

Complete test environment setup for the LC Workflow system with realistic user scenarios.

## 🚀 Quick Start (30 seconds)

```powershell
# Windows - Run this one command
.\setup-test-users.ps1
```

That's it! You now have 7 test users ready to test the workflow system.

## 👥 Test Users

| Username | Password | Role | Use For |
|----------|----------|------|---------|
| admin | Test@123 | Admin | System administration |
| manager | Test@123 | Manager | Approve/reject applications |
| teller | Test@123 | Teller | Process applications |
| officer | Test@123 | Officer | Credit analysis |
| portfolio | Test@123 | Portfolio Officer | Create customer apps |
| user1 | Test@123 | User | Submit applications |
| user2 | Test@123 | User | Submit applications |

## 🔄 Test Workflow (3 Steps)

```
1. Login: user1 → Create & submit application
2. Login: teller → Process application (add account ID)
3. Login: manager → Approve or reject
```

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[Quick Reference](TEST_USERS_QUICK_REFERENCE.md)** | One-page cheat sheet |
| **[Visual Guide](TEST_USERS_VISUAL_GUIDE.md)** | Diagrams and flowcharts |
| **[Setup Guide](TEST_USERS_SETUP_GUIDE.md)** | Complete instructions |
| **[Complete Summary](COMPLETE_TEST_SETUP_SUMMARY.md)** | Everything in detail |

## 🔧 Scripts

| Script | Purpose |
|--------|---------|
| `setup-test-users.ps1` | One-command setup (Windows) |
| `le-backend/scripts/setup_test_environment.py` | Complete setup (Python) |
| `le-backend/scripts/seed_test_users.py` | Create test users |
| `le-backend/scripts/get_position_ids.py` | Get position IDs for frontend |

## ⚡ Common Tasks

### Setup Everything
```powershell
.\setup-test-users.ps1
```

### Get Position IDs for Frontend
```bash
cd le-backend
python scripts/get_position_ids.py
```

### Start Testing
```bash
# Terminal 1: Backend
cd le-backend
python -m uvicorn app.main:app --reload

# Terminal 2: Frontend
cd lc-workflow-frontend
npm run dev
```

### Verify Setup
```sql
-- Check users
SELECT username, email, role FROM users 
WHERE username IN ('admin', 'manager', 'teller', 'user1');

-- Check positions
SELECT u.username, p.name as position 
FROM users u 
LEFT JOIN positions p ON u.position_id = p.id;
```

## 🎯 Test Scenarios

### Scenario 1: Happy Path
```
user1 → Submit → teller → Process → manager → Approve ✅
```

### Scenario 2: Rejection
```
user1 → Submit → teller → Process → manager → Reject ❌
```

### Scenario 3: Portfolio Officer
```
portfolio → Create for customer → Submit → teller → Process → manager → Approve ✅
```

## 🔐 Permission Matrix

| Action | User | Teller | Manager | Admin |
|--------|------|--------|---------|-------|
| Submit (draft) | ✅ | ❌ | ❌ | ❌ |
| Process (USER_COMPLETED) | ❌ | ✅ | ❌ | ❌ |
| Approve/Reject (MANAGER_REVIEW) | ❌ | ❌ | ✅ | ✅ |

## 🐛 Troubleshooting

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
2. Verify application status
3. Check browser console
4. Update position IDs in frontend config

## ✅ Testing Checklist

- [ ] All users can login
- [ ] User can submit draft applications
- [ ] Teller can process USER_COMPLETED
- [ ] Manager can approve/reject MANAGER_REVIEW
- [ ] Correct buttons show for each role
- [ ] Invalid actions are prevented

## 📖 Learn More

- **Workflow Permissions**: [WORKFLOW_PERMISSIONS_MATRIX.md](WORKFLOW_PERMISSIONS_MATRIX.md)
- **Position System**: [POSITION_PERMISSIONS_SYSTEM.md](POSITION_PERMISSIONS_SYSTEM.md)
- **Complete Guide**: [TEST_USERS_SETUP_GUIDE.md](TEST_USERS_SETUP_GUIDE.md)

## 🎉 What You Get

- ✅ 7 test users with different roles
- ✅ Permission system configured
- ✅ Position-based permissions
- ✅ Test branch and department
- ✅ Ready-to-test workflow
- ✅ Complete documentation

**Default Password**: `Test@123`

**Ready to test!** 🚀
