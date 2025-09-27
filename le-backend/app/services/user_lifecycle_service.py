"""
User Lifecycle Management Service

Handles onboarding workflows, offboarding processes, and lifecycle timeline tracking.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, func, desc
from sqlalchemy.orm import selectinload
from uuid import UUID
import logging

from app.models import User, Department, Branch, Position
from app.services.audit_service import AuditService, ValidationEventType

logger = logging.getLogger(__name__)

class OnboardingStep:
    """Represents an onboarding step"""
    def __init__(self, id: str, title: str, description: str, required: bool = True, 
                 role_specific: Optional[List[str]] = None):
        self.id = id
        self.title = title
        self.description = description
        self.required = required
        self.role_specific = role_specific or []

class UserLifecycleService:
    """Service for managing user lifecycle workflows"""
    
    # Default onboarding checklist
    DEFAULT_ONBOARDING_STEPS = [
        OnboardingStep(
            "profile_completion", 
            "Complete Profile Information",
            "Fill in all required profile details including contact information and emergency contacts"
        ),
        OnboardingStep(
            "system_access", 
            "System Access Setup",
            "Verify system login credentials and initial access to required modules"
        ),
        OnboardingStep(
            "department_introduction", 
            "Department Introduction",
            "Meet with department head and team members"
        ),
        OnboardingStep(
            "role_training", 
            "Role-Specific Training",
            "Complete training materials and assessments for your role",
            role_specific=["manager", "officer"]
        ),
        OnboardingStep(
            "compliance_training", 
            "Compliance & Security Training",
            "Complete mandatory compliance and security awareness training"
        ),
        OnboardingStep(
            "tools_training", 
            "System Tools Training",
            "Learn to use core system tools and workflows"
        ),
        OnboardingStep(
            "mentor_assignment", 
            "Mentor Assignment",
            "Meet with assigned mentor and establish regular check-ins",
            role_specific=["officer"]
        ),
        OnboardingStep(
            "initial_goals", 
            "Set Initial Goals",
            "Work with line manager to set initial performance goals and expectations"
        )
    ]
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit_service = AuditService(db)
    
    async def get_user_onboarding_status(self, user_id: UUID) -> Dict[str, Any]:
        """Get comprehensive onboarding status for a user"""
        
        # Get user with relationships
        result = await self.db.execute(
            select(User)
            .options(
                selectinload(User.department),
                selectinload(User.branch),
                selectinload(User.position),
                selectinload(User.line_manager)
            )
            .where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Get applicable onboarding steps for user role
        applicable_steps = self._get_applicable_steps(user.role)
        
        # Calculate progress
        progress_percentage = 100 if user.onboarding_completed else 0
        
        # Get onboarding timeline
        timeline = await self._get_onboarding_timeline(user_id)
        
        return {
            'user_id': user_id,
            'onboarding_completed': user.onboarding_completed,
            'onboarding_completed_at': user.onboarding_completed_at,
            'progress_percentage': progress_percentage,
            'total_steps': len(applicable_steps),
            'completed_steps': len(applicable_steps) if user.onboarding_completed else 0,
            'applicable_steps': [
                {
                    'id': step.id,
                    'title': step.title,
                    'description': step.description,
                    'required': step.required,
                    'completed': user.onboarding_completed  # For now, all or nothing
                }
                for step in applicable_steps
            ],
            'days_since_creation': (datetime.now(timezone.utc) - user.created_at).days,
            'timeline': timeline,
            'user_info': {
                'username': user.username,
                'email': user.email,
                'full_name': f"{user.first_name} {user.last_name}",
                'role': user.role,
                'department': user.department.name if user.department else None,
                'branch': user.branch.name if user.branch else None,
                'line_manager': f"{user.line_manager.first_name} {user.line_manager.last_name}" if user.line_manager else None
            }
        }
    
    def _get_applicable_steps(self, role: str) -> List[OnboardingStep]:
        """Get onboarding steps applicable to a specific role"""
        applicable_steps = []
        
        for step in self.DEFAULT_ONBOARDING_STEPS:
            # Include step if it's not role-specific or if user's role is in the list
            if not step.role_specific or role in step.role_specific:
                applicable_steps.append(step)
        
        return applicable_steps
    
    async def _get_onboarding_timeline(self, user_id: UUID) -> List[Dict[str, Any]]:
        """Get onboarding timeline events"""
        
        # Get user creation and onboarding completion events
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return []
        
        timeline = [
            {
                'event': 'user_created',
                'title': 'User Account Created',
                'description': 'User account was created in the system',
                'timestamp': user.created_at,
                'type': 'system'
            }
        ]
        
        if user.onboarding_completed_at:
            timeline.append({
                'event': 'onboarding_completed',
                'title': 'Onboarding Completed',
                'description': 'User successfully completed the onboarding process',
                'timestamp': user.onboarding_completed_at,
                'type': 'milestone'
            })
        
        # Sort by timestamp
        timeline.sort(key=lambda x: x['timestamp'])
        
        return timeline
    
    async def complete_onboarding(self, user_id: UUID, completed_by: UUID, notes: Optional[str] = None) -> Dict[str, Any]:
        """Mark user onboarding as complete"""
        
        # Get user
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        if user.onboarding_completed:
            raise ValueError("User onboarding is already completed")
        
        # Update user
        now = datetime.now(timezone.utc)
        user.onboarding_completed = True
        user.onboarding_completed_at = now
        
        await self.db.commit()
        
        # Log audit event
        await self.audit_service.log_validation_event(
            event_type=ValidationEventType.VALIDATION_SUCCESS,
            entity_type="user_lifecycle",
            entity_id=str(user_id),
            field_name="onboarding_status",
            field_value="completed",
            user_id=str(completed_by),
            metadata={
                'target_user_id': str(user_id),
                'target_username': user.username,
                'notes': notes,
                'completion_date': now.isoformat(),
                'days_to_complete': (now - user.created_at).days
            }
        )
        
        logger.info(f"User {user_id} onboarding completed by {completed_by}")
        
        return await self.get_user_onboarding_status(user_id)
    
    async def restart_onboarding(self, user_id: UUID, restarted_by: UUID, reason: Optional[str] = None) -> Dict[str, Any]:
        """Restart user onboarding process"""
        
        # Get user
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Update user
        user.onboarding_completed = False
        user.onboarding_completed_at = None
        
        await self.db.commit()
        
        # Log audit event
        await self.audit_service.log_validation_event(
            event_type=ValidationEventType.VALIDATION_SUCCESS,
            entity_type="user_lifecycle",
            entity_id=str(user_id),
            field_name="onboarding_status",
            field_value="restarted",
            user_id=str(restarted_by),
            metadata={
                'target_user_id': str(user_id),
                'target_username': user.username,
                'reason': reason
            }
        )
        
        logger.info(f"User {user_id} onboarding restarted by {restarted_by}")
        
        return await self.get_user_onboarding_status(user_id)
    
    async def get_onboarding_summary(self, department_id: Optional[UUID] = None, branch_id: Optional[UUID] = None) -> Dict[str, Any]:
        """Get onboarding summary statistics"""
        
        # Base query
        query = select(User)
        
        # Apply filters
        if department_id:
            query = query.where(User.department_id == department_id)
        if branch_id:
            query = query.where(User.branch_id == branch_id)
        
        # Get all users
        result = await self.db.execute(query)
        users = result.scalars().all()
        
        total_users = len(users)
        completed_onboarding = sum(1 for user in users if user.onboarding_completed)
        pending_onboarding = total_users - completed_onboarding
        
        # Calculate average time to complete onboarding
        completed_users = [user for user in users if user.onboarding_completed and user.onboarding_completed_at]
        avg_completion_days = 0
        
        if completed_users:
            total_days = sum((user.onboarding_completed_at - user.created_at).days for user in completed_users)
            avg_completion_days = total_days / len(completed_users)
        
        # Users by onboarding age
        now = datetime.now(timezone.utc)
        pending_users = [user for user in users if not user.onboarding_completed]
        
        overdue_count = sum(1 for user in pending_users if (now - user.created_at).days > 14)  # 14 days threshold
        
        return {
            'total_users': total_users,
            'completed_onboarding': completed_onboarding,
            'pending_onboarding': pending_onboarding,
            'completion_rate': (completed_onboarding / total_users * 100) if total_users > 0 else 0,
            'average_completion_days': round(avg_completion_days, 1),
            'overdue_onboarding': overdue_count,
            'generated_at': now.isoformat()
        }
    
    async def get_users_needing_onboarding(self, days_threshold: int = 7) -> List[Dict[str, Any]]:
        """Get users who need onboarding attention"""
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_threshold)
        
        # Get users who haven't completed onboarding and were created before threshold
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
                    User.created_at <= cutoff_date
                )
            )
            .order_by(User.created_at.asc())
        )
        users = result.scalars().all()
        
        users_info = []
        now = datetime.now(timezone.utc)
        
        for user in users:
            days_pending = (now - user.created_at).days
            users_info.append({
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': f"{user.first_name} {user.last_name}",
                'role': user.role,
                'department': user.department.name if user.department else None,
                'branch': user.branch.name if user.branch else None,
                'line_manager': f"{user.line_manager.first_name} {user.line_manager.last_name}" if user.line_manager else None,
                'created_at': user.created_at,
                'days_pending': days_pending,
                'priority': 'high' if days_pending > 14 else 'medium' if days_pending > 7 else 'normal'
            })
        
        return users_info
    
    async def initiate_offboarding(self, user_id: UUID, initiated_by: UUID, reason: str, 
                                 last_working_day: Optional[datetime] = None) -> Dict[str, Any]:
        """Initiate offboarding process for a user"""
        
        # Get user
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.department), selectinload(User.branch))
            .where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        if user.status == 'archived':
            raise ValueError("User is already in offboarding/archived status")
        
        # Update user status to indicate offboarding
        old_status = user.status
        user.status = 'inactive'  # Set to inactive during offboarding
        user.status_reason = f"Offboarding initiated: {reason}"
        user.status_changed_at = datetime.now(timezone.utc)
        user.status_changed_by = initiated_by
        
        await self.db.commit()
        
        # Log audit event
        await self.audit_service.log_validation_event(
            event_type=ValidationEventType.VALIDATION_SUCCESS,
            entity_type="user_lifecycle",
            entity_id=str(user_id),
            field_name="offboarding_status",
            field_value="initiated",
            user_id=str(initiated_by),
            metadata={
                'target_user_id': str(user_id),
                'target_username': user.username,
                'reason': reason,
                'last_working_day': last_working_day.isoformat() if last_working_day else None,
                'previous_status': old_status
            }
        )
        
        logger.info(f"Offboarding initiated for user {user_id} by {initiated_by}")
        
        return {
            'user_id': user_id,
            'status': 'offboarding_initiated',
            'reason': reason,
            'last_working_day': last_working_day,
            'initiated_at': user.status_changed_at,
            'initiated_by': initiated_by
        }
    
    async def complete_offboarding(self, user_id: UUID, completed_by: UUID, notes: Optional[str] = None) -> Dict[str, Any]:
        """Complete offboarding process and archive user"""
        
        # Get user
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        if user.status == 'archived':
            raise ValueError("User is already archived")
        
        # Archive user
        old_status = user.status
        user.status = 'archived'
        user.status_reason = f"Offboarding completed. {notes or ''}"
        user.status_changed_at = datetime.now(timezone.utc)
        user.status_changed_by = completed_by
        
        await self.db.commit()
        
        # Log audit event
        await self.audit_service.log_validation_event(
            event_type=ValidationEventType.VALIDATION_SUCCESS,
            entity_type="user_lifecycle",
            entity_id=str(user_id),
            field_name="offboarding_status",
            field_value="completed",
            user_id=str(completed_by),
            metadata={
                'target_user_id': str(user_id),
                'target_username': user.username,
                'notes': notes,
                'previous_status': old_status,
                'archived_at': user.status_changed_at.isoformat()
            }
        )
        
        logger.info(f"Offboarding completed for user {user_id} by {completed_by}")
        
        return {
            'user_id': user_id,
            'status': 'archived',
            'archived_at': user.status_changed_at,
            'completed_by': completed_by,
            'notes': notes
        }