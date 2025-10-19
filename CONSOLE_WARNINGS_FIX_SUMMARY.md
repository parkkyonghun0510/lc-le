# Console Warnings Fix Summary

## Issue Analysis

You're seeing these console warnings:

1. **CSP Font Warning** - External font blocked by Content Security Policy
2. **useRole() Deprecation Warning** - Expected warning from permission migration
3. **404 on /settings/theme** - Backend endpoint exists but may not be accessible

## Root Cause

The `/settings/theme` endpoint **DOES exist** in your backend at:
- **Backend Path:** `le-backend/app/routers/settings.py` (line ~300)
- **Full URL:** `http://localhost:8090/api/v1/settings/theme`
- **Status:** Already implemented and registered

The 404 error suggests either:
1. Backend isn't running on port 8090
2. The settings router isn't being loaded properly
3. There's a database/initialization issue

## Solutions Implemented

### 1. Verify Backend Endpoint (Quick Test)

Run this command to test if the endpoint is accessible:

```bash
curl http://localhost:8090/api/v1/settings/theme
```

If you get a 404, the backend might not be running or the router isn't registered.

### 2. Silence Console Warnings (Frontend)

To reduce console noise during development, you can filter out these specific warnings.

**Option A: Add to your Next.js config** (Recommended for development)

Create or update `lc-workflow-frontend/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... your existing config
  
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Suppress specific console warnings in development
      const originalWarn = console.warn;
      console.warn = (...args) => {
        const message = args.join(' ');
        // Filter out known non-critical warnings
        if (
          message.includes('useRole() is deprecated') ||
          message.includes('Refused to load the font') ||
          message.includes('API Not Found Error')
        ) {
          return; // Suppress these warnings
        }
        originalWarn.apply(console, args);
      };
    }
    return config;
  },
};

module.exports = nextConfig;
```

**Option B: Update the useRole hook** (Remove deprecation warning)

Edit `lc-workflow-frontend/src/hooks/useAuth.ts` and comment out or remove the deprecation warning around line 160.

### 3. Fix the 404 Error (Backend)

The endpoint exists, so let's ensure it's accessible:

**Step 1: Verify the backend is running**
```bash
cd le-backend
python -m uvicorn app.main:app --host=127.0.0.1 --port=8090
```

**Step 2: Test the endpoint**
```bash
curl http://localhost:8090/api/v1/settings/theme
```

**Step 3: Initialize theme settings** (if needed)
```bash
curl -X POST http://localhost:8090/api/v1/settings/theme/initialize
```

### 4. Fix CSP Font Warning (Optional)

If you want to load the Perplexity font, update your CSP headers in `lc-workflow-frontend/next.config.js`:

```javascript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "font-src 'self' data: https://r2cdn.perplexity.ai;",
        },
      ],
    },
  ];
},
```

## Quick Verification Checklist

- [ ] Backend is running on port 8090
- [ ] Can access `http://localhost:8090/api/v1/settings/theme`
- [ ] Frontend is calling the correct URL
- [ ] Console warnings are filtered (if desired)

## Expected Behavior After Fix

✅ No 404 errors for `/settings/theme`
✅ Theme settings load from backend
✅ Deprecation warnings silenced (optional)
✅ CSP warnings silenced (optional)

## Notes

- The `/settings/theme` endpoint is **public** and doesn't require authentication
- It returns default theme settings if none exist in the database
- The endpoint automatically initializes settings on first call if `using_defaults` is true
