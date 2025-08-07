import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, func

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models import Department, Branch, User, Setting, Position, CustomerApplication, File
from app.core.config import settings

async def verify_data():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    AsyncSessionLocal = async_sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with AsyncSessionLocal() as session:
        print("Verifying seeded data counts:")

        # Verify Departments
        department_count = await session.scalar(select(func.count(Department.id)))
        print(f"Departments: {department_count} (Expected: 5)")

        # Verify Branches
        branch_count = await session.scalar(select(func.count(Branch.id)))
        print(f"Branches: {branch_count} (Expected: 3)")

        # Verify Positions
        position_count = await session.scalar(select(func.count(Position.id)))
        print(f"Positions: {position_count} (Expected: 5)")

        # Verify Users
        user_count = await session.scalar(select(func.count(User.id)))
        print(f"Users: {user_count} (Expected: 10)")

        # Verify Settings
        setting_count = await session.scalar(select(func.count(Setting.id)))
        print(f"Settings: {setting_count} (Expected: 5)")

        # Verify CustomerApplications
        application_count = await session.scalar(select(func.count(CustomerApplication.id)))
        print(f"CustomerApplications: {application_count} (Expected: 20)")

        # Verify Files
        file_count = await session.scalar(select(func.count(File.id)))
        print(f"Files: {file_count} (Expected: 30)")

        print("\nVerifying a few records for content (optional, uncomment to enable):")
        # Example: Fetch and print a sample user
        # sample_user = (await session.execute(select(User).limit(1))).scalar_one_or_none()
        # if sample_user:
        #     print(f"\nSample User: {sample_user.username}, {sample_user.email}, Role: {sample_user.role}")

        # Example: Fetch and print a sample application
        # sample_application = (await session.execute(select(CustomerApplication).limit(1))).scalar_one_or_none()
        # if sample_application:
        #     print(f"Sample Application: {sample_application.full_name_latin}, Status: {sample_application.status}, Amount: {sample_application.requested_amount}")

if __name__ == "__main__":
    asyncio.run(verify_data())