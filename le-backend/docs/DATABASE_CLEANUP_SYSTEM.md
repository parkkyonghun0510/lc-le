# Database Cleanup System Documentation

## Overview

The Database Cleanup System provides comprehensive tools for maintaining database integrity, specifically targeting duplicate folder issues that cause system instability. This system includes automated cleanup services, rollback capabilities, and integrity verification tools.

## Components

### 1. Database Cleanup Service (`app/services/database_cleanup_service.py`)

The core service that handles duplicate folder consolidation and database integrity operations.

#### Key Features:
- **Duplicate Detection**: Identifies applications with multiple parent folders
- **Safe Consolidation**: Merges duplicate folders while preserving all data
- **Rollback Capability**: Creates rollback points before operations
- **Integrity Verification**: Validates database consistency
- **Comprehensive Reporting**: Detailed operation reports

#### Main Classes:
- `DatabaseCleanupService`: Core cleanup functionality
- `CleanupReport`: Comprehensive operation reporting
- `FolderCleanupResult`: Individual application cleanup results
- `RollbackData`: Rollback point data structure

### 2. Automated Cleanup Service (`app/services/automated_cleanup_service.py`)

Provides scheduled, automated maintenance operations.

#### Key Features:
- **Scheduled Operations**: Hourly, daily, and weekly cleanup schedules
- **Consistency Monitoring**: Regular integrity checks
- **Alert System**: Notifications when issues exceed thresholds
- **Service Management**: Start/stop automated operations

#### Schedule Types:
- **Consistency Check** (Hourly): Identifies issues without making changes
- **Full Cleanup** (Daily): Performs actual cleanup operations
- **Integrity Verification** (Weekly): Comprehensive database validation

### 3. Management Script (`scripts/database_cleanup.py`)

Command-line interface for manual cleanup operations.

#### Available Commands:
```bash
# Show what would be cleaned (no changes)
python scripts/database_cleanup.py --dry-run

# Perform actual cleanup
python scripts/database_cleanup.py --cleanup

# Verify database integrity
python scripts/database_cleanup.py --verify

# Show service status
python scripts/database_cleanup.py --status

# Run consistency check
python scripts/database_cleanup.py --check

# Rollback a cleanup operation
python scripts/database_cleanup.py --rollback <rollback_id>
```

### 4. REST API Endpoints (`app/routers/cleanup.py`)

Web API for cleanup operations integration.

#### Endpoints:
- `GET /api/cleanup/status` - Get service status
- `POST /api/cleanup/check` - Run consistency check
- `POST /api/cleanup/verify` - Verify database integrity
- `POST /api/cleanup/cleanup` - Run cleanup operation
- `POST /api/cleanup/rollback/{rollback_id}` - Rollback operation

### 5. Database Migration (`migrations/versions/20250118_add_folder_constraints.py`)

Adds database constraints to prevent future duplicate folder issues.

#### Constraints Added:
- Unique constraint for parent folders per application
- Unique constraint for child folder names within same parent
- Check constraints for application consistency
- Performance indexes

## Usage Guide

### Manual Cleanup

1. **Check for Issues**:
   ```bash
   python scripts/database_cleanup.py --dry-run
   ```

2. **Perform Cleanup**:
   ```bash
   python scripts/database_cleanup.py --cleanup
   ```

3. **Verify Results**:
   ```bash
   python scripts/database_cleanup.py --verify
   ```

### Automated Service

1. **Check Service Status**:
   ```bash
   python scripts/database_cleanup.py --status
   ```

2. **Start Automated Service** (in application startup):
   ```python
   from app.services.automated_cleanup_service import automated_cleanup_service
   await automated_cleanup_service.start_automated_service()
   ```

### API Integration

```python
import httpx

# Check for issues
response = await client.post("/api/cleanup/check")
consistency_results = response.json()

# Run cleanup
response = await client.post("/api/cleanup/cleanup", params={"dry_run": False})
cleanup_results = response.json()
```

## Safety Features

### Rollback Capability

Every cleanup operation creates a rollback point that can restore the previous state:

```python
# Automatic rollback point creation
rollback_id = await cleanup_service.create_rollback_point(db, application_id)

# Manual rollback if needed
success = await cleanup_service.rollback_cleanup(db, rollback_id)
```

### Dry Run Mode

All operations support dry run mode to preview changes without making modifications:

```python
# Preview what would be cleaned
report = await cleanup_service.cleanup_all_duplicate_folders(db, dry_run=True)
```

### Integrity Verification

