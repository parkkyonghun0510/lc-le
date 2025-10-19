#!/usr/bin/env python3
"""
Assign Permission System Roles to Existing Users

This script assigns roles from the new permission system to existing users
based on their legacy role field.

Mapping:
- user.role = "admin" → assign "admin" role
- user.role = "manager" → assign "branch_manager" role
- user.role = "officer" → assign "teller" or "credit_officer" role (based on position)
- user.role = "user" → no role assignment (basic user)
"""

import asyncio
import sys
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

# Add the app directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import AsyncSessionLocal
from app.models import User, Position
from app.models.permissions import Role, UserRole

logger = logging.getLogger(__name__)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


async def assign_roles_to_existing_users():
    """Assign permission system roles to existing users based on their legacy role field."""
    
    print("\n" + "="*70)
    print("ASSIGN ROLES TO EXISTING USERS")
    print("="*70)
    
    async with AsyncSessionLocal() as db:
        try:
            # Get all roles from permission system
            roles_query = select(Role)
            roles_result = await db.execute(roles_query)
            roles = {role.name: role for role in roles_result.scalars().all()}
            
            print(f"\n📋 Available roles: {', '.join(roles.keys())}")
            
            # Get all users
            users_query = select(User).where(User.is_deleted == False)
            users_result = await db.execute(users_query)
            users = users_result.scalars().all()
            
            print(f"\n👥 Found {len(users)} users to process")
            print("")
            
            assigned_count = 0
            skipped_count = 0
            
            for user in users:
                # Check if user already has role assignments
                existing_roles_query = select(UserRole).where(UserRole.user_id == user.id)
                existing_roles_result = await db.execute(existing_roles_query)
                existing_roles = existing_roles_result.scalars().all()
                
                if existing_roles:
                    print(f"  ⏭️  {user.username:20} - Already has {len(existing_roles)} role(s)")
                    skipped_count += 1
                    continue
                
                # Determine which role to assign based on legacy role field
                role_to_assign = None
                
                if user.role == "admin":
                    role_to_assign = roles.get("admin")
                elif user.role == "manager":
                    role_to_assign = roles.get("branch_manager")
                elif user.role == "officer":
                    # Check if user has a position
                    if user.position_id:
                        position_query = select(Position).where(Position.id == user.position_id)
                        position_result = await db.execute(position_query)
                        position = position_result.scalar_one_or_none()
                        
                        if position:
                            if "teller" in position.name.lower():
                                role_to_assign = roles.get("teller")
                            elif "portfolio" in position.name.lower():
                                role_to_assign = roles.get("portfolio_officer")
                            elif "credit" in position.name.lower():
                                role_to_assign = roles.get("credit_officer")
                            else:
                                # Default to credit_officer for officers
                                role_to_assign = roles.get("credit_officer")
                        else:
                            # No position, default to credit_officer
                            role_to_assign = roles.get("credit_officer")
                    else:
                        # No position, default to credit_officer
                        role_to_assign = roles.get("credit_officer")
                elif user.role == "user":
                    # Regular users don't need a role assignment
                    print(f"  ⏭️  {user.username:20} - Regular user, no role needed")
                    skipped_count += 1
                    continue
                
                # Assign the role
                if role_to_assign:
                    user_role = UserRole(
                        user_id=user.id,
                        role_id=role_to_assign.id
                    )
                    db.add(user_role)
                    print(f"  ✅ {user.username:20} - Assigned '{role_to_assign.name}' role")
                    assigned_count += 1
                else:
                    print(f"  ⚠️  {user.username:20} - No matching role found for legacy role '{user.role}'")
                    skipped_count += 1
            
            # Commit all changes
            await db.commit()
            
            print("")
            print("="*70)
            print("SUMMARY")
            print("="*70)
            print(f"  ✅ Roles assigned: {assigned_count}")
            print(f"  ⏭️  Skipped: {skipped_count}")
            print(f"  📊 Total processed: {len(users)}")
            print("")
            
            return True
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error assigning roles: {e}")
            print(f"\n❌ Error: {e}")
            return False


async def verify_role_assignments():
    """Verify role assignments for all users."""
    
    print("\n" + "="*70)
    print("VERIFICATION - USER ROLE ASSIGNMENTS")
    print("="*70)
    print("")
    
    async with AsyncSessionLocal() as db:
        try:
            # Get all users with their role assignments
            users_query = select(User).where(User.is_deleted == False)
            users_result = await db.execute(users_query)
            users = users_result.scalars().all()
            
            print(f"{'Username':<20} | {'Legacy Role':<10} | {'Position':<20} | {'Assigned Roles'}")
            print("-" * 90)
            
            for user in users:
                # Get user's role assignments
                roles_query = select(Role).join(UserRole).where(UserRole.user_id == user.id)
                roles_result = await db.execute(roles_query)
                assigned_roles = [role.name for role in roles_result.scalars().all()]
                
                # Get user's position
                position_name = "None"
                if user.position_id:
                    position_query = select(Position).where(Position.id == user.position_id)
                    position_result = await db.execute(position_query)
                    position = position_result.scalar_one_or_none()
                    if position:
                        position_name = position.name
                
                roles_str = ", ".join(assigned_roles) if assigned_roles else "None"
                print(f"{user.username:<20} | {user.role:<10} | {position_name:<20} | {roles_str}")
            
            print("")
            
            return True
            
        except Exception as e:
            logger.error(f"Error verifying roles: {e}")
            print(f"\n❌ Error: {e}")
            return False


async def main():
    """Main function."""
    try:
        # Assign roles
        success = await assign_roles_to_existing_users()
        
        if success:
            # Verify assignments
            await verify_role_assignments()
            
            print("="*70)
            print("✅ ROLE ASSIGNMENT COMPLETE")
            print("="*70)
            print("")
            print("All existing users now have appropriate roles assigned")
            print("from the new permission system based on their legacy role field.")
            print("")
            
            return True
        else:
            return False
        
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        print(f"\n❌ Fatal error: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
