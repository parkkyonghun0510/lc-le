# Railway MinIO Image Upload Setup

## ✅ Status: WORKING CORRECTLY

Your backend image upload functionality with Railway MinIO is now fully configured and working!

## Configuration Summary

### Environment Variables (.env)
```env
# Railway MinIO Configuration
MINIO_ENDPOINT=https://bucket-production-65f3.up.railway.app:443
MINIO_ACCESS_KEY=d6zMfOMBcX62Eqo4HahT
MINIO_SECRET_KEY=Xr6HWNqI8CAG0ITZuQFzHt4VrZOqPWAyaKtmPGvT
MINIO_BUCKET_NAME=lc-workflow-files
MINIO_SECURE=true
```

### Features Verified
- ✅ MinIO connection established
- ✅ Bucket exists and accessible
- ✅ File upload working (all formats: PNG, JPEG, GIF, WEBP)
- ✅ Presigned URL generation working
- ✅ File metadata retrieval working
- ✅ File deletion working
- ✅ Secure HTTPS connection

## API Endpoints

### 1. Upload Files/Images
```http
POST /api/files/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form data:
- file: <file_data>
- application_id: <uuid> (optional)
```

**Example Response:**
```json
{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "filename": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
    "original_filename": "profile_picture.jpg",
    "file_path": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
    "file_size": 1234567,
    "mime_type": "image/jpeg",
    "uploaded_by": "user-uuid",
    "application_id": null,
    "created_at": "2024-01-01T12:00:00Z"
}
```

### 2. Get Download URL
```http
GET /api/files/{file_id}/download
Authorization: Bearer <token>
```

**Response:**
```json
{
    "download_url": "https://bucket-production-65f3.up.railway.app/lc-workflow-files/filename.jpg?X-Amz-Algorithm=..."
}
```

### 3. List Files
```http
GET /api/files/?page=1&size=10&application_id=<uuid>
Authorization: Bearer <token>
```

### 4. Get File Details
```http
GET /api/files/{file_id}
Authorization: Bearer <token>
```

### 5. Delete File
```http
DELETE /api/files/{file_id}
Authorization: Bearer <token>
```

## Supported File Types

### Images
- PNG (.png)
- JPEG/JPG (.jpg, .jpeg)
- GIF (.gif)
- WEBP (.webp)

### Documents
- PDF (.pdf)
- Word (.doc, .docx)
- Excel (.xls, .xlsx)
- PowerPoint (.ppt, .pptx)
- Text files (.txt)

## User Profile Images

The `User` model includes a `profile_image_url` field for storing profile pictures:

```python
class User(Base):
    # ... other fields
    profile_image_url = Column(Text)
```

To update a user's profile image:
1. Upload the image using `/api/files/upload`
2. Update the user's `profile_image_url` field with the file path
3. Use the download URL endpoint to display the image

## Security Features

1. **Authentication Required**: All endpoints require valid JWT tokens
2. **File Ownership**: Users can only access their own files (except admins)
3. **Presigned URLs**: Secure, time-limited access to files
4. **HTTPS Only**: All connections use secure HTTPS
5. **Unique Filenames**: UUIDs prevent filename collisions

## File Storage Details

- **Storage**: Railway MinIO service
- **Bucket**: `lc-workflow-files`
- **Naming**: Files are renamed with UUIDs for security
- **Original Names**: Preserved in the database
- **Metadata**: File size, MIME type, upload date tracked

## Testing

Run the test scripts to verify functionality:

```bash
# Test MinIO connection
python test_railway_minio.py

# Test image upload functionality
python test_image_upload.py
```

## Frontend Integration

### Upload Example (JavaScript)
```javascript
const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    
    return await response.json();
};
```

### Display Image Example
```javascript
const getImageUrl = async (fileId) => {
    const response = await fetch(`/api/files/${fileId}/download`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    const data = await response.json();
    return data.download_url;
};
```

## Error Handling

Common error scenarios:
- **401 Unauthorized**: Invalid or missing JWT token
- **403 Forbidden**: Trying to access someone else's file
- **404 Not Found**: File doesn't exist
- **413 Request Entity Too Large**: File exceeds size limit
- **500 Internal Server Error**: MinIO connection issues

## Production Considerations

1. **File Size Limits**: Currently set to 10MB (configurable)
2. **Backup**: Files are stored in Railway's managed MinIO
3. **CDN**: Consider adding CloudFlare or similar for better performance
4. **Monitoring**: Set up alerts for MinIO service health
5. **Cleanup**: Implement periodic cleanup of orphaned files

## Maintenance

### Regular Tasks
1. Monitor bucket storage usage
2. Clean up deleted application files
3. Verify MinIO service health
4. Update credentials if needed

### Troubleshooting
If uploads fail:
1. Check MinIO service status in Railway
2. Verify environment variables
3. Test connection with `test_railway_minio.py`
4. Check Railway logs for errors

## Next Steps

Your image upload system is ready for production! You can now:

1. **Integrate with Frontend**: Use the API endpoints in your React/Next.js app
2. **Add Image Processing**: Implement resize, compression, or thumbnails
3. **Enhance Security**: Add file type validation, virus scanning
4. **Add Features**: Bulk upload, drag & drop, progress tracking
5. **Optimize Performance**: Add caching, lazy loading, thumbnails

---

**🎉 Your Railway MinIO image upload system is working perfectly!**
