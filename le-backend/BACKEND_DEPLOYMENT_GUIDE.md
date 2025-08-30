# LC Workflow Backend - Railway Deployment Guide

This guide provides comprehensive instructions for deploying the LC Workflow FastAPI backend to Railway.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Configuration Files](#configuration-files)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [Deployment Steps](#deployment-steps)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)
9. [Monitoring & Logging](#monitoring--logging)
10. [Security Considerations](#security-considerations)

## Prerequisites

- Railway account ([railway.app](https://railway.app))
- Git repository with your backend code
- Basic understanding of FastAPI and PostgreSQL
- Node.js (for running verification scripts)

## Project Structure

```
le-backend/
├── app/
│   ├── core/
│   │   ├── config.py          # Application configuration
│   │   └── security.py        # Security utilities
│   ├── routers/               # API route handlers
│   ├── models.py              # Database models
│   ├── schemas.py             # Pydantic schemas
│   └── main.py                # FastAPI application
├── migrations/                # Alembic database migrations
├── scripts/
│   └── verify-backend-deployment.js  # Deployment verification
├── requirements.txt           # Python dependencies
├── railway.toml              # Railway configuration
├── Dockerfile                # Container configuration
├── alembic.ini               # Database migration config
└── .env.production           # Environment template
```

## Configuration Files

### 1. railway.toml

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "alembic upgrade head && uvicorn app.main:app --host=0.0.0.0 --port=$PORT"
healthcheckPath = "/api/v1/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

# Environment variables for Railway deployment
[env]
PYTHON_VERSION = "3.11"
PIP_NO_CACHE_DIR = "1"
PIP_DISABLE_PIP_VERSION_CHECK = "1"

# Build configuration
[build.env]
PYTHON_VERSION = "3.11"
```

### 2. Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    redis-tools \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create upload directory
RUN mkdir -p uploads

# Expose port (Railway will set PORT environment variable)
EXPOSE $PORT

# Health check - use PORT environment variable
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/v1/health || exit 1

# Run the application - Railway will provide PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

### 3. requirements.txt

Ensure all required dependencies are listed:

```txt
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
sqlalchemy>=2.0.20
psycopg2-binary>=2.9.0
alembic>=1.12.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.6
redis>=5.0.0
python-dotenv>=1.0.0
pydantic[email]>=2.5.0
pydantic-settings>=2.1.0
asyncpg>=0.29.0
aioredis>=2.0.0
aiofiles>=23.2.0
pillow>=10.0.0
pytest>=7.4.0
minio>=7.2.0
pytest-asyncio>=0.21.0
httpx>=0.25.0
aiosqlite
python-dateutil>=2.8.0
```

## Environment Variables

### Required Variables

Set these in Railway Dashboard → Your Service → Variables:

#### Database Configuration
```bash
# Railway PostgreSQL (auto-generated when you add PostgreSQL service)
DATABASE_URL=postgresql+asyncpg://postgres:password@host:port/railway
```

#### Security Settings
```bash
# Generate a secure 32-character secret key
SECRET_KEY=your-32-character-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

#### CORS Configuration
```bash
# Add your frontend URLs (comma-separated)
CORS_ORIGINS=https://your-frontend-app.railway.app,https://yourdomain.com
```

#### Server Configuration
```bash
HOST=0.0.0.0
# PORT is automatically provided by Railway - don't set it
DEBUG=false
```

### Optional Variables

#### File Storage (MinIO/S3)
```bash
MINIO_ENDPOINT=your-minio-service.railway.app
MINIO_ACCESS_KEY=your-minio-access-key
MINIO_SECRET_KEY=your-minio-secret-key
MINIO_BUCKET_NAME=lc-workflow-files
MINIO_SECURE=true
```

#### Security Settings
```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60
MIN_PASSWORD_LENGTH=8
REQUIRE_PASSWORD_SPECIAL_CHARS=true
REQUIRE_PASSWORD_NUMBERS=true
REQUIRE_PASSWORD_UPPERCASE=true
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=lax
```

## Database Setup

### 1. Add PostgreSQL Service

1. In Railway Dashboard, click "New Service"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically generate `DATABASE_URL`
4. Copy the `DATABASE_URL` to your environment variables

### 2. Database Migrations

Migrations run automatically during deployment via the start command:
```bash
alembic upgrade head && uvicorn app.main:app --host=0.0.0.0 --port=$PORT
```

### 3. Seed Data (Optional)

If you need to populate initial data:

1. Connect to your Railway PostgreSQL using the provided credentials
2. Run your seed scripts manually, or
3. Add seed commands to your start command in `railway.toml`

## Deployment Steps

### Step 1: Prepare Your Repository

1. **Verify Configuration**
   ```bash
   # Run the verification script
   node scripts/verify-backend-deployment.js
   ```

2. **Commit Changes**
   ```bash
   git add .
   git commit -m "Configure backend for Railway deployment"
   git push origin main
   ```

### Step 2: Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Select the backend directory if using monorepo

### Step 3: Add Database Service

1. In your Railway project, click "New Service"
2. Select "Database" → "PostgreSQL"
3. Wait for the database to be provisioned
4. Copy the `DATABASE_URL` from the database service

### Step 4: Configure Environment Variables

1. Go to your backend service → "Variables" tab
2. Add all required environment variables (see [Environment Variables](#environment-variables))
3. **Important**: Use the `DATABASE_URL` from your PostgreSQL service

### Step 5: Deploy

1. Railway will automatically deploy when you push to your main branch
2. Monitor the deployment logs in Railway Dashboard
3. Wait for the deployment to complete

### Step 6: Verify Deployment

1. Check the service URL in Railway Dashboard
2. Test the health endpoint: `https://your-service.railway.app/api/v1/health`
3. Verify API documentation: `https://your-service.railway.app/docs`

## Verification

### Automated Verification

Run the deployment verification script:

```bash
node scripts/verify-backend-deployment.js
```

### Manual Verification

1. **Health Check**
   ```bash
   curl https://your-service.railway.app/api/v1/health
   ```

2. **API Documentation**
   Visit: `https://your-service.railway.app/docs`

3. **Database Connection**
   Check logs for successful database connection

4. **CORS Configuration**
   Test API calls from your frontend

## Troubleshooting

### Common Issues

#### 1. Build Failures

**Problem**: Build fails during dependency installation

**Solutions**:
- Check `requirements.txt` for syntax errors
- Verify Python version compatibility
- Check Railway build logs for specific errors

```bash
# View build logs in Railway Dashboard
# Or use Railway CLI
railway logs --service your-service-name
```

#### 2. Database Connection Errors

**Problem**: `sqlalchemy.exc.OperationalError` or connection timeouts

**Solutions**:
- Verify `DATABASE_URL` format: `postgresql+asyncpg://user:pass@host:port/db`
- Ensure PostgreSQL service is running
- Check network connectivity between services

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT version();"
```

#### 3. Migration Failures

**Problem**: Alembic migrations fail during startup

**Solutions**:
- Check migration files for syntax errors
- Verify database schema compatibility
- Run migrations manually if needed

```bash
# Connect to Railway service and run migrations
railway shell
alembic upgrade head
```

#### 3a. AsyncEngine Driver Error

**Problem**: `sqlalchemy.exc.InvalidRequestError: The asyncio extension requires an async driver to be used. The loaded 'psycopg2' is not async.`

**Root Cause**: Alembic is trying to use psycopg2 (synchronous driver) with AsyncEngine

**Solution**: The backend has been configured to automatically handle this by:

1. **Automatic URL conversion** in `migrations/env.py`:
   ```python
   # Convert psycopg2 URL to asyncpg for async operations
   if database_url.startswith("postgresql://"):
       database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
   elif database_url.startswith("postgres://"):
       database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
   ```

2. **Using create_async_engine** instead of AsyncEngine wrapper:
   ```python
   connectable = create_async_engine(
       configuration["sqlalchemy.url"],
       poolclass=pool.NullPool,
       future=True,
   )
   ```

3. **AsyncPG dependency** included in `requirements.txt`:
   ```
   asyncpg>=0.29.0
   ```

**Verification**: Run the deployment verification script:
```bash
node scripts/verify-backend-deployment.js
```

#### 4. CORS Errors

**Problem**: Frontend cannot access API due to CORS

**Solutions**:
- Add frontend URL to `CORS_ORIGINS` environment variable
- Verify URL format (include protocol: `https://`)
- Check for trailing slashes

#### 5. Environment Variable Issues

**Problem**: Configuration not loading correctly

**Solutions**:
- Verify variable names match exactly (case-sensitive)
- Check for special characters in values
- Restart service after changing variables

### Debugging Commands

```bash
# View service logs
railway logs --service backend

# Connect to service shell
railway shell --service backend

# Check environment variables
railway variables --service backend

# Restart service
railway redeploy --service backend
```

### Performance Issues

#### 1. Slow Response Times

**Solutions**:
- Enable database connection pooling
- Add database indexes for frequently queried fields
- Implement caching with Redis
- Optimize database queries

#### 2. Memory Usage

**Solutions**:
- Monitor memory usage in Railway Dashboard
- Optimize SQLAlchemy session management
- Implement pagination for large datasets
- Use streaming responses for large files

## Monitoring & Logging

### Railway Dashboard

1. **Metrics**: Monitor CPU, memory, and network usage
2. **Logs**: View application and system logs
3. **Deployments**: Track deployment history and status

### Application Logging

Configure structured logging in your FastAPI app:

```python
import logging
from fastapi import FastAPI

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

app = FastAPI()

@app.middleware("http")
async def log_requests(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    logger.info(
        f"{request.method} {request.url} - {response.status_code} - {process_time:.4f}s"
    )
    return response
```

### Health Monitoring

The health endpoint provides system status:

```python
@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "database": "connected",  # Add actual DB check
        "redis": "connected"     # Add actual Redis check
    }
```

## Security Considerations

### 1. Environment Variables

- Never commit secrets to version control
- Use Railway's environment variable management
- Rotate secrets regularly
- Use strong, unique passwords

### 2. Database Security

- Use Railway's managed PostgreSQL (includes security patches)
- Enable SSL connections
- Implement proper access controls
- Regular backups (Railway handles this automatically)

### 3. API Security

- Implement rate limiting
- Use HTTPS only (Railway provides this automatically)
- Validate all input data
- Implement proper authentication and authorization

### 4. CORS Configuration

- Restrict origins to known domains only
- Avoid using wildcard (`*`) in production
- Regularly review and update allowed origins

## Performance Optimization

### 1. Database Optimization

```python
# Use connection pooling
from sqlalchemy.pool import QueuePool

engine = create_async_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True
)
```

### 2. Caching

```python
# Implement Redis caching
from aioredis import Redis

redis = Redis.from_url(REDIS_URL)

@app.get("/api/v1/cached-data")
async def get_cached_data():
    cached = await redis.get("data_key")
    if cached:
        return json.loads(cached)
    
    # Fetch from database
    data = await fetch_from_db()
    await redis.setex("data_key", 300, json.dumps(data))
    return data
```

### 3. Response Optimization

```python
# Use response compression
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)

# Implement pagination
@app.get("/api/v1/items")
async def get_items(skip: int = 0, limit: int = 100):
    items = await db.fetch_items(skip=skip, limit=limit)
    return {"items": items, "skip": skip, "limit": limit}
```

## Rollback Strategy

### 1. Railway Rollback

```bash
# View deployment history
railway deployments

# Rollback to previous deployment
railway rollback <deployment-id>
```

### 2. Database Rollback

```bash
# Rollback database migrations
alembic downgrade -1  # Go back one migration
alembic downgrade <revision>  # Go to specific revision
```

### 3. Environment Rollback

- Keep backup of working environment variables
- Document all configuration changes
- Test rollback procedures in staging environment

## Support and Resources

- [Railway Documentation](https://docs.railway.app/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)

---

**Note**: This guide assumes you're deploying to Railway. Adjust configurations as needed for other platforms.

For additional support, check the Railway community Discord or create an issue in your project repository.