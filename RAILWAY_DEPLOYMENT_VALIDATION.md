# Railway Production Deployment Validation Guide

## 🎯 Overview
This guide provides comprehensive validation steps for deploying both backend and frontend services on Railway, ensuring proper MINIO integration and HTTPS configuration.

## 📋 Pre-Deployment Checklist

### 1. Environment Variables Validation

#### Backend Environment Variables (Railway Dashboard)
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# MINIO Configuration
MINIO_ENDPOINT=https://bucket-production-9546.up.railway.app:443
MINIO_ACCESS_KEY=uJ8Z7zDRJh17MwHoKfF2
MINIO_SECRET_KEY=hbA41Ti9O1l9ewDFr5A7S0aHfNSnqakl2iyTVFqe
MINIO_BUCKET_NAME=lc-workflow-files
MINIO_SECURE=true

# Security
SECRET_KEY=your-secure-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=https://lc-workflow-frontend-production.up.railway.app
```

#### Frontend Environment Variables (Railway Dashboard)
```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://lc-workflow-backend-production.up.railway.app/api/v1
NEXT_PUBLIC_WS_URL=wss://lc-workflow-backend-production.up.railway.app/api/ws

# Build Configuration
NEXT_PUBLIC_FORCE_HTTPS=true
NEXT_PUBLIC_MINIO_ENDPOINT=https://bucket-production-9546.up.railway.app
NEXT_PUBLIC_MINIO_BUCKET=lc-workflow-files

# Security
NEXT_SECRET_KEY=your-frontend-secret-key
```

### 2. Configuration Files Updates

#### Backend railway.toml (Updated)
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/api/v1/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[env]
PYTHON_VERSION = "3.11"
PIP_NO_CACHE_DIR = "1"
PIP_DISABLE_PIP_VERSION_CHECK = "1"
CORS_ORIGINS = "https://lc-workflow-frontend-production.up.railway.app"

[build.env]
PYTHON_VERSION = "3.11"
```

#### Frontend railway.toml (Updated)
```toml
[build]
builder = "dockerfile"
buildContext = "."
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "node server.js"
healthcheckPath = "/healthz"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[env]
NODE_ENV = "production"
PORT = "3000"
NEXT_TELEMETRY_DISABLED = "1"

# Build arguments - these will be populated from Railway environment variables
[build.args]
NEXT_PUBLIC_API_URL = "${NEXT_PUBLIC_API_URL}"
NEXT_PUBLIC_WS_URL = "${NEXT_PUBLIC_WS_URL}"
NEXT_PUBLIC_FORCE_HTTPS = "${NEXT_PUBLIC_FORCE_HTTPS}"
```

## 🔧 Build Verification Process

### 1. Backend Build Verification
```bash
# Test local build
cd le-backend
docker build -t lc-backend-test .

# Check for build issues
docker run --rm -p 8000:8000 \
  -e DATABASE_URL=your-test-db \
  -e MINIO_ENDPOINT=https://bucket-production-9546.up.railway.app:443 \
  -e MINIO_ACCESS_KEY=uJ8Z7zDRJh17MwHoKfF2 \
  -e MINIO_SECRET_KEY=hbA41Ti9O1l9ewDFr5A7S0aHfNSnqakl2iyTVFqe \
  lc-backend-test

# Test health endpoint
curl -f http://localhost:8000/api/v1/health
```

### 2. Frontend Build Verification
```bash
# Test local build
cd lc-workflow-frontend
docker build -t lc-frontend-test \
  --build-arg NEXT_PUBLIC_API_URL=https://lc-workflow-backend-production.up.railway.app/api/v1 \
  --build-arg NEXT_PUBLIC_WS_URL=wss://lc-workflow-backend-production.up.railway.app/api/ws \
  .

# Check for build issues
docker run --rm -p 3000:3000 lc-frontend-test

# Test health endpoint
curl -f http://localhost:3000/healthz
```

## 🚀 Deployment Validation Script

