#!/usr/bin/env python3
"""
Test script to verify the dashboard recent-applications endpoint
with today_only filter functionality
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"  # Adjust as needed
API_ENDPOINT = f"{BASE_URL}/api/v1/dashboard/recent-applications"

def test_recent_applications():
    """Test the recent applications endpoint with different parameters"""
    
    print("Testing Dashboard Recent Applications Endpoint")
    print("=" * 50)
    
    # Test cases
    test_cases = [
        {
            "name": "Default (today only)",
            "params": {},
            "description": "Should return only today's applications by default"
        },
        {
            "name": "Today only explicitly true",
            "params": {"today_only": True},
            "description": "Should return only today's applications"
        },
        {
            "name": "All applications",
            "params": {"today_only": False},
            "description": "Should return all recent applications"
        },
        {
            "name": "Today only with limit",
            "params": {"today_only": True, "limit": 5},
            "description": "Should return max 5 today's applications"
        }
    ]
    
    # Note: You'll need to add authentication headers if required
    headers = {
        "Content-Type": "application/json",
        # "Authorization": "Bearer YOUR_TOKEN_HERE"  # Add if needed
    }
    
    for test_case in test_cases:
        print(f"\n{test_case['name']}:")
        print(f"Description: {test_case['description']}")
        print(f"Parameters: {test_case['params']}")
        
        try:
            response = requests.get(
                API_ENDPOINT,
                params=test_case['params'],
                headers=headers,
                timeout=10
            )
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Number of applications returned: {len(data)}")
                
                if data:
                    # Show first application details
                    first_app = data[0]
                    created_at = first_app.get('created_at', 'N/A')
                    print(f"First application created at: {created_at}")
                    print(f"Application ID: {first_app.get('id', 'N/A')}")
                    print(f"Status: {first_app.get('status', 'N/A')}")
                else:
                    print("No applications found")
            else:
                print(f"Error: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
        
        print("-" * 30)

if __name__ == "__main__":
    test_recent_applications()