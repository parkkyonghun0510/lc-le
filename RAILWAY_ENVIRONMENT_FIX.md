# Railway Environment Configuration and SQLAlchemy Warning Fix

## Issues Addressed

### 1. Database URL Environment Variable Configuration
**Problem**: The backend was using hardcoded database URLs instead of Railway environment variables.

**Solution**: Enhanced the `config.py` to properly handle Railway's `DATABASE_URL` environment variable:

```python
# Handle Railway DATABASE_URL environment variable
database_url = os.getenv('DATABASE_URL')
if database_url:
    # Convert postgres:// to postgresql+asyncpg:// for async support
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql+asyncpg://', 1)
    elif not database_url.startswith('postgresql+asyncpg://'):
        # Add asyncpg driver if not present
        database_url = database_url.replace('postgresql://', 'postgresql+asyncpg://', 1)
    self.DATABASE_URL = database_url
```

**Benefits**:
- Automatically uses Railway's DATABASE_URL environment variable when available
- Converts standard PostgreSQL URLs to async-compatible format
- Falls back to hardcoded URL if environment variable is not set
- Works with both local development and Railway deployment

### 2. SQLAlchemy Relationship Warning Fix
**Problem**: SQLAlchemy warning about conflicting relationships:
```
SAWarning: relationship 'UserPermission.user' will copy column users.id to column user_permissions.user_id, which conflicts with relationship(s): 'User.user_permissions'
```

**Root Cause**: The `UserPermission` and `UserRole` models had relationships to `User` that overlapped with the reverse relationships defined in the `User` model.

**Solution**: Added `overlaps` parameter to the forward relationships:

```python
# In UserPermission model
user = relationship("User", foreign_keys=[user_id], overlaps="user_permissions")

# In UserRole model  
user = relationship("User", foreign_keys=[user_id], overlaps="user_roles")
```

**Benefits**:
- Eliminates SQLAlchemy warnings at startup
- Maintains proper relationship functionality
- Follows SQLAlchemy best practices for overlapping relationships

## Configuration Files Updated

### `/le-backend/app/core/config.py`
- Added automatic DATABASE_URL environment variable handling
- Enhanced Railway environment variable mapping
- Maintains backward compatibility with existing configurations

### `/le-backend/app/models/permissions.py`
- Fixed SQLAlchemy relationship warnings in `UserPermission` model
- Fixed SQLAlchemy relationship warnings in `UserRole` model
- Added proper `overlaps` parameters to resolve conflicts

## Railway Deployment Configuration

The backend is now properly configured to work with Railway's environment variables:

1. **DATABASE_URL**: Automatically picked up from Railway environment
2. **DRAGONFLY_URL**: Maps to REDIS_URL for Redis/Dragonfly compatibility
3. **MINIO_* variables**: Properly mapped for file storage
4. **CORS_ORIGINS**: Configured from Railway environment

## Environment Variables Expected on Railway

The application expects these environment variables to be set on Railway:

- `DATABASE_URL`: PostgreSQL database connection string (automatically provided by Railway)
- `FRONTEND_URL`: Frontend application URL for CORS configuration
- `DRAGONFLY_URL` or `REDIS_URL`: Redis/Dragonfly connection string
- `MINIO_*` variables: For file storage configuration

## Testing

To verify the fixes:

1. **Database Connection**: Check that the application connects to the correct database
2. **No SQLAlchemy Warnings**: Startup logs should not show relationship warnings
3. **Environment Variables**: Verify that Railway environment variables are being used

## Deployment Notes

- The application will automatically use Railway's DATABASE_URL when deployed
- Fallback URLs are maintained for local development
- All relationship warnings have been resolved
- The configuration is now production-ready for Railway deployment
