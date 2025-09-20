#!/usr/bin/env python3
"""
End-to-End Test Runner for System Stability Improvements

This script runs comprehensive end-to-end tests to validate all system
functionality and performance requirements.
"""

import asyncio
import sys
import os
import subprocess
import time
import json
from typing import Dict, List, Any, Optional
from pathlib import Path


class TestRunner:
    """Comprehensive test runner for end-to-end validation"""
    
    def __init__(self):
        self.results = {
            "start_time": time.time(),
            "test_suites": {},
            "summary": {
                "total_tests": 0,
                "passed": 0,
                "failed": 0,
                "skipped": 0,
                "errors": []
            }
        }
    
    def run_all_tests(self, include_slow: bool = False, include_stress: bool = False) -> bool:
        """Run all end-to-end test suites"""
        
        print("🚀 Starting End-to-End Test Suite for System Stability Improvements")
        print("=" * 80)
        
        # Test suites to run
        test_suites = [
            {
                "name": "Unit Tests",
                "command": ["python3", "-m", "pytest", "tests/", "-v", "--tb=short", "-m", "not slow"],
                "description": "Core unit tests for all components"
            },
            {
                "name": "Integration Tests", 
                "command": ["python3", "-m", "pytest", "tests/test_folder_integration.py", "tests/test_data_sync_integration.py", "-v"],
                "description": "Integration tests for component interactions"
            },
            {
                "name": "End-to-End Workflows",
                "command": ["python3", "-m", "pytest", "tests/test_end_to_end_workflows.py", "-v", "--tb=short"],
                "description": "Complete user workflow validation"
            },
            {
                "name": "Regression Tests",
                "command": ["python3", "-m", "pytest", "tests/test_regression_critical_paths.py", "-v", "--tb=short"],
                "description": "Critical path regression validation"
            }
        ]
        
        # Add performance tests if requested
        if include_slow:
            test_suites.append({
                "name": "Performance Tests",
                "command": ["python3", "-m", "pytest", "tests/test_performance_stress.py", "-v", "-m", "slow"],
                "description": "Performance and load testing"
            })
        
        # Add stress tests if requested
        if include_stress:
            test_suites.append({
                "name": "Stress Tests",
                "command": ["python3", "-m", "pytest", "tests/test_performance_stress.py::TestSystemResourceUsage", "-v"],
                "description": "System stress and resource usage testing"
            })
        
        all_passed = True
        
        for suite in test_suites:
            print(f"\n📋 Running {suite['name']}")
            print(f"   {suite['description']}")
            print("-" * 60)
            
            success = self._run_test_suite(suite)
            if not success:
                all_passed = False
                if not include_slow:  # Stop on failure for quick tests
                    break
        
        # Generate final report
        self._generate_report()
        
        return all_passed
    
    def _run_test_suite(self, suite: Dict[str, Any]) -> bool:
        """Run a single test suite"""
        
        start_time = time.time()
        
        try:
            # Run the test command
            result = subprocess.run(
                suite["command"],
                capture_output=True,
                text=True,
                timeout=600  # 10 minute timeout per suite
            )
            
            end_time = time.time()
            duration = end_time - start_time
            
            # Parse results
            success = result.returncode == 0
            
            suite_result = {
                "success": success,
                "duration": duration,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "return_code": result.returncode
            }
            
            self.results["test_suites"][suite["name"]] = suite_result
            
            # Print summary
            if success:
                print(f"✅ {suite['name']} PASSED ({duration:.2f}s)")
                self._extract_test_counts(result.stdout, passed=True)
            else:
                print(f"❌ {suite['name']} FAILED ({duration:.2f}s)")
                print(f"   Return code: {result.returncode}")
                if result.stderr:
                    print(f"   Error: {result.stderr[:200]}...")
                self._extract_test_counts(result.stdout, passed=False)
                self.results["summary"]["errors"].append({
                    "suite": suite["name"],
                    "error": result.stderr[:500]
                })
            
            return success
            
        except subprocess.TimeoutExpired:
            print(f"⏰ {suite['name']} TIMEOUT (>10 minutes)")
            self.results["test_suites"][suite["name"]] = {
                "success": False,
                "duration": 600,
                "error": "Test suite timed out"
            }
            self.results["summary"]["errors"].append({
                "suite": suite["name"],
                "error": "Test suite timed out after 10 minutes"
            })
            return False
            
        except Exception as e:
            print(f"💥 {suite['name']} ERROR: {e}")
            self.results["test_suites"][suite["name"]] = {
                "success": False,
                "duration": time.time() - start_time,
                "error": str(e)
            }
            self.results["summary"]["errors"].append({
                "suite": suite["name"],
                "error": str(e)
            })
            return False
    
    def _extract_test_counts(self, output: str, passed: bool) -> None:
        """Extract test counts from pytest output"""
        
        # Look for pytest summary line
        lines = output.split('\n')
        for line in lines:
            if 'passed' in line or 'failed' in line or 'error' in line:
                # Try to extract numbers
                import re
                numbers = re.findall(r'(\d+) (\w+)', line)
                for count, status in numbers:
                    count = int(count)
                    if status in ['passed', 'PASSED']:
                        self.results["summary"]["passed"] += count
                    elif status in ['failed', 'FAILED', 'error', 'ERROR']:
                        self.results["summary"]["failed"] += count
                    elif status in ['skipped', 'SKIPPED']:
                        self.results["summary"]["skipped"] += count
                    
                    self.results["summary"]["total_tests"] += count
    
    def _generate_report(self) -> None:
        """Generate comprehensive test report"""
        
        end_time = time.time()
        total_duration = end_time - self.results["start_time"]
        
        print("\n" + "=" * 80)
        print("📊 END-TO-END TEST REPORT")
        print("=" * 80)
        
        # Summary
        summary = self.results["summary"]
        print(f"Total Duration: {total_duration:.2f} seconds")
        print(f"Total Tests: {summary['total_tests']}")
        print(f"✅ Passed: {summary['passed']}")
        print(f"❌ Failed: {summary['failed']}")
        print(f"⏭️  Skipped: {summary['skipped']}")
        
        # Success rate
        if summary['total_tests'] > 0:
            success_rate = (summary['passed'] / summary['total_tests']) * 100
            print(f"Success Rate: {success_rate:.1f}%")
        
        # Suite breakdown
        print("\n📋 Test Suite Results:")
        for suite_name, suite_result in self.results["test_suites"].items():
            status = "✅ PASS" if suite_result["success"] else "❌ FAIL"
            duration = suite_result.get("duration", 0)
            print(f"  {status} {suite_name} ({duration:.2f}s)")
        
        # Errors
        if summary["errors"]:
            print("\n🚨 Errors:")
            for error in summary["errors"]:
                print(f"  - {error['suite']}: {error['error'][:100]}...")
        
        # Save detailed report
        report_file = "test_report.json"
        with open(report_file, 'w') as f:
            json.dump(self.results, f, indent=2)
        print(f"\n📄 Detailed report saved to: {report_file}")
        
        # Performance summary
        self._print_performance_summary()
    
    def _print_performance_summary(self) -> None:
        """Print performance test summary if available"""
        
        perf_suite = self.results["test_suites"].get("Performance Tests")
        if not perf_suite:
            return
        
        print("\n⚡ Performance Summary:")
        
        if perf_suite["success"]:
            print("  ✅ All performance tests passed")
            print("  📈 System meets performance requirements")
        else:
            print("  ❌ Some performance tests failed")
            print("  ⚠️  System may not meet performance requirements")
        
        # Extract performance metrics from output if available
        if "stdout" in perf_suite:
            output = perf_suite["stdout"]
            
            # Look for performance metrics
            lines = output.split('\n')
            for line in lines:
                if 'uploads/sec' in line or 'MB/s' in line or 'ops/sec' in line:
                    print(f"  📊 {line.strip()}")


