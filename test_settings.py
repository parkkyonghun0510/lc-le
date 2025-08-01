#!/usr/bin/env python3
"""
Test script to verify settings functionality
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import AsyncSessionLocal, engine
from app.models import Setting, User
from sqlalchemy.future import select
from sqlalchemy import text

async def test_settings():
    """Test settings functionality"""
    print("🔧 Testing Settings Configuration...")
    
    try:
        # Test database connection
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            print("✅ Database connection successful")
        
        # Test settings table exists
        async with AsyncSessionLocal() as session:
            # Check if settings table exists
            result = await session.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'settings'
                );
            """))
            table_exists = result.scalar()
            
            if table_exists:
                print("✅ Settings table exists")
                
                # Check if any settings exist
                result = await session.execute(select(Setting))
                settings = result.scalars().all()
                print(f"📊 Found {len(settings)} settings in database")
                
                if settings:
                    print("📋 Existing settings:")
                    for setting in settings[:5]:  # Show first 5
                        print(f"   - {setting.key}: {setting.value} ({setting.category})")
                else:
                    print("⚠️  No settings found - you may need to initialize default settings")
                    
            else:
                print("❌ Settings table does not exist")
                
            # Check if users table exists (needed for settings relationships)
            result = await session.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'users'
                );
            """))
            users_table_exists = result.scalar()
            
            if users_table_exists:
                print("✅ Users table exists")
                
                # Check for admin users
                result = await session.execute(select(User).where(User.role == 'admin'))
                admin_users = result.scalars().all()
                print(f"👤 Found {len(admin_users)} admin users")
                
                if not admin_users:
                    print("⚠️  No admin users found - you'll need an admin user to manage settings")
            else:
                print("❌ Users table does not exist")
                
    except Exception as e:
        print(f"❌ Error testing settings: {str(e)}")
        return False
    
    return True

async def main():
    """Main test function"""
    print("🚀 LC Workflow Settings Configuration Check")
    print("=" * 50)
    
    success = await test_settings()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ Settings configuration check completed")
        print("\n📝 Next steps:")
        print("1. Start your backend server: uvicorn app.main:app --reload")
        print("2. Create an admin user if none exists")
        print("3. Initialize default settings via API: POST /api/v1/settings/initialize")
        print("4. Access settings UI at: http://localhost:3000/settings")
    else:
        print("❌ Settings configuration has issues that need to be resolved")

if __name__ == "__main__":
    asyncio.run(main())