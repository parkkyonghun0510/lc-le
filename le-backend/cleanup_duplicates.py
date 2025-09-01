#!/usr/bin/env python3
"""
Script to clean up duplicate records before applying unique constraints.
This script identifies and removes duplicate records in customer_applications table.
"""

import asyncio
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

async def cleanup_duplicates():
    """Clean up duplicate records in customer_applications table."""
    
    # Create async engine
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        print("Checking for duplicate records...")
        
        # Find duplicate (id_number, id_card_type) combinations
        duplicate_id_query = text("""
            SELECT id_number, id_card_type, COUNT(*) as count, 
                   array_agg(id ORDER BY created_at DESC) as ids
            FROM customer_applications 
            WHERE id_number IS NOT NULL AND id_card_type IS NOT NULL
            GROUP BY id_number, id_card_type 
            HAVING COUNT(*) > 1
            ORDER BY count DESC
        """)
        
        result = await session.execute(duplicate_id_query)
        duplicate_ids = result.fetchall()
        
        if duplicate_ids:
            print(f"Found {len(duplicate_ids)} duplicate ID combinations:")
            for row in duplicate_ids:
                print(f"  ID: {row.id_number}, Type: {row.id_card_type}, Count: {row.count}")
                print(f"    Record IDs: {row.ids}")
                
                # Keep the most recent record (first in the array), delete others
                ids_to_delete = row.ids[1:]  # All except the first (most recent)
                if ids_to_delete:
                    delete_query = text(
                        "DELETE FROM customer_applications WHERE id = ANY(:ids)"
                    )
                    await session.execute(delete_query, {"ids": ids_to_delete})
                    print(f"    Deleted {len(ids_to_delete)} duplicate records")
        else:
            print("No duplicate ID combinations found.")
        
        # Find duplicate phone numbers
        duplicate_phone_query = text("""
            SELECT phone, COUNT(*) as count, 
                   array_agg(id ORDER BY created_at DESC) as ids
            FROM customer_applications 
            WHERE phone IS NOT NULL
            GROUP BY phone 
            HAVING COUNT(*) > 1
            ORDER BY count DESC
        """)
        
        result = await session.execute(duplicate_phone_query)
        duplicate_phones = result.fetchall()
        
        if duplicate_phones:
            print(f"\nFound {len(duplicate_phones)} duplicate phone numbers:")
            for row in duplicate_phones:
                print(f"  Phone: {row.phone}, Count: {row.count}")
                print(f"    Record IDs: {row.ids}")
                
                # Keep the most recent record (first in the array), delete others
                ids_to_delete = row.ids[1:]  # All except the first (most recent)
                if ids_to_delete:
                    delete_query = text(
                        "DELETE FROM customer_applications WHERE id = ANY(:ids)"
                    )
                    await session.execute(delete_query, {"ids": ids_to_delete})
                    print(f"    Deleted {len(ids_to_delete)} duplicate records")
        else:
            print("No duplicate phone numbers found.")
        
        # Check for duplicate employee_ids in users table
        duplicate_employee_query = text("""
            SELECT employee_id, COUNT(*) as count, 
                   array_agg(id ORDER BY created_at DESC) as ids
            FROM users 
            WHERE employee_id IS NOT NULL
            GROUP BY employee_id 
            HAVING COUNT(*) > 1
            ORDER BY count DESC
        """)
        
        result = await session.execute(duplicate_employee_query)
        duplicate_employees = result.fetchall()
        
        if duplicate_employees:
            print(f"\nFound {len(duplicate_employees)} duplicate employee IDs:")
            for row in duplicate_employees:
                print(f"  Employee ID: {row.employee_id}, Count: {row.count}")
                print(f"    User IDs: {row.ids}")
                
                # Keep the most recent record (first in the array), delete others
                ids_to_delete = row.ids[1:]  # All except the first (most recent)
                if ids_to_delete:
                    delete_query = text(
                        "DELETE FROM users WHERE id = ANY(:ids)"
                    )
                    await session.execute(delete_query, {"ids": ids_to_delete})
                    print(f"    Deleted {len(ids_to_delete)} duplicate records")
        else:
            print("No duplicate employee IDs found.")
        
        # Commit all changes
        await session.commit()
        print("\nCleanup completed successfully!")
    
    await engine.dispose()

if __name__ == "__main__":
    try:
        asyncio.run(cleanup_duplicates())
    except Exception as e:
        print(f"Error during cleanup: {e}")
        sys.exit(1)