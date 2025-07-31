#!/usr/bin/env python3
"""
Test script to verify the setup flow endpoints work correctly.
This script tests:
1. The /auth/setup-required endpoint
2. The /auth/setup-first-admin endpoint
"""

import requests
import json

def test_setup_flow():
    base_url = "http://localhost:8000"
    
    print("Testing LC Workflow Setup Flow...")
    print("=" * 50)
    
    try:
        # Test 1: Check if setup is required
        print("1. Testing /api/v1/auth/setup-required endpoint...")
        response = requests.get(f"{base_url}/api/v1/auth/setup-required")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ Status: {response.status_code}")
            print(f"   ✓ Setup required: {data.get('setup_required')}")
        else:
            print(f"   ✗ Error: {response.status_code} - {response.text}")
            return False
            
        # Test 2: If setup is required, test first admin creation
        if data.get('setup_required'):
            print("\n2. Testing /auth/setup-first-admin endpoint...")
            admin_data = {
                "username": "admin",
                "email": "admin@example.com",
                "first_name": "System",
                "last_name": "Administrator",
                "password": "admin123"
            }
            
            response = requests.post(
                f"{base_url}/api/v1/auth/setup-first-admin",
                json=admin_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                created_user = response.json()
                print(f"   ✓ Admin user created successfully")
                print(f"   ✓ Username: {created_user.get('username')}")
                print(f"   ✓ Email: {created_user.get('email')}")
                print(f"   ✓ Role: {created_user.get('role')}")
            else:
                print(f"   ✗ Error: {response.status_code} - {response.text}")
                return False
                
            # Test 3: Verify setup is no longer required
            print("\n3. Verifying setup is now complete...")
            response = requests.get(f"{base_url}/api/v1/auth/setup-required")
            if response.status_code == 200:
                data = response.json()
                if not data.get('setup_required'):
                    print("   ✓ Setup completed successfully!")
                else:
                    print("   ✗ Setup still marked as required")
                    return False
            else:
                print(f"   ✗ Error checking setup status: {response.status_code}")
                return False
        else:
            print("   ℹ Setup is already completed, skipping admin creation test")
            
        print("\n" + "=" * 50)
        print("All tests passed! ✓")
        return True
        
    except requests.exceptions.ConnectionError:
        print("   ✗ Error: Cannot connect to the server. Make sure it's running on localhost:8000")
        return False
    except Exception as e:
        print(f"   ✗ Unexpected error: {str(e)}")
        return False

if __name__ == "__main__":
    test_setup_flow()