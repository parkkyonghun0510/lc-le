"""
Test script to verify the /auth/me/permissions endpoint
"""
import requests
import json

# Configuration
BASE_URL = "http://localhost:8090/api/v1"
USERNAME = "admin"  # Change this to your test username
PASSWORD = "admin"  # Change this to your test password

def test_me_permissions():
    """Test the /auth/me/permissions endpoint"""
    
    # Step 1: Login to get access token
    print("Step 1: Logging in...")
    login_url = f"{BASE_URL}/auth/login"
    login_data = {
        "username": USERNAME,
        "password": PASSWORD
    }
    
    try:
        login_response = requests.post(login_url, data=login_data)
        login_response.raise_for_status()
        token_data = login_response.json()
        access_token = token_data.get("access_token")
        
        if not access_token:
            print("❌ Failed to get access token")
            return
        
        print(f"✅ Login successful! Token: {access_token[:20]}...")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Login failed: {e}")
        return
    
    # Step 2: Call /auth/me/permissions
    print("\nStep 2: Calling /auth/me/permissions...")
    permissions_url = f"{BASE_URL}/auth/me/permissions"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    try:
        permissions_response = requests.get(permissions_url, headers=headers)
        permissions_response.raise_for_status()
        permissions_data = permissions_response.json()
        
        print("✅ Successfully retrieved permissions!")
        print("\n📊 Response Data:")
        print(json.dumps(permissions_data, indent=2))
        
        # Summary
        print("\n📋 Summary:")
        print(f"  - User ID: {permissions_data.get('user_id')}")
        print(f"  - Roles: {len(permissions_data.get('roles', []))}")
        print(f"  - Direct Permissions: {len(permissions_data.get('direct_permissions', []))}")
        print(f"  - Effective Permissions: {len(permissions_data.get('effective_permissions', []))}")
        
        if permissions_data.get('roles'):
            print("\n  Roles:")
            for role in permissions_data.get('roles', []):
                print(f"    - {role.get('display_name')} ({role.get('name')})")
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            print(f"❌ Endpoint not found (404). The endpoint may not be registered correctly.")
        else:
            print(f"❌ HTTP Error: {e.response.status_code}")
            print(f"   Response: {e.response.text}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("Testing /auth/me/permissions endpoint")
    print("=" * 60)
    test_me_permissions()
    print("\n" + "=" * 60)
