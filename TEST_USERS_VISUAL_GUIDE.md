# Test Users Visual Guide

## 🎭 User Roles & Capabilities

```
┌─────────────────────────────────────────────────────────────────┐
│                         ADMIN                                    │
│  Username: admin | Password: Test@123                           │
│  ✅ Full system access                                          │
│  ✅ Manage users, roles, permissions                            │
│  ✅ View all applications                                       │
│  ✅ System configuration                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    BRANCH MANAGER                                │
│  Username: manager | Password: Test@123                         │
│  Position: Branch Manager                                       │
│  ✅ Approve applications (MANAGER_REVIEW)                       │
│  ✅ Reject applications (MANAGER_REVIEW)                        │
│  ✅ View branch analytics                                       │
│  ✅ Manage branch users                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         TELLER                                   │
│  Username: teller | Password: Test@123                          │
│  Position: Teller                                               │
│  ✅ Process applications (USER_COMPLETED)                       │
│  ✅ Add account ID                                              │
│  ✅ Assign reviewers                                            │
│  ✅ Validate customer information                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    CREDIT OFFICER                                │
│  Username: officer | Password: Test@123                         │
│  Position: Credit Officer                                       │
│  ✅ Process applications                                        │
│  ✅ Department-level access                                     │
│  ✅ Analyze credit applications                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   PORTFOLIO OFFICER                              │
│  Username: portfolio | Password: Test@123                       │
│  Position: Portfolio Officer                                    │
│  ✅ Create applications for customers                           │
│  ✅ Manage customer portfolios                                  │
│  ✅ Submit on behalf of customers                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      REGULAR USERS                               │
│  Username: user1 / user2 | Password: Test@123                  │
│  ✅ Create own applications                                     │
│  ✅ Submit draft applications                                   │
│  ✅ View own applications                                       │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Workflow State Machine

```
┌──────────────────────────────────────────────────────────────────┐
│                    APPLICATION LIFECYCLE                          │
└──────────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │   DRAFT     │  ← Created by user or portfolio officer
    └──────┬──────┘
           │
           │ 👤 USER ACTION: Submit
           │    Who: user1, user2, portfolio
           │    Button: "Submit"
           ↓
    ┌──────────────────┐
    │ USER_COMPLETED   │  ← User filled and submitted
    └──────┬───────────┘
           │
           │ 👨‍💼 TELLER ACTION: Process
           │    Who: teller, officer
           │    Button: "Process"
           │    Required: Account ID
           │    Optional: Reviewer, Notes
           ↓
    ┌──────────────────┐
    │ MANAGER_REVIEW   │  ← Teller validated
    └──────┬───────────┘
           │
           │ 👔 MANAGER ACTION: Approve or Reject
           │    Who: manager, admin
           │    Buttons: "Approve" | "Reject"
           │    
           ├─────────────┬─────────────┐
           ↓             ↓             ↓
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ APPROVED │  │ REJECTED │  │ ON HOLD  │
    └──────────┘  └──────────┘  └──────────┘
         ✅            ❌            ⏸️
```

## 🎯 Permission Matrix

```
┌────────────────────────────────────────────────────────────────┐
│                    WHO CAN DO WHAT?                             │
└────────────────────────────────────────────────────────────────┘

ACTION                  │ USER │ TELLER │ MANAGER │ ADMIN
────────────────────────┼──────┼────────┼─────────┼───────
Create Application      │  ✅  │   ✅   │   ✅    │  ✅
Submit (draft)          │  ✅  │   ❌   │   ❌    │  ❌
Process (USER_COMP)     │  ❌  │   ✅   │   ❌    │  ❌
Approve (MGR_REVIEW)    │  ❌  │   ❌   │   ✅    │  ✅
Reject (MGR_REVIEW)     │  ❌  │   ❌   │   ✅    │  ✅
View Own Apps           │  ✅  │   ✅   │   ✅    │  ✅
View All Apps           │  ❌  │   ✅   │   ✅    │  ✅
Manage Users            │  ❌  │   ❌   │   ✅    │  ✅
System Config           │  ❌  │   ❌   │   ❌    │  ✅
```

## 📊 Test Scenario Flow

```
┌────────────────────────────────────────────────────────────────┐
│                  SCENARIO 1: HAPPY PATH                         │
└────────────────────────────────────────────────────────────────┘

