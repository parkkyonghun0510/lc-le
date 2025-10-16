# Users vs Employees - Complete Guide

## Quick Summary

| Aspect | Users | Employees |
|--------|-------|-----------|
| **Purpose** | System login accounts | Work assignment tracking |
| **Access** | Can log into the system | May or may not have system access |
| **Location** | Admin section (restricted) | Main navigation (all users) |
| **Icon** | 👤 UsersIcon | 👥 UserGroupIcon |
| **Route** | `/users` | `/employees` |
| **Permissions** | Admin, Manager only | All authenticated users |
| **Primary Use** | Authentication & authorization | Application assignments & workload |

---

## Detailed Comparison

### 1. Users (System Users)

**What are Users?**
- People who can **log into the system**
- Have authentication credentials (username/password)
- Have system roles (admin, manager, officer)
- Have permissions and access control

**Key Features:**
- ✅ Login credentials (username, password)
- ✅ System roles (admin, manager, officer, teller)
- ✅ Status management (active, inactive, suspended, archived)
- ✅ Permissions and access control
- ✅ Department and branch assignment
- ✅ Position assignment
- ✅ Profile management
- ✅ Activity tracking (last login, login count)
- ✅ Onboarding status

**Who Can Access?**
- ⚠️ **Admin and Manager roles only**
- Located in **Admin Section** of sidebar
- Restricted access for security reasons

**Primary Use Cases:**
1. Create system login accounts
2. Manage user roles and permissions
3. Control who can access the system
4. Track user activity and status
5. Manage authentication and security

**Example User:**
```json
{
  "id": "uuid",
  "username": "john.doe",
  "email": "john@example.com",
  "password_hash": "hashed",
  "first_name": "John",
  "last_name": "Doe",
  "role": "officer",
  "status": "active",
  "department_id": "uuid",
  "branch_id": "uuid",
  "position_id": "uuid",
  "last_login_at": "2025-10-16T10:00:00Z"
}
```

**Backend API:**
- Base: `/api/v1/users`
- Endpoints: CRUD, status management, bulk operations
- File: `le-backend/app/routers/users.py`

**Frontend:**
- Route: `/users`
- File: `lc-workflow-frontend/app/users/page.tsx`
- Location: Admin section in sidebar

---

### 2. Employees (Staff Registry)

**What are Employees?**
- People who **work on applications**
- May or may not have system login access
- Tracked for assignment and workload purposes
- Can be field officers, portfolio officers, etc.

**Key Features:**
- ✅ Employee code (unique identifier)
- ✅ Bilingual names (Khmer and Latin)
- ✅ Contact information (phone, email)
- ✅ Position and department
- ✅ Branch assignment
- ✅ Application assignments
- ✅ Workload tracking
- ✅ Optional link to system user
- ✅ Active/inactive status

**Who Can Access?**
- ✅ **All authenticated users** (admin, manager, officer)
- Located in **Main Navigation** section
- Available to everyone who needs to assign work

**Primary Use Cases:**
1. Track all staff who work on applications
2. Assign employees to applications
3. Monitor employee workload
4. Manage field officers without system access
5. Report on employee performance
6. Link employees to user accounts (optional)

**Example Employee:**
```json
{
  "id": "uuid",
  "employee_code": "0001",
  "full_name_khmer": "ចន ដារ៉ា",
  "full_name_latin": "Chan Dara",
  "phone_number": "012345678",
  "email": "chan.dara@example.com",
  "position": "Field Officer",
  "department_id": "uuid",
  "branch_id": "uuid",
  "user_id": "uuid",  // Optional link to system user
  "is_active": true,
  "assignment_count": 15
}
```

**Backend API:**
- Base: `/api/v1/employees`
- Endpoints: CRUD, assignments, workload, code management
- File: `le-backend/app/routers/employees.py`

**Frontend:**
- Route: `/employees`
- File: `lc-workflow-frontend/app/employees/page.tsx`
- Location: Main navigation in sidebar

---

## Key Differences Explained

### 1. Purpose

**Users:**
- **System access control**
- "Who can log in?"
- "What can they do in the system?"
- Focus: Authentication & Authorization

**Employees:**
- **Work assignment tracking**
- "Who is working on this application?"
- "What is their workload?"
- Focus: Operations & Workload Management

---

### 2. Relationship

**One-to-One (Optional):**
```
User (System Login) ←→ Employee (Staff Record)
     john.doe              Chan Dara
```

**Example Scenarios:**

**Scenario A: Employee with System Access**
```
Employee: Chan Dara (Field Officer)
    ↓ linked to
User: john.doe (officer role)
    ↓ can
- Log into system
- View applications
- Update application status
```

