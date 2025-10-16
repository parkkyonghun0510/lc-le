# Employee Assignment API Guide

## Quick Reference for Application Endpoints with Employee Assignments

### Creating an Application with Employee Assignments

**Endpoint:** `POST /api/v1/applications`

**Request Body:**
```json
{
  "id_number": "123456789",
  "full_name_latin": "John Doe",
  "full_name_khmer": "ចន ដូ",
  "phone": "012345678",
  "requested_amount": 10000.0,
  "product_type": "personal_loan",
  "loan_purposes": ["business", "expansion"],
  "employee_assignments": [
    {
      "employee_id": "550e8400-e29b-41d4-a716-446655440000",
      "assignment_role": "primary_officer",
      "notes": "Primary loan officer"
    },
    {
      "employee_id": "660e8400-e29b-41d4-a716-446655440001",
      "assignment_role": "field_officer",
      "notes": "Field verification officer"
    }
  ]
}
```

**Assignment Roles:**
- `primary_officer` - Main responsible officer
- `secondary_officer` - Backup/support officer
- `field_officer` - Field verification officer
- `reviewer` - Application reviewer
- `approver` - Final approver

**Response:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "id_number": "123456789",
  "full_name_latin": "John Doe",
  "portfolio_officer_migrated": true,
  "employee_assignments": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "application_id": "770e8400-e29b-41d4-a716-446655440002",
      "employee_id": "550e8400-e29b-41d4-a716-446655440000",
      "assignment_role": "primary_officer",
      "assigned_at": "2025-10-15T10:30:00Z",
      "assigned_by": "user-uuid",
      "is_active": true,
      "notes": "Primary loan officer",
      "employee": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "employee_code": "EMP001",
        "full_name_khmer": "សុខ សំណាង",
        "full_name_latin": "Sok Samnang",
        "phone_number": "012345678",
        "position": "Senior Loan Officer",
        "is_active": true,
        "department": {
          "id": "dept-uuid",
          "name": "Lending Department"
        },
        "branch": {
          "id": "branch-uuid",
          "name": "Phnom Penh Branch"
        }
      }
    }
  ]
}
```

### Updating Application Employee Assignments

**Endpoint:** `PUT /api/v1/applications/{application_id}`

**Request Body (Replace all assignments):**
```json
{
  "employee_assignments": [
    {
      "employee_id": "550e8400-e29b-41d4-a716-446655440000",
      "assignment_role": "primary_officer"
    }
  ]
}
```

**Behavior:**
- Removes assignments not in the new list (soft delete)
- Adds new assignments
- Preserves assignments that exist in both lists
- Sets `portfolio_officer_migrated` to `true`

### Getting Application with Assignments

**Endpoint:** `GET /api/v1/applications/{application_id}`

**Response includes:**
- Full application details
- Array of employee assignments with complete employee information
- Nested department and branch details
- Migration status flag

### Listing Applications with Assignments

**Endpoint:** `GET /api/v1/applications?page=1&size=10`

**Query Parameters:**
- `page` - Page number (default: 1)
- `size` - Items per page (default: 10)
- `status` - Filter by application status
- `search` - Search in names, ID, phone, or portfolio officer name
- All other existing filters

**Response:**
```json
{
  "items": [
    {
      "id": "app-uuid",
      "full_name_latin": "John Doe",
      "employee_assignments": [...],
      "portfolio_officer_migrated": true
    }
  ],
  "total": 100,
  "page": 1,
  "size": 10,
  "pages": 10
}
```

## Backward Compatibility

### Creating Application with Legacy Field

**Still Supported:**
```json
{
  "id_number": "123456789",
  "full_name_latin": "Jane Doe",
  "phone": "098765432",
  "requested_amount": 5000.0,
  "product_type": "personal_loan",
  "loan_purposes": ["education"],
  "portfolio_officer_name": "Legacy Officer Name"
}
```

**Response:**
```json
{
  "id": "app-uuid",
  "portfolio_officer_name": "Legacy Officer Name",
  "portfolio_officer_migrated": false,
  "employee_assignments": []
}
```

### Using Both Fields (Transition Period)

**Supported:**
```json
{
  "portfolio_officer_name": "Legacy Name",
  "employee_assignments": [
    {
      "employee_id": "employee-uuid",
      "assignment_role": "primary_officer"
    }
  ]
}
```

**Result:**
- Both fields are stored
- `portfolio_officer_migrated` is set to `true`
- Employee assignments take precedence in UI

## Error Handling

### Employee Not Found (400)
```json
{
  "detail": "Employee with ID 550e8400-e29b-41d4-a716-446655440000 not found"
}
```

### Inactive Employee (400)
```json
{
  "detail": "Cannot assign inactive employee: Sok Samnang"
}
```

### Branch Mismatch (400)
```json
{
  "detail": "Employee Sok Samnang must belong to the same branch as the application"
}
```

### Duplicate Assignment (409)
```json
{
  "detail": "Employee already assigned to this application with this role"
}
```

## Validation Rules

### Employee Assignment Validation
1. **Employee must exist** - Verified against employee registry
2. **Employee must be active** - `is_active = true`
3. **Branch match** - Employee and application must be in same branch (if specified)
4. **No duplicates** - Same employee cannot have same role twice on same application
5. **Valid role** - Must be one of the defined assignment roles

### Transaction Safety
- Application creation and assignments are atomic
- If any assignment fails, entire application creation is rolled back
- Update operations are also transactional

## Best Practices

### 1. Always Assign Primary Officer
```json
{
  "employee_assignments": [
    {
      "employee_id": "primary-officer-uuid",
      "assignment_role": "primary_officer",
      "notes": "Main responsible officer"
    }
  ]
}
```

### 2. Use Multiple Roles for Complex Applications
```json
{
  "employee_assignments": [
    {
      "employee_id": "officer-uuid",
      "assignment_role": "primary_officer"
    },
    {
      "employee_id": "field-uuid",
      "assignment_role": "field_officer"
    },
    {
      "employee_id": "reviewer-uuid",
      "assignment_role": "reviewer"
    }
  ]
}
```

### 3. Add Notes for Clarity
```json
{
  "employee_id": "employee-uuid",
  "assignment_role": "primary_officer",
  "notes": "Assigned due to expertise in agricultural loans"
}
```

### 4. Update Assignments as Application Progresses
```json
// Initial creation - only primary officer
POST /api/v1/applications
{
  "employee_assignments": [
    {"employee_id": "officer-uuid", "assignment_role": "primary_officer"}
  ]
}

