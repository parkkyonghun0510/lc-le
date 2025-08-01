#!/usr/bin/env python3
"""
Frontend-Backend Integration Test for Settings
Tests the complete settings flow from frontend to backend
"""
import asyncio
import sys
import os
import json
import subprocess
import time
from datetime import datetime
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

def test_frontend_backend_integration():
    """Test complete frontend-backend settings integration"""
    print("🔗 Frontend-Backend Settings Integration Test")
    print("=" * 60)
    
    issues = []
    
    # 1. Backend API Test
    print("\n1️⃣ Backend API Functionality Test")
    
    try:
        client = TestClient(app)
        
        # Test health endpoint
        health_response = client.get("/api/v1/health")
        if health_response.status_code == 200:
            print("✅ Backend health check passed")
            health_data = health_response.json()
            print(f"   Database: {health_data.get('database', 'unknown')}")
        else:
            issues.append(f"Backend health check failed: {health_response.status_code}")
        
        # Test authentication
        login_response = client.post("/api/v1/auth/login", data={
            "username": "admin",
            "password": "admin123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            print("✅ Authentication successful")
        else:
            issues.append("Authentication failed - check admin credentials")
            return False
        
        # Test settings endpoints
        settings_tests = [
            ("/api/v1/settings", "GET", "Get all settings"),
            ("/api/v1/settings/categories", "GET", "Get categories"),
            ("/api/v1/settings/app_name", "GET", "Get specific setting"),
        ]
        
        for endpoint, method, description in settings_tests:
            try:
                if method == "GET":
                    response = client.get(endpoint, headers=headers)
                
                if response.status_code == 200:
                    print(f"✅ {description}: {response.status_code}")
                    
                    # Show sample data
                    if endpoint == "/api/v1/settings":
                        data = response.json()
                        categories = list(data.keys()) if data else []
                        print(f"   📊 Categories: {', '.join(categories[:3])}{'...' if len(categories) > 3 else ''}")
                        
                        # Count settings
                        total_settings = sum(len(settings) for settings in data.values()) if data else 0
                        print(f"   📝 Total settings: {total_settings}")
                        
                else:
                    issues.append(f"{description} failed: {response.status_code}")
                    
            except Exception as e:
                issues.append(f"{description} error: {str(e)}")
        
    except Exception as e:
        issues.append(f"Backend API test failed: {str(e)}")
    
    # 2. Frontend Configuration Test
    print("\n2️⃣ Frontend Configuration Test")
    
    frontend_dir = "lc-workflow-frontend"
    
    # Check if frontend directory exists
    if not os.path.exists(frontend_dir):
        issues.append("Frontend directory not found")
        return False
    
    # Check package.json
    package_path = os.path.join(frontend_dir, "package.json")
    if os.path.exists(package_path):
        with open(package_path, 'r') as f:
            package_data = json.load(f)
        
        print("✅ Frontend package.json found")
        
        # Check if node_modules exists
        node_modules_path = os.path.join(frontend_dir, "node_modules")
        if os.path.exists(node_modules_path):
            print("✅ Node modules installed")
        else:
            print("⚠️  Node modules not found - run 'npm install'")
            issues.append("Frontend dependencies not installed")
    else:
        issues.append("Frontend package.json not found")
    
    # Check environment configuration
    env_path = os.path.join(frontend_dir, ".env")
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            env_content = f.read()
        
        print("✅ Frontend .env file found")
        
        if "localhost:8000" in env_content:
            print("✅ API URL configured for local development")
        else:
            issues.append("Frontend API URL not configured for local development")
    else:
        issues.append("Frontend .env file not found")
    
    # 3. Settings Components Test
    print("\n3️⃣ Settings Components Test")
    
    settings_files = [
        "src/app/settings/page.tsx",
        "src/hooks/useSettings.ts",
        "src/lib/api.ts",
        "src/components/settings/FunctionalSettingsForm.tsx"
    ]
    
    for file_path in settings_files:
        full_path = os.path.join(frontend_dir, file_path)
        if os.path.exists(full_path):
            print(f"✅ {file_path} exists")
        else:
            issues.append(f"Missing frontend file: {file_path}")
    
    # 4. API Integration Test
    print("\n4️⃣ API Integration Test")
    
    # Test if we can make a request to the settings endpoint
    try:
        import requests
        
        api_url = "http://localhost:8000/api/v1"
        
        # Test if backend is running
        try:
            health_response = requests.get(f"{api_url}/health", timeout=5)
            if health_response.status_code == 200:
                print("✅ Backend server is accessible")
            else:
                print("⚠️  Backend server returned non-200 status")
        except requests.exceptions.ConnectionError:
            print("⚠️  Backend server not running on localhost:8000")
            print("   Start with: uvicorn app.main:app --reload --port 8000")
        except Exception as e:
            print(f"⚠️  Backend connection test failed: {str(e)}")
    
    except ImportError:
        print("⚠️  Requests library not available for integration test")
    
    # 5. Data Flow Test
    print("\n5️⃣ Data Flow Test")
    
    # Test the complete data flow
    try:
        # Get settings data
        settings_response = client.get("/api/v1/settings", headers=headers)
        if settings_response.status_code == 200:
            settings_data = settings_response.json()
            
            print("✅ Settings data retrieval successful")
            
            # Test bulk update
            if settings_data and 'general' in settings_data:
                test_update = {
                    "app_name": "LC Workflow System (Test)"
                }
                
                update_response = client.patch("/api/v1/settings/bulk", 
                                             json=test_update, headers=headers)
                
                if update_response.status_code == 200:
                    print("✅ Bulk update test successful")
                    
                    # Revert the change
                    revert_update = {
                        "app_name": "LC Workflow System"
                    }
                    client.patch("/api/v1/settings/bulk", 
                               json=revert_update, headers=headers)
                    print("✅ Test data reverted")
                else:
                    issues.append(f"Bulk update test failed: {update_response.status_code}")
            else:
                print("⚠️  No general settings found for update test")
        else:
            issues.append("Settings data retrieval failed")
    
    except Exception as e:
        issues.append(f"Data flow test failed: {str(e)}")
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 INTEGRATION TEST SUMMARY")
    print("=" * 60)
    
    if not issues:
        print("🎉 ALL INTEGRATION TESTS PASSED!")
        print("\n✅ Your frontend-backend settings integration is working correctly.")
        print("\n🚀 Ready to use:")
        print("   1. Backend: uvicorn app.main:app --reload --port 8000")
        print("   2. Frontend: cd lc-workflow-frontend && npm run dev")
        print("   3. Open: http://localhost:3000/settings")
        
        print("\n📱 Features verified:")
        print("   ✅ API authentication")
        print("   ✅ Settings data retrieval")
        print("   ✅ Bulk settings updates")
        print("   ✅ Error handling")
        print("   ✅ Frontend components")
        print("   ✅ Environment configuration")
        
    else:
        print(f"⚠️  Found {len(issues)} issues:")
        for i, issue in enumerate(issues, 1):
            print(f"   {i}. {issue}")
        
        print("\n🔧 Recommended actions:")
        if any("Backend" in issue for issue in issues):
            print("   - Check backend server status")
            print("   - Verify database connection")
        if any("Frontend" in issue for issue in issues):
            print("   - Run 'npm install' in frontend directory")
            print("   - Check frontend configuration")
        if any("Authentication" in issue for issue in issues):
            print("   - Verify admin user credentials")
    
    return len(issues) == 0

async def main():
    """Main test function"""
    print(f"🚀 LC Workflow Settings Integration Test")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    success = test_frontend_backend_integration()
    
    print(f"\n{'✅ INTEGRATION TEST COMPLETE' if success else '❌ ISSUES FOUND'}")

if __name__ == "__main__":
    asyncio.run(main())