#!/usr/bin/env python3
"""
Comprehensive Upload Parameters Testing Script
Tests the /files/upload endpoint parameter handling, UUID validation, and form data processing.
"""

import asyncio
import aiohttp
import json
import os
import uuid
import sys
from typing import Dict, Any, Optional
import io

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

class UploadParameterTester:
    def __init__(self):
        self.base_url = None
        self.session = None
        self.results = []
        self.access_token = None
        self.test_uuids = {
            'valid_app': str(uuid.uuid4()),
            'valid_folder': str(uuid.uuid4()),
            'invalid_uuid': 'not-a-uuid',
            'malformed_uuid': '123e4567-e89b-12d3-a456',  # Too short
        }

    def log(self, message: str, status: str = "INFO"):
        """Log message with status"""
        print(f"[{status}] {message}")
        self.results.append({"message": message, "status": status})

    async def setup(self):
        """Setup async session"""
        self.session = aiohttp.ClientSession()

        # Determine base URL - use port 8090 where the backend is actually running
        api_url = os.getenv('NEXT_PUBLIC_API_URL') or 'http://localhost:8090'
        if api_url.endswith('/'):
            api_url = api_url.rstrip('/')
        self.base_url = api_url
        self.log(f"Using base URL: {self.base_url}")

        # Authenticate and get token
        await self.authenticate()

    async def authenticate(self):
        """Authenticate with the backend and get access token"""
        try:
            url = f"{self.base_url}/api/v1/auth/login"
            self.log(f"Authenticating with {url}")

            data = {
                'username': 'admin',
                'password': '12345678'
            }

            headers = {}
            if self.access_token:
                headers['Authorization'] = f'Bearer {self.access_token}'

            async with self.session.post(url, data=data, headers=headers) as response:
                self.log(f"Auth response status: {response.status}")

                if response.status == 200:
                    auth_data = await response.json()
                    self.access_token = auth_data.get('access_token')
                    self.log(f"Authentication successful: token={self.access_token[:20]}...", "SUCCESS")
                else:
                    response_text = await response.text()
                    self.log(f"Authentication failed: {response_text}", "ERROR")
                    self.access_token = None

        except Exception as e:
            self.log(f"Error during authentication: {e}", "ERROR")
            self.access_token = None

    async def cleanup(self):
        """Cleanup session"""
        if self.session:
            await self.session.close()

    def create_test_file(self, filename: str = "test.txt", content: str = "test content") -> io.BytesIO:
        """Create a test file for upload"""
        file_obj = io.BytesIO(content.encode('utf-8'))
        file_obj.name = filename
        return file_obj

    async def test_form_data_parameters(self):
        """Test form data parameter handling"""
        self.log("=== Testing Form Data Parameters ===")

        test_cases = [
            {
                'name': 'Valid UUIDs in form data',
                'data': {
                    'application_id': self.test_uuids['valid_app'],
                    'folder_id': self.test_uuids['valid_folder'],
                    'document_type': 'borrower_photo',
                    'field_name': 'test_field'
                }
            },
            {
                'name': 'Invalid application_id in form data',
                'data': {
                    'application_id': self.test_uuids['invalid_uuid'],
                    'folder_id': self.test_uuids['valid_folder'],
                    'document_type': 'borrower_photo',
                    'field_name': 'test_field'
                }
            },
            {
                'name': 'Invalid folder_id in form data',
                'data': {
                    'application_id': self.test_uuids['valid_app'],
                    'folder_id': self.test_uuids['invalid_uuid'],
                    'document_type': 'borrower_photo',
                    'field_name': 'test_field'
                }
            },
            {
                'name': 'Invalid document_type in form data',
                'data': {
                    'application_id': self.test_uuids['valid_app'],
                    'folder_id': self.test_uuids['valid_folder'],
                    'document_type': 'invalid_type',
                    'field_name': 'test_field'
                }
            },
            {
                'name': 'Empty field_name in form data',
                'data': {
                    'application_id': self.test_uuids['valid_app'],
                    'folder_id': self.test_uuids['valid_folder'],
                    'document_type': 'borrower_photo',
                    'field_name': ''
                }
            },
            {
                'name': 'Minimal form data (no optional fields)',
                'data': {}
            }
        ]

        for test_case in test_cases:
            await self._test_upload_with_form_data(test_case['name'], test_case['data'])

    async def _test_upload_with_form_data(self, test_name: str, form_data: Dict[str, str]):
        """Test upload with specific form data"""
        try:
            url = f"{self.base_url}/api/v1/files/upload"
            self.log(f"Testing: {test_name}")
            self.log(f"POST {url} with form data: {form_data}")

            # Prepare multipart form data
            data = aiohttp.FormData()
            data.add_field('file', self.create_test_file(), filename='test.txt', content_type='text/plain')

            # Add form fields
            for key, value in form_data.items():
                data.add_field(key, value)

            headers = {}
            if self.access_token:
                headers['Authorization'] = f'Bearer {self.access_token}'

            async with self.session.post(url, data=data, headers=headers) as response:
                self.log(f"Response status: {response.status}")

                if response.status == 200:
                    response_data = await response.json()
                    self.log(f"Upload successful: file_id={response_data.get('id')}", "SUCCESS")
                    return response_data
                else:
                    response_text = await response.text()
                    self.log(f"Upload failed: {response_text}", "ERROR")

                    # Try to parse as JSON for detailed error info
                    try:
                        error_data = json.loads(response_text)
                        if isinstance(error_data, dict):
                            self.log(f"Error details: {error_data.get('detail', 'N/A')}", "ERROR")
                        else:
                            self.log(f"Error response: {response_text}", "ERROR")
                    except json.JSONDecodeError:
                        self.log(f"Non-JSON error response: {response_text}", "ERROR")

                    return None

        except Exception as e:
            self.log(f"Error testing {test_name}: {e}", "ERROR")
            return None

    async def test_query_parameters(self):
        """Test query parameter handling"""
        self.log("=== Testing Query Parameters ===")

        test_cases = [
            {
                'name': 'Valid UUIDs in query parameters',
                'params': {
                    'application_id': self.test_uuids['valid_app'],
                    'folder_id': self.test_uuids['valid_folder'],
                    'document_type': 'borrower_photo',
                    'field_name': 'test_field'
                }
            },
            {
                'name': 'Invalid application_id in query parameters',
                'params': {
                    'application_id': self.test_uuids['invalid_uuid'],
                    'folder_id': self.test_uuids['valid_folder'],
                    'document_type': 'borrower_photo',
                    'field_name': 'test_field'
                }
            }
        ]

        for test_case in test_cases:
            await self._test_upload_with_query_params(test_case['name'], test_case['params'])

    async def _test_upload_with_query_params(self, test_name: str, query_params: Dict[str, str]):
        """Test upload with query parameters"""
        try:
            url = f"{self.base_url}/api/v1/files/upload"
            self.log(f"Testing: {test_name}")
            self.log(f"POST {url} with query params: {query_params}")

            # Prepare multipart form data
            data = aiohttp.FormData()
            data.add_field('file', self.create_test_file(), filename='test.txt', content_type='text/plain')

            headers = {}
            if self.access_token:
                headers['Authorization'] = f'Bearer {self.access_token}'

            async with self.session.post(url, data=data, params=query_params, headers=headers) as response:
                self.log(f"Response status: {response.status}")

                if response.status == 200:
                    response_data = await response.json()
                    self.log(f"Upload successful: file_id={response_data.get('id')}", "SUCCESS")
                    return response_data
                else:
                    response_text = await response.text()
                    self.log(f"Upload failed: {response_text}", "ERROR")

                    # Try to parse as JSON for detailed error info
                    try:
                        error_data = json.loads(response_text)
                        if isinstance(error_data, dict):
                            self.log(f"Error details: {error_data.get('detail', 'N/A')}", "ERROR")
                        else:
                            self.log(f"Error response: {response_text}", "ERROR")
                    except json.JSONDecodeError:
                        self.log(f"Non-JSON error response: {response_text}", "ERROR")

                    return None

        except Exception as e:
            self.log(f"Error testing {test_name}: {e}", "ERROR")
            return None

    async def test_parameter_precedence(self):
        """Test that form data takes precedence over query parameters"""
        self.log("=== Testing Parameter Precedence ===")

        try:
            url = f"{self.base_url}/api/v1/files/upload"

            # Form data should take precedence over query params
            form_data = {
                'application_id': self.test_uuids['valid_app'],  # Different from query param
                'document_type': 'borrower_photo'
            }

            query_params = {
                'application_id': self.test_uuids['valid_folder'],  # Different value
                'folder_id': self.test_uuids['valid_folder']
            }

            self.log(f"Form data: {form_data}")
            self.log(f"Query params: {query_params}")
            self.log("Form data should take precedence")

            data = aiohttp.FormData()
            data.add_field('file', self.create_test_file(), filename='test.txt', content_type='text/plain')

            for key, value in form_data.items():
                data.add_field(key, value)

            headers = {}
            if self.access_token:
                headers['Authorization'] = f'Bearer {self.access_token}'

            async with self.session.post(url, data=data, params=query_params, headers=headers) as response:
                self.log(f"Response status: {response.status}")

                if response.status == 200:
                    response_data = await response.json()
                    app_id = response_data.get('application_id')

                    # Check if form data value was used (not query param value)
                    if app_id == self.test_uuids['valid_app']:
                        self.log(f"Form data precedence confirmed: used {app_id}", "SUCCESS")
                    else:
                        self.log(f"Form data precedence failed: used {app_id}, expected {self.test_uuids['valid_app']}", "ERROR")

                    return response_data
                else:
                    response_text = await response.text()
                    self.log(f"Upload failed: {response_text}", "ERROR")
                    return None

        except Exception as e:
            self.log(f"Error testing parameter precedence: {e}", "ERROR")
            return None

    async def test_missing_file(self):
        """Test upload without file"""
        self.log("=== Testing Missing File ===")

        try:
            url = f"{self.base_url}/api/v1/files/upload"
            self.log("POST without file (should fail)")

            # Empty form data
            data = aiohttp.FormData()

            headers = {}
            if self.access_token:
                headers['Authorization'] = f'Bearer {self.access_token}'

            async with self.session.post(url, data=data, headers=headers) as response:
                self.log(f"Response status: {response.status}")

                if response.status == 400:
                    self.log("Correctly rejected missing file", "SUCCESS")
                else:
                    self.log(f"Unexpected response for missing file: {response.status}", "WARNING")

        except Exception as e:
            self.log(f"Error testing missing file: {e}", "ERROR")

    async def test_invalid_content_type(self):
        """Test upload with invalid content type"""
        self.log("=== Testing Invalid Content Type ===")

        try:
            url = f"{self.base_url}/api/v1/files/upload"
            self.log("POST with invalid content type")

            data = aiohttp.FormData()
            data.add_field('file', self.create_test_file(), filename='test.exe', content_type='application/octet-stream')

            headers = {}
            if self.access_token:
                headers['Authorization'] = f'Bearer {self.access_token}'

            async with self.session.post(url, data=data, headers=headers) as response:
                self.log(f"Response status: {response.status}")

                if response.status == 415:
                    self.log("Correctly rejected invalid content type", "SUCCESS")
                else:
                    self.log(f"Unexpected response for invalid content type: {response.status}", "WARNING")

        except Exception as e:
            self.log(f"Error testing invalid content type: {e}", "ERROR")

    def generate_report(self):
        """Generate summary report"""
        self.log("=== UPLOAD PARAMETERS TEST REPORT ===")

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
    """Main testing function"""
    tester = UploadParameterTester()

    print("🧪 Upload Parameters Testing")
    print("=" * 60)

    try:
        await tester.setup()

        # Run comprehensive tests
        await tester.test_form_data_parameters()
        await tester.test_query_parameters()
        await tester.test_parameter_precedence()
        await tester.test_missing_file()
        await tester.test_invalid_content_type()

        # Generate report
        success = tester.generate_report()

        print("\n" + "=" * 60)
        if success:
            print("✅ All upload parameter tests passed!")
        else:
            print("❌ Found issues. Please review the error messages above.")

    finally:
        await tester.cleanup()

    return success

if __name__ == "__main__":
    asyncio.run(main())