// Later - add reviewer when ready for review
PUT /api/v1/applications/{id}
{
  "employee_assignments": [
    {"employee_id": "officer-uuid", "assignment_role": "primary_officer"},
    {"employee_id": "reviewer-uuid", "assignment_role": "reviewer"}
  ]
}

// Finally - add approver for final approval
PUT /api/v1/applications/{id}
{
  "employee_assignments": [
    {"employee_id": "officer-uuid", "assignment_role": "primary_officer"},
    {"employee_id": "reviewer-uuid", "assignment_role": "reviewer"},
    {"employee_id": "approver-uuid", "assignment_role": "approver"}
  ]
}
```

## Migration Strategy

### Phase 1: Dual Mode (Current)
- Support both `portfolio_officer_name` and `employee_assignments`
- New applications can use either or both
- Existing applications continue with legacy field

### Phase 2: Gradual Migration
- Use migration script to convert legacy data
- Update UI to prefer employee assignments
- Keep legacy field visible for reference

### Phase 3: Full Migration
- All applications use employee assignments
- Legacy field becomes optional/deprecated
- Remove from UI (keep in database for history)

## Performance Tips

### 1. Use Pagination for Lists
```
GET /api/v1/applications?page=1&size=20
```

### 2. Filter by Employee (Future Enhancement)
```
GET /api/v1/applications?assigned_employee={employee_id}
```

### 3. Eager Loading is Automatic
- Employee details are loaded efficiently
- No N+1 query problems
- Department and branch included

## Integration with Employee Management

### Before Assigning Employees
1. Ensure employee exists: `GET /api/employees/{employee_id}`
2. Verify employee is active: Check `is_active` field
3. Confirm branch match: Compare `branch_id` fields

### Employee Lifecycle
- **Active employees** - Can be assigned to new applications
- **Inactive employees** - Cannot be assigned, but existing assignments remain
- **Deleted employees** - Assignments are preserved for historical record

## Troubleshooting

### Assignment Not Showing
- Check `is_active` flag on assignment
- Verify employee is not deleted
- Ensure proper eager loading in query

### Cannot Assign Employee
- Verify employee exists and is active
- Check branch compatibility
- Ensure no duplicate assignment exists

### Performance Issues
- Use pagination for large lists
- Check database indexes (should be automatic)
- Monitor query execution plans

## Support

For issues or questions:
1. Check error message details
2. Verify employee and application data
3. Review validation rules
4. Check server logs for detailed errors

## Related Documentation
- Employee Management API: `/api/employees`
- Employee Assignment Service: `app/services/employee_assignment_service.py`
- Application Models: `app/models.py`
- Schemas: `app/schemas.py`
