# Backend Restart Instructions

## Issue
The new profile photo upload endpoints are returning 404 errors because the backend server needs to be restarted to load the new routes.

## Error Messages
```
POST /api/v1/users/{user_id}/profile-photo 404
DELETE /api/v1/users/{user_id}/profile-photo 404
```

## Solution: Restart the Backend Server

### Option 1: Using the Terminal

1. **Stop the current backend server**:
   - Find the terminal running the backend
   - Press `Ctrl+C` to stop it

2. **Start the backend server again**:
   ```bash
   cd le-backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Option 2: If Running with Docker

1. **Restart the backend container**:
   ```bash
   docker-compose restart backend
   ```

   Or rebuild if needed:
   ```bash
   docker-compose down
   docker-compose up -d --build backend
   ```

### Option 3: If Running on Railway/Production

1. **Trigger a redeploy**:
   - Push changes to git
   - Railway will automatically redeploy
   
   Or manually:
   - Go to Railway dashboard
   - Click on the backend service
   - Click "Deploy" → "Redeploy"

## Verify the Routes Are Loaded

After restarting, verify the routes are available:

### Check Available Routes
```bash
curl http://localhost:8000/docs
```

Look for these new endpoints in the Swagger UI:
- `POST /api/v1/users/{user_id}/profile-photo`
- `GET /api/v1/users/{user_id}/profile-photo-urls`
- `DELETE /api/v1/users/{user_id}/profile-photo`

### Test Upload Endpoint
```bash
curl -X POST "http://localhost:8000/api/v1/users/{user_id}/profile-photo" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-image.jpg"
```

## Common Issues

### Issue: Port Already in Use
```
Error: [Errno 48] Address already in use
```

**Solution**: Kill the process using port 8000
```bash
# Find the process
lsof -ti:8000

# Kill it
kill -9 $(lsof -ti:8000)

# Or on Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Issue: Module Not Found
```
ModuleNotFoundError: No module named 'PIL'
```

**Solution**: Install dependencies
```bash
cd le-backend
pip install -r requirements.txt
```

### Issue: Import Errors
```
ImportError: cannot import name 'image_optimization_service'
```

**Solution**: Make sure all files are saved and restart
```bash
# Verify the file exists
ls -la app/services/image_optimization_service.py

# Restart with reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Verification Checklist

After restarting, verify:

- [ ] Backend server is running (check terminal output)
- [ ] No error messages in the logs
- [ ] Swagger UI loads at `http://localhost:8000/docs`
- [ ] New profile photo endpoints appear in Swagger UI
- [ ] Frontend can connect to backend
- [ ] Upload test works from Swagger UI

## Quick Test

1. **Go to Swagger UI**: `http://localhost:8000/docs`
2. **Find**: `POST /api/v1/users/{user_id}/profile-photo`
3. **Click**: "Try it out"
4. **Fill in**:
   - user_id: Your user ID
   - file: Select a test image
5. **Click**: "Execute"
6. **Expect**: 200 response with URLs

## Expected Response

```json
{
  "message": "Profile photo uploaded successfully",
  "user_id": "uuid",
  "urls": {
    "thumbnail": "https://...",
    "medium": "https://...",
    "large": "https://...",
    "original": "https://..."
  },
  "primary_url": "https://...",
  "cdn_cache_duration": 604800,
  "sizes_available": ["thumbnail", "medium", "large", "original"],
  "format": "webp",
  "uploaded_at": "2025-01-10T12:00:00Z"
}
```

## Still Not Working?

### Check Backend Logs
Look for these messages in the backend logs:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Check Route Registration
The backend should log route registration:
```python
# In the logs, you should see:
INFO:     Application startup complete.
```

### Verify File Changes
```bash
# Check if the routes are in the file
grep -n "profile-photo" le-backend/app/routers/users.py

# Should show:
# 2924:@router.post("/{user_id}/profile-photo", response_model=Dict[str, Any])
# 3044:@router.get("/{user_id}/profile-photo-urls")
# 3124:@router.delete("/{user_id}/profile-photo")
```

## Need Help?

If you're still having issues:

1. **Check the backend logs** for error messages
2. **Verify all files are saved** (no unsaved changes)
3. **Try a hard restart** (stop, wait 5 seconds, start)
4. **Check Python version** (should be 3.9+)
5. **Verify dependencies** are installed
6. **Check MinIO connection** (if upload fails)

## Summary

**The most common solution is simply restarting the backend server!**

```bash
# Stop the server (Ctrl+C)
# Then start it again:
cd le-backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

After restart, the new endpoints will be available and the 404 errors will be resolved.
