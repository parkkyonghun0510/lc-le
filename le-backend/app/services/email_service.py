"""
Email Service

Comprehensive email service for user lifecycle events, notifications, and automated communications.
Supports SMTP configuration, template-based emails, and notification tracking.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path
import aiofiles
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_

from app.models import User, Setting
from app.services.audit_service import AuditService, ValidationEventType
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails and managing email notifications"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit_service = AuditService(db)
        self.smtp_settings = None
        
    async def _get_smtp_settings(self) -> Dict[str, Any]:
        """Get SMTP configuration from settings"""
        if self.smtp_settings:
            return self.smtp_settings
            
        # Get SMTP settings from database
        result = await self.db.execute(
            select(Setting).where(
                Setting.category == "email_config"
            )
        )
        email_settings = result.scalars().all()
        
        smtp_config = {
            'smtp_server': 'localhost',
            'smtp_port': 587,
            'smtp_username': '',
            'smtp_password': '',
            'smtp_use_tls': True,
            'from_email': 'noreply@lc-workflow.com',
            'from_name': 'LC Workflow System',
            'enabled': False
        }
        
        # Update with database settings
        for setting in email_settings:
            if setting.key in smtp_config:
                smtp_config[setting.key] = setting.value
                
        self.smtp_settings = smtp_config
        return smtp_config
    
    async def send_email(
        self,
        to_emails: List[str],
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        user_id: Optional[str] = None
    ) -> bool:
        """Send email using SMTP configuration"""
        
        try:
            smtp_config = await self._get_smtp_settings()
            
            if not smtp_config.get('enabled', False):
                logger.warning("Email sending is disabled in configuration")
                return False
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{smtp_config['from_name']} <{smtp_config['from_email']}>"
            msg['To'] = ', '.join(to_emails)
            msg['Subject'] = subject
            
            if cc_emails:
                msg['Cc'] = ', '.join(cc_emails)
            
            # Add text part
            text_part = MIMEText(body_text, 'plain', 'utf-8')
            msg.attach(text_part)
            
            # Add HTML part if provided
            if body_html:
                html_part = MIMEText(body_html, 'html', 'utf-8')
                msg.attach(html_part)
            
            # Add attachments if provided
            if attachments:
                for attachment in attachments:
                    self._add_attachment(msg, attachment)
            
            # Send email
            all_recipients = to_emails + (cc_emails or []) + (bcc_emails or [])
            
            with smtplib.SMTP(smtp_config['smtp_server'], smtp_config['smtp_port']) as server:
                if smtp_config.get('smtp_use_tls', True):
                    server.starttls()
                
                if smtp_config.get('smtp_username') and smtp_config.get('smtp_password'):
                    server.login(smtp_config['smtp_username'], smtp_config['smtp_password'])
                
                server.send_message(msg, to_addrs=all_recipients)
            
            # Log successful email
            await self.audit_service.log_validation_event(
                event_type=ValidationEventType.VALIDATION_SUCCESS,
                entity_type="email_notification",
                field_name="email_sent",
                field_value=f"to={len(to_emails)}, subject={subject[:50]}",
                user_id=user_id,
                metadata={
                    'recipients': to_emails,
                    'subject': subject,
                    'has_html': body_html is not None,
                    'attachment_count': len(attachments) if attachments else 0
                }
            )
            
            logger.info(f"Email sent successfully to {len(all_recipients)} recipients")
            return True
            
        except Exception as e:
            # Log failed email
            await self.audit_service.log_validation_event(
                event_type=ValidationEventType.VALIDATION_ERROR,
                entity_type="email_notification",
                field_name="email_failed",
                field_value=str(e)[:100],
                user_id=user_id,
                error_message=str(e),
                metadata={
                    'recipients': to_emails,
                    'subject': subject,
                    'error_type': type(e).__name__
                }
            )
            
            logger.error(f"Failed to send email: {str(e)}")
            return False
    
    def _add_attachment(self, msg: MIMEMultipart, attachment: Dict[str, Any]):
        """Add attachment to email message"""
        try:
            with open(attachment['path'], 'rb') as f:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename= {attachment.get("filename", "attachment")}'
                )
                msg.attach(part)
        except Exception as e:
            logger.error(f"Failed to add attachment {attachment.get('filename', 'unknown')}: {str(e)}")
    
    async def send_welcome_email(self, user: User) -> bool:
        """Send welcome email to new user"""
        
        subject = "Welcome to LC Workflow System"
        
        body_text = f"""
