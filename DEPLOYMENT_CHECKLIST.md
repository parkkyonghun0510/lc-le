# Railway Production Deployment Checklist

## ✅ Pre-Deployment Verification

### 🔧 Configuration Files Status
- [x] **Backend Dockerfile**: Validated for Railway deployment
- [x] **Frontend Dockerfile**: Multi-stage build optimized for production
- [x] **Backend railway.toml**: Updated with correct URLs and commands
- [x] **Frontend railway.toml**: Updated with dynamic environment variables
- [x] **Environment Variables**: Documented in validation guide

### 🌐 Service URLs (Update these to match your actual Railway services)
```bash
# Update these URLs in your Railway dashboard
BACKEND_URL="https://lc-workflow-backend-production.up.railway.app"
FRONTEND_URL="https://lc-workflow-frontend-production.up.railway.app"
MINIO_URL="https://bucket-production-9546.up.railway.app"
```

## 🚀 Deployment Steps

### 1. Railway Environment Setup

#### Backend Service (lc-workflow-backend)
```bash
# Required Environment Variables:
DATABASE_URL=postgresql://user:password@host:port/database

# MINIO Configuration
MINIO_ENDPOINT=https://bucket-production-9546.up.railway.app:443
MINIO_ACCESS_KEY=uJ8Z7zDRJh17MwHoKfF2
MINIO_SECRET_KEY=hbA41Ti9O1l9ewDFr5A7S0aHfNSnqakl2iyTVFqe
MINIO_BUCKET_NAME=lc-workflow-files
MINIO_SECURE=true

# Security
SECRET_KEY=your-secure-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=https://lc-workflow-frontend-production.up.railway.app
```

#### Frontend Service (lc-workflow-frontend)
```bash
# Required Environment Variables:
NEXT_PUBLIC_API_URL=https://lc-workflow-backend-production.up.railway.app/api/v1
NEXT_PUBLIC_WS_URL=wss://lc-workflow-backend-production.up.railway.app/api/ws
NEXT_PUBLIC_FORCE_HTTPS=true
NEXT_PUBLIC_MINIO_ENDPOINT=https://bucket-production-9546.up.railway.app
NEXT_PUBLIC_MINIO_BUCKET=lc-workflow-files
NODE_ENV=production
```

### 2. Build Verification

#### Backend Build Check
```bash
cd le-backend
docker build -t lc-backend-test .
docker run --rm -p 8000:8000 \
  -e DATABASE_URL=$DATABASE_URL \
  -e MINIO_ENDPOINT=$MINIO_ENDPOINT \
  -e MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY \
  -e MINIO_SECRET_KEY=$MINIO_SECRET_KEY \
  -e MINIO_BUCKET_NAME=$MINIO_BUCKET_NAME \
  lc-backend-test
```

#### Frontend Build Check
```bash
cd lc-workflow-frontend
docker build -t lc-frontend-test \
  --build-arg NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
  --build-arg NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
  .
docker run --rm -p 3000:3000 lc-frontend-test
```

### 3. Deployment Commands

#### Deploy to Railway
```bash
# Backend deployment
cd le-backend
railway login
railway link
railway up

# Frontend deployment
cd lc-workflow-frontend
railway login
railway link
railway up
```

## 🔍 Post-Deployment Validation

### 1. Run Validation Script
```bash
# Make script executable
chmod +x validate-railway-deployment.sh

# Run validation
./validate-railway-deployment.sh

# Generate detailed report
./validate-railway-deployment.sh report
```

### 2. Manual Health Checks
```bash
# Backend health
curl -f https://lc-workflow-backend-production.up.railway.app/api/v1/health

# Frontend health
curl -f https://lc-workflow-frontend-production.up.railway.app/healthz

# MINIO health
curl -f https://lc-workflow-backend-production.up.railway.app/api/v1/health/minio
```

### 3. File Operations Testing

#### Test File Upload
1. Navigate to frontend URL
2. Login with test credentials
3. Upload test file (e.g., PDF, image)
4. Verify upload completes successfully

#### Test File Listing
1. Refresh file listing page
2. Verify uploaded file appears
3. Check pagination works
4. Verify thumbnails load correctly

