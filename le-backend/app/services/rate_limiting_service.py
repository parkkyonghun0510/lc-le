"""
Rate Limiting Service
Provides comprehensive rate limiting and security monitoring capabilities.
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass
import json

from app.database import get_redis
from app.core.config import settings

logger = logging.getLogger(__name__)

@dataclass
class RateLimitRule:
    """Rate limiting rule configuration"""
    name: str
    requests_per_window: int
    window_seconds: int
    block_duration_seconds: int = 3600  # 1 hour default
    scope: str = "global"  # global, user, ip, endpoint
    enabled: bool = True

@dataclass
class RateLimitViolation:
    """Rate limit violation record"""
    identifier: str
    rule_name: str
    requests_count: int
    limit: int
    window_start: datetime
    violation_time: datetime
    ip_address: Optional[str] = None
    user_id: Optional[str] = None
    endpoint: Optional[str] = None

class RateLimitingService:
    """Service for managing rate limiting and security monitoring"""
    
    def __init__(self):
        self.redis = get_redis()
        self.rules: Dict[str, RateLimitRule] = {}
        self.violations: List[RateLimitViolation] = []
        self._initialize_default_rules()
    
    def _initialize_default_rules(self):
        """Initialize default rate limiting rules"""
        default_rules = [
            # Global rate limits
            RateLimitRule(
                name="global_requests",
                requests_per_window=1000,
                window_seconds=3600,  # 1 hour
                scope="global"
            ),
            
            # User-specific rate limits
            RateLimitRule(
                name="user_requests",
                requests_per_window=100,
                window_seconds=3600,  # 1 hour
                scope="user"
            ),
            
            # IP-specific rate limits
            RateLimitRule(
                name="ip_requests",
                requests_per_window=200,
                window_seconds=3600,  # 1 hour
                scope="ip"
            ),
            
            # Authentication rate limits
            RateLimitRule(
                name="login_attempts",
                requests_per_window=5,
                window_seconds=300,  # 5 minutes
                scope="ip",
                block_duration_seconds=1800  # 30 minutes
            ),
            
            # API endpoint rate limits
            RateLimitRule(
                name="api_requests",
                requests_per_window=500,
                window_seconds=3600,  # 1 hour
                scope="endpoint"
            ),
            
            # Bulk operations rate limits
            RateLimitRule(
                name="bulk_operations",
                requests_per_window=10,
                window_seconds=3600,  # 1 hour
                scope="user"
            ),
            
            # File upload rate limits
            RateLimitRule(
                name="file_uploads",
                requests_per_window=20,
                window_seconds=3600,  # 1 hour
                scope="user"
            )
        ]
        
        for rule in default_rules:
            self.rules[rule.name] = rule
    
    async def check_rate_limit(
        self,
        identifier: str,
        rule_name: str,
        ip_address: Optional[str] = None,
        user_id: Optional[str] = None,
        endpoint: Optional[str] = None
    ) -> Dict[str, Any]:
        """Check if request is within rate limit"""
        if not self.redis:
            # If Redis is not available, allow the request
            logger.warning("Redis not available, skipping rate limiting")
            return {"allowed": True, "reason": "redis_unavailable"}
        
        rule = self.rules.get(rule_name)
        if not rule or not rule.enabled:
            return {"allowed": True, "reason": "rule_disabled"}
        
        # Determine the key based on scope
        key = self._get_rate_limit_key(rule, identifier, ip_address, user_id, endpoint)
        
        try:
            # Get current count
            current_count = await self.redis.get(key)
            current_count = int(current_count) if current_count else 0
            
            # Check if limit is exceeded
            if current_count >= rule.requests_per_window:
                # Record violation
                violation = RateLimitViolation(
                    identifier=identifier,
                    rule_name=rule_name,
                    requests_count=current_count,
                    limit=rule.requests_per_window,
                    window_start=datetime.now(timezone.utc) - timedelta(seconds=rule.window_seconds),
                    violation_time=datetime.now(timezone.utc),
                    ip_address=ip_address,
                    user_id=user_id,
                    endpoint=endpoint
                )
                self.violations.append(violation)
                
                # Check if identifier should be blocked
                is_blocked = await self._is_identifier_blocked(identifier, rule)
                
                return {
                    "allowed": False,
                    "reason": "rate_limit_exceeded",
                    "current_count": current_count,
                    "limit": rule.requests_per_window,
                    "window_seconds": rule.window_seconds,
                    "blocked": is_blocked,
                    "retry_after": rule.window_seconds
                }
            
            # Increment counter
            if current_count == 0:
                # First request in window, set expiration
                await self.redis.setex(key, rule.window_seconds, 1)
            else:
                # Increment existing counter
                await self.redis.incr(key)
            
            return {
                "allowed": True,
                "current_count": current_count + 1,
                "limit": rule.requests_per_window,
                "window_seconds": rule.window_seconds,
                "remaining": rule.requests_per_window - (current_count + 1)
            }
            
        except Exception as e:
            logger.error(f"Rate limiting check failed: {e}")
            # On error, allow the request
            return {"allowed": True, "reason": "check_failed", "error": str(e)}
    
    async def _get_rate_limit_key(
        self,
        rule: RateLimitRule,
        identifier: str,
        ip_address: Optional[str],
        user_id: Optional[str],
        endpoint: Optional[str]
    ) -> str:
        """Generate rate limit key based on rule scope"""
        base_key = f"rate_limit:{rule.name}"
        
        if rule.scope == "global":
            return f"{base_key}:global"
        elif rule.scope == "user" and user_id:
            return f"{base_key}:user:{user_id}"
        elif rule.scope == "ip" and ip_address:
            return f"{base_key}:ip:{ip_address}"
        elif rule.scope == "endpoint" and endpoint:
            return f"{base_key}:endpoint:{endpoint}"
        else:
            # Fallback to identifier
            return f"{base_key}:{identifier}"
    
    async def _is_identifier_blocked(self, identifier: str, rule: RateLimitRule) -> bool:
        """Check if identifier is currently blocked"""
        if not self.redis:
            return False
        
        block_key = f"blocked:{rule.name}:{identifier}"
        is_blocked = await self.redis.get(block_key)
        return bool(is_blocked)
    
    async def block_identifier(
        self,
        identifier: str,
        rule_name: str,
        duration_seconds: Optional[int] = None
    ) -> bool:
        """Block an identifier for a specified duration"""
        if not self.redis:
            return False
        
        rule = self.rules.get(rule_name)
        if not rule:
            return False
        
        block_duration = duration_seconds or rule.block_duration_seconds
        block_key = f"blocked:{rule_name}:{identifier}"
        
        try:
            await self.redis.setex(block_key, block_duration, "blocked")
            logger.warning(f"Blocked identifier {identifier} for {block_duration} seconds due to {rule_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to block identifier {identifier}: {e}")
            return False
    
    async def unblock_identifier(self, identifier: str, rule_name: str) -> bool:
        """Unblock an identifier"""
        if not self.redis:
            return False
        
        block_key = f"blocked:{rule_name}:{identifier}"
        
        try:
            result = await self.redis.delete(block_key)
            logger.info(f"Unblocked identifier {identifier} for rule {rule_name}")
            return bool(result)
        except Exception as e:
            logger.error(f"Failed to unblock identifier {identifier}: {e}")
            return False
    
    async def get_rate_limit_status(
        self,
        identifier: str,
        rule_name: str,
        ip_address: Optional[str] = None,
        user_id: Optional[str] = None,
        endpoint: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get current rate limit status for an identifier"""
        if not self.redis:
            return {"error": "Redis not available"}
        
        rule = self.rules.get(rule_name)
        if not rule:
            return {"error": "Rule not found"}
        
        key = self._get_rate_limit_key(rule, identifier, ip_address, user_id, endpoint)
        
        try:
            current_count = await self.redis.get(key)
            current_count = int(current_count) if current_count else 0
            
            ttl = await self.redis.ttl(key)
            
            is_blocked = await self._is_identifier_blocked(identifier, rule)
            
            return {
                "rule_name": rule_name,
                "current_count": current_count,
                "limit": rule.requests_per_window,
                "window_seconds": rule.window_seconds,
                "remaining": rule.requests_per_window - current_count,
                "window_ttl": ttl,
                "blocked": is_blocked,
                "utilization_percent": (current_count / rule.requests_per_window) * 100
            }
        except Exception as e:
            return {"error": str(e)}
    
    async def get_violations(
        self,
        hours: int = 24,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get rate limit violations"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        recent_violations = [
            violation for violation in self.violations
            if violation.violation_time >= cutoff_time
        ]
        
        # Sort by violation time (most recent first)
        recent_violations.sort(key=lambda v: v.violation_time, reverse=True)
        
        return [
            {
                "identifier": violation.identifier,
                "rule_name": violation.rule_name,
                "requests_count": violation.requests_count,
                "limit": violation.limit,
                "violation_time": violation.violation_time.isoformat(),
                "ip_address": violation.ip_address,
                "user_id": violation.user_id,
                "endpoint": violation.endpoint
            }
            for violation in recent_violations[:limit]
        ]
    
    async def get_rate_limit_statistics(self) -> Dict[str, Any]:
        """Get rate limiting statistics"""
        total_violations = len(self.violations)
        
        # Group violations by rule
        violations_by_rule = {}
        for violation in self.violations:
            rule_name = violation.rule_name
            if rule_name not in violations_by_rule:
                violations_by_rule[rule_name] = 0
            violations_by_rule[rule_name] += 1
        
        # Get active rules
        active_rules = [rule for rule in self.rules.values() if rule.enabled]
        
        return {
            "total_rules": len(self.rules),
            "active_rules": len(active_rules),
            "total_violations": total_violations,
            "violations_by_rule": violations_by_rule,
            "rules": {
                name: {
                    "requests_per_window": rule.requests_per_window,
                    "window_seconds": rule.window_seconds,
                    "scope": rule.scope,
                    "enabled": rule.enabled
                }
                for name, rule in self.rules.items()
            }
        }
    
    def add_rule(self, rule: RateLimitRule) -> bool:
        """Add a new rate limiting rule"""
        try:
            self.rules[rule.name] = rule
            logger.info(f"Added rate limiting rule: {rule.name}")
            return True
        except Exception as e:
            logger.error(f"Failed to add rate limiting rule {rule.name}: {e}")
            return False
    
    def update_rule(self, rule_name: str, updates: Dict[str, Any]) -> bool:
        """Update an existing rate limiting rule"""
        if rule_name not in self.rules:
            return False
        
        try:
            rule = self.rules[rule_name]
            for key, value in updates.items():
                if hasattr(rule, key):
                    setattr(rule, key, value)
            
            logger.info(f"Updated rate limiting rule: {rule_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to update rate limiting rule {rule_name}: {e}")
            return False
    
    def remove_rule(self, rule_name: str) -> bool:
        """Remove a rate limiting rule"""
        if rule_name not in self.rules:
            return False
        
        try:
            del self.rules[rule_name]
            logger.info(f"Removed rate limiting rule: {rule_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to remove rate limiting rule {rule_name}: {e}")
            return False

# Global rate limiting service instance
rate_limiting_service = RateLimitingService()
