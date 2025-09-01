# MINIO Production File Listing Fix Guide

## 🚨 Issue Summary
The file listing functionality is not working in production due to incorrect configuration between the Railway backend and frontend. This guide provides step-by-step fixes.

## 🔍 Root Cause Analysis
After thorough investigation, the issues are:

1. **Frontend API URLs**: `.env.production` has incorrect Railway URLs
2. **Environment Variables**: Missing Railway-specific configuration
3. **URL Generation**: MINIO presigned URLs need proper HTTPS configuration
4. **CORS/Security**: Mixed content issues in production

## ✅ Immediate Fixes Applied

### 1. Backend Configuration ✅
- **Status**: MINIO connection is working correctly
- **Database**: File queries are returning results
- **URLs**: Presigned URLs are generating with HTTPS

### 2. Frontend Configuration ✅
- **File**: `.env.production` updated with correct Railway URLs
- **URLs**: Now pointing to correct backend service
- **Security**: HTTPS enforcement added

## 🚀 Production Deployment Steps

### Step 1: Railway Environment Variables

**Backend (lc-workflow-backend-production):**
```bash
# Railway Dashboard → Variables
MINIO_ENDPOINT=https://bucket-production-9546.up.railway.app:443
MINIO_ACCESS_KEY=uJ8Z7zDRJh17MwHoKfF2
MINIO_SECRET_KEY=hbA41Ti9O1l9ewDFr5A7S0aHfNSnqakl2iyTVFqe
MINIO_BUCKET_NAME=lc-workflow-files
MINIO_SECURE=true

# Optional Railway-specific
MINIO_PRIVATE_ENDPOINT=https://bucket-production-9546.up.railway.app:443
MINIO_ROOT_USER=uJ8Z7zDRJh17MwHoKfF2
MINIO_ROOT_PASSWORD=hbA41Ti9O1l9ewDFr5A7S0aHfNSnqakl2iyTVFqe
```

**Frontend (lc-workflow-frontend-production):**
```bash
# Railway Dashboard → Variables
NEXT_PUBLIC_API_URL=https://lc-workflow-backend-production.up.railway.app/api/v1/
NEXT_PUBLIC_WS_URL=wss://lc-workflow-backend-production.up.railway.app/api/ws/
NEXT_PUBLIC_FORCE_HTTPS=true
```

### Step 2: Redeploy Services

1. **Redeploy Backend**:
   ```bash
   git add .
   git commit -m "fix: update MINIO production configuration"
   git push origin main
   ```

2. **Redeploy Frontend**:
   ```bash
   cd lc-workflow-frontend
   git add .
   git commit -m "fix: update production API URLs for Railway"
   git push origin main
   ```

### Step 3: Validation

Run the validation script:
```bash
cd /Volumes/SYBazzarData/LC-Project/backend/le-backend
chmod +x /tmp/validate-minio-production.sh
/tmp/validate-minio-production.sh
```

Or manually test:
1. Open browser dev tools (F12)
2. Go to Network tab
3. Navigate to file listing page
4. Verify:
   - API calls use HTTPS
   - Presigned URLs are HTTPS
   - No CORS errors
   - Files are displayed

## 🔧 Troubleshooting Common Issues

### Issue: "Mixed Content" Error
**Solution**: Ensure all URLs use HTTPS
- Check `NEXT_PUBLIC_API_URL` starts with `https://`
- Verify `minio_service.py` generates HTTPS URLs

### Issue: CORS Errors
**Solution**: Backend CORS configuration
```python
# In app/main.py, ensure:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://lc-workflow-frontend-production.up.railway.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue: 404 on File Download
**Solution**: Check bucket name and permissions
```bash
# Test bucket access
python3 -c "
from app.services.minio_service import minio_service
print('Bucket exists:', minio_service.bucket_exists())
print('Files:', minio_service.client.list_objects('lc-workflow-files'))
"
```

### Issue: Presigned URLs Expire Too Quickly
**Solution**: Increase expiration time
```python
# In minio_service.py
return self.client.presigned_get_object(
    self.bucket_name, 
    object_name, 
    expires=timedelta(hours=24)  # Increase from 1 hour
)
```

## 📊 Verification Checklist

- [ ] Backend is accessible at `https://lc-workflow-backend-production.up.railway.app`
- [ ] Frontend is accessible at `https://lc-workflow-frontend-production.up.railway.app`
- [ ] File listing API returns 200 OK
- [ ] File upload works
- [ ] File download works
- [ ] All URLs use HTTPS
- [ ] No CORS errors in browser console
- [ ] No mixed content warnings

## 🆘 Emergency Rollback

If issues persist, revert changes:

1. **Frontend**:
   ```bash
   git checkout HEAD~1 -- .env.production
   git commit -m "revert: rollback production URLs"
   git push origin main
   ```

2. **Backend**:
   ```bash
   git checkout HEAD~1 -- app/core/config.py
   git commit -m "revert: rollback MINIO configuration"
   git push origin main
   ```

## 📞 Support

If issues persist after following this guide:
1. Check Railway logs: `railway logs`
2. Run diagnostic script: `python3 scripts/debug-minio-production.py`
3. Test manually: `python3 scripts/test-production-file-api.py`
4. Contact support with logs from validation script

## 🎯 Expected Result

After applying these fixes, the file listing functionality should work correctly in production, displaying all files with proper HTTPS URLs and no security warnings.