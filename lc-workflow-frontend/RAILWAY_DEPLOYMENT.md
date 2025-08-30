# Railway Deployment Guide

This guide explains how to deploy the LC Workflow Frontend application to Railway.

## Prerequisites

1. A Railway account (https://railway.app/)
2. A GitHub account with the repository cloned
3. The backend API deployed and running

## Deployment Steps

### 1. Prepare the Application

Ensure you have the following files in your repository:
- `Dockerfile` - Defines how to build the application
- `railway.toml` - Railway configuration file
- `.dockerignore` - Specifies files to exclude from Docker build

### 2. Configure Environment Variables

Before deploying, you'll need to set the following environment variables in Railway:

1. Go to your Railway project dashboard
2. Click on "Variables" in your service settings
3. Add the following environment variables:

| Variable Name | Description | Example Value |
|---------------|-------------|---------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://your-backend.up.railway.app/api/v1/` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | `wss://your-backend.up.railway.app/api/ws/` |
| `NEXT_SECRET_KEY` | Secret key for encryption | `your-secret-key-here` |

### 3. Deploy to Railway

#### Option 1: Deploy from GitHub (Recommended)

1. In Railway, click "New Project"
2. Select "Deploy from GitHub"
3. Choose your repository
4. Railway will automatically detect the Dockerfile
5. Click "Deploy"

#### Option 2: Deploy using Railway CLI

1. Install the Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Initialize the project:
   ```bash
   railway init
   ```

4. Deploy the application:
   ```bash
   railway up
   ```

### 4. Configure Domain (Optional)

1. In your Railway project, go to "Settings"
2. Click "Custom Domains"
3. Add your custom domain
4. Follow the DNS configuration instructions

### 5. Monitoring and Logs

1. In Railway, select your service
2. Click "Logs" to view real-time logs
3. Set up alerts if needed in the "Monitoring" section

## Environment Variables Explained

- `NEXT_PUBLIC_API_URL`: The URL of your backend API. This must be publicly accessible.
- `NEXT_PUBLIC_WS_URL`: The WebSocket URL for real-time features.
- `NEXT_SECRET_KEY`: A secret key used for encryption. Generate a strong random string.

## Troubleshooting

### Build Issues

If the build fails:
1. Check the logs for specific error messages
2. Ensure all dependencies are properly listed in package.json
3. Verify the Dockerfile is correct

### Runtime Issues

If the application doesn't start:
1. Check that all environment variables are set correctly
2. Verify the backend API URL is accessible
3. Check the application logs for errors

### Performance Issues

If the application is slow:
1. Check Railway's resource usage metrics
2. Consider upgrading your Railway plan
3. Optimize images and assets

## Updating the Deployment

To update your deployed application:

1. Push changes to your GitHub repository
2. Railway will automatically redeploy if auto-deploy is enabled
3. Or manually trigger a deploy from the Railway dashboard

## Best Practices

1. Always test changes locally before deploying
2. Use environment-specific configuration
3. Monitor application performance and errors
4. Regularly update dependencies for security
5. Use Railway's preview environments for testing