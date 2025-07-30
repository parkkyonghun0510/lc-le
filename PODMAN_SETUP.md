# Podman Setup Guide for LC Workflow Backend

This guide provides instructions for setting up the LC Workflow backend using Podman instead of Docker.

## Prerequisites

- **Podman**: Install Podman 4.0+
- **Podman Compose**: Install podman-compose
- **PostgreSQL**: Will be provided via container
- **MinIO**: Will be provided via container

## Installation

### 1. Install Podman

**Windows (using WSL2 recommended)**:
```bash
# Install via Chocolatey
choco install podman

# Or download from https://podman.io/getting-started/installation
```

**Linux**:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install podman podman-compose

# CentOS/RHEL
sudo dnf install podman podman-compose
```

**macOS**:
```bash
# Using Homebrew
brew install podman podman-compose
```

### 2. Initialize Podman Machine (macOS/Windows)

```bash
# Create and start podman machine
podman machine init
podman machine start

# Verify it's running
podman machine list
```

### 3. Quick Start with Podman

**One-command setup**:
```bash
# Navigate to backend directory
cd backend

# Start all services with Podman Compose
podman-compose up --build
```

**Manual setup**:
```bash
# 1. Build the API image
podman build -t lc-workflow-api .

# 2. Create and start containers
podman-compose up -d
```

## Services

After running `podman-compose up`, you'll have:

- **API**: http://localhost:8000
- **PostgreSQL**: localhost:5432
- **MinIO**: http://localhost:9000
- **MinIO Console**: http://localhost:9001
- **API Documentation**: http://localhost:8000/docs

## Podman Commands

### Basic Operations

```bash
# Start services
podman-compose up -d

# View logs
podman-compose logs -f

# Stop services
podman-compose down

# Restart services
podman-compose restart

# View running containers
podman ps

# View all containers
podman ps -a
```

### Database Management

```bash
# Access PostgreSQL container
podman exec -it backend-db-1 psql -U postgres -d lc_workflow

# Run database migrations
podman exec -it backend-api-1 alembic upgrade head

# Create new migration
podman exec -it backend-api-1 alembic revision --autogenerate -m "description"
```

### File Storage

```bash
# Access MinIO console
# Visit http://localhost:9001
# Login: minioadmin / minioadmin

# Create bucket manually (if needed)
podman exec -it backend-minio-1 mc alias set local http://localhost:9000 minioadmin minioadmin
podman exec -it backend-minio-1 mc mb local/lc-workflow-files
```

## Environment Configuration

### 1. Create .env file

```bash
cp .env.example .env
```

### 2. Update .env for Podman

```bash
# Update these values in .env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/lc_workflow
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

## Troubleshooting

### Common Issues

**1. Permission denied on volumes**:
```bash
# Fix permissions on Linux/macOS
sudo chown -R $USER:$USER ./uploads

# Or use podman unshare
podman unshare chown -R 1000:1000 ./uploads
```

**2. Port conflicts**:
```bash
# Check what's using the ports
netstat -tulpn | grep :8000

# Stop conflicting services
podman-compose down
```

**3. Database connection issues**:
```bash
# Check if PostgreSQL is ready
podman logs backend-db-1

# Test connection
podman exec -it backend-api-1 python -c "from app.database import engine; print('DB Connected')"
```

**4. MinIO access issues**:
```bash
# Check MinIO logs
podman logs backend-minio-1

# Verify MinIO is accessible
podman exec -it backend-api-1 curl http://minio:9000/minio/health/live
```

### Reset Everything

```bash
# Stop and remove all containers
podman-compose down -v

# Remove images
podman rmi lc-workflow-api
podman rmi docker.io/postgres:15-alpine
podman rmi docker.io/minio/minio:latest

# Clean volumes
podman volume prune

# Start fresh
podman-compose up --build
```

## Development with Podman

### Hot Reload

The Podman setup includes volume mounts for development:
- `./uploads:/app/uploads` - File uploads
- Source code changes will trigger hot reload

### Debug Mode

```bash
# Run with debug logs
podman-compose -f podman-compose.yml up --build

# Or attach to container logs
podman-compose logs -f api
```

### Testing

```bash
# Run tests inside container
podman exec -it backend-api-1 python -m pytest tests/

# Run test setup verification
podman exec -it backend-api-1 python test_setup.py
```

## Production Considerations

### Security

```bash
# Use secrets for sensitive data
podman secret create db_password <(echo "your-secure-password")

# Update podman-compose.yml to use secrets
```

### Performance

```bash
# Use podman with systemd for production
podman generate systemd --name backend-api-1 > api.service
sudo systemctl enable api.service
sudo systemctl start api.service
```

## Podman vs Docker Differences

| Feature | Podman | Docker |
|---------|---------|---------|
| Rootless | ✅ Built-in | ⚠️ Requires configuration |
| Systemd Integration | ✅ Native | ⚠️ Requires docker-compose |
| Pod Support | ✅ Native | ❌ Not available |
| Image Compatibility | ✅ Docker compatible | ✅ Native |
| Compose | podman-compose | docker-compose |

## Next Steps

1. **Start services**: `podman-compose up --build`
2. **Access API**: http://localhost:8000/docs
3. **Configure Flutter**: Update API base URL to `http://localhost:8000`
4. **Create sample data**: Use the API documentation interface

The backend is now ready to run with Podman! 🚀