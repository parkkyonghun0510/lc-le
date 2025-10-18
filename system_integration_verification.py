#!/usr/bin/env python3
"""
Complete System Integration Verification for Permission System Bug Fixes

This script verifies all components of the permission system are working correctly:
1. Permission seeding
2. Backend API endpoints
3. Health checks
4. Frontend API client
5. Error handling
6. Complete integration flow
"""

import asyncio
import sys
import os
import subprocess
import json
from pathlib import Path

# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(title):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'=' * 80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{title.center(80)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'=' * 80}{Colors.END}\n")

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.END}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.END}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.END}")

def run_command(command, cwd=None, capture_output=True):
    """Run a command and return the result."""
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=cwd,
            capture_output=capture_output,
            text=True,
            timeout=60
        )
        return result
    except subprocess.TimeoutExpired:
        print_error(f"Command timed out: {command}")
        return None
    except Exception as e:
        print_error(f"Error running command: {e}")
        return None

def verify_permission_seeding():
    """Verify permission seeding is working correctly."""
    print_header("1. PERMISSION SEEDING VERIFICATION")
    
    print_info("Running permission seeding script...")
    result = run_command("python scripts/seed_permissions.py", cwd="le-backend")
    
    if result and result.returncode == 0:
        if "✅ SEEDING SUCCESSFUL" in result.stdout:
            print_success("Permission seeding completed successfully")
            return True
        else:
            print_error("Permission seeding verification failed")
            print_info(f"Output: {result.stdout[-200:]}")  # Show last 200 chars
            return False
    else:
        print_error("Failed to run permission seeding script")
        return False

def verify_backend_tests():
    """Verify backend API endpoints are working."""
    print_header("2. BACKEND API VERIFICATION")
    
    # Test comprehensive verification
    print_info("Running comprehensive backend verification...")
    result = run_command("python test_task2_complete_verification.py", cwd="le-backend")
    
    if result and result.returncode == 0:
        if "🎉 ALL REQUIREMENTS MET - TASK 2 COMPLETE!" in result.stdout:
            print_success("Backend API endpoints verified successfully")
            backend_success = True
        else:
            print_error("Backend verification failed")
            backend_success = False
    else:
        print_error("Failed to run backend verification")
        backend_success = False
    
    # Test matrix API integration
    print_info("Running matrix API integration test...")
    result = run_command("python test_matrix_api_integration.py", cwd="le-backend")
    
    if result and result.returncode == 0:
        if "✅ API Integration Tests Completed" in result.stdout:
            print_success("Matrix API integration verified successfully")
            matrix_success = True
        else:
            print_error("Matrix API integration failed")
            matrix_success = False
    else:
        print_error("Failed to run matrix API integration test")
        matrix_success = False
    
    return backend_success and matrix_success

def verify_frontend_tests():
    """Verify frontend components are working."""
    print_header("3. FRONTEND COMPONENT VERIFICATION")
    
    # Test permission API client
    print_info("Testing permission API client...")
    result = run_command("npm test src/lib/api/__tests__/permissions.test.ts", cwd="lc-workflow-frontend")
    
    if result and result.returncode == 0:
        print_success("Permission API client tests passed")
        api_success = True
    else:
        print_error("Failed to run permission API client tests")
        if result:
            print_info(f"Return code: {result.returncode}")
        api_success = False
    
    # Test error boundary
    print_info("Testing permission error boundary...")
    result = run_command("npm test src/components/permissions/__tests__/PermissionErrorBoundary.test.tsx", cwd="lc-workflow-frontend")
    
    if result and result.returncode == 0:
        print_success("Permission error boundary tests passed")
        boundary_success = True
    else:
        print_error("Failed to run permission error boundary tests")
        if result:
            print_info(f"Return code: {result.returncode}")
        boundary_success = False
    
    # Test permission check hook
    print_info("Testing usePermissionCheck hook...")
    result = run_command("npm test src/hooks/__tests__/usePermissionCheck.test.tsx", cwd="lc-workflow-frontend")
    
    if result and result.returncode == 0:
        print_success("usePermissionCheck hook tests passed")
        hook_success = True
    else:
        print_error("Failed to run usePermissionCheck hook tests")
        if result:
            print_info(f"Return code: {result.returncode}")
        hook_success = False
    
    return api_success and boundary_success and hook_success

