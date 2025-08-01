#!/usr/bin/env python3

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db
from app.models import User
from app.schemas import UserUpdate
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

async def test_user_update():
    """Test user update functionality"""
    
    # Get database session
    async for db in get_db():
        try:
            # Find a test user
            result = await db.execute(select(User).limit(1))
            user = result.scalar_one_or_none()
            
            if not user:
                print("No users found in database")
                return
            
            print(f"Found user: {user.username} ({user.email})")
            print(f"Current first_name: {user.first_name}")
            print(f"Current last_name: {user.last_name}")
            print(f"Current role: {user.role}")
            print(f"Current is_active: {user.is_active}")
            
            # Test update data
            update_data = UserUpdate(
                first_name="Updated First",
                last_name="Updated Last",
                role="manager",
                is_active=True
            )
            
            print(f"\nUpdate data: {update_data.dict(exclude_unset=True)}")
            
            # Apply updates
            update_dict = update_data.dict(exclude_unset=True)
            for field, value in update_dict.items():
                setattr(user, field, value)
            
            await db.commit()
            await db.refresh(user)
            
            print(f"\nAfter update:")
            print(f"Updated first_name: {user.first_name}")
            print(f"Updated last_name: {user.last_name}")
            print(f"Updated role: {user.role}")
            print(f"Updated is_active: {user.is_active}")
            
            print("\n✅ User update test completed successfully!")
            
        except Exception as e:
            print(f"❌ Error during user update test: {e}")
            await db.rollback()
        finally:
            await db.close()
            break

if __name__ == "__main__":
    asyncio.run(test_user_update())