### Create validation script
```bash
#!/bin/bash
# railway-validation.sh

echo "🔍 Railway Deployment Validation"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service health
check_service() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Checking $name... "
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Status: $status)"
        return 1
    fi
}

# Function to check MINIO integration
check_minio() {
    echo -n "Checking MINIO integration... "
    
    # Test presigned URL generation
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer YOUR_TEST_TOKEN" \
        https://lc-workflow-backend-production.up.railway.app/api/v1/files/upload-url)
    
    if [[ $response == *"presigned_url"* ]]; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        return 1
    fi
}

# Main validation
main() {
    echo "Starting Railway deployment validation..."
    echo
    
    # Backend checks
    echo "📊 Backend Service Checks:"
    check_service "Backend Health" "https://lc-workflow-backend-production.up.railway.app/api/v1/health"
    check_service "Backend API" "https://lc-workflow-backend-production.up.railway.app/api/v1/files"
    
    # Frontend checks
    echo -e "\n📊 Frontend Service Checks:"
    check_service "Frontend Health" "https://lc-workflow-frontend-production.up.railway.app/healthz"
    check_service "Frontend App" "https://lc-workflow-frontend-production.up.railway.app"
    
    # MINIO integration
    echo -e "\n📊 MINIO Integration Checks:"
    check_minio
    
    # SSL/HTTPS checks
    echo -e "\n🔒 SSL/HTTPS Checks:"
    check_service "Backend HTTPS" "https://lc-workflow-backend-production.up.railway.app/api/v1/health"
    check_service "Frontend HTTPS" "https://lc-workflow-frontend-production.up.railway.app"
    
    echo -e "\n🎯 Validation Complete!"
}

main "$@"
```

## 📊 Runtime Validation Steps

### 1. Health Checks
```bash
# Backend health
curl -f https://lc-workflow-backend-production.up.railway.app/api/v1/health

# Frontend health
curl -f https://lc-workflow-frontend-production.up.railway.app/healthz

# MINIO health (from backend)
curl -f https://lc-workflow-backend-production.up.railway.app/api/v1/files/health
```

### 2. File Operations Testing
```bash
# Test file upload flow
1. Login to frontend
2. Navigate to file upload
3. Upload test file
4. Verify file appears in listing

# Test file download
1. Click on uploaded file
2. Verify download URL is HTTPS
3. Download completes successfully

# Test file listing
1. Refresh file listing
2. Verify all files display correctly
3. Check pagination works
4. Verify thumbnails load
```

### 3. Browser Validation
```javascript
// In browser console
fetch('https://lc-workflow-backend-production.up.railway.app/api/v1/health')
  .then(r => r.json())
  .then(data => console.log('Backend OK:', data));

// Check for mixed content
// Open DevTools → Security tab
// Verify no mixed content warnings
```

## 🔍 Monitoring Setup

### Railway Dashboard Monitoring
1. **Service Health**: Monitor both backend and frontend services
2. **Logs**: Check for any errors in Railway logs
3. **Performance**: Monitor response times and resource usage
4. **SSL Certificates**: Ensure certificates are valid and auto-renewed

### Custom Monitoring Endpoints
```bash
# Add to backend health check
GET /api/v1/health/minio
# Should return: {"status": "healthy", "bucket": "lc-workflow-files", "objects": 123}

# Add to frontend health check
GET /healthz/minio
# Should return: {"status": "connected", "api_url": "https://backend..."}
```

## 🚨 Common Issues & Solutions

### Issue: Build Fails
**Solution**: Check environment variables are set in Railway dashboard

### Issue: MINIO Connection Fails
**Solution**: Verify MINIO credentials and endpoint format

### Issue: CORS Errors
**Solution**: Update CORS_ORIGINS in backend railway.toml

### Issue: Mixed Content
**Solution**: Ensure all URLs use HTTPS in environment variables

### Issue: File Upload Fails
**Solution**: Check MINIO bucket permissions and presigned URL generation

## ✅ Deployment Success Criteria

- [ ] Both services deploy successfully
- [ ] Health checks pass
- [ ] File upload works
- [ ] File listing displays correctly
- [ ] File download works
- [ ] All URLs use HTTPS
- [ ] No CORS errors
- [ ] No mixed content warnings
- [ ] Performance is acceptable (<2s response time)
- [ ] All thumbnails load correctly

## 📝 Post-Deployment Checklist

1. **Verify Services**: Both backend and frontend are running
2. **Test Core Features**: Upload, list, download files
3. **Check Security**: HTTPS everywhere, no warnings
4. **Monitor Logs**: Check Railway logs for errors
5. **Performance**: Ensure acceptable response times
6. **User Testing**: Have team members test the deployment

## 🔄 Continuous Validation

Set up automated checks:
- **Daily**: Health check automation
- **Weekly**: Full feature validation
- **Monthly**: Security certificate renewal check
- **On Deploy**: Automatic validation script run