Comprehensive verification ensures database consistency:

```python
# Verify specific application
results = await cleanup_service.verify_cleanup_integrity(db, application_id)

# Verify entire database
results = await cleanup_service.verify_cleanup_integrity(db)
```

## Monitoring and Alerting

### Service Statistics

The automated service tracks comprehensive statistics:

```python
status = automated_cleanup_service.get_service_status()
stats = status['statistics']

print(f"Total runs: {stats['total_runs']}")
print(f"Applications cleaned: {stats['applications_cleaned']}")
print(f"Folders removed: {stats['folders_removed']}")
```

### Alert Thresholds

Configurable thresholds trigger alerts when issues exceed acceptable levels:

- Default threshold: 5 applications with duplicates
- Configurable per schedule type
- Automatic escalation for critical issues

## Error Handling

### Graceful Failure Recovery

- Automatic rollback on operation failures
- Detailed error logging with correlation IDs
- Retry mechanisms for transient failures
- Safe degradation under resource constraints

### Error Classification

- **Transient Errors**: Network issues, temporary locks
- **Data Errors**: Constraint violations, orphaned records
- **System Errors**: Resource exhaustion, service unavailability

## Performance Considerations

### Batch Processing

- Configurable batch sizes for large datasets
- Progress tracking for long-running operations
- Resource usage monitoring and throttling

### Database Optimization

- Efficient queries with proper indexing
- Transaction management for consistency
- Connection pooling for scalability

### Memory Management

- Streaming processing for large datasets
- Garbage collection optimization
- Resource cleanup after operations

## Configuration

### Schedule Configuration

```python
# Update schedule settings
automated_cleanup_service.update_schedule(
    'full_cleanup',
    enabled=True,
    max_applications=50
)
```

### Service Settings

```python
# Configure alert thresholds
schedule = automated_cleanup_service.schedules['consistency_check']
schedule.alert_threshold = 10
schedule.dry_run_first = False
```

## Troubleshooting

### Common Issues

1. **High Number of Duplicates**:
   - Run consistency check to assess scope
   - Consider increasing batch sizes
   - Schedule cleanup during low-usage periods

2. **Cleanup Failures**:
   - Check database connectivity
   - Verify sufficient disk space
   - Review error logs for specific issues

3. **Performance Issues**:
   - Monitor database load during operations
   - Adjust batch sizes and timing
   - Consider index optimization

### Diagnostic Commands

```bash
# Check current database state
python scripts/database_cleanup.py --check

# Verify integrity after cleanup
python scripts/database_cleanup.py --verify

# Review service statistics
python scripts/database_cleanup.py --status
```

## Best Practices

### Operational Guidelines

1. **Always run dry-run first** for new environments
2. **Monitor service statistics** regularly
3. **Set appropriate alert thresholds** for your environment
4. **Schedule cleanups during low-usage periods**
5. **Keep rollback points** until operations are verified

### Development Guidelines

1. **Test cleanup operations** in development environments
2. **Use transactions** for all database modifications
3. **Implement comprehensive logging** for troubleshooting
4. **Follow rollback-first approach** for safety
5. **Monitor performance impact** of cleanup operations

## Integration with Existing Systems

### Folder Service Integration

The cleanup system integrates with the existing folder service to prevent future duplicates:

```python
# Enhanced folder service with cleanup integration
from app.services.database_cleanup_service import cleanup_service

async def get_or_create_folder_structure(db, application_id):
    # Check for duplicates before creating
    duplicates = await cleanup_service.find_applications_with_duplicate_folders(db)
    
    if any(app_id == application_id for app_id, _ in duplicates):
        # Clean up duplicates first
        await cleanup_service.consolidate_duplicate_folders(db, application_id)
    
    # Proceed with normal folder creation
    return await create_folder_structure(db, application_id)
```

### Monitoring Integration

```python
# Integration with monitoring systems
from app.services.automated_cleanup_service import automated_cleanup_service

# Custom metrics collection
async def collect_cleanup_metrics():
    status = automated_cleanup_service.get_service_status()
    
    # Send metrics to monitoring system
    metrics.gauge('cleanup.applications_cleaned', status['statistics']['applications_cleaned'])
    metrics.gauge('cleanup.folders_removed', status['statistics']['folders_removed'])
    metrics.gauge('cleanup.success_rate', 
                  status['statistics']['successful_runs'] / max(1, status['statistics']['total_runs']))
```

This comprehensive cleanup system ensures database integrity while providing safety mechanisms and operational visibility for maintaining system stability.