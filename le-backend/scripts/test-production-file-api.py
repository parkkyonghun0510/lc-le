#!/usr/bin/env python3
"""
Production File API Testing Script
Tests the actual file listing endpoints in production environment
"""

import asyncio
import aiohttp
import json
import os
from typing import Dict, Any
import sys

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

class ProductionFileAPITester:
    def __init__(self):
        self.base_url = None
        self.session = None
        self.results = []
        
    def log(self, message: str, status: str = "INFO"):
        """Log message with status"""
        print(f"[{status}] {message}")
        self.results.append({"message": message, "status": status})
        
    async def setup(self):
        """Setup async session"""
        self.session = aiohttp.ClientSession()
        
        # Determine base URL
        api_url = os.getenv('NEXT_PUBLIC_API_URL') or 'http://localhost:8000'
        if api_url.endswith('/'):
            api_url = api_url.rstrip('/')
        self.base_url = api_url
        self.log(f"Using base URL: {self.base_url}")
        
    async def cleanup(self):
        """Cleanup session"""
        if self.session:
            await self.session.close()
            
    async def test_file_listing_endpoint(self):
        """Test the file listing endpoint"""
        self.log("=== Testing File Listing Endpoint ===")
        
        try:
            url = f"{self.base_url}/api/v1/files"
            self.log(f"GET {url}")
            
            async with self.session.get(url) as response:
                self.log(f"Response status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    self.log(f"Files found: {data.get('total', 0)}")
                    self.log(f"Page: {data.get('page', 1)}/{data.get('pages', 1)}")
                    
                    items = data.get('items', [])
                    if items:
                        self.log(f"First file: {items[0].get('original_filename', 'N/A')}")
                        self.log(f"File URL: {items[0].get('file_url', 'N/A')}")
                    else:
                        self.log("No files found in response")
                        
                    return data
                else:
                    text = await response.text()
                    self.log(f"Error response: {text}", "ERROR")
                    return None
                    
        except Exception as e:
            self.log(f"Error testing file listing: {e}", "ERROR")
            return None
            
    async def test_file_with_application_filter(self, application_id: str = None):
        """Test file listing with application filter"""
        self.log("=== Testing File Listing with Application Filter ===")
        
        try:
            url = f"{self.base_url}/api/v1/files"
            params = {}
            if application_id:
                params['application_id'] = application_id
                
            self.log(f"GET {url} with params: {params}")
            
            async with self.session.get(url, params=params) as response:
                self.log(f"Response status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    self.log(f"Files found: {data.get('total', 0)}")
                    return data
                else:
                    text = await response.text()
                    self.log(f"Error response: {text}", "ERROR")
                    return None
                    
        except Exception as e:
            self.log(f"Error testing filtered listing: {e}", "ERROR")
            return None
            
    def test_minio_url_generation(self):
        """Test MinIO URL generation"""
        self.log("=== Testing MinIO URL Generation ===")
        
        try:
            from app.services.minio_service import minio_service
            
            if not minio_service.enabled:
                self.log("MinIO service is disabled", "WARNING")
                return
                
            # Test with a sample file path
            sample_path = "test-file.txt"
            
            try:
                url = minio_service.get_file_url(sample_path, expires=60)
                self.log(f"Generated URL: {url}")
                
                # Check if URL is HTTPS
                if url.startswith('https://'):
                    self.log("URL uses HTTPS", "SUCCESS")
                elif url.startswith('http://'):
                    self.log("URL uses HTTP - this might cause issues in production", "WARNING")
                else:
                    self.log("URL format unexpected", "ERROR")
                    
                # Check URL format
                if 'bucket-production-9546.up.railway.app' in url:
                    self.log("URL uses Railway MinIO endpoint", "SUCCESS")
                else:
                    self.log("URL uses different endpoint than expected", "WARNING")
                    
            except Exception as e:
                self.log(f"Error generating URL: {e}", "ERROR")
                
        except Exception as e:
            self.log(f"MinIO service error: {e}", "ERROR")
            
    async def test_health_check(self):
        """Test health check endpoint"""
        self.log("=== Testing Health Check ===")
        
        try:
            url = f"{self.base_url}/health"
            self.log(f"GET {url}")
            
            async with self.session.get(url) as response:
                self.log(f"Response status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    self.log(f"Health check: {data}")
                    return data
                else:
                    text = await response.text()
                    self.log(f"Health check failed: {text}", "ERROR")
                    return None
                    
        except Exception as e:
            self.log(f"Error testing health check: {e}", "ERROR")
            return None
            
    def generate_report(self):
        """Generate summary report"""
        self.log("=== PRODUCTION API TEST REPORT ===")
        
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
    tester = ProductionFileAPITester()
    
    print("🧪 Production File API Testing")
    print("=" * 50)
    
    try:
        await tester.setup()
        
        # Run tests
        await tester.test_health_check()
        tester.test_minio_url_generation()
        await tester.test_file_listing_endpoint()
        await tester.test_file_with_application_filter()
        
        # Generate report
        success = tester.generate_report()
        
        print("\n" + "=" * 50)
        if success:
            print("✅ All API tests passed!")
        else:
            print("❌ Found issues. Please review the error messages above.")
            
    finally:
        await tester.cleanup()
        
    return success

if __name__ == "__main__":
    asyncio.run(main())