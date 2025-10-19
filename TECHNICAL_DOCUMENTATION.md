# LE Workflow System - Technical Documentation

## System Overview

The LE Workflow System is a comprehensive loan application management platform consisting of a Next.js frontend (`lc-workflow-frontend`) and a FastAPI backend (`le-backend`). The system provides end-to-end functionality for managing loan applications, user roles, file storage, and organizational structure.

## Architecture

### Frontend (lc-workflow-frontend)

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form with Zod validation

### Backend (le-backend)

- **Framework**: FastAPI
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT with refresh tokens
- **File Storage**: MinIO (S3-compatible)
- **Caching**: Redis/Dragonfly

## Key Features

### Authentication & Authorization

- JWT-based authentication with refresh token mechanism
- Role-based access control (RBAC) system
- Permission templates for quick role assignment

### Application Management

- Complete loan application lifecycle management
- Document attachment workflow for guarantor and collateral
- Form validation with client and server-side checks

### File Management

- Secure file upload with MinIO integration
- Presigned URL mechanism for secure file access
- File categorization and organization system
- Advanced file explorer with search capabilities

### User & Organization Management

- User management with role assignment
- Department and branch organization
- Position management

### Network Diagnostics

- Built-in network diagnostic tools
- API connectivity testing
- Browser environment information gathering

## Frontend Components

### Core Components

1. **File Management**
   - `CustomerFileExplorer.tsx`: Main file explorer for customer documents
   - `AdvancedFileExplorer.tsx`: Enhanced file browsing with search and filters
   - `FileExplorerView.tsx`: Display component for file listings
   - `FileManager.tsx`: Core file operations handler
   - `FolderFileExplorer.tsx`: Folder-based file navigation
   - `FileBrowser.tsx`: Base component for file browsing
   - `DocumentGrid.tsx`: Grid display for document thumbnails
   - `MobileFileUpload.tsx`: Optimized upload interface for mobile devices

2. **Document Processing**
   - `DocumentAttachmentStep.tsx`: Handles document upload workflow
   - Photo capture and upload functionality
   - Error handling for large files (413 errors)
   - Document type mapping between frontend and backend

3. **Network Tools**
   - `NetworkDiagnostic.tsx`: Component for network diagnostics
   - `NetworkDebugger.tsx`: Interface for API connectivity testing
   - `api.ts`: Network diagnostic utilities

4. **User Management**
   - `RoleManagement.tsx`: Interface for managing user roles
   - `GenerateTemplatesModal.tsx`: Permission template generation
   - `RoleDistributionChart.tsx`: Visualization of role distribution

5. **UI Components**
   - `Tooltip.tsx`: Reusable tooltip component
   - Notification system with `NotificationItem.tsx`

### Page Components

- `applications/page.tsx`: Application management interface
- `departments/page.tsx`: Department management interface

## Backend Services

### API Endpoints

1. **Authentication**
   - Login and token refresh
   - Setup verification

2. **User Management**
   - User CRUD operations
   - Role and permission management
   - Department-specific user listings

3. **Application Management**
   - Application creation and updates
   - Status tracking
   - Document attachment

4. **File Management**
   - Secure upload with presigned URLs
   - File metadata management
   - Folder organization

5. **System Health**
   - Health check endpoints
   - Email availability verification

### Data Flow

1. **PostgreSQL Full-Text Search**
   - Optimized search on JSONB fields

2. **Real-time Updates**
   - WebSocket-based data synchronization
   - Event types: `STATUS_CHANGED`, `FILE_UPLOADED`

3. **Performance Optimization**
   - Query optimization with eager loading
   - Database indexes (compound and partial)
   - Cursor-based pagination

### Security Features

- JWT authentication
- Role-based access control
- Rate limiting
- Secure file access via presigned URLs

## Database Optimization

1. **Index Strategies**
   - Compound indexes for multi-column queries
   - Partial indexes for filtered queries

2. **Performance Monitoring**
   - Query execution time tracking
   - Throughput measurement
   - Index efficiency analysis
   - Database health monitoring

3. **Cleanup System**
   - Enhanced folder service with cleanup integration
   - Monitoring for cleanup metrics

## Deployment

### Frontend Deployment

1. **Vercel Deployment**
   - Automated deployment from GitHub
   - Environment variable configuration

2. **Docker Deployment**
   - Containerized deployment with Dockerfile
   - Multi-stage build for optimization

### Backend Deployment

1. **Railway Deployment**
   - PostgreSQL service integration
   - Environment variable configuration

2. **Docker Deployment**
   - Docker Compose with PostgreSQL, MinIO, and Dragonfly services
   - Podman compatibility

## Integration Points

1. **Frontend-Backend Communication**
   - REST API with standardized endpoints
   - JWT authentication headers
   - File upload with presigned URLs

2. **Real-time Updates**
   - WebSocket connections for live data
   - Event-based synchronization

## Development Practices

1. **Database Migrations**
   - Alembic for schema versioning
   - Migration scripts for schema changes

2. **Code Quality**
   - TypeScript for type safety
   - Zod validation for forms
   - Comprehensive error handling

3. **Testing**
   - API endpoint testing
   - Frontend component testing

## Monitoring and Performance

1. **API Performance**
   - Query optimization
   - Connection pooling
   - Async/await patterns

2. **Frontend Performance**
   - Bundle size optimization
   - Image optimization
   - Lazy loading

## Conclusion

The LE Workflow System provides a comprehensive solution for loan application management with a focus on security, performance, and user experience. The modular architecture allows for easy extension and maintenance, while the deployment options provide flexibility for different hosting environments.