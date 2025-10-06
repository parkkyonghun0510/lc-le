#!/usr/bin/env python3
import asyncio
import os
from app.database import engine
from sqlalchemy import text

async def check_portfolio_data():
    """Check Portfolio/Management data integrity and soft delete functionality."""

    # Set database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return False

    try:
        async with engine.connect() as conn:
            print("=== PORTFOLIO/MANAGEMENT DATA INTEGRITY CHECK ===")

            # Check users with portfolio_id and line_manager_id
            result = await conn.execute(text("""
                SELECT COUNT(*) as total_users_with_portfolio
                FROM users
                WHERE portfolio_id IS NOT NULL OR line_manager_id IS NOT NULL
            """))
            portfolio_count = result.scalar()
            print(f"👥 Users with portfolio/line manager assignments: {portfolio_count}")

            # Check for orphaned portfolio references
            result = await conn.execute(text("""
                SELECT COUNT(*) as orphaned_portfolio_refs
                FROM users u1
                LEFT JOIN users u2 ON u1.portfolio_id = u2.id
                WHERE u1.portfolio_id IS NOT NULL AND u2.id IS NULL
            """))
            orphaned_portfolio = result.scalar()
            print(f"⚠️  Orphaned portfolio references: {orphaned_portfolio}")

            # Check for orphaned line manager references
            result = await conn.execute(text("""
                SELECT COUNT(*) as orphaned_manager_refs
                FROM users u1
                LEFT JOIN users u2 ON u1.line_manager_id = u2.id
                WHERE u1.line_manager_id IS NOT NULL AND u2.id IS NULL
            """))
            orphaned_manager = result.scalar()
            print(f"⚠️  Orphaned line manager references: {orphaned_manager}")

            # Check soft delete functionality
            result = await conn.execute(text("""
                SELECT
                    COUNT(*) as total_users,
                    COUNT(*) FILTER (WHERE is_deleted = true) as deleted_users,
                    COUNT(*) FILTER (WHERE is_deleted = false) as active_users,
                    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as users_with_delete_timestamp
                FROM users
            """))
            row = result.fetchone()
            print(f"📊 User Status Summary:")
            print(f"   Total users: {row.total_users}")
            print(f"   Active users: {row.active_users}")
            print(f"   Deleted users: {row.deleted_users}")
            print(f"   Users with delete timestamp: {row.users_with_delete_timestamp}")

            # Check for inconsistent soft delete state
            result = await conn.execute(text("""
                SELECT COUNT(*) as inconsistent_soft_delete
                FROM users
                WHERE (is_deleted = true AND deleted_at IS NULL)
                   OR (is_deleted = false AND deleted_at IS NOT NULL)
            """))
            inconsistent = result.scalar()
            print(f"⚠️  Inconsistent soft delete state: {inconsistent}")

            # Check for users deleted by non-existent users
            result = await conn.execute(text("""
                SELECT COUNT(*) as orphaned_delete_refs
                FROM users u1
                LEFT JOIN users u2 ON u1.deleted_by = u2.id
                WHERE u1.deleted_by IS NOT NULL AND u2.id IS NULL
            """))
            orphaned_delete = result.scalar()
            print(f"⚠️  Orphaned deleted_by references: {orphaned_delete}")

            print("\n=== DETAILED PORTFOLIO ANALYSIS ===")

            # Show sample of portfolio structure
            result = await conn.execute(text("""
                SELECT
                    u1.id,
                    u1.first_name || ' ' || u1.last_name as user_name,
                    u1.role,
                    u2.first_name || ' ' || u2.last_name as portfolio_manager,
                    u3.first_name || ' ' || u3.last_name as line_manager
                FROM users u1
                LEFT JOIN users u2 ON u1.portfolio_id = u2.id
                LEFT JOIN users u3 ON u1.line_manager_id = u3.id
                WHERE u1.portfolio_id IS NOT NULL OR u1.line_manager_id IS NOT NULL
                LIMIT 10
            """))
            portfolio_users = result.fetchall()
            print(f"📋 Sample portfolio assignments (showing {len(portfolio_users)} users):")
            for row in portfolio_users:
                print(f"   {row.user_name} ({row.role}) -> Portfolio: {row.portfolio_manager}, Line Manager: {row.line_manager}")

            return True

    except Exception as e:
        print(f"❌ Error checking portfolio data: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(check_portfolio_data())