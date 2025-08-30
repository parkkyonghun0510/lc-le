# Railway Frontend Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Prerequisites
- Railway account (https://railway.app/)
- GitHub repository with your code
- Backend already deployed on Railway (get the URL)

### 2. Deploy to Railway

#### Option A: Deploy from GitHub (Recommended)
1. Go to [Railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository: `le-workflow-project`
5. Select the `lc-workflow-frontend` folder as the root
6. Railway will automatically detect the Dockerfile
7. Click "Deploy"

#### Option B: Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Navigate to frontend directory
cd lc-workflow-frontend

# Initialize and deploy
railway init
railway up
```

### 3. Configure Environment Variables

In Railway Dashboard → Your Service → Variables, add:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend-app.railway.app/api/v1/` | Backend API URL |
| `NEXT_PUBLIC_WS_URL` | `wss://your-backend-app.railway.app/api/ws/` | WebSocket URL |
| `NEXT_SECRET_KEY` | `generate-new-secret-key` | Encryption key |
| `NEXT_PUBLIC_APP_NAME` | `LC Workflow` | App name |
| `NODE_ENV` | `production` | Environment |
| `NEXT_TELEMETRY_DISABLED` | `1` | Disable telemetry |

### 4. Generate Production Secret Key

```bash
# Generate a secure secret key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 📋 Deployment Checklist

- [ ] Backend deployed and running on Railway
- [ ] Frontend repository pushed to GitHub
- [ ] Railway project created
- [ ] Environment variables configured
- [ ] Deployment successful
- [ ] Frontend accessible via Railway URL
- [ ] API connectivity working
- [ ] Authentication flows tested

## 🔧 Configuration Files

### railway.toml
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "node server.js"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[environment]
NODE_ENV = "production"
PORT = "3000"
NEXT_TELEMETRY_DISABLED = "1"
```

### Dockerfile
- ✅ Multi-stage build for optimization
- ✅ Node.js 18 Alpine for security
- ✅ Standalone output configuration
- ✅ Production optimizations

### next.config.ts
```typescript
const nextConfig: NextConfig = {
  output: 'standalone', // Required for Railway
};
```

## 🌐 Post-Deployment

### 1. Verify Deployment
- Frontend URL: `https://your-frontend-app.railway.app`
- Check console for any errors
- Test navigation and UI components

### 2. Test API Connectivity
- Login functionality
- Data fetching from backend
- File upload/download features
- Real-time WebSocket connections

### 3. Update Backend CORS
Ensure your backend includes the frontend Railway URL in CORS origins:
```env
CORS_ORIGINS=https://your-frontend-app.railway.app,https://yourdomain.com
```

## 🔍 Troubleshooting

### Common Issues

1. **Build Fails**
   - Check Railway build logs
   - Verify all dependencies in package.json
   - Ensure Dockerfile syntax is correct

2. **API Connection Issues**
   - Verify `NEXT_PUBLIC_API_URL` is correct
   - Check backend CORS configuration
   - Ensure backend is running and accessible

3. **Environment Variables Not Working**
   - Variables must start with `NEXT_PUBLIC_` for client-side access
   - Restart deployment after adding variables
   - Check Railway Variables section

4. **WebSocket Connection Fails**
   - Use `wss://` for secure WebSocket connections
   - Verify backend WebSocket endpoint is working
   - Check browser console for connection errors

### Debug Commands

```bash
# Check Railway logs
railway logs

# Redeploy
railway up --detach

# Check service status
railway status
```

## 🎯 Performance Optimization

### Already Configured
- ✅ Standalone build for smaller container
- ✅ Multi-stage Docker build
- ✅ Production optimizations
- ✅ Telemetry disabled

### Additional Optimizations
- Set up CDN for static assets
- Configure custom domain
- Enable gzip compression
- Monitor performance metrics

## 🔒 Security Considerations

- ✅ Environment variables properly configured
- ✅ Production secret key generated
- ✅ HTTPS enforced by Railway
- ✅ Secure WebSocket connections (WSS)

## 📞 Support

If you encounter issues:
1. Check Railway deployment logs
2. Verify environment variables
3. Test backend connectivity
4. Review this troubleshooting guide
5. Check Railway documentation

---

**🎉 Your LC Workflow Frontend is ready for Railway deployment!**