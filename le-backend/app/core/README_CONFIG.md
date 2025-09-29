# Configuration Documentation

This document provides comprehensive documentation for the refactored configuration system in the LC Workflow application.

## Overview

The configuration system has been refactored from a single large `Settings` class into a modular structure with separate configuration classes for different concerns:

- `DatabaseSettings` - Database and Redis configuration
- `SecuritySettings` - Authentication, authorization, and security settings
- `StorageSettings` - File storage, MinIO, and S3 configuration
- `ServerSettings` - Server and CORS configuration
- `ApplicationSettings` - General application settings and feature flags
- `Settings` - Main settings class that composes all the above

## Configuration Classes

### DatabaseSettings

Handles database connections, connection pooling, and database-specific configurations.

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://user:password@localhost/lc_workflow` | Database connection URL |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `DRAGONFLY_URL` | - | Railway Dragonfly URL (overrides REDIS_URL) |
| `DATABASE_POOL_SIZE` | `20` | Database connection pool size (1-100) |
| `DATABASE_POOL_RECYCLE` | `3600` | Connection recycle time in seconds |
| `DATABASE_POOL_TIMEOUT` | `30` | Connection timeout in seconds |
| `REDIS_POOL_MAX_CONNECTIONS` | `20` | Redis max connections (1-100) |
| `REDIS_POOL_TIMEOUT` | `5` | Redis timeout in seconds |
| `ENABLE_DATABASE_QUERY_LOGGING` | `false` | Enable query logging |
| `DATABASE_QUERY_LOG_THRESHOLD` | `1.0` | Query log threshold in seconds |

#### Usage Example

```python
from app.core.config import settings

# Access database settings
db_config = settings.get_database_config()
print(f"Database URL: {settings.database.database_url}")
print(f"Pool size: {settings.database.database_pool_size}")

# Or use the backward compatible properties
print(f"Database URL: {settings.DATABASE_URL}")
```

### SecuritySettings

Handles authentication, authorization, password policies, session security, and rate limiting.

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | Auto-generated | JWT secret key (min 32 chars) |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Access token expiration (5-1440) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token expiration (1-30) |
| `MIN_PASSWORD_LENGTH` | `8` | Minimum password length (6-128) |
| `REQUIRE_PASSWORD_SPECIAL_CHARS` | `true` | Require special characters |
| `REQUIRE_PASSWORD_NUMBERS` | `true` | Require numbers |
| `REQUIRE_PASSWORD_UPPERCASE` | `true` | Require uppercase letters |
| `SESSION_COOKIE_SECURE` | `true` | Use secure session cookies |
| `SESSION_COOKIE_HTTPONLY` | `true` | Use HTTP-only cookies |
| `SESSION_COOKIE_SAMESITE` | `lax` | Cookie SameSite policy |
| `RATE_LIMIT_ENABLED` | `true` | Enable rate limiting |
| `RATE_LIMIT_REQUESTS` | `100` | Requests per window (10-1000) |
| `RATE_LIMIT_WINDOW` | `60` | Window in seconds (10-3600) |
| `MAX_LOGIN_ATTEMPTS` | `5` | Max login attempts (3-10) |
| `ACCOUNT_LOCKOUT_DURATION` | `900` | Lockout duration in seconds |
| `ENABLE_SECRET_ROTATION` | `false` | Enable secret rotation |
| `SECRET_ROTATION_INTERVAL_DAYS` | `90` | Rotation interval (30-365) |

#### Password Validation

```python
from app.core.config import settings

is_valid, violations = settings.security.is_password_strong("MyPassword123!")
if not is_valid:
    print(f"Password violations: {violations}")
```

### StorageSettings

Handles file storage, MinIO/S3 configurations, and file upload settings.

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `UPLOAD_DIR` | `static/uploads` | Local upload directory |
| `MAX_FILE_SIZE` | `10485760` | Max file size in bytes (1KB-100MB) |
| `ALLOWED_FILE_TYPES` | Image, PDF, etc. | Comma-separated MIME types |
| `MINIO_ENDPOINT` | - | MinIO server endpoint |
| `MINIO_ACCESS_KEY` | - | MinIO access key |
| `MINIO_SECRET_KEY` | - | MinIO secret key |
| `MINIO_BUCKET_NAME` | `lc-workflow-files` | MinIO bucket name |
| `MINIO_SECURE` | `true` | Use HTTPS for MinIO |
| `S3_ENDPOINT` | - | S3 endpoint URL |
| `S3_ACCESS_KEY` | - | S3 access key |
| `S3_SECRET_KEY` | - | S3 secret key |
| `S3_BUCKET_NAME` | `lc-workflow-files` | S3 bucket name |
| `S3_REGION` | `us-east-1` | S3 region |
| `PREFERRED_STORAGE` | `local` | Storage backend (local, minio, s3) |

#### Usage Example

```python
from app.core.config import settings

# Check if file type is allowed
if settings.storage.is_file_type_allowed("image/jpeg"):
    print("JPEG files are allowed")

# Get storage configuration
storage_config = settings.storage.get_storage_config()
print(f"Using storage: {storage_config}")
```

### ServerSettings

Handles server configuration, CORS settings, and server-specific options.

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Server host address |
| `PORT` | `8090` | Server port (1024-65535) |
| `DEBUG` | `false` | Enable debug mode |
| `WORKERS` | `1` | Number of worker processes (1-16) |
| `CORS_ORIGINS` | - | Additional CORS origins (comma-separated) |
| `REQUEST_TIMEOUT` | `300` | Request timeout in seconds |

