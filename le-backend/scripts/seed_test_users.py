#!/usr/bin/env python3
"""
Test User Seeding Script for LC Workflow System

This script creates test users with different roles and positions to test
the workflow system from the frontend with realistic user scenarios.

Test Users Created:
1. Admin User - Full system access
2. Branch Manager - Branch-level management
3. Teller/Officer - Process applications
4. Manager - Approve/reject applications
5. Portfolio Officer - Create applications
6. Regular User - Submit applications

Each user will have:
- Unique username and email
- Default password: Test@123
- Assigned role
- Assigned position (where applicable)
- Branch and department assignments
"""

import asyncio
import sys
import os
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
import logging

# Add the app directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import AsyncSessionLocal, engine, Base
from app.models import User, Position, Branch, Department
from app.models.permissions import Role, UserRole

logger = logging.getLogger(__name__)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Default password for all test users
DEFAULT_PASSWORD = "Test@123"


async def get_or_create_branch(db: AsyncSession) -> Branch:
    """Get or create a test branch."""
    query = select(Branch).where(Branch.code == "HQ001")
    result = await db.execute(query)
    branch = result.scalar_one_or_none()
    
    if not branch:
        branch = Branch(
            name="Headquarters Branch",
            code="HQ001",
            address="123 Main Street, Phnom Penh, Cambodia",
            phone_number="+855 23 123 456",
            email="hq@example.com",
            is_active=True
        )
        db.add(branch)
        await db.flush()
        logger.info(f"✅ Created branch: {branch.name}")
    else:
        logger.info(f"✅ Branch already exists: {branch.name}")
    
    return branch


async def get_or_create_department(db: AsyncSession) -> Department:
    """Get or create a test department."""
    query = select(Department).where(Department.code == "LOAN001")
    result = await db.execute(query)
    department = result.scalar_one_or_none()
    
    if not department:
        department = Department(
            name="Loan Department",
            code="LOAN001",
            description="Handles all loan applications and processing",
            is_active=True
        )
        db.add(department)
        await db.flush()
        logger.info(f"✅ Created department: {department.name}")
    else:
        logger.info(f"✅ Department already exists: {department.name}")
    
    return department


async def get_or_create_positions(db: AsyncSession) -> Dict[str, Position]:
    """Get or create test positions."""
    positions_data = [
        {
            "name": "Teller",
            "description": "Front-line staff who process applications and validate customer information"
        },
        {
            "name": "Branch Manager",
            "description": "Branch-level management with approval authority"
        },
        {
            "name": "Portfolio Officer",
            "description": "Manages customer portfolios and creates applications"
        },
        {
            "name": "Credit Officer",
            "description": "Analyzes and processes credit applications"
        }
    ]
    
    positions = {}
    
    for pos_data in positions_data:
        query = select(Position).where(Position.name == pos_data["name"])
        result = await db.execute(query)
        position = result.scalar_one_or_none()
        
        if not position:
            position = Position(
                name=pos_data["name"],
                description=pos_data["description"],
                is_active=True
            )
            db.add(position)
            await db.flush()
            logger.info(f"✅ Created position: {position.name}")
        else:
            logger.info(f"✅ Position already exists: {position.name}")
        
        positions[pos_data["name"]] = position
    
    return positions


async def get_role_by_name(db: AsyncSession, role_name: str) -> Role:
    """Get a role by name."""
    query = select(Role).where(Role.name == role_name)
    result = await db.execute(query)
    role = result.scalar_one_or_none()
    
    if not role:
        logger.warning(f"⚠️ Role '{role_name}' not found. Please run seed_permissions.py first.")
    
    return role


