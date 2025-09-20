"""
Metrics Collection Service

This service collects and tracks metrics for file and folder operations,
system performance, and user activity.
"""

import asyncio
import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
from enum import Enum
import json

logger = logging.getLogger(__name__)

class MetricType(Enum):
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    TIMER = "timer"

@dataclass
class MetricPoint:
    name: str
    value: float
    timestamp: datetime
    tags: Dict[str, str]
    metric_type: MetricType

@dataclass
class OperationMetrics:
    operation_name: str
    total_count: int
    success_count: int
    error_count: int
    avg_duration_ms: float
    min_duration_ms: float
    max_duration_ms: float
    last_24h_count: int
    error_rate_percent: float

class MetricsCollector:
    def __init__(self, max_points: int = 10000):
        self.max_points = max_points
        self._metrics: deque = deque(maxlen=max_points)
        self._operation_stats: Dict[str, Dict] = defaultdict(lambda: {
            'count': 0,
            'success': 0,
            'errors': 0,
            'durations': deque(maxlen=1000),
            'recent_operations': deque(maxlen=100)
        })
        self._start_time = time.time()
        
    def record_counter(self, name: str, value: float = 1.0, tags: Optional[Dict[str, str]] = None):
        """Record a counter metric"""
        self._add_metric(name, value, MetricType.COUNTER, tags or {})
    
    def record_gauge(self, name: str, value: float, tags: Optional[Dict[str, str]] = None):
        """Record a gauge metric"""
        self._add_metric(name, value, MetricType.GAUGE, tags or {})
    
    def record_histogram(self, name: str, value: float, tags: Optional[Dict[str, str]] = None):
        """Record a histogram metric"""
        self._add_metric(name, value, MetricType.HISTOGRAM, tags or {})
    
    def record_timer(self, name: str, duration_ms: float, tags: Optional[Dict[str, str]] = None):
        """Record a timer metric"""
        self._add_metric(name, duration_ms, MetricType.TIMER, tags or {})
    
    def record_operation(self, operation: str, success: bool, duration_ms: float, 
                        error_type: Optional[str] = None, user_id: Optional[str] = None):
        """Record an operation with success/failure and timing"""
        stats = self._operation_stats[operation]
        stats['count'] += 1
        
        if success:
            stats['success'] += 1
        else:
            stats['errors'] += 1
        
        stats['durations'].append(duration_ms)
        stats['recent_operations'].append({
            'timestamp': datetime.now(timezone.utc),
            'success': success,
            'duration_ms': duration_ms,
            'error_type': error_type,
            'user_id': user_id
        })
        
        # Record as metrics
        tags = {'operation': operation, 'success': str(success).lower()}
        if error_type:
            tags['error_type'] = error_type
        
        self.record_counter(f"operation.{operation}.total", 1.0, tags)
        self.record_timer(f"operation.{operation}.duration", duration_ms, tags)
    
    def _add_metric(self, name: str, value: float, metric_type: MetricType, tags: Dict[str, str]):
        """Add a metric point to the collection"""
        point = MetricPoint(
            name=name,
            value=value,
            timestamp=datetime.now(timezone.utc),
            tags=tags,
            metric_type=metric_type
        )
        self._metrics.append(point)
    
    def get_operation_metrics(self, operation: str) -> Optional[OperationMetrics]:
        """Get metrics for a specific operation"""
        if operation not in self._operation_stats:
            return None
        
        stats = self._operation_stats[operation]
        durations = list(stats['durations'])
        
        if not durations:
            avg_duration = min_duration = max_duration = 0.0
        else:
            avg_duration = sum(durations) / len(durations)
            min_duration = min(durations)
            max_duration = max(durations)
        
        # Count operations in last 24 hours
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=24)
        recent_ops = [
            op for op in stats['recent_operations']
            if op['timestamp'] >= cutoff_time
        ]
        
        error_rate = (stats['errors'] / stats['count'] * 100) if stats['count'] > 0 else 0.0
        
        return OperationMetrics(
            operation_name=operation,
            total_count=stats['count'],
            success_count=stats['success'],
            error_count=stats['errors'],
            avg_duration_ms=avg_duration,
            min_duration_ms=min_duration,
            max_duration_ms=max_duration,
            last_24h_count=len(recent_ops),
            error_rate_percent=error_rate
        )
    
    def get_all_operation_metrics(self) -> List[OperationMetrics]:
        """Get metrics for all operations"""
        return [
            self.get_operation_metrics(op)
            for op in self._operation_stats.keys()
        ]
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get a summary of all collected metrics"""
        now = datetime.now(timezone.utc)
        
        # Group metrics by type and name
        metric_groups = defaultdict(list)
        for metric in self._metrics:
            key = f"{metric.metric_type.value}.{metric.name}"
            metric_groups[key].append(metric)
        
        # Calculate summaries
        summaries = {}
        for key, metrics in metric_groups.items():
            if not metrics:
                continue
            
            values = [m.value for m in metrics]
            summaries[key] = {
                'count': len(values),
                'latest_value': metrics[-1].value,
                'latest_timestamp': metrics[-1].timestamp.isoformat(),
                'min_value': min(values),
                'max_value': max(values),
                'avg_value': sum(values) / len(values) if values else 0
            }
        
        return {
            'total_metrics': len(self._metrics),
            'uptime_seconds': time.time() - self._start_time,
            'operations_tracked': len(self._operation_stats),
            'metric_summaries': summaries,
            'generated_at': now.isoformat()
        }
    
    def get_recent_metrics(self, minutes: int = 60) -> List[MetricPoint]:
        """Get metrics from the last N minutes"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        return [
            metric for metric in self._metrics
            if metric.timestamp >= cutoff_time
        ]
    
    def clear_old_metrics(self, hours: int = 24):
        """Clear metrics older than specified hours"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        # Filter metrics
        self._metrics = deque(
            [m for m in self._metrics if m.timestamp >= cutoff_time],
            maxlen=self.max_points
        )
        
        # Clean up operation stats
        for operation, stats in self._operation_stats.items():
            stats['recent_operations'] = deque(
                [op for op in stats['recent_operations'] if op['timestamp'] >= cutoff_time],
                maxlen=100
            )

class FileOperationMetrics:
    """Specialized metrics for file operations"""
    
    def __init__(self, collector: MetricsCollector):
        self.collector = collector
    
    def record_file_upload(self, success: bool, file_size: int, duration_ms: float,
                          file_type: str, user_id: Optional[str] = None,
                          error_type: Optional[str] = None):
        """Record file upload metrics"""
        tags = {
            'file_type': file_type,
            'success': str(success).lower()
        }
        if error_type:
            tags['error_type'] = error_type
        
        self.collector.record_operation('file_upload', success, duration_ms, error_type, user_id)
        self.collector.record_counter('file_uploads_total', 1.0, tags)
        
        if success:
            self.collector.record_histogram('file_upload_size_bytes', file_size, tags)
            self.collector.record_timer('file_upload_duration_ms', duration_ms, tags)
    
    def record_file_download(self, success: bool, file_size: int, duration_ms: float,
                           user_id: Optional[str] = None, error_type: Optional[str] = None):
        """Record file download metrics"""
        tags = {'success': str(success).lower()}
        if error_type:
            tags['error_type'] = error_type
        
        self.collector.record_operation('file_download', success, duration_ms, error_type, user_id)
        self.collector.record_counter('file_downloads_total', 1.0, tags)
        
        if success:
            self.collector.record_histogram('file_download_size_bytes', file_size, tags)
            self.collector.record_timer('file_download_duration_ms', duration_ms, tags)
    
    def record_file_deletion(self, success: bool, duration_ms: float,
                           user_id: Optional[str] = None, error_type: Optional[str] = None):
        """Record file deletion metrics"""
        tags = {'success': str(success).lower()}
        if error_type:
            tags['error_type'] = error_type
        
        self.collector.record_operation('file_delete', success, duration_ms, error_type, user_id)
        self.collector.record_counter('file_deletions_total', 1.0, tags)

class FolderOperationMetrics:
    """Specialized metrics for folder operations"""
    
    def __init__(self, collector: MetricsCollector):
        self.collector = collector
    
    def record_folder_creation(self, success: bool, duration_ms: float,
                             folder_type: str, user_id: Optional[str] = None,
                             error_type: Optional[str] = None):
        """Record folder creation metrics"""
        tags = {
            'folder_type': folder_type,
            'success': str(success).lower()
        }
        if error_type:
            tags['error_type'] = error_type
        
        self.collector.record_operation('folder_create', success, duration_ms, error_type, user_id)
        self.collector.record_counter('folder_creations_total', 1.0, tags)
    
    def record_folder_access(self, success: bool, duration_ms: float,
                           user_id: Optional[str] = None, error_type: Optional[str] = None):
        """Record folder access metrics"""
        tags = {'success': str(success).lower()}
        if error_type:
            tags['error_type'] = error_type
        
        self.collector.record_operation('folder_access', success, duration_ms, error_type, user_id)
        self.collector.record_counter('folder_accesses_total', 1.0, tags)
    
    def record_folder_organization(self, success: bool, duration_ms: float,
                                 files_organized: int, user_id: Optional[str] = None,
                                 error_type: Optional[str] = None):
        """Record folder organization metrics"""
        tags = {'success': str(success).lower()}
        if error_type:
            tags['error_type'] = error_type
        
        self.collector.record_operation('folder_organize', success, duration_ms, error_type, user_id)
        self.collector.record_counter('folder_organizations_total', 1.0, tags)
        
        if success:
            self.collector.record_gauge('files_organized_count', files_organized, tags)

class SystemMetricsService:
    """Main service for system metrics collection and reporting"""
    
    def __init__(self):
        self.collector = MetricsCollector()
        self.file_metrics = FileOperationMetrics(self.collector)
        self.folder_metrics = FolderOperationMetrics(self.collector)
        self._cleanup_task: Optional[asyncio.Task] = None
        self._cleanup_started = False
    
    def _start_cleanup_task(self):
        """Start the background cleanup task"""
        if not self._cleanup_started:
            try:
                if self._cleanup_task is None or self._cleanup_task.done():
                    self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
                    self._cleanup_started = True
            except RuntimeError:
                # No event loop running, will start later when needed
                pass
    
    async def _periodic_cleanup(self):
        """Periodically clean up old metrics"""
        while True:
            try:
                await asyncio.sleep(3600)  # Run every hour
                self.collector.clear_old_metrics(hours=24)
                logger.info("Cleaned up old metrics")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error during metrics cleanup: {e}")
    
    def get_dashboard_metrics(self) -> Dict[str, Any]:
        """Get metrics formatted for dashboard display"""
        # Ensure cleanup task is started if we have an event loop
        if not self._cleanup_started:
            self._start_cleanup_task()
            
        operation_metrics = self.collector.get_all_operation_metrics()
        
        # Group by operation type
        file_ops = [m for m in operation_metrics if m.operation_name.startswith('file_')]
        folder_ops = [m for m in operation_metrics if m.operation_name.startswith('folder_')]
        
        # Calculate totals
        total_file_ops = sum(m.total_count for m in file_ops)
        total_folder_ops = sum(m.total_count for m in folder_ops)
        
        # Calculate error rates
        file_errors = sum(m.error_count for m in file_ops)
        folder_errors = sum(m.error_count for m in folder_ops)
        
        file_error_rate = (file_errors / total_file_ops * 100) if total_file_ops > 0 else 0
        folder_error_rate = (folder_errors / total_folder_ops * 100) if total_folder_ops > 0 else 0
        
        # Get recent activity (last hour)
        recent_metrics = self.collector.get_recent_metrics(minutes=60)
        recent_activity = len([m for m in recent_metrics if m.metric_type == MetricType.COUNTER])
        
        return {
            'overview': {
                'total_file_operations': total_file_ops,
                'total_folder_operations': total_folder_ops,
                'file_error_rate_percent': round(file_error_rate, 2),
                'folder_error_rate_percent': round(folder_error_rate, 2),
                'recent_activity_count': recent_activity
            },
            'file_operations': [asdict(m) for m in file_ops],
            'folder_operations': [asdict(m) for m in folder_ops],
            'system_summary': self.collector.get_metrics_summary()
        }
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance-focused metrics"""
        operation_metrics = self.collector.get_all_operation_metrics()
        
        # Find slowest operations
        slowest_ops = sorted(
            operation_metrics,
            key=lambda x: x.avg_duration_ms,
            reverse=True
        )[:10]
        
        # Find operations with highest error rates
        error_prone_ops = sorted(
            [m for m in operation_metrics if m.error_rate_percent > 0],
            key=lambda x: x.error_rate_percent,
            reverse=True
        )[:10]
        
        # Get recent performance trends
        recent_metrics = self.collector.get_recent_metrics(minutes=60)
        timer_metrics = [m for m in recent_metrics if m.metric_type == MetricType.TIMER]
        
        avg_response_time = 0
        if timer_metrics:
            avg_response_time = sum(m.value for m in timer_metrics) / len(timer_metrics)
        
        return {
            'average_response_time_ms': round(avg_response_time, 2),
            'slowest_operations': [asdict(m) for m in slowest_ops],
            'error_prone_operations': [asdict(m) for m in error_prone_ops],
            'recent_timer_metrics_count': len(timer_metrics)
        }
    
    def stop(self):
        """Stop the metrics service"""
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()

# Global instance
metrics_service = SystemMetricsService()