Step 1: USER CREATES & SUBMITS
┌─────────────────────────────────┐
│ 👤 Login: user1 / Test@123      │
│ 📝 Create new application       │
│ ✍️  Fill in details             │
│ 🚀 Click "Submit"               │
│ ✅ Status: draft → USER_COMP    │
└─────────────────────────────────┘
           ↓
Step 2: TELLER PROCESSES
┌─────────────────────────────────┐
│ 👨‍💼 Login: teller / Test@123    │
│ 🔍 Find user1's application     │
│ 🔧 Click "Process"              │
│ 📋 Enter Account ID: ACC001234  │
│ 👥 Assign Reviewer (optional)   │
│ 💬 Add Notes (optional)         │
│ 🚀 Click "Submit"               │
│ ✅ Status: USER_COMP → MGR_REV  │
└─────────────────────────────────┘
           ↓
Step 3: MANAGER APPROVES
┌─────────────────────────────────┐
│ 👔 Login: manager / Test@123    │
│ 🔍 Find application in review   │
│ ✅ Click "Approve"              │
│ 💰 Enter approved amount        │
│ 📅 Enter approved term          │
│ 📈 Enter interest rate          │
│ 🚀 Click "Confirm"              │
│ ✅ Status: MGR_REV → APPROVED   │
└─────────────────────────────────┘
           ↓
        SUCCESS! ✅
```

```
┌────────────────────────────────────────────────────────────────┐
│                  SCENARIO 2: REJECTION PATH                     │
└────────────────────────────────────────────────────────────────┘

Step 1: USER CREATES & SUBMITS
┌─────────────────────────────────┐
│ 👤 Login: user2 / Test@123      │
│ 📝 Create new application       │
│ 🚀 Submit                       │
│ ✅ Status: draft → USER_COMP    │
└─────────────────────────────────┘
           ↓
Step 2: TELLER PROCESSES
┌─────────────────────────────────┐
│ 👨‍💼 Login: teller / Test@123    │
│ 🔧 Process application          │
│ ✅ Status: USER_COMP → MGR_REV  │
└─────────────────────────────────┘
           ↓
Step 3: MANAGER REJECTS
┌─────────────────────────────────┐
│ 👔 Login: manager / Test@123    │
│ ❌ Click "Reject"               │
│ 📝 Enter reason: "Insufficient  │
│    income documentation"        │
│ 🚀 Click "Confirm"              │
│ ✅ Status: MGR_REV → REJECTED   │
└─────────────────────────────────┘
           ↓
        REJECTED ❌
```

```
┌────────────────────────────────────────────────────────────────┐
│              SCENARIO 3: PORTFOLIO OFFICER FLOW                 │
└────────────────────────────────────────────────────────────────┘

Step 1: PORTFOLIO OFFICER CREATES FOR CUSTOMER
┌─────────────────────────────────┐
│ 👨‍💼 Login: portfolio / Test@123 │
│ 📝 Create application           │
│ 👤 Enter customer details       │
│ 🚀 Submit on behalf of customer │
│ ✅ Status: draft → USER_COMP    │
└─────────────────────────────────┘
           ↓
Step 2 & 3: Same as Scenario 1
```

## 🔐 Security Model

```
┌────────────────────────────────────────────────────────────────┐
│                    PERMISSION LAYERS                            │
└────────────────────────────────────────────────────────────────┘

Layer 1: ROLE-BASED
┌─────────────────────────────────┐
│ admin    → Full access          │
│ manager  → Branch management    │
│ officer  → Processing           │
│ user     → Own applications     │
└─────────────────────────────────┘
           ↓
Layer 2: POSITION-BASED
┌─────────────────────────────────┐
│ Branch Manager → Approve/Reject │
│ Teller         → Process        │
│ Portfolio Off. → Create for     │
│ Credit Officer → Analyze        │
└─────────────────────────────────┘
           ↓
Layer 3: WORKFLOW STATUS
┌─────────────────────────────────┐
│ draft          → Submit         │
│ USER_COMPLETED → Process        │
│ MANAGER_REVIEW → Approve/Reject │
└─────────────────────────────────┘
           ↓
