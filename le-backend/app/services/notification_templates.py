"""
Notification Templates Service

Professional notification templates with customizable content and formatting.
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from app.models import User
from app.services.notification_types import NotificationType, NotificationPriority

class NotificationTemplates:
    """Professional notification templates"""
    
    @staticmethod
    def get_welcome_template(user: User) -> Dict[str, Any]:
        """Welcome notification template for new users"""
        return {
            'title': f"Welcome to LC Workflow System, {user.first_name}!",
            'message': f"Hello {user.first_name},\n\nWelcome to the LC Workflow System! Your account has been successfully created.\n\nYour account details:\n• Username: {user.username}\n• Role: {user.role.title()}\n• Department: {user.department.name if user.department else 'Not assigned'}\n• Branch: {user.branch.name if user.branch else 'Not assigned'}\n\nPlease complete your onboarding checklist to get started. If you have any questions, contact your line manager or the IT support team.\n\nBest regards,\nLC Workflow Team",
            'priority': NotificationPriority.HIGH,
            'data': {
                'welcome_type': 'new_user',
                'onboarding_required': not user.onboarding_completed,
                'department': user.department.name if user.department else None,
                'branch': user.branch.name if user.branch else None,
                'line_manager': user.line_manager.full_name_latin if user.line_manager else None
            }
        }
    
    @staticmethod
    def get_status_change_template(user: User, old_status: str, new_status: str, reason: Optional[str] = None, changed_by: Optional[User] = None) -> Dict[str, Any]:
        """Status change notification template"""
        status_messages = {
            'active': 'Your account has been activated and you can now access the system.',
            'inactive': 'Your account has been deactivated. Please contact your line manager for more information.',
            'suspended': 'Your account has been suspended. Please contact HR or your line manager immediately.',
            'pending': 'Your account is pending approval. You will be notified once it\'s activated.',
            'locked': 'Your account has been locked due to security reasons. Please contact IT support.'
        }
        
        message = status_messages.get(new_status, f"Your account status has been changed to {new_status}.")
        
        if reason:
            message += f"\n\nReason: {reason}"
        
        if changed_by:
            message += f"\n\nChanged by: {changed_by.first_name} {changed_by.last_name}"
        
        message += f"\n\nDate: {datetime.now(timezone.utc).strftime('%B %d, %Y at %I:%M %p UTC')}"
        
        return {
            'title': f"Account Status Update - {new_status.title()}",
            'message': f"Hello {user.first_name},\n\n{message}\n\nIf you have any questions or concerns, please contact your line manager or the IT support team.\n\nBest regards,\nLC Workflow Team",
            'priority': NotificationPriority.HIGH,
            'data': {
                'old_status': old_status,
                'new_status': new_status,
                'reason': reason,
                'changed_by': changed_by.first_name + ' ' + changed_by.last_name if changed_by else None,
                'change_date': datetime.now(timezone.utc).isoformat()
            }
        }
    
    @staticmethod
    def get_onboarding_reminder_template(user: User, days_overdue: int) -> Dict[str, Any]:
        """Onboarding reminder template"""
        urgency = "urgent" if days_overdue > 14 else "high" if days_overdue > 7 else "normal"
        
        return {
            'title': f"Onboarding Reminder - {days_overdue} days overdue",
            'message': f"Hello {user.first_name},\n\nThis is a friendly reminder that your onboarding process is {days_overdue} days overdue.\n\nPlease complete the following tasks:\n• Review company policies and procedures\n• Complete required training modules\n• Set up your workspace and tools\n• Meet with your line manager\n• Submit required documentation\n\nIf you need assistance or have questions, please contact your line manager or HR department.\n\nBest regards,\nLC Workflow Team",
            'priority': urgency,
            'data': {
                'days_overdue': days_overdue,
                'created_date': user.created_at.isoformat(),
                'onboarding_required': True,
                'urgency_level': urgency
            }
        }
    
    @staticmethod
    def get_onboarding_complete_template(user: User) -> Dict[str, Any]:
        """Onboarding completion template"""
        return {
            'title': "Congratulations! Onboarding Complete",
            'message': f"Hello {user.first_name},\n\nCongratulations! You have successfully completed your onboarding process.\n\nYou now have full access to all system features and can begin your work responsibilities.\n\nIf you have any questions or need assistance, please don't hesitate to contact your line manager or the IT support team.\n\nWelcome to the team!\n\nBest regards,\nLC Workflow Team",
            'priority': NotificationPriority.NORMAL,
            'data': {
                'completion_date': datetime.now(timezone.utc).isoformat(),
                'onboarding_completed': True,
                'celebration': True
            }
        }
    
    @staticmethod
    def get_password_expiry_template(user: User, days_until_expiry: int) -> Dict[str, Any]:
        """Password expiry warning template"""
        urgency = "urgent" if days_until_expiry <= 1 else "high" if days_until_expiry <= 3 else "normal"
        
        return {
            'title': f"Password Expiry Warning - {days_until_expiry} days remaining",
            'message': f"Hello {user.first_name},\n\nYour password will expire in {days_until_expiry} days. Please change your password before it expires to avoid account lockout.\n\nTo change your password:\n1. Go to your profile settings\n2. Click on 'Change Password'\n3. Enter your current password\n4. Enter your new password (minimum 8 characters)\n5. Confirm your new password\n\nIf you need assistance, contact the IT support team.\n\nBest regards,\nLC Workflow Team",
            'priority': urgency,
            'data': {
                'days_until_expiry': days_until_expiry,
                'expiry_date': (datetime.now(timezone.utc) + timedelta(days=days_until_expiry)).isoformat(),
                'action_required': True
            }
        }
    
    @staticmethod
    def get_account_locked_template(user: User, reason: str) -> Dict[str, Any]:
        """Account lockout template"""
        return {
            'title': "Account Locked - Immediate Action Required",
            'message': f"Hello {user.first_name},\n\nYour account has been locked for security reasons.\n\nReason: {reason}\n\nTo unlock your account:\n1. Contact your line manager immediately\n2. Or contact IT support at support@lcworkflow.com\n3. Provide your employee ID: {user.employee_id}\n\nThis is a security measure to protect your account and company data.\n\nBest regards,\nLC Workflow Team",
            'priority': NotificationPriority.URGENT,
            'data': {
                'lock_reason': reason,
                'lock_date': datetime.now(timezone.utc).isoformat(),
                'immediate_action_required': True,
                'contact_info': 'support@lcworkflow.com'
            }
        }
    
    @staticmethod
    def get_system_maintenance_template(user: User, maintenance_info: Dict[str, Any]) -> Dict[str, Any]:
        """System maintenance notification template"""
        return {
            'title': f"System Maintenance - {maintenance_info.get('title', 'Scheduled Maintenance')}",
            'message': f"Hello {user.first_name},\n\nWe will be performing scheduled system maintenance.\n\nMaintenance Details:\n• Date: {maintenance_info.get('date', 'TBD')}\n• Time: {maintenance_info.get('time', 'TBD')}\n• Duration: {maintenance_info.get('duration', 'TBD')}\n• Impact: {maintenance_info.get('impact', 'System may be temporarily unavailable')}\n\nPlease plan your work accordingly and save any important data before the maintenance window.\n\nWe apologize for any inconvenience.\n\nBest regards,\nLC Workflow Team",
            'priority': NotificationPriority.NORMAL,
            'data': {
                'maintenance_date': maintenance_info.get('date'),
                'maintenance_time': maintenance_info.get('time'),
                'duration': maintenance_info.get('duration'),
                'impact': maintenance_info.get('impact'),
                'advance_notice': True
            }
        }
    
    @staticmethod
    def get_bulk_operation_template(user: User, operation: str, results: Dict[str, Any]) -> Dict[str, Any]:
        """Bulk operation completion template"""
        success_count = results.get('success_count', 0)
        error_count = results.get('error_count', 0)
        total_count = success_count + error_count
        
        return {
            'title': f"Bulk Operation Complete - {operation.title()}",
            'message': f"Hello {user.first_name},\n\nYour bulk {operation} operation has been completed.\n\nResults:\n• Total records processed: {total_count}\n• Successful: {success_count}\n• Failed: {error_count}\n\n{'All operations completed successfully!' if error_count == 0 else f'Please review the {error_count} failed records and retry if necessary.'}\n\nYou can view detailed results in the system logs.\n\nBest regards,\nLC Workflow Team",
            'priority': NotificationPriority.NORMAL,
            'data': {
                'operation_type': operation,
                'success_count': success_count,
                'error_count': error_count,
                'total_count': total_count,
                'completion_time': datetime.now(timezone.utc).isoformat()
            }
        }
    
    @staticmethod
    def get_manager_team_change_template(manager: User, team_member: User, action: str, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Manager team change notification template"""
        action_messages = {
            'added': f"{team_member.first_name} {team_member.last_name} has been added to your team.",
            'removed': f"{team_member.first_name} {team_member.last_name} has been removed from your team.",
            'transferred': f"{team_member.first_name} {team_member.last_name} has been transferred to your team.",
            'promoted': f"{team_member.first_name} {team_member.last_name} has been promoted within your team.",
            'demoted': f"{team_member.first_name} {team_member.last_name} has been reassigned within your team."
        }
        
        message = action_messages.get(action, f"Team member {team_member.first_name} {team_member.last_name} has been {action}.")
        
        if details:
            if 'new_role' in details:
                message += f"\n\nNew role: {details['new_role']}"
            if 'effective_date' in details:
                message += f"\n\nEffective date: {details['effective_date']}"
            if 'reason' in details:
                message += f"\n\nReason: {details['reason']}"
        
        return {
            'title': f"Team Update - {team_member.first_name} {team_member.last_name}",
            'message': f"Hello {manager.first_name},\n\n{message}\n\nTeam member details:\n• Name: {team_member.first_name} {team_member.last_name}\n• Employee ID: {team_member.employee_id}\n• Department: {team_member.department.name if team_member.department else 'Not assigned'}\n• Branch: {team_member.branch.name if team_member.branch else 'Not assigned'}\n\nPlease review and update any relevant documentation or processes.\n\nBest regards,\nLC Workflow Team",
            'priority': NotificationPriority.NORMAL,
            'data': {
                'team_member': {
                    'id': str(team_member.id),
                    'name': f"{team_member.first_name} {team_member.last_name}",
                    'employee_id': team_member.employee_id,
                    'department': team_member.department.name if team_member.department else None,
                    'branch': team_member.branch.name if team_member.branch else None
                },
                'action': action,
                'details': details,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        }
