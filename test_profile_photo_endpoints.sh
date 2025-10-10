#!/bin/bash

# Test Profile Photo Endpoints
# This script tests the new profile photo upload endpoints

echo "🧪 Testing Profile Photo Endpoints"
echo "=================================="
echo ""

# Configuration
BACKEND_URL="http://localhost:8000"
API_BASE="/api/v1/users"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if backend is running
echo "1️⃣  Checking if backend is running..."
if curl -s -f "${BACKEND_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend is not running${NC}"
    echo "   Please start the backend server first:"
    echo "   cd le-backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    exit 1
fi
echo ""

# Test 2: Check if Swagger UI is accessible
echo "2️⃣  Checking Swagger UI..."
if curl -s -f "${BACKEND_URL}/docs" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Swagger UI is accessible${NC}"
    echo "   Visit: ${BACKEND_URL}/docs"
else
    echo -e "${RED}✗ Swagger UI is not accessible${NC}"
fi
echo ""

# Test 3: Check if OpenAPI spec includes new endpoints
echo "3️⃣  Checking if new endpoints are registered..."
OPENAPI_JSON=$(curl -s "${BACKEND_URL}/openapi.json")

if echo "$OPENAPI_JSON" | grep -q "profile-photo"; then
    echo -e "${GREEN}✓ Profile photo endpoints are registered${NC}"
    
    # Count endpoints
    UPLOAD_COUNT=$(echo "$OPENAPI_JSON" | grep -o "profile-photo" | wc -l)
    echo "   Found $UPLOAD_COUNT profile-photo endpoint references"
    
    # List endpoints
    echo ""
    echo "   📋 Available endpoints:"
    echo "   • POST   ${API_BASE}/{user_id}/profile-photo"
    echo "   • GET    ${API_BASE}/{user_id}/profile-photo-urls"
    echo "   • DELETE ${API_BASE}/{user_id}/profile-photo"
else
    echo -e "${RED}✗ Profile photo endpoints are NOT registered${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  The backend needs to be restarted!${NC}"
    echo ""
    echo "   Steps to fix:"
    echo "   1. Stop the backend server (Ctrl+C)"
    echo "   2. Start it again:"
    echo "      cd le-backend"
    echo "      uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    echo ""
    exit 1
fi
echo ""

# Test 4: Check if image optimization service is importable
echo "4️⃣  Checking image optimization service..."
if [ -f "le-backend/app/services/image_optimization_service.py" ]; then
    echo -e "${GREEN}✓ Image optimization service file exists${NC}"
else
    echo -e "${RED}✗ Image optimization service file not found${NC}"
fi
echo ""

# Test 5: Check if Pillow is installed
echo "5️⃣  Checking Pillow installation..."
PILLOW_CHECK=$(python3 -c "import PIL; print(PIL.__version__)" 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Pillow is installed (version: $PILLOW_CHECK)${NC}"
else
    echo -e "${RED}✗ Pillow is not installed${NC}"
    echo "   Install it with: pip install Pillow"
fi
echo ""

# Summary
echo "=================================="
echo "📊 Test Summary"
echo "=================================="
echo ""
echo "If all tests passed, you can now:"
echo "1. Go to http://localhost:3000/profile"
echo "2. Click on your avatar to upload a photo"
echo "3. Or drag & drop an image onto your avatar"
echo ""
echo "If tests failed, follow the instructions above to fix the issues."
echo ""
echo "For more help, see: BACKEND_RESTART_INSTRUCTIONS.md"
