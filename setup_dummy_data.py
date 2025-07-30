#!/usr/bin/env python3
"""
Setup script to populate the database with dummy data for initial setup.
Includes users, branches, departments, and positions.
"""

import asyncio
import sys
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, engine, Base
from app.models import User, Department, Branch, CustomerApplication
from app.core.security import get_password_hash

async def create_dummy_data():
    """Create dummy data for initial setup."""
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async for db in get_db():
        try:
            # Create branches
            branches = [
                Branch(name="Phnom Penh Branch", code="PPB", address="Phnom Penh"),
                Branch(name="Siem Reap Branch", code="SRB", address="Siem Reap"),
                Branch(name="Battambang Branch", code="BTB", address="Battambang"),
                Branch(name="Sihanoukville Branch", code="SVB", address="Sihanoukville")
            ]
            
            for branch in branches:
                existing = await db.execute(select(Branch).where(Branch.code == branch.code))
                if not existing.scalar_one_or_none():
                    db.add(branch)
            await db.commit()
            
            # Create departments
            departments = [
                Department(name="Credit Department", code="CD", description="Handles credit applications"),
                Department(name="Operations Department", code="OD", description="Handles daily operations"),
                Department(name="Risk Department", code="RD", description="Handles risk assessment"),
                Department(name="IT Department", code="IT", description="Handles technology infrastructure"),
                Department(name="Customer Service", code="CS", description="Handles customer relations")
            ]
            
            for dept in departments:
                existing = await db.execute(select(Department).where(Department.code == dept.code))
                if not existing.scalar_one_or_none():
                    db.add(dept)
            await db.commit()
            
            # Get branch and department IDs
            branch_result = await db.execute(select(Branch))
            branch_ids = [b.id for b in branch_result.scalars().all()]
            
            dept_result = await db.execute(select(Department))
            dept_ids = [d.id for d in dept_result.scalars().all()]
            
            # Create users with different roles
            users = [
                User(
                    username="admin",
                    email="admin@lc.com",
                    first_name="System",
                    last_name="Administrator",
                    password_hash=get_password_hash("admin123"),
                    role="admin",
                    branch_id=branch_ids[0] if branch_ids else None,
                    department_id=dept_ids[0] if dept_ids else None,
                    status="active"
                ),
                User(
                    username="manager",
                    email="manager@lc.com",
                    first_name="Branch",
                    last_name="Manager",
                    password_hash=get_password_hash("manager123"),
                    role="manager",
                    branch_id=branch_ids[0] if branch_ids else None,
                    department_id=dept_ids[1] if len(dept_ids) > 1 else None,
                    status="active"
                ),
                User(
                    username="officer1",
                    email="officer1@lc.com",
                    first_name="Credit",
                    last_name="Officer1",
                    password_hash=get_password_hash("officer123"),
                    role="officer",
                    branch_id=branch_ids[0] if branch_ids else None,
                    department_id=dept_ids[0] if dept_ids else None,
                    status="active"
                ),
                User(
                    username="officer2",
                    email="officer2@lc.com",
                    first_name="Credit",
                    last_name="Officer2",
                    password_hash=get_password_hash("officer123"),
                    role="officer",
                    branch_id=branch_ids[1] if len(branch_ids) > 1 else None,
                    department_id=dept_ids[0] if dept_ids else None,
                    status="active"
                ),
                User(
                    username="cs_staff",
                    email="cs@lc.com",
                    first_name="Customer",
                    last_name="Service",
                    password_hash=get_password_hash("cs123"),
                    role="staff",
                    branch_id=branch_ids[0] if branch_ids else None,
                    department_id=dept_ids[4] if len(dept_ids) > 4 else None,
                    status="active"
                )
            ]
            
            for user in users:
                existing = await db.execute(select(User).where(User.username == user.username))
                if not existing.scalar_one_or_none():
                    db.add(user)
            await db.commit()
            
            # Create sample customer applications
            user_result = await db.execute(select(User))
            user_ids = [u.id for u in user_result.scalars().all()]
            
            if user_ids:
                applications = [
                    CustomerApplication(
                        user_id=user_ids[2] if len(user_ids) > 2 else user_ids[0],
                        status="pending",
                        full_name_latin="John Doe",
                        phone="012345678",
                        requested_amount=5000.00,
                        loan_purposes=["Business expansion"],
                        purpose_details="Business expansion loan",
                        product_type="personal"
                    ),
                    CustomerApplication(
                        user_id=user_ids[2] if len(user_ids) > 2 else user_ids[0],
                        status="approved",
                        full_name_latin="Jane Smith",
                        phone="098765432",
                        requested_amount=10000.00,
                        loan_purposes=["Home purchase"],
                        purpose_details="Mortgage loan for home purchase",
                        product_type="mortgage",
                        approved_by=user_ids[1] if len(user_ids) > 1 else user_ids[0]
                    ),
                    CustomerApplication(
                        user_id=user_ids[3] if len(user_ids) > 3 else user_ids[0],
                        status="rejected",
                        full_name_latin="Robert Johnson",
                        phone="011223344",
                        requested_amount=7500.00,
                        loan_purposes=["Vehicle purchase"],
                        purpose_details="Vehicle loan application",
                        product_type="vehicle",
                        rejected_by=user_ids[1] if len(user_ids) > 1 else user_ids[0]
                    )
                ]
                
                for app in applications:
                    existing = await db.execute(
                        select(CustomerApplication).where(
                            CustomerApplication.full_name_latin == app.full_name_latin
                        )
                    )
                    if not existing.scalar_one_or_none():
                        db.add(app)
                await db.commit()
            
            print("✅ Dummy data setup completed successfully!")
            print("\nCreated entities:")
            print(f"- {len(branches)} branches")
            print(f"- {len(departments)} departments")
            print(f"- {len(users)} users")
            print(f"- {len(applications)} customer applications")
            
            print("\nDefault login credentials:")
            print("- Admin: username='admin', password='admin123'")
            print("- Manager: username='manager', password='manager123'")
            print("- Officer: username='officer1', password='officer123'")
            print("- Officer: username='officer2', password='officer123'")
            print("- CS Staff: username='cs_staff', password='cs123'")
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Error creating dummy data: {e}")
            raise e
        finally:
            await db.close()

if __name__ == "__main__":
    asyncio.run(create_dummy_data())