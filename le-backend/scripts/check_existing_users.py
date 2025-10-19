#!/usr/bin/env python3
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        result = await db.execute(text('SELECT username, email, employee_id, role FROM users ORDER BY employee_id'))
        print('\nExisting users:')
        print('-' * 80)
        for row in result:
            print(f'  {row[0]:15} | {row[1]:30} | {row[2] or "None":10} | {row[3]}')
        print('-' * 80)

asyncio.run(check())
