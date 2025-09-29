#!/usr/bin/env python3
"""Deployment validation script for Railway"""

import os
import sys
import asyncio
from app.core.config import settings
from app.core.database_health import check_database_health

async def validate_deployment():
    """Validate that all required services are available for deployment"""

    print("🔍 Validating deployment configuration...")

    issues = []

    # Check database connection
    try:
        db_health = await check_database_health()
        if db_health["status"] != "healthy":
            issues.append(f"❌ Database connection failed: {db_health.get('error')}")
        else:
            print("✅ Database connection: OK")
    except Exception as e:
        issues.append(f"❌ Database connection check failed: {e}")

    # Check Redis connection (if configured)
    if hasattr(settings, 'REDIS_URL') and settings.REDIS_URL:
        try:
            import redis
            redis_client = redis.from_url(settings.REDIS_URL)
            redis_client.ping()
            print("✅ Redis connection: OK")
        except Exception as e:
            issues.append(f"❌ Redis connection failed: {e}")

    # Check MinIO connection (if configured)
    if hasattr(settings, 'MINIO_ENDPOINT') and settings.MINIO_ENDPOINT:
        try:
            from minio import Minio
            minio_client = Minio(
                settings.MINIO_ENDPOINT.replace("https://", "").replace("http://", ""),
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_SECURE
            )
            minio_client.list_buckets()
            print("✅ MinIO connection: OK")
        except Exception as e:
            issues.append(f"❌ MinIO connection failed: {e}")

    # Check CORS configuration
    if not settings.ALLOWED_ORIGINS:
        issues.append("❌ CORS origins not configured")
    else:
        print(f"✅ CORS origins: {len(settings.ALLOWED_ORIGINS)} configured")

    # Check authentication configuration
    if not settings.SECRET_KEY:
        issues.append("❌ SECRET_KEY not configured")
    else:
        print("✅ Authentication: OK")

    if issues:
        print("\n❌ Deployment validation failed:")
        for issue in issues:
            print(f"  {issue}")
        return False
    else:
        print("\n✅ All deployment checks passed!")
        return True

if __name__ == "__main__":
    success = asyncio.run(validate_deployment())
    sys.exit(0 if success else 1)
