# LC Workflow API - Enhanced Documentation

## Overview

This document provides comprehensive documentation for the LC Workflow API, including all enhanced endpoints for system stability improvements, security features, monitoring, and data synchronization.

## Base Information

- **Base URL**: `https://your-domain.com/api/v1`
- **Authentication**: Bearer Token (JWT)
- **Content-Type**: `application/json` (unless specified otherwise)
- **API Version**: 1.0.0

## Authentication

All endpoints require authentication unless specified otherwise. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Error Handling

The API uses standardized error responses with correlation IDs for tracking:

```json
{
  "error_type": "validation_error",
  "message": "Invalid file type provided",
  "details": {
    "field": "file",
    "allowed_types": ["image/jpeg", "image/png", "application/pdf"]
  },
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "suggested_actions": [
    "Please select a valid file type",
    "Compress your file if it's too large"
  ]
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `413` - Request Entity Too Large
- `415` - Unsupported Media Type
- `500` - Internal Server Error
- `503` - Service Unavailable

## File Management API

### Upload File

Upload a file with enhanced security and organization features.

**Endpoint**: `POST /files/upload`

**Content-Type**: `multipart/form-data`

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file | File | Yes | The file to upload |
| application_id | string (UUID) | No | Application ID to associate file with |
| folder_id | string (UUID) | No | Specific folder ID |
| document_type | string | No | Document type for automatic organization |
| field_name | string | No | Field name for form association |

**Document Types**:
- `borrower_photo`, `borrower_id_card`, `borrower_family_book`
- `guarantor_photo`, `guarantor_id_card`, `guarantor_family_book`
- `land_title`, `property_valuation`, `vehicle_registration`
- `business_license`, `loan_application_form`

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "document.pdf",
  "original_filename": "My Document.pdf",
  "display_name": "My Document.pdf",
  "file_path": "applications/app-id/borrower/document.pdf",
  "file_size": 1048576,
  "mime_type": "application/pdf",
  "uploaded_by": "user-id",
  "application_id": "app-id",
  "folder_id": "folder-id",
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z"
}
```

**Security Features**:
- Malware scanning
- File type validation
- Size limits (10MB default)
- Automatic encryption for sensitive documents
- Comprehensive audit logging

**Example**:
```bash
curl -X POST "https://api.example.com/api/v1/files/upload" \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.pdf" \
  -F "application_id=550e8400-e29b-41d4-a716-446655440000" \
  -F "document_type=borrower_photo"
```

### Get File

Retrieve file information with access control.

**Endpoint**: `GET /files/{file_id}`

**Response**:
```json
{
  "id": "file-id",
  "filename": "document.pdf",
  "original_filename": "My Document.pdf",
  "display_name": "My Document.pdf",
  "file_size": 1048576,
  "mime_type": "application/pdf",
  "uploaded_by": "user-id",
  "application_id": "app-id",
  "folder_id": "folder-id",
  "created_at": "2024-01-01T12:00:00Z",
  "download_url": "https://storage.example.com/secure-download-url"
}
```

### Download File

Download file with secure, time-limited URLs.

**Endpoint**: `GET /files/{file_id}/download`

**Response**: Redirects to secure download URL or streams file content.

### Delete File

Delete a file with confirmation and cleanup.

**Endpoint**: `DELETE /files/{file_id}`

**Response**:
```json
{
  "message": "File deleted successfully",
  "deleted_file_id": "file-id",
  "cleanup_performed": true
}
```

## Folder Management API

### Get Folders

Retrieve folders with filtering and pagination.

**Endpoint**: `GET /folders/`

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| parent_id | UUID | Filter by parent folder |
| application_id | UUID | Filter by application |
| page | integer | Page number for pagination |
| size | integer | Items per page |

**Response**:
```json
{
  "items": [
    {
      "id": "folder-id",
      "name": "Borrower Documents",
      "parent_id": "parent-folder-id",
      "application_id": "app-id",
      "created_at": "2024-01-01T12:00:00Z",
      "files": [
        {
          "id": "file-id",
          "filename": "document.pdf",
          "file_size": 1048576
        }
      ]
    }
  ],
  "total": 10,
  "page": 1,
  "size": 20,
  "pages": 1
}
```

