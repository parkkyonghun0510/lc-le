#!/usr/bin/env python3
"""
Script to check account_id values in customer applications
"""

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import engine
from app.models import CustomerApplication

async def check_account_ids():
    """Check account_id values in the database"""
    async with AsyncSession(engine) as db:
        # Get first 10 applications with their account_id values
        result = await db.execute(
            select(CustomerApplication.id, CustomerApplication.account_id)
            .limit(10)
        )
        applications = result.fetchall()
        
        print("Sample account_id values:")
        print("-" * 50)
        for app_id, account_id in applications:
            print(f"ID: {app_id}")
            print(f"account_id: {account_id}")
            print(f"type: {type(account_id)}")
            if account_id:
                print(f"length: {len(str(account_id))}")
                print(f"is_uuid_format: {len(str(account_id)) == 36 and '-' in str(account_id)}")
            print("-" * 30)

if __name__ == "__main__":
    asyncio.run(check_account_ids())