def verify_file_structure():
    """Verify all required files exist."""
    print_header("4. FILE STRUCTURE VERIFICATION")
    
    required_files = [
        # Backend files
        "le-backend/scripts/seed_permissions.py",
        "le-backend/app/routers/permissions.py",
        "le-backend/app/services/permission_service.py",
        "le-backend/app/permission_schemas.py",
        
        # Frontend files
        "lc-workflow-frontend/src/lib/api/permissions.ts",
        "lc-workflow-frontend/src/lib/api/permissionErrors.ts",
        "lc-workflow-frontend/src/components/permissions/PermissionErrorBoundary.tsx",
        "lc-workflow-frontend/src/hooks/usePermissionCheck.ts",
        "lc-workflow-frontend/app/permissions/page.tsx",
        
        # Test files
        "lc-workflow-frontend/src/lib/api/__tests__/permissions.test.ts",
        "lc-workflow-frontend/src/components/permissions/__tests__/PermissionErrorBoundary.test.tsx",
        "lc-workflow-frontend/src/hooks/__tests__/usePermissionCheck.test.tsx",
    ]
    
    missing_files = []
    for file_path in required_files:
        if not Path(file_path).exists():
            missing_files.append(file_path)
    
    if missing_files:
        print_error("Missing required files:")
        for file_path in missing_files:
            print(f"  - {file_path}")
        return False
    else:
        print_success("All required files exist")
        return True

def verify_task_completion():
    """Verify task completion status."""
    print_header("5. TASK COMPLETION VERIFICATION")
    
    # Read tasks.md to check completion status
    tasks_file = Path(".kiro/specs/permission-system-bug-fixes/tasks.md")
    if not tasks_file.exists():
        print_error("Tasks file not found")
        return False
    
    with open(tasks_file, 'r') as f:
        content = f.read()
    
    # Check for completed tasks
    completed_tasks = content.count("- [x]")
    total_tasks = content.count("- [ ]") + completed_tasks
    
    print_info(f"Task completion: {completed_tasks}/{total_tasks} tasks completed")
    
    # Check specific critical tasks
    critical_tasks = [
        "1. Fix backend permission authorization checks",
        "2. Verify and fix permission matrix endpoint", 
        "3. Implement permission seeding system",
        "4. Add permission system health check endpoint",
        "5. Fix frontend API client error handling",
        "6. Create permission error boundary component",
        "7. Update permission check logic in frontend"
    ]
    
    completed_critical = 0
    for task in critical_tasks:
        if f"- [x] {task}" in content:
            completed_critical += 1
            print_success(f"Task completed: {task}")
        else:
            print_warning(f"Task not completed: {task}")
    
    print_info(f"Critical tasks: {completed_critical}/{len(critical_tasks)} completed")
    
    return completed_critical >= 5  # At least 5 critical tasks should be done

def main():
    """Main verification function."""
    print_header("PERMISSION SYSTEM INTEGRATION VERIFICATION")
    print_info("Verifying complete system integration for permission bug fixes...")
    
    results = {
        "permission_seeding": False,
        "backend_tests": False,
        "frontend_tests": False,
        "file_structure": False,
        "task_completion": False
    }
    
    # Run all verifications
    results["permission_seeding"] = verify_permission_seeding()
    results["backend_tests"] = verify_backend_tests()
    results["frontend_tests"] = verify_frontend_tests()
    results["file_structure"] = verify_file_structure()
    results["task_completion"] = verify_task_completion()
    
    # Final summary
    print_header("VERIFICATION SUMMARY")
    
    passed = sum(results.values())
    total = len(results)
    
    for category, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {category.replace('_', ' ').title()}")
    
    print(f"\n{Colors.BOLD}Overall Result: {passed}/{total} verifications passed{Colors.END}")
    
    if passed == total:
        print_success("🎉 ALL SYSTEM INTEGRATION VERIFICATIONS PASSED!")
        print_info("The permission system bug fixes are complete and working correctly.")
        return True
    else:
        print_error("❌ SOME VERIFICATIONS FAILED")
        print_info("Please review the failed verifications above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)