### Get Document Types

Get available document types for automatic organization.

**Endpoint**: `GET /folders/document-types`

**Response**:
```json
{
  "borrower": [
    "borrower_photo",
    "borrower_id_card",
    "borrower_family_book"
  ],
  "guarantor": [
    "guarantor_photo",
    "guarantor_id_card"
  ],
  "collateral": [
    "land_title",
    "property_valuation"
  ]
}
```

### Get Application Folder Hierarchy

Get complete folder structure for an application.

**Endpoint**: `GET /folders/application/{application_id}/hierarchy`

**Response**:
```json
{
  "application_id": "app-id",
  "root_folder": {
    "id": "root-id",
    "name": "Application Documents",
    "children": [
      {
        "id": "borrower-folder-id",
        "name": "Borrower Documents",
        "files_count": 3,
        "children": []
      }
    ]
  },
  "total_folders": 4,
  "total_files": 12
}
```

### Create Folder for Document Type

Create or get folder for specific document type.

**Endpoint**: `POST /folders/application/{application_id}/folder-for-document-type`

**Request Body**:
```json
{
  "document_type": "borrower_photo"
}
```

**Response**:
```json
{
  "folder_id": "folder-id",
  "folder_name": "Borrower Documents",
  "document_type": "borrower_photo",
  "created": true
}
```

## Health Monitoring API

### Comprehensive Health Check

Perform detailed system health check.

**Endpoint**: `GET /monitoring/health/comprehensive`

**Response**:
```json
{
  "overall_status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "check_duration_ms": 150,
  "components": [
    {
      "name": "database",
      "status": "healthy",
      "message": "Database connection successful",
      "details": {
        "connection_pool": {
          "size": 10,
          "checked_out": 2,
          "available": 8
        }
      },
      "response_time_ms": 45,
      "last_check": "2024-01-01T12:00:00Z"
    },
    {
      "name": "storage",
      "status": "healthy",
      "message": "MinIO storage accessible",
      "response_time_ms": 32
    },
    {
      "name": "data_consistency",
      "status": "warning",
      "message": "Minor inconsistencies detected",
      "details": {
        "total_issues": 2,
        "critical_issues": 0,
        "auto_fixable": 2
      }
    }
  ],
  "metrics": {
    "total_files": 1250,
    "total_folders": 340,
    "total_applications": 89,
    "total_users": 25,
    "storage_usage_bytes": 2147483648,
    "database_connections": 5,
    "uptime_seconds": 86400,
    "memory_usage_mb": 512,
    "cpu_usage_percent": 15.5
  },
  "alerts": [
    {
      "id": "alert-1",
      "title": "High Memory Usage",
      "severity": "warning",
      "component": "system"
    }
  ]
}
```

### Quick Health Check

Lightweight health check for load balancers.