Layer 4: OWNERSHIP
┌─────────────────────────────────┐
│ Own applications → Full access  │
│ Team apps        → Read/Update  │
│ Department apps  → Read         │
│ All apps         → Admin only   │
└─────────────────────────────────┘
```

## 🎨 UI Button Visibility

```
┌────────────────────────────────────────────────────────────────┐
│                  BUTTON VISIBILITY RULES                        │
└────────────────────────────────────────────────────────────────┘

APPLICATION STATUS: draft
┌─────────────────────────────────┐
│ USER (owner)                    │
│   [Submit] ✅                   │
│                                 │
│ TELLER                          │
│   No buttons ❌                 │
│                                 │
│ MANAGER                         │
│   No buttons ❌                 │
└─────────────────────────────────┘

APPLICATION STATUS: USER_COMPLETED
┌─────────────────────────────────┐
│ USER                            │
│   No buttons ❌                 │
│                                 │
│ TELLER                          │
│   [Process] ✅                  │
│                                 │
│ MANAGER                         │
│   No buttons ❌                 │
└─────────────────────────────────┘

APPLICATION STATUS: MANAGER_REVIEW
┌─────────────────────────────────┐
│ USER                            │
│   No buttons ❌                 │
│                                 │
│ TELLER                          │
│   No buttons ❌                 │
│                                 │
│ MANAGER                         │
│   [Approve] ✅ [Reject] ✅      │
└─────────────────────────────────┘

APPLICATION STATUS: APPROVED/REJECTED
┌─────────────────────────────────┐
│ ALL USERS                       │
│   No buttons ❌                 │
│   (Read-only)                   │
└─────────────────────────────────┘
```

## 📈 Testing Progress Tracker

```
┌────────────────────────────────────────────────────────────────┐
│                    TESTING CHECKLIST                            │
└────────────────────────────────────────────────────────────────┘

SETUP
[ ] Run setup script
[ ] Verify all users created
[ ] Get position IDs
[ ] Update frontend config

LOGIN TESTS
[ ] Login as admin
[ ] Login as manager
[ ] Login as teller
[ ] Login as officer
[ ] Login as portfolio
[ ] Login as user1
[ ] Login as user2

WORKFLOW TESTS
[ ] User submits application
[ ] Teller processes application
[ ] Manager approves application
[ ] Manager rejects application
[ ] Portfolio officer creates app

PERMISSION TESTS
[ ] User can only submit own apps
[ ] Teller can only process USER_COMPLETED
[ ] Manager can only approve/reject MGR_REVIEW
[ ] Invalid actions are blocked

UI TESTS
[ ] Correct buttons show for each role
[ ] Buttons disabled for invalid states
[ ] Success messages display
[ ] Error messages display
[ ] Loading states work

DATA VALIDATION
[ ] Account ID required for teller
[ ] Rejection reason required
[ ] Approval details required
[ ] Form validation works
```

## 🎓 Quick Tips

```
┌────────────────────────────────────────────────────────────────┐
│                      TESTING TIPS                               │
└────────────────────────────────────────────────────────────────┘

✅ DO:
  • Test in order: User → Teller → Manager
  • Use different browsers for concurrent testing
  • Check browser console for errors
  • Verify database changes
  • Test negative cases

❌ DON'T:
  • Skip permission seeding
  • Forget to update position IDs
  • Test with wrong workflow status
  • Assume frontend checks are secure
  • Forget to restart servers after config changes

💡 REMEMBER:
  • Default password: Test@123
  • Backend validates all permissions
  • Frontend checks are for UX only
  • Status transitions are validated
  • Audit trail logs all actions
```

## 🚀 Quick Commands

```bash
# Setup everything
.\setup-test-users.ps1

# Get position IDs
cd le-backend
python scripts/get_position_ids.py

# Start backend
cd le-backend
python -m uvicorn app.main:app --reload

# Start frontend
cd lc-workflow-frontend
npm run dev

# Check database
psql -d your_database -c "SELECT username, role FROM users;"
```

---

**Ready to test! Login with any user and password `Test@123`** 🎉
