# Frontend API Connection Fix

## Problem Identified
The frontend was making requests to `/api/v1/api/v1/applications` instead of `/api/v1/applications` due to duplicate path configuration.

## Root Cause
- Frontend environment variables included `/api/v1/` in the base URL
- Frontend hooks were adding `/api/v1/` again when constructing API calls
- This resulted in double path: `http://localhost:8000/api/v1/` + `/api/v1/applications` = `/api/v1/api/v1/applications`

## Files Fixed

### Environment Configuration
1. **lc-workflow-frontend/.env**
   - Changed: `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1/`
   - To: `NEXT_PUBLIC_API_URL=http://localhost:8000`

2. **lc-workflow-frontend/.env.local**
   - Changed: `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`
   - To: `NEXT_PUBLIC_API_URL=http://localhost:8000`

### Source Code Files
3. **lc-workflow-frontend/src/lib/api.ts**
   - Changed: `const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';`
   - To: `const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';`

4. **lc-workflow-frontend/src/hooks/useFiles.ts**
   - Changed: `const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';`
   - To: `const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';`

5. **lc-workflow-frontend/src/components/files/FilePreview.tsx**
   - Changed: `const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';`
   - To: `const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';`

## Current Status
✅ **Backend**: Database schema synchronized, API endpoints working correctly
✅ **Frontend**: API URL configuration fixed, no more duplicate paths
✅ **Connection**: Frontend will now make requests to correct endpoints

## Expected API Calls
- **Before**: `GET /api/v1/api/v1/applications?page=1&size=10` (404 Not Found)
- **After**: `GET /api/v1/applications?page=1&size=10` (401 Unauthorized - correct!)

## Next Steps
1. Restart the frontend development server to pick up environment changes
2. Test the applications page in the browser
3. Verify authentication flow works correctly
4. Check that all API endpoints are accessible

## Testing Commands
```bash
# Start backend (if not running)
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Start frontend (in new terminal)
cd lc-workflow-frontend
npm run dev
```

## Verification
The frontend should now successfully:
- Load the applications page without 404 errors
- Show authentication required (401) for protected endpoints
- Display data correctly when authenticated
- Make API calls to the correct URLs