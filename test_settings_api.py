#!/usr/bin/env python3
"""
Test settings API endpoints
"""
import asyncio
import sys
import os
import json
from datetime import datetime
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

def test_settings_api():
    """Test settings API endpoints"""
    print("🧪 Testing Settings API Endpoints")
    print("=" * 50)
    
    client = TestClient(app)
    
    # First, we need to login to get a token
    print("\n1️⃣ Authentication Test")
    login_response = client.post("/api/v1/auth/login", data={
        "username": "admin",
        "password": "admin123"  # Default admin password
    })
    
    if login_response.status_code == 200:
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Authentication successful")
    else:
        print(f"❌ Authentication failed: {login_response.status_code}")
        print("   Make sure you have an admin user with username 'admin' and password 'admin123'")
        return False
    
    # Test endpoints
    tests = [
        {
            "name": "Get all settings",
            "method": "GET",
            "url": "/api/v1/settings",
            "expected_status": 200
        },
        {
            "name": "Get setting categories",
            "method": "GET", 
            "url": "/api/v1/settings/categories",
            "expected_status": 200
        },
        {
            "name": "Get specific setting",
            "method": "GET",
            "url": "/api/v1/settings/app_name",
            "expected_status": 200
        },
        {
            "name": "Health check",
            "method": "GET",
            "url": "/api/v1/health",
            "expected_status": 200,
            "no_auth": True
        }
    ]
    
    print("\n2️⃣ API Endpoint Tests")
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            test_headers = {} if test.get("no_auth") else headers
            
            if test["method"] == "GET":
                response = client.get(test["url"], headers=test_headers)
            elif test["method"] == "POST":
                response = client.post(test["url"], headers=test_headers, json=test.get("data", {}))
            
            if response.status_code == test["expected_status"]:
                print(f"✅ {test['name']}: {response.status_code}")
                passed += 1
                
                # Show sample data for some endpoints
                if test["url"] == "/api/v1/settings" and response.status_code == 200:
                    data = response.json()
                    categories = list(data.keys())
                    print(f"   📊 Found categories: {', '.join(categories)}")
                    
                elif test["url"] == "/api/v1/settings/app_name" and response.status_code == 200:
                    data = response.json()
                    print(f"   📝 App name: {data.get('value', 'N/A')}")
                    
            else:
                print(f"❌ {test['name']}: Expected {test['expected_status']}, got {response.status_code}")
                if response.status_code != 404:  # Don't show 404 details
                    print(f"   Response: {response.text[:100]}...")
                    
        except Exception as e:
            print(f"❌ {test['name']}: Error - {str(e)}")
    
    print(f"\n📊 Test Results: {passed}/{total} passed")
    
    if passed == total:
        print("\n🎉 All API tests passed!")
        print("\n🚀 Your settings API is working correctly!")
        print("\nNext steps:")
        print("1. Start the backend: uvicorn app.main:app --reload --port 8000")
        print("2. Start the frontend: cd lc-workflow-frontend && npm run dev")
        print("3. Access settings at: http://localhost:3000/settings")
        return True
    else:
        print(f"\n⚠️  {total - passed} tests failed. Check the errors above.")
        return False

if __name__ == "__main__":
    test_settings_api()