#!/usr/bin/env python3
"""
MINIO Production Debugging Script
This script helps diagnose MINIO-related issues in production environments.
"""

import os
import sys
import asyncio
from urllib.parse import urlparse
import httpx
import json
from typing import Dict, Any

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.services.minio_service import MinIOService
from minio import Minio
from minio.error import S3Error

class MinioDebugger:
    def __init__(self):
        self.results = []
        
    def log(self, message: str, status: str = "INFO"):
        """Log message with status"""
        print(f"[{status}] {message}")
        self.results.append({"message": message, "status": status})
        
    async def check_environment_variables(self):
        """Check all MINIO-related environment variables"""
        self.log("=== Checking Environment Variables ===")
        
        # Check Railway-specific variables
        railway_vars = [
            'MINIO_PRIVATE_ENDPOINT',
            'MINIO_ROOT_USER', 
            'MINIO_ROOT_PASSWORD',
            'MINIO_BUCKET_NAME'
        ]
        
        for var in railway_vars:
            value = os.getenv(var)
            if value:
                self.log(f"{var}: {value[:20]}..." if len(str(value)) > 20 else f"{var}: {value}")
            else:
                self.log(f"{var}: NOT SET", "WARNING")
                
        # Check MINIO variables
        minio_vars = [
            'MINIO_ENDPOINT',
            'MINIO_ACCESS_KEY',
            'MINIO_SECRET_KEY',
            'MINIO_SECURE',
            'MINIO_BUCKET_NAME'
        ]
        
        for var in minio_vars:
            value = getattr(settings, var, None)
            if value:
                self.log(f"settings.{var}: {value}")
            else:
                self.log(f"settings.{var}: NOT SET", "WARNING")
                
        # Check S3 compatibility variables
        s3_vars = [
            'S3_ENDPOINT',
            'S3_ACCESS_KEY',
            'S3_SECRET_KEY',
            'S3_BUCKET_NAME',
            'S3_USE_SSL'
        ]
        
        for var in s3_vars:
            value = getattr(settings, var, None)
            if value:
                self.log(f"settings.{var}: {value}")
            else:
                self.log(f"settings.{var}: NOT SET", "WARNING")
                
    def check_endpoint_format(self):
        """Check if MINIO endpoint format is correct"""
        self.log("=== Checking Endpoint Format ===")
        
        endpoint = settings.MINIO_ENDPOINT or settings.S3_ENDPOINT
        if not endpoint:
            self.log("No MINIO endpoint configured", "ERROR")
            return
            
        self.log(f"Endpoint: {endpoint}")
        
        try:
            parsed = urlparse(endpoint)
            self.log(f"Scheme: {parsed.scheme}")
            self.log(f"Hostname: {parsed.hostname}")
            self.log(f"Port: {parsed.port}")
            self.log(f"Path: {parsed.path}")
            
            if parsed.scheme not in ['http', 'https']:
                self.log(f"Invalid scheme: {parsed.scheme}", "ERROR")
                
            if not parsed.hostname:
                self.log("Missing hostname in endpoint", "ERROR")
                
        except Exception as e:
            self.log(f"Error parsing endpoint: {e}", "ERROR")
            
    async def test_minio_connection(self):
        """Test direct connection to MINIO"""
        self.log("=== Testing MinIO Connection ===")
        
        try:
            # Create a new MinIO client with current settings
            endpoint = settings.MINIO_ENDPOINT or settings.S3_ENDPOINT
            access_key = settings.MINIO_ACCESS_KEY or settings.S3_ACCESS_KEY
            secret_key = settings.MINIO_SECRET_KEY or settings.S3_SECRET_KEY
            
            if not all([endpoint, access_key, secret_key]):
                self.log("Missing credentials for MinIO connection", "ERROR")
                return
                
            # Parse endpoint properly
            parsed = urlparse(endpoint)
            minio_endpoint = parsed.hostname
            if parsed.port:
                minio_endpoint = f"{minio_endpoint}:{parsed.port}"
            secure = parsed.scheme == 'https'
            
            client = Minio(
                endpoint=minio_endpoint,
                access_key=access_key,
                secret_key=secret_key,
                secure=secure
            )
            
            # Test bucket existence
            bucket_name = settings.MINIO_BUCKET_NAME or settings.S3_BUCKET_NAME
            if not bucket_name:
                self.log("No bucket name configured", "ERROR")
                return
                
            self.log(f"Testing bucket: {bucket_name}")
            
            exists = client.bucket_exists(bucket_name)
            if exists:
                self.log(f"Bucket '{bucket_name}' exists", "SUCCESS")
            else:
                self.log(f"Bucket '{bucket_name}' does not exist", "ERROR")
                
            # Test listing objects
            try:
                objects = list(client.list_objects(bucket_name))
                self.log(f"Found {len(objects)} objects in bucket", "SUCCESS")
                for obj in objects[:3]:  # Show first 3
                    self.log(f"  - {obj.object_name} ({obj.size} bytes)")
            except Exception as e:
                self.log(f"Error listing objects: {e}", "ERROR")
                
        except Exception as e:
            self.log(f"MinIO connection failed: {e}", "ERROR")
            
    def check_minio_service_initialization(self):
        """Check MinIOService initialization"""
        self.log("=== Checking MinIOService Initialization ===")
        
        try:
            from app.services.minio_service import minio_service
            
            if minio_service.enabled:
                self.log("MinIOService is enabled", "SUCCESS")
                self.log(f"Bucket name: {minio_service.bucket_name}")
            else:
                self.log("MinIOService is disabled", "WARNING")
                
        except Exception as e:
            self.log(f"MinIOService initialization error: {e}", "ERROR")
            
    async def test_file_listing_api(self):
        """Test the file listing API endpoint"""
        self.log("=== Testing File Listing API ===")
        
        try:
            # We'll simulate the file listing query
            from sqlalchemy import select, func
            from sqlalchemy.ext.asyncio import AsyncSession
            from app.database import get_db
            from app.models import File
            
            async for db in get_db():
                # Test database query
                count_query = select(func.count()).select_from(File)
                total_result = await db.execute(count_query)
                total = total_result.scalar_one() or 0
                
                self.log(f"Total files in database: {total}")
                
                # Test basic file query
                query = select(File).limit(5)
                result = await db.execute(query)
                files = result.scalars().all()
                
                self.log(f"Retrieved {len(files)} files from database", "SUCCESS")
                
                if files:
                    for file in files[:3]:
                        self.log(f"  - {file.original_filename} -> {file.file_path}")
                break
                        
        except Exception as e:
            self.log(f"Database query error: {e}", "ERROR")
            
    def generate_report(self):
        """Generate a summary report"""
        self.log("=== DIAGNOSTIC REPORT ===")
        
        errors = [r for r in self.results if r["status"] == "ERROR"]
        warnings = [r for r in self.results if r["status"] == "WARNING"]
        successes = [r for r in self.results if r["status"] == "SUCCESS"]
        
        self.log(f"Total Errors: {len(errors)}")
        self.log(f"Total Warnings: {len(warnings)}")
        self.log(f"Total Successes: {len(successes)}")
        
        if errors:
            self.log("\nCRITICAL ISSUES:", "ERROR")
            for error in errors:
                self.log(f"  - {error['message']}", "ERROR")
                
        if warnings:
            self.log("\nWARNINGS:", "WARNING")
            for warning in warnings:
                self.log(f"  - {warning['message']}", "WARNING")
                
        return len(errors) == 0

async def main():
    """Main debugging function"""
    debugger = MinioDebugger()
    
    print("🐛 MINIO Production Debugging Script")
    print("=" * 50)
    
    # Run all checks
    await debugger.check_environment_variables()
    debugger.check_endpoint_format()
    debugger.check_minio_service_initialization()
    await debugger.test_minio_connection()
    await debugger.test_file_listing_api()
    
    # Generate report
    success = debugger.generate_report()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ All checks passed! MINIO should be working correctly.")
    else:
        print("❌ Found issues. Please review the error messages above.")
        
    return success

if __name__ == "__main__":
    asyncio.run(main())