async def create_test_user(
    db: AsyncSession,
    username: str,
    email: str,
    first_name: str,
    last_name: str,
    role: str,
    employee_id: str,
    branch: Branch,
    department: Department,
    position: Position = None,
    role_obj: Role = None
) -> User:
    """Create a test user with specified attributes."""
    
    # Check if user already exists
    query = select(User).where(User.username == username)
    result = await db.execute(query)
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        logger.info(f"✅ User already exists: {username}")
        return existing_user
    
    # Create new user
    user = User(
        username=username,
        email=email,
        password_hash=pwd_context.hash(DEFAULT_PASSWORD),
        first_name=first_name,
        last_name=last_name,
        phone_number=f"+855 12 {employee_id}000",
        employee_id=employee_id,
        role=role,
        status='active',
        branch_id=branch.id,
        department_id=department.id,
        position_id=position.id if position else None,
        onboarding_completed=True,
        login_count=0,
        failed_login_attempts=0
    )
    
    db.add(user)
    await db.flush()
    
    # Assign role from permission system if available
    if role_obj:
        user_role = UserRole(
            user_id=user.id,
            role_id=role_obj.id
        )
        db.add(user_role)
        await db.flush()
        logger.info(f"✅ Assigned permission role '{role_obj.name}' to user {username}")
    
    logger.info(f"✅ Created user: {username} ({first_name} {last_name}) - Role: {role}, Position: {position.name if position else 'None'}")
    
    return user


async def seed_test_users(db: AsyncSession) -> Dict[str, Any]:
    """Seed test users for workflow testing."""
    logger.info("Starting test user seeding...")
    
    results = {
        "users_created": 0,
        "users_existing": 0,
        "branches_created": 0,
        "departments_created": 0,
        "positions_created": 0,
        "errors": []
    }
    
    try:
        # Get or create branch and department
        branch = await get_or_create_branch(db)
        department = await get_or_create_department(db)
        
        # Get or create positions
        positions = await get_or_create_positions(db)
        
        # Get roles from permission system
        admin_role = await get_role_by_name(db, "admin")
        branch_manager_role = await get_role_by_name(db, "branch_manager")
        teller_role = await get_role_by_name(db, "teller")
        portfolio_officer_role = await get_role_by_name(db, "portfolio_officer")
        credit_officer_role = await get_role_by_name(db, "credit_officer")
        
        # Define test users (using employee IDs that don't conflict with existing users)
        test_users = [
            {
                "username": "test_admin",
                "email": "test_admin@example.com",
                "first_name": "System",
                "last_name": "Administrator",
                "role": "admin",
                "employee_id": "9001",
                "position": None,
                "role_obj": admin_role
            },
            {
                "username": "test_manager",
                "email": "test_manager@example.com",
                "first_name": "John",
                "last_name": "Manager",
                "role": "manager",
                "employee_id": "9002",
                "position": positions.get("Branch Manager"),
                "role_obj": branch_manager_role
            },
            {
                "username": "test_teller",
                "email": "test_teller@example.com",
                "first_name": "Sarah",
                "last_name": "Teller",
                "role": "officer",
                "employee_id": "9003",
                "position": positions.get("Teller"),
                "role_obj": teller_role
            },
            {
                "username": "test_officer",
                "email": "test_officer@example.com",
                "first_name": "Mike",
                "last_name": "Officer",
                "role": "officer",
                "employee_id": "9004",
                "position": positions.get("Credit Officer"),
                "role_obj": credit_officer_role
            },
            {
                "username": "test_portfolio",
                "email": "test_portfolio@example.com",
                "first_name": "Lisa",
                "last_name": "Portfolio",
                "role": "officer",
                "employee_id": "9005",
                "position": positions.get("Portfolio Officer"),
                "role_obj": portfolio_officer_role
            },
            {
                "username": "test_user1",
                "email": "test_user1@example.com",
                "first_name": "Alice",
                "last_name": "Customer",
                "role": "user",
                "employee_id": "9006",
                "position": None,
                "role_obj": None
            },
            {
                "username": "test_user2",
                "email": "test_user2@example.com",
                "first_name": "Bob",
                "last_name": "Customer",
                "role": "user",
                "employee_id": "9007",
                "position": None,
                "role_obj": None
            }
        ]
        
        # Create test users
        for user_data in test_users:
            query = select(User).where(User.username == user_data["username"])
            result = await db.execute(query)
            existing = result.scalar_one_or_none()
            
            if existing:
                results["users_existing"] += 1
            else:
                await create_test_user(
                    db=db,
                    username=user_data["username"],
                    email=user_data["email"],
                    first_name=user_data["first_name"],
                    last_name=user_data["last_name"],
                    role=user_data["role"],
                    employee_id=user_data["employee_id"],
                    branch=branch,
                    department=department,
                    position=user_data["position"],
                    role_obj=user_data["role_obj"]
                )
                results["users_created"] += 1
        
        # Commit all changes
        await db.commit()
        
        logger.info("Test user seeding completed successfully")
        logger.info(f"Results: {results}")
        
        return results
        
    except Exception as e:
        await db.rollback()
        error_msg = f"Error during test user seeding: {e}"
        logger.error(error_msg)
        results["errors"].append(error_msg)
        raise


