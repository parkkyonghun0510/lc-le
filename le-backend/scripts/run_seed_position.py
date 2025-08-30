import asyncio

from app.database import AsyncSessionLocal
from app.seed_positions import seed_default_position


async def main() -> None:
    async with AsyncSessionLocal() as session:
        # Run the idempotent seeder
        await seed_default_position(session)
        # Commit any changes (safe: no-ops if nothing changed)
        await session.commit()
    print("Seed completed: ensured Position(code=IT_ADMIN) exists and admin user is linked (if present).")


if __name__ == "__main__":
    asyncio.run(main())