"""
Security Monitoring Service
Provides comprehensive security monitoring and threat detection capabilities.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass
from enum import Enum
import json
import hashlib
import ipaddress

from app.database import get_redis
from app.core.config import settings

logger = logging.getLogger(__name__)

class ThreatLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class SecurityEventType(str, Enum):
    LOGIN_FAILURE = "login_failure"
    MULTIPLE_LOGIN_FAILURES = "multiple_login_failures"
    SUSPICIOUS_IP = "suspicious_ip"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    DATA_BREACH_ATTEMPT = "data_breach_attempt"
    SQL_INJECTION_ATTEMPT = "sql_injection_attempt"
    XSS_ATTEMPT = "xss_attempt"
    BRUTE_FORCE_ATTEMPT = "brute_force_attempt"
    ACCOUNT_LOCKOUT = "account_lockout"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"

@dataclass
class SecurityEvent:
    """Security event record"""
    event_id: str
    event_type: SecurityEventType
    threat_level: ThreatLevel
    description: str
    timestamp: datetime
    ip_address: Optional[str] = None
    user_id: Optional[str] = None
    user_agent: Optional[str] = None
    endpoint: Optional[str] = None
    request_data: Optional[Dict[str, Any]] = None
    response_status: Optional[int] = None
    additional_data: Optional[Dict[str, Any]] = None

@dataclass
class SecurityAlert:
    """Security alert generated from events"""
    alert_id: str
    event_ids: List[str]
    alert_type: str
    threat_level: ThreatLevel
    title: str
    description: str
    created_at: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None

class SecurityMonitoringService:
    """Service for monitoring security events and generating alerts"""
    
    def __init__(self):
        self.redis = get_redis()
        self.events: List[SecurityEvent] = []
        self.alerts: List[SecurityAlert] = []
        self.suspicious_ips: set = set()
        self.blocked_ips: set = set()
        self.threat_patterns = self._initialize_threat_patterns()
        self.alert_rules = self._initialize_alert_rules()
    
    def _initialize_threat_patterns(self) -> Dict[str, List[str]]:
        """Initialize common threat patterns for detection"""
        return {
            "sql_injection": [
                "union select", "drop table", "delete from", "insert into",
                "update set", "exec(", "execute(", "script>", "javascript:",
                "onload=", "onerror=", "alert(", "document.cookie"
            ],
            "xss_patterns": [
                "<script", "javascript:", "onload=", "onerror=", "onclick=",
                "onmouseover=", "alert(", "document.cookie", "window.location",
                "<iframe", "<object", "<embed", "eval("
            ],
            "path_traversal": [
                "../", "..\\", "/etc/passwd", "/etc/shadow", "windows/system32",
                "boot.ini", "autoexec.bat", "config.sys"
            ],
            "command_injection": [
                "|", "&", ";", "`", "$(", "&&", "||", ">", "<", ">>", "<<"
            ]
        }
    
    def _initialize_alert_rules(self) -> Dict[str, Dict[str, Any]]:
        """Initialize alert generation rules"""
        return {
            "multiple_login_failures": {
                "threshold": 5,
                "time_window": 300,  # 5 minutes
                "threat_level": ThreatLevel.HIGH,
                "description": "Multiple failed login attempts detected"
            },
            "suspicious_ip_activity": {
                "threshold": 10,
                "time_window": 3600,  # 1 hour
                "threat_level": ThreatLevel.MEDIUM,
                "description": "Suspicious activity from IP address"
            },
            "rate_limit_violations": {
                "threshold": 3,
                "time_window": 1800,  # 30 minutes
                "threat_level": ThreatLevel.MEDIUM,
                "description": "Multiple rate limit violations"
            },
            "sql_injection_attempts": {
                "threshold": 1,
                "time_window": 3600,  # 1 hour
                "threat_level": ThreatLevel.CRITICAL,
                "description": "SQL injection attempt detected"
            },
            "xss_attempts": {
                "threshold": 1,
                "time_window": 3600,  # 1 hour
                "threat_level": ThreatLevel.HIGH,
                "description": "XSS attack attempt detected"
            }
        }
    
    async def log_security_event(
        self,
        event_type: SecurityEventType,
        description: str,
        threat_level: ThreatLevel = ThreatLevel.LOW,
        ip_address: Optional[str] = None,
        user_id: Optional[str] = None,
        user_agent: Optional[str] = None,
        endpoint: Optional[str] = None,
        request_data: Optional[Dict[str, Any]] = None,
        response_status: Optional[int] = None,
        additional_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Log a security event"""
        event_id = hashlib.md5(
            f"{event_type}_{description}_{datetime.now().isoformat()}".encode()
        ).hexdigest()[:16]
        
        event = SecurityEvent(
            event_id=event_id,
            event_type=event_type,
            threat_level=threat_level,
            description=description,
            timestamp=datetime.now(timezone.utc),
            ip_address=ip_address,
            user_id=user_id,
            user_agent=user_agent,
            endpoint=endpoint,
            request_data=request_data,
            response_status=response_status,
            additional_data=additional_data
        )
        
        self.events.append(event)
        
        # Store in Redis for persistence
        if self.redis:
            try:
                event_key = f"security_event:{event_id}"
                event_data = {
                    "event_id": event.event_id,
                    "event_type": event.event_type.value,
                    "threat_level": event.threat_level.value,
                    "description": event.description,
                    "timestamp": event.timestamp.isoformat(),
                    "ip_address": event.ip_address,
                    "user_id": event.user_id,
                    "user_agent": event.user_agent,
                    "endpoint": event.endpoint,
                    "request_data": event.request_data,
                    "response_status": event.response_status,
                    "additional_data": event.additional_data
                }
                await self.redis.setex(event_key, 86400 * 7, json.dumps(event_data))  # 7 days
            except Exception as e:
                logger.error(f"Failed to store security event in Redis: {e}")
        
        # Check for alert conditions
        await self._check_alert_conditions(event)
        
        logger.warning(f"Security event logged: {event_type.value} - {description}")
        return event_id
    
    async def _check_alert_conditions(self, event: SecurityEvent):
        """Check if event triggers any alert conditions"""
        # Check multiple login failures
        if event.event_type == SecurityEventType.LOGIN_FAILURE:
            await self._check_login_failure_pattern(event)
        
        # Check suspicious IP activity
        if event.ip_address:
            await self._check_suspicious_ip_activity(event)
        
        # Check for attack patterns
        if event.request_data:
            await self._check_attack_patterns(event)
        
        # Check rate limit violations
        if event.event_type == SecurityEventType.RATE_LIMIT_EXCEEDED:
            await self._check_rate_limit_violations(event)
    
    async def _check_login_failure_pattern(self, event: SecurityEvent):
        """Check for multiple login failures from same IP/user"""
        if not event.ip_address:
            return
        
        rule = self.alert_rules["multiple_login_failures"]
        time_window = timedelta(seconds=rule["time_window"])
        cutoff_time = datetime.now(timezone.utc) - time_window
        
        # Count recent login failures from same IP
        recent_failures = [
            e for e in self.events
            if e.event_type == SecurityEventType.LOGIN_FAILURE
            and e.ip_address == event.ip_address
            and e.timestamp >= cutoff_time
        ]
        
        if len(recent_failures) >= rule["threshold"]:
            await self._create_alert(
                event_ids=[e.event_id for e in recent_failures],
                alert_type="multiple_login_failures",
                threat_level=rule["threat_level"],
                title="Multiple Login Failures",
                description=f"{len(recent_failures)} failed login attempts from {event.ip_address} in {rule['time_window']} seconds"
            )
    
    async def _check_suspicious_ip_activity(self, event: SecurityEvent):
        """Check for suspicious activity from IP address"""
        if not event.ip_address:
            return
        
        rule = self.alert_rules["suspicious_ip_activity"]
        time_window = timedelta(seconds=rule["time_window"])
        cutoff_time = datetime.now(timezone.utc) - time_window
        
        # Count recent security events from same IP
        recent_events = [
            e for e in self.events
            if e.ip_address == event.ip_address
            and e.timestamp >= cutoff_time
            and e.threat_level in [ThreatLevel.MEDIUM, ThreatLevel.HIGH, ThreatLevel.CRITICAL]
        ]
        
        if len(recent_events) >= rule["threshold"]:
            await self._create_alert(
                event_ids=[e.event_id for e in recent_events],
                alert_type="suspicious_ip_activity",
                threat_level=rule["threat_level"],
                title="Suspicious IP Activity",
                description=f"Suspicious activity detected from {event.ip_address}: {len(recent_events)} security events in {rule['time_window']} seconds"
            )
            self.suspicious_ips.add(event.ip_address)
    
    async def _check_attack_patterns(self, event: SecurityEvent):
        """Check request data for attack patterns"""
        if not event.request_data:
            return
        
        request_str = json.dumps(event.request_data).lower()
        
        # Check for SQL injection patterns
        for pattern in self.threat_patterns["sql_injection"]:
            if pattern in request_str:
                await self.log_security_event(
                    event_type=SecurityEventType.SQL_INJECTION_ATTEMPT,
                    description=f"SQL injection attempt detected: {pattern}",
                    threat_level=ThreatLevel.CRITICAL,
                    ip_address=event.ip_address,
                    user_id=event.user_id,
                    endpoint=event.endpoint,
                    request_data=event.request_data
                )
                break
        
        # Check for XSS patterns
        for pattern in self.threat_patterns["xss_patterns"]:
            if pattern in request_str:
                await self.log_security_event(
                    event_type=SecurityEventType.XSS_ATTEMPT,
                    description=f"XSS attack attempt detected: {pattern}",
                    threat_level=ThreatLevel.HIGH,
                    ip_address=event.ip_address,
                    user_id=event.user_id,
                    endpoint=event.endpoint,
                    request_data=event.request_data
                )
                break
    
    async def _check_rate_limit_violations(self, event: SecurityEvent):
        """Check for multiple rate limit violations"""
        if not event.ip_address:
            return
        
        rule = self.alert_rules["rate_limit_violations"]
        time_window = timedelta(seconds=rule["time_window"])
        cutoff_time = datetime.now(timezone.utc) - time_window
        
        # Count recent rate limit violations from same IP
        recent_violations = [
            e for e in self.events
            if e.event_type == SecurityEventType.RATE_LIMIT_EXCEEDED
            and e.ip_address == event.ip_address
            and e.timestamp >= cutoff_time
        ]
        
        if len(recent_violations) >= rule["threshold"]:
            await self._create_alert(
                event_ids=[e.event_id for e in recent_violations],
                alert_type="rate_limit_violations",
                threat_level=rule["threat_level"],
                title="Multiple Rate Limit Violations",
                description=f"{len(recent_violations)} rate limit violations from {event.ip_address} in {rule['time_window']} seconds"
            )
    
    async def _create_alert(
        self,
        event_ids: List[str],
        alert_type: str,
        threat_level: ThreatLevel,
        title: str,
        description: str
    ) -> str:
        """Create a security alert"""
        alert_id = hashlib.md5(
            f"{alert_type}_{title}_{datetime.now().isoformat()}".encode()
        ).hexdigest()[:16]
        
        alert = SecurityAlert(
            alert_id=alert_id,
            event_ids=event_ids,
            alert_type=alert_type,
            threat_level=threat_level,
            title=title,
            description=description,
            created_at=datetime.now(timezone.utc)
        )
        
        self.alerts.append(alert)
        
        # Store in Redis
        if self.redis:
            try:
                alert_key = f"security_alert:{alert_id}"
                alert_data = {
                    "alert_id": alert.alert_id,
                    "event_ids": alert.event_ids,
                    "alert_type": alert.alert_type,
                    "threat_level": alert.threat_level.value,
                    "title": alert.title,
                    "description": alert.description,
                    "created_at": alert.created_at.isoformat(),
                    "resolved": alert.resolved,
                    "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
                    "resolved_by": alert.resolved_by
                }
                await self.redis.setex(alert_key, 86400 * 30, json.dumps(alert_data))  # 30 days
            except Exception as e:
                logger.error(f"Failed to store security alert in Redis: {e}")
        
        logger.critical(f"Security alert created: {title} - {description}")
        return alert_id
    
    async def get_security_events(
        self,
        hours: int = 24,
        threat_level: Optional[ThreatLevel] = None,
        event_type: Optional[SecurityEventType] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get security events with optional filtering"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        filtered_events = [
            event for event in self.events
            if event.timestamp >= cutoff_time
            and (threat_level is None or event.threat_level == threat_level)
            and (event_type is None or event.event_type == event_type)
        ]
        
        # Sort by timestamp (most recent first)
        filtered_events.sort(key=lambda e: e.timestamp, reverse=True)
        
        return [
            {
                "event_id": event.event_id,
                "event_type": event.event_type.value,
                "threat_level": event.threat_level.value,
                "description": event.description,
                "timestamp": event.timestamp.isoformat(),
                "ip_address": event.ip_address,
                "user_id": event.user_id,
                "endpoint": event.endpoint,
                "response_status": event.response_status
            }
            for event in filtered_events[:limit]
        ]
    
    async def get_security_alerts(
        self,
        hours: int = 24,
        threat_level: Optional[ThreatLevel] = None,
        resolved: Optional[bool] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get security alerts with optional filtering"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        filtered_alerts = [
            alert for alert in self.alerts
            if alert.created_at >= cutoff_time
            and (threat_level is None or alert.threat_level == threat_level)
            and (resolved is None or alert.resolved == resolved)
        ]
        
        # Sort by created_at (most recent first)
        filtered_alerts.sort(key=lambda a: a.created_at, reverse=True)
        
        return [
            {
                "alert_id": alert.alert_id,
                "event_ids": alert.event_ids,
                "alert_type": alert.alert_type,
                "threat_level": alert.threat_level.value,
                "title": alert.title,
                "description": alert.description,
                "created_at": alert.created_at.isoformat(),
                "resolved": alert.resolved,
                "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
                "resolved_by": alert.resolved_by
            }
            for alert in filtered_alerts[:limit]
        ]
    
    async def resolve_alert(self, alert_id: str, resolved_by: str) -> bool:
        """Resolve a security alert"""
        alert = next((a for a in self.alerts if a.alert_id == alert_id), None)
        if not alert:
            return False
        
        alert.resolved = True
        alert.resolved_at = datetime.now(timezone.utc)
        alert.resolved_by = resolved_by
        
        logger.info(f"Security alert {alert_id} resolved by {resolved_by}")
        return True
    
    async def block_ip(self, ip_address: str, duration_hours: int = 24) -> bool:
        """Block an IP address"""
        try:
            # Validate IP address
            ipaddress.ip_address(ip_address)
            
            self.blocked_ips.add(ip_address)
            
            # Store in Redis
            if self.redis:
                block_key = f"blocked_ip:{ip_address}"
                await self.redis.setex(block_key, duration_hours * 3600, "blocked")
            
            logger.warning(f"IP address {ip_address} blocked for {duration_hours} hours")
            return True
        except ValueError:
            logger.error(f"Invalid IP address: {ip_address}")
            return False
        except Exception as e:
            logger.error(f"Failed to block IP {ip_address}: {e}")
            return False
    
    async def unblock_ip(self, ip_address: str) -> bool:
        """Unblock an IP address"""
        try:
            self.blocked_ips.discard(ip_address)
            
            # Remove from Redis
            if self.redis:
                block_key = f"blocked_ip:{ip_address}"
                await self.redis.delete(block_key)
            
            logger.info(f"IP address {ip_address} unblocked")
            return True
        except Exception as e:
            logger.error(f"Failed to unblock IP {ip_address}: {e}")
            return False
    
    async def is_ip_blocked(self, ip_address: str) -> bool:
        """Check if IP address is blocked"""
        if ip_address in self.blocked_ips:
            return True
        
        if self.redis:
            try:
                block_key = f"blocked_ip:{ip_address}"
                is_blocked = await self.redis.get(block_key)
                return bool(is_blocked)
            except Exception as e:
                logger.error(f"Failed to check IP block status: {e}")
        
        return False
    
    async def get_security_statistics(self) -> Dict[str, Any]:
        """Get security monitoring statistics"""
        total_events = len(self.events)
        total_alerts = len(self.alerts)
        
        # Count events by threat level
        events_by_threat_level = {}
        for event in self.events:
            level = event.threat_level.value
            events_by_threat_level[level] = events_by_threat_level.get(level, 0) + 1
        
        # Count events by type
        events_by_type = {}
        for event in self.events:
            event_type = event.event_type.value
            events_by_type[event_type] = events_by_type.get(event_type, 0) + 1
        
        # Count alerts by threat level
        alerts_by_threat_level = {}
        for alert in self.alerts:
            level = alert.threat_level.value
            alerts_by_threat_level[level] = alerts_by_threat_level.get(level, 0) + 1
        
        # Count unresolved alerts
        unresolved_alerts = len([a for a in self.alerts if not a.resolved])
        
        return {
            "total_events": total_events,
            "total_alerts": total_alerts,
            "unresolved_alerts": unresolved_alerts,
            "events_by_threat_level": events_by_threat_level,
            "events_by_type": events_by_type,
            "alerts_by_threat_level": alerts_by_threat_level,
            "suspicious_ips_count": len(self.suspicious_ips),
            "blocked_ips_count": len(self.blocked_ips)
        }

# Global security monitoring service instance
security_monitoring_service = SecurityMonitoringService()
