"""
Simple test script to verify backend setup
"""
import asyncio
import httpx
import sys

def test_api_health():
    """Test if the API is running and healthy"""
    try:
        response = httpx.get("https://lc-le-production.up.railway.app/health")
        if response.status_code == 200:
            print("✅ API Health Check: PASSED")
            return True
        else:
            print(f"❌ API Health Check: FAILED - Status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API Health Check: FAILED - {e}")
        return False

def test_docs_access():
    """Test if API documentation is accessible"""
    try:
        response = httpx.get("https://lc-le-production.up.railway.app/docs")
        if response.status_code == 200:
            print("✅ API Documentation: ACCESSIBLE")
            return True
        else:
            print(f"❌ API Documentation: FAILED - Status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API Documentation: FAILED - {e}")
        return False

async def main():
    print("🔍 Testing LC Workflow Backend Setup...")
    print("=" * 50)
    
    # Test health endpoint
    health_ok = test_api_health()
    
    # Test docs
    docs_ok = test_docs_access()
    
    print("\n" + "=" * 50)
    if health_ok and docs_ok:
        print("🎉 Backend setup verification: ALL TESTS PASSED")
        print("\nNext steps:")
        print("1. Run database migrations: alembic upgrade head")
        print("2. Start the server: uvicorn app.main:app --reload")
        print("3. Visit https://lc-le-production.up.railway.app/docs for API documentation")
    else:
        print("⚠️  Some tests failed. Check the server is running.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())