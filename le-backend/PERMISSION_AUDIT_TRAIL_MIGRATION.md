# Permission Audit Trail Migration

## Overview

This migration adds a comprehensive audit trail system for tracking all permission-related changes in the application. The `permission_audit_trail` table captures detailed information about who made changes, what was changed, and when.

## Migration Details

- **Migration File**: `migrations/versions/20250119_add_permission_audit_trail.py`
- **Revision ID**: `20250119_permission_audit_trail`
- **Previous Revision**: `20251016_managers_to_employees`
- **Model File**: `app/models/permissions.py` (PermissionAuditTrail class)

## Database Changes

### New Table: `permission_audit_trail`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | BIGINT | NO | Primary key (auto-increment) |
| action | VARCHAR(50) | NO | Action performed (e.g., 'role_created', 'permission_granted') |
| entity_type | VARCHAR(50) | NO | Type of entity affected (e.g., 'role', 'permission', 'user') |
| entity_id | UUID | YES | ID of the affected entity |
| user_id | UUID | YES | User who performed the action (FK to users.id) |
| target_user_id | UUID | YES | User affected by the action (FK to users.id) |
| target_role_id | UUID | YES | Role affected by the action (FK to roles.id) |
| permission_id | UUID | YES | Permission affected by the action (FK to permissions.id) |
| details | JSONB | YES | Additional details about the change (before/after values) |
| reason | TEXT | YES | Reason for the change |
| ip_address | VARCHAR(45) | YES | IP address of the requester |
| timestamp | TIMESTAMP WITH TIME ZONE | NO | When the action occurred (default: now()) |

### Foreign Key Constraints

1. **fk_audit_user_id**: `user_id` → `users.id` (ON DELETE SET NULL)
2. **fk_audit_target_user_id**: `target_user_id` → `users.id` (ON DELETE SET NULL)
3. **fk_audit_target_role_id**: `target_role_id` → `roles.id` (ON DELETE SET NULL)
4. **fk_audit_permission_id**: `permission_id` → `permissions.id` (ON DELETE SET NULL)

### Indexes

1. **ix_audit_action**: Index on `action` column for filtering by action type
2. **ix_audit_entity**: Composite index on `(entity_type, entity_id)` for entity lookups
3. **ix_audit_user_id**: Index on `user_id` for filtering by user
4. **ix_audit_timestamp**: Index on `timestamp` for time-based queries

## Usage Examples

### Logging a Role Creation

```python
from app.models.permissions import PermissionAuditTrail
from sqlalchemy.ext.asyncio import AsyncSession

async def log_role_creation(db: AsyncSession, role_id: UUID, user_id: UUID, ip_address: str):
    audit_entry = PermissionAuditTrail(
        action="role_created",
        entity_type="role",
        entity_id=role_id,
        user_id=user_id,
        target_role_id=role_id,
        details={"role_name": "Branch Manager", "level": 80},
        reason="Standard role creation during system setup",
        ip_address=ip_address
    )
    db.add(audit_entry)
    await db.commit()
```

### Logging a Permission Grant

```python
async def log_permission_grant(
    db: AsyncSession,
    user_id: UUID,
    target_user_id: UUID,
    permission_id: UUID,
    ip_address: str
):
    audit_entry = PermissionAuditTrail(
        action="permission_granted",
        entity_type="user_permission",
        user_id=user_id,
        target_user_id=target_user_id,
        permission_id=permission_id,
        details={
            "permission_name": "APPLICATION.APPROVE.DEPARTMENT",
            "scope": "department"
        },
        reason="User promoted to department manager",
        ip_address=ip_address
    )
    db.add(audit_entry)
    await db.commit()
```

### Querying Audit Trail

