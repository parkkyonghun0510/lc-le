#!/usr/bin/env python3
import asyncio
from app.database import engine
from sqlalchemy import text

async def check_constraints():
    """Check for all constraints and indexes added in the migration."""

    async with engine.connect() as conn:
        print("=== CHECKING CONSTRAINTS ===")

        # Check check constraints
        result = await conn.execute(text("""
            SELECT conname, conrelid::regclass, pg_get_constraintdef(oid)
            FROM pg_constraint
            WHERE conname LIKE 'ck_%'
            ORDER BY conname;
        """))
        constraints = result.fetchall()
        print(f"Found {len(constraints)} check constraints:")
        for row in constraints:
            print(f"  {row[0]}: {row[1]} - {row[2]}")

        print("\n=== CHECKING UNIQUE CONSTRAINTS ===")

        # Check unique constraints
        result = await conn.execute(text("""
            SELECT conname, conrelid::regclass, pg_get_constraintdef(oid)
            FROM pg_constraint
            WHERE conname LIKE 'uq_%'
            ORDER BY conname;
        """))
        unique_constraints = result.fetchall()
        print(f"Found {len(unique_constraints)} unique constraints:")
        for row in unique_constraints:
            print(f"  {row[0]}: {row[1]} - {row[2]}")

        print("\n=== CHECKING INDEXES ===")

        # Check indexes
        result = await conn.execute(text("""
            SELECT indexname, tablename, indexdef
            FROM pg_indexes
            WHERE indexname LIKE 'ix_%'
            ORDER BY indexname;
        """))
        indexes = result.fetchall()
        print(f"Found {len(indexes)} indexes:")
        for row in indexes:
            print(f"  {row[0]}: {row[1]} - {row[2]}")

        print("\n=== VERIFICATION SUMMARY ===")
        expected_constraints = [
            'ck_users_status_valid',
            'ck_customer_applications_status_valid',
            'ck_loan_dates_valid',
            'ck_interest_rate_range',
            'ck_minimum_age',
            'ck_requested_amount_positive',
            'ck_monthly_income_positive',
            'ck_desired_loan_term_positive'
        ]

        expected_unique = [
            'uq_customer_identification',
            'uq_file_paths'
        ]

        expected_indexes = [
            'ix_users_status',
            'ix_customer_applications_status',
            'ix_customer_applications_date_range',
            'ix_customer_applications_identification',
            'ix_files_path'
        ]

        found_constraints = [row[0] for row in constraints]
        found_unique = [row[0] for row in unique_constraints]
        found_indexes = [row[0] for row in indexes]

        print("Expected check constraints:")
        for constraint in expected_constraints:
            status = "✅" if constraint in found_constraints else "❌"
            print(f"  {status} {constraint}")

        print("\nExpected unique constraints:")
        for constraint in expected_unique:
            status = "✅" if constraint in found_unique else "❌"
            print(f"  {status} {constraint}")

        print("\nExpected indexes:")
        for index in expected_indexes:
            status = "✅" if index in found_indexes else "❌"
            print(f"  {status} {index}")

if __name__ == "__main__":
    asyncio.run(check_constraints())