**Scenario B: Employee without System Access**
```
Employee: Sok Pisey (Field Officer)
    ↓ NOT linked to any user
    ↓ cannot log in
    ↓ but can be
- Assigned to applications
- Tracked for workload
- Reported on performance
```

**Scenario C: User without Employee Record**
```
User: admin (admin role)
    ↓ NOT linked to employee
    ↓ can
- Log into system
- Manage users
- View reports
    ↓ but cannot be
- Assigned to applications (no employee record)
```

---

### 3. Data Structure

**Users Table:**
```sql
users (
  id,
  username,           -- For login
  password_hash,      -- For authentication
  email,
  first_name,
  last_name,
  role,               -- admin, manager, officer
  status,             -- active, inactive, suspended
  department_id,
  branch_id,
  position_id,
  employee_id,        -- Optional link to employee
  last_login_at,
  login_count,
  ...
)
```

**Employees Table:**
```sql
employees (
  id,
  employee_code,      -- Unique code (e.g., "0001")
  full_name_khmer,    -- Khmer name
  full_name_latin,    -- Latin name
  phone_number,
  email,
  position,           -- Job title (text)
  department_id,
  branch_id,
  user_id,            -- Optional link to user
  is_active,
  notes,
  ...
)
```

**Assignment Table:**
```sql
application_employee_assignments (
  id,
  application_id,     -- Which application
  employee_id,        -- Which employee (NOT user_id)
  assignment_role,    -- primary_officer, field_officer, etc.
  assigned_at,
  assigned_by,        -- user_id who made the assignment
  is_active,
  ...
)
```

---

## Common Use Cases

### Use Case 1: Create a Field Officer

**Step 1: Create Employee Record**
```
Navigate to: /employees
Click: "Create Employee"
Fill in:
  - Employee Code: 0002 (auto-suggested)
  - Name (Khmer): ចន ដារ៉ា
  - Name (Latin): Chan Dara
  - Phone: 012345678
  - Position: Field Officer
  - Department: Loan Department
  - Branch: Phnom Penh Branch
  - Link to User: (leave empty for now)
```

**Result:** Employee can now be assigned to applications, but cannot log in yet.

**Step 2 (Optional): Create System User**
```
Navigate to: /users (admin only)
Click: "Create User"
Fill in:
  - Username: chan.dara
  - Email: chan.dara@example.com
  - Password: ********
  - Role: officer
  - Link to Employee: Chan Dara (0002)
```

**Result:** Employee can now log in AND be assigned to applications.

---

### Use Case 2: Assign Employee to Application

**Scenario:** Application needs a field officer

```
Navigate to: /applications/[id]/edit
Section: "Assigned Employees"
Click: "Add Employee"
Select: Chan Dara (0002)
Role: Field Officer
Click: "Assign"
```

**What happens:**
- Employee is assigned to application
- Assignment is tracked in database
- Workload count increases for employee
- Application shows assigned employee

**Note:** This uses the **Employee** record, not the User record!

---

### Use Case 3: View Employee Workload

**Scenario:** Manager wants to see who is overloaded

```
Navigate to: /employees/workload
View: All employees with assignment counts
Filter: By department or branch
See:
  - Chan Dara: 15 applications (5 pending, 8 approved, 2 rejected)
  - Sok Pisey: 23 applications (12 pending, 10 approved, 1 rejected)
  - ...
```

**Decision:** Assign new applications to Chan Dara (lower workload)

---

## Navigation Location

### Desktop Sidebar

```
┌─────────────────────────────┐
│ LC Workflow                 │
├─────────────────────────────┤
│ Main Navigation             │
│ 🏠 Dashboard                │
│ 📄 Applications             │
│ 👥 Employees    ← Everyone  │
│ 📁 Files                    │
├─────────────────────────────┤
│ Admin Section               │
│ 🏢 Departments              │
│ 💼 Positions                │
│ 👤 Users        ← Admin only│
│ 📍 Branches                 │
│ 📊 Analytics                │
│ 🔔 Notifications            │
│ 🛡️  Security                │
│ ⚙️  Settings                │
└─────────────────────────────┘
```

**Why this separation?**
- **Employees** = Operational feature (everyone needs it)
- **Users** = Administrative feature (security-sensitive)

---

## Permissions Matrix

| Action | Admin | Manager | Officer |
|--------|-------|---------|---------|
| **Users** |
| View users | ✅ | ✅ | ❌ |
| Create users | ✅ | ✅ | ❌ |
| Edit users | ✅ | ✅ | ❌ |
| Delete users | ✅ | ❌ | ❌ |
| Change roles | ✅ | ❌ | ❌ |
| **Employees** |
| View employees | ✅ | ✅ | ✅ |
| Create employees | ✅ | ✅ | ❌ |
| Edit employees | ✅ | ✅ | ❌ |
| Delete employees | ✅ | ✅ | ❌ |
| Assign to applications | ✅ | ✅ | ✅ |
| View workload | ✅ | ✅ | ✅ |

