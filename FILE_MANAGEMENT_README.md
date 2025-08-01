# File Management System

This document describes the file management system implemented for the LC Workflow application.

## Overview

The file management system provides secure file upload, storage, retrieval, and management capabilities for the loan application workflow. Files can be associated with specific applications or stored as standalone documents.

## Backend Implementation

### API Endpoints

All file endpoints are prefixed with `/api/v1/files/`

#### Upload File
- **POST** `/upload`
- **Description**: Upload a new file
- **Parameters**:
  - `file`: File to upload (multipart/form-data)
  - `application_id`: Optional UUID to associate file with an application
- **Response**: File metadata including ID, filename, size, etc.

#### List Files
- **GET** `/`
- **Description**: Get paginated list of files
- **Query Parameters**:
  - `skip`: Number of records to skip (default: 0)
  - `limit`: Maximum records to return (default: 10, max: 100)
  - `application_id`: Filter by application ID
- **Response**: Paginated list of files

#### Get File Details
- **GET** `/{file_id}`
- **Description**: Get file metadata
- **Response**: File details

#### Download File
- **GET** `/{file_id}/download`
- **Description**: Download file content
- **Response**: File content with appropriate headers

#### Delete File
- **DELETE** `/{file_id}`
- **Description**: Delete a file
- **Response**: Success message

### Security Features

- **Authentication**: All endpoints require valid JWT token
- **Authorization**: Users can only access their own files (except admins)
- **File Validation**: File type and size restrictions
- **Secure Storage**: Files stored outside web root with unique names

### File Storage

- **Development**: Local `uploads/` directory
- **Production**: MinIO S3-compatible storage (configurable)
- **File Naming**: UUID-based names to prevent conflicts and enhance security

## Frontend Implementation

### Components

#### FileManager
- **Location**: `src/components/files/FileManager.tsx`
- **Purpose**: Complete file management interface
- **Features**: Upload, list, preview, download, delete files
- **Props**:
  - `applicationId`: Optional application ID to filter files
  - `showUpload`: Whether to show upload button
  - `compact`: Compact view mode
  - `maxFiles`: Maximum files to display

#### FileUploadModal
- **Location**: `src/components/files/FileUploadModal.tsx`
- **Purpose**: Drag-and-drop file upload interface
- **Features**: Multiple file upload, progress tracking, file validation

#### FilePreview
- **Location**: `src/components/files/FilePreview.tsx`
- **Purpose**: Preview files in modal
- **Supported Types**: Images, PDFs, text files

#### FileBrowser
- **Location**: `src/components/files/FileBrowser.tsx`
- **Purpose**: Simple file browser for selection
- **Features**: File selection, preview, basic actions

### Pages

#### Files Page
- **Location**: `src/app/files/page.tsx`
- **Purpose**: Main file management page
- **Features**: Full file management interface with search and filtering

### Hooks

#### useFiles
- **Location**: `src/hooks/useFiles.ts`
- **Purpose**: React Query hooks for file operations
- **Functions**:
  - `useFiles()`: List files with pagination
  - `useFile()`: Get single file details
  - `useUploadFile()`: Upload file mutation
  - `useDeleteFile()`: Delete file mutation
  - `useDownloadFile()`: Download file utility

## Usage Examples

### Basic File Upload

```typescript
import { useUploadFile } from '@/hooks/useFiles';

const uploadMutation = useUploadFile();

const handleUpload = async (file: File) => {
  await uploadMutation.mutateAsync({
    file,
    applicationId: 'optional-app-id'
  });
};
```

### File Manager Component

```typescript
import FileManager from '@/components/files/FileManager';

// Full file manager
<FileManager 
  applicationId="app-123"
  showUpload={true}
/>

// Compact view
<FileManager 
  applicationId="app-123"
  compact={true}
  maxFiles={5}
/>
```

### File Browser for Selection

```typescript
import FileBrowser from '@/components/files/FileBrowser';

<FileBrowser
  applicationId="app-123"
  selectable={true}
  onFileSelect={(file) => console.log('Selected:', file)}
/>
```

## Configuration

### Environment Variables

```bash
# File storage configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes

# MinIO configuration (production)
MINIO_ENDPOINT=your-minio-endpoint
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET_NAME=lc-workflow-files
MINIO_SECURE=true
```

### Supported File Types

- **Images**: PNG, JPG, JPEG, GIF
- **Documents**: PDF, DOC, DOCX, XLS, XLSX
- **Text**: TXT, CSV
- **Maximum Size**: 10MB per file

## Testing

### Backend Testing

Run the test script to verify backend functionality:

```bash
python test_file_upload.py
```

This script tests:
- Authentication
- File upload
- File listing
- File download
- File deletion

### Frontend Testing

1. Start the development server:
   ```bash
   cd lc-workflow-frontend
   npm run dev
   ```

2. Navigate to `/files` to test the file management interface

3. Test features:
   - Upload files via drag-and-drop
   - Preview different file types
   - Download files
   - Delete files (if authorized)

## Security Considerations

1. **File Validation**: Only allowed file types can be uploaded
2. **Size Limits**: Files are limited to 10MB by default
3. **Access Control**: Users can only access their own files
4. **Secure Storage**: Files stored with UUID names outside web root
5. **Authentication**: All operations require valid JWT token

## Troubleshooting

### Common Issues

1. **Upload Fails**: Check file size and type restrictions
2. **Download Issues**: Verify authentication token is valid
3. **Preview Not Working**: Ensure file type is supported for preview
4. **Permission Denied**: Check user role and file ownership

### Debug Mode

Enable debug logging by setting `DEBUG=true` in environment variables.

## Future Enhancements

1. **File Versioning**: Track file versions and changes
2. **Bulk Operations**: Upload/download multiple files at once
3. **File Sharing**: Share files between users with permissions
4. **Advanced Search**: Search files by content, metadata, etc.
5. **Thumbnails**: Generate thumbnails for images and documents
6. **Virus Scanning**: Integrate antivirus scanning for uploads