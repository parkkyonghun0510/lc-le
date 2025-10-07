# WebSocket Connection Fix Guide

## Problem
Frontend WebSocket connections failing with error code 1006 (abnormal closure), unable to connect to real-time notification system.

## Root Cause
Missing environment configuration for WebSocket URL in the frontend, causing the connection to use incorrect WebSocket endpoint path.

## Solution Applied

### 1. Created `.env.local` Configuration File
Created `/lc-workflow-frontend/.env.local` with correct WebSocket URL:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8090/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8090/api/v1/ws
```

### 2. Verified Backend Configuration
Backend WebSocket endpoint is correctly mounted at:
- **Path**: `/api/v1/ws/realtime`
- **Full URL**: `ws://localhost:8090/api/v1/ws/realtime?token=<jwt_token>`
- **Authentication**: JWT token passed as query parameter
- **File**: `le-backend/app/routers/websocket.py`

## Steps to Apply the Fix

### Step 1: Restart Frontend Development Server

Since you created the new `.env.local` file, you **must restart** your Next.js development server to pick up the new environment variables:

```bash
# In your frontend terminal, stop the dev server (Ctrl+C)
# Then restart it:
cd lc-workflow-frontend
npm run dev
```

### Step 2: Clear Browser Cache (Optional)
Sometimes browsers cache WebSocket connections. Try:
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
- Or open in incognito/private window

### Step 3: Verify Backend is Running
Make sure your backend is running on port 8090:
```bash
lsof -i :8090 | grep LISTEN
```

You should see Python process listening on port 8090.

### Step 4: Test the Connection

#### Option A: Use the Test Script
```bash
# Install websockets library if needed
pip install websockets

# Run the test script (you'll need a valid JWT token)
python test_websocket.py YOUR_ACCESS_TOKEN
```

#### Option B: Check Frontend Console
After restarting the frontend, check the browser console. You should now see:
```
WebSocket connection details: {
  wsBaseUrl: 'ws://localhost:8090/api/v1/ws',
  wsUrl: 'ws://localhost:8090/api/v1/ws/realtime?token=...',
  ...
}
WebSocket connected for notifications
```

Instead of the previous 1006 errors.

## Testing WebSocket Functionality

### 1. Get a Valid Token
Visit http://localhost:8090/docs and login using the `/api/v1/auth/login` endpoint to get an access token.

### 2. Test with Python Script
```bash
python test_websocket.py eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Test in Browser
1. Login to the frontend at http://localhost:3000
2. Open browser DevTools → Console
3. Look for "WebSocket connected for notifications" message
4. The connection should stay open (no 1006 errors)

## Common Issues and Solutions

### Issue 1: Still Getting 1006 Errors After Restart
**Solution**: Make sure you fully stopped and restarted the dev server. Next.js only reads `.env.local` on startup.

### Issue 2: "Authentication failed" (4001 error)
**Solution**: 
- Your JWT token may be expired (tokens expire after 60 minutes)
- Log out and log back in to get a fresh token
- Check that the token is being passed correctly in the WebSocket URL

### Issue 3: Backend Not Responding
**Solution**:
- Check backend logs for errors
- Verify Redis/DragonflyDB is available (WebSocket falls back gracefully if not)
- Check `le-backend/app/routers/websocket.py` for any errors

### Issue 4: Environment Variables Not Loading
**Solution**:
- Verify `.env.local` file is in `lc-workflow-frontend/` directory
- Check file has no typos: `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`
- Environment variables must start with `NEXT_PUBLIC_` to be available in browser

## Architecture Overview

### WebSocket Flow
```
Frontend (Browser)
  → WebSocket Connection Request
  → ws://localhost:8090/api/v1/ws/realtime?token=<jwt>
  → Backend WebSocket Router (app/routers/websocket.py)
  → Authentication Check (get_current_user_websocket)
  → Connection Manager (maintains active connections)
  → Pub/Sub Service (Redis-based notifications)
  → Real-time Notifications to Client
```

### Authentication Flow
1. User logs in via REST API → receives JWT token
2. Frontend stores token in localStorage
3. WebSocket connection includes token as query parameter
4. Backend validates token and extracts user info
5. Connection is associated with authenticated user

## Production Deployment Notes

For Railway or production deployment, update environment variables:

### Frontend
```bash
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app/api/v1/ws
NEXT_PUBLIC_FORCE_HTTPS=true
NODE_ENV=production
```

Note: Use `wss://` (WebSocket Secure) for HTTPS sites.

### Backend
Ensure CORS allows WebSocket connections:
```python
# In le-backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Verification Checklist

- [ ] `.env.local` file created in `lc-workflow-frontend/`
- [ ] Environment variables are correct (no typos)
- [ ] Frontend dev server restarted
- [ ] Backend is running on port 8090
- [ ] Browser console shows successful WebSocket connection
- [ ] No 1006 error codes in console
- [ ] Heartbeat messages received every 30 seconds

## Additional Resources

- **Backend WebSocket Router**: `le-backend/app/routers/websocket.py`
- **Frontend WebSocket Hook**: `lc-workflow-frontend/src/hooks/useWebSocketNotifications.ts`
- **Authentication**: `le-backend/app/routers/auth.py` (get_current_user_websocket function)
- **API Documentation**: http://localhost:8090/docs

## Need Help?

If WebSocket connections still fail after following these steps:

1. Check backend logs for detailed error messages
2. Verify JWT token is valid and not expired
3. Test with the Python script to isolate frontend vs backend issues
4. Check if Redis/DragonflyDB is running (optional, but enhances functionality)
5. Review WARP.md troubleshooting section

## Summary

The WebSocket 1006 errors were caused by missing WebSocket URL configuration. After creating the `.env.local` file with the correct `NEXT_PUBLIC_WS_URL` and restarting the frontend server, WebSocket connections should work correctly.

**Key Fix**: `NEXT_PUBLIC_WS_URL=ws://localhost:8090/api/v1/ws`
