#!/usr/bin/env python3
"""
Script to manually add soft delete columns to the users table.
This is needed when the migration was stamped but not actually applied.
"""

import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def add_soft_delete_columns():
    """Add soft delete columns to users table"""

    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return False

    try:
        engine = create_async_engine(database_url, echo=False)

        async with engine.connect() as conn:
            print("🔧 Adding soft delete columns to users table...")

            # Add is_deleted column
            await conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE
            """))

            # Add deleted_at column
            await conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE
            """))

            # Add deleted_by column
            await conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS deleted_by UUID
            """))

            # Add foreign key constraint for deleted_by
            await conn.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.table_constraints
                        WHERE table_name = 'users' AND constraint_name = 'fk_users_deleted_by'
                    ) THEN
                        ALTER TABLE users
                        ADD CONSTRAINT fk_users_deleted_by
                        FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;
                    END IF;
                END $$;
            """))

            # Add indexes for better query performance
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_users_is_deleted ON users (is_deleted)
            """))

            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_users_deleted_at ON users (deleted_at)
            """))

            await conn.commit()

            print("✅ Soft delete columns added successfully!")
            return True

    except Exception as e:
        print(f"❌ Error adding soft delete columns: {str(e)}")
        return False

async def check_columns():
    """Check if soft delete columns exist"""

    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return False

    try:
        engine = create_async_engine(database_url, echo=False)

        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'users' AND column_name IN ('is_deleted', 'deleted_at', 'deleted_by')
                ORDER BY ordinal_position
            """))

            columns = result.fetchall()

            if not columns:
                print("❌ Soft delete columns not found")
                return False

            print("✅ Soft delete columns found:")
            for col in columns:
                print(f"   - {col[0]}: {col[1]} (nullable: {col[2]})")

            # Check indexes
            index_result = await conn.execute(text("""
                SELECT indexname FROM pg_indexes
                WHERE tablename = 'users' AND indexname LIKE '%is_deleted%'
            """))

            indexes = index_result.fetchall()
            if indexes:
                print("✅ Soft delete indexes found:")
                for index in indexes:
                    print(f"   - {index[0]}")
            else:
                print("⚠️  No soft delete indexes found")

            return True

    except Exception as e:
        print(f"❌ Error checking columns: {str(e)}")
        return False

async def main():
    """Main function"""
    print("🔧 Manual Soft Delete Columns Addition")
    print("=" * 50)

    # Check if columns already exist
    print("🔍 Checking existing columns...")
    columns_exist = await check_columns()

    if columns_exist:
        print("✅ Soft delete columns already exist!")
        return

    print("❌ Soft delete columns missing, adding them...")

    # Add the columns
    success = await add_soft_delete_columns()

    if success:
        print("✅ Verifying columns were added...")
        await check_columns()
        print("🎉 Soft delete columns setup completed!")
    else:
        print("❌ Failed to add soft delete columns")

if __name__ == "__main__":
    asyncio.run(main())