```python
from sqlalchemy import select
from datetime import datetime, timedelta

# Get all actions by a specific user in the last 30 days
async def get_user_audit_trail(db: AsyncSession, user_id: UUID):
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    query = select(PermissionAuditTrail).where(
        PermissionAuditTrail.user_id == user_id,
        PermissionAuditTrail.timestamp >= thirty_days_ago
    ).order_by(PermissionAuditTrail.timestamp.desc())
    
    result = await db.execute(query)
    return result.scalars().all()

# Get all changes to a specific role
async def get_role_audit_trail(db: AsyncSession, role_id: UUID):
    query = select(PermissionAuditTrail).where(
        PermissionAuditTrail.target_role_id == role_id
    ).order_by(PermissionAuditTrail.timestamp.desc())
    
    result = await db.execute(query)
    return result.scalars().all()
```

## Running the Migration

### Apply Migration (Upgrade)

```bash
cd le-backend
alembic upgrade head
```

Or using the migrate script:

```bash
cd le-backend
python migrate.py
```

### Rollback Migration (Downgrade)

```bash
cd le-backend
alembic downgrade -1
```

This will:
1. Drop all indexes
2. Drop all foreign key constraints
3. Drop the `permission_audit_trail` table

## Testing the Migration

A test script is provided to verify the migration was applied correctly:

```bash
cd le-backend
python test_audit_trail_migration.py
```

The test script will:
1. Check if the table exists
2. Verify all expected columns are present
3. Verify all indexes are created
4. Verify all foreign key constraints are in place

## Action Types

Common action types that should be logged:

- **role_created**: New role created
- **role_updated**: Role modified
- **role_deleted**: Role deleted
- **permission_created**: New permission created
- **permission_updated**: Permission modified
- **permission_deleted**: Permission deleted
- **permission_granted**: Permission granted to user
- **permission_revoked**: Permission revoked from user
- **role_assigned**: Role assigned to user
- **role_unassigned**: Role removed from user
- **template_created**: Permission template created
- **template_applied**: Template applied to user/role
- **template_updated**: Template modified
- **template_deleted**: Template deleted

## Entity Types

Common entity types:

- **role**: Role entity
- **permission**: Permission entity
- **user**: User entity
- **user_role**: User-role assignment
- **user_permission**: User-permission assignment
- **role_permission**: Role-permission assignment
- **template**: Permission template

## Performance Considerations

1. **Indexes**: The migration creates indexes on frequently queried columns (action, user_id, timestamp, entity_type/entity_id)
2. **JSONB**: The `details` column uses JSONB for efficient storage and querying of structured data
3. **Partitioning**: For high-volume systems, consider partitioning the table by timestamp
4. **Archival**: Implement a data retention policy to archive old audit records

## Security Considerations

1. **Immutability**: Audit trail records should never be updated or deleted (except for data retention policies)
2. **Access Control**: Only administrators should have read access to the audit trail
3. **PII**: Be careful not to log sensitive personal information in the `details` field
4. **IP Logging**: IP addresses are logged for security tracking

## Compliance

This audit trail helps meet compliance requirements for:

- **SOC 2**: Access control monitoring
- **GDPR**: Data access tracking
- **HIPAA**: Audit trail requirements
- **ISO 27001**: Security event logging

## Next Steps

After applying this migration, you should:

1. Update the permission service to log all permission changes
2. Create API endpoints for viewing the audit trail
3. Implement audit trail filtering and export functionality
4. Set up monitoring and alerting for suspicious permission changes
5. Establish a data retention policy for audit records

## Troubleshooting

### Migration Fails

If the migration fails, check:

1. Database connection is working
2. User has CREATE TABLE permissions
3. Referenced tables (users, roles, permissions) exist
4. No conflicting table or index names

### Performance Issues

If audit trail queries are slow:

1. Verify indexes are created correctly
2. Consider adding additional indexes based on query patterns
3. Implement table partitioning for large datasets
4. Archive old records to a separate table

## Related Files

- Migration: `migrations/versions/20250119_add_permission_audit_trail.py`
- Model: `app/models/permissions.py` (PermissionAuditTrail class)
- Test: `test_audit_trail_migration.py`
- Requirements: `.kiro/specs/permission-templates-and-role-seeding/requirements.md` (Requirement 7)
- Design: `.kiro/specs/permission-templates-and-role-seeding/design.md`