#### CORS Configuration

```python
from app.core.config import settings

# Get CORS configuration for FastAPI
cors_config = settings.server.get_cors_config()
print(f"Allowed origins: {settings.server.allowed_origins}")
```

### ApplicationSettings

Handles general application settings, feature flags, and application-specific configurations.

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_NAME` | `LC Workflow` | Application name |
| `APP_VERSION` | `1.0.0` | Application version |
| `ENVIRONMENT` | `development` | Environment (development, staging, production) |
| `ENABLE_USER_REGISTRATION` | `true` | Enable user registration |
| `ENABLE_FILE_UPLOAD` | `true` | Enable file upload |
| `ENABLE_NOTIFICATIONS` | `true` | Enable notifications |
| `ENABLE_AUDIT_LOGGING` | `false` | Enable audit logging |
| `ENABLE_ANALYTICS` | `false` | Enable analytics |
| `DEFAULT_PAGE_SIZE` | `20` | Default pagination size |
| `MAX_PAGE_SIZE` | `100` | Maximum pagination size |
| `LOG_LEVEL` | `INFO` | Logging level |

#### Feature Flags

```python
from app.core.config import settings

# Check if feature is enabled
if settings.is_feature_enabled("user_registration"):
    print("User registration is enabled")

# Get all feature flags
flags = settings.get_feature_flags()
print(f"Feature flags: {flags}")
```

## Main Settings Class

The main `Settings` class composes all the specific settings classes and provides backward compatibility.

### Configuration Validation

```python
from app.core.config import settings

# Validate entire configuration
is_valid, errors = settings.validate_configuration()
if not is_valid:
    print(f"Configuration errors: {errors}")
```

### Environment Detection

```python
from app.core.config import settings

if settings.is_production():
    print("Running in production mode")
elif settings.is_development():
    print("Running in development mode")
```

### Configuration Export

```python
from app.core.config import settings

# Export configuration (without secrets)
config = settings.export_configuration(include_secrets=False)
print(f"Configuration: {config}")

# Export with secrets (use carefully)
config_with_secrets = settings.export_configuration(include_secrets=True)
```

## Migration Guide

### From Old Configuration

The refactored configuration maintains backward compatibility. Existing code using the old configuration will continue to work:

```python
# Old way (still works)
from app.core.config import settings
database_url = settings.DATABASE_URL
secret_key = settings.SECRET_KEY

# New way (recommended)
database_url = settings.database.database_url
secret_key = settings.security.secret_key
```

### Environment Variables

All existing environment variables continue to work. New environment variables have been added for enhanced functionality.

### Best Practices

1. **Use specific settings classes** for new code:
   ```python
   # Instead of settings.SECRET_KEY
   settings.security.secret_key
   ```

2. **Validate configuration** on startup:
   ```python
   is_valid, errors = settings.validate_configuration()
   if not is_valid:
       raise ValueError(f"Configuration errors: {errors}")
   ```

3. **Use feature flags** for conditional functionality:
   ```python
   if settings.is_feature_enabled("audit_logging"):
       # Enable audit logging
       pass
   ```

4. **Check environment** before applying settings:
   ```python
   if settings.is_production():
       # Production-specific settings
       pass
   ```

## Security Considerations

1. **Secret Management**: The system auto-generates secure secret keys if not provided
2. **Password Policies**: Configurable password requirements with validation
3. **Rate Limiting**: Built-in rate limiting configuration
4. **CORS**: Configurable CORS origins with environment variable support
5. **Session Security**: Secure session cookie configuration

## Performance Features

1. **Connection Pooling**: Configurable database and Redis connection pools
2. **Query Monitoring**: Optional database query logging with thresholds
3. **Caching**: Configurable caching with TTL settings
4. **Request Timeout**: Configurable request timeouts

## Troubleshooting

### Common Issues

1. **Configuration validation fails**:
   - Check that required environment variables are set
   - Verify database URL format
   - Ensure CORS origins are configured

2. **File uploads not working**:
   - Verify storage credentials are set
   - Check upload directory permissions
   - Ensure MinIO/S3 is accessible

3. **Authentication issues**:
   - Check SECRET_KEY is set and secure
   - Verify JWT token expiration settings
   - Ensure password policy is not too restrictive

### Debug Information

```python
from app.core.config import settings

# Get detailed configuration info
config = settings.export_configuration(include_secrets=False)
print(f"Current configuration: {config}")

# Check specific settings
print(f"Database configured: {bool(settings.database.database_url)}")
print(f"Storage configured: {bool(settings.storage.minio_access_key)}")
```

## Environment-Specific Configuration

### Development

```bash
DEBUG=true
LOG_LEVEL=DEBUG
DATABASE_URL=postgresql://localhost/lc_workflow_dev
REDIS_URL=redis://localhost:6379
```

### Production

```bash
DEBUG=false
LOG_LEVEL=WARNING
DATABASE_URL=postgresql://user:pass@prod-host/lc_workflow
REDIS_URL=redis://prod-redis:6379
SECRET_KEY=your-secure-secret-key
MINIO_ENDPOINT=https://your-minio-endpoint
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
```

### Testing

```bash
ENVIRONMENT=testing
DEBUG=true
DATABASE_URL=postgresql://localhost/lc_workflow_test
LOG_LEVEL=DEBUG
```

This refactored configuration system provides better organization, enhanced security, improved maintainability, and comprehensive documentation while maintaining full backward compatibility with existing code.