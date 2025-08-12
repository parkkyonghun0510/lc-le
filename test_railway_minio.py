#!/usr/bin/env python3
"""
Test script to verify Railway MinIO connection
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test MinIO connection
try:
    from app.services.minio_service import MinIOService
    
    print("Testing Railway MinIO connection...")
    print("=" * 50)
    
    # Create service instance
    service = MinIOService()
    
    print(f"MinIO Service Status: {'✅ ENABLED' if service.enabled else '❌ DISABLED'}")
    print(f"Endpoint: {os.getenv('MINIO_ENDPOINT')}")
    print(f"Bucket: {service.bucket_name}")
    print(f"Secure: {os.getenv('MINIO_SECURE')}")
    
    if service.enabled:
        try:
            # Test bucket existence
            bucket_exists = service.client.bucket_exists(service.bucket_name)
            print(f"Bucket exists: {'✅ YES' if bucket_exists else '❌ NO'}")
            
            # Test file upload capability
            print("\nTesting file upload capability...")
            test_content = b"Hello Railway MinIO!"
            test_filename = "test_connection.txt"
            
            uploaded_name = service.upload_file(test_content, test_filename)
            print(f"✅ Test file uploaded: {uploaded_name}")
            
            # Test presigned URL generation
            download_url = service.get_file_url(uploaded_name, expires=3600)
            print(f"✅ Download URL generated: {download_url[:50]}...")
            
            # Clean up test file
            service.delete_file(uploaded_name)
            print("✅ Test file cleaned up")
            
            print("\n🎉 Railway MinIO connection successful!")
            
        except Exception as e:
            print(f"❌ Connection test failed: {e}")
            
    else:
        print("❌ MinIO service is disabled. Check credentials.")
        
except ImportError as e:
    print(f"❌ Import error: {e}")
except Exception as e:
    print(f"❌ Unexpected error: {e}")

print("\n" + "=" * 50)