"""
User Analytics Service

Comprehensive analytics service for user activity metrics, organizational insights,
and performance tracking with advanced data aggregation and visualization support.
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, case, text
from sqlalchemy.orm import selectinload
from uuid import UUID
import logging
import json

from app.models import User, Department, Branch, Position, CustomerApplication
from app.models.audit import AuditLog
from app.services.audit_service import AuditService, ValidationEventType
from app.core.config import settings

logger = logging.getLogger(__name__)

class UserAnalyticsService:
    """Service for user activity analytics and organizational metrics"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit_service = AuditService(db)
    
    async def get_user_activity_metrics(
        self, 
        days: int = 30,
        department_id: Optional[UUID] = None,
        branch_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """Get comprehensive user activity metrics"""
        
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        # Base query with filters
        base_query = select(User).options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position)
        )
        
        if department_id:
            base_query = base_query.where(User.department_id == department_id)
        if branch_id:
            base_query = base_query.where(User.branch_id == branch_id)
        
        # Get all users
        result = await self.db.execute(base_query)
        all_users = result.scalars().all()
        
        # Calculate activity metrics
        metrics = {
            'overview': await self._calculate_activity_overview(all_users, days),
            'login_patterns': await self._analyze_login_patterns(all_users, start_date, end_date),
            'role_distribution': await self._analyze_role_distribution(all_users),
            'status_distribution': await self._analyze_status_distribution(all_users),
            'activity_levels': await self._categorize_activity_levels(all_users),
            'onboarding_metrics': await self._analyze_onboarding_metrics(all_users),
            'geographic_distribution': await self._analyze_geographic_distribution(all_users),
            'productivity_metrics': await self._calculate_productivity_metrics(all_users, start_date, end_date),
            'trends': await self._calculate_activity_trends(days, department_id, branch_id),
            'generated_at': end_date.isoformat(),
            'period_days': days,
            'filters': {
                'department_id': str(department_id) if department_id else None,
                'branch_id': str(branch_id) if branch_id else None
            }
        }
        
        # Log analytics access
        await self.audit_service.log_validation_event(
            event_type=ValidationEventType.VALIDATION_SUCCESS,
            entity_type="user_analytics",
            field_name="metrics_generated",
            field_value=f"days={days}, users={len(all_users)}",
            metadata={
                'metrics_type': 'activity_metrics',
                'user_count': len(all_users),
                'period_days': days,
                'department_filter': str(department_id) if department_id else None,
                'branch_filter': str(branch_id) if branch_id else None
            }
        )
        
        return metrics
    
    async def _calculate_activity_overview(self, users: List[User], days: int) -> Dict[str, Any]:
        """Calculate high-level activity overview"""
        
        now = datetime.now(timezone.utc)
        total_users = len(users)
        
        # Activity categories
        active_last_7_days = 0
        active_last_30_days = 0
        dormant_users = 0
        never_logged_in = 0
        
        for user in users:
            if user.last_login_at is None:
                never_logged_in += 1
            else:
                days_since_login = (now - user.last_login_at).days
                if days_since_login <= 7:
                    active_last_7_days += 1
                if days_since_login <= 30:
                    active_last_30_days += 1
                if days_since_login >= 90:
                    dormant_users += 1
        
        # Calculate percentages
        active_7_day_rate = (active_last_7_days / total_users * 100) if total_users > 0 else 0
        active_30_day_rate = (active_last_30_days / total_users * 100) if total_users > 0 else 0
        dormancy_rate = (dormant_users / total_users * 100) if total_users > 0 else 0
        
        return {
            'total_users': total_users,
            'active_last_7_days': active_last_7_days,
            'active_last_30_days': active_last_30_days,
            'dormant_users': dormant_users,
            'never_logged_in': never_logged_in,
            'activity_rates': {
                'active_7_day_rate': round(active_7_day_rate, 2),
                'active_30_day_rate': round(active_30_day_rate, 2),
                'dormancy_rate': round(dormancy_rate, 2),
                'never_logged_rate': round((never_logged_in / total_users * 100) if total_users > 0 else 0, 2)
            }
        }
    
    async def _analyze_login_patterns(self, users: List[User], start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Analyze login patterns and frequency"""
        
        # Login frequency analysis
        login_frequency = {
            'daily_active': 0,
            'weekly_active': 0,
            'monthly_active': 0,
            'infrequent': 0
        }
        
        total_logins = 0
        users_with_logins = 0
        
        for user in users:
            if user.last_login_at and user.login_count:
                users_with_logins += 1
                total_logins += user.login_count
                
                # Estimate login frequency based on account age and login count
                account_age_days = (datetime.now(timezone.utc) - user.created_at).days
                if account_age_days > 0:
                    avg_logins_per_day = user.login_count / account_age_days
                    
                    if avg_logins_per_day >= 1:
                        login_frequency['daily_active'] += 1
                    elif avg_logins_per_day >= 0.14:  # ~1 per week
                        login_frequency['weekly_active'] += 1
                    elif avg_logins_per_day >= 0.03:  # ~1 per month
                        login_frequency['monthly_active'] += 1
                    else:
                        login_frequency['infrequent'] += 1
        
        avg_logins_per_user = (total_logins / users_with_logins) if users_with_logins > 0 else 0
        
        return {
            'login_frequency_distribution': login_frequency,
            'total_logins': total_logins,
            'users_with_logins': users_with_logins,
            'average_logins_per_user': round(avg_logins_per_user, 2),
            'login_engagement_rate': round((users_with_logins / len(users) * 100) if len(users) > 0 else 0, 2)
        }
    
    async def _analyze_role_distribution(self, users: List[User]) -> Dict[str, Any]:
        """Analyze user role distribution"""
        
        role_counts = {}
        role_activity = {}
        
        for user in users:
            role = user.role
            role_counts[role] = role_counts.get(role, 0) + 1
            
            # Calculate role activity
            if role not in role_activity:
                role_activity[role] = {
                    'total': 0,
                    'active': 0,
                    'login_count': 0
                }
            
            role_activity[role]['total'] += 1
            if user.status == 'active':
                role_activity[role]['active'] += 1
            if user.login_count:
                role_activity[role]['login_count'] += user.login_count
        
        # Calculate activity rates by role
        for role in role_activity:
            total = role_activity[role]['total']
            active = role_activity[role]['active']
            role_activity[role]['activity_rate'] = round((active / total * 100) if total > 0 else 0, 2)
            role_activity[role]['avg_logins'] = round((role_activity[role]['login_count'] / total) if total > 0 else 0, 2)
        
        return {
            'role_counts': role_counts,
            'role_activity_metrics': role_activity,
            'total_roles': len(role_counts)
        }
    
    async def _analyze_status_distribution(self, users: List[User]) -> Dict[str, Any]:
        """Analyze user status distribution"""
        
        status_counts = {}
        status_trends = {}
        
        for user in users:
            status = user.status
            status_counts[status] = status_counts.get(status, 0) + 1
            
            # Analyze status change timing
            if user.status_changed_at:
                days_in_status = (datetime.now(timezone.utc) - user.status_changed_at).days
                if status not in status_trends:
                    status_trends[status] = {
                        'recent_changes': 0,  # Last 7 days
                        'avg_days_in_status': 0,
                        'total_days': 0,
                        'count': 0
                    }
                
                if days_in_status <= 7:
                    status_trends[status]['recent_changes'] += 1
                
                status_trends[status]['total_days'] += days_in_status
                status_trends[status]['count'] += 1
        
        # Calculate averages
        for status in status_trends:
            count = status_trends[status]['count']
            if count > 0:
                status_trends[status]['avg_days_in_status'] = round(
                    status_trends[status]['total_days'] / count, 1
                )
        
        return {
            'status_counts': status_counts,
            'status_trends': status_trends,
            'total_statuses': len(status_counts)
        }
    
    async def _categorize_activity_levels(self, users: List[User]) -> Dict[str, Any]:
        """Categorize users by activity level"""
        
        now = datetime.now(timezone.utc)
        
        categories = {
            'highly_active': [],      # Last 7 days
            'moderately_active': [],  # 8-30 days
            'low_activity': [],       # 31-90 days
            'dormant': [],            # 90+ days
            'never_logged_in': []     # Never logged in
        }
        
        for user in users:
            user_info = {
                'id': str(user.id),
                'username': user.username,
                'email': user.email,
                'name': f"{user.first_name} {user.last_name}",
                'role': user.role,
                'status': user.status,
                'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None,
                'login_count': user.login_count or 0,
                'department': user.department.name if user.department else None,
                'branch': user.branch.name if user.branch else None
            }
            
            if user.last_login_at is None:
                categories['never_logged_in'].append(user_info)
            else:
                days_since_login = (now - user.last_login_at).days
                
                if days_since_login <= 7:
                    categories['highly_active'].append(user_info)
                elif days_since_login <= 30:
                    categories['moderately_active'].append(user_info)
                elif days_since_login <= 90:
                    categories['low_activity'].append(user_info)
                else:
                    categories['dormant'].append(user_info)
        
        # Add counts
        category_counts = {
            category: len(users_list) 
            for category, users_list in categories.items()
        }
        
        return {
            'categories': categories,
            'category_counts': category_counts
        }
    
    async def _analyze_onboarding_metrics(self, users: List[User]) -> Dict[str, Any]:
        """Analyze onboarding completion metrics"""
        
        total_users = len(users)
        completed_onboarding = 0
        pending_onboarding = 0
        avg_onboarding_days = 0
        total_onboarding_days = 0
        onboarding_completed_count = 0
        
        for user in users:
            if user.onboarding_completed:
                completed_onboarding += 1
                if user.onboarding_completed_at:
                    onboarding_days = (user.onboarding_completed_at - user.created_at).days
                    total_onboarding_days += onboarding_days
                    onboarding_completed_count += 1
            else:
                pending_onboarding += 1
        
        if onboarding_completed_count > 0:
            avg_onboarding_days = total_onboarding_days / onboarding_completed_count
        
        completion_rate = (completed_onboarding / total_users * 100) if total_users > 0 else 0
        
        return {
            'total_users': total_users,
            'completed_onboarding': completed_onboarding,
            'pending_onboarding': pending_onboarding,
            'completion_rate': round(completion_rate, 2),
            'average_onboarding_days': round(avg_onboarding_days, 1)
        }
    
    async def _analyze_geographic_distribution(self, users: List[User]) -> Dict[str, Any]:
        """Analyze user distribution by department and branch"""
        
        department_distribution = {}
        branch_distribution = {}
        
        for user in users:
            # Department distribution
            dept_name = user.department.name if user.department else 'Unassigned'
            if dept_name not in department_distribution:
                department_distribution[dept_name] = {
                    'total_users': 0,
                    'active_users': 0,
                    'roles': {}
                }
            
            department_distribution[dept_name]['total_users'] += 1
            if user.status == 'active':
                department_distribution[dept_name]['active_users'] += 1
            
            role = user.role
            department_distribution[dept_name]['roles'][role] = \
                department_distribution[dept_name]['roles'].get(role, 0) + 1
            
            # Branch distribution
            branch_name = user.branch.name if user.branch else 'Unassigned'
            if branch_name not in branch_distribution:
                branch_distribution[branch_name] = {
                    'total_users': 0,
                    'active_users': 0,
                    'roles': {}
                }
            
            branch_distribution[branch_name]['total_users'] += 1
            if user.status == 'active':
                branch_distribution[branch_name]['active_users'] += 1
            
            branch_distribution[branch_name]['roles'][role] = \
                branch_distribution[branch_name]['roles'].get(role, 0) + 1
        
        return {
            'department_distribution': department_distribution,
            'branch_distribution': branch_distribution,
            'total_departments': len([d for d in department_distribution.keys() if d != 'Unassigned']),
            'total_branches': len([b for b in branch_distribution.keys() if b != 'Unassigned'])
        }
    
    async def _calculate_productivity_metrics(self, users: List[User], start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Calculate user productivity metrics based on application activity"""
        
        # Get applications created in the period
        app_query = select(CustomerApplication).where(
            and_(
                CustomerApplication.created_at >= start_date,
                CustomerApplication.created_at <= end_date
            )
        )
        
        result = await self.db.execute(app_query)
        applications = result.scalars().all()
        
        user_productivity = {}
        
        for app in applications:
            user_id = str(app.user_id)
            if user_id not in user_productivity:
                user_productivity[user_id] = {
                    'applications_created': 0,
                    'applications_approved': 0,
                    'applications_rejected': 0,
                    'total_requested_amount': 0
                }
            
            user_productivity[user_id]['applications_created'] += 1
            if app.status == 'approved':
                user_productivity[user_id]['applications_approved'] += 1
            elif app.status == 'rejected':
                user_productivity[user_id]['applications_rejected'] += 1
            
            if app.requested_amount:
                user_productivity[user_id]['total_requested_amount'] += float(app.requested_amount)
        
        # Calculate averages
        total_apps = len(applications)
        active_users = len(user_productivity)
        avg_apps_per_active_user = (total_apps / active_users) if active_users > 0 else 0
        
        return {
            'total_applications': total_apps,
            'active_users': active_users,
            'average_applications_per_active_user': round(avg_apps_per_active_user, 2),
            'user_productivity': user_productivity
        }
    
    async def _calculate_activity_trends(self, days: int, department_id: Optional[UUID], branch_id: Optional[UUID]) -> Dict[str, Any]:
        """Calculate activity trends over time"""
        
        now = datetime.now(timezone.utc)
        trends = []
        
        # Calculate daily activity for the past 'days' period
        for i in range(days):
            date = now - timedelta(days=i)
            day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            # Count users created on this day
            user_query = select(func.count(User.id)).where(
                and_(
                    User.created_at >= day_start,
                    User.created_at < day_end
                )
            )
            
            if department_id:
                user_query = user_query.where(User.department_id == department_id)
            if branch_id:
                user_query = user_query.where(User.branch_id == branch_id)
            
            result = await self.db.execute(user_query)
            users_created = result.scalar() or 0
            
            trends.append({
                'date': day_start.date().isoformat(),
                'users_created': users_created
            })
        
        # Reverse to have oldest first
        trends.reverse()
        
        return {
            'daily_trends': trends,
            'period_days': days
        }
    
    async def get_organizational_metrics(self) -> Dict[str, Any]:
        """Get comprehensive organizational metrics"""
        
        # Department metrics
        dept_query = select(Department).options(selectinload(Department.users))
        dept_result = await self.db.execute(dept_query)
        departments = dept_result.scalars().all()
        
        # Branch metrics
        branch_query = select(Branch).options(selectinload(Branch.users))
        branch_result = await self.db.execute(branch_query)
        branches = branch_result.scalars().all()
        
        # Position metrics
        position_query = select(Position).options(selectinload(Position.users))
        position_result = await self.db.execute(position_query)
        positions = position_result.scalars().all()
        
        dept_metrics = []
        for dept in departments:
            active_users = len([u for u in dept.users if u.status == 'active'])
            total_users = len(dept.users)
            
            dept_metrics.append({
                'id': str(dept.id),
                'name': dept.name,
                'code': dept.code,
                'total_users': total_users,
                'active_users': active_users,
                'activity_rate': round((active_users / total_users * 100) if total_users > 0 else 0, 2),
                'is_active': dept.is_active,
                'manager_id': str(dept.manager_id) if dept.manager_id else None
            })
        
        branch_metrics = []
        for branch in branches:
            active_users = len([u for u in branch.users if u.status == 'active'])
            total_users = len(branch.users)
            
            branch_metrics.append({
                'id': str(branch.id),
                'name': branch.name,
                'code': branch.code,
                'total_users': total_users,
                'active_users': active_users,
                'activity_rate': round((active_users / total_users * 100) if total_users > 0 else 0, 2),
                'is_active': branch.is_active,
                'manager_id': str(branch.manager_id) if branch.manager_id else None
            })
        
        position_metrics = []
        for position in positions:
            active_users = len([u for u in position.users if u.status == 'active'])
            total_users = len(position.users)
            
            position_metrics.append({
                'id': str(position.id),
                'name': position.name,
                'total_users': total_users,
                'active_users': active_users,
                'activity_rate': round((active_users / total_users * 100) if total_users > 0 else 0, 2),
                'is_active': position.is_active
            })
        
        return {
            'departments': dept_metrics,
            'branches': branch_metrics,
            'positions': position_metrics,
            'summary': {
                'total_departments': len(departments),
                'active_departments': len([d for d in departments if d.is_active]),
                'total_branches': len(branches),
                'active_branches': len([b for b in branches if b.is_active]),
                'total_positions': len(positions),
                'active_positions': len([p for p in positions if p.is_active])
            },
            'generated_at': datetime.now(timezone.utc).isoformat()
        }
    
    async def get_user_performance_dashboard(self, user_id: UUID, days: int = 90) -> Dict[str, Any]:
        """Get individual user performance dashboard"""
        
        # Get user with relationships
        user_query = select(User).options(
            selectinload(User.department),
            selectinload(User.branch),
            selectinload(User.position),
            selectinload(User.applications)
        ).where(User.id == user_id)
        
        result = await self.db.execute(user_query)
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        # Get user's applications in the period
        apps_in_period = [
            app for app in user.applications 
            if app.created_at >= start_date
        ]
        
        # Calculate metrics
        total_apps = len(apps_in_period)
        approved_apps = len([app for app in apps_in_period if app.status == 'approved'])
        rejected_apps = len([app for app in apps_in_period if app.status == 'rejected'])
        pending_apps = len([app for app in apps_in_period if app.status in ['submitted', 'under_review']])
        
        approval_rate = (approved_apps / total_apps * 100) if total_apps > 0 else 0
        
        # Calculate total requested amount
        total_requested = sum(
            float(app.requested_amount) for app in apps_in_period 
            if app.requested_amount
        )
        
        return {
            'user_info': {
                'id': str(user.id),
                'username': user.username,
                'email': user.email,
                'name': f"{user.first_name} {user.last_name}",
                'role': user.role,
                'status': user.status,
                'department': user.department.name if user.department else None,
                'branch': user.branch.name if user.branch else None,
                'position': user.position.name if user.position else None,
                'login_count': user.login_count or 0,
                'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None,
                'onboarding_completed': user.onboarding_completed
            },
            'performance_metrics': {
                'total_applications': total_apps,
                'approved_applications': approved_apps,
                'rejected_applications': rejected_apps,
                'pending_applications': pending_apps,
                'approval_rate': round(approval_rate, 2),
                'total_requested_amount': total_requested,
                'average_application_amount': round(total_requested / total_apps, 2) if total_apps > 0 else 0
            },
            'period_info': {
                'days': days,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'generated_at': end_date.isoformat()
        }