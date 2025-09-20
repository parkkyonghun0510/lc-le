"""
Comprehensive System Health Monitoring Service

This service provides comprehensive health monitoring for all system components
including database, storage, services, and application metrics.
"""

import asyncio
import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum
from sqlalchemy import text, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db, engine
from app.services.minio_service import minio_service
from app.models import File, Folder, CustomerApplication, User
from app.core.config import settings

logger = logging.getLogger(__name__)

class HealthStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"

@dataclass
class ComponentHealth:
    name: str
    status: HealthStatus
    message: str
    details: Dict[str, Any]
    response_time_ms: Optional[float] = None
    last_check: Optional[datetime] = None

@dataclass
class SystemMetrics:
    total_files: int
    total_folders: int
    total_applications: int
    total_users: int
    storage_usage_bytes: int
    database_connections: Dict[str, int]
    uptime_seconds: float
    memory_usage_mb: Optional[float] = None
    cpu_usage_percent: Optional[float] = None

@dataclass
class HealthCheckResult:
    overall_status: HealthStatus
    components: List[ComponentHealth]
    metrics: SystemMetrics
    timestamp: datetime
    check_duration_ms: float
    alerts: List[str]

class SystemHealthService:
    def __init__(self):
        self.start_time = time.time()
        self._last_health_check: Optional[HealthCheckResult] = None
        self._health_history: List[HealthCheckResult] = []
        self.max_history_size = 100
        
    async def perform_comprehensive_health_check(self) -> HealthCheckResult:
        """
        Perform a comprehensive health check of all system components
        """
        start_time = time.time()
        components = []
        alerts = []
        
        # Check all components
        db_health = await self._check_database_health()
        components.append(db_health)
        
        storage_health = await self._check_storage_health()
        components.append(storage_health)
        
        service_health = await self._check_service_health()
        components.append(service_health)
        
        consistency_health = await self._check_data_consistency()
        components.append(consistency_health)
        
        # Collect system metrics
        metrics = await self._collect_system_metrics()
        
        # Determine overall status
        overall_status = self._determine_overall_status(components)
        
        # Generate alerts
        alerts = self._generate_alerts(components, metrics)
        
        # Calculate check duration
        check_duration_ms = (time.time() - start_time) * 1000
        
        result = HealthCheckResult(
            overall_status=overall_status,
            components=components,
            metrics=metrics,
            timestamp=datetime.now(timezone.utc),
            check_duration_ms=check_duration_ms,
            alerts=alerts
        )
        
        # Store result
        self._last_health_check = result
        self._add_to_history(result)
        
        return result
    
    async def _check_database_health(self) -> ComponentHealth:
        """Check database connectivity and performance"""
        start_time = time.time()
        
        try:
            async with engine.begin() as conn:
                # Basic connectivity test
                await conn.execute(text("SELECT 1"))
                
                # Performance test - check query response time
                perf_start = time.time()
                result = await conn.execute(text("""
                    SELECT COUNT(*) as total_records 
                    FROM (
                        SELECT 1 FROM customer_applications LIMIT 1000
                        UNION ALL
                        SELECT 1 FROM files LIMIT 1000
                        UNION ALL
                        SELECT 1 FROM folders LIMIT 1000
                    ) as combined
                """))
                perf_time = (time.time() - perf_start) * 1000
                
                # Get connection pool info
                pool = engine.pool
                pool_info = {
                    "size": pool.size(),
                    "checked_in": pool.checkedin(),
                    "checked_out": pool.checkedout(),
                    "overflow": pool.overflow(),
                    "pool_type": type(pool).__name__
                }
                
                response_time = (time.time() - start_time) * 1000
                
                # Determine status based on performance
                if response_time > 5000:  # 5 seconds
                    status = HealthStatus.DEGRADED
                    message = f"Database responding slowly ({response_time:.0f}ms)"
                elif perf_time > 1000:  # 1 second for performance test
                    status = HealthStatus.DEGRADED
                    message = f"Database queries slow ({perf_time:.0f}ms)"
                else:
                    status = HealthStatus.HEALTHY
                    message = "Database operating normally"
                
                return ComponentHealth(
                    name="database",
                    status=status,
                    message=message,
                    details={
                        "connection_pool": pool_info,
                        "query_performance_ms": perf_time,
                        "connectivity_test": "passed"
                    },
                    response_time_ms=response_time,
                    last_check=datetime.now(timezone.utc)
                )
                
        except SQLAlchemyError as e:
            response_time = (time.time() - start_time) * 1000
            return ComponentHealth(
                name="database",
                status=HealthStatus.UNHEALTHY,
                message=f"Database connection failed: {str(e)[:100]}",
                details={
                    "error_type": type(e).__name__,
                    "error_message": str(e),
                    "is_connection_error": self._is_connection_error(e)
                },
                response_time_ms=response_time,
                last_check=datetime.now(timezone.utc)
            )
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return ComponentHealth(
                name="database",
                status=HealthStatus.UNHEALTHY,
                message=f"Unexpected database error: {str(e)[:100]}",
                details={
                    "error_type": type(e).__name__,
                    "error_message": str(e)
                },
                response_time_ms=response_time,
                last_check=datetime.now(timezone.utc)
            )
    
    async def _check_storage_health(self) -> ComponentHealth:
        """Check MinIO/S3 storage health"""
        start_time = time.time()
        
        if not minio_service.enabled:
            return ComponentHealth(
                name="storage",
                status=HealthStatus.DEGRADED,
                message="Storage service not configured",
                details={
                    "enabled": False,
                    "reason": "MinIO/S3 credentials not provided"
                },
                response_time_ms=0,
                last_check=datetime.now(timezone.utc)
            )
        
        try:
            # Test bucket access
            bucket_exists = minio_service.client.bucket_exists(minio_service.bucket_name)
            
            if not bucket_exists:
                return ComponentHealth(
                    name="storage",
                    status=HealthStatus.UNHEALTHY,
                    message=f"Bucket '{minio_service.bucket_name}' does not exist",
                    details={
                        "bucket_name": minio_service.bucket_name,
                        "bucket_exists": False
                    },
                    response_time_ms=(time.time() - start_time) * 1000,
                    last_check=datetime.now(timezone.utc)
                )
            
            # Test upload/download capability with a small test file
            test_object_name = f"health-check-{int(time.time())}.txt"
            test_content = b"health check test"
            
            # Upload test
            from io import BytesIO
            minio_service.client.put_object(
                bucket_name=minio_service.bucket_name,
                object_name=test_object_name,
                data=BytesIO(test_content),
                length=len(test_content),
                content_type="text/plain"
            )
            
            # Download test
            response = minio_service.client.get_object(
                bucket_name=minio_service.bucket_name,
                object_name=test_object_name
            )
            downloaded_content = response.read()
            
            # Cleanup test file
            minio_service.client.remove_object(
                bucket_name=minio_service.bucket_name,
                object_name=test_object_name
            )
            
            response_time = (time.time() - start_time) * 1000
            
            if downloaded_content == test_content:
                status = HealthStatus.HEALTHY if response_time < 2000 else HealthStatus.DEGRADED
                message = "Storage operating normally" if response_time < 2000 else f"Storage responding slowly ({response_time:.0f}ms)"
            else:
                status = HealthStatus.DEGRADED
                message = "Storage data integrity issue detected"
            
            return ComponentHealth(
                name="storage",
                status=status,
                message=message,
                details={
                    "bucket_name": minio_service.bucket_name,
                    "bucket_exists": True,
                    "upload_test": "passed",
                    "download_test": "passed",
                    "data_integrity": "verified" if downloaded_content == test_content else "failed"
                },
                response_time_ms=response_time,
                last_check=datetime.now(timezone.utc)
            )
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return ComponentHealth(
                name="storage",
                status=HealthStatus.UNHEALTHY,
                message=f"Storage health check failed: {str(e)[:100]}",
                details={
                    "error_type": type(e).__name__,
                    "error_message": str(e),
                    "bucket_name": minio_service.bucket_name
                },
                response_time_ms=response_time,
                last_check=datetime.now(timezone.utc)
            )
    
    async def _check_service_health(self) -> ComponentHealth:
        """Check application services health"""
        start_time = time.time()
        
        try:
            # Check critical services availability
            services_status = {}
            
            # Check if we can import and access key services
            try:
                from app.services.folder_service import folder_service
                services_status["folder_service"] = "available"
            except Exception as e:
                services_status["folder_service"] = f"error: {str(e)[:50]}"
            
            try:
                from app.services.encryption_service import encryption_service
                services_status["encryption_service"] = "available"
            except Exception as e:
                services_status["encryption_service"] = f"error: {str(e)[:50]}"
            
            try:
                from app.services.file_audit_service import file_audit_service
                services_status["audit_service"] = "available"
            except Exception as e:
                services_status["audit_service"] = f"error: {str(e)[:50]}"
            
            # Check memory usage if psutil is available
            memory_info = None
            try:
                import psutil
                process = psutil.Process()
                memory_info = {
                    "rss_mb": process.memory_info().rss / 1024 / 1024,
                    "vms_mb": process.memory_info().vms / 1024 / 1024,
                    "percent": process.memory_percent()
                }
            except ImportError:
                memory_info = {"status": "psutil not available"}
            except Exception as e:
                memory_info = {"error": str(e)}
            
            response_time = (time.time() - start_time) * 1000
            
            # Determine status
            failed_services = [k for k, v in services_status.items() if v.startswith("error:")]
            if failed_services:
                status = HealthStatus.DEGRADED
                message = f"Some services unavailable: {', '.join(failed_services)}"
            else:
                status = HealthStatus.HEALTHY
                message = "All services operating normally"
            
            return ComponentHealth(
                name="services",
                status=status,
                message=message,
                details={
                    "services": services_status,
                    "memory": memory_info,
                    "uptime_seconds": time.time() - self.start_time
                },
                response_time_ms=response_time,
                last_check=datetime.now(timezone.utc)
            )
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return ComponentHealth(
                name="services",
                status=HealthStatus.UNHEALTHY,
                message=f"Service health check failed: {str(e)[:100]}",
                details={
                    "error_type": type(e).__name__,
                    "error_message": str(e)
                },
                response_time_ms=response_time,
                last_check=datetime.now(timezone.utc)
            )
    
    async def _check_data_consistency(self) -> ComponentHealth:
        """Check data consistency and integrity"""
        start_time = time.time()
        
        try:
            async with engine.begin() as conn:
                # Check for orphaned files (files without valid folders)
                orphaned_files_result = await conn.execute(text("""
                    SELECT COUNT(*) as count
                    FROM files f
                    LEFT JOIN folders fo ON f.folder_id = fo.id
                    WHERE f.folder_id IS NOT NULL AND fo.id IS NULL
                """))
                orphaned_files = orphaned_files_result.scalar()
                
                # Check for duplicate parent folders
                duplicate_folders_result = await conn.execute(text("""
                    SELECT COUNT(*) as count
                    FROM (
                        SELECT application_id
                        FROM folders
                        WHERE parent_id IS NULL
                        GROUP BY application_id
                        HAVING COUNT(*) > 1
                    ) as duplicates
                """))
                duplicate_folders = duplicate_folders_result.scalar()
                
                # Check for files without applications
                orphaned_app_files_result = await conn.execute(text("""
                    SELECT COUNT(*) as count
                    FROM files f
                    LEFT JOIN customer_applications ca ON f.application_id = ca.id
                    WHERE f.application_id IS NOT NULL AND ca.id IS NULL
                """))
                orphaned_app_files = orphaned_app_files_result.scalar()
                
                # Check for folders without applications
                orphaned_app_folders_result = await conn.execute(text("""
                    SELECT COUNT(*) as count
                    FROM folders fo
                    LEFT JOIN customer_applications ca ON fo.application_id = ca.id
                    WHERE fo.application_id IS NOT NULL AND ca.id IS NULL
                """))
                orphaned_app_folders = orphaned_app_folders_result.scalar()
                
                response_time = (time.time() - start_time) * 1000
                
                # Determine status based on inconsistencies
                total_issues = orphaned_files + duplicate_folders + orphaned_app_files + orphaned_app_folders
                
                if total_issues == 0:
                    status = HealthStatus.HEALTHY
                    message = "Data consistency verified"
                elif total_issues <= 5:
                    status = HealthStatus.DEGRADED
                    message = f"Minor data inconsistencies detected ({total_issues} issues)"
                else:
                    status = HealthStatus.UNHEALTHY
                    message = f"Significant data inconsistencies detected ({total_issues} issues)"
                
                return ComponentHealth(
                    name="data_consistency",
                    status=status,
                    message=message,
                    details={
                        "orphaned_files": orphaned_files,
                        "duplicate_parent_folders": duplicate_folders,
                        "orphaned_application_files": orphaned_app_files,
                        "orphaned_application_folders": orphaned_app_folders,
                        "total_issues": total_issues
                    },
                    response_time_ms=response_time,
                    last_check=datetime.now(timezone.utc)
                )
                
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return ComponentHealth(
                name="data_consistency",
                status=HealthStatus.UNHEALTHY,
                message=f"Data consistency check failed: {str(e)[:100]}",
                details={
                    "error_type": type(e).__name__,
                    "error_message": str(e)
                },
                response_time_ms=response_time,
                last_check=datetime.now(timezone.utc)
            )
    
    async def _collect_system_metrics(self) -> SystemMetrics:
        """Collect comprehensive system metrics"""
        try:
            async with engine.begin() as conn:
                # Count total records
                files_result = await conn.execute(text("SELECT COUNT(*) FROM files"))
                total_files = files_result.scalar()
                
                folders_result = await conn.execute(text("SELECT COUNT(*) FROM folders"))
                total_folders = folders_result.scalar()
                
                apps_result = await conn.execute(text("SELECT COUNT(*) FROM customer_applications"))
                total_applications = apps_result.scalar()
                
                users_result = await conn.execute(text("SELECT COUNT(*) FROM users"))
                total_users = users_result.scalar()
                
                # Estimate storage usage (this is approximate)
                storage_result = await conn.execute(text("""
                    SELECT COALESCE(SUM(file_size), 0) as total_size
                    FROM files
                    WHERE file_size IS NOT NULL
                """))
                storage_usage = storage_result.scalar() or 0
                
                # Get connection pool info
                pool = engine.pool
                db_connections = {
                    "pool_size": pool.size(),
                    "checked_in": pool.checkedin(),
                    "checked_out": pool.checkedout(),
                    "overflow": pool.overflow()
                }
                
                # Get system resource info if available
                memory_usage = None
                cpu_usage = None
                try:
                    import psutil
                    process = psutil.Process()
                    memory_usage = process.memory_info().rss / 1024 / 1024  # MB
                    cpu_usage = process.cpu_percent()
                except ImportError:
                    pass
                except Exception:
                    pass
                
                return SystemMetrics(
                    total_files=total_files,
                    total_folders=total_folders,
                    total_applications=total_applications,
                    total_users=total_users,
                    storage_usage_bytes=storage_usage,
                    database_connections=db_connections,
                    uptime_seconds=time.time() - self.start_time,
                    memory_usage_mb=memory_usage,
                    cpu_usage_percent=cpu_usage
                )
                
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
            # Return default metrics on error
            return SystemMetrics(
                total_files=0,
                total_folders=0,
                total_applications=0,
                total_users=0,
                storage_usage_bytes=0,
                database_connections={},
                uptime_seconds=time.time() - self.start_time
            )
    
    def _determine_overall_status(self, components: List[ComponentHealth]) -> HealthStatus:
        """Determine overall system status based on component health"""
        if not components:
            return HealthStatus.UNKNOWN
        
        # Count status types
        status_counts = {}
        for component in components:
            status = component.status
            status_counts[status] = status_counts.get(status, 0) + 1
        
        # Determine overall status
        if status_counts.get(HealthStatus.UNHEALTHY, 0) > 0:
            return HealthStatus.UNHEALTHY
        elif status_counts.get(HealthStatus.DEGRADED, 0) > 0:
            return HealthStatus.DEGRADED
        elif status_counts.get(HealthStatus.HEALTHY, 0) == len(components):
            return HealthStatus.HEALTHY
        else:
            return HealthStatus.UNKNOWN
    
    def _generate_alerts(self, components: List[ComponentHealth], metrics: SystemMetrics) -> List[str]:
        """Generate alerts based on component health and metrics"""
        alerts = []
        
        # Component-based alerts
        for component in components:
            if component.status == HealthStatus.UNHEALTHY:
                alerts.append(f"CRITICAL: {component.name} is unhealthy - {component.message}")
            elif component.status == HealthStatus.DEGRADED:
                alerts.append(f"WARNING: {component.name} is degraded - {component.message}")
        
        # Metrics-based alerts
        if metrics.memory_usage_mb and metrics.memory_usage_mb > 1000:  # 1GB
            alerts.append(f"WARNING: High memory usage - {metrics.memory_usage_mb:.0f}MB")
        
        if metrics.cpu_usage_percent and metrics.cpu_usage_percent > 80:
            alerts.append(f"WARNING: High CPU usage - {metrics.cpu_usage_percent:.1f}%")
        
        # Database connection pool alerts
        db_conn = metrics.database_connections
        if db_conn.get("checked_out", 0) > db_conn.get("pool_size", 10) * 0.8:
            alerts.append("WARNING: Database connection pool usage high")
        
        return alerts
    
    def _add_to_history(self, result: HealthCheckResult):
        """Add health check result to history"""
        self._health_history.append(result)
        
        # Keep only recent history
        if len(self._health_history) > self.max_history_size:
            self._health_history = self._health_history[-self.max_history_size:]
    
    def get_health_history(self, hours: int = 24) -> List[HealthCheckResult]:
        """Get health check history for the specified number of hours"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        return [
            result for result in self._health_history
            if result.timestamp >= cutoff_time
        ]
    
    def get_last_health_check(self) -> Optional[HealthCheckResult]:
        """Get the last health check result"""
        return self._last_health_check
    
    @staticmethod
    def _is_connection_error(exc: SQLAlchemyError) -> bool:
        """Check if the exception is related to connection issues"""
        from sqlalchemy.exc import DisconnectionError, OperationalError
        
        if isinstance(exc, (DisconnectionError, OperationalError)):
            return True
        
        error_message = str(exc).lower()
        connection_keywords = [
            'connection', 'closed', 'timeout', 'network',
            'refused', 'unreachable', 'disconnected'
        ]
        
        return any(keyword in error_message for keyword in connection_keywords)

# Global instance
system_health_service = SystemHealthService()