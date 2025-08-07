import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def reset_database():
    if not DATABASE_URL:
        print("DATABASE_URL environment variable not set.")
        return

    # Replace postgresql+asyncpg with postgresql for asyncpg.connect
    conn_url = DATABASE_URL.replace("postgresql+asyncpg", "postgresql")

    try:
        conn = await asyncpg.connect(conn_url)
        print("Connected to the database.")

        print("Dropping public schema...")
        await conn.execute("DROP SCHEMA public CASCADE;")
        print("Public schema dropped.")

        print("Creating public schema...")
        await conn.execute("CREATE SCHEMA public;")
        print("Public schema created.")

        await conn.close()
        print("Database reset successfully.")

    except Exception as e:
        print(f"Error resetting database: {e}")

if __name__ == "__main__":
    asyncio.run(reset_database())