# LC Workflow API - Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting procedures for common issues in the LC Workflow API system, including diagnostic steps, solutions, and prevention strategies.

## Table of Contents

1. [System Health Issues](#system-health-issues)
2. [File Upload Problems](#file-upload-problems)
3. [Database Issues](#database-issues)
4. [Folder Organization Problems](#folder-organization-problems)
5. [Authentication and Authorization](#authentication-and-authorization)
6. [Performance Issues](#performance-issues)
7. [Security Concerns](#security-concerns)
8. [Data Synchronization Issues](#data-synchronization-issues)
9. [Monitoring and Alerting](#monitoring-and-alerting)
10. [Emergency Procedures](#emergency-procedures)

## System Health Issues

### Issue: API Returns 503 Service Unavailable

**Symptoms**:
- API endpoints return HTTP 503 errors
- Health check endpoints fail
- Application appears unresponsive

**Diagnostic Steps**:

```bash
# Check application status
curl -I https://api.example.com/health

# Check comprehensive health
curl -H "Authorization: Bearer $TOKEN" \
     https://api.example.com/api/v1/monitoring/health/comprehensive

# Check application logs
docker logs lc-workflow-api --tail 100

# Check system resources
top
df -h
free -m
```

**Common Causes & Solutions**:

1. **Database Connection Issues**
   ```bash
   # Test database connectivity
   pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER
   
   # Check connection pool
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
   SELECT count(*) as active_connections 
   FROM pg_stat_activity 
   WHERE state = 'active';"
   ```
   
   **Solution**: Increase connection pool size or restart database service

2. **MinIO Storage Unavailable**
   ```bash
   # Test MinIO connectivity
   mc ping $MINIO_ENDPOINT
   
   # Check MinIO status
   mc admin info $MINIO_ENDPOINT
   ```
   
   **Solution**: Restart MinIO service or check network connectivity

3. **Memory/Resource Exhaustion**
   ```bash
   # Check memory usage
   free -m
   
   # Check disk space
   df -h
   
   # Check process memory
   ps aux --sort=-%mem | head -10
   ```
   
   **Solution**: Restart application or scale resources

### Issue: Slow Response Times

**Symptoms**:
- API responses take longer than 5 seconds
- Timeout errors in client applications
- High CPU or memory usage

**Diagnostic Steps**:

```bash
# Check response times
time curl -H "Authorization: Bearer $TOKEN" \
          https://api.example.com/api/v1/files/

# Check performance metrics
curl -H "Authorization: Bearer $TOKEN" \
     https://api.example.com/api/v1/monitoring/metrics/dashboard

# Check database performance
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;"
```

**Solutions**:

1. **Database Query Optimization**
   ```sql
   -- Check for missing indexes
   SELECT schemaname, tablename, attname, n_distinct, correlation 
   FROM pg_stats 
   WHERE schemaname = 'public' 
   AND n_distinct > 100;
   
   -- Add missing indexes
   CREATE INDEX CONCURRENTLY idx_files_application_created 
   ON files(application_id, created_at DESC);
   ```

2. **Application Scaling**
   ```bash
   # Scale Docker containers
   docker-compose up --scale api=3
   
   # Or with Kubernetes
   kubectl scale deployment lc-workflow-api --replicas=3
   ```

3. **Cache Implementation**
   ```python
   # Enable Redis caching
   REDIS_URL=redis://localhost:6379/0
   CACHE_TTL_SECONDS=300
   ```

## File Upload Problems

### Issue: File Upload Returns 400 Bad Request

**Symptoms**:
- File uploads fail with validation errors
- Specific file types rejected
- Size limit errors

**Diagnostic Steps**:

```bash
# Test file upload with verbose output
curl -X POST https://api.example.com/api/v1/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf" \
  -F "document_type=borrower_photo" \
  -v

# Check file properties
file test.pdf
ls -lh test.pdf

# Check application logs for upload errors
docker logs lc-workflow-api | grep -i "upload\|error" | tail -20
```

**Common Issues & Solutions**:

1. **Invalid File Type**
   ```bash
   # Check allowed file types
   echo $ALLOWED_FILE_TYPES
   
   # Update configuration if needed
   ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf,application/msword
   ```

2. **File Size Too Large**
   ```bash
   # Check current size limit
   echo $MAX_FILE_SIZE
   
   # Increase limit if appropriate
   MAX_FILE_SIZE=20971520  # 20MB
   ```

3. **Malware Detection**
   ```bash
   # Check malware scanner logs
   docker logs lc-workflow-api | grep -i "malware\|scan"
   
   # Test with known clean file
   curl -X POST https://api.example.com/api/v1/files/upload \
     -H "Authorization: Bearer $TOKEN" \
     -F "file=@clean_test.pdf"
   ```

### Issue: Files Upload But Don't Appear in Application

**Symptoms**:
- Upload returns 200 OK
- Files not visible in application interface
- Database records exist but files missing from MinIO

**Diagnostic Steps**:

```bash
# Check file record in database
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT id, filename, file_path, application_id, folder_id, created_at 
FROM files 
ORDER BY created_at DESC 
LIMIT 10;"

# Check MinIO object existence
mc ls $MINIO_ENDPOINT/$BUCKET_NAME/applications/

# Check folder associations
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT f.id, f.filename, fo.name as folder_name, fo.application_id
FROM files f
LEFT JOIN folders fo ON f.folder_id = fo.id
WHERE f.created_at > NOW() - INTERVAL '1 hour';"
```

**Solutions**:

1. **Fix Orphaned Files**
   ```python
   # Run data consistency check
   python -c "
   import asyncio
   from app.services.data_sync_verification_service import data_sync_verification_service
   from app.database import get_db
   
   async def fix_orphaned():
       async for db in get_db():
           result = await data_sync_verification_service.verify_file_folder_consistency(db)
           print(f'Found {len(result.issues)} issues')
           if result.auto_fixable_issues_count > 0:
               fix_result = await data_sync_verification_service.auto_fix_issues(db, result)
               print(f'Fixed {fix_result.fixed_issues} issues')
           break
   
   asyncio.run(fix_orphaned())
   "
   ```

2. **Cache Invalidation**
   ```bash
   # Invalidate file cache
   curl -X POST https://api.example.com/api/v1/data-sync/cache/invalidate \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"scope": "files", "reason": "manual_refresh"}'
   ```

## Database Issues

### Issue: Database Connection Pool Exhausted

**Symptoms**:
- "Connection pool exhausted" errors
- Long wait times for database operations
- 503 errors during high load

**Diagnostic Steps**:

```bash
# Check active connections
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT count(*) as total_connections,
       count(*) FILTER (WHERE state = 'active') as active_connections,
       count(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity;"

# Check connection pool configuration
curl -H "Authorization: Bearer $TOKEN" \
     https://api.example.com/api/v1/monitoring/health/comprehensive | \
     jq '.components[] | select(.name == "database") | .details.connection_pool'
```

**Solutions**:

1. **Increase Pool Size**
   ```bash
   # Update environment variables
   DB_POOL_SIZE=20
   DB_MAX_OVERFLOW=30
   
   # Restart application
   docker restart lc-workflow-api
   ```

2. **Optimize Long-Running Queries**
   ```sql
   -- Find long-running queries
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
   FROM pg_stat_activity 
   WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
   
   -- Kill problematic queries if necessary
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
   WHERE (now() - pg_stat_activity.query_start) > interval '10 minutes';
   ```

### Issue: Duplicate Folder Errors

**Symptoms**:
- "Multiple rows were found" errors
- Folder creation fails
- Inconsistent folder structures

**Diagnostic Steps**:

```bash
# Check for duplicate parent folders
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT application_id, count(*) as folder_count
FROM folders 
WHERE parent_id IS NULL 
GROUP BY application_id 
HAVING count(*) > 1;"

# Check folder hierarchy consistency
python -c "
import asyncio
from app.services.data_sync_verification_service import data_sync_verification_service
from app.database import get_db

async def check_folders():
    async for db in get_db():
        result = await data_sync_verification_service.verify_folder_hierarchy_consistency(db)
        print(f'Folder issues: {len(result.issues)}')
        for issue in result.issues[:5]:
            print(f'  - {issue.description}')
        break

asyncio.run(check_folders())
"
```

**Solutions**:

1. **Run Database Cleanup**
   ```python
   # Automated cleanup
   python -c "
   import asyncio
   from app.services.database_cleanup_service import DatabaseCleanupService
   from app.database import get_db
   
   async def cleanup():
       async for db in get_db():
           service = DatabaseCleanupService()
           report = await service.cleanup_duplicate_folders(db)
           print(f'Cleanup completed: {report.total_cleaned} folders processed')
           break
   
   asyncio.run(cleanup())
   "
   ```

2. **Manual Cleanup**
   ```sql
   -- Backup before cleanup
   CREATE TABLE folders_backup AS SELECT * FROM folders;
   
   -- Consolidate duplicate folders
   WITH duplicate_folders AS (
       SELECT application_id, 
              array_agg(id ORDER BY created_at) as folder_ids
       FROM folders 
       WHERE parent_id IS NULL 
       GROUP BY application_id 
       HAVING count(*) > 1
   )
   UPDATE files 
   SET folder_id = (
       SELECT folder_ids[1] 
       FROM duplicate_folders 
       WHERE folders.application_id = duplicate_folders.application_id
   )
   FROM folders
   WHERE files.folder_id = folders.id;
   ```

## Folder Organization Problems

### Issue: Documents Not Auto-Organizing

**Symptoms**:
- Files uploaded with document_type not placed in correct folders
- All files go to parent folder
- Folder structure not created automatically

**Diagnostic Steps**:

```bash
# Test document type mapping
curl -H "Authorization: Bearer $TOKEN" \
     https://api.example.com/api/v1/folders/document-types

# Check folder creation for specific document type
curl -X POST https://api.example.com/api/v1/folders/application/$APP_ID/folder-for-document-type \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"document_type": "borrower_photo"}'

# Check application logs for folder creation
docker logs lc-workflow-api | grep -i "folder\|document_type" | tail -20
```

**Solutions**:

1. **Verify Document Type Configuration**
   ```python
   # Check document type mapping
   python -c "
   from app.services.folder_service import FolderOrganizationConfig, DocumentType
   
   print('Valid document types:')
   for doc_type in DocumentType:
       folder_name = FolderOrganizationConfig.get_folder_name_for_document_type(doc_type.value)
       print(f'  {doc_type.value} -> {folder_name}')
   "
   ```

2. **Force Folder Structure Creation**
   ```python
   # Create folder structure for application
   python -c "
   import asyncio
   from app.services.folder_service import get_or_create_application_folder_structure
   from app.database import get_db
   from uuid import UUID
   
   async def create_structure():
       async for db in get_db():
           app_id = UUID('your-application-id-here')
           folders = await get_or_create_application_folder_structure(db, app_id)
           print(f'Created folders: {folders}')
           break
   
   asyncio.run(create_structure())
   "
   ```

## Authentication and Authorization

### Issue: JWT Token Validation Failures

**Symptoms**:
- 401 Unauthorized errors
- "Token has expired" messages
- Authentication works intermittently

**Diagnostic Steps**:

```bash
# Decode JWT token (without verification)
python -c "
import jwt
import json
token = 'your_token_here'
try:
    decoded = jwt.decode(token, options={'verify_signature': False})
    print(json.dumps(decoded, indent=2))
except Exception as e:
    print(f'Token decode error: {e}')
"

# Check token expiration
python -c "
import jwt
from datetime import datetime
token = 'your_token_here'
try:
    decoded = jwt.decode(token, options={'verify_signature': False})
    exp = decoded.get('exp')
    if exp:
        exp_time = datetime.fromtimestamp(exp)
        print(f'Token expires: {exp_time}')
        print(f'Current time: {datetime.now()}')
        print(f'Expired: {datetime.now() > exp_time}')
except Exception as e:
    print(f'Error: {e}')
"

# Test authentication endpoint
curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test"}'
```

**Solutions**:

1. **Token Refresh**
   ```bash
   # Get new token
   curl -X POST https://api.example.com/api/v1/auth/refresh \
     -H "Authorization: Bearer $REFRESH_TOKEN"
   ```

2. **Check JWT Configuration**
   ```bash
   # Verify JWT settings
   echo "SECRET_KEY: $SECRET_KEY"
   echo "ALGORITHM: $ALGORITHM"
   echo "TOKEN_EXPIRE_MINUTES: $ACCESS_TOKEN_EXPIRE_MINUTES"
   ```

### Issue: Permission Denied Errors

**Symptoms**:
- 403 Forbidden errors
- Users cannot access their own resources
- Role-based access not working

**Diagnostic Steps**:

```bash
# Check user roles and permissions
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT id, username, email, role, is_active 
FROM users 
WHERE username = 'problematic_user';"

# Check resource ownership
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT ca.id, ca.user_id, u.username, u.role
FROM customer_applications ca
JOIN users u ON ca.user_id = u.id
WHERE ca.id = 'application-id-here';"
```

**Solutions**:

1. **Update User Role**
   ```sql
   UPDATE users 
   SET role = 'manager' 
   WHERE username = 'user_name';
   ```

2. **Fix Resource Ownership**
   ```sql
   UPDATE customer_applications 
   SET user_id = 'correct-user-id' 
   WHERE id = 'application-id';
   ```

## Performance Issues

### Issue: High Memory Usage

**Symptoms**:
- Application consuming excessive memory
- Out of memory errors
- System becomes unresponsive

**Diagnostic Steps**:

```bash
# Check memory usage
free -m
ps aux --sort=-%mem | head -10

# Check application memory usage
docker stats lc-workflow-api

# Monitor memory over time
while true; do
  echo "$(date): $(free -m | grep Mem | awk '{print $3"MB used"}')"
  sleep 60
done
```

**Solutions**:

1. **Optimize Database Connections**
   ```bash
   # Reduce connection pool size
   DB_POOL_SIZE=5
   DB_MAX_OVERFLOW=10
   ```

2. **Enable Garbage Collection Tuning**
   ```bash
   # Python GC tuning
   export PYTHONOPTIMIZE=1
   export PYTHONDONTWRITEBYTECODE=1
   ```

3. **Implement Memory Limits**
   ```yaml
   # Docker Compose
   services:
     api:
       deploy:
         resources:
           limits:
             memory: 1G
           reservations:
             memory: 512M
   ```

### Issue: Slow Database Queries

**Symptoms**:
- API responses take longer than 10 seconds
- Database CPU usage high
- Query timeouts

**Diagnostic Steps**:

```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements 
WHERE mean_time > 1000  -- queries taking more than 1 second
ORDER BY total_time DESC 
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
AND n_distinct > 100
AND correlation < 0.1;

-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Solutions**:

1. **Add Missing Indexes**
   ```sql
   -- Common indexes for performance
   CREATE INDEX CONCURRENTLY idx_files_application_created 
   ON files(application_id, created_at DESC);
   
   CREATE INDEX CONCURRENTLY idx_folders_application_parent 
   ON folders(application_id, parent_id);
   
   CREATE INDEX CONCURRENTLY idx_files_folder_created 
   ON files(folder_id, created_at DESC);
   ```

2. **Optimize Queries**
   ```sql
   -- Use EXPLAIN ANALYZE to optimize queries
   EXPLAIN ANALYZE SELECT * FROM files 
   WHERE application_id = 'uuid-here' 
   ORDER BY created_at DESC;
   ```

## Security Concerns

### Issue: Malware Scanner Not Working

**Symptoms**:
- Malicious files being uploaded
- No malware scan logs
- Scanner service unavailable

**Diagnostic Steps**:

```bash
# Check malware scanner configuration
echo "ENABLE_MALWARE_SCANNING: $ENABLE_MALWARE_SCANNING"

# Test malware scanner
python -c "
import asyncio
from app.services.malware_scanner_service import scan_file_for_malware

async def test_scanner():
    with open('test_file.txt', 'rb') as f:
        content = f.read()
    result = await scan_file_for_malware(content, 'test_file.txt', 'text/plain')
    print(f'Scanner result: {result.is_safe}')

asyncio.run(test_scanner())
"

# Check scanner logs
docker logs lc-workflow-api | grep -i "malware\|scan" | tail -20
```

**Solutions**:

1. **Enable Malware Scanning**
   ```bash
   ENABLE_MALWARE_SCANNING=true
   ```

2. **Update Scanner Configuration**
   ```python
   # Check scanner service implementation
   # Ensure ClamAV or alternative scanner is properly configured
   ```

### Issue: File Encryption Not Working

**Symptoms**:
- Sensitive files stored unencrypted
- Encryption errors in logs
- Missing encryption metadata

**Diagnostic Steps**:

```bash
# Check encryption configuration
echo "ENABLE_FILE_ENCRYPTION: $ENABLE_FILE_ENCRYPTION"
echo "ENCRYPTION_KEY_PATH: $ENCRYPTION_KEY_PATH"

# Test encryption service
python -c "
import asyncio
from app.services.encryption_service import encrypt_sensitive_file

async def test_encryption():
    content = b'test content'
    result = await encrypt_sensitive_file(content, 'test.pdf', 'application/pdf')
    print(f'Encryption result: {result.success}')
    if result.metadata:
        print(f'Algorithm: {result.metadata.algorithm}')

asyncio.run(test_encryption())
"
```

**Solutions**:

1. **Generate Encryption Key**
   ```bash
   # Generate new encryption key
   python -c "
   from cryptography.fernet import Fernet
   key = Fernet.generate_key()
   with open('encryption_master.key', 'wb') as f:
       f.write(key)
   print('Encryption key generated')
   "
   ```

2. **Enable Encryption**
   ```bash
   ENABLE_FILE_ENCRYPTION=true
   ENCRYPTION_KEY_PATH=/path/to/encryption_master.key
   ```

## Data Synchronization Issues

### Issue: Cache Not Invalidating

**Symptoms**:
- Stale data displayed in frontend
- Changes not reflected immediately
- Cache invalidation errors

**Diagnostic Steps**:

```bash
# Check cache invalidation service
curl -H "Authorization: Bearer $TOKEN" \
     https://api.example.com/api/v1/data-sync/cache/history

# Test manual cache invalidation
curl -X POST https://api.example.com/api/v1/data-sync/cache/invalidate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"scope": "files", "reason": "manual_refresh"}'

# Check Redis connectivity
redis-cli ping
```

**Solutions**:

1. **Force Cache Refresh**
   ```bash
   # Clear all caches
   curl -X POST https://api.example.com/api/v1/data-sync/sync/force-refresh \
     -H "Authorization: Bearer $TOKEN"
   ```

2. **Restart Cache Service**
   ```bash
   # Restart Redis
   docker restart redis
   
   # Or flush Redis database
   redis-cli FLUSHDB
   ```

### Issue: Real-time Updates Not Working

**Symptoms**:
- Frontend not receiving real-time updates
- SSE connections failing
- Update notifications missing

**Diagnostic Steps**:

```bash
# Check real-time connection stats
curl -H "Authorization: Bearer $TOKEN" \
     https://api.example.com/api/v1/data-sync/realtime/stats

# Test SSE connection
curl -H "Authorization: Bearer $TOKEN" \
     https://api.example.com/api/v1/data-sync/realtime/stream/test-connection-id

# Check real-time service logs
docker logs lc-workflow-api | grep -i "realtime\|sse" | tail -20
```

**Solutions**:

1. **Enable Real-time Updates**
   ```bash
   ENABLE_REAL_TIME_UPDATES=true
   ```

2. **Check WebSocket/SSE Configuration**
   ```nginx
   # Nginx configuration for SSE
   location /api/v1/data-sync/realtime/stream/ {
       proxy_pass http://backend;
       proxy_set_header Connection '';
       proxy_http_version 1.1;
       proxy_buffering off;
       proxy_cache off;
   }
   ```

## Monitoring and Alerting

### Issue: Health Checks Failing

**Symptoms**:
- Health check endpoints return errors
- Monitoring systems show service as down
- False positive alerts

**Diagnostic Steps**:

```bash
# Test basic health check
curl -f https://api.example.com/health

# Test comprehensive health check
curl -H "Authorization: Bearer $TOKEN" \
     https://api.example.com/api/v1/monitoring/health/comprehensive

# Check health check logs
docker logs lc-workflow-api | grep -i "health" | tail -20
```

**Solutions**:

1. **Fix Health Check Dependencies**
   ```python
   # Ensure all health check dependencies are available
   # Database, MinIO, Redis, etc.
   ```

2. **Adjust Health Check Timeouts**
   ```bash
   # Increase health check timeout
   HEALTH_CHECK_TIMEOUT=30
   ```

### Issue: Alerts Not Firing

**Symptoms**:
- No alerts despite system issues
- Alert history empty
- Notification channels not working

**Diagnostic Steps**:

```bash
# Check active alerts
curl -H "Authorization: Bearer $TOKEN" \
     https://api.example.com/api/v1/monitoring/alerts/active

# Check alert history
curl -H "Authorization: Bearer $TOKEN" \
     https://api.example.com/api/v1/monitoring/alerts/history

# Test alert system
python -c "
import asyncio
from app.services.alerting_service import alerting_service, AlertSeverity

async def test_alert():
    await alerting_service.create_alert(
        title='Test Alert',
        message='This is a test alert',
        severity=AlertSeverity.WARNING,
        component='test'
    )
    print('Test alert created')

asyncio.run(test_alert())
"
```

**Solutions**:

1. **Enable Alerting**
   ```bash
   ENABLE_ALERTING=true
   ```

2. **Configure Alert Thresholds**
   ```python
   # Review alert configuration in alerting service
   # Adjust thresholds as needed
   ```

## Emergency Procedures

### Complete System Failure

**Immediate Actions**:

1. **Check System Status**
   ```bash
   # Check if application is running
   docker ps | grep lc-workflow-api
   
   # Check system resources
   top
   df -h
   free -m
   ```

2. **Restart Application**
   ```bash
   # Docker restart
   docker restart lc-workflow-api
   
   # Or full system restart
   docker-compose down && docker-compose up -d
   ```

3. **Check Dependencies**
   ```bash
   # Database
   pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER
   
   # MinIO
   mc ping $MINIO_ENDPOINT
   
   # Redis
   redis-cli ping
   ```

### Data Corruption

**Recovery Steps**:

1. **Stop Application**
   ```bash
   docker stop lc-workflow-api
   ```

2. **Restore from Backup**
   ```bash
   # Database restore
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backup_latest.sql
   
   # MinIO restore
   mc mirror ./minio_backup_latest/ $MINIO_ENDPOINT/$BUCKET_NAME/
   ```

3. **Verify Data Integrity**
   ```bash
   # Run comprehensive verification
   python -c "
   import asyncio
   from app.services.data_sync_verification_service import data_sync_verification_service
   from app.database import get_db
   
   async def verify():
       async for db in get_db():
           results = await data_sync_verification_service.run_comprehensive_verification(db)
           print('Verification completed')
           break
   
   asyncio.run(verify())
   "
   ```

### Security Breach

**Immediate Response**:

1. **Isolate System**
   ```bash
   # Stop application
   docker stop lc-workflow-api
   
   # Block external access
   iptables -A INPUT -p tcp --dport 8000 -j DROP
   ```

2. **Audit Logs**
   ```bash
   # Check audit logs
   docker logs lc-workflow-api | grep -i "security\|auth\|error" > security_audit.log
   
   # Check database for suspicious activity
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
   SELECT * FROM audit_logs 
   WHERE created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;"
   ```

3. **Change Credentials**
   ```bash
   # Generate new JWT secret
   python -c "
   import secrets
   print(f'New secret: {secrets.token_urlsafe(32)}')
   "
   
   # Update database passwords
   # Update MinIO credentials
   # Revoke all active tokens
   ```

## Contact Information

### Emergency Contacts

- **Primary On-Call**: +1-555-0123
- **Secondary On-Call**: +1-555-0124
- **DevOps Team**: devops@example.com
- **Security Team**: security@example.com

### Escalation Matrix

1. **Level 1**: Application Developer
2. **Level 2**: Senior Developer / Team Lead
3. **Level 3**: DevOps Engineer
4. **Level 4**: System Administrator
5. **Level 5**: CTO / Technical Director

### Support Resources

- **Documentation**: https://docs.example.com
- **Status Page**: https://status.example.com
- **Monitoring Dashboard**: https://monitoring.example.com
- **Log Viewer**: https://logs.example.com
- **Incident Management**: https://incidents.example.com

## Prevention Strategies

### Regular Maintenance

1. **Daily Health Checks**
2. **Weekly Performance Reviews**
3. **Monthly Security Audits**
4. **Quarterly Disaster Recovery Tests**

### Monitoring Setup

1. **Comprehensive Health Monitoring**
2. **Performance Metrics Collection**
3. **Security Event Monitoring**
4. **Automated Alerting**

### Documentation Updates

1. **Keep troubleshooting guide current**
2. **Document new issues and solutions**
3. **Update contact information**
4. **Review and test procedures regularly**

This troubleshooting guide should be regularly updated based on new issues encountered and solutions developed.