**Endpoint**: `GET /monitoring/health/quick`

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "database": "healthy",
  "cached": false
}
```

### Get Health History

Retrieve health check history.

**Endpoint**: `GET /monitoring/health/history`

**Query Parameters**:
- `hours` (integer): Hours of history to retrieve (1-168)

**Response**:
```json
{
  "history": [
    {
      "timestamp": "2024-01-01T12:00:00Z",
      "overall_status": "healthy",
      "check_duration_ms": 150,
      "component_count": 5,
      "alert_count": 1,
      "components": [
        {
          "name": "database",
          "status": "healthy",
          "response_time_ms": 45
        }
      ]
    }
  ],
  "period_hours": 24,
  "total_checks": 144
}
```

### Get Dashboard Metrics

Get metrics formatted for dashboard display.

**Endpoint**: `GET /monitoring/metrics/dashboard`

**Response**:
```json
{
  "dashboard": {
    "overview": {
      "total_operations": 15420,
      "successful_operations": 15380,
      "failed_operations": 40,
      "success_rate": 99.74
    },
    "recent_activity": {
      "file_uploads_last_hour": 45,
      "folder_creations_last_hour": 12,
      "api_requests_last_hour": 1250
    }
  },
  "performance": {
    "average_response_time_ms": 125,
    "slowest_operations": [
      {
        "operation": "file_upload",
        "avg_duration_ms": 850,
        "count": 120
      }
    ]
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Get Active Alerts

Retrieve active system alerts.

**Endpoint**: `GET /monitoring/alerts/active`

**Query Parameters**:
- `severity` (string): Filter by severity (critical, warning, info)

**Response**:
```json
{
  "alerts": [
    {
      "id": "alert-1",
      "title": "High Memory Usage",
      "message": "System memory usage is above 80%",
      "severity": "warning",
      "component": "system",
      "timestamp": "2024-01-01T12:00:00Z",
      "acknowledgments": [],
      "details": {
        "current_usage_mb": 512,
        "threshold_mb": 400
      }
    }
  ],
  "total_active": 1,
  "severity_filter": "warning"
}
```

### Acknowledge Alert

Acknowledge an active alert.

**Endpoint**: `POST /monitoring/alerts/{alert_id}/acknowledge`

**Response**:
```json
{
  "message": "Alert alert-1 acknowledged",
  "acknowledged_by": "admin",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Data Synchronization API

### Invalidate Cache

Manually invalidate cache for specific scope.

**Endpoint**: `POST /data-sync/cache/invalidate`

**Request Body**:
```json
{
  "scope": "files",
  "reason": "manual_refresh",
  "entity_id": "file-id",
  "related_ids": ["folder-id", "application-id"]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Cache invalidated for scope: files",
  "scope": "files",
  "reason": "manual_refresh",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Manual Refresh

Trigger manual refresh for multiple scopes.

**Endpoint**: `POST /data-sync/cache/refresh`

**Request Body**:
```json
{
  "scopes": ["files", "folders"],
  "application_id": "app-id",
  "force_full_refresh": false
}
```

**Response**:
```json
{
  "success": true,
  "message": "Manual refresh triggered for 2 scopes",
  "refreshed_scopes": ["files", "folders"],
  "application_id": "app-id",
  "force_full_refresh": false
}
```

### Real-time Connection

Create real-time update connection.

**Endpoint**: `POST /data-sync/realtime/connect`

**Request Body**:
```json
{
  "subscribed_scopes": ["files", "folders"],
  "application_filters": ["app-id-1", "app-id-2"]
}
```

**Response**:
```json
{
  "connection_id": "conn-550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-id",
  "subscribed_scopes": ["files", "folders"],
  "application_filters": ["app-id-1", "app-id-2"]
}
```

### Real-time Stream

Server-Sent Events stream for real-time updates.

**Endpoint**: `GET /data-sync/realtime/stream/{connection_id}`

**Response**: Server-Sent Events stream

```
data: {"type": "file_uploaded", "file_id": "file-id", "folder_id": "folder-id"}

data: {"type": "folder_created", "folder_id": "folder-id", "application_id": "app-id"}
```

### Run Data Verification

Run data synchronization verification.

**Endpoint**: `POST /data-sync/verification/run`

**Request Body**:
```json
{
  "scopes": ["files", "folders"],
  "application_id": "app-id",
  "auto_fix": true
}
```

**Response**:
```json
{
  "verification_results": {
    "file_folder_consistency": {
      "status": "completed",
      "issues": [
        {
          "type": "orphaned_file",
          "severity": "warning",
          "description": "File exists without valid folder reference",
          "file_id": "file-id",
          "auto_fixable": true
        }
      ],
      "critical_issues_count": 0,
      "auto_fixable_issues_count": 1,
      "verification_duration": 1.5,
      "timestamp": "2024-01-01T12:00:00Z"
    }
  },
  "auto_fix_results": {
    "file_folder_consistency": {
      "fixed_issues": 1,
      "failed_fixes": 0
    }
  },
  "total_issues": 1,
  "critical_issues": 0,
  "auto_fixable_issues": 1,
  "requested_by": "user-id"
}
```

### Get Sync Status

Get overall system synchronization status.

**Endpoint**: `GET /data-sync/sync/status`

**Response**:
```json
{
  "status": "healthy",
  "total_issues": 0,
  "critical_issues": 0,
  "realtime_connections": 5,
  "last_verification": {
    "file_consistency": {
      "issues": 0,
      "duration": 1.2,
      "timestamp": "2024-01-01T12:00:00Z"
    },
    "folder_consistency": {
      "issues": 0,
      "duration": 0.8,
      "timestamp": "2024-01-01T12:00:00Z"
    }
  }
}
```

## Security Features

### File Security

All file uploads include:

1. **Malware Scanning**: Files are scanned for malicious content
2. **Content Validation**: File headers are verified against extensions
3. **Size Limits**: Configurable file size limits (default 10MB)
4. **Type Restrictions**: Only allowed file types are accepted
5. **Encryption**: Sensitive documents are automatically encrypted

### Access Control

- **Role-based Access**: Admin, Manager, User roles
- **Resource Ownership**: Users can only access their own resources
- **Audit Logging**: All operations are logged with user context

### Authentication

- **JWT Tokens**: Secure token-based authentication
- **Token Expiration**: Configurable token lifetime
- **Refresh Tokens**: Automatic token renewal

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **File Upload**: 100 requests per hour per user
- **General API**: 1000 requests per hour per user
- **Health Checks**: 60 requests per minute (no user limit)

## Monitoring and Observability

### Metrics Collection

The API collects comprehensive metrics:

- **Operation Metrics**: Success/failure rates, response times
- **System Metrics**: Memory, CPU, database connections
- **Business Metrics**: File counts, user activity

### Alerting

Automated alerts for:

- **System Health**: Database connectivity, storage availability
- **Performance**: High response times, error rates
- **Security**: Failed authentication attempts, malware detection
- **Data Consistency**: Orphaned records, referential integrity

### Logging

Structured logging with:

- **Correlation IDs**: Track requests across services
- **User Context**: Associate actions with users
- **Performance Data**: Response times, query performance
- **Security Events**: Authentication, authorization, file scanning

## Error Recovery

### Retry Mechanisms

- **Automatic Retries**: Failed operations are retried with exponential backoff
- **Circuit Breakers**: Prevent cascading failures
- **Graceful Degradation**: System continues operating with reduced functionality

### Rollback Procedures

- **Database Transactions**: Atomic operations with rollback capability
- **File Cleanup**: Orphaned files are automatically cleaned up
- **Cache Invalidation**: Stale cache entries are purged

## Performance Optimization

### Caching Strategy

- **Application-level Caching**: Frequently accessed data is cached
- **Database Query Optimization**: Indexes and query optimization
- **CDN Integration**: Static assets served via CDN

### Database Optimization

- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Optimized queries with proper indexes
- **Batch Operations**: Bulk operations for better performance

## Deployment Considerations

### Environment Configuration

- **Environment Variables**: All configuration via environment variables
- **Secrets Management**: Secure handling of sensitive configuration
- **Feature Flags**: Gradual rollout of new features

### Scaling

- **Horizontal Scaling**: Multiple API instances behind load balancer
- **Database Scaling**: Read replicas for improved performance
- **Storage Scaling**: Distributed object storage

### Monitoring

- **Health Checks**: Multiple levels of health checking
- **Metrics Export**: Prometheus-compatible metrics
- **Log Aggregation**: Centralized logging with structured format

## Migration and Versioning

### API Versioning

- **URL Versioning**: Version included in URL path (`/api/v1/`)
- **Backward Compatibility**: Previous versions supported during transition
- **Deprecation Notices**: Clear communication of deprecated features

### Database Migrations

- **Alembic Migrations**: Database schema versioning
- **Rollback Support**: Safe rollback procedures
- **Data Migration**: Scripts for data transformation

## Support and Troubleshooting

### Common Issues

1. **File Upload Failures**
   - Check file size and type restrictions
   - Verify authentication token
   - Review malware scan results

2. **Permission Errors**
   - Verify user role and permissions
   - Check resource ownership
   - Review audit logs

3. **Performance Issues**
   - Check system health endpoints
   - Review metrics and alerts
   - Verify database performance

### Debug Information

- **Correlation IDs**: Include in support requests
- **Log Levels**: Configurable logging verbosity
- **Health Endpoints**: System status information

### Contact Information

- **API Support**: api-support@example.com
- **Documentation**: https://docs.example.com/api
- **Status Page**: https://status.example.com