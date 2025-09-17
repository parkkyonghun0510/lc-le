from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from fastapi import Depends
import json
import logging
from enum import Enum

from app.database import get_db
from app.models.audit import AuditLog, AuditEventType
from app.core.config import settings

logger = logging.getLogger(__name__)

class ValidationEventType(str, Enum):
    """Types of validation events to track"""
    DUPLICATE_CHECK = "duplicate_check"
    DUPLICATE_FOUND = "duplicate_found"
    VALIDATION_SUCCESS = "validation_success"
    VALIDATION_ERROR = "validation_error"
    FIELD_AVAILABILITY_CHECK = "field_availability_check"
    BULK_VALIDATION = "bulk_validation"
    CONSTRAINT_VIOLATION = "constraint_violation"

class AuditService:
    """Service for logging validation and duplicate detection events"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def log_validation_event(
        self,
        event_type: ValidationEventType,
        entity_type: str,
        entity_id: Optional[str] = None,
        field_name: Optional[str] = None,
        field_value: Optional[str] = None,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        result: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """Log a validation event with comprehensive details"""
        try:
            # Sanitize sensitive data
            sanitized_value = self._sanitize_field_value(field_name, field_value)
            
            # Prepare audit data
            audit_data = {
                "event_type": event_type.value,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "field_name": field_name,
                "field_value": sanitized_value,
                "result": result,
                "error_message": error_message,
                "metadata": metadata or {},
                "ip_address": ip_address,
                "user_agent": user_agent
            }
            
            # Create audit log entry
            audit_log = AuditLog(
                event_type=AuditEventType.VALIDATION,
                entity_type=entity_type,
                entity_id=entity_id,
                user_id=user_id,
                action="validation_check",
                details=audit_data,
                ip_address=ip_address,
                user_agent=user_agent,
                timestamp=datetime.now(timezone.utc)
            )
            
            self.db.add(audit_log)
            await self.db.commit()
            await self.db.refresh(audit_log)
            
            # Log to application logger as well
            self._log_to_application_logger(event_type, audit_data)
            
            return audit_log
            
        except Exception as e:
            logger.error(f"Failed to log validation event: {str(e)}")
            await self.db.rollback()
            raise
    
    async def log_duplicate_attempt(
        self,
        entity_type: str,
        field_name: str,
        field_value: str,
        existing_entity_id: Optional[str] = None,
        attempted_entity_id: Optional[str] = None,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        severity: str = "warning"
    ) -> AuditLog:
        """Log duplicate value attempts for security monitoring"""
        metadata = {
            "severity": severity,
            "existing_entity_id": existing_entity_id,
            "attempted_entity_id": attempted_entity_id,
            "duplicate_type": "field_value"
        }
        
        return await self.log_validation_event(
            event_type=ValidationEventType.DUPLICATE_FOUND,
            entity_type=entity_type,
            field_name=field_name,
            field_value=field_value,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata
        )
    
    async def log_constraint_violation(
        self,
        entity_type: str,
        constraint_name: str,
        violation_details: Dict[str, Any],
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """Log database constraint violations"""
        metadata = {
            "constraint_name": constraint_name,
            "violation_details": violation_details,
            "severity": "error"
        }
        
        return await self.log_validation_event(
            event_type=ValidationEventType.CONSTRAINT_VIOLATION,
            entity_type=entity_type,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata,
            error_message=f"Constraint violation: {constraint_name}"
        )
    
    async def log_bulk_validation(
        self,
        entity_type: str,
        validation_results: List[Dict[str, Any]],
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """Log bulk validation operations"""
        total_checks = len(validation_results)
        duplicates_found = sum(1 for result in validation_results if not result.get('is_available', True))
        
        metadata = {
            "total_checks": total_checks,
            "duplicates_found": duplicates_found,
            "success_rate": (total_checks - duplicates_found) / total_checks if total_checks > 0 else 0,
            "validation_summary": validation_results
        }
        
        return await self.log_validation_event(
            event_type=ValidationEventType.BULK_VALIDATION,
            entity_type=entity_type,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata
        )
    
    async def get_validation_statistics(
        self,
        entity_type: Optional[str] = None,
        field_name: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get validation statistics for monitoring and analysis"""
        try:
            query = select(AuditLog).where(AuditLog.event_type == AuditEventType.VALIDATION)
            
            if entity_type:
                query = query.where(AuditLog.entity_type == entity_type)
            
            if start_date:
                query = query.where(AuditLog.timestamp >= start_date)
            
            if end_date:
                query = query.where(AuditLog.timestamp <= end_date)
            
            result = await self.db.execute(query)
            audit_logs = result.scalars().all()
            
            # Process statistics
            stats = {
                "total_validations": len(audit_logs),
                "duplicate_attempts": 0,
                "successful_validations": 0,
                "validation_errors": 0,
                "field_statistics": {},
                "entity_statistics": {},
                "hourly_distribution": {},
                "top_duplicate_fields": {}
            }
            
            for log in audit_logs:
                details = log.details or {}
                event_type = details.get('event_type')
                field = details.get('field_name')
                entity = log.entity_type
                hour = log.timestamp.hour
                
                # Count by event type
                if event_type == ValidationEventType.DUPLICATE_FOUND.value:
                    stats["duplicate_attempts"] += 1
                    if field:
                        stats["top_duplicate_fields"][field] = stats["top_duplicate_fields"].get(field, 0) + 1
                elif event_type == ValidationEventType.VALIDATION_SUCCESS.value:
                    stats["successful_validations"] += 1
                elif event_type == ValidationEventType.VALIDATION_ERROR.value:
                    stats["validation_errors"] += 1
                
                # Field statistics
                if field:
                    if field not in stats["field_statistics"]:
                        stats["field_statistics"][field] = {"total": 0, "duplicates": 0, "success_rate": 0}
                    stats["field_statistics"][field]["total"] += 1
                    if event_type == ValidationEventType.DUPLICATE_FOUND.value:
                        stats["field_statistics"][field]["duplicates"] += 1
                
                # Entity statistics
                if entity:
                    if entity not in stats["entity_statistics"]:
                        stats["entity_statistics"][entity] = {"total": 0, "duplicates": 0}
                    stats["entity_statistics"][entity]["total"] += 1
                    if event_type == ValidationEventType.DUPLICATE_FOUND.value:
                        stats["entity_statistics"][entity]["duplicates"] += 1
                
                # Hourly distribution
                stats["hourly_distribution"][hour] = stats["hourly_distribution"].get(hour, 0) + 1
            
            # Calculate success rates
            for field_stats in stats["field_statistics"].values():
                total = field_stats["total"]
                duplicates = field_stats["duplicates"]
                field_stats["success_rate"] = (total - duplicates) / total if total > 0 else 0
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get validation statistics: {str(e)}")
            raise
    
    async def get_suspicious_activity(
        self,
        threshold_attempts: int = 10,
        time_window_hours: int = 1
    ) -> List[Dict[str, Any]]:
        """Identify suspicious validation activity patterns"""
        try:
            # Look for high-frequency duplicate attempts from same IP/user
            from datetime import timedelta
            
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=time_window_hours)
            
            query = select(AuditLog).where(
                AuditLog.event_type == AuditEventType.VALIDATION,
                AuditLog.timestamp >= cutoff_time
            )
            
            result = await self.db.execute(query)
            recent_logs = result.scalars().all()
            
            # Group by IP address and user
            activity_groups = {}
            
            for log in recent_logs:
                details = log.details or {}
                if details.get('event_type') == ValidationEventType.DUPLICATE_FOUND.value:
                    key = f"{log.ip_address}_{log.user_id}"
                    if key not in activity_groups:
                        activity_groups[key] = {
                            "ip_address": log.ip_address,
                            "user_id": log.user_id,
                            "attempts": 0,
                            "fields_attempted": set(),
                            "entities_attempted": set(),
                            "first_attempt": log.timestamp,
                            "last_attempt": log.timestamp
                        }
                    
                    group = activity_groups[key]
                    group["attempts"] += 1
                    group["fields_attempted"].add(details.get('field_name'))
                    group["entities_attempted"].add(log.entity_type)
                    group["last_attempt"] = max(group["last_attempt"], log.timestamp)
            
            # Filter suspicious activity
            suspicious = []
            for group in activity_groups.values():
                if group["attempts"] >= threshold_attempts:
                    group["fields_attempted"] = list(group["fields_attempted"])
                    group["entities_attempted"] = list(group["entities_attempted"])
                    group["risk_score"] = min(100, (group["attempts"] / threshold_attempts) * 50)
                    suspicious.append(group)
            
            return sorted(suspicious, key=lambda x: x["risk_score"], reverse=True)
            
        except Exception as e:
            logger.error(f"Failed to get suspicious activity: {str(e)}")
            raise
    
    def _sanitize_field_value(self, field_name: Optional[str], field_value: Optional[str]) -> Optional[str]:
        """Sanitize sensitive field values for logging"""
        if not field_value or not field_name:
            return field_value
        
        sensitive_fields = {'password', 'token', 'secret', 'key', 'ssn', 'credit_card'}
        
        if any(sensitive in field_name.lower() for sensitive in sensitive_fields):
            return "[REDACTED]"
        
        # For other fields, limit length and mask partially
        if len(field_value) > 50:
            return field_value[:20] + "..." + field_value[-10:]
        
        return field_value
    
    def _log_to_application_logger(self, event_type: ValidationEventType, audit_data: Dict[str, Any]):
        """Log validation events to application logger for real-time monitoring"""
        try:
            log_message = f"Validation Event: {event_type.value}"
            
            if audit_data.get('entity_type'):
                log_message += f" | Entity: {audit_data['entity_type']}"
            
            if audit_data.get('field_name'):
                log_message += f" | Field: {audit_data['field_name']}"
            
            if audit_data.get('error_message'):
                log_message += f" | Error: {audit_data['error_message']}"
            
            if event_type == ValidationEventType.DUPLICATE_FOUND:
                logger.warning(log_message)
            elif event_type == ValidationEventType.VALIDATION_ERROR:
                logger.error(log_message)
            elif event_type == ValidationEventType.CONSTRAINT_VIOLATION:
                logger.error(log_message)
            else:
                logger.info(log_message)
                
        except Exception as e:
            logger.error(f"Failed to log to application logger: {str(e)}")

# Dependency injection helper
async def get_audit_service(db: AsyncSession = Depends(get_db)) -> AuditService:
    """Get audit service instance with database session"""
    return AuditService(db)