---

## Real-World Examples

### Example 1: Microfinance Institution

**Users (System Access):**
- Admin: 2 people (IT staff)
- Managers: 5 people (branch managers)
- Officers: 20 people (loan officers with computers)
- **Total: 27 system users**

**Employees (Staff Registry):**
- Branch managers: 5 people
- Loan officers: 20 people
- Field officers: 50 people (no system access)
- Portfolio officers: 30 people (no system access)
- **Total: 105 employees**

**Why the difference?**
- Field officers work in villages without computers
- They are assigned to applications for tracking
- But they don't need to log into the system
- Loan officers in the office assign them to applications

---

### Example 2: Application Workflow

**Application #12345:**
```
Created by: User "john.doe" (officer)
    ↓
Assigned to: Employee "Chan Dara" (Field Officer)
    ↓
Reviewed by: User "manager.sok" (manager)
    ↓
Assigned to: Employee "Pisey Rath" (Portfolio Officer)
    ↓
Approved by: User "manager.sok" (manager)
```

**Notice:**
- **Users** perform system actions (create, review, approve)
- **Employees** are assigned for work tracking
- Some employees have user accounts, some don't

---

## Migration Path

**If you have existing data:**

### Scenario: You have portfolio_officer_name (text field)

**Before:**
```
Application #1: portfolio_officer_name = "Chan Dara"
Application #2: portfolio_officer_name = "Sok Pisey"
Application #3: portfolio_officer_name = "Chan Dara"
```

**After Migration:**
```
Employees:
  - ID: 001, Code: 0001, Name: Chan Dara
  - ID: 002, Code: 0002, Name: Sok Pisey

Assignments:
  - App #1 → Employee 001 (Chan Dara)
  - App #2 → Employee 002 (Sok Pisey)
  - App #3 → Employee 001 (Chan Dara)

Benefits:
  - Can track Chan Dara's workload (2 applications)
  - Can report on employee performance
  - Can link to user account later
  - Consistent data (no typos)
```

---

## Best Practices

### 1. When to Create a User
✅ **Create a User when:**
- Person needs to log into the system
- Person needs to perform system actions
- Person needs specific permissions
- Person works in an office with computer access

❌ **Don't create a User when:**
- Person only needs to be tracked for assignments
- Person works in the field without system access
- Person doesn't need to see application data

### 2. When to Create an Employee
✅ **Create an Employee when:**
- Person works on applications
- Person needs to be assigned to applications
- Person's workload needs to be tracked
- Person needs to appear in reports

✅ **Always create an Employee for:**
- Field officers
- Portfolio officers
- Loan officers
- Any staff who touch applications

### 3. Linking Users and Employees
✅ **Link when:**
- Employee needs system access
- Want to track both login activity and workload
- Employee works in office and field

**How to link:**
```
Option 1: When creating employee
  - Select "Link to User" dropdown
  - Choose existing user

Option 2: When creating user
  - Select "Link to Employee" dropdown
  - Choose existing employee

Option 3: Edit later
  - Edit employee record
  - Update "Link to User" field
```

---

## Summary Table

| Feature | Users | Employees |
|---------|-------|-----------|
| **Purpose** | System login | Work tracking |
| **Required for login** | ✅ Yes | ❌ No |
| **Can be assigned to apps** | ❌ No | ✅ Yes |
| **Has password** | ✅ Yes | ❌ No |
| **Has role** | ✅ Yes | ❌ No |
| **Has employee code** | ❌ No | ✅ Yes |
| **Bilingual names** | ❌ No | ✅ Yes |
| **Workload tracking** | ❌ No | ✅ Yes |
| **Can be linked** | ✅ To employee | ✅ To user |
| **Access level** | Admin/Manager | All users |
| **Navigation** | Admin section | Main section |
| **Primary table** | `users` | `employees` |
| **Assignment table** | N/A | `application_employee_assignments` |

---

## Quick Decision Guide

**Question: Should I create a User or Employee?**

```
Does the person need to log into the system?
    ├─ YES → Create User
    │         └─ Do they also work on applications?
    │             ├─ YES → Also create Employee and link them
    │             └─ NO → Just User is fine
    │
    └─ NO → Create Employee only
              └─ They can be assigned to applications
                  but cannot log in
```

---

## Conclusion

**Users** and **Employees** serve different purposes:

- **Users** = System access control (who can log in)
- **Employees** = Work tracking (who is working on what)

They can be linked together, but they don't have to be. This separation allows you to:
- Track field officers without giving them system access
- Manage workload independently from system permissions
- Have flexible staffing models
- Maintain security while enabling operations

**Both are important, but they solve different problems!**
