"""
Permission Audit Service

Handles audit logging for all permission-related operations including
permission changes, role assignments, and user permission grants/revocations.
"""

from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from datetime import datetime
from uuid import UUID
import logging

from app.models import User
from app.models.permissions import Permission, Role, PermissionAuditTrail

logger = logging.getLogger(__name__)


class PermissionAuditService:
    """Service for logging and retrieving permission audit trail."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def log_permission_created(
        self,
        permission_id: str,
        permission_name: str,
        user_id: str,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ):
        """Log permission creation."""
        await self._create_audit_entry(
            action="permission_created",
            entity_type="permission",
            entity_id=str(permission_id),
            user_id=str(user_id),
            details={
                "permission_name": permission_name,
                **(details or {})
            },
            ip_address=ip_address
        )
    
    async def log_permission_updated(
        self,
        permission_id: str,
        permission_name: str,
        user_id: str,
        changes: Dict[str, Any],
        ip_address: Optional[str] = None
    ):
        """Log permission update."""
        await self._create_audit_entry(
            action="permission_updated",
            entity_type="permission",
            entity_id=str(permission_id),
            user_id=str(user_id),
            details={
                "permission_name": permission_name,
                "changes": changes
            },
            ip_address=ip_address
        )
    
    async def log_permission_deleted(
        self,
        permission_id: str,
        permission_name: str,
        user_id: str,
        ip_address: Optional[str] = None
    ):
        """Log permission deletion."""
        await self._create_audit_entry(
            action="permission_deleted",
            entity_type="permission",
            entity_id=str(permission_id),
            user_id=str(user_id),
            details={
                "permission_name": permission_name
            },
            ip_address=ip_address
        )
    
    async def log_permission_toggled(
        self,
        permission_id: str,
        permission_name: str,
        user_id: str,
        is_active: bool,
        ip_address: Optional[str] = None
    ):
        """Log permission activation/deactivation."""
        await self._create_audit_entry(
            action="permission_toggled",
            entity_type="permission",
            entity_id=str(permission_id),
            user_id=str(user_id),
            details={
                "permission_name": permission_name,
                "is_active": is_active,
                "action_type": "activated" if is_active else "deactivated"
            },
            ip_address=ip_address
        )
    
    async def log_role_created(
        self,
        role_id: str,
        role_name: str,
        user_id: str,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ):
        """Log role creation."""
        await self._create_audit_entry(
            action="role_created",
            entity_type="role",
            entity_id=str(role_id),
            user_id=str(user_id),
            details={
                "role_name": role_name,
                **(details or {})
            },
            ip_address=ip_address
        )
    
    async def log_role_updated(
        self,
        role_id: str,
        role_name: str,
        user_id: str,
        changes: Dict[str, Any],
        ip_address: Optional[str] = None
    ):
        """Log role update."""
        await self._create_audit_entry(
            action="role_updated",
            entity_type="role",
            entity_id=str(role_id),
            user_id=str(user_id),
            details={
                "role_name": role_name,
                "changes": changes
            },
            ip_address=ip_address
        )
    
    async def log_role_deleted(
        self,
        role_id: str,
        role_name: str,
        user_id: str,
        ip_address: Optional[str] = None
    ):
        """Log role deletion."""
        await self._create_audit_entry(
            action="role_deleted",
            entity_type="role",
            entity_id=str(role_id),
            user_id=str(user_id),
            details={
                "role_name": role_name
            },
            ip_address=ip_address
        )
    
    async def log_role_assigned(
        self,
        role_id: str,
        role_name: str,
        target_user_id: str,
        assigned_by_user_id: str,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None
    ):
        """Log role assignment to user."""
        await self._create_audit_entry(
            action="role_assigned",
            entity_type="user_role",
            entity_id=f"{target_user_id}:{role_id}",
            user_id=str(assigned_by_user_id),
            details={
                "role_id": str(role_id),
                "role_name": role_name,
                "target_user_id": str(target_user_id),
                "reason": reason
            },
            ip_address=ip_address
        )
    
    async def log_role_revoked(
        self,
        role_id: str,
        role_name: str,
        target_user_id: str,
        revoked_by_user_id: str,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None
    ):
        """Log role revocation from user."""
        await self._create_audit_entry(
            action="role_revoked",
            entity_type="user_role",
            entity_id=f"{target_user_id}:{role_id}",
            user_id=str(revoked_by_user_id),
            details={
                "role_id": str(role_id),
                "role_name": role_name,
                "target_user_id": str(target_user_id),
                "reason": reason
            },
            ip_address=ip_address
        )
    
    async def log_permission_granted(
        self,
        permission_id: str,
        permission_name: str,
        target_user_id: str,
        granted_by_user_id: str,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None
    ):
        """Log direct permission grant to user."""
        await self._create_audit_entry(
            action="permission_granted",
            entity_type="user_permission",
            entity_id=f"{target_user_id}:{permission_id}",
            user_id=str(granted_by_user_id),
            details={
                "permission_id": str(permission_id),
                "permission_name": permission_name,
                "target_user_id": str(target_user_id),
                "reason": reason
            },
            ip_address=ip_address
        )
    
    async def log_permission_revoked(
        self,
        permission_id: str,
        permission_name: str,
        target_user_id: str,
        revoked_by_user_id: str,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None
    ):
        """Log direct permission revocation from user."""
        await self._create_audit_entry(
            action="permission_revoked",
            entity_type="user_permission",
            entity_id=f"{target_user_id}:{permission_id}",
            user_id=str(revoked_by_user_id),
            details={
                "permission_id": str(permission_id),
                "permission_name": permission_name,
                "target_user_id": str(target_user_id),
                "reason": reason
            },
            ip_address=ip_address
        )
    
    async def log_role_permission_assigned(
        self,
        role_id: str,
        role_name: str,
        permission_id: str,
        permission_name: str,
        user_id: str,
        ip_address: Optional[str] = None
    ):
        """Log permission assignment to role."""
        await self._create_audit_entry(
            action="role_permission_assigned",
            entity_type="role_permission",
            entity_id=f"{role_id}:{permission_id}",
            user_id=str(user_id),
            details={
                "role_id": str(role_id),
                "role_name": role_name,
                "permission_id": str(permission_id),
                "permission_name": permission_name
            },
            ip_address=ip_address
        )
    
    async def log_role_permission_revoked(
        self,
        role_id: str,
        role_name: str,
        permission_id: str,
        permission_name: str,
        user_id: str,
        ip_address: Optional[str] = None
    ):
        """Log permission revocation from role."""
        await self._create_audit_entry(
            action="role_permission_revoked",
            entity_type="role_permission",
            entity_id=f"{role_id}:{permission_id}",
            user_id=str(user_id),
            details={
                "role_id": str(role_id),
                "role_name": role_name,
                "permission_id": str(permission_id),
                "permission_name": permission_name
            },
            ip_address=ip_address
        )
    
    async def get_audit_trail(
        self,
        page: int = 1,
        size: int = 50,
        action_type: Optional[str] = None,
        entity_type: Optional[str] = None,
        user_id: Optional[str] = None,
        target_user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        search: Optional[str] = None
    ) -> tuple[List[PermissionAuditTrail], int]:
        """
        Retrieve audit trail entries with filtering and pagination.
        
        Returns:
            Tuple of (audit_entries, total_count)
        """
        # Build base query
        query = select(PermissionAuditTrail)
        count_query = select(func.count(PermissionAuditTrail.id))
        
        # Apply filters
        filters = []
        
        if action_type:
            filters.append(PermissionAuditTrail.action == action_type)
        
        if entity_type:
            filters.append(PermissionAuditTrail.entity_type == entity_type)
        
        if user_id:
            filters.append(PermissionAuditTrail.user_id == UUID(user_id))
        
        if target_user_id:
            filters.append(PermissionAuditTrail.target_user_id == UUID(target_user_id))
        
        if start_date:
            filters.append(PermissionAuditTrail.timestamp >= start_date)
        
        if end_date:
            filters.append(PermissionAuditTrail.timestamp <= end_date)
        
        if search:
            # Search in action, entity_type, and details
            search_filter = or_(
                PermissionAuditTrail.action.ilike(f"%{search}%"),
                PermissionAuditTrail.entity_type.ilike(f"%{search}%"),
                PermissionAuditTrail.details.astext.ilike(f"%{search}%")
            )
            filters.append(search_filter)
        
        if filters:
            query = query.where(and_(*filters))
            count_query = count_query.where(and_(*filters))
        
        # Get total count
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0
        
        # Apply pagination and ordering
        query = query.order_by(desc(PermissionAuditTrail.timestamp))
        query = query.offset((page - 1) * size).limit(size)
        
        # Execute query
        result = await self.db.execute(query)
        entries = result.scalars().all()
        
        return entries, total
    
    async def _create_audit_entry(
        self,
        action: str,
        entity_type: str,
        entity_id: Optional[str],
        user_id: str,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ):
        """Create an audit log entry."""
        try:
            # Extract specific IDs from details if available
            target_user_id = None
            target_role_id = None
            permission_id = None
            reason = None
            
            if details:
                if 'target_user_id' in details:
                    try:
                        target_user_id = UUID(details['target_user_id'])
                    except (ValueError, TypeError):
                        pass
                
                if 'role_id' in details:
                    try:
                        target_role_id = UUID(details['role_id'])
                    except (ValueError, TypeError):
                        pass
                
                if 'permission_id' in details:
                    try:
                        permission_id = UUID(details['permission_id'])
                    except (ValueError, TypeError):
                        pass
                
                reason = details.get('reason')
            
            # Convert entity_id to UUID if it's a valid UUID string
            entity_uuid = None
            if entity_id:
                try:
                    entity_uuid = UUID(entity_id)
                except (ValueError, TypeError):
                    # If it's not a valid UUID, leave it as None
                    pass
            
            audit_entry = PermissionAuditTrail(
                action=action,
                entity_type=entity_type,
                entity_id=entity_uuid,
                user_id=UUID(user_id),
                target_user_id=target_user_id,
                target_role_id=target_role_id,
                permission_id=permission_id,
                details=details,
                reason=reason,
                ip_address=ip_address,
                timestamp=datetime.utcnow()
            )
            
            self.db.add(audit_entry)
            await self.db.commit()
            
            logger.info(
                f"Audit log created: action={action}, entity_type={entity_type}, "
                f"entity_id={entity_id}, user_id={user_id}"
            )
        except Exception as e:
            logger.error(f"Failed to create audit log entry: {e}")
            await self.db.rollback()
            # Don't raise - audit logging should not break the main operation
