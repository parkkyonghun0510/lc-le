#!/usr/bin/env python3
"""
Script to check for admin users in the database.
This script verifies if admin users exist and are active (not soft-deleted).
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.future import select
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Add the app directory to the path so we can import models
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from models import User


async def check_admin_users():
    """Check for admin users in the database"""

    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return False

    try:
        # Create async engine
        engine = create_async_engine(database_url, echo=False)

        # Create session factory
        async_session = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )

        async with async_session() as session:
            print("🔍 Checking for admin users in database...")

            # Query for admin users that are not soft-deleted
            result = await session.execute(
                select(User).where(
                    User.role == 'admin',
                    User.is_deleted == False
                )
            )

            admin_users = result.scalars().all()

            if not admin_users:
                print("❌ No active admin users found in database")
                print("   Users with admin role may be soft-deleted or don't exist")

                # Check if there are any soft-deleted admin users
                deleted_result = await session.execute(
                    select(User).where(
                        User.role == 'admin',
                        User.is_deleted == True
                    )
                )
                deleted_admins = deleted_result.scalars().all()

                if deleted_admins:
                    print(f"⚠️  Found {len(deleted_admins)} soft-deleted admin users:")
                    for admin in deleted_admins:
                        print(f"   - {admin.username} ({admin.email}) - deleted at {admin.deleted_at}")
                else:
                    print("ℹ️  No admin users exist in database at all")

                return False
            else:
                print(f"✅ Found {len(admin_users)} active admin users:")
                for admin in admin_users:
                    print(f"   📧 Email: {admin.email}")
                    print(f"   👤 Username: {admin.username}")
                    print(f"   👨‍💼 Name: {admin.first_name} {admin.last_name}")
                    print(f"   📱 Phone: {admin.phone_number or 'N/A'}")
                    print(f"   🏢 Employee ID: {admin.employee_id or 'N/A'}")
                    print(f"   📅 Created: {admin.created_at}")
                    print(f"   🔐 Status: {admin.status}")
                    print(f"   ✅ Active: {'Yes' if not admin.is_deleted else 'No'}")
                    print("   ─────────────────────────────────")

                    # Check if password hash exists
                    if admin.password_hash:
                        print("   🔑 Password: [HASHED - Cannot display]")
                    else:
                        print("   ⚠️  Password: [NOT SET]")

                    print()

                return True

    except Exception as e:
        print(f"❌ Error connecting to database: {str(e)}")
        return False


async def check_user_table_structure():
    """Check if the user table has the expected structure"""

    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return False

    try:
        engine = create_async_engine(database_url, echo=False)

        async with engine.connect() as conn:
            print("🔍 Checking user table structure...")

            # Check if users table exists and has expected columns
            result = await conn.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'users'
                ORDER BY ordinal_position
            """))

            columns = result.fetchall()

            if not columns:
                print("❌ Users table not found")
                return False

            print(f"✅ Found users table with {len(columns)} columns:")

            expected_columns = {
                'id': 'uuid',
                'username': 'character varying',
                'email': 'character varying',
                'password_hash': 'character varying',
                'first_name': 'character varying',
                'last_name': 'character varying',
                'role': 'character varying',
                'status': 'character varying',
                'is_deleted': 'boolean',
                'deleted_at': 'timestamp with time zone',
                'created_at': 'timestamp with time zone',
                'updated_at': 'timestamp with time zone'
            }

            found_columns = {col[0]: col[1] for col in columns}

            for col_name, expected_type in expected_columns.items():
                if col_name in found_columns:
                    actual_type = found_columns[col_name]
                    status = "✅" if expected_type in actual_type else "⚠️"
                    print(f"   {status} {col_name}: {actual_type}")
                else:
                    print(f"   ❌ {col_name}: NOT FOUND")

            # Check for soft delete index
            index_result = await conn.execute(text("""
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = 'users' AND indexname LIKE '%is_deleted%'
            """))

            indexes = index_result.fetchall()
            if indexes:
                print("✅ Soft delete index found:")
                for index in indexes:
                    print(f"   - {index[0]}: {index[1]}")
            else:
                print("⚠️  No soft delete index found")

            indexes = index_result.fetchall()
            if indexes:
                print("✅ Soft delete index found:")
                for index in indexes:
                    print(f"   - {index[0]}: {index[1]}")
            else:
                print("⚠️  No soft delete index found")

            return True

    except Exception as e:
        print(f"❌ Error checking table structure: {str(e)}")
        return False


async def main():
    """Main function to run all checks"""
    print("🚀 Admin User Database Check")
    print("=" * 50)
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print()

    # Check table structure first
    structure_ok = await check_user_table_structure()
    print()

    if structure_ok:
        # Check for admin users
        admins_exist = await check_admin_users()
        print()

        if admins_exist:
            print("🎉 Admin user check completed successfully!")
            print("✅ Active admin users found in database")
        else:
            print("⚠️  Admin user check completed with issues")
            print("❌ No active admin users found")
    else:
        print("❌ Cannot proceed with admin user check due to table structure issues")


if __name__ == "__main__":
    asyncio.run(main())