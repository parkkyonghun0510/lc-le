"""
Quick test script to verify the users endpoint works correctly.
Run this after restarting the backend.
"""
import requests
import json

# Test the users endpoint
url = "http://localhost:8090/api/v1/users/"
params = {
    "search": "0001",
    "size": 10,
    "status": "active"
}

# You'll need to add your auth token here
headers = {
    "Authorization": "Bearer YOUR_TOKEN_HERE"
}

try:
    response = requests.get(url, params=params, headers=headers)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Success! Found {data.get('total', 0)} users")
        print(json.dumps(data, indent=2))
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Request failed: {str(e)}")
