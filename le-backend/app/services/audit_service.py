from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc, text
from sqlalchemy.orm import selectinload
from fastapi import Depends
import json
import logging
from enum import Enum
from uuid import UUID

from app.database import get_db
from app.models.audit import AuditLog, AuditEventType
from app.models import UserActivity, BulkOperation, UserStatusHistory, User
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

class UserActivityType(str, Enum):
    """Types of user activities to track"""
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    PASSWORD_CHANGE = "password_change"
    PROFILE_UPDATE = "profile_update"
    STATUS_CHANGE = "status_change"
    ROLE_CHANGE = "role_change"
    DATA_ACCESS = "data_access"
    DATA_EXPORT = "data_export"
    BULK_OPERATION = "bulk_operation"
    SYSTEM_ACCESS = "system_access"
    PERMISSION_DENIED = "permission_denied"

class ComplianceReportType(str, Enum):
    """Types of compliance reports"""
    USER_ACCESS_REPORT = "user_access_report"
    DATA_MODIFICATION_REPORT = "data_modification_report"
    BULK_OPERATIONS_REPORT = "bulk_operations_report"
    SECURITY_EVENTS_REPORT = "security_events_report"
    USER_LIFECYCLE_REPORT = "user_lifecycle_report"
    AUDIT_TRAIL_REPORT = "audit_trail_report"

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

    # Enhanced User Management Audit Methods
    
    async def log_user_activity(
        self,
        user_id: UUID,
        activity_type: UserActivityType,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> UserActivity:
        """Log user activity for tracking user actions and login patterns"""
        try:
            # Create user activity record
            user_activity = UserActivity(
                user_id=user_id,
                activity_type=activity_type.value,
                details=details or {},
                ip_address=ip_address,
                user_agent=user_agent,
                session_id=session_id
            )
            
            self.db.add(user_activity)
            
            # Also create audit log entry for comprehensive tracking
            audit_data = {
                "activity_type": activity_type.value,
                "user_id": str(user_id),
                "details": details or {},
                "session_id": session_id
            }
            
            audit_log = AuditLog(
                event_type=AuditEventType.USER_ACTION,
                entity_type="user_activity",
                entity_id=str(user_id),
                user_id=str(user_id),
                action=activity_type.value,
                details=audit_data,
                ip_address=ip_address,
                user_agent=user_agent,
                success='true',
                timestamp=datetime.now(timezone.utc)
            )
            
            self.db.add(audit_log)
            await self.db.commit()
            await self.db.refresh(user_activity)
            
            # Log to application logger
            logger.info(f"User activity logged: {activity_type.value} for user {user_id}")
            
            return user_activity
            
        except Exception as e:
            logger.error(f"Failed to log user activity: {str(e)}")
            await self.db.rollback()
            raise
    
    async def log_bulk_operation(
        self,
        operation: BulkOperation,
        performed_by: UUID,
        additional_details: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """Log bulk operation for tracking bulk operations with detailed results"""
        try:
            audit_data = {
                "operation_id": str(operation.id),
                "operation_type": operation.operation_type,
                "performed_by": str(performed_by),
                "target_criteria": operation.target_criteria,
                "changes_applied": operation.changes_applied,
                "total_records": operation.total_records,
                "successful_records": operation.successful_records,
                "failed_records": operation.failed_records,
                "error_details": operation.error_details,
                "status": operation.status,
                "progress_percentage": operation.progress_percentage,
                "additional_details": additional_details or {}
            }
            
            # Determine success status
            success_status = 'true'
            if operation.status == 'failed':
                success_status = 'false'
            elif operation.failed_records > 0:
                success_status = 'partial'
            
            audit_log = AuditLog(
                event_type=AuditEventType.SYSTEM_EVENT,
                entity_type="bulk_operation",
                entity_id=str(operation.id),
                user_id=str(performed_by),
                action=f"bulk_{operation.operation_type}",
                details=audit_data,
                success=success_status,
                error_message=operation.error_details.get('summary') if operation.error_details else None,
                timestamp=datetime.now(timezone.utc)
            )
            
            self.db.add(audit_log)
            await self.db.commit()
            await self.db.refresh(audit_log)
            
            # Log to application logger with appropriate level
            if success_status == 'false':
                logger.error(f"Bulk operation failed: {operation.operation_type} by user {performed_by}")
            elif success_status == 'partial':
                logger.warning(f"Bulk operation partially successful: {operation.operation_type} by user {performed_by}")
            else:
                logger.info(f"Bulk operation completed: {operation.operation_type} by user {performed_by}")
            
            return audit_log
            
        except Exception as e:
            logger.error(f"Failed to log bulk operation: {str(e)}")
            await self.db.rollback()
            raise
    
    async def get_user_audit_trail(
        self,
        user_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        activity_types: Optional[List[str]] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Retrieve complete user activity history"""
        try:
            # Default date range to last 30 days if not specified
            if not start_date:
                start_date = datetime.now(timezone.utc) - timedelta(days=30)
            if not end_date:
                end_date = datetime.now(timezone.utc)
            
            # Query user activities
            activity_query = select(UserActivity).where(
                and_(
                    UserActivity.user_id == user_id,
                    UserActivity.created_at >= start_date,
                    UserActivity.created_at <= end_date
                )
            )
            
            if activity_types:
                activity_query = activity_query.where(UserActivity.activity_type.in_(activity_types))
            
            activity_query = activity_query.order_by(desc(UserActivity.created_at)).limit(limit).offset(offset)
            
            # Query audit logs
            audit_query = select(AuditLog).where(
                and_(
                    AuditLog.user_id == str(user_id),
                    AuditLog.timestamp >= start_date,
                    AuditLog.timestamp <= end_date
                )
            ).order_by(desc(AuditLog.timestamp)).limit(limit).offset(offset)
            
            # Query status history
            status_query = select(UserStatusHistory).where(
                and_(
                    UserStatusHistory.user_id == user_id,
                    UserStatusHistory.changed_at >= start_date,
                    UserStatusHistory.changed_at <= end_date
                )
            ).order_by(desc(UserStatusHistory.changed_at))
            
            # Execute queries
            activity_result = await self.db.execute(activity_query)
            audit_result = await self.db.execute(audit_query)
            status_result = await self.db.execute(status_query)
            
            activities = activity_result.scalars().all()
            audit_logs = audit_result.scalars().all()
            status_changes = status_result.scalars().all()
            
            # Get total counts for pagination
            total_activities_query = select(func.count(UserActivity.id)).where(
                and_(
                    UserActivity.user_id == user_id,
                    UserActivity.created_at >= start_date,
                    UserActivity.created_at <= end_date
                )
            )
            if activity_types:
                total_activities_query = total_activities_query.where(UserActivity.activity_type.in_(activity_types))
            
            total_result = await self.db.execute(total_activities_query)
            total_activities = total_result.scalar()
            
            # Format response
            audit_trail = {
                "user_id": str(user_id),
                "date_range": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "pagination": {
                    "limit": limit,
                    "offset": offset,
                    "total_activities": total_activities,
                    "has_more": total_activities > (offset + limit)
                },
                "activities": [
                    {
                        "id": str(activity.id),
                        "activity_type": activity.activity_type,
                        "details": activity.details,
                        "ip_address": activity.ip_address,
                        "user_agent": activity.user_agent,
                        "session_id": activity.session_id,
                        "created_at": activity.created_at.isoformat()
                    }
                    for activity in activities
                ],
                "audit_logs": [
                    {
                        "id": str(log.id),
                        "event_type": log.event_type.value,
                        "action": log.action,
                        "details": log.details,
                        "success": log.success,
                        "error_message": log.error_message,
                        "ip_address": log.ip_address,
                        "timestamp": log.timestamp.isoformat()
                    }
                    for log in audit_logs
                ],
                "status_changes": [
                    {
                        "id": str(change.id),
                        "old_status": change.old_status,
                        "new_status": change.new_status,
                        "reason_code": change.reason_code,
                        "reason_comment": change.reason_comment,
                        "changed_by": str(change.changed_by),
                        "changed_at": change.changed_at.isoformat(),
                        "effective_date": change.effective_date.isoformat() if change.effective_date else None
                    }
                    for change in status_changes
                ]
            }
            
            return audit_trail
            
        except Exception as e:
            logger.error(f"Failed to get user audit trail: {str(e)}")
            raise
    
    async def get_compliance_report(
        self,
        report_type: ComplianceReportType,
        start_date: datetime,
        end_date: datetime,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate regulatory compliance reports"""
        try:
            filters = filters or {}
            
            if report_type == ComplianceReportType.USER_ACCESS_REPORT:
                return await self._generate_user_access_report(start_date, end_date, filters)
            elif report_type == ComplianceReportType.DATA_MODIFICATION_REPORT:
                return await self._generate_data_modification_report(start_date, end_date, filters)
            elif report_type == ComplianceReportType.BULK_OPERATIONS_REPORT:
                return await self._generate_bulk_operations_report(start_date, end_date, filters)
            elif report_type == ComplianceReportType.SECURITY_EVENTS_REPORT:
                return await self._generate_security_events_report(start_date, end_date, filters)
            elif report_type == ComplianceReportType.USER_LIFECYCLE_REPORT:
                return await self._generate_user_lifecycle_report(start_date, end_date, filters)
            elif report_type == ComplianceReportType.AUDIT_TRAIL_REPORT:
                return await self._generate_audit_trail_report(start_date, end_date, filters)
            else:
                raise ValueError(f"Unsupported report type: {report_type}")
                
        except Exception as e:
            logger.error(f"Failed to generate compliance report: {str(e)}")
            raise
    
    async def get_activity_aggregations(
        self,
        start_date: datetime,
        end_date: datetime,
        group_by: str = "day",  # day, week, month, hour
        activity_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Implement activity aggregation methods for analytics dashboard data"""
        try:
            # Determine date truncation based on group_by
            if group_by == "hour":
                date_trunc = "hour"
            elif group_by == "day":
                date_trunc = "day"
            elif group_by == "week":
                date_trunc = "week"
            elif group_by == "month":
                date_trunc = "month"
            else:
                raise ValueError(f"Unsupported group_by value: {group_by}")
            
            # Base query for user activities
            base_query = select(
                func.date_trunc(date_trunc, UserActivity.created_at).label('period'),
                UserActivity.activity_type,
                func.count(UserActivity.id).label('count'),
                func.count(func.distinct(UserActivity.user_id)).label('unique_users')
            ).where(
                and_(
                    UserActivity.created_at >= start_date,
                    UserActivity.created_at <= end_date
                )
            )
            
            if activity_types:
                base_query = base_query.where(UserActivity.activity_type.in_(activity_types))
            
            # Group by period and activity type
            activity_aggregation_query = base_query.group_by(
                func.date_trunc(date_trunc, UserActivity.created_at),
                UserActivity.activity_type
            ).order_by(
                func.date_trunc(date_trunc, UserActivity.created_at),
                UserActivity.activity_type
            )
            
            # Execute query
            result = await self.db.execute(activity_aggregation_query)
            activity_data = result.fetchall()
            
            # Query for login patterns
            login_query = select(
                func.date_trunc(date_trunc, UserActivity.created_at).label('period'),
                func.count(UserActivity.id).label('total_logins'),
                func.count(func.distinct(UserActivity.user_id)).label('unique_users'),
                func.avg(
                    func.extract('epoch', 
                        func.lag(UserActivity.created_at).over(
                            partition_by=UserActivity.user_id,
                            order_by=UserActivity.created_at
                        ) - UserActivity.created_at
                    )
                ).label('avg_session_duration')
            ).where(
                and_(
                    UserActivity.activity_type == UserActivityType.LOGIN.value,
                    UserActivity.created_at >= start_date,
                    UserActivity.created_at <= end_date
                )
            ).group_by(
                func.date_trunc(date_trunc, UserActivity.created_at)
            ).order_by(
                func.date_trunc(date_trunc, UserActivity.created_at)
            )
            
            login_result = await self.db.execute(login_query)
            login_data = login_result.fetchall()
            
            # Format response
            aggregations = {
                "date_range": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "group_by": group_by,
                "activity_types_filter": activity_types,
                "activity_breakdown": {},
                "login_patterns": [],
                "summary": {
                    "total_activities": 0,
                    "unique_users": set(),
                    "most_active_period": None,
                    "activity_type_distribution": {}
                }
            }
            
            # Process activity data
            for row in activity_data:
                period_str = row.period.isoformat()
                activity_type = row.activity_type
                count = row.count
                unique_users = row.unique_users
                
                if period_str not in aggregations["activity_breakdown"]:
                    aggregations["activity_breakdown"][period_str] = {}
                
                aggregations["activity_breakdown"][period_str][activity_type] = {
                    "count": count,
                    "unique_users": unique_users
                }
                
                # Update summary
                aggregations["summary"]["total_activities"] += count
                aggregations["summary"]["unique_users"].update([str(i) for i in range(unique_users)])
                
                if activity_type not in aggregations["summary"]["activity_type_distribution"]:
                    aggregations["summary"]["activity_type_distribution"][activity_type] = 0
                aggregations["summary"]["activity_type_distribution"][activity_type] += count
            
            # Process login patterns
            for row in login_data:
                aggregations["login_patterns"].append({
                    "period": row.period.isoformat(),
                    "total_logins": row.total_logins,
                    "unique_users": row.unique_users,
                    "avg_session_duration_seconds": float(row.avg_session_duration) if row.avg_session_duration else None
                })
            
            # Finalize summary
            aggregations["summary"]["unique_users"] = len(aggregations["summary"]["unique_users"])
            
            # Find most active period
            if aggregations["activity_breakdown"]:
                most_active = max(
                    aggregations["activity_breakdown"].items(),
                    key=lambda x: sum(activity["count"] for activity in x[1].values())
                )
                aggregations["summary"]["most_active_period"] = {
                    "period": most_active[0],
                    "total_activities": sum(activity["count"] for activity in most_active[1].values())
                }
            
            return aggregations
            
        except Exception as e:
            logger.error(f"Failed to get activity aggregations: {str(e)}")
            raise
    
    async def archive_old_audit_data(
        self,
        retention_days: int = 365,
        archive_table_suffix: str = "_archived",
        dry_run: bool = True
    ) -> Dict[str, Any]:
        """Create audit data retention and archiving functionality"""
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
            
            # Count records to be archived
            audit_count_query = select(func.count(AuditLog.id)).where(AuditLog.timestamp < cutoff_date)
            activity_count_query = select(func.count(UserActivity.id)).where(UserActivity.created_at < cutoff_date)
            
            audit_count_result = await self.db.execute(audit_count_query)
            activity_count_result = await self.db.execute(activity_count_query)
            
            audit_records_to_archive = audit_count_result.scalar()
            activity_records_to_archive = activity_count_result.scalar()
            
            archive_summary = {
                "cutoff_date": cutoff_date.isoformat(),
                "retention_days": retention_days,
                "dry_run": dry_run,
                "records_to_archive": {
                    "audit_logs": audit_records_to_archive,
                    "user_activities": activity_records_to_archive
                },
                "archive_tables": {
                    "audit_logs": f"audit_logs{archive_table_suffix}",
                    "user_activities": f"user_activities{archive_table_suffix}"
                },
                "archived_records": {
                    "audit_logs": 0,
                    "user_activities": 0
                },
                "errors": []
            }
            
            if not dry_run and (audit_records_to_archive > 0 or activity_records_to_archive > 0):
                try:
                    # Create archive tables if they don't exist
                    await self.db.execute(text(f"""
                        CREATE TABLE IF NOT EXISTS audit_logs{archive_table_suffix} 
                        (LIKE audit_logs INCLUDING ALL)
                    """))
                    
                    await self.db.execute(text(f"""
                        CREATE TABLE IF NOT EXISTS user_activities{archive_table_suffix} 
                        (LIKE user_activities INCLUDING ALL)
                    """))
                    
                    # Archive audit logs
                    if audit_records_to_archive > 0:
                        await self.db.execute(text(f"""
                            INSERT INTO audit_logs{archive_table_suffix}
                            SELECT * FROM audit_logs 
                            WHERE timestamp < :cutoff_date
                        """), {"cutoff_date": cutoff_date})
                        
                        # Delete archived records from main table
                        delete_audit_result = await self.db.execute(text("""
                            DELETE FROM audit_logs WHERE timestamp < :cutoff_date
                        """), {"cutoff_date": cutoff_date})
                        
                        archive_summary["archived_records"]["audit_logs"] = delete_audit_result.rowcount
                    
                    # Archive user activities
                    if activity_records_to_archive > 0:
                        await self.db.execute(text(f"""
                            INSERT INTO user_activities{archive_table_suffix}
                            SELECT * FROM user_activities 
                            WHERE created_at < :cutoff_date
                        """), {"cutoff_date": cutoff_date})
                        
                        # Delete archived records from main table
                        delete_activity_result = await self.db.execute(text("""
                            DELETE FROM user_activities WHERE created_at < :cutoff_date
                        """), {"cutoff_date": cutoff_date})
                        
                        archive_summary["archived_records"]["user_activities"] = delete_activity_result.rowcount
                    
                    await self.db.commit()
                    
                    logger.info(f"Archived {archive_summary['archived_records']['audit_logs']} audit logs and {archive_summary['archived_records']['user_activities']} user activities")
                    
                except Exception as archive_error:
                    await self.db.rollback()
                    error_msg = f"Failed to archive data: {str(archive_error)}"
                    archive_summary["errors"].append(error_msg)
                    logger.error(error_msg)
            
            return archive_summary
            
        except Exception as e:
            logger.error(f"Failed to archive audit data: {str(e)}")
            raise
    
    # Private helper methods for compliance reports
    
    async def _generate_user_access_report(
        self,
        start_date: datetime,
        end_date: datetime,
        filters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate user access compliance report"""
        # Query for login activities
        login_query = select(
            UserActivity.user_id,
            func.count(UserActivity.id).label('login_count'),
            func.min(UserActivity.created_at).label('first_login'),
            func.max(UserActivity.created_at).label('last_login'),
            func.array_agg(func.distinct(UserActivity.ip_address)).label('ip_addresses')
        ).where(
            and_(
                UserActivity.activity_type == UserActivityType.LOGIN.value,
                UserActivity.created_at >= start_date,
                UserActivity.created_at <= end_date
            )
        ).group_by(UserActivity.user_id)
        
        if filters.get('user_ids'):
            login_query = login_query.where(UserActivity.user_id.in_(filters['user_ids']))
        
        result = await self.db.execute(login_query)
        login_data = result.fetchall()
        
        return {
            "report_type": "user_access_report",
            "date_range": {"start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
            "filters": filters,
            "data": [
                {
                    "user_id": str(row.user_id),
                    "login_count": row.login_count,
                    "first_login": row.first_login.isoformat(),
                    "last_login": row.last_login.isoformat(),
                    "unique_ip_addresses": len([ip for ip in row.ip_addresses if ip]),
                    "ip_addresses": [ip for ip in row.ip_addresses if ip]
                }
                for row in login_data
            ]
        }
    
    async def _generate_data_modification_report(
        self,
        start_date: datetime,
        end_date: datetime,
        filters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate data modification compliance report"""
        # Query for data modification audit logs
        modification_query = select(AuditLog).where(
            and_(
                AuditLog.event_type.in_([AuditEventType.DATA_CHANGE, AuditEventType.USER_ACTION]),
                AuditLog.action.in_(['create', 'update', 'delete', 'profile_update', 'status_change']),
                AuditLog.timestamp >= start_date,
                AuditLog.timestamp <= end_date
            )
        ).order_by(desc(AuditLog.timestamp))
        
        if filters.get('user_ids'):
            modification_query = modification_query.where(AuditLog.user_id.in_([str(uid) for uid in filters['user_ids']]))
        
        result = await self.db.execute(modification_query)
        modifications = result.scalars().all()
        
        return {
            "report_type": "data_modification_report",
            "date_range": {"start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
            "filters": filters,
            "total_modifications": len(modifications),
            "data": [
                {
                    "id": str(mod.id),
                    "user_id": mod.user_id,
                    "entity_type": mod.entity_type,
                    "entity_id": mod.entity_id,
                    "action": mod.action,
                    "details": mod.details,
                    "success": mod.success,
                    "timestamp": mod.timestamp.isoformat(),
                    "ip_address": mod.ip_address
                }
                for mod in modifications
            ]
        }
    
    async def _generate_bulk_operations_report(
        self,
        start_date: datetime,
        end_date: datetime,
        filters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate bulk operations compliance report"""
        # Query bulk operations
        bulk_query = select(BulkOperation).where(
            and_(
                BulkOperation.created_at >= start_date,
                BulkOperation.created_at <= end_date
            )
        ).order_by(desc(BulkOperation.created_at))
        
        if filters.get('operation_types'):
            bulk_query = bulk_query.where(BulkOperation.operation_type.in_(filters['operation_types']))
        
        if filters.get('performed_by'):
            bulk_query = bulk_query.where(BulkOperation.performed_by.in_(filters['performed_by']))
        
        result = await self.db.execute(bulk_query)
        operations = result.scalars().all()
        
        return {
            "report_type": "bulk_operations_report",
            "date_range": {"start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
            "filters": filters,
            "total_operations": len(operations),
            "data": [
                {
                    "id": str(op.id),
                    "operation_type": op.operation_type,
                    "performed_by": str(op.performed_by),
                    "total_records": op.total_records,
                    "successful_records": op.successful_records,
                    "failed_records": op.failed_records,
                    "status": op.status,
                    "created_at": op.created_at.isoformat(),
                    "completed_at": op.completed_at.isoformat() if op.completed_at else None,
                    "target_criteria": op.target_criteria,
                    "changes_applied": op.changes_applied
                }
                for op in operations
            ]
        }
    
    async def _generate_security_events_report(
        self,
        start_date: datetime,
        end_date: datetime,
        filters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate security events compliance report"""
        # Query for security-related activities
        security_query = select(UserActivity).where(
            and_(
                UserActivity.activity_type.in_([
                    UserActivityType.LOGIN_FAILED.value,
                    UserActivityType.PERMISSION_DENIED.value,
                    UserActivityType.PASSWORD_CHANGE.value
                ]),
                UserActivity.created_at >= start_date,
                UserActivity.created_at <= end_date
            )
        ).order_by(desc(UserActivity.created_at))
        
        if filters.get('user_ids'):
            security_query = security_query.where(UserActivity.user_id.in_(filters['user_ids']))
        
        result = await self.db.execute(security_query)
        security_events = result.scalars().all()
        
        return {
            "report_type": "security_events_report",
            "date_range": {"start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
            "filters": filters,
            "total_events": len(security_events),
            "data": [
                {
                    "id": str(event.id),
                    "user_id": str(event.user_id),
                    "activity_type": event.activity_type,
                    "details": event.details,
                    "ip_address": event.ip_address,
                    "user_agent": event.user_agent,
                    "created_at": event.created_at.isoformat()
                }
                for event in security_events
            ]
        }
    
    async def _generate_user_lifecycle_report(
        self,
        start_date: datetime,
        end_date: datetime,
        filters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate user lifecycle compliance report"""
        # Query for status changes
        lifecycle_query = select(UserStatusHistory).where(
            and_(
                UserStatusHistory.changed_at >= start_date,
                UserStatusHistory.changed_at <= end_date
            )
        ).order_by(desc(UserStatusHistory.changed_at))
        
        if filters.get('user_ids'):
            lifecycle_query = lifecycle_query.where(UserStatusHistory.user_id.in_(filters['user_ids']))
        
        result = await self.db.execute(lifecycle_query)
        lifecycle_events = result.scalars().all()
        
        return {
            "report_type": "user_lifecycle_report",
            "date_range": {"start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
            "filters": filters,
            "total_events": len(lifecycle_events),
            "data": [
                {
                    "id": str(event.id),
                    "user_id": str(event.user_id),
                    "old_status": event.old_status,
                    "new_status": event.new_status,
                    "reason_code": event.reason_code,
                    "reason_comment": event.reason_comment,
                    "changed_by": str(event.changed_by),
                    "changed_at": event.changed_at.isoformat(),
                    "effective_date": event.effective_date.isoformat() if event.effective_date else None
                }
                for event in lifecycle_events
            ]
        }
    
    async def _generate_audit_trail_report(
        self,
        start_date: datetime,
        end_date: datetime,
        filters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate comprehensive audit trail report"""
        # Query all audit logs
        audit_query = select(AuditLog).where(
            and_(
                AuditLog.timestamp >= start_date,
                AuditLog.timestamp <= end_date
            )
        ).order_by(desc(AuditLog.timestamp))
        
        if filters.get('user_ids'):
            audit_query = audit_query.where(AuditLog.user_id.in_([str(uid) for uid in filters['user_ids']]))
        
        if filters.get('event_types'):
            audit_query = audit_query.where(AuditLog.event_type.in_(filters['event_types']))
        
        result = await self.db.execute(audit_query)
        audit_logs = result.scalars().all()
        
        return {
            "report_type": "audit_trail_report",
            "date_range": {"start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
            "filters": filters,
            "total_entries": len(audit_logs),
            "data": [
                {
                    "id": str(log.id),
                    "event_type": log.event_type.value,
                    "entity_type": log.entity_type,
                    "entity_id": log.entity_id,
                    "user_id": log.user_id,
                    "action": log.action,
                    "details": log.details,
                    "success": log.success,
                    "error_message": log.error_message,
                    "ip_address": log.ip_address,
                    "user_agent": log.user_agent,
                    "timestamp": log.timestamp.isoformat()
                }
                for log in audit_logs
            ]
        }

# Dependency injection helper
async def get_audit_service(db: AsyncSession = Depends(get_db)) -> AuditService:
    """Get audit service instance with database session"""
    return AuditService(db)