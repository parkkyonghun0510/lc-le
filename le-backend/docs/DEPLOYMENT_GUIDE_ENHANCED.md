# LC Workflow API - Enhanced Deployment Guide

## Overview

This guide provides comprehensive deployment procedures for the LC Workflow API with enhanced stability features, security improvements, and monitoring capabilities.

## Table of Contents

1. [Pre-deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Database Migration](#database-migration)
4. [Application Deployment](#application-deployment)
5. [Post-deployment Verification](#post-deployment-verification)
6. [Rollback Procedures](#rollback-procedures)
7. [Monitoring Setup](#monitoring-setup)
8. [Troubleshooting](#troubleshooting)

## Pre-deployment Checklist

### System Requirements

- **Python**: 3.9 or higher
- **PostgreSQL**: 13 or higher
- **MinIO**: Latest stable version
- **Redis**: 6.0 or higher (for caching)
- **Memory**: Minimum 2GB RAM
- **Storage**: Minimum 10GB free space
- **Network**: HTTPS support required

### Dependencies Verification

```bash
# Check Python version
python --version

# Check PostgreSQL connection
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT version();"

# Check MinIO accessibility
mc ping $MINIO_ENDPOINT

# Check Redis connection
redis-cli -h $REDIS_HOST ping
```

### Backup Procedures

**Critical**: Always create backups before deployment.

```bash
# Database backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql

# MinIO backup (if applicable)
mc mirror $MINIO_ENDPOINT/$BUCKET_NAME ./minio_backup_$(date +%Y%m%d_%H%M%S)/

# Application configuration backup
cp -r /path/to/app/config ./config_backup_$(date +%Y%m%d_%H%M%S)/
```

## Environment Setup

### Environment Variables

Create a comprehensive `.env` file:

```bash
# Database Configuration
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/dbname
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lc_workflow
DB_USER=lc_user
DB_PASSWORD=secure_password

# MinIO Configuration
MINIO_ENDPOINT=https://minio.example.com
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_BUCKET_NAME=lc-workflow-files
MINIO_SECURE=true

# Redis Configuration (for caching)
REDIS_URL=redis://localhost:6379/0
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Security Configuration
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENCRYPTION_KEY_PATH=/path/to/encryption.key

# File Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf,application/msword

# API Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=false
ALLOWED_ORIGINS=https://your-frontend.com,https://admin.your-domain.com

# Monitoring Configuration
ENABLE_METRICS=true
METRICS_PORT=9090
LOG_LEVEL=INFO
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project

# Feature Flags
ENABLE_MALWARE_SCANNING=true
ENABLE_FILE_ENCRYPTION=true
ENABLE_AUDIT_LOGGING=true
ENABLE_REAL_TIME_UPDATES=true
ENABLE_COMPREHENSIVE_HEALTH_CHECKS=true

# Performance Configuration
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
CACHE_TTL_SECONDS=300
RATE_LIMIT_REQUESTS_PER_MINUTE=60
```

### SSL/TLS Configuration

```bash
# Generate SSL certificates (if not using managed certificates)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Set proper permissions
chmod 600 key.pem
chmod 644 cert.pem
```

## Database Migration

### Pre-migration Checks

```bash
# Check current database schema version
python -c "
from app.database import engine
from alembic.config import Config
from alembic import command
from alembic.runtime.migration import MigrationContext

async def check_version():
    async with engine.begin() as conn:
        context = MigrationContext.configure(conn.sync_connection)
        current_rev = context.get_current_revision()
        print(f'Current revision: {current_rev}')

import asyncio
asyncio.run(check_version())
"

# Verify database connectivity
python -c "
import asyncio
from app.database import engine

async def test_connection():
    try:
        async with engine.begin() as conn:
            result = await conn.execute('SELECT 1')
            print('Database connection successful')
    except Exception as e:
        print(f'Database connection failed: {e}')

asyncio.run(test_connection())
"
```

### Migration Execution

```bash
# Create migration backup point
python -c "
import asyncio
from app.services.database_cleanup_service import DatabaseCleanupService

async def create_backup():
    service = DatabaseCleanupService()
    backup_id = await service.create_backup_point('pre_deployment_migration')
    print(f'Backup created: {backup_id}')

asyncio.run(create_backup())
"

# Run database migrations
alembic upgrade head

# Verify migration success
alembic current
alembic history --verbose
```

### Post-migration Verification

```bash
# Run database integrity checks
python -c "
import asyncio
from app.services.data_sync_verification_service import data_sync_verification_service
from app.database import get_db

async def verify_integrity():
    async for db in get_db():
        results = await data_sync_verification_service.run_comprehensive_verification(db)
        for name, result in results.items():
            print(f'{name}: {len(result.issues)} issues found')
        break

asyncio.run(verify_integrity())
"

# Check database constraints
python -c "
import asyncio
from app.database import engine

async def check_constraints():
    async with engine.begin() as conn:
        result = await conn.execute('''
            SELECT conname, contype, confupdtype, confdeltype 
            FROM pg_constraint 
            WHERE contype IN ('f', 'u', 'c')
            ORDER BY conname
        ''')
        constraints = result.fetchall()
        print(f'Found {len(constraints)} constraints')
        for constraint in constraints:
            print(f'  {constraint[0]}: {constraint[1]}')

asyncio.run(check_constraints())
"
```

## Application Deployment

### Deployment Methods

#### Method 1: Docker Deployment

```dockerfile
# Dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Start application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Build and deploy with Docker
docker build -t lc-workflow-api:latest .
docker run -d \
  --name lc-workflow-api \
  --env-file .env \
  -p 8000:8000 \
  --restart unless-stopped \
  lc-workflow-api:latest
```

#### Method 2: Direct Deployment

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start application with production server
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --keep-alive 2 \
  --max-requests 1000 \
  --max-requests-jitter 100 \
  --preload \
  --access-logfile - \
  --error-logfile -
```

#### Method 3: Railway Deployment

```toml
# railway.toml
[build]
builder = "NIXPACKS"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[[deploy.environmentVariables]]
name = "PORT"
value = "8000"

[[deploy.environmentVariables]]
name = "HOST"
value = "0.0.0.0"
```

```bash
# Deploy to Railway
railway login
railway link
railway up
```

### Load Balancer Configuration

#### Nginx Configuration

```nginx
upstream lc_workflow_api {
    server 127.0.0.1:8000;
    server 127.0.0.1:8001;  # Additional instances
    server 127.0.0.1:8002;
}

server {
    listen 80;
    server_name api.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # File upload size limit
    client_max_body_size 10M;

    location / {
        proxy_pass http://lc_workflow_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Health check
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
    }

    location /health {
        proxy_pass http://lc_workflow_api;
        access_log off;
    }

    location /metrics {
        proxy_pass http://lc_workflow_api;
        allow 10.0.0.0/8;
        deny all;
    }
}
```

## Post-deployment Verification

### Health Check Verification

```bash
# Basic health check
curl -f https://api.example.com/health

# Comprehensive health check
curl -H "Authorization: Bearer $TOKEN" \
     https://api.example.com/api/v1/monitoring/health/comprehensive

# Database connectivity
curl -H "Authorization: Bearer $TOKEN" \
     https://api.example.com/api/v1/health
```

### Functional Testing

```bash
# Test file upload
curl -X POST https://api.example.com/api/v1/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_document.pdf" \
  -F "document_type=borrower_photo"

# Test folder operations
curl -H "Authorization: Bearer $TOKEN" \
     https://api.example.com/api/v1/folders/document-types

# Test monitoring endpoints
curl -H "Authorization: Bearer $TOKEN" \
     https://api.example.com/api/v1/monitoring/metrics/dashboard
```

### Performance Testing

```bash
# Load testing with Apache Bench
ab -n 1000 -c 10 -H "Authorization: Bearer $TOKEN" \
   https://api.example.com/api/v1/health

# File upload performance test
for i in {1..10}; do
  time curl -X POST https://api.example.com/api/v1/files/upload \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@test_file_${i}.pdf" \
    -F "document_type=borrower_photo"
done
```

### Security Verification

```bash
# SSL/TLS verification
openssl s_client -connect api.example.com:443 -servername api.example.com

# Security headers check
curl -I https://api.example.com/

# Authentication verification
curl -X POST https://api.example.com/api/v1/files/upload \
  -F "file=@test.pdf"  # Should return 401 Unauthorized
```

## Rollback Procedures

### Immediate Rollback (Emergency)

```bash
# Stop current application
docker stop lc-workflow-api
# or
pkill -f "uvicorn app.main:app"

# Start previous version
docker run -d \
  --name lc-workflow-api-rollback \
  --env-file .env.backup \
  -p 8000:8000 \
  lc-workflow-api:previous-version

# Verify rollback
curl -f https://api.example.com/health
```

### Database Rollback

```bash
# Check current migration
alembic current

# Rollback to previous migration
alembic downgrade -1

# Or rollback to specific revision
alembic downgrade <revision_id>

# Restore from backup if needed
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backup_20240101_120000.sql
```

### Application Rollback

```bash
# Git-based rollback
git checkout <previous_commit_hash>
git push origin main --force

# Docker rollback
docker tag lc-workflow-api:current lc-workflow-api:rollback-backup
docker tag lc-workflow-api:previous lc-workflow-api:current
docker restart lc-workflow-api
```

### Configuration Rollback

```bash
# Restore previous configuration
cp config_backup_20240101_120000/.env .env
cp config_backup_20240101_120000/alembic.ini alembic.ini

# Restart application
docker restart lc-workflow-api
```

### Verification After Rollback

```bash
# Verify application health
curl -f https://api.example.com/health

# Check database integrity
python -c "
import asyncio
from app.services.data_sync_verification_service import data_sync_verification_service
from app.database import get_db

async def verify():
    async for db in get_db():
        results = await data_sync_verification_service.run_comprehensive_verification(db)
        print('Database integrity check completed')
        break

asyncio.run(verify())
"

# Test critical functionality
curl -X POST https://api.example.com/api/v1/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf" \
  -F "document_type=borrower_photo"
```

## Monitoring Setup

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'lc-workflow-api'
    static_configs:
      - targets: ['api.example.com:9090']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "LC Workflow API Monitoring",
    "panels": [
      {
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "avg(http_request_duration_seconds) by (method, endpoint)"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ]
      },
      {
        "title": "File Upload Success Rate",
        "type": "gauge",
        "targets": [
          {
            "expr": "rate(file_upload_total{status=\"success\"}[5m]) / rate(file_upload_total[5m]) * 100"
          }
        ]
      }
    ]
  }
}
```

### Alerting Rules

```yaml
# alerting_rules.yml
groups:
  - name: lc_workflow_api
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: DatabaseConnectionFailure
        expr: database_connections_failed_total > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failures"
          description: "Database connection failures detected"

      - alert: HighMemoryUsage
        expr: memory_usage_bytes / memory_total_bytes > 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is above 80%"
```

### Log Aggregation

```yaml
# docker-compose.yml for ELK stack
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.15.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:7.15.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5044:5044"

  kibana:
    image: docker.elastic.co/kibana/kibana:7.15.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues

**Symptoms**: 503 errors, database connection timeouts

**Diagnosis**:
```bash
# Check database connectivity
pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER

# Check connection pool status
curl -H "Authorization: Bearer $TOKEN" \
     https://api.example.com/api/v1/monitoring/health/comprehensive | \
     jq '.components[] | select(.name == "database")'
```

**Solutions**:
- Increase database connection pool size
- Check database server resources
- Verify network connectivity
- Review database logs

#### 2. File Upload Failures

**Symptoms**: File uploads return 500 errors, files not appearing

**Diagnosis**:
```bash
# Check MinIO connectivity
mc ping $MINIO_ENDPOINT

# Check file upload logs
docker logs lc-workflow-api | grep "file_upload"

# Test malware scanner
curl -X POST https://api.example.com/api/v1/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf" \
  -v
```

**Solutions**:
- Verify MinIO credentials and connectivity
- Check file size and type restrictions
- Review malware scanner configuration
- Verify disk space availability

#### 3. Performance Issues

**Symptoms**: Slow response times, timeouts

**Diagnosis**:
```bash
# Check system resources
top
df -h
free -m

# Check API metrics
curl -H "Authorization: Bearer $TOKEN" \
     https://api.example.com/api/v1/monitoring/metrics/dashboard

# Check database performance
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;"
```

**Solutions**:
- Scale application instances
- Optimize database queries
- Implement caching
- Review resource allocation

#### 4. Security Issues

**Symptoms**: Authentication failures, unauthorized access

**Diagnosis**:
```bash
# Check JWT token validity
python -c "
import jwt
token = 'your_token_here'
try:
    decoded = jwt.decode(token, verify=False)
    print('Token valid:', decoded)
except:
    print('Token invalid')
"

# Check audit logs
curl -H "Authorization: Bearer $TOKEN" \
     https://api.example.com/api/v1/monitoring/alerts/active
```

**Solutions**:
- Verify JWT secret key
- Check token expiration settings
- Review user permissions
- Update security configurations

### Emergency Contacts

- **DevOps Team**: devops@example.com
- **Database Admin**: dba@example.com
- **Security Team**: security@example.com
- **On-call Engineer**: +1-555-0123

### Support Resources

- **Documentation**: https://docs.example.com
- **Status Page**: https://status.example.com
- **Monitoring Dashboard**: https://monitoring.example.com
- **Log Viewer**: https://logs.example.com

## Maintenance Procedures

### Regular Maintenance Tasks

#### Daily
- Check system health status
- Review error logs
- Monitor resource usage
- Verify backup completion

#### Weekly
- Update security patches
- Review performance metrics
- Clean up old log files
- Test backup restoration

#### Monthly
- Update dependencies
- Review security configurations
- Optimize database performance
- Update documentation

### Scheduled Maintenance

```bash
# Maintenance script
#!/bin/bash

# Log cleanup
find /var/log/lc-workflow -name "*.log" -mtime +30 -delete

# Database maintenance
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "VACUUM ANALYZE;"

# Cache cleanup
redis-cli FLUSHDB

# Health check
curl -f https://api.example.com/health || echo "Health check failed"

# Backup verification
python -c "
from app.services.database_cleanup_service import DatabaseCleanupService
import asyncio

async def verify_backups():
    service = DatabaseCleanupService()
    backups = await service.list_backup_points()
    print(f'Available backups: {len(backups)}')

asyncio.run(verify_backups())
"
```

This comprehensive deployment guide provides all necessary procedures for safely deploying, monitoring, and maintaining the LC Workflow API with enhanced stability features.