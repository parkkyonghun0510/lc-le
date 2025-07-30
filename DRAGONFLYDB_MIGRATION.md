# DragonflyDB Migration Guide

This guide explains how to migrate from Redis to DragonflyDB for the LC Workflow backend.

## Overview

DragonflyDB is a drop-in replacement for Redis that provides:
- **25x higher throughput** than Redis
- **Better memory efficiency**
- **Multi-threaded architecture**
- **Full Redis protocol compatibility**

## Changes Made

### 1. Docker Compose Configuration
- Added `dragonfly` service to both `docker-compose.yml` and `podman-compose.yml`
- Updated `REDIS_URL` environment variable to point to `redis://dragonfly:6379`
- Added health checks for DragonflyDB
- Added proper volume persistence for DragonflyDB data

### 2. Environment Configuration
- Updated `.env.example` to include `REDIS_URL` configuration
- Added DragonflyDB service dependencies to API service

### 3. Docker Image
- Added `redis-tools` package to Dockerfile for health checks

## Usage

### With Docker Compose
```bash
docker-compose up -d
```

### With Podman Compose
```bash
podman-compose up -d
```

## Verification

### Check DragonflyDB is running
```bash
# Docker Compose
docker-compose ps

# Podman Compose
podman-compose ps
```

### Test connection
```bash
# Using redis-cli
redis-cli -h localhost -p 6379 ping
# Should return: PONG
```

### Check API health
```bash
curl http://localhost:8000/api/v1/health
```

## Configuration

### Environment Variables
- `REDIS_URL`: Set to `redis://dragonfly:6379` in containerized environments
- `REDIS_URL`: Set to `redis://localhost:6379` for local development

### Ports
- DragonflyDB: `6379` (same as Redis for drop-in compatibility)

## Performance Tuning

For production environments, consider these DragonflyDB optimizations:

### Memory Settings
```yaml
# Add to dragonfly service in docker-compose.yml
environment:
  - MAX_MEMORY=2gb
  - CACHE_MODE=true
```

### Threading
```yaml
# Add to dragonfly service in docker-compose.yml
command: >
  --proactor_threads=4
  --maxmemory=2gb
```

## Rollback

If you need to rollback to Redis:

1. Stop DragonflyDB service
2. Replace `dragonfly` service with `redis` service in compose files
3. Update `REDIS_URL` to point to `redis://redis:6379`
4. Restart services

## Monitoring

### Basic Metrics
```bash
# Connect to DragonflyDB
redis-cli -h localhost -p 6379

# Check info
INFO server
INFO memory
INFO stats
```

### Docker Logs
```bash
# Docker Compose
docker-compose logs dragonfly

# Podman Compose
podman-compose logs dragonfly
```

## Notes

- DragonflyDB is fully compatible with existing Redis clients
- No code changes required in the application
- All Redis commands work as expected
- Data persistence is maintained across container restarts