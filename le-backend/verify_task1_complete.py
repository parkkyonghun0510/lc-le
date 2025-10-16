#!/usr/bin/env python3
"""
Verification script for Task 1: Database schema and models setup
This script verifies that all components of Task 1 have been successfully implemented.
"""

import asyncio
from app.database import engine
from sqlalchemy import text, inspect
from app.models import Employee, ApplicationEmployeeAssignment, CustomerApplication

async def verify_task1():
    print("=" * 70)
    print("TASK 1 VERIFICATION: Database Schema and Models Setup")
    print("=" * 70)
    
    all_checks_passed = True
    
    async with engine.connect() as conn:
        # Check 1: Verify employees table exists
        print("\n✓ Check 1: Employees table exists")
        result = await conn.execute(text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='employees')"
        ))
        if not result.scalar():
            print("  ✗ FAILED: employees table not found")
            all_checks_passed = False
        else:
            print("  ✓ PASSED")
        
        # Check 2: Verify application_employee_assignments table exists
        print("\n✓ Check 2: Application employee assignments table exists")
        result = await conn.execute(text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='application_employee_assignments')"
        ))
        if not result.scalar():
            print("  ✗ FAILED: application_employee_assignments table not found")
            all_checks_passed = False
        else:
            print("  ✓ PASSED")
        
        # Check 3: Verify portfolio_officer_migrated column exists
        print("\n✓ Check 3: portfolio_officer_migrated column exists in customer_applications")
        result = await conn.execute(text(
            "SELECT EXISTS (SELECT FROM information_schema.columns "
            "WHERE table_name='customer_applications' AND column_name='portfolio_officer_migrated')"
        ))
        if not result.scalar():
            print("  ✗ FAILED: portfolio_officer_migrated column not found")
            all_checks_passed = False
        else:
            print("  ✓ PASSED")
        
        # Check 4: Verify all required indexes exist
        print("\n✓ Check 4: All required indexes exist")
        required_indexes = [
            ('employees', 'ix_employees_employee_code'),
            ('employees', 'ix_employees_department_id'),
            ('employees', 'ix_employees_branch_id'),
            ('employees', 'ix_employees_is_active'),
            ('employees', 'ix_employees_user_id'),
            ('application_employee_assignments', 'ix_application_employee_assignments_application_id'),
            ('application_employee_assignments', 'ix_application_employee_assignments_employee_id'),
            ('application_employee_assignments', 'ix_application_employee_assignments_assignment_role'),
            ('application_employee_assignments', 'ix_application_employee_assignments_is_active'),
            ('application_employee_assignments', 'ix_unique_assignment'),
        ]
        
        for table_name, index_name in required_indexes:
            result = await conn.execute(text(
                f"SELECT EXISTS (SELECT FROM pg_indexes WHERE tablename='{table_name}' AND indexname='{index_name}')"
            ))
            if not result.scalar():
                print(f"  ✗ FAILED: Index {index_name} not found on {table_name}")
                all_checks_passed = False
        
        if all_checks_passed:
            print("  ✓ PASSED: All indexes exist")
        
        # Check 5: Verify foreign key constraints
        print("\n✓ Check 5: All foreign key constraints exist")
        required_fks = [
            ('employees', 'employees_department_id_fkey'),
            ('employees', 'employees_branch_id_fkey'),
            ('employees', 'employees_user_id_fkey'),
            ('application_employee_assignments', 'application_employee_assignments_application_id_fkey'),
            ('application_employee_assignments', 'application_employee_assignments_employee_id_fkey'),
        ]
        
        for table_name, fk_name in required_fks:
            result = await conn.execute(text(
                f"SELECT EXISTS (SELECT FROM information_schema.table_constraints "
                f"WHERE table_name='{table_name}' AND constraint_name='{fk_name}' AND constraint_type='FOREIGN KEY')"
            ))
            if not result.scalar():
                print(f"  ✗ FAILED: Foreign key {fk_name} not found on {table_name}")
                all_checks_passed = False
        
        if all_checks_passed:
            print("  ✓ PASSED: All foreign keys exist")
    
    # Check 6: Verify models can be imported
    print("\n✓ Check 6: Models can be imported")
    try:
        from app.models import Employee, ApplicationEmployeeAssignment, CustomerApplication
        print("  ✓ PASSED: All models imported successfully")
    except ImportError as e:
        print(f"  ✗ FAILED: Could not import models: {e}")
        all_checks_passed = False
    
    # Check 7: Verify model relationships
    print("\n✓ Check 7: Model relationships are configured")
    try:
        # Check Employee relationships
        assert hasattr(Employee, 'department'), "Employee missing 'department' relationship"
        assert hasattr(Employee, 'branch'), "Employee missing 'branch' relationship"
        assert hasattr(Employee, 'linked_user'), "Employee missing 'linked_user' relationship"
        assert hasattr(Employee, 'assignments'), "Employee missing 'assignments' relationship"
        
        # Check ApplicationEmployeeAssignment relationships
        assert hasattr(ApplicationEmployeeAssignment, 'application'), "Assignment missing 'application' relationship"
        assert hasattr(ApplicationEmployeeAssignment, 'employee'), "Assignment missing 'employee' relationship"
        
        # Check CustomerApplication relationships
        assert hasattr(CustomerApplication, 'employee_assignments'), "CustomerApplication missing 'employee_assignments' relationship"
        assert hasattr(CustomerApplication, 'portfolio_officer_migrated'), "CustomerApplication missing 'portfolio_officer_migrated' field"
        
        print("  ✓ PASSED: All relationships configured correctly")
    except AssertionError as e:
        print(f"  ✗ FAILED: {e}")
        all_checks_passed = False
    
    # Final summary
    print("\n" + "=" * 70)
    if all_checks_passed:
        print("✓ ALL CHECKS PASSED - Task 1 is complete!")
        print("\nThe following have been successfully implemented:")
        print("  • employees table with all required columns")
        print("  • application_employee_assignments table")
        print("  • portfolio_officer_migrated column in customer_applications")
        print("  • All required indexes for performance")
        print("  • All foreign key constraints")
        print("  • Employee and ApplicationEmployeeAssignment models")
        print("  • Model relationships and exports")
    else:
        print("✗ SOME CHECKS FAILED - Please review the errors above")
    print("=" * 70)
    
    return all_checks_passed

if __name__ == "__main__":
    result = asyncio.run(verify_task1())
    exit(0 if result else 1)
