# MinIO Integration Guide

## Understanding the localhost:9000 Error

The error `urllib3.exceptions.MaxRetryError: HTTPConnectionPool(host='localhost', port=9000)... ConnectionRefusedError` occurs because:

1. **No Local MinIO Server**: There's no MinIO server running on your local machine at port 9000
2. **Railway Environment**: This is expected behavior when running locally - Railway provides the MinIO service in production
3. **Graceful Fallback**: The application now gracefully handles this by disabling MinIO in local development

## Railway MinIO Service

When deployed to Railway, the following environment variables are automatically provided:
- `RAILWAY_MINIO_ENDPOINT`: Railway MinIO server endpoint
- `RAILWAY_MINIO_ACCESS_KEY`: Railway MinIO access key
- `RAILWAY_MINIO_SECRET_KEY`: Railway MinIO secret key
- `RAILWAY_MINIO_SECURE`: Set to `true` for HTTPS

## Local Development Options

### Option 1: Deploy to Railway (Recommended)
Your application is ready for Railway deployment. The MinIO service will work automatically when deployed.

### Option 2: Run Local MinIO Server
If you need file storage during local development:

1. **Install MinIO**: Download from https://min.io/download
2. **Start MinIO**:
   ```bash
   # Windows
   minio.exe server C:\minio-data --console-address :9001
   
   # Or use Docker
   docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"
   ```
3. **Configure .env**:
   ```
   MINIO_ENDPOINT=localhost:9000
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minioadmin
   MINIO_SECURE=false
   ```

### Option 3: Mock File Storage
For development without actual file storage, the application will work with MinIO disabled - file uploads will be skipped but the app will still function.

## Testing MinIO Integration

### Check Service Status
```python
from app.services.minio_service import minio_service
print(f"MinIO Status: {'Enabled' if minio_service.enabled else 'Disabled'}")
```

### Test File Upload
```python
# When MinIO is enabled
with open("test.txt", "rb") as f:
    file_url = minio_service.upload_file(f.read(), "test.txt")
    print(f"File uploaded to: {file_url}")
```

## Deployment Checklist

- [ ] Application works locally with MinIO disabled
- [ ] Environment variables configured for Railway
- [ ] Railway deployment successful
- [ ] File uploads work in production
- [ ] Download links work correctly

## Troubleshooting

### Common Issues

1. **Connection Refused**: Expected in local development, use Railway deployment
2. **SSL Certificate Errors**: Railway handles SSL automatically in production
3. **Bucket Not Found**: Railway creates the bucket automatically
4. **Access Denied**: Check Railway environment variables are properly set

### Railway Commands
```bash
# Deploy to Railway
railway login
railway up

# Check Railway variables
railway variables
```