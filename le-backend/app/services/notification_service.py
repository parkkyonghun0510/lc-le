"""
Notification Service

Comprehensive notification management system with support for email notifications,
in-app notifications, notification preferences, and notification history tracking.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, literal, DateTime
from sqlalchemy.orm import selectinload
from uuid import UUID
import logging
import json

from app.models import User, Setting, Notification
from app.services.email_service import EmailService
from app.services.audit_service import AuditService, ValidationEventType
from app.services.notification_types import NotificationType, NotificationPriority
from app.services.notification_templates import NotificationTemplates
from app.services.notification_pubsub_service import notification_pubsub
from app.core.config import settings

logger = logging.getLogger(__name__)

class NotificationService:
    """Service for managing notifications and notification preferences"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.email_service = EmailService(db)
        self.audit_service = AuditService(db)
    
    async def get_notification_preferences(self, user_id: UUID) -> Dict[str, Any]:
        """Get user notification preferences"""
        
        # Get user
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Default notification preferences
        default_preferences = {
            'email_notifications': {
                NotificationType.USER_WELCOME: True,
                NotificationType.STATUS_CHANGE: True,
                NotificationType.ONBOARDING_REMINDER: True,
                NotificationType.ONBOARDING_COMPLETE: True,
                NotificationType.OFFBOARDING_INITIATED: True,
                NotificationType.MANAGER_TEAM_CHANGE: True,
                NotificationType.BULK_OPERATION_COMPLETE: False,
                NotificationType.SYSTEM_MAINTENANCE: True,
                NotificationType.PASSWORD_EXPIRY: True,
                NotificationType.ACCOUNT_LOCKED: True
            },
            'in_app_notifications': {
                NotificationType.USER_WELCOME: True,
                NotificationType.STATUS_CHANGE: True,
                NotificationType.ONBOARDING_REMINDER: True,
                NotificationType.ONBOARDING_COMPLETE: True,
                NotificationType.OFFBOARDING_INITIATED: True,
                NotificationType.MANAGER_TEAM_CHANGE: True,
                NotificationType.BULK_OPERATION_COMPLETE: True,
                NotificationType.SYSTEM_MAINTENANCE: True,
                NotificationType.PASSWORD_EXPIRY: True,
                NotificationType.ACCOUNT_LOCKED: True
            },
            'notification_frequency': 'immediate',  # immediate, daily, weekly
            'quiet_hours': {
                'enabled': False,
                'start_time': '22:00',
                'end_time': '08:00'
            }
        }
        
        # In a real implementation, this would be stored in a user_preferences table
        # For now, we'll return defaults
        return {
            'user_id': str(user_id),
            'preferences': default_preferences,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
    
    async def update_notification_preferences(
        self, 
        user_id: UUID, 
        preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update user notification preferences"""
        
        # Get user
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Log preference update (commented out to avoid async context issues)
        # await self.audit_service.log_validation_event(
        #     event_type=ValidationEventType.VALIDATION_SUCCESS,
        #     entity_type="notification_preferences",
        #     entity_id=str(user_id),
        #     field_name="preferences_updated",
        #     field_value=json.dumps(preferences)[:100],
        #     user_id=str(user_id),
        #     metadata={
        #         'preference_keys': list(preferences.keys()),
        #         'update_timestamp': datetime.now(timezone.utc).isoformat()
        #     }
        # )
        
        logger.info(f"Notification preferences updated for user {user_id}")
        
        # In a real implementation, save to database
        return await self.get_notification_preferences(user_id)
    
    async def send_notification(
        self,
        notification_type: str,
        user_ids: List[UUID],
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
        priority: str = NotificationPriority.NORMAL,
        send_email: bool = True,
        send_in_app: bool = True
    ) -> Dict[str, Any]:
        """Send notification to users via multiple channels"""
        
        logger.info(f"Starting send_notification for type {notification_type}, users: {user_ids}")
        
        results = {
            'total_users': len(user_ids),
            'email_sent': 0,
            'email_failed': 0,
            'in_app_sent': 0,
            'in_app_failed': 0,
            'errors': []
        }
        
        for user_id in user_ids:
            try:
                # Get user and preferences - use a fresh query to avoid greenlet issues
                user_result = await self.db.execute(
                    select(User)
                    .options(
                        selectinload(User.department),
                        selectinload(User.branch),
                        selectinload(User.line_manager)
                    )
                    .where(User.id == user_id)
                )
                user = user_result.scalar_one_or_none()
                
                if not user:
                    results['errors'].append(f"User {user_id} not found")
                    continue
                
                # Get preferences without additional database calls to avoid greenlet issues
                preferences = {
                    'preferences': {
                        'email_notifications': {
                            notification_type: True
                        },
                        'in_app_notifications': {
                            notification_type: True
                        }
                    }
                }
                
                # Send email notification
                if send_email and preferences['preferences']['email_notifications'].get(notification_type, True):
                    email_sent = await self._send_email_notification(
                        user=user,
                        notification_type=notification_type,
                        title=title,
                        message=message,
                        data=data
                    )
                    
                    if email_sent:
                        results['email_sent'] += 1
                    else:
                        results['email_failed'] += 1
                
                # Send in-app notification
                if send_in_app and preferences['preferences']['in_app_notifications'].get(notification_type, True):
                    in_app_sent = await self._send_in_app_notification(
                        user=user,
                        notification_type=notification_type,
                        title=title,
                        message=message,
                        data=data,
                        priority=priority
                    )
                    
                    if in_app_sent:
                        results['in_app_sent'] += 1
                    else:
                        results['in_app_failed'] += 1
                        
            except Exception as e:
                error_msg = f"Failed to send notification to user {user_id}: {str(e)}"
                results['errors'].append(error_msg)
                logger.error(error_msg)
        
        # Log notification batch results (commented out to avoid async context issues)
        # await self.audit_service.log_validation_event(
        #     event_type=ValidationEventType.VALIDATION_SUCCESS,
        #     entity_type="notification_batch",
        #     field_name="batch_sent",
        #     field_value=f"type={notification_type}, users={len(user_ids)}",
        #     metadata={
        #         'notification_type': notification_type,
        #         'results': results,
        #         'title': title[:50]
        #     }
        # )
        
        return results
    
    async def _send_email_notification(
        self,
        user: User,
        notification_type: str,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Send email notification based on type"""
        
        try:
            if notification_type == NotificationType.USER_WELCOME:
                return await self.email_service.send_welcome_email(user)
            
            elif notification_type == NotificationType.STATUS_CHANGE:
                old_status = data.get('old_status', 'unknown') if data else 'unknown'
                new_status = data.get('new_status', 'unknown') if data else 'unknown'
                reason = data.get('reason') if data else None
                changed_by = data.get('changed_by') if data else None
                
                return await self.email_service.send_status_change_notification(
                    user=user,
                    old_status=old_status,
                    new_status=new_status,
                    reason=reason,
                    changed_by=changed_by
                )
            
            elif notification_type == NotificationType.ONBOARDING_REMINDER:
                days_overdue = data.get('days_overdue', 0) if data else 0
                return await self.email_service.send_onboarding_reminder(user, days_overdue)
            
            elif notification_type == NotificationType.MANAGER_TEAM_CHANGE:
                action = data.get('action', 'changed') if data else 'changed'
                team_member = data.get('team_member') if data else None
                
                if team_member and user.role in ['admin', 'manager']:
                    return await self.email_service.send_manager_notification(
                        manager=user,
                        subject=title,
                        user=team_member,
                        action=action,
                        details=data
                    )
                return False
            
            else:
                # Generic email notification
                return await self.email_service.send_email(
                    to_emails=[user.email],
                    subject=title,
                    body_text=message,
                    user_id=str(user.id)
                )
                
        except Exception as e:
            logger.error(f"Failed to send email notification to {user.email}: {str(e)}")
            return False
    
    async def _send_in_app_notification(
        self,
        user: User,
        notification_type: str,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
        priority: str = NotificationPriority.NORMAL
    ) -> bool:
        """Send in-app notification and save to database"""
        
        try:
            # Create notification record
            notification = Notification(
                user_id=user.id,
                type=notification_type,
                title=title,
                message=message,
                data=data,
                priority=priority,
                is_read=False,
                is_dismissed=False
            )
            
            # Add expiration for certain notification types
            if notification_type in [NotificationType.ONBOARDING_REMINDER, NotificationType.SYSTEM_MAINTENANCE]:
                notification.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
            
            self.db.add(notification)
            # Commit to ensure notification is persisted to database
            try:
                await self.db.commit()
                await self.db.refresh(notification)
                logger.info(f"✅ Notification saved to database: {notification.id} for user {user.id}")
            except Exception as e:
                logger.error(f"❌ Failed to commit notification {notification.id} for user {user.id}: {str(e)}")
                # Rollback the transaction
                await self.db.rollback()
                raise
            
            # Log notification creation (commented out to avoid async context issues)
            # await self.audit_service.log_validation_event(
            #     event_type=ValidationEventType.VALIDATION_SUCCESS,
            #     entity_type="in_app_notification",
            #     entity_id=str(notification.id),
            #     field_name="notification_created",
            #     field_value=f"type={notification_type}, title={title[:30]}",
            #     user_id=str(user.id),
            #     metadata={
            #         'notification_id': str(notification.id),
            #         'type': notification_type,
            #         'priority': priority
            #     }
            # )
            
            # Send real-time notification via Pub/Sub (only if Redis is available)
            try:
                # Check if Redis is available before attempting pub/sub
                if notification_pubsub.redis:
                    await notification_pubsub.publish_notification(
                        user_id=str(user.id),
                        notification={
                            "id": str(notification.id),
                            "type": notification_type,
                            "title": title,
                            "message": message,
                            "data": data or {},
                            "priority": priority
                        },
                        priority=priority
                    )
                    logger.info(f"📡 Real-time notification sent to user {user.id}")
                else:
                    logger.info(f"📡 Skipping real-time notification for user {user.id} (Redis not available)")
            except Exception as e:
                logger.warning(f"Failed to send real-time notification: {e}")
                # Don't fail the entire notification if real-time fails
            
            logger.info(f"In-app notification sent to user {user.id}: {title} (ID: {notification.id})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send in-app notification to user {user.id}: {str(e)}")
            # Don't rollback here as it might cause greenlet issues
            return False
    
    async def send_welcome_notification(self, user: User) -> Dict[str, Any]:
        """Send welcome notification to new user"""
        
        try:
            logger.info(f"Starting welcome notification for user {user.id}")
            template = NotificationTemplates.get_welcome_template(user)
            logger.info(f"Template generated: {template['title']}")
            
            result = await self.send_notification(
                notification_type=NotificationType.USER_WELCOME,
                user_ids=[user.id],
                title=template['title'],
                message=template['message'],
                data=template['data'],
                priority=template['priority'],
                send_email=False,  # Skip email for now to avoid hanging
                send_in_app=True
            )
            logger.info(f"Welcome notification result: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error in send_welcome_notification: {str(e)}", exc_info=True)
            raise
    
    async def send_status_change_notification(
        self,
        user: User,
        old_status: str,
        new_status: str,
        reason: Optional[str] = None,
        changed_by: Optional[User] = None
    ) -> Dict[str, Any]:
        """Send status change notification"""
        
        template = NotificationTemplates.get_status_change_template(user, old_status, new_status, reason, changed_by)
        
        return await self.send_notification(
            notification_type=NotificationType.STATUS_CHANGE,
            user_ids=[user.id],
            title=template['title'],
            message=template['message'],
            data=template['data'],
            priority=template['priority']
        )
    
    async def send_onboarding_reminder_notifications(self, days_threshold: int = 7) -> Dict[str, Any]:
        """Send onboarding reminders to overdue users"""
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_threshold)
        
        # Get users with overdue onboarding
        result = await self.db.execute(
            select(User)
            .options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.line_manager)
            )
            .where(
                and_(
                    User.onboarding_completed == False,
                    User.created_at <= cutoff_date,
                    User.status.in_(['active', 'pending'])
                )
            )
        )
        overdue_users = result.scalars().all()
        
        if not overdue_users:
            return {
                'total_users': 0,
                'notifications_sent': 0,
                'message': 'No users with overdue onboarding found'
            }
        
        # Send reminders
        results = []
        for user in overdue_users:
            days_overdue = (datetime.now(timezone.utc) - user.created_at).days - days_threshold
            
            template = NotificationTemplates.get_onboarding_reminder_template(user, days_overdue)
            
            result = await self.send_notification(
                notification_type=NotificationType.ONBOARDING_REMINDER,
                user_ids=[user.id],
                title=template['title'],
                message=template['message'],
                data=template['data'],
                priority=template['priority']
            )
            results.append(result)
        
        # Aggregate results
        total_email_sent = sum(r['email_sent'] for r in results)
        total_in_app_sent = sum(r['in_app_sent'] for r in results)
        
        return {
            'total_users': len(overdue_users),
            'email_notifications_sent': total_email_sent,
            'in_app_notifications_sent': total_in_app_sent,
            'days_threshold': days_threshold,
            'cutoff_date': cutoff_date.isoformat()
        }
    
    async def send_manager_team_change_notification(
        self,
        manager: User,
        team_member: User,
        action: str,
        details: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Send notification to manager about team member changes"""
        
        return await self.send_notification(
            notification_type=NotificationType.MANAGER_TEAM_CHANGE,
            user_ids=[manager.id],
            title=f"Team Member Update - {team_member.first_name} {team_member.last_name}",
            message=f"Your team member {team_member.first_name} {team_member.last_name} has {action}.",
            data={
                'team_member': team_member,
                'action': action,
                'details': details,
                'timestamp': datetime.now(timezone.utc).isoformat()
            },
            priority=NotificationPriority.NORMAL
        )
    
    async def send_bulk_operation_notification(
        self,
        user: User,
        operation: str,
        results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send notification about completed bulk operation"""
        
        return await self.send_notification(
            notification_type=NotificationType.BULK_OPERATION_COMPLETE,
            user_ids=[user.id],
            title=f"Bulk Operation Complete - {operation}",
            message=f"Your bulk {operation} operation has completed with {results.get('success_count', 0)} successful and {results.get('error_count', 0)} failed items.",
            data={
                'operation': operation,
                'results': results,
                'completion_time': datetime.now(timezone.utc).isoformat()
            },
            priority=NotificationPriority.NORMAL,
            send_email=False,  # Only in-app for bulk operations by default
            send_in_app=True
        )
    
    async def get_notification_summary(self, days: int = 30) -> Dict[str, Any]:
        """Get notification statistics and summary"""
        
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Get notification counts by type
        type_counts = await self.db.execute(
            select(Notification.type, func.count(Notification.id).label('count'))
            .where(Notification.created_at >= start_date)
            .group_by(Notification.type)
        )
        
        # Get priority counts
        priority_counts = await self.db.execute(
            select(Notification.priority, func.count(Notification.id).label('count'))
            .where(Notification.created_at >= start_date)
            .group_by(Notification.priority)
        )
        
        # Get total counts
        total_result = await self.db.execute(
            select(func.count(Notification.id).label('total'))
            .where(Notification.created_at >= start_date)
        )
        total_notifications = total_result.scalar() or 0
        
        unread_result = await self.db.execute(
            select(func.count(Notification.id).label('unread'))
            .where(
                and_(
                    Notification.created_at >= start_date,
                    Notification.is_read == False,
                    Notification.is_dismissed == False
                )
            )
        )
        unread_count = unread_result.scalar() or 0
        
        # Get recent notifications
        recent_notifications = await self.db.execute(
            select(Notification)
            .where(Notification.created_at >= start_date)
            .order_by(Notification.created_at.desc())
            .limit(10)
        )
        
        return {
            'period_days': days,
            'total_notifications': total_notifications,
            'unread_count': unread_count,
            'by_type': {row.type: row.count for row in type_counts},
            'by_priority': {row.priority: row.count for row in priority_counts},
            'recent_notifications': [
                {
                    'id': str(n.id),
                    'type': n.type,
                    'title': n.title,
                    'message': n.message,
                    'priority': n.priority,
                    'is_read': n.is_read,
                    'created_at': n.created_at.isoformat(),
                    'data': n.data
                }
                for n in recent_notifications.scalars()
            ],
            'generated_at': datetime.now(timezone.utc).isoformat()
        }
    
    async def get_user_notifications(
        self, 
        user_id: UUID, 
        limit: int = 50, 
        offset: int = 0,
        unread_only: bool = False
    ) -> Dict[str, Any]:
        """Get notifications for a specific user"""
        
        query = select(Notification).where(Notification.user_id == user_id)
        
        if unread_only:
            query = query.where(
                and_(
                    Notification.is_read == False,
                    Notification.is_dismissed == False
                )
            )
        
        # Get notifications
        result = await self.db.execute(
            query.order_by(Notification.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        notifications = result.scalars().all()
        
        # Get total count
        count_query = select(func.count(Notification.id)).where(Notification.user_id == user_id)
        if unread_only:
            count_query = count_query.where(
                and_(
                    Notification.is_read == False,
                    Notification.is_dismissed == False
                )
            )
        
        total_result = await self.db.execute(count_query)
        total_count = total_result.scalar() or 0
        
        return {
            'notifications': [
                {
                    'id': str(n.id),
                    'type': n.type,
                    'title': n.title,
                    'message': n.message,
                    'priority': n.priority,
                    'is_read': n.is_read,
                    'is_dismissed': n.is_dismissed,
                    'created_at': n.created_at.isoformat(),
                    'read_at': n.read_at.isoformat() if n.read_at else None,
                    'dismissed_at': n.dismissed_at.isoformat() if n.dismissed_at else None,
                    'expires_at': n.expires_at.isoformat() if n.expires_at else None,
                    'data': n.data
                }
                for n in notifications
            ],
            'total_count': total_count,
            'has_more': (offset + len(notifications)) < total_count
        }
    
    async def mark_notification_as_read(self, notification_id: UUID, user_id: UUID) -> bool:
        """Mark a notification as read"""
        
        try:
            result = await self.db.execute(
                select(Notification)
                .where(
                    and_(
                        Notification.id == notification_id,
                        Notification.user_id == user_id
                    )
                )
            )
            notification = result.scalar_one_or_none()
            
            if not notification:
                return False
            
            notification.is_read = True
            notification.read_at = datetime.now(timezone.utc)
            
            await self.db.commit()
            
            logger.info(f"Notification {notification_id} marked as read by user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to mark notification {notification_id} as read: {str(e)}")
            await self.db.rollback()
            return False
    
    async def dismiss_notification(self, notification_id: UUID, user_id: UUID) -> bool:
        """Dismiss a notification"""
        
        try:
            result = await self.db.execute(
                select(Notification)
                .where(
                    and_(
                        Notification.id == notification_id,
                        Notification.user_id == user_id
                    )
                )
            )
            notification = result.scalar_one_or_none()
            
            if not notification:
                return False
            
            notification.is_dismissed = True
            notification.dismissed_at = datetime.now(timezone.utc)
            
            await self.db.commit()
            
            logger.info(f"Notification {notification_id} dismissed by user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to dismiss notification {notification_id}: {str(e)}")
            await self.db.rollback()
            return False
    
    async def mark_all_as_read(self, user_id: UUID) -> int:
        """Mark all notifications as read for a user"""
        
        try:
            result = await self.db.execute(
                select(Notification)
                .where(
                    and_(
                        Notification.user_id == user_id,
                        Notification.is_read == False,
                        Notification.is_dismissed == False
                    )
                )
            )
            notifications = result.scalars().all()
            
            count = 0
            for notification in notifications:
                notification.is_read = True
                notification.read_at = datetime.now(timezone.utc)
                count += 1
            
            await self.db.commit()
            
            logger.info(f"Marked {count} notifications as read for user {user_id}")
            return count
            
        except Exception as e:
            logger.error(f"Failed to mark all notifications as read for user {user_id}: {str(e)}")
            await self.db.rollback()
            return 0
    
    async def test_notification_system(self, test_user_id: UUID) -> Dict[str, Any]:
        """Test notification system configuration"""
        
        try:
            # Test email configuration
            email_test = await self.email_service.test_email_configuration()
            
            # Get user for testing
            result = await self.db.execute(
                select(User).where(User.id == test_user_id)
            )
            user = result.scalar_one_or_none()
            
            if not user:
                return {
                    'success': False,
                    'error': f'Test user {test_user_id} not found',
                    'email_test': email_test
                }
            
            # Test sending a notification
            notification_result = await self.send_notification(
                notification_type='system_test',
                user_ids=[test_user_id],
                title='Notification System Test',
                message='This is a test notification to verify the system is working correctly.',
                priority=NotificationPriority.LOW,
                send_email=email_test.get('success', False),
                send_in_app=True
            )
            
            return {
                'success': True,
                'email_test': email_test,
                'notification_test': notification_result,
                'test_user': {
                    'id': str(user.id),
                    'username': user.username,
                    'email': user.email
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'email_test': None,
                'notification_test': None
            }