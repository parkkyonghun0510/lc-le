"""
Activity Management Service

Automated service for managing user activity patterns and status updates.
Handles dormant user detection, activity-based status changes, and notifications.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, func
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import logging

from app.models import User, BulkOperation
from app.core.user_status import UserStatus, can_transition_status
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)

class ActivityManagementService:
    """Service for automated user activity management"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit_service = AuditService(db)
    
    async def detect_dormant_users(
        self, 
        inactive_days: int = 90,
        exclude_roles: Optional[List[str]] = None,
        exclude_statuses: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Detect users who haven't logged in for specified number of days
        
        Args:
            inactive_days: Number of days without login to consider dormant
            exclude_roles: Roles to exclude from dormant detection (e.g., ['admin'])
            exclude_statuses: Statuses to exclude (e.g., ['suspended', 'archived'])
        
        Returns:
            List of dormant user information
        """
        if exclude_roles is None:
            exclude_roles = ['admin']  # Don't mark admins as dormant by default
        
        if exclude_statuses is None:
            exclude_statuses = ['suspended', 'archived', 'inactive']
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=inactive_days)
        
        # Query for users who are:
        # 1. Currently active
        # 2. Haven't logged in for X days (or never logged in)
        # 3. Not in excluded roles/statuses
        query = (
            select(User)
            .where(
                and_(
                    User.status == 'active',
                    ~User.role.in_(exclude_roles),
                    ~User.status.in_(exclude_statuses),
                    or_(
                        User.last_login_at < cutoff_date,
                        User.last_login_at.is_(None)
                    )
                )
            )
            .order_by(User.last_login_at.asc().nullsfirst())
        )
        
        result = await self.db.execute(query)
        dormant_users = result.scalars().all()
        
        # Build detailed dormant user information
        dormant_info = []
        for user in dormant_users:
            days_inactive = None
            if user.last_login_at:
                days_inactive = (datetime.now(timezone.utc) - user.last_login_at).days
            else:
                # User has never logged in
                creation_date = user.created_at
                if creation_date:
                    days_inactive = (datetime.now(timezone.utc) - creation_date).days
            
            dormant_info.append({
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': f"{user.first_name} {user.last_name}",
                'role': user.role,
                'status': user.status,
                'department_id': user.department_id,
                'branch_id': user.branch_id,
                'last_login_at': user.last_login_at,
                'login_count': user.login_count or 0,
                'days_inactive': days_inactive,
                'created_at': user.created_at,
                'risk_level': self._calculate_dormancy_risk(user, days_inactive)
            })
        
        logger.info(f"Detected {len(dormant_info)} dormant users (inactive for {inactive_days}+ days)")
        return dormant_info
    
    def _calculate_dormancy_risk(self, user: User, days_inactive: Optional[int]) -> str:
        """Calculate risk level based on inactivity period"""
        if days_inactive is None:
            return "high"  # Never logged in
        
        if days_inactive >= 180:  # 6+ months
            return "critical"
        elif days_inactive >= 120:  # 4+ months
            return "high"
        elif days_inactive >= 90:  # 3+ months
            return "medium"
        else:
            return "low"
    
    async def auto_update_dormant_users(
        self,
        dormant_users: List[Dict[str, Any]],
        new_status: str = 'inactive',
        reason: str = "Automatically marked inactive due to prolonged inactivity",
        performed_by_id: Optional[str] = None,
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """
        Automatically update status of dormant users
        
        Args:
            dormant_users: List of dormant user data from detect_dormant_users
            new_status: Status to assign to dormant users
            reason: Reason for the status change
            performed_by_id: ID of user/system performing the update
            dry_run: If True, only simulate the operation without making changes
        
        Returns:
            Summary of the operation
        """
        if not dormant_users:
            return {
                'total_users': 0,
                'eligible_users': 0,
                'successful_updates': 0,
                'failed_updates': 0,
                'errors': [],
                'dry_run': dry_run
            }
        
        # Filter users who can transition to the new status
        eligible_users = []
        transition_errors = []
        
        for user_info in dormant_users:
            current_status = user_info['status']
            if can_transition_status(current_status, new_status):
                eligible_users.append(user_info)
            else:
                transition_errors.append({
                    'user_id': user_info['user_id'],
                    'username': user_info['username'],
                    'error': f"Cannot transition from '{current_status}' to '{new_status}'"
                })
        
        if dry_run:
            return {
                'total_users': len(dormant_users),
                'eligible_users': len(eligible_users),
                'successful_updates': 0,
                'failed_updates': len(transition_errors),
                'errors': transition_errors,
                'dry_run': True,
                'eligible_user_ids': [u['user_id'] for u in eligible_users]
            }
        
        # Create bulk operation record
        bulk_operation = BulkOperation(
            operation_type="automated_status_update",
            performed_by=performed_by_id,
            target_criteria={
                "filter": "dormant_users",
                "criteria": "automated_activity_management"
            },
            changes_applied={
                "new_status": new_status,
                "reason": reason,
                "automation": True
            },
            total_records=len(eligible_users),
            status="processing"
        )
        self.db.add(bulk_operation)
        await self.db.commit()
        await self.db.refresh(bulk_operation)
        
        # Process updates
        successful_updates = []
        failed_updates = []
        now = datetime.now(timezone.utc)
        
        try:
            for user_info in eligible_users:
                try:
                    # Get fresh user data
                    result = await self.db.execute(
                        select(User).where(User.id == user_info['user_id'])
                    )
                    user = result.scalar_one_or_none()
                    
                    if not user:
                        failed_updates.append({
                            'user_id': user_info['user_id'],
                            'error': 'User not found'
                        })
                        continue
                    
                    # Update user status
                    old_status = user.status
                    user.status = new_status
                    user.status_reason = reason
                    user.status_changed_at = now
                    user.status_changed_by = performed_by_id
                    
                    successful_updates.append({
                        'user_id': user.id,
                        'username': user.username,
                        'old_status': old_status,
                        'new_status': new_status,
                        'days_inactive': user_info['days_inactive']
                    })
                    
                except Exception as e:
                    failed_updates.append({
                        'user_id': user_info['user_id'],
                        'error': str(e)
                    })
            
            # Update bulk operation record
            bulk_operation.successful_records = len(successful_updates)
            bulk_operation.failed_records = len(failed_updates) + len(transition_errors)
            bulk_operation.status = "completed" if len(failed_updates) == 0 else "partial_failure"
            bulk_operation.completed_at = now
            
            if failed_updates or transition_errors:
                bulk_operation.error_details = {
                    "failed_updates": failed_updates,
                    "transition_errors": transition_errors
                }
            
            await self.db.commit()
            
            logger.info(f"Automated dormant user update completed: {len(successful_updates)} updated, {len(failed_updates)} failed")
            
            return {
                'operation_id': bulk_operation.id,
                'total_users': len(dormant_users),
                'eligible_users': len(eligible_users),
                'successful_updates': len(successful_updates),
                'failed_updates': len(failed_updates) + len(transition_errors),
                'errors': failed_updates + transition_errors,
                'successful_user_updates': successful_updates,
                'dry_run': False
            }
            
        except Exception as e:
            # Mark operation as failed
            bulk_operation.status = "failed"
            bulk_operation.error_details = {"error": str(e)}
            bulk_operation.completed_at = now
            await self.db.commit()
            
            logger.error(f"Automated dormant user update failed: {str(e)}")
            raise
    
    async def get_activity_summary(self, days: int = 30) -> Dict[str, Any]:
        """
        Get user activity summary for the specified period
        
        Args:
            days: Number of days to analyze
            
        Returns:
            Activity summary statistics
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Total users by status
        status_query = (
            select(User.status, func.count(User.id).label('count'))
            .group_by(User.status)
        )
        status_result = await self.db.execute(status_query)
        status_counts = {row.status: row.count for row in status_result}
        
        # Active users who logged in recently
        active_recent_query = (
            select(func.count(User.id))
            .where(
                and_(
                    User.status == 'active',
                    User.last_login_at >= cutoff_date
                )
            )
        )
        active_recent_result = await self.db.execute(active_recent_query)
        active_recent_count = active_recent_result.scalar() or 0
        
        # Users who never logged in
        never_logged_query = (
            select(func.count(User.id))
            .where(User.last_login_at.is_(None))
        )
        never_logged_result = await self.db.execute(never_logged_query)
        never_logged_count = never_logged_result.scalar() or 0
        
        # Users by activity level
        now = datetime.now(timezone.utc)
        activity_levels = {
            "highly_active": 0,  # Logged in within 7 days
            "moderately_active": 0,  # Logged in within 30 days
            "low_activity": 0,  # Logged in within 90 days
            "dormant": 0,  # No login for 90+ days
            "never_logged": never_logged_count
        }
        
        # Calculate activity levels
        for threshold_days, level in [(7, "highly_active"), (30, "moderately_active"), (90, "low_activity")]:
            threshold_date = now - timedelta(days=threshold_days)
            query = (
                select(func.count(User.id))
                .where(
                    and_(
                        User.status == 'active',
                        User.last_login_at >= threshold_date
                    )
                )
            )
            result = await self.db.execute(query)
            activity_levels[level] = result.scalar() or 0
        
        # Dormant users (90+ days)
        dormant_threshold = now - timedelta(days=90)
        dormant_query = (
            select(func.count(User.id))
            .where(
                and_(
                    User.status == 'active',
                    or_(
                        User.last_login_at < dormant_threshold,
                        User.last_login_at.is_(None)
                    )
                )
            )
        )
        dormant_result = await self.db.execute(dormant_query)
        activity_levels["dormant"] = dormant_result.scalar() or 0
        
        return {
            'analysis_period_days': days,
            'total_users': sum(status_counts.values()),
            'status_distribution': status_counts,
            'activity_levels': activity_levels,
            'active_recent_count': active_recent_count,
            'never_logged_count': never_logged_count,
            'generated_at': now.isoformat()
        }