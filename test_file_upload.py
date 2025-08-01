#!/usr/bin/env python3
"""
Test script for file upload functionality
"""
import requests
import os
import json
from pathlib import Path

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
TEST_USERNAME = "admin"
TEST_PASSWORD = "admin123"

def login():
    """Login and get access token"""
    login_data = {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    }
    
    response = requests.post(
        f"{API_BASE_URL}/auth/login",
        data=login_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    if response.status_code == 200:
        token_data = response.json()
        return token_data["access_token"]
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def test_file_upload(token):
    """Test file upload"""
    # Create a test file
    test_file_path = "test_upload.txt"
    with open(test_file_path, "w") as f:
        f.write("This is a test file for upload functionality.")
    
    try:
        # Upload file
        headers = {"Authorization": f"Bearer {token}"}
        
        with open(test_file_path, "rb") as f:
            files = {"file": ("test_upload.txt", f, "text/plain")}
            response = requests.post(
                f"{API_BASE_URL}/files/upload",
                files=files,
                headers=headers
            )
        
        if response.status_code == 200:
            file_data = response.json()
            print("✅ File upload successful!")
            print(f"File ID: {file_data['id']}")
            print(f"Original filename: {file_data['original_filename']}")
            print(f"File size: {file_data['file_size']} bytes")
            return file_data["id"]
        else:
            print(f"❌ File upload failed: {response.status_code} - {response.text}")
            return None
    
    finally:
        # Clean up test file
        if os.path.exists(test_file_path):
            os.remove(test_file_path)

def test_file_list(token):
    """Test file listing"""
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{API_BASE_URL}/files/", headers=headers)
    
    if response.status_code == 200:
        files_data = response.json()
        print("✅ File listing successful!")
        print(f"Total files: {files_data['total']}")
        print(f"Files in response: {len(files_data['items'])}")
        return files_data["items"]
    else:
        print(f"❌ File listing failed: {response.status_code} - {response.text}")
        return []

def test_file_download(token, file_id):
    """Test file download"""
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{API_BASE_URL}/files/{file_id}/download", headers=headers)
    
    if response.status_code == 200:
        print("✅ File download successful!")
        print(f"Content length: {len(response.content)} bytes")
        print(f"Content type: {response.headers.get('content-type', 'unknown')}")
        return True
    else:
        print(f"❌ File download failed: {response.status_code} - {response.text}")
        return False

def test_file_delete(token, file_id):
    """Test file deletion"""
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.delete(f"{API_BASE_URL}/files/{file_id}", headers=headers)
    
    if response.status_code == 200:
        print("✅ File deletion successful!")
        return True
    else:
        print(f"❌ File deletion failed: {response.status_code} - {response.text}")
        return False

def main():
    print("🧪 Testing File Management API")
    print("=" * 40)
    
    # Login
    print("1. Testing login...")
    token = login()
    if not token:
        print("❌ Cannot proceed without authentication")
        return
    
    print("✅ Login successful!")
    print()
    
    # Test file upload
    print("2. Testing file upload...")
    file_id = test_file_upload(token)
    if not file_id:
        print("❌ Cannot proceed without successful upload")
        return
    print()
    
    # Test file listing
    print("3. Testing file listing...")
    files = test_file_list(token)
    print()
    
    # Test file download
    print("4. Testing file download...")
    test_file_download(token, file_id)
    print()
    
    # Test file deletion
    print("5. Testing file deletion...")
    test_file_delete(token, file_id)
    print()
    
    print("🎉 All tests completed!")

if __name__ == "__main__":
    main()