Dear {user.first_name} {user.last_name},

Welcome to the LC Workflow System! Your account has been successfully created.

Account Details:
- Username: {user.username}
- Email: {user.email}
- Role: {user.role.title()}
- Department: {user.department.name if user.department else 'Not assigned'}
- Branch: {user.branch.name if user.branch else 'Not assigned'}

To get started:
1. Log in to the system using your username and password
2. Complete your onboarding checklist
3. Set up your profile preferences
4. Contact your line manager for any questions

If you need assistance, please contact your line manager or system administrator.

Best regards,
LC Workflow System
"""
        
        body_html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .header {{ background-color: #2196F3; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; }}
        .details {{ background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }}
        .steps {{ background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; }}
        .footer {{ background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Welcome to LC Workflow System</h1>
    </div>
    <div class="content">
        <p>Dear {user.first_name} {user.last_name},</p>
        <p>Welcome to the LC Workflow System! Your account has been successfully created.</p>
        
        <div class="details">
            <h3>Account Details:</h3>
            <ul>
                <li><strong>Username:</strong> {user.username}</li>
                <li><strong>Email:</strong> {user.email}</li>
                <li><strong>Role:</strong> {user.role.title()}</li>
                <li><strong>Department:</strong> {user.department.name if user.department else 'Not assigned'}</li>
                <li><strong>Branch:</strong> {user.branch.name if user.branch else 'Not assigned'}</li>
            </ul>
        </div>
        
        <div class="steps">
            <h3>To get started:</h3>
            <ol>
                <li>Log in to the system using your username and password</li>
                <li>Complete your onboarding checklist</li>
                <li>Set up your profile preferences</li>
                <li>Contact your line manager for any questions</li>
            </ol>
        </div>
        
        <p>If you need assistance, please contact your line manager or system administrator.</p>
        
        <p>Best regards,<br>LC Workflow System</p>
    </div>
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
    </div>
</body>
</html>
"""
        
        return await self.send_email(
            to_emails=[user.email],
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            user_id=str(user.id)
        )
    
    async def send_status_change_notification(
        self, 
        user: User, 
        old_status: str, 
        new_status: str, 
        reason: Optional[str] = None,
        changed_by: Optional[User] = None
    ) -> bool:
        """Send notification when user status changes"""
        
        subject = f"Account Status Update - {new_status.title()}"
        
        body_text = f"""
Dear {user.first_name} {user.last_name},

Your account status has been updated in the LC Workflow System.

Status Change Details:
- Previous Status: {old_status.title()}
- New Status: {new_status.title()}
- Reason: {reason or 'No reason provided'}
- Changed By: {changed_by.first_name + ' ' + changed_by.last_name if changed_by else 'System'}
- Date: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}

If you have questions about this change, please contact your line manager or HR department.

Best regards,
LC Workflow System
"""
        
        body_html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .header {{ background-color: #FF9800; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; }}
        .status-change {{ background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #FF9800; }}
        .footer {{ background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Account Status Update</h1>
    </div>
    <div class="content">
        <p>Dear {user.first_name} {user.last_name},</p>
        <p>Your account status has been updated in the LC Workflow System.</p>
        
        <div class="status-change">
            <h3>Status Change Details:</h3>
            <ul>
                <li><strong>Previous Status:</strong> {old_status.title()}</li>
                <li><strong>New Status:</strong> {new_status.title()}</li>
                <li><strong>Reason:</strong> {reason or 'No reason provided'}</li>
                <li><strong>Changed By:</strong> {changed_by.first_name + ' ' + changed_by.last_name if changed_by else 'System'}</li>
                <li><strong>Date:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}</li>
            </ul>
        </div>
        
        <p>If you have questions about this change, please contact your line manager or HR department.</p>
        
        <p>Best regards,<br>LC Workflow System</p>
    </div>
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
    </div>
</body>
</html>
"""
        
        return await self.send_email(
            to_emails=[user.email],
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            user_id=str(user.id)
        )
    
    async def send_manager_notification(
        self, 
        manager: User, 
        subject: str, 
        user: User, 
        action: str, 
        details: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Send notification to manager about team member changes"""
        
        body_text = f"""
Dear {manager.first_name} {manager.last_name},

This is a notification about a change to one of your team members.

Team Member: {user.first_name} {user.last_name} ({user.username})
Action: {action}
Date: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}

{self._format_details_text(details) if details else ''}

Please review this change and take any necessary action.

Best regards,
LC Workflow System
"""
        
        body_html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; }}
        .notification {{ background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #4CAF50; }}
        .details {{ background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }}
        .footer {{ background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Team Member Notification</h1>
    </div>
    <div class="content">
        <p>Dear {manager.first_name} {manager.last_name},</p>
        <p>This is a notification about a change to one of your team members.</p>
        
        <div class="notification">
            <h3>Notification Details:</h3>
            <ul>
                <li><strong>Team Member:</strong> {user.first_name} {user.last_name} ({user.username})</li>
                <li><strong>Action:</strong> {action}</li>
                <li><strong>Date:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}</li>
            </ul>
        </div>
        
        {self._format_details_html(details) if details else ''}
        
        <p>Please review this change and take any necessary action.</p>
        
        <p>Best regards,<br>LC Workflow System</p>
    </div>
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
    </div>
</body>
</html>
"""
        
        return await self.send_email(
            to_emails=[manager.email],
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            user_id=str(manager.id)
        )
    
    async def send_onboarding_reminder(self, user: User, days_overdue: int) -> bool:
        """Send onboarding reminder to user and manager"""
        
        subject = f"Onboarding Reminder - {days_overdue} days overdue"
        
        body_text = f"""
Dear {user.first_name} {user.last_name},

This is a reminder that your onboarding process is {days_overdue} days overdue.

Please complete your onboarding checklist as soon as possible to ensure you have full access to all system features.

If you need assistance, please contact your line manager.

Best regards,
LC Workflow System
"""
        
        body_html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .header {{ background-color: #F44336; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; }}
        .reminder {{ background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #F44336; }}
        .footer {{ background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Onboarding Reminder</h1>
    </div>
    <div class="content">
        <p>Dear {user.first_name} {user.last_name},</p>
        
        <div class="reminder">
            <h3>Onboarding Overdue</h3>
            <p>Your onboarding process is <strong>{days_overdue} days overdue</strong>.</p>
            <p>Please complete your onboarding checklist as soon as possible to ensure you have full access to all system features.</p>
        </div>
        
        <p>If you need assistance, please contact your line manager.</p>
        
        <p>Best regards,<br>LC Workflow System</p>
    </div>
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
    </div>
</body>
</html>
"""
        
        # Send to user
        user_sent = await self.send_email(
            to_emails=[user.email],
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            user_id=str(user.id)
        )
        
        # Send to manager if exists
        manager_sent = True
        if user.line_manager:
            manager_subject = f"Team Member Onboarding Overdue - {user.first_name} {user.last_name}"
            manager_sent = await self.send_manager_notification(
                manager=user.line_manager,
                subject=manager_subject,
                user=user,
                action=f"Onboarding {days_overdue} days overdue",
                details={'days_overdue': days_overdue}
            )
        
        return user_sent and manager_sent
    
    def _format_details_text(self, details: Dict[str, Any]) -> str:
        """Format details dictionary for text email"""
        formatted = "\nAdditional Details:\n"
        for key, value in details.items():
            formatted += f"- {key.replace('_', ' ').title()}: {value}\n"
        return formatted
    
    def _format_details_html(self, details: Dict[str, Any]) -> str:
        """Format details dictionary for HTML email"""
        formatted = '<div class="details"><h3>Additional Details:</h3><ul>'
        for key, value in details.items():
            formatted += f"<li><strong>{key.replace('_', ' ').title()}:</strong> {value}</li>"
        formatted += '</ul></div>'
        return formatted
    
    async def test_email_configuration(self) -> Dict[str, Any]:
        """Test email configuration and connectivity"""
        
        try:
            smtp_config = await self._get_smtp_settings()
            
            if not smtp_config.get('enabled', False):
                return {
                    'success': False,
                    'error': 'Email is disabled in configuration',
                    'config_valid': False
                }
            
            # Test SMTP connection
            with smtplib.SMTP(smtp_config['smtp_server'], smtp_config['smtp_port']) as server:
                if smtp_config.get('smtp_use_tls', True):
                    server.starttls()
                
                if smtp_config.get('smtp_username') and smtp_config.get('smtp_password'):
                    server.login(smtp_config['smtp_username'], smtp_config['smtp_password'])
            
            return {
                'success': True,
                'message': 'Email configuration is valid and connection successful',
                'config_valid': True,
                'smtp_server': smtp_config['smtp_server'],
                'smtp_port': smtp_config['smtp_port'],
                'from_email': smtp_config['from_email']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'config_valid': False
            }