#### Test File Download
1. Click on uploaded file
2. Verify download URL is HTTPS
3. Download completes successfully
4. Check file integrity

## 🚨 Common Issues & Solutions

### Issue 1: Build Fails
**Symptoms**: Railway build fails with environment variable errors
**Solution**: Ensure all required environment variables are set in Railway dashboard

### Issue 2: MINIO Connection Fails
**Symptoms**: File operations timeout or fail
**Solution**: Verify MINIO credentials and endpoint format in Railway environment variables

### Issue 3: CORS Errors
**Symptoms**: Browser shows CORS policy errors
**Solution**: Update CORS_ORIGINS in backend railway.toml to match frontend URL

### Issue 4: Mixed Content
**Symptoms**: Browser blocks HTTP resources on HTTPS page
**Solution**: Ensure all URLs use HTTPS in environment variables

### Issue 5: File Upload Fails
**Symptoms**: Upload completes but file doesn't appear
**Solution**: Check MINIO bucket permissions and presigned URL generation

## 📊 Monitoring Setup

### Railway Dashboard Monitoring
1. **Service Health**: Monitor both services for uptime
2. **Logs**: Check Railway logs for errors
3. **Performance**: Monitor response times
4. **SSL Certificates**: Ensure auto-renewal

### Custom Monitoring
```bash
# Add to backend health endpoint
GET /api/v1/health/full
# Returns: {"status":"healthy","minio":"connected","database":"connected","files":123}

# Frontend monitoring
GET /healthz/detailed
# Returns: {"status":"connected","api_url":"https://backend...","minio_url":"https://minio..."}
```

## ✅ Success Criteria

### Service Deployment
- [ ] Both backend and frontend services deployed successfully
- [ ] Health checks pass for both services
- [ ] SSL certificates are valid
- [ ] No build errors in Railway logs

### File Operations
- [ ] File upload works without errors
- [ ] File listing displays correctly
- [ ] File download works with HTTPS URLs
- [ ] Thumbnails load properly
- [ ] Pagination functions correctly

### Security & Performance
- [ ] All URLs use HTTPS
- [ ] No CORS errors in browser console
- [ ] No mixed content warnings
- [ ] Response times < 2 seconds
- [ ] All static assets load correctly

## 🔄 Continuous Deployment

### Automated Checks
```bash
# Add to CI/CD pipeline
./validate-railway-deployment.sh

# If validation fails, deployment stops
if [ $? -ne 0 ]; then
    echo "Validation failed, stopping deployment"
    exit 1
fi
```

### Regular Validation
- **Daily**: Automated health checks
- **Weekly**: Full feature validation
- **Monthly**: Security certificate renewal check

## 🆘 Emergency Procedures

### Rollback Plan
```bash
# Backend rollback
git checkout HEAD~1 -- le-backend/
railway up

# Frontend rollback
git checkout HEAD~1 -- lc-workflow-frontend/
railway up
```

### Debug Commands
```bash
# Check Railway logs
railway logs --service lc-workflow-backend
railway logs --service lc-workflow-frontend

# Check environment variables
railway variables --service lc-workflow-backend
railway variables --service lc-workflow-frontend

# Restart services
railway restart --service lc-workflow-backend
railway restart --service lc-workflow-frontend
```

## 📞 Support Resources

### Documentation
- [Railway Deployment Guide](RAILWAY_DEPLOYMENT_VALIDATION.md)
- [MINIO Production Fix Guide](MINIO_PRODUCTION_FIX_GUIDE.md)
- [Backend Deployment Guide](le-backend/BACKEND_DEPLOYMENT_GUIDE.md)

### Validation Tools
- `validate-railway-deployment.sh` - Comprehensive deployment validation
- `debug-minio-production.py` - MINIO-specific debugging
- `fix-minio-production-issues.py` - Automated fixes

### Contact Information
- **Railway Support**: Railway dashboard support chat
- **Team Slack**: #deployment-support channel
- **Emergency**: Contact on-call engineer

---

**Ready to deploy? Follow these steps in order and use the validation script to ensure everything works correctly!**