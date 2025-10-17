# Permission Audit Trail - Implementation Guide

## Overview

The Permission Audit Trail provides comprehensive tracking of all permission-related changes in the system. It logs permission changes, role assignments, and user permission grants/revocations with full context including who performed the action, when, and why.

## Features

### 1. Comprehensive Audit Logging

The system tracks the following actions:

**Permission Actions:**
- `permission_created` - New permission created
- `permission_updated` - Permission modified
- `permission_deleted` - Permission removed
- `permission_toggled` - Permission activated/deactivated

**Role Actions:**
- `role_created` - New role created
- `role_updated` - Role modified
- `role_deleted` - Role removed
- `role_assigned` - Role assigned to user
- `role_revoked` - Role removed from user

**User Permission Actions:**
- `permission_granted` - Direct permission granted to user
- `permission_revoked` - Direct permission removed from user

**Role Permission Actions:**
- `role_permission_assigned` - Permission added to role
- `role_permission_revoked` - Permission removed from role

### 2. Advanced Filtering

Filter audit entries by:
- **Action Type** - Specific action performed
- **Entity Type** - Type of entity affected (permission, role, user_role, user_permission, role_permission)
- **User** - Who performed the action
- **Target User** - Who was affected by the action
- **Date Range** - Start and end dates
- **Search** - Free text search in details

### 3. Real-Time Updates

The audit trail automatically refreshes every 30 seconds to show the latest changes without manual refresh.

### 4. Export Functionality

Export audit trail to CSV for:
- Compliance reporting
- Security audits
- Historical analysis
- External processing

### 5. Detailed Entry Information

Each audit entry displays:
- Action type with color-coded badge
- Target user (if applicable)
- Permission or role name
- Reason for change (if provided)
- Performed by user
- Timestamp
- IP address (if available)

## Usage

### Basic Usage

```tsx
import PermissionAuditTrail from '@/components/permissions/PermissionAuditTrail';

function AuditPage() {
  return <PermissionAuditTrail />;
}
```

### Using the Hook Directly

```tsx
import { useAuditTrail } from '@/hooks/useAuditTrail';

function CustomAuditView() {
  const {
    entries,
    total,
    page,
    isLoading,
    setFilters,
    setPage,
    exportToCSV,
  } = useAuditTrail({
    page: 1,
    size: 50,
    action_type: 'role_assigned',
  });

  return (
    <div>
      {entries.map(entry => (
        <div key={entry.id}>{entry.action}</div>
      ))}
    </div>
  );
}
```

### Real-Time Updates

```tsx
import { useAuditTrailRealtime } from '@/hooks/useAuditTrail';

function RealtimeAuditView() {
  const { entries, isLoading } = useAuditTrailRealtime(
    { page: 1, size: 20 },
    15000 // Poll every 15 seconds
  );

  return (
    <div>
      {entries.map(entry => (
        <div key={entry.id}>{entry.action}</div>
      ))}
    </div>
  );
}
```

## Backend Integration

### Logging Audit Entries

The backend provides `PermissionAuditService` for logging audit entries:

```python
from app.services.permission_audit_service import PermissionAuditService

async def create_permission(permission_data, current_user, db):
    # Create permission
    permission = await permission_service.create_permission(...)
    
    # Log audit entry
    audit_service = PermissionAuditService(db)
    await audit_service.log_permission_created(
        permission_id=str(permission.id),
        permission_name=permission.name,
        user_id=str(current_user.id),
        details={
            "resource_type": permission.resource_type,
            "action": permission.action,
            "scope": permission.scope
        },
        ip_address=request.client.host
    )
    
    return permission
```

### Available Logging Methods

- `log_permission_created(permission_id, permission_name, user_id, details, ip_address)`
- `log_permission_updated(permission_id, permission_name, user_id, changes, ip_address)`
- `log_permission_deleted(permission_id, permission_name, user_id, ip_address)`
- `log_permission_toggled(permission_id, permission_name, user_id, is_active, ip_address)`
- `log_role_created(role_id, role_name, user_id, details, ip_address)`
- `log_role_updated(role_id, role_name, user_id, changes, ip_address)`
- `log_role_deleted(role_id, role_name, user_id, ip_address)`
- `log_role_assigned(role_id, role_name, target_user_id, assigned_by_user_id, reason, ip_address)`
- `log_role_revoked(role_id, role_name, target_user_id, revoked_by_user_id, reason, ip_address)`
- `log_permission_granted(permission_id, permission_name, target_user_id, granted_by_user_id, reason, ip_address)`
- `log_permission_revoked(permission_id, permission_name, target_user_id, revoked_by_user_id, reason, ip_address)`
- `log_role_permission_assigned(role_id, role_name, permission_id, permission_name, user_id, ip_address)`
- `log_role_permission_revoked(role_id, role_name, permission_id, permission_name, user_id, ip_address)`

## API Endpoints

### GET /api/v1/permissions/audit

Retrieve audit trail entries with filtering and pagination.

**Query Parameters:**
- `page` (int, default: 1) - Page number
- `size` (int, default: 50, max: 100) - Items per page
- `action_type` (string, optional) - Filter by action type
- `entity_type` (string, optional) - Filter by entity type
- `user_id` (string, optional) - Filter by user who performed action
- `target_user_id` (string, optional) - Filter by affected user
- `start_date` (datetime, optional) - Start of date range
- `end_date` (datetime, optional) - End of date range
- `search` (string, optional) - Search in action, entity_type, and details

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "action": "role_assigned",
      "entity_type": "user_role",
      "entity_id": "user123:role456",
      "user_id": "admin123",
      "user_name": "Admin User",
      "target_user_id": "user123",
      "target_user_name": "John Doe",
      "role_id": "role456",
      "role_name": "Manager",
      "reason": "Promotion",
      "timestamp": "2025-10-17T10:30:00Z",
      "ip_address": "192.168.1.100"
    }
  ],
  "total": 150,
  "page": 1,
  "size": 50,
  "pages": 3
}
```

## Security Considerations

### Access Control

The audit trail endpoint requires the `AUDIT:VIEW_ALL` permission. Only users with this permission can view audit entries.

### Data Retention

Audit entries are retained indefinitely by default. Consider implementing a data retention policy based on your compliance requirements.

### Sensitive Information

The audit trail does NOT log:
- Password changes
- Authentication tokens
- Sensitive user data
- Internal system IDs (except for reference)

### IP Address Logging

IP addresses are logged for security tracking but should be handled according to privacy regulations (GDPR, CCPA, etc.).

## Performance Considerations

### Pagination

Always use pagination when retrieving audit entries. The default page size is 50 items, with a maximum of 100 items per page.

### Indexing

The audit_logs table is indexed on:
- `timestamp` - For date range queries
- `action` - For action type filtering
- `entity_type` - For entity type filtering
- `user_id` - For user filtering

### Real-Time Updates

The real-time polling feature uses a 30-second interval by default. Adjust this based on your needs:
- Higher frequency = More real-time but more server load
- Lower frequency = Less server load but less real-time

## Troubleshooting

### No Audit Entries Showing

1. Check that audit logging is enabled in the backend
2. Verify the user has `AUDIT:VIEW_ALL` permission
3. Check date range filters aren't too restrictive
4. Verify backend audit service is properly initialized

### Export Not Working

1. Check browser console for errors
2. Verify there are entries to export
3. Check browser's download settings
4. Ensure popup blockers aren't interfering

### Real-Time Updates Not Working

1. Check network connectivity
2. Verify React Query is properly configured
3. Check browser console for polling errors
4. Ensure backend endpoint is accessible

## Best Practices

### 1. Always Provide Reasons

When logging role assignments or permission grants, always provide a reason:

```python
await audit_service.log_role_assigned(
    role_id=role_id,
    role_name=role.name,
    target_user_id=user_id,
    assigned_by_user_id=current_user.id,
    reason="Promotion to department manager",  # Always provide reason
    ip_address=request.client.host
)
```

### 2. Include Relevant Details

Add context to audit entries through the details field:

```python
await audit_service.log_permission_updated(
    permission_id=permission_id,
    permission_name=permission.name,
    user_id=current_user.id,
    changes={
        "old_scope": "department",
        "new_scope": "branch",
        "old_is_active": True,
        "new_is_active": False
    },
    ip_address=request.client.host
)
```

### 3. Regular Exports

Export audit trails regularly for:
- Compliance reporting
- Security reviews
- Historical analysis
- Backup purposes

### 4. Monitor Audit Trail

Set up alerts for:
- Unusual permission changes
- Mass role assignments
- Permission deletions
- After-hours changes

## Future Enhancements

Potential improvements for the audit trail:

1. **Advanced Analytics** - Visualizations and trends
2. **Anomaly Detection** - Automatic detection of unusual patterns
3. **Webhook Notifications** - Real-time alerts for critical changes
4. **Audit Trail Comparison** - Compare changes over time
5. **Rollback Functionality** - Undo permission changes
6. **Compliance Reports** - Pre-built reports for common compliance frameworks

## Related Documentation

- [Permission Management System](./README.md)
- [Permission Matrix Guide](./PERMISSION_MATRIX_GUIDE.md)
- [Role Management Guide](./ROLE_MANAGEMENT_GUIDE.md)
- [Security Best Practices](./SECURITY_GUIDE.md)
