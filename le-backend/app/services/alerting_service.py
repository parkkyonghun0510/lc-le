"""
Alerting Service

This service handles alerting for critical errors, system inconsistencies,
and performance issues. It supports multiple alert channels and severity levels.
"""

import asyncio
import logging
import smtplib
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, asdict
from enum import Enum
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import json

from app.core.config import settings

logger = logging.getLogger(__name__)

class AlertSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AlertChannel(Enum):
    LOG = "log"
    EMAIL = "email"
    WEBHOOK = "webhook"
    DATABASE = "database"

@dataclass
class Alert:
    id: str
    title: str
    message: str
    severity: AlertSeverity
    component: str
    timestamp: datetime
    details: Dict[str, Any]
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    acknowledgments: List[str] = None
    
    def __post_init__(self):
        if self.acknowledgments is None:
            self.acknowledgments = []

@dataclass
class AlertRule:
    name: str
    condition: Callable[[Dict[str, Any]], bool]
    severity: AlertSeverity
    message_template: str
    cooldown_minutes: int = 60
    channels: List[AlertChannel] = None
    
    def __post_init__(self):
        if self.channels is None:
            self.channels = [AlertChannel.LOG]

class AlertingService:
    def __init__(self):
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.alert_rules: List[AlertRule] = []
        self.cooldown_tracker: Dict[str, datetime] = {}
        self.max_history_size = 1000
        
        # Initialize default alert rules
        self._setup_default_rules()
    
    def _setup_default_rules(self):
        """Setup default alerting rules"""
        
        # Database connectivity alerts
        self.add_rule(AlertRule(
            name="database_unhealthy",
            condition=lambda data: data.get("database_status") == "unhealthy",
            severity=AlertSeverity.CRITICAL,
            message_template="Database is unhealthy: {database_error}",
            cooldown_minutes=30,
            channels=[AlertChannel.LOG, AlertChannel.EMAIL]
        ))
        
        # Storage connectivity alerts
        self.add_rule(AlertRule(
            name="storage_unhealthy",
            condition=lambda data: data.get("storage_status") == "unhealthy",
            severity=AlertSeverity.HIGH,
            message_template="Storage system is unhealthy: {storage_error}",
            cooldown_minutes=30,
            channels=[AlertChannel.LOG, AlertChannel.EMAIL]
        ))
        
        # Data consistency alerts
        self.add_rule(AlertRule(
            name="data_inconsistency_high",
            condition=lambda data: data.get("total_inconsistencies", 0) > 10,
            severity=AlertSeverity.HIGH,
            message_template="High number of data inconsistencies detected: {total_inconsistencies}",
            cooldown_minutes=120,
            channels=[AlertChannel.LOG, AlertChannel.EMAIL]
        ))
        
        # Performance alerts
        self.add_rule(AlertRule(
            name="high_response_time",
            condition=lambda data: data.get("avg_response_time_ms", 0) > 5000,
            severity=AlertSeverity.MEDIUM,
            message_template="High average response time: {avg_response_time_ms}ms",
            cooldown_minutes=60,
            channels=[AlertChannel.LOG]
        ))
        
        # Error rate alerts
        self.add_rule(AlertRule(
            name="high_error_rate",
            condition=lambda data: data.get("error_rate_percent", 0) > 10,
            severity=AlertSeverity.HIGH,
            message_template="High error rate detected: {error_rate_percent}%",
            cooldown_minutes=30,
            channels=[AlertChannel.LOG, AlertChannel.EMAIL]
        ))
        
        # Memory usage alerts
        self.add_rule(AlertRule(
            name="high_memory_usage",
            condition=lambda data: data.get("memory_usage_mb", 0) > 1000,
            severity=AlertSeverity.MEDIUM,
            message_template="High memory usage: {memory_usage_mb}MB",
            cooldown_minutes=60,
            channels=[AlertChannel.LOG]
        ))
        
        # Connection pool alerts
        self.add_rule(AlertRule(
            name="connection_pool_exhaustion",
            condition=lambda data: (
                data.get("db_connections", {}).get("checked_out", 0) > 
                data.get("db_connections", {}).get("pool_size", 10) * 0.9
            ),
            severity=AlertSeverity.HIGH,
            message_template="Database connection pool near exhaustion: {checked_out}/{pool_size}",
            cooldown_minutes=30,
            channels=[AlertChannel.LOG, AlertChannel.EMAIL]
        ))
    
    def add_rule(self, rule: AlertRule):
        """Add a new alert rule"""
        self.alert_rules.append(rule)
        logger.info(f"Added alert rule: {rule.name}")
    
    def remove_rule(self, rule_name: str) -> bool:
        """Remove an alert rule by name"""
        for i, rule in enumerate(self.alert_rules):
            if rule.name == rule_name:
                del self.alert_rules[i]
                logger.info(f"Removed alert rule: {rule_name}")
                return True
        return False
    
    async def evaluate_alerts(self, system_data: Dict[str, Any]):
        """Evaluate all alert rules against system data"""
        triggered_alerts = []
        
        for rule in self.alert_rules:
            try:
                if rule.condition(system_data):
                    # Check cooldown
                    if self._is_in_cooldown(rule.name):
                        continue
                    
                    # Create alert
                    alert = await self._create_alert(rule, system_data)
                    triggered_alerts.append(alert)
                    
                    # Send alert through configured channels
                    await self._send_alert(alert, rule.channels)
                    
                    # Update cooldown
                    self.cooldown_tracker[rule.name] = datetime.now(timezone.utc)
                    
            except Exception as e:
                logger.error(f"Error evaluating alert rule {rule.name}: {e}")
        
        return triggered_alerts
    
    async def _create_alert(self, rule: AlertRule, system_data: Dict[str, Any]) -> Alert:
        """Create an alert from a rule and system data"""
        alert_id = f"{rule.name}_{int(datetime.now(timezone.utc).timestamp())}"
        
        # Format message with system data
        try:
            message = rule.message_template.format(**system_data)
        except KeyError as e:
            message = f"{rule.message_template} (formatting error: {e})"
        
        alert = Alert(
            id=alert_id,
            title=f"Alert: {rule.name.replace('_', ' ').title()}",
            message=message,
            severity=rule.severity,
            component=system_data.get("component", "system"),
            timestamp=datetime.now(timezone.utc),
            details=system_data.copy()
        )
        
        # Store alert
        self.active_alerts[alert_id] = alert
        self.alert_history.append(alert)
        
        # Maintain history size
        if len(self.alert_history) > self.max_history_size:
            self.alert_history = self.alert_history[-self.max_history_size:]
        
        logger.warning(f"Alert created: {alert.title} - {alert.message}")
        return alert
    
    async def _send_alert(self, alert: Alert, channels: List[AlertChannel]):
        """Send alert through specified channels"""
        for channel in channels:
            try:
                if channel == AlertChannel.LOG:
                    await self._send_log_alert(alert)
                elif channel == AlertChannel.EMAIL:
                    await self._send_email_alert(alert)
                elif channel == AlertChannel.WEBHOOK:
                    await self._send_webhook_alert(alert)
                elif channel == AlertChannel.DATABASE:
                    await self._send_database_alert(alert)
            except Exception as e:
                logger.error(f"Failed to send alert via {channel.value}: {e}")
    
    async def _send_log_alert(self, alert: Alert):
        """Send alert to logs"""
        log_level = {
            AlertSeverity.LOW: logging.INFO,
            AlertSeverity.MEDIUM: logging.WARNING,
            AlertSeverity.HIGH: logging.ERROR,
            AlertSeverity.CRITICAL: logging.CRITICAL
        }.get(alert.severity, logging.WARNING)
        
        logger.log(log_level, f"ALERT [{alert.severity.value.upper()}] {alert.title}: {alert.message}")
    
    async def _send_email_alert(self, alert: Alert):
        """Send alert via email"""
        if not all([
            getattr(settings, 'SMTP_HOST', None),
            getattr(settings, 'SMTP_PORT', None),
            getattr(settings, 'SMTP_USERNAME', None),
            getattr(settings, 'SMTP_PASSWORD', None),
            getattr(settings, 'ALERT_EMAIL_TO', None)
        ]):
            logger.warning("Email alerting not configured - skipping email alert")
            return
        
        try:
            msg = MIMEMultipart()
            msg['From'] = settings.SMTP_USERNAME
            msg['To'] = settings.ALERT_EMAIL_TO
            msg['Subject'] = f"[{alert.severity.value.upper()}] {alert.title}"
            
            # Create email body
            body = f"""
Alert Details:
- Severity: {alert.severity.value.upper()}
- Component: {alert.component}
- Time: {alert.timestamp.isoformat()}
- Message: {alert.message}

System Details:
{json.dumps(alert.details, indent=2, default=str)}

Alert ID: {alert.id}
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Email alert sent for: {alert.title}")
            
        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")
    
    async def _send_webhook_alert(self, alert: Alert):
        """Send alert via webhook"""
        webhook_url = getattr(settings, 'ALERT_WEBHOOK_URL', None)
        if not webhook_url:
            logger.warning("Webhook alerting not configured - skipping webhook alert")
            return
        
        try:
            import aiohttp
            
            payload = {
                'alert_id': alert.id,
                'title': alert.title,
                'message': alert.message,
                'severity': alert.severity.value,
                'component': alert.component,
                'timestamp': alert.timestamp.isoformat(),
                'details': alert.details
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(webhook_url, json=payload) as response:
                    if response.status == 200:
                        logger.info(f"Webhook alert sent for: {alert.title}")
                    else:
                        logger.error(f"Webhook alert failed with status {response.status}")
                        
        except ImportError:
            logger.warning("aiohttp not available - cannot send webhook alerts")
        except Exception as e:
            logger.error(f"Failed to send webhook alert: {e}")
    
    async def _send_database_alert(self, alert: Alert):
        """Store alert in database"""
        try:
            from app.database import get_db
            from sqlalchemy import text
            
            async for db in get_db():
                try:
                    await db.execute(text("""
                        INSERT INTO alert_logs (
                            alert_id, title, message, severity, component,
                            timestamp, details, resolved
                        ) VALUES (
                            :alert_id, :title, :message, :severity, :component,
                            :timestamp, :details, :resolved
                        )
                    """), {
                        'alert_id': alert.id,
                        'title': alert.title,
                        'message': alert.message,
                        'severity': alert.severity.value,
                        'component': alert.component,
                        'timestamp': alert.timestamp,
                        'details': json.dumps(alert.details, default=str),
                        'resolved': alert.resolved
                    })
                    await db.commit()
                    logger.info(f"Database alert stored for: {alert.title}")
                    break
                except Exception as e:
                    logger.error(f"Failed to store alert in database: {e}")
                    
        except Exception as e:
            logger.error(f"Failed to access database for alert storage: {e}")
    
    def _is_in_cooldown(self, rule_name: str) -> bool:
        """Check if a rule is in cooldown period"""
        if rule_name not in self.cooldown_tracker:
            return False
        
        rule = next((r for r in self.alert_rules if r.name == rule_name), None)
        if not rule:
            return False
        
        last_triggered = self.cooldown_tracker[rule_name]
        cooldown_end = last_triggered + timedelta(minutes=rule.cooldown_minutes)
        
        return datetime.now(timezone.utc) < cooldown_end
    
    def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> bool:
        """Acknowledge an active alert"""
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            if acknowledged_by not in alert.acknowledgments:
                alert.acknowledgments.append(acknowledged_by)
                logger.info(f"Alert {alert_id} acknowledged by {acknowledged_by}")
                return True
        return False
    
    def resolve_alert(self, alert_id: str, resolved_by: str) -> bool:
        """Resolve an active alert"""
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.resolved = True
            alert.resolved_at = datetime.now(timezone.utc)
            alert.resolved_by = resolved_by
            
            # Remove from active alerts
            del self.active_alerts[alert_id]
            
            logger.info(f"Alert {alert_id} resolved by {resolved_by}")
            return True
        return False
    
    def get_active_alerts(self, severity: Optional[AlertSeverity] = None) -> List[Alert]:
        """Get active alerts, optionally filtered by severity"""
        alerts = list(self.active_alerts.values())
        
        if severity:
            alerts = [a for a in alerts if a.severity == severity]
        
        return sorted(alerts, key=lambda x: x.timestamp, reverse=True)
    
    def get_alert_history(self, hours: int = 24, severity: Optional[AlertSeverity] = None) -> List[Alert]:
        """Get alert history for specified hours"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        alerts = [
            alert for alert in self.alert_history
            if alert.timestamp >= cutoff_time
        ]
        
        if severity:
            alerts = [a for a in alerts if a.severity == severity]
        
        return sorted(alerts, key=lambda x: x.timestamp, reverse=True)
    
    def get_alert_statistics(self, hours: int = 24) -> Dict[str, Any]:
        """Get alert statistics for the specified period"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        recent_alerts = [
            alert for alert in self.alert_history
            if alert.timestamp >= cutoff_time
        ]
        
        # Count by severity
        severity_counts = {}
        for severity in AlertSeverity:
            severity_counts[severity.value] = len([
                a for a in recent_alerts if a.severity == severity
            ])
        
        # Count by component
        component_counts = {}
        for alert in recent_alerts:
            component = alert.component
            component_counts[component] = component_counts.get(component, 0) + 1
        
        # Calculate resolution stats
        resolved_alerts = [a for a in recent_alerts if a.resolved]
        total_alerts = len(recent_alerts)
        resolution_rate = (len(resolved_alerts) / total_alerts * 100) if total_alerts > 0 else 0
        
        return {
            'total_alerts': total_alerts,
            'active_alerts': len(self.active_alerts),
            'resolved_alerts': len(resolved_alerts),
            'resolution_rate_percent': round(resolution_rate, 2),
            'severity_breakdown': severity_counts,
            'component_breakdown': component_counts,
            'period_hours': hours
        }
    
    def clear_old_alerts(self, hours: int = 168):  # Default 7 days
        """Clear old alerts from history"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        self.alert_history = [
            alert for alert in self.alert_history
            if alert.timestamp >= cutoff_time
        ]
        
        logger.info(f"Cleared alerts older than {hours} hours")

# Global instance
alerting_service = AlertingService()