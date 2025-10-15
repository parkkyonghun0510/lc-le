#!/usr/bin/env python3
"""
Test script to verify the loan amount validation fix
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"  # Adjust as needed
API_ENDPOINT = f"{BASE_URL}/api/v1/applications/"

def test_loan_amount_validation():
    """Test the loan amount validation with different scenarios"""
    
    print("Testing Loan Amount Validation")
    print("=" * 40)
    
    # Test cases
    test_cases = [
        {
            "name": "Valid loan amount",
            "data": {
                "id_number": "123456789",
                "full_name_latin": "John Doe",
                "requested_amount": 5000.0,
                "product_type": "personal_loan",
                "loan_purposes": ["business"]
            },
            "expected_status": 201,
            "description": "Should succeed with valid loan amount"
        },
        {
            "name": "Zero loan amount",
            "data": {
                "id_number": "123456789",
                "full_name_latin": "John Doe", 
                "requested_amount": 0.0,
                "product_type": "personal_loan",
                "loan_purposes": ["business"]
            },
            "expected_status": 400,
            "description": "Should fail with zero loan amount"
        },
        {
            "name": "Negative loan amount",
            "data": {
                "id_number": "123456789",
                "full_name_latin": "John Doe",
                "requested_amount": -1000.0,
                "product_type": "personal_loan", 
                "loan_purposes": ["business"]
            },
            "expected_status": 400,
            "description": "Should fail with negative loan amount"
        },
        {
            "name": "Missing loan amount (None)",
            "data": {
                "id_number": "123456789",
                "full_name_latin": "John Doe",
                "product_type": "personal_loan",
                "loan_purposes": ["business"]
                # requested_amount is missing
            },
            "expected_status": 422,  # Pydantic validation error
            "description": "Should fail with missing loan amount"
        }
    ]
    
    headers = {
        "Content-Type": "application/json",
        # "Authorization": "Bearer YOUR_TOKEN_HERE"  # Add if needed
    }
    
    for test_case in test_cases:
        print(f"\n{test_case['name']}:")
        print(f"Description: {test_case['description']}")
        print(f"Data: {json.dumps(test_case['data'], indent=2)}")
        
        try:
            response = requests.post(
                API_ENDPOINT,
                json=test_case['data'],
                headers=headers,
                timeout=10
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Expected: {test_case['expected_status']}")
            
            if response.status_code == test_case['expected_status']:
                print("✅ Test PASSED")
            else:
                print("❌ Test FAILED")
            
            # Show response details
            try:
                response_data = response.json()
                if response.status_code >= 400:
                    print(f"Error: {response_data.get('detail', 'Unknown error')}")
                else:
                    print(f"Success: Application ID {response_data.get('id', 'N/A')}")
            except:
                print(f"Response text: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
        
        print("-" * 30)

if __name__ == "__main__":
    test_loan_amount_validation()