def main():
    """Main entry point"""
    
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Run comprehensive end-to-end tests for system stability improvements"
    )
    parser.add_argument(
        "--include-slow", 
        action="store_true",
        help="Include slow performance tests"
    )
    parser.add_argument(
        "--include-stress",
        action="store_true", 
        help="Include stress tests (requires --include-slow)"
    )
    parser.add_argument(
        "--quick",
        action="store_true",
        help="Run only quick tests (unit + integration)"
    )
    
    args = parser.parse_args()
    
    # Validate arguments
    if args.include_stress and not args.include_slow:
        print("❌ Error: --include-stress requires --include-slow")
        sys.exit(1)
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # Check if we're in a virtual environment
    if not os.environ.get('VIRTUAL_ENV') and not sys.prefix != sys.base_prefix:
        print("⚠️  Warning: Not running in a virtual environment")
        print("   Consider activating your virtual environment first")
    
    # Run tests
    runner = TestRunner()
    
    if args.quick:
        # Quick test mode - only unit and integration tests
        success = runner.run_all_tests(include_slow=False, include_stress=False)
    else:
        success = runner.run_all_tests(
            include_slow=args.include_slow,
            include_stress=args.include_stress
        )
    
    # Exit with appropriate code
    if success:
        print("\n🎉 All tests passed! System is stable and ready for deployment.")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed. Please review the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()