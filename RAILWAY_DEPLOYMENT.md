# Railway Deployment Guide

This guide will walk you through deploying your FastAPI application to Railway with PostgreSQL and MinIO.

## Quick Start

### 1. Prerequisites
- Railway account: https://railway.app
- GitHub repository with your code
- Railway CLI (optional): `npm install -g @railway/cli`

### 2. Environment Variables Setup

Copy these variables to Railway dashboard:

```bash
# Database (Railway PostgreSQL)
DATABASE_URL=postgresql+asyncpg://postgres:ILpXLUiueRVhRHLpEdgGTrVVAFDKvJfE@centerbeam.proxy.rlwy.net:47060/railway

# MinIO (Railway Bucket Service)
MINIO_ENDPOINT=${CONSOLE_MINIO_SERVER}
MINIO_ACCESS_KEY=${USERNAME}
MINIO_SECRET_KEY=${PASSWORD}
MINIO_BUCKET_NAME=lc-workflow-files
MINIO_SECURE=true

# Security (Generate new secret)
SECRET_KEY=GENERATE_NEW_SECRET_HERE
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS (Update with your Railway domain)
CORS_ORIGINS=https://your-app.railway.app

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=false
```

### 3. Deployment Steps

#### Method A: Railway Dashboard (Recommended)

1. **Create Railway Project**
   - Go to https://railway.app/new
   - Click "Deploy from GitHub repo"
   - Select your repository

2. **Add PostgreSQL**
   - Click "New" → "Database" → "PostgreSQL"
   - Wait for deployment
   - Copy the connection string

3. **Add MinIO**
   - Click "New" → "Template" → Search "MinIO"
   - Deploy MinIO service
   - Note the connection details

4. **Configure Environment Variables**
   - Go to your FastAPI service
   - Settings → Variables
   - Add all variables from above

5. **Deploy**
   - Railway will automatically deploy on push
   - Or click "Deploy" manually

#### Method B: Railway CLI

```bash
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up

# Set environment variables
railway variables set DATABASE_URL="postgresql+asyncpg://..."
railway variables set SECRET_KEY="your-secret-key"
# ... set all other variables

# Run migrations
railway run alembic upgrade head
```

### 4. Generate Secret Key

Run this command to generate a secure secret key:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 5. Database Migration

After deployment, run:

```bash
railway run alembic upgrade head
```

Or via Railway dashboard:
- Go to your service
- Click "Deploy" → "Command"
- Enter: `alembic upgrade head`

### 6. Verify Deployment

- **Health Check**: https://your-app.railway.app/api/v1/health
- **API Docs**: https://your-app.railway.app/docs
- **Redoc**: https://your-app.railway.app/redoc

### 7. Troubleshooting

#### Common Issues

1. **Database Connection**
   - Ensure PostgreSQL is linked to your service
   - Check DATABASE_URL format

2. **MinIO Connection**
   - Verify MINIO_ENDPOINT format (without https://)
   - Check credentials

3. **Port Issues**
   - Ensure PORT=${PORT} in environment variables
   - Railway assigns port automatically

4. **Dependencies**
   - Ensure psycopg2-binary is in requirements.txt
   - Check all imports

#### Debug Mode

Set `DEBUG=true` temporarily to see detailed error messages.

### 8. Railway-Specific Files

Your project now includes:
- `Procfile`: Railway deployment command
- `railway.toml`: Railway configuration
- `.env.railway.example`: Environment variables template
- `.gitignore`: Excludes sensitive files

### 9. Production Checklist

- [ ] Generate new SECRET_KEY
- [ ] Update CORS_ORIGINS with your domain
- [ ] Set DEBUG=false
- [ ] Verify database connection
- [ ] Test MinIO file upload
- [ ] Run database migrations
- [ ] Test all API endpoints
- [ ] Set up custom domain (optional)

### 10. Support

- Railway Docs: https://docs.railway.com
- Railway Discord: https://discord.gg/railway
- FastAPI Docs: https://fastapi.tiangolo.com