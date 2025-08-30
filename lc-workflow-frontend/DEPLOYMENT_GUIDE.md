# Railway Deployment Guide

This guide provides step-by-step instructions for deploying the LC Workflow Frontend to Railway, including troubleshooting steps for common issues.

## Prerequisites

- GitHub repository with your code
- Railway account
- Environment variables configured

## Deployment Configuration

### 1. Railway Configuration (`railway.toml`)

```toml
[build]
builder = "dockerfile"

[deploy]
startCommand = "node server.js"
```

**Key Points:**
- Uses Dockerfile for build process
- Removed conflicting `[nix]` packages section
- Start command points to Next.js standalone server

### 2. Dockerfile Configuration

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

**Key Features:**
- Uses Node.js 20 Alpine for smaller image size
- Multi-stage build for optimization
- Proper file permissions and security
- Standalone output for faster deployments

### 3. Next.js Configuration (`next.config.ts`)

```typescript
const nextConfig: NextConfig = {
  output: 'standalone', // Required for Railway deployment
  // ... other configurations
};
```

## Deployment Steps

### Step 1: Verify Local Build

Run the deployment verification script:

```bash
node scripts/verify-deployment.js
```

This script checks:
- ✅ Required files exist
- ✅ Package.json scripts are configured
- ✅ Next.js standalone output is enabled
- ✅ Build process completes successfully
- ✅ Standalone output is generated
- ✅ Dockerfile configuration is correct
- ✅ Railway configuration is valid

### Step 2: Push to GitHub

```bash
git add .
git commit -m "Configure Railway deployment"
git push origin main
```

### Step 3: Deploy to Railway

1. **Connect Repository:**
   - Go to Railway Dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

2. **Configure Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
   NEXT_SECRET_KEY=your-secret-key
   NODE_ENV=production
   ```

3. **Deploy:**
   - Railway will automatically detect the Dockerfile
   - Build process will start automatically
   - Monitor deployment logs

## Troubleshooting

### Common Issues and Solutions

#### 1. Build Failures

**Problem:** TypeScript errors during build

**Solution:** 
- Check ESLint configuration in `eslint.config.mjs`
- Ensure all TypeScript errors are resolved
- Use type casting (`as any`) for complex type issues

**Problem:** Missing dependencies

**Solution:**
```bash
npm install
npm run build  # Test locally first
```

#### 2. Runtime Errors

**Problem:** Server fails to start

**Solution:**
- Verify `railway.toml` start command: `node server.js`
- Check that standalone output is generated
- Ensure environment variables are set

**Problem:** API connection issues

**Solution:**
- Verify `NEXT_PUBLIC_API_URL` environment variable
- Check backend service is running
- Ensure CORS is configured on backend

#### 3. Configuration Issues

**Problem:** Conflicting build configurations

**Solution:**
- Remove `[nix]` section from `railway.toml`
- Use Dockerfile builder only
- Ensure `next.config.ts` has `output: 'standalone'`

**Problem:** Large build size or slow deployments

**Solution:**
- Verify multi-stage Dockerfile is used
- Check `.dockerignore` excludes unnecessary files
- Use Node.js Alpine images for smaller size

### Debugging Commands

```bash
# Test build locally
npm run build

# Check standalone output
ls -la .next/standalone/

# Test production server locally
cd .next/standalone && node server.js

# Verify Docker build
docker build -t lc-frontend .
docker run -p 3000:3000 lc-frontend
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://api.example.com` |
| `NEXT_SECRET_KEY` | Secret key for sessions | `generated-secret-key` |
| `NODE_ENV` | Environment mode | `production` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `PORT` | Server port | `3000` |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | `1` |

## Performance Optimization

### Build Optimization

1. **Standalone Output:** Reduces deployment size by ~70%
2. **Multi-stage Docker:** Separates build and runtime dependencies
3. **Alpine Images:** Smaller base images for faster deployments
4. **Static Asset Optimization:** Proper copying of static files

### Runtime Optimization

1. **Environment Variables:** Set `NODE_ENV=production`
2. **Caching:** Enable Next.js built-in caching
3. **Compression:** Railway automatically handles gzip compression

## Monitoring and Logs

### Railway Dashboard

- **Deployments:** View build and deployment history
- **Logs:** Real-time application logs
- **Metrics:** CPU, memory, and network usage
- **Environment:** Manage environment variables

### Log Analysis

```bash
# Common log patterns to watch for:
# ✅ "Server listening on port 3000"
# ❌ "Error: Cannot find module"
# ❌ "TypeError: Cannot read property"
# ❌ "ECONNREFUSED" (API connection issues)
```

## Security Considerations

1. **Environment Variables:** Never commit secrets to repository
2. **HTTPS:** Railway provides automatic HTTPS
3. **CORS:** Configure backend to allow frontend domain
4. **CSP:** Consider Content Security Policy headers

## Rollback Strategy

1. **Railway Dashboard:** Use "Redeploy" with previous commit
2. **Git Revert:** Revert problematic commits and redeploy
3. **Environment Rollback:** Restore previous environment variables

## Support and Resources

- **Railway Documentation:** https://docs.railway.app/
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **Docker Best Practices:** https://docs.docker.com/develop/dev-best-practices/

---

**Last Updated:** January 2025
**Verified With:** Next.js 15.4.5, Node.js 20, Railway Platform