#!/usr/bin/env python3
import asyncio
from app.database import engine
from sqlalchemy import text

async def check_schema():
    """Check the actual schema of key tables."""

    async with engine.connect() as conn:
        print("=== CHECKING TABLE SCHEMAS ===")

        # Check users table
        result = await conn.execute(text("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        """))
        print("Users table schema:")
        for row in result:
            print(f"  {row[0]}: {row[1]} (nullable: {row[2]}) {f'default: {row[3]}' if row[3] else ''}")

        # Check customer_applications table
        result = await conn.execute(text("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'customer_applications'
            ORDER BY ordinal_position;
        """))
        print("\nCustomer applications table schema:")
        for row in result:
            print(f"  {row[0]}: {row[1]} (nullable: {row[2]}) {f'default: {row[3]}' if row[3] else ''}")

        # Check files table
        result = await conn.execute(text("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'files'
            ORDER BY ordinal_position;
        """))
        print("\nFiles table schema:")
        for row in result:
            print(f"  {row[0]}: {row[1]} (nullable: {row[2]}) {f'default: {row[3]}' if row[3] else ''}")

if __name__ == "__main__":
    asyncio.run(check_schema())