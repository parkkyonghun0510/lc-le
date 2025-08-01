#!/usr/bin/env python3
"""
Complete settings verification and configuration check
"""
import asyncio
import sys
import os
import json
from datetime import datetime
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import AsyncSessionLocal, engine
from app.models import Setting, User
from app.core.config import settings as app_settings
from sqlalchemy.future import select
from sqlalchemy import text

async def verify_complete_settings():
    """Comprehensive settings verification"""
    print("🔧 Complete Settings Configuration Verification")
    print("=" * 60)
    
    issues = []
    
    try:
        # 1. Database Connection Test
        print("\n1️⃣ Database Connection Test")
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT version()"))
            db_version = result.scalar()
            print(f"✅ Database connected: {db_version[:50]}...")
        
        # 2. Settings Table Structure
        print("\n2️⃣ Settings Table Structure")
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'settings' 
                ORDER BY ordinal_position;
            """))
            columns = result.fetchall()
            
            expected_columns = ['id', 'key', 'value', 'category', 'description', 'is_public', 'created_at', 'updated_at', 'created_by', 'updated_by']
            actual_columns = [col[0] for col in columns]
            
            print(f"✅ Settings table has {len(columns)} columns")
            for col in columns:
                print(f"   - {col[0]}: {col[1]} ({'nullable' if col[2] == 'YES' else 'not null'})")
            
            missing_columns = set(expected_columns) - set(actual_columns)
            if missing_columns:
                issues.append(f"Missing columns in settings table: {missing_columns}")
            
        # 3. Settings Data Analysis
        print("\n3️⃣ Settings Data Analysis")
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Setting))
            all_settings = result.scalars().all()
            
            print(f"📊 Total settings: {len(all_settings)}")
            
            # Group by category
            categories = {}
            for setting in all_settings:
                if setting.category not in categories:
                    categories[setting.category] = []
                categories[setting.category].append(setting)
            
            print("📋 Settings by category:")
            for category, settings_list in categories.items():
                public_count = sum(1 for s in settings_list if s.is_public)
                private_count = len(settings_list) - public_count
                print(f"   - {category}: {len(settings_list)} total ({public_count} public, {private_count} private)")
            
            # Check for required settings
            required_settings = [
                'app_name', 'company_name', 'default_language', 'timezone',
                'password_min_length', 'session_timeout_minutes', 'default_user_role'
            ]
            
            existing_keys = [s.key for s in all_settings]
            missing_required = set(required_settings) - set(existing_keys)
            
            if missing_required:
                issues.append(f"Missing required settings: {missing_required}")
            else:
                print("✅ All required settings present")
        
        # 4. Admin User Check
        print("\n4️⃣ Admin User Verification")
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(User).where(User.role == 'admin'))
            admin_users = result.scalars().all()
            
            if admin_users:
                print(f"✅ Found {len(admin_users)} admin user(s)")
                for admin in admin_users:
                    print(f"   - {admin.username} ({admin.email})")
            else:
                issues.append("No admin users found - settings management requires admin access")
        
        # 5. Configuration Consistency
        print("\n5️⃣ Configuration Consistency Check")
        
        # Check environment variables
        config_checks = [
            ("DATABASE_URL", app_settings.DATABASE_URL),
            ("SECRET_KEY", app_settings.SECRET_KEY),
            ("HOST", app_settings.HOST),
            ("PORT", app_settings.PORT),
            ("DEBUG", app_settings.DEBUG),
        ]
        
        for key, value in config_checks:
            if value:
                print(f"✅ {key}: {'***' if 'SECRET' in key or 'PASSWORD' in key else str(value)}")
            else:
                issues.append(f"Missing configuration: {key}")
        
        # 6. API Endpoints Test
        print("\n6️⃣ Settings API Endpoints")
        print("📡 Available endpoints:")
        endpoints = [
            "GET /api/v1/settings - Get all settings",
            "GET /api/v1/settings/categories - Get categories",
            "GET /api/v1/settings/{key} - Get specific setting",
            "POST /api/v1/settings - Create setting (admin)",
            "PUT /api/v1/settings/{key} - Update setting (admin)",
            "PATCH /api/v1/settings/bulk - Bulk update (admin)",
            "DELETE /api/v1/settings/{key} - Delete setting (admin)",
            "POST /api/v1/settings/initialize - Initialize defaults (admin)"
        ]
        
        for endpoint in endpoints:
            print(f"   - {endpoint}")
        
        # 7. Frontend Configuration
        print("\n7️⃣ Frontend Configuration")
        try:
            with open('lc-workflow-frontend/.env', 'r') as f:
                frontend_env = f.read()
                
            if 'NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1/' in frontend_env:
                print("✅ Frontend API URL configured for local development")
            elif 'railway.app' in frontend_env:
                print("✅ Frontend API URL configured for Railway production")
            else:
                issues.append("Frontend API URL configuration unclear")
                
        except FileNotFoundError:
            issues.append("Frontend .env file not found")
        
        # 8. Security Settings Check
        print("\n8️⃣ Security Configuration")
        async with AsyncSessionLocal() as session:
            security_settings = await session.execute(
                select(Setting).where(Setting.category == 'security')
            )
            security_list = security_settings.scalars().all()
            
            if security_list:
                print(f"✅ Found {len(security_list)} security settings")
                for setting in security_list:
                    if not setting.is_public:
                        print(f"   - {setting.key}: {'***' if 'password' in setting.key.lower() else setting.value}")
            else:
                issues.append("No security settings found")
        
    except Exception as e:
        issues.append(f"Verification error: {str(e)}")
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 VERIFICATION SUMMARY")
    print("=" * 60)
    
    if not issues:
        print("🎉 ALL CHECKS PASSED!")
        print("\n✅ Your settings configuration is complete and working correctly.")
        print("\n🚀 Ready to use:")
        print("   1. Backend: uvicorn app.main:app --reload --port 8000")
        print("   2. Frontend: cd lc-workflow-frontend && npm run dev")
        print("   3. Settings UI: http://localhost:3000/settings")
        
    else:
        print(f"⚠️  Found {len(issues)} issues that need attention:")
        for i, issue in enumerate(issues, 1):
            print(f"   {i}. {issue}")
        
        print("\n🔧 Recommended actions:")
        if "No admin users found" in str(issues):
            print("   - Create an admin user first")
        if "Missing required settings" in str(issues):
            print("   - Run: POST /api/v1/settings/initialize to create defaults")
        if "Frontend" in str(issues):
            print("   - Check frontend .env configuration")
    
    return len(issues) == 0

async def main():
    """Main verification function"""
    success = await verify_complete_settings()
    
    print(f"\n{'✅ VERIFICATION COMPLETE' if success else '❌ ISSUES FOUND'}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    asyncio.run(main())