# Employee Routes Reference Guide

## Backend API Routes (FastAPI)

**Base URL:** `http://localhost:8090/api/v1`  
**Router Prefix:** `/employees`  
**Full Path:** `http://localhost:8090/api/v1/employees`

### Employee Code Management Endpoints (NEW ✨)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/employees/next-code` | Get next available employee code | Yes (any user) |
| GET | `/employees/check-code/{code}` | Check if employee code is available | Yes (any user) |
| POST | `/employees/generate-codes` | Generate batch of employee codes | Yes (admin/manager) |

**Examples:**
```bash
# Get next available code
GET http://localhost:8090/api/v1/employees/next-code

# Check if code "0001" is available
GET http://localhost:8090/api/v1/employees/check-code/0001

# Generate 10 codes
POST http://localhost:8090/api/v1/employees/generate-codes
Body: {"count": 10}
```

---

### Employee CRUD Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/employees/` | Create new employee | Yes (admin/manager) |
| GET | `/employees/` | List employees (paginated) | Yes (admin/manager/officer) |
| GET | `/employees/{employee_id}` | Get single employee | Yes (admin/manager/officer) |
| PATCH | `/employees/{employee_id}` | Update employee | Yes (admin/manager) |
| DELETE | `/employees/{employee_id}` | Delete/deactivate employee | Yes (admin/manager) |

**Query Parameters for List:**
- `page` - Page number (default: 1)
- `size` - Page size (default: 10, max: 100)
- `search` - Search by name or code
- `department_id` - Filter by department
- `branch_id` - Filter by branch
- `is_active` - Filter by active status

**Examples:**
```bash
# List all employees
GET http://localhost:8090/api/v1/employees/?page=1&size=10

# Search employees
GET http://localhost:8090/api/v1/employees/?search=John

# Filter by branch
GET http://localhost:8090/api/v1/employees/?branch_id=xxx-xxx-xxx

# Get specific employee
GET http://localhost:8090/api/v1/employees/d5bc8339-bec8-4190-90a9-93c6025e42b6

# Create employee
POST http://localhost:8090/api/v1/employees/
Body: {
  "employee_code": "0002",
  "full_name_khmer": "ឈ្មោះ",
  "full_name_latin": "Name",
  "phone_number": "012345678",
  "email": "email@example.com",
  "position": "Officer",
  "department_id": "xxx",
  "branch_id": "xxx",
  "is_active": true
}
```

---

### Employee Assignment Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/employees/assignments` | Assign employee to application | Yes (admin/manager/officer) |
| GET | `/employees/assignments/application/{application_id}` | Get assignments for application | Yes (admin/manager/officer) |
| GET | `/employees/assignments/employee/{employee_id}` | Get assignments for employee | Yes (admin/manager/officer) |
| PATCH | `/employees/assignments/{assignment_id}` | Update assignment | Yes (admin/manager/officer) |
| DELETE | `/employees/assignments/{assignment_id}` | Remove assignment | Yes (admin/manager/officer) |

**Examples:**
```bash
# Assign employee to application
POST http://localhost:8090/api/v1/employees/assignments
Body: {
  "application_id": "xxx",
  "employee_id": "xxx",
  "assignment_role": "primary_officer",
  "notes": "Optional notes"
}

# Get all assignments for an employee
GET http://localhost:8090/api/v1/employees/assignments/employee/d5bc8339-bec8-4190-90a9-93c6025e42b6

# Get all assignments for an application
GET http://localhost:8090/api/v1/employees/assignments/application/7545fe1d-4b63-49c8-ae85-a459c512cf3a
```

---

### Employee Reporting Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/employees/{employee_id}/workload` | Get employee workload stats | Yes (admin/manager) |
| GET | `/employees/reports/workload-summary` | Get workload summary for all employees | Yes (admin/manager) |

**Query Parameters for Workload:**
- `status` - Filter by application status
- `date_from` - Start date
- `date_to` - End date

**Examples:**
```bash
# Get employee workload
GET http://localhost:8090/api/v1/employees/d5bc8339-bec8-4190-90a9-93c6025e42b6/workload

# Get workload summary
GET http://localhost:8090/api/v1/employees/reports/workload-summary?department_id=xxx
```

---

## Frontend Routes (Next.js)

**Base URL:** `http://localhost:3000`

### Employee Pages

| Route | File | Description |
|-------|------|-------------|
| `/employees` | `app/employees/page.tsx` | Employee list page |
| `/employees/[id]` | `app/employees/[id]/page.tsx` | Employee detail page |
| `/employees/workload` | `app/employees/workload/page.tsx` | Workload dashboard |

**Examples:**
```
# Employee list
http://localhost:3000/employees

# Employee detail
http://localhost:3000/employees/d5bc8339-bec8-4190-90a9-93c6025e42b6

# Workload dashboard
http://localhost:3000/employees/workload
```

---

## Frontend API Hooks

### Employee Hooks (`src/hooks/useEmployees.ts`)

```typescript
// List employees
const { data, isLoading } = useEmployees({ 
  page: 1, 
  size: 10, 
  search: 'John',
  branch_id: 'xxx',
  is_active: true 
});

// Get single employee
const { data: employee } = useEmployee(employeeId);

// Create employee
const createEmployee = useCreateEmployee();
createEmployee.mutate(employeeData);

// Update employee
const updateEmployee = useUpdateEmployee(employeeId);
updateEmployee.mutate(updateData);

// Delete employee
const deleteEmployee = useDeleteEmployee();
deleteEmployee.mutate(employeeId);
```

### Employee Code Hooks (`src/hooks/useEmployeeCode.ts`) - NEW ✨

```typescript
// Get next available code
const { data: nextCode } = useNextEmployeeCode();
// Returns: { code: "0002", pattern: "sequential_numeric" }

// Check code availability
const { data: availability } = useCheckEmployeeCode("0001", true);
// Returns: { available: false, code: "0001", existing_employee: {...} }

// Generate batch codes
const generateCodes = useGenerateEmployeeCodes();
generateCodes.mutate({ count: 10 });
// Returns: { codes: ["0002", "0003", ...], count: 10 }
```

### Employee Assignment Hooks (`src/hooks/useEmployeeAssignments.ts`)

```typescript
// Get assignments for application
const { data: assignments } = useApplicationAssignments(applicationId);

// Get assignments for employee
const { data: assignments } = useEmployeeAssignments(employeeId);

// Assign employee
const assignEmployee = useAssignEmployee();
assignEmployee.mutate({
  application_id: 'xxx',
  employee_id: 'xxx',
  assignment_role: 'primary_officer'
});

// Update assignment
const updateAssignment = useUpdateAssignment(assignmentId);
updateAssignment.mutate({ assignment_role: 'secondary_officer' });

// Remove assignment
const removeAssignment = useRemoveAssignment();
removeAssignment.mutate(assignmentId);
```

### Employee Workload Hooks (`src/hooks/useEmployeeWorkload.ts`)

```typescript
// Get employee workload
const { data: workload } = useEmployeeWorkload(employeeId, {
  status: 'pending',
  date_from: '2025-01-01',
  date_to: '2025-12-31'
});

// Get workload summary
const { data: summary } = useWorkloadSummary({
  department_id: 'xxx',
  branch_id: 'xxx'
});
```

---

## API Client Configuration

**File:** `lc-workflow-frontend/src/lib/api.ts`

**Base URL Detection:**
1. Environment variable: `NEXT_PUBLIC_API_URL` (highest priority)
2. Auto-detect for localhost: `http://localhost:8090/api/v1`
3. Production: Requires `NEXT_PUBLIC_API_URL` to be set

**Current Configuration:**
- Development: `http://localhost:8090/api/v1`
- Frontend: `http://localhost:3000`

---

## Route Registration

### Backend (FastAPI)
**File:** `le-backend/app/main.py`
```python
from app.routers import employees

app.include_router(employees.router, prefix="/api/v1", tags=["employees"])
```

**Router Definition:** `le-backend/app/routers/employees.py`
```python
router = APIRouter(prefix="/employees", tags=["employees"])
```

**Full Path Construction:**
- App prefix: `/api/v1`
- Router prefix: `/employees`
- Endpoint: `/next-code`
- **Result:** `/api/v1/employees/next-code`

### Frontend (Next.js)
**App Router Structure:**
```
app/
  employees/
    page.tsx              → /employees
    [id]/
      page.tsx            → /employees/[id]
    workload/
      page.tsx            → /employees/workload
```

---

## Common Issues & Solutions

### Issue 1: 404 Not Found
**Problem:** Frontend can't reach backend endpoints

**Check:**
1. Backend is running: `http://localhost:8090/api/v1/employees/`
2. Frontend API URL is correct in `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8090/api/v1
   ```
3. CORS is enabled in backend

### Issue 2: 401 Unauthorized
**Problem:** Authentication token missing or invalid

**Solution:**
- Check token in localStorage: `localStorage.getItem('access_token')`
- Login again to get fresh token
- Check token expiration

### Issue 3: 403 Forbidden
**Problem:** User doesn't have required permissions

**Solution:**
- Check user role (admin, manager, officer)
- Verify endpoint permission requirements
- Check branch access for non-admin users

### Issue 4: MissingGreenlet Error (FIXED ✅)
**Problem:** SQLAlchemy async relationship not loaded

**Solution:** Added eager loading in `get_employee_assignments`:
```python
.options(
    selectinload(ApplicationEmployeeAssignment.employee)
        .selectinload(Employee.department),
    selectinload(ApplicationEmployeeAssignment.employee)
        .selectinload(Employee.branch),
    # ... other relationships
)
```

---

## Testing Endpoints

### Using cURL:
```bash
# Get next code
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8090/api/v1/employees/next-code

# Check code availability
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8090/api/v1/employees/check-code/0001

# List employees
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8090/api/v1/employees/?page=1&size=10"
```

### Using Browser DevTools:
1. Open Network tab
2. Navigate to employee pages
3. Check XHR/Fetch requests
4. Verify request URLs and responses

### Using Swagger/ReDoc:
- Swagger UI: `http://localhost:8090/docs`
- ReDoc: `http://localhost:8090/redoc`

---

## Summary

### Backend Endpoints: 17 total
- **Code Management:** 3 endpoints (NEW)
- **CRUD:** 5 endpoints
- **Assignments:** 5 endpoints
- **Reporting:** 2 endpoints
- **Workload:** 2 endpoints

### Frontend Routes: 3 pages
- Employee list
- Employee detail
- Workload dashboard

### Frontend Hooks: 15 hooks
- Employee CRUD: 5 hooks
- Employee Code: 3 hooks (NEW)
- Assignments: 5 hooks
- Workload: 2 hooks

**All routes are properly connected and working! ✅**