async def main():
    """Main function to run test user seeding."""
    try:
        # Create database tables if they don't exist
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created/verified")
        
        # Run seeding
        async with AsyncSessionLocal() as db:
            results = await seed_test_users(db)
        
        # Print summary
        print("\n" + "="*70)
        print("TEST USER SEEDING SUMMARY")
        print("="*70)
        print(f"\n📊 CREATION STATISTICS:")
        print(f"  Users created: {results['users_created']}")
        print(f"  Users existing: {results['users_existing']}")
        print(f"  Total users: {results['users_created'] + results['users_existing']}")
        
        print(f"\n👥 TEST USERS CREATED:")
        print(f"  Default Password: {DEFAULT_PASSWORD}")
        print(f"\n  1. test_admin / test_admin@example.com")
        print(f"     Role: admin | Position: None")
        print(f"     Can: Full system access, manage everything")
        
        print(f"\n  2. test_manager / test_manager@example.com")
        print(f"     Role: manager | Position: Branch Manager")
        print(f"     Can: Approve/reject applications in MANAGER_REVIEW status")
        
        print(f"\n  3. test_teller / test_teller@example.com")
        print(f"     Role: officer | Position: Teller")
        print(f"     Can: Process applications in USER_COMPLETED status")
        
        print(f"\n  4. test_officer / test_officer@example.com")
        print(f"     Role: officer | Position: Credit Officer")
        print(f"     Can: Process applications, manage department-level tasks")
        
        print(f"\n  5. test_portfolio / test_portfolio@example.com")
        print(f"     Role: officer | Position: Portfolio Officer")
        print(f"     Can: Create applications on behalf of customers")
        
        print(f"\n  6. test_user1 / test_user1@example.com")
        print(f"     Role: user | Position: None")
        print(f"     Can: Submit own applications when status is 'draft'")
        
        print(f"\n  7. test_user2 / test_user2@example.com")
        print(f"     Role: user | Position: None")
        print(f"     Can: Submit own applications when status is 'draft'")
        
        print(f"\n📋 WORKFLOW TESTING GUIDE:")
        print(f"\n  Step 1: Login as 'test_user1' and create/submit an application")
        print(f"          - Application moves from 'draft' to 'USER_COMPLETED'")
        
        print(f"\n  Step 2: Login as 'test_teller' and process the application")
        print(f"          - Provide account ID and assign reviewer")
        print(f"          - Application moves to 'MANAGER_REVIEW'")
        
        print(f"\n  Step 3: Login as 'test_manager' and approve/reject")
        print(f"          - Application moves to 'APPROVED' or 'REJECTED'")
        
        print(f"\n  Alternative: Login as 'test_portfolio' to create applications")
        print(f"              for customers (Portfolio Officer workflow)")
        
        print("\n✅ SEEDING SUCCESSFUL - Test users are ready for workflow testing")
        print("="*70)
        
        return True
        
    except Exception as e:
        logger.error(f"Fatal error in main: {e}")
        print(f"\n❌ SEEDING FAILED: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
