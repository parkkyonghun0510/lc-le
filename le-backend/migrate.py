#!/usr/bin/env python3
"""
Database migration script for Railway deployment.
This script can be run separately after the app starts to apply database migrations.
"""

import asyncio
import sys
import os
from sqlalchemy import text
from app.database import engine
from app.core.config import settings

async def check_database_connection():
    """Check if database is available."""
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        print("✓ Database connection successful")
        return True
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return False

async def run_migrations():
    """Run Alembic migrations."""
    try:
        import subprocess
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        if result.returncode == 0:
            print("✓ Database migrations completed successfully")
            print(result.stdout)
            return True
        else:
            print(f"✗ Migration failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ Migration error: {e}")
        return False

async def main():
    """Main migration function."""
    print("Starting database migration process...")
    print(f"Database URL: {settings.DATABASE_URL[:50]}...")
    
    # Check database connection first
    if not await check_database_connection():
        print("Waiting for database to be available...")
        for i in range(30):  # Wait up to 5 minutes
            await asyncio.sleep(10)
            if await check_database_connection():
                break
            print(f"Retry {i+1}/30: Database not ready yet...")
        else:
            print("Database connection timeout. Exiting.")
            sys.exit(1)
    
    # Run migrations
    if await run_migrations():
        print("Migration process completed successfully!")
        sys.exit(0)
    else:
        print("Migration process failed!")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())