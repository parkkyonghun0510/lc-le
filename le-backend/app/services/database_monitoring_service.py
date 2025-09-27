"""
Database Monitoring Service
Provides comprehensive database performance monitoring and optimization insights.
"""

import time
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, func
from contextlib import asynccontextmanager
import json

logger = logging.getLogger(__name__)

class DatabaseMonitoringService:
    """Service for monitoring database performance and providing optimization insights"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.monitoring_data = {
            "queries": [],
            "slow_queries": [],
            "connection_stats": {},
            "index_usage": {},
            "table_stats": {}
        }
    
    @asynccontextmanager
    async def monitor_query(self, query_name: str, query_sql: str = None):
        """Context manager for monitoring individual queries"""
        start_time = time.time()
        start_memory = self._get_memory_usage()
        
        try:
            yield
        finally:
            execution_time = time.time() - start_time
            end_memory = self._get_memory_usage()
            
            query_data = {
                "query_name": query_name,
                "query_sql": query_sql,
                "execution_time": execution_time,
                "memory_delta": end_memory - start_memory,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "slow_query": execution_time > 1.0
            }
            
            self.monitoring_data["queries"].append(query_data)
            
            if query_data["slow_query"]:
                self.monitoring_data["slow_queries"].append(query_data)
                logger.warning(f"Slow query detected: {query_name} took {execution_time:.2f}s")
            
            logger.debug(f"Query {query_name} completed in {execution_time:.2f}s")
    
    def _get_memory_usage(self) -> float:
        """Get current memory usage (simplified)"""
        try:
            import psutil
            return psutil.Process().memory_info().rss / 1024 / 1024  # MB
        except ImportError:
            return 0.0
    
    async def get_database_stats(self) -> Dict[str, Any]:
        """Get comprehensive database statistics"""
        stats = {}
        
        try:
            # Get database size
            size_query = text("""
                SELECT 
                    pg_database_size(current_database()) as db_size,
                    pg_size_pretty(pg_database_size(current_database())) as db_size_pretty
            """)
            result = await self.db.execute(size_query)
            size_data = result.fetchone()
            stats["database_size"] = {
                "bytes": size_data[0] if size_data else 0,
                "human_readable": size_data[1] if size_data else "0 bytes"
            }
            
            # Get table statistics
            table_stats_query = text("""
                SELECT 
                    schemaname,
                    tablename,
                    n_tup_ins as inserts,
                    n_tup_upd as updates,
                    n_tup_del as deletes,
                    n_live_tup as live_tuples,
                    n_dead_tup as dead_tuples,
                    last_vacuum,
                    last_autovacuum,
                    last_analyze,
                    last_autoanalyze
                FROM pg_stat_user_tables 
                ORDER BY n_live_tup DESC
            """)
            result = await self.db.execute(table_stats_query)
            table_data = result.fetchall()
            stats["table_statistics"] = [
                {
                    "schema": row[0],
                    "table": row[1],
                    "inserts": row[2],
                    "updates": row[3],
                    "deletes": row[4],
                    "live_tuples": row[5],
                    "dead_tuples": row[6],
                    "last_vacuum": row[7].isoformat() if row[7] else None,
                    "last_autovacuum": row[8].isoformat() if row[8] else None,
                    "last_analyze": row[9].isoformat() if row[9] else None,
                    "last_autoanalyze": row[10].isoformat() if row[10] else None
                }
                for row in table_data
            ]
            
            # Get index usage statistics
            index_stats_query = text("""
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_tup_read,
                    idx_tup_fetch,
                    idx_scan,
                    idx_tup_read / NULLIF(idx_scan, 0) as avg_tuples_per_scan
                FROM pg_stat_user_indexes 
                WHERE schemaname = 'public'
                ORDER BY idx_scan DESC
            """)
            result = await self.db.execute(index_stats_query)
            index_data = result.fetchall()
            stats["index_usage"] = [
                {
                    "schema": row[0],
                    "table": row[1],
                    "index": row[2],
                    "tuples_read": row[3],
                    "tuples_fetched": row[4],
                    "scans": row[5],
                    "avg_tuples_per_scan": float(row[6]) if row[6] else 0
                }
                for row in index_data
            ]
            
            # Get connection statistics
            connection_stats_query = text("""
                SELECT 
                    count(*) as total_connections,
                    count(*) FILTER (WHERE state = 'active') as active_connections,
                    count(*) FILTER (WHERE state = 'idle') as idle_connections,
                    count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
                FROM pg_stat_activity 
                WHERE datname = current_database()
            """)
            result = await self.db.execute(connection_stats_query)
            conn_data = result.fetchone()
            stats["connections"] = {
                "total": conn_data[0] if conn_data else 0,
                "active": conn_data[1] if conn_data else 0,
                "idle": conn_data[2] if conn_data else 0,
                "idle_in_transaction": conn_data[3] if conn_data else 0
            }
            
        except Exception as e:
            logger.error(f"Failed to get database stats: {e}")
            stats["error"] = str(e)
        
        return stats
    
    async def get_slow_queries(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get slowest queries from monitoring data"""
        slow_queries = sorted(
            self.monitoring_data["slow_queries"],
            key=lambda x: x["execution_time"],
            reverse=True
        )
        return slow_queries[:limit]
    
    async def get_query_performance_summary(self) -> Dict[str, Any]:
        """Get query performance summary"""
        queries = self.monitoring_data["queries"]
        
        if not queries:
            return {"message": "No queries monitored yet"}
        
        total_queries = len(queries)
        total_time = sum(q["execution_time"] for q in queries)
        avg_time = total_time / total_queries if total_queries > 0 else 0
        slow_queries = [q for q in queries if q["execution_time"] > 1.0]
        
        # Group by query name
        query_groups = {}
        for query in queries:
            name = query["query_name"]
            if name not in query_groups:
                query_groups[name] = []
            query_groups[name].append(query)
        
        # Calculate stats per query type
        query_stats = {}
        for name, group in query_groups.items():
            times = [q["execution_time"] for q in group]
            query_stats[name] = {
                "count": len(group),
                "total_time": sum(times),
                "avg_time": sum(times) / len(times),
                "min_time": min(times),
                "max_time": max(times),
                "slow_count": len([t for t in times if t > 1.0])
            }
        
        return {
            "total_queries": total_queries,
            "total_execution_time": round(total_time, 3),
            "average_execution_time": round(avg_time, 3),
            "slow_queries_count": len(slow_queries),
            "queries_per_second": round(total_queries / total_time, 2) if total_time > 0 else 0,
            "query_breakdown": query_stats,
            "slowest_queries": await self.get_slow_queries(5)
        }
    
    async def get_index_recommendations(self) -> List[Dict[str, Any]]:
        """Get index usage recommendations"""
        recommendations = []
        
        try:
            # Check for unused indexes
            unused_indexes_query = text("""
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_scan,
                    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
                FROM pg_stat_user_indexes 
                WHERE schemaname = 'public' 
                AND idx_scan = 0
                ORDER BY pg_relation_size(indexrelid) DESC
            """)
            result = await self.db.execute(unused_indexes_query)
            unused_data = result.fetchall()
            
            for row in unused_data:
                recommendations.append({
                    "type": "unused_index",
                    "severity": "medium",
                    "table": row[1],
                    "index": row[2],
                    "scans": row[3],
                    "size": row[4],
                    "recommendation": f"Consider dropping unused index {row[2]} on table {row[1]} (size: {row[4]})"
                })
            
            # Check for missing indexes on foreign keys
            missing_fk_indexes_query = text("""
                SELECT 
                    tc.table_name,
                    kcu.column_name,
                    tc.constraint_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                LEFT JOIN pg_indexes pi 
                    ON pi.tablename = tc.table_name 
                    AND pi.indexdef LIKE '%' || kcu.column_name || '%'
                WHERE tc.constraint_type = 'FOREIGN KEY'
                AND pi.indexname IS NULL
                AND tc.table_schema = 'public'
            """)
            result = await self.db.execute(missing_fk_indexes_query)
            missing_fk_data = result.fetchall()
            
            for row in missing_fk_data:
                recommendations.append({
                    "type": "missing_fk_index",
                    "severity": "high",
                    "table": row[0],
                    "column": row[1],
                    "constraint": row[2],
                    "recommendation": f"Add index on {row[0]}.{row[1]} for foreign key constraint {row[2]}"
                })
            
        except Exception as e:
            logger.error(f"Failed to get index recommendations: {e}")
            recommendations.append({
                "type": "error",
                "severity": "low",
                "recommendation": f"Could not analyze indexes: {str(e)}"
            })
        
        return recommendations
    
    async def get_table_health_score(self) -> Dict[str, Any]:
        """Calculate table health score based on various metrics"""
        try:
            # Get table statistics
            health_query = text("""
                SELECT 
                    tablename,
                    n_live_tup as live_tuples,
                    n_dead_tup as dead_tuples,
                    CASE 
                        WHEN n_live_tup > 0 THEN (n_dead_tup::float / n_live_tup) * 100
                        ELSE 0
                    END as dead_tuple_percentage,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size
                FROM pg_stat_user_tables 
                WHERE schemaname = 'public'
                ORDER BY dead_tuple_percentage DESC
            """)
            result = await self.db.execute(health_query)
            table_data = result.fetchall()
            
            health_scores = {}
            total_score = 0
            table_count = 0
            
            for row in table_data:
                table_name = row[0]
                live_tuples = row[1]
                dead_tuples = row[2]
                dead_percentage = row[3]
                table_size = row[4]
                
                # Calculate health score (0-100)
                score = 100
                
                # Penalize high dead tuple percentage
                if dead_percentage > 20:
                    score -= 30
                elif dead_percentage > 10:
                    score -= 15
                elif dead_percentage > 5:
                    score -= 5
                
                # Penalize very large tables without recent activity
                if live_tuples > 100000 and dead_percentage > 10:
                    score -= 10
                
                health_scores[table_name] = {
                    "score": max(0, score),
                    "live_tuples": live_tuples,
                    "dead_tuples": dead_tuples,
                    "dead_percentage": round(dead_percentage, 2),
                    "table_size": table_size,
                    "recommendations": []
                }
                
                # Add recommendations
                if dead_percentage > 20:
                    health_scores[table_name]["recommendations"].append(
                        f"High dead tuple percentage ({dead_percentage:.1f}%). Consider VACUUM FULL."
                    )
                elif dead_percentage > 10:
                    health_scores[table_name]["recommendations"].append(
                        f"Moderate dead tuple percentage ({dead_percentage:.1f}%). Consider VACUUM."
                    )
                
                total_score += health_scores[table_name]["score"]
                table_count += 1
            
            overall_score = total_score / table_count if table_count > 0 else 100
            
            return {
                "overall_score": round(overall_score, 1),
                "table_scores": health_scores,
                "recommendations": self._get_overall_recommendations(overall_score)
            }
            
        except Exception as e:
            logger.error(f"Failed to calculate table health score: {e}")
            return {"error": str(e)}
    
    def _get_overall_recommendations(self, score: float) -> List[str]:
        """Get overall recommendations based on health score"""
        recommendations = []
        
        if score < 50:
            recommendations.append("Database health is poor. Consider immediate maintenance.")
        elif score < 70:
            recommendations.append("Database health is fair. Schedule maintenance soon.")
        elif score < 85:
            recommendations.append("Database health is good. Regular maintenance recommended.")
        else:
            recommendations.append("Database health is excellent. Continue current practices.")
        
        return recommendations
    
    def clear_monitoring_data(self):
        """Clear all monitoring data"""
        self.monitoring_data = {
            "queries": [],
            "slow_queries": [],
            "connection_stats": {},
            "index_usage": {},
            "table_stats": {}
        }
    
    def export_monitoring_data(self) -> Dict[str, Any]:
        """Export monitoring data for analysis"""
        return {
            "monitoring_data": self.monitoring_data,
            "export_timestamp": datetime.now(timezone.utc).isoformat(),
            "summary": {
                "total_queries": len(self.monitoring_data["queries"]),
                "slow_queries": len(self.monitoring_data["slow_queries"]),
                "monitoring_duration": "N/A"  # Could be calculated from first/last query timestamps
            }
        }
