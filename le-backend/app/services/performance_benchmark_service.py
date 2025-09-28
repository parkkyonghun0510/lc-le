"""
Performance Benchmark Service
Provides comprehensive performance testing and benchmarking capabilities.
"""

import asyncio
import time
import logging
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass
import statistics
import json

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from app.database import get_db
from app.models import User, CustomerApplication
from app.services.cache_service import CacheService
from app.services.user_cache_service import UserCacheService

logger = logging.getLogger(__name__)

@dataclass
class BenchmarkResult:
    """Result of a performance benchmark test"""
    test_name: str
    duration: float
    success: bool
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now(timezone.utc)

@dataclass
class PerformanceMetrics:
    """Performance metrics for a test suite"""
    test_name: str
    total_tests: int
    successful_tests: int
    failed_tests: int
    avg_duration: float
    min_duration: float
    max_duration: float
    median_duration: float
    p95_duration: float
    p99_duration: float
    success_rate: float
    timestamp: datetime

class PerformanceBenchmarkService:
    """Service for running performance benchmarks and tests"""
    
    def __init__(self):
        self.cache_service = CacheService()
        self.user_cache_service = None  # Initialize lazily to avoid DB dependency during import
        self.benchmark_results: List[BenchmarkResult] = []
        self.benchmark_suites: Dict[str, List[Callable]] = {}
    
    def register_benchmark_suite(self, suite_name: str, tests: List[Callable]):
        """Register a benchmark test suite"""
        self.benchmark_suites[suite_name] = tests
        logger.info(f"Registered benchmark suite '{suite_name}' with {len(tests)} tests")
    
    async def run_benchmark_suite(self, suite_name: str, iterations: int = 5) -> PerformanceMetrics:
        """Run a complete benchmark test suite"""
        if suite_name not in self.benchmark_suites:
            raise ValueError(f"Benchmark suite '{suite_name}' not found")
        
        tests = self.benchmark_suites[suite_name]
        results = []
        
        logger.info(f"Running benchmark suite '{suite_name}' with {iterations} iterations")
        
        for test_func in tests:
            test_results = []
            
            for i in range(iterations):
                try:
                    start_time = time.time()
                    await test_func()
                    duration = time.time() - start_time
                    
                    result = BenchmarkResult(
                        test_name=test_func.__name__,
                        duration=duration,
                        success=True,
                        metadata={"iteration": i + 1}
                    )
                    test_results.append(result)
                    self.benchmark_results.append(result)
                    
                except Exception as e:
                    result = BenchmarkResult(
                        test_name=test_func.__name__,
                        duration=0,
                        success=False,
                        error=str(e),
                        metadata={"iteration": i + 1}
                    )
                    test_results.append(result)
                    self.benchmark_results.append(result)
                    logger.error(f"Benchmark test {test_func.__name__} failed: {e}")
            
            results.extend(test_results)
        
        # Calculate metrics
        metrics = self._calculate_metrics(suite_name, results)
        logger.info(f"Benchmark suite '{suite_name}' completed: {metrics.success_rate:.1%} success rate")
        
        return metrics
    
    async def run_database_benchmarks(self, iterations: int = 5) -> PerformanceMetrics:
        """Run database-specific performance benchmarks"""
        tests = [
            self._benchmark_user_list_query,
            self._benchmark_user_detail_query,
            self._benchmark_application_list_query,
            self._benchmark_complex_join_query,
            self._benchmark_aggregation_query,
            self._benchmark_pagination_query
        ]
        
        return await self.run_benchmark_suite("database", iterations)
    
    async def run_caching_benchmarks(self, iterations: int = 5) -> PerformanceMetrics:
        """Run caching-specific performance benchmarks"""
        tests = [
            self._benchmark_cache_set,
            self._benchmark_cache_get,
            self._benchmark_cache_invalidation,
            self._benchmark_user_cache_operations
        ]
        
        return await self.run_benchmark_suite("caching", iterations)
    
    async def run_api_benchmarks(self, iterations: int = 5) -> PerformanceMetrics:
        """Run API endpoint performance benchmarks"""
        tests = [
            self._benchmark_user_list_api,
            self._benchmark_user_detail_api,
            self._benchmark_analytics_api,
            self._benchmark_bulk_operations_api
        ]
        
        return await self.run_benchmark_suite("api", iterations)
    
    async def run_comprehensive_benchmark(self, iterations: int = 3) -> Dict[str, PerformanceMetrics]:
        """Run all benchmark suites and return comprehensive results"""
        results = {}
        
        logger.info("Starting comprehensive performance benchmark")
        
        # Database benchmarks
        try:
            results["database"] = await self.run_database_benchmarks(iterations)
        except Exception as e:
            logger.error(f"Database benchmark failed: {e}")
            results["database"] = None
        
        # Caching benchmarks
        try:
            results["caching"] = await self.run_caching_benchmarks(iterations)
        except Exception as e:
            logger.error(f"Caching benchmark failed: {e}")
            results["caching"] = None
        
        # API benchmarks
        try:
            results["api"] = await self.run_api_benchmarks(iterations)
        except Exception as e:
            logger.error(f"API benchmark failed: {e}")
            results["api"] = None
        
        logger.info("Comprehensive benchmark completed")
        return results
    
    def _calculate_metrics(self, suite_name: str, results: List[BenchmarkResult]) -> PerformanceMetrics:
        """Calculate performance metrics from benchmark results"""
        successful_results = [r for r in results if r.success]
        failed_results = [r for r in results if not r.success]
        
        if not successful_results:
            return PerformanceMetrics(
                test_name=suite_name,
                total_tests=len(results),
                successful_tests=0,
                failed_tests=len(results),
                avg_duration=0,
                min_duration=0,
                max_duration=0,
                median_duration=0,
                p95_duration=0,
                p99_duration=0,
                success_rate=0,
                timestamp=datetime.now(timezone.utc)
            )
        
        durations = [r.duration for r in successful_results]
        
        return PerformanceMetrics(
            test_name=suite_name,
            total_tests=len(results),
            successful_tests=len(successful_results),
            failed_tests=len(failed_results),
            avg_duration=statistics.mean(durations),
            min_duration=min(durations),
            max_duration=max(durations),
            median_duration=statistics.median(durations),
            p95_duration=self._percentile(durations, 95),
            p99_duration=self._percentile(durations, 99),
            success_rate=len(successful_results) / len(results),
            timestamp=datetime.now(timezone.utc)
        )
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile of a dataset"""
        sorted_data = sorted(data)
        index = int((percentile / 100) * len(sorted_data))
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    # Database benchmark tests
    async def _benchmark_user_list_query(self):
        """Benchmark user list query performance"""
        async for db in get_db():
            query = select(User).limit(100)
            await db.execute(query)
            break
    
    async def _benchmark_user_detail_query(self):
        """Benchmark user detail query performance"""
        async for db in get_db():
            query = select(User).where(User.id.isnot(None)).limit(1)
            result = await db.execute(query)
            user = result.scalar_one_or_none()
            if user:
                # Simulate accessing related data
                _ = user.department_id
                _ = user.branch_id
            break
    
    async def _benchmark_application_list_query(self):
        """Benchmark application list query performance"""
        async for db in get_db():
            query = select(CustomerApplication).limit(50)
            await db.execute(query)
            break
    
    async def _benchmark_complex_join_query(self):
        """Benchmark complex join query performance"""
        async for db in get_db():
            query = text("""
                SELECT u.id, u.username, u.email, d.name as department_name, b.name as branch_name
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.id
                LEFT JOIN branches b ON u.branch_id = b.id
                LIMIT 100
            """)
            await db.execute(query)
            break
    
    async def _benchmark_aggregation_query(self):
        """Benchmark aggregation query performance"""
        async for db in get_db():
            query = text("""
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(*) FILTER (WHERE status = 'active') as active_users,
                    COUNT(*) FILTER (WHERE status = 'inactive') as inactive_users
                FROM users
            """)
            await db.execute(query)
            break
    
    async def _benchmark_pagination_query(self):
        """Benchmark pagination query performance"""
        async for db in get_db():
            query = select(User).offset(0).limit(20)
            await db.execute(query)
            break
    
    # Caching benchmark tests
    async def _benchmark_cache_set(self):
        """Benchmark cache set operations"""
        test_data = {"test": "data", "timestamp": datetime.now().isoformat()}
        await self.cache_service.set("benchmark_test", test_data, ttl=60)
    
    async def _benchmark_cache_get(self):
        """Benchmark cache get operations"""
        await self.cache_service.get("benchmark_test")
    
    async def _benchmark_cache_invalidation(self):
        """Benchmark cache invalidation operations"""
        await self.cache_service.delete("benchmark_test")
    
    async def _benchmark_user_cache_operations(self):
        """Benchmark user cache operations"""
        # This would test the UserCacheService operations
        # For now, just test basic cache operations
        test_key = f"user_cache_test_{int(time.time())}"
        test_data = {"user_id": "test", "data": "cached"}
        await self.cache_service.set(test_key, test_data, ttl=60)
        await self.cache_service.get(test_key)
        await self.cache_service.delete(test_key)
    
    # API benchmark tests (simulated)
    async def _benchmark_user_list_api(self):
        """Benchmark user list API performance"""
        # Simulate API call by running the query
        await self._benchmark_user_list_query()
    
    async def _benchmark_user_detail_api(self):
        """Benchmark user detail API performance"""
        # Simulate API call by running the query
        await self._benchmark_user_detail_query()
    
    async def _benchmark_analytics_api(self):
        """Benchmark analytics API performance"""
        # Simulate analytics query
        await self._benchmark_aggregation_query()
    
    async def _benchmark_bulk_operations_api(self):
        """Benchmark bulk operations API performance"""
        # Simulate bulk operation by running multiple queries
        for _ in range(10):
            await self._benchmark_user_list_query()
    
    async def get_benchmark_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get benchmark history for the specified time period"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        recent_results = [
            result for result in self.benchmark_results
            if result.timestamp >= cutoff_time
        ]
        
        return [
            {
                "test_name": result.test_name,
                "duration": result.duration,
                "success": result.success,
                "error": result.error,
                "metadata": result.metadata,
                "timestamp": result.timestamp.isoformat()
            }
            for result in recent_results
        ]
    
    async def get_performance_summary(self) -> Dict[str, Any]:
        """Get overall performance summary"""
        if not self.benchmark_results:
            return {"message": "No benchmark results available"}
        
        # Group results by test name
        test_groups = {}
        for result in self.benchmark_results:
            if result.test_name not in test_groups:
                test_groups[result.test_name] = []
            test_groups[result.test_name].append(result)
        
        # Calculate summary for each test
        test_summaries = {}
        for test_name, results in test_groups.items():
            successful_results = [r for r in results if r.success]
            if successful_results:
                durations = [r.duration for r in successful_results]
                test_summaries[test_name] = {
                    "total_runs": len(results),
                    "successful_runs": len(successful_results),
                    "success_rate": len(successful_results) / len(results),
                    "avg_duration": statistics.mean(durations),
                    "min_duration": min(durations),
                    "max_duration": max(durations),
                    "median_duration": statistics.median(durations)
                }
        
        return {
            "total_tests": len(self.benchmark_results),
            "test_summaries": test_summaries,
            "overall_success_rate": len([r for r in self.benchmark_results if r.success]) / len(self.benchmark_results)
        }

# Global benchmark service instance
benchmark_service = PerformanceBenchmarkService()

# Register benchmark suites
benchmark_service.register_benchmark_suite("database", [
    benchmark_service._benchmark_user_list_query,
    benchmark_service._benchmark_user_detail_query,
    benchmark_service._benchmark_application_list_query,
    benchmark_service._benchmark_complex_join_query,
    benchmark_service._benchmark_aggregation_query,
    benchmark_service._benchmark_pagination_query
])

benchmark_service.register_benchmark_suite("caching", [
    benchmark_service._benchmark_cache_set,
    benchmark_service._benchmark_cache_get,
    benchmark_service._benchmark_cache_invalidation,
    benchmark_service._benchmark_user_cache_operations
])

benchmark_service.register_benchmark_suite("api", [
    benchmark_service._benchmark_user_list_api,
    benchmark_service._benchmark_user_detail_api,
    benchmark_service._benchmark_analytics_api,
    benchmark_service._benchmark_bulk_operations_api
])
