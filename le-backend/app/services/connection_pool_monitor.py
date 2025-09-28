"""
Database Connection Pool Monitoring Service
Provides real-time monitoring and optimization of database connection pools.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass
import time

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import engine
from app.core.config import settings

logger = logging.getLogger(__name__)

@dataclass
class ConnectionPoolStats:
    """Connection pool statistics"""
    pool_size: int
    checked_in: int
    checked_out: int
    overflow: int
    invalid: int
    pool_type: str
    timestamp: datetime

@dataclass
class DatabaseConnectionStats:
    """Database connection statistics"""
    total_connections: int
    active_connections: int
    idle_connections: int
    idle_in_transaction: int
    max_connections: int
    timestamp: datetime

@dataclass
class PerformanceMetrics:
    """Performance metrics for connection pool"""
    avg_connection_time: float
    avg_query_time: float
    connection_utilization: float
    pool_efficiency: float
    timestamp: datetime

class ConnectionPoolMonitor:
    """Service for monitoring database connection pool performance"""
    
    def __init__(self):
        self.monitoring_active = False
        self.stats_history: List[ConnectionPoolStats] = []
        self.db_stats_history: List[DatabaseConnectionStats] = []
        self.performance_history: List[PerformanceMetrics] = []
        self.monitoring_task: Optional[asyncio.Task] = None
        self.alert_thresholds = {
            "max_utilization": 0.8,  # 80% pool utilization
            "max_connection_time": 5.0,  # 5 seconds
            "max_query_time": 2.0,  # 2 seconds
            "min_pool_efficiency": 0.7  # 70% efficiency
        }
    
    async def start_monitoring(self, interval: int = 30):
        """Start continuous monitoring of connection pool"""
        if self.monitoring_active:
            logger.warning("Connection pool monitoring is already active")
            return
        
        self.monitoring_active = True
        self.monitoring_task = asyncio.create_task(
            self._monitoring_loop(interval)
        )
        logger.info(f"Started connection pool monitoring (interval: {interval}s)")
    
    async def stop_monitoring(self):
        """Stop connection pool monitoring"""
        self.monitoring_active = False
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        logger.info("Stopped connection pool monitoring")
    
    async def get_current_stats(self) -> Dict[str, Any]:
        """Get current connection pool statistics"""
        try:
            # Get pool statistics
            pool = engine.pool
            pool_stats = ConnectionPoolStats(
                pool_size=pool.size(),
                checked_in=pool.checkedin(),
                checked_out=pool.checkedout(),
                overflow=pool.overflow(),
                invalid=getattr(pool, 'invalid', lambda: 0)(),
                pool_type=type(pool).__name__,
                timestamp=datetime.now(timezone.utc)
            )
            
            # Get database connection statistics
            async with engine.begin() as conn:
                # Get PostgreSQL connection stats
                db_stats_query = text("""
                    SELECT 
                        count(*) as total_connections,
                        count(*) FILTER (WHERE state = 'active') as active_connections,
                        count(*) FILTER (WHERE state = 'idle') as idle_connections,
                        count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
                        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
                    FROM pg_stat_activity 
                    WHERE datname = current_database()
                """)
                
                result = await conn.execute(db_stats_query)
                row = result.fetchone()
                
                db_stats = DatabaseConnectionStats(
                    total_connections=row[0] if row else 0,
                    active_connections=row[1] if row else 0,
                    idle_connections=row[2] if row else 0,
                    idle_in_transaction=row[3] if row else 0,
                    max_connections=row[4] if row else 100,
                    timestamp=datetime.now(timezone.utc)
                )
            
            # Calculate performance metrics
            performance = self._calculate_performance_metrics(pool_stats, db_stats)
            
            return {
                "pool_stats": {
                    "pool_size": pool_stats.pool_size,
                    "checked_in": pool_stats.checked_in,
                    "checked_out": pool_stats.checked_out,
                    "overflow": pool_stats.overflow,
                    "invalid": pool_stats.invalid,
                    "pool_type": pool_stats.pool_type,
                    "utilization": pool_stats.checked_out / pool_stats.pool_size if pool_stats.pool_size > 0 else 0
                },
                "database_stats": {
                    "total_connections": db_stats.total_connections,
                    "active_connections": db_stats.active_connections,
                    "idle_connections": db_stats.idle_connections,
                    "idle_in_transaction": db_stats.idle_in_transaction,
                    "max_connections": db_stats.max_connections,
                    "utilization": db_stats.total_connections / db_stats.max_connections if db_stats.max_connections > 0 else 0
                },
                "performance_metrics": {
                    "avg_connection_time": performance.avg_connection_time,
                    "avg_query_time": performance.avg_query_time,
                    "connection_utilization": performance.connection_utilization,
                    "pool_efficiency": performance.pool_efficiency
                },
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get connection pool stats: {e}")
            return {"error": str(e)}
    
    async def get_historical_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Get historical connection pool statistics"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        # Filter recent stats
        recent_pool_stats = [
            stats for stats in self.stats_history
            if stats.timestamp >= cutoff_time
        ]
        recent_db_stats = [
            stats for stats in self.db_stats_history
            if stats.timestamp >= cutoff_time
        ]
        recent_performance = [
            perf for perf in self.performance_history
            if perf.timestamp >= cutoff_time
        ]
        
        return {
            "pool_stats_history": [
                {
                    "timestamp": stats.timestamp.isoformat(),
                    "pool_size": stats.pool_size,
                    "checked_in": stats.checked_in,
                    "checked_out": stats.checked_out,
                    "overflow": stats.overflow,
                    "utilization": stats.checked_out / stats.pool_size if stats.pool_size > 0 else 0
                }
                for stats in recent_pool_stats
            ],
            "database_stats_history": [
                {
                    "timestamp": stats.timestamp.isoformat(),
                    "total_connections": stats.total_connections,
                    "active_connections": stats.active_connections,
                    "idle_connections": stats.idle_connections,
                    "utilization": stats.total_connections / stats.max_connections if stats.max_connections > 0 else 0
                }
                for stats in recent_db_stats
            ],
            "performance_history": [
                {
                    "timestamp": perf.timestamp.isoformat(),
                    "avg_connection_time": perf.avg_connection_time,
                    "avg_query_time": perf.avg_query_time,
                    "connection_utilization": perf.connection_utilization,
                    "pool_efficiency": perf.pool_efficiency
                }
                for perf in recent_performance
            ]
        }
    
    async def get_optimization_recommendations(self) -> List[Dict[str, Any]]:
        """Get optimization recommendations based on current stats"""
        recommendations = []
        current_stats = await self.get_current_stats()
        
        if "error" in current_stats:
            return [{"type": "error", "message": "Unable to get current stats", "severity": "high"}]
        
        pool_stats = current_stats["pool_stats"]
        db_stats = current_stats["database_stats"]
        performance = current_stats["performance_metrics"]
        
        # Check pool utilization
        pool_utilization = pool_stats["utilization"]
        if pool_utilization > self.alert_thresholds["max_utilization"]:
            recommendations.append({
                "type": "pool_utilization",
                "severity": "high",
                "message": f"Pool utilization is {pool_utilization:.1%}, consider increasing pool size",
                "current_value": pool_utilization,
                "threshold": self.alert_thresholds["max_utilization"],
                "recommendation": "Increase pool_size in database configuration"
            })
        
        # Check database utilization
        db_utilization = db_stats["utilization"]
        if db_utilization > 0.9:  # 90% of max connections
            recommendations.append({
                "type": "database_utilization",
                "severity": "critical",
                "message": f"Database utilization is {db_utilization:.1%}, approaching max connections",
                "current_value": db_utilization,
                "threshold": 0.9,
                "recommendation": "Consider increasing max_connections or optimizing queries"
            })
        
        # Check pool efficiency
        pool_efficiency = performance["pool_efficiency"]
        if pool_efficiency < self.alert_thresholds["min_pool_efficiency"]:
            recommendations.append({
                "type": "pool_efficiency",
                "severity": "medium",
                "message": f"Pool efficiency is {pool_efficiency:.1%}, consider optimizing connection usage",
                "current_value": pool_efficiency,
                "threshold": self.alert_thresholds["min_pool_efficiency"],
                "recommendation": "Review connection usage patterns and consider connection pooling strategies"
            })
        
        # Check for idle connections in transaction
        idle_in_transaction = db_stats["idle_in_transaction"]
        if idle_in_transaction > 5:  # More than 5 idle in transaction
            recommendations.append({
                "type": "idle_in_transaction",
                "severity": "medium",
                "message": f"Found {idle_in_transaction} connections idle in transaction",
                "current_value": idle_in_transaction,
                "threshold": 5,
                "recommendation": "Review transaction management and ensure proper commit/rollback"
            })
        
        return recommendations
    
    def _calculate_performance_metrics(
        self, 
        pool_stats: ConnectionPoolStats, 
        db_stats: DatabaseConnectionStats
    ) -> PerformanceMetrics:
        """Calculate performance metrics from current stats"""
        
        # Calculate connection utilization
        connection_utilization = (
            pool_stats.checked_out / pool_stats.pool_size 
            if pool_stats.pool_size > 0 else 0
        )
        
        # Calculate pool efficiency (simplified)
        pool_efficiency = (
            (pool_stats.checked_in + pool_stats.checked_out) / 
            (pool_stats.pool_size + pool_stats.overflow)
            if (pool_stats.pool_size + pool_stats.overflow) > 0 else 0
        )
        
        # Mock values for connection and query times
        # In a real implementation, these would be tracked over time
        avg_connection_time = 0.1  # 100ms
        avg_query_time = 0.05  # 50ms
        
        return PerformanceMetrics(
            avg_connection_time=avg_connection_time,
            avg_query_time=avg_query_time,
            connection_utilization=connection_utilization,
            pool_efficiency=pool_efficiency,
            timestamp=datetime.now(timezone.utc)
        )
    
    async def _monitoring_loop(self, interval: int):
        """Main monitoring loop"""
        while self.monitoring_active:
            try:
                # Get current stats
                current_stats = await self.get_current_stats()
                
                if "error" not in current_stats:
                    # Store pool stats
                    pool_stats = current_stats["pool_stats"]
                    self.stats_history.append(ConnectionPoolStats(
                        pool_size=pool_stats["pool_size"],
                        checked_in=pool_stats["checked_in"],
                        checked_out=pool_stats["checked_out"],
                        overflow=pool_stats["overflow"],
                        invalid=pool_stats.get("invalid", 0),
                        pool_type=pool_stats["pool_type"],
                        timestamp=datetime.now(timezone.utc)
                    ))
                    
                    # Store database stats
                    db_stats = current_stats["database_stats"]
                    self.db_stats_history.append(DatabaseConnectionStats(
                        total_connections=db_stats["total_connections"],
                        active_connections=db_stats["active_connections"],
                        idle_connections=db_stats["idle_connections"],
                        idle_in_transaction=db_stats["idle_in_transaction"],
                        max_connections=db_stats["max_connections"],
                        timestamp=datetime.now(timezone.utc)
                    ))
                    
                    # Store performance metrics
                    performance = current_stats["performance_metrics"]
                    self.performance_history.append(PerformanceMetrics(
                        avg_connection_time=performance["avg_connection_time"],
                        avg_query_time=performance["avg_query_time"],
                        connection_utilization=performance["connection_utilization"],
                        pool_efficiency=performance["pool_efficiency"],
                        timestamp=datetime.now(timezone.utc)
                    ))
                    
                    # Keep only last 24 hours of data
                    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=24)
                    self.stats_history = [
                        stats for stats in self.stats_history
                        if stats.timestamp >= cutoff_time
                    ]
                    self.db_stats_history = [
                        stats for stats in self.db_stats_history
                        if stats.timestamp >= cutoff_time
                    ]
                    self.performance_history = [
                        perf for perf in self.performance_history
                        if perf.timestamp >= cutoff_time
                    ]
                
                # Check for alerts
                await self._check_alerts(current_stats)
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
            
            await asyncio.sleep(interval)
    
    async def _check_alerts(self, current_stats: Dict[str, Any]):
        """Check for alert conditions and log warnings"""
        if "error" in current_stats:
            return
        
        pool_stats = current_stats["pool_stats"]
        performance = current_stats["performance_metrics"]
        
        # Check pool utilization
        if pool_stats["utilization"] > self.alert_thresholds["max_utilization"]:
            logger.warning(
                f"High pool utilization: {pool_stats['utilization']:.1%} "
                f"(threshold: {self.alert_thresholds['max_utilization']:.1%})"
            )
        
        # Check pool efficiency
        if performance["pool_efficiency"] < self.alert_thresholds["min_pool_efficiency"]:
            logger.warning(
                f"Low pool efficiency: {performance['pool_efficiency']:.1%} "
                f"(threshold: {self.alert_thresholds['min_pool_efficiency']:.1%})"
            )

# Global monitor instance
connection_monitor = ConnectionPoolMonitor()
