#!/usr/bin/env python3
import asyncio
from app.database import engine
from sqlalchemy import text

async def check_tables():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"))
        tables = [row[0] for row in result]
        print("Existing tables:", tables)

if __name__ == "__main__":
    asyncio.run(check_tables())