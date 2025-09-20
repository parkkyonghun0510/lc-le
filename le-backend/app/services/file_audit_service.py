"""
Comprehensive audit logging service for file operations.
Tracks all file-related activities for security and compliance.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import Request
import json
import logging
from enum import Enum
from uuid import UUID

from app.database import get_db
from app.models.audit import AuditLog, AuditEventType
from app.models import User, File, Folder, CustomerApplication
from app.core.config import settings

logger = logging.getLogger(__name__)

class FileOperationType(str, Enum):
    """Types of file operations to audit"""
    UPLOAD = "file_upload"
    DOWNLOAD = "file_download"
    DELETE = "file_delete"
    VIEW = "file_view"
    MOVE = "file_move"
    RENAME = "file_rename"
    SHARE = "file_share"
    ENCRYPT = "file_encrypt"
    DECRYPT = "file_decrypt"
    SCAN = "file_scan"
    ACCESS_DENIED = "file_access_denied"
    INTEGRITY_CHECK = "file_integrity_check"

class FileAuditService:
    """
    Service for comprehensive file operation auditing
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def log_file_upload(
        self,
        file_id: UUID,
        user_id: UUID,
        filename: str,
        file_size: int,
        content_type: str,
        application_id: Optional[UUID] = None,
        folder_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        upload_method: str = "direct",
        scan_result: Optional[Dict[str, Any]] = None,
        encryption_status: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """Log file upload operation"""
        
        audit_data = {
            "operation": FileOperationType.UPLOAD.value,
            "file_id": str(file_id),
            "filename": filename,
            "file_size": file_size,
            "content_type": content_type,
            "application_id": str(application_id) if application_id else None,
            "folder_id": str(folder_id) if folder_id else None,
            "upload_method": upload_method,
            "scan_result": scan_result,
            "encryption_status": encryption_status,
            "metadata": metadata or {}
        }
        
        return await self._create_audit_log(
            event_type=AuditEventType.FILE_OPERATION,
            entity_type="file",
            entity_id=str(file_id),
            user_id=str(user_id),
            action="upload",
            details=audit_data,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    async def log_file_download(
        self,
        file_id: UUID,
        user_id: UUID,
        filename: str,
        download_method: str = "direct",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        access_granted: bool = True,
        denial_reason: Optional[str] = None
    ) -> AuditLog:
        """Log file download operation"""
        
        audit_data = {
            "operation": FileOperationType.DOWNLOAD.value,
            "file_id": str(file_id),
            "filename": filename,
            "download_method": download_method,
            "access_granted": access_granted,
            "denial_reason": denial_reason
        }
        
        operation_type = FileOperationType.DOWNLOAD if access_granted else FileOperationType.ACCESS_DENIED
        
        return await self._create_audit_log(
            event_type=AuditEventType.FILE_OPERATION,
            entity_type="file",
            entity_id=str(file_id),
            user_id=str(user_id),
            action="download" if access_granted else "access_denied",
            details=audit_data,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    async def log_file_deletion(
        self,
        file_id: UUID,
        user_id: UUID,
        filename: str,
        file_path: str,
        deletion_reason: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        cascade_deletions: Optional[List[str]] = None
    ) -> AuditLog:
        """Log file deletion operation"""
        
        audit_data = {
            "operation": FileOperationType.DELETE.value,
            "file_id": str(file_id),
            "filename": filename,
            "file_path": file_path,
            "deletion_reason": deletion_reason,
            "cascade_deletions": cascade_deletions or []
        }
        
        return await self._create_audit_log(
            event_type=AuditEventType.FILE_OPERATION,
            entity_type="file",
            entity_id=str(file_id),
            user_id=str(user_id),
            action="delete",
            details=audit_data,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    async def log_file_access_attempt(
        self,
        file_id: UUID,
        user_id: UUID,
        operation: str,
        access_granted: bool,
        denial_reason: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        requested_permissions: Optional[List[str]] = None
    ) -> AuditLog:
        """Log file access attempt (successful or denied)"""
        
        audit_data = {
            "operation": operation,
            "file_id": str(file_id),
            "access_granted": access_granted,
            "denial_reason": denial_reason,
            "requested_permissions": requested_permissions or []
        }
        
        return await self._create_audit_log(
            event_type=AuditEventType.ACCESS_CONTROL,
            entity_type="file",
            entity_id=str(file_id),
            user_id=str(user_id),
            action="access_attempt",
            details=audit_data,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    async def log_file_encryption(
        self,
        file_id: UUID,
        user_id: UUID,
        filename: str,
        encryption_algorithm: str,
        key_id: str,
        encryption_reason: str = "automatic",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """Log file encryption operation"""
        
        audit_data = {
            "operation": FileOperationType.ENCRYPT.value,
            "file_id": str(file_id),
            "filename": filename,
            "encryption_algorithm": encryption_algorithm,
            "key_id": key_id,
            "encryption_reason": encryption_reason
        }
        
        return await self._create_audit_log(
            event_type=AuditEventType.SECURITY,
            entity_type="file",
            entity_id=str(file_id),
            user_id=str(user_id),
            action="encrypt",
            details=audit_data,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    async def log_file_decryption(
        self,
        file_id: UUID,
        user_id: UUID,
        filename: str,
        decryption_reason: str,
        success: bool = True,
        error_message: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """Log file decryption operation"""
        
        audit_data = {
            "operation": FileOperationType.DECRYPT.value,
            "file_id": str(file_id),
            "filename": filename,
            "decryption_reason": decryption_reason,
            "success": success,
            "error_message": error_message
        }
        
        return await self._create_audit_log(
            event_type=AuditEventType.SECURITY,
            entity_type="file",
            entity_id=str(file_id),
            user_id=str(user_id),
            action="decrypt",
            details=audit_data,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    async def log_malware_scan(
        self,
        file_id: UUID,
        user_id: UUID,
        filename: str,
        scan_result: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """Log malware scan operation"""
        
        audit_data = {
            "operation": FileOperationType.SCAN.value,
            "file_id": str(file_id),
            "filename": filename,
            "scan_result": scan_result,
            "threats_found": scan_result.get("threats_found", []),
            "is_safe": scan_result.get("is_safe", False),
            "scan_method": scan_result.get("scan_method", "unknown"),
            "scan_duration": scan_result.get("scan_duration", 0)
        }
        
        event_type = AuditEventType.SECURITY if not scan_result.get("is_safe", False) else AuditEventType.FILE_OPERATION
        
        return await self._create_audit_log(
            event_type=event_type,
            entity_type="file",
            entity_id=str(file_id),
            user_id=str(user_id),
            action="malware_scan",
            details=audit_data,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    async def log_file_move(
        self,
        file_id: UUID,
        user_id: UUID,
        filename: str,
        old_folder_id: Optional[UUID],
        new_folder_id: Optional[UUID],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """Log file move operation"""
        
        audit_data = {
            "operation": FileOperationType.MOVE.value,
            "file_id": str(file_id),
            "filename": filename,
            "old_folder_id": str(old_folder_id) if old_folder_id else None,
            "new_folder_id": str(new_folder_id) if new_folder_id else None
        }
        
        return await self._create_audit_log(
            event_type=AuditEventType.FILE_OPERATION,
            entity_type="file",
            entity_id=str(file_id),
            user_id=str(user_id),
            action="move",
            details=audit_data,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    async def log_integrity_check(
        self,
        file_id: UUID,
        user_id: UUID,
        filename: str,
        check_result: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """Log file integrity check"""
        
        audit_data = {
            "operation": FileOperationType.INTEGRITY_CHECK.value,
            "file_id": str(file_id),
            "filename": filename,
            "check_result": check_result,
            "integrity_valid": check_result.get("valid", False),
            "expected_hash": check_result.get("expected_hash"),
            "actual_hash": check_result.get("actual_hash")
        }
        
        return await self._create_audit_log(
            event_type=AuditEventType.SECURITY,
            entity_type="file",
            entity_id=str(file_id),
            user_id=str(user_id),
            action="integrity_check",
            details=audit_data,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    async def log_bulk_operation(
        self,
        operation: str,
        user_id: UUID,
        file_ids: List[UUID],
        operation_result: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """Log bulk file operations"""
        
        audit_data = {
            "operation": f"bulk_{operation}",
            "file_ids": [str(fid) for fid in file_ids],
            "file_count": len(file_ids),
            "operation_result": operation_result,
            "successful_operations": operation_result.get("successful", 0),
            "failed_operations": operation_result.get("failed", 0)
        }
        
        return await self._create_audit_log(
            event_type=AuditEventType.FILE_OPERATION,
            entity_type="file",
            entity_id=None,  # Bulk operation
            user_id=str(user_id),
            action=f"bulk_{operation}",
            details=audit_data,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    async def get_file_audit_trail(
        self,
        file_id: UUID,
        limit: int = 100
    ) -> List[AuditLog]:
        """Get complete audit trail for a specific file"""
        
        query = select(AuditLog).where(
            AuditLog.entity_id == str(file_id),
            AuditLog.entity_type == "file"
        ).order_by(AuditLog.timestamp.desc()).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_user_file_activity(
        self,
        user_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[AuditLog]:
        """Get file activity for a specific user"""
        
        query = select(AuditLog).where(
            AuditLog.user_id == str(user_id),
            AuditLog.entity_type == "file"
        )
        
        if start_date:
            query = query.where(AuditLog.timestamp >= start_date)
        if end_date:
            query = query.where(AuditLog.timestamp <= end_date)
        
        query = query.order_by(AuditLog.timestamp.desc()).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_security_events(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        event_types: Optional[List[str]] = None,
        limit: int = 100
    ) -> List[AuditLog]:
        """Get security-related file events"""
        
        query = select(AuditLog).where(
            AuditLog.event_type.in_([
                AuditEventType.SECURITY,
                AuditEventType.ACCESS_CONTROL
            ]),
            AuditLog.entity_type == "file"
        )
        
        if start_date:
            query = query.where(AuditLog.timestamp >= start_date)
        if end_date:
            query = query.where(AuditLog.timestamp <= end_date)
        
        if event_types:
            # Filter by specific operation types in details
            # This would need a more complex query in production
            pass
        
        query = query.order_by(AuditLog.timestamp.desc()).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_file_statistics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get file operation statistics"""
        
        query = select(AuditLog).where(
            AuditLog.entity_type == "file"
        )
        
        if start_date:
            query = query.where(AuditLog.timestamp >= start_date)
        if end_date:
            query = query.where(AuditLog.timestamp <= end_date)
        
        result = await self.db.execute(query)
        logs = result.scalars().all()
        
        stats = {
            "total_operations": len(logs),
            "operations_by_type": {},
            "operations_by_user": {},
            "security_events": 0,
            "access_denials": 0,
            "malware_detections": 0,
            "encryption_operations": 0,
            "unique_files": set(),
            "unique_users": set()
        }
        
        for log in logs:
            details = log.details or {}
            operation = details.get("operation", "unknown")
            
            # Count by operation type
            stats["operations_by_type"][operation] = stats["operations_by_type"].get(operation, 0) + 1
            
            # Count by user
            stats["operations_by_user"][log.user_id] = stats["operations_by_user"].get(log.user_id, 0) + 1
            
            # Security events
            if log.event_type == AuditEventType.SECURITY:
                stats["security_events"] += 1
            
            # Access denials
            if not details.get("access_granted", True):
                stats["access_denials"] += 1
            
            # Malware detections
            if operation == FileOperationType.SCAN.value and not details.get("is_safe", True):
                stats["malware_detections"] += 1
            
            # Encryption operations
            if operation in [FileOperationType.ENCRYPT.value, FileOperationType.DECRYPT.value]:
                stats["encryption_operations"] += 1
            
            # Track unique entities
            if log.entity_id:
                stats["unique_files"].add(log.entity_id)
            if log.user_id:
                stats["unique_users"].add(log.user_id)
        
        # Convert sets to counts
        stats["unique_files"] = len(stats["unique_files"])
        stats["unique_users"] = len(stats["unique_users"])
        
        return stats
    
    async def _create_audit_log(
        self,
        event_type: AuditEventType,
        entity_type: str,
        entity_id: Optional[str],
        user_id: str,
        action: str,
        details: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """Create audit log entry"""
        
        try:
            audit_log = AuditLog(
                event_type=event_type,
                entity_type=entity_type,
                entity_id=entity_id,
                user_id=user_id,
                action=action,
                details=details,
                ip_address=ip_address,
                user_agent=user_agent,
                timestamp=datetime.now(timezone.utc)
            )
            
            self.db.add(audit_log)
            await self.db.commit()
            await self.db.refresh(audit_log)
            
            # Log to application logger for real-time monitoring
            self._log_to_application_logger(event_type, action, details)
            
            return audit_log
            
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
            await self.db.rollback()
            raise
    
    def _log_to_application_logger(
        self,
        event_type: AuditEventType,
        action: str,
        details: Dict[str, Any]
    ):
        """Log audit events to application logger"""
        
        try:
            log_message = f"File Audit: {action}"
            
            if details.get("filename"):
                log_message += f" | File: {details['filename']}"
            
            if details.get("user_id"):
                log_message += f" | User: {details['user_id']}"
            
            if event_type == AuditEventType.SECURITY:
                if details.get("threats_found"):
                    log_message += f" | Threats: {details['threats_found']}"
                logger.warning(log_message)
            elif event_type == AuditEventType.ACCESS_CONTROL:
                if not details.get("access_granted", True):
                    log_message += f" | Denied: {details.get('denial_reason', 'Unknown')}"
                    logger.warning(log_message)
                else:
                    logger.info(log_message)
            else:
                logger.info(log_message)
                
        except Exception as e:
            logger.error(f"Failed to log to application logger: {e}")

# Helper functions for extracting request information
def extract_client_info(request: Request) -> Dict[str, Optional[str]]:
    """Extract client IP and user agent from request"""
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent")
    }

async def get_file_audit_service(db: AsyncSession) -> FileAuditService:
    """Get file audit service instance"""
    return FileAuditService(db)