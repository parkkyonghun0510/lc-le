# LC Workflow Backend Architecture Documentation

## Overview

The LC Workflow backend is a **FastAPI-based microservice** designed for managing customer loan applications, user management, and document storage. It follows a **layered architecture** pattern with clear separation of concerns between API routes, business logic, data access, and external services.

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Client Applications                               │
│                    (Web Frontend, Mobile Apps, API)                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ HTTPS/REST API
                                        │
┌─────────────────────────────────────────────────────────────────────────────┐
│                          API Gateway Layer                                  │
│                    FastAPI + CORS + Rate Limiting                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ Dependency Injection
                                        │
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Business Logic Layer                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   Auth      │  │ Applications│  │   Files     │  │   Users     │       │
│  │  Service    │  │  Service    │  │  Service    │  │  Service    │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ Async/Await
                                        │
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Data Access Layer                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  PostgreSQL │  │    MinIO    │  │   Redis     │  │   Migrations│       │
│  │  Database   │  │   Storage   │  │   Cache     │  │   (Alembic) │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔧 Core Components

### 1. API Layer (FastAPI)

**Entry Point**: `app/main.py`
- **Framework**: FastAPI with async/await support
- **Lifespan Management**: Automatic database table creation on startup
- **CORS Configuration**: Cross-origin resource sharing for frontend integration
- **Static File Serving**: `/static` endpoint for uploaded documents

**Router Structure**:
```
/api/v1/
├── auth/           # Authentication & Authorization
├── users/          # User management
├── applications/   # Customer loan applications
├── files/          # File upload/download
├── folders/        # Document organization
├── customers/      # Customer management
├── departments/    # Department hierarchy
├── branches/       # Branch locations
├── dashboard/      # Analytics & reporting
├── positions/      # Job positions
├── settings/       # System configuration
└── enums/          # Enumerated values
```

### 2. Authentication & Security

**Authentication Flow**:
```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthService
    participant Database
    participant JWT

    Client->>API: POST /api/v1/auth/login
    API->>AuthService: authenticate_user(username, password)
    AuthService->>Database: fetch user with hashed password
    Database-->>AuthService: user data
    AuthService->>AuthService: verify_password(plain, hashed)
    AuthService-->>API: authenticated user
    API->>JWT: create_access_token(user.id)
    API->>JWT: create_refresh_token(user.id)
    JWT-->>API: tokens
    API->>Database: update last_login
    API-->>Client: {access_token, refresh_token, user}
```

**Security Features**:
- **JWT Tokens**: Access tokens (60 min expiry) + Refresh tokens (7 days)
- **Password Hashing**: bcrypt with passlib
- **Role-Based Access Control**: admin, manager, officer roles
- **OAuth2**: Standard OAuth2PasswordBearer implementation

### 3. Database Layer

**Technology Stack**:
- **PostgreSQL**: Primary relational database
- **SQLAlchemy**: Async ORM with declarative base
- **Alembic**: Database migration management
- **UUID**: Primary keys for distributed compatibility

**Entity Relationship Diagram**:
```mermaid
erDiagram
    User ||--o{ CustomerApplication : creates
    User ||--o{ File : uploads
    User ||--|| Department : belongs_to
    User ||--|| Branch : belongs_to
    User ||--|| Position : has
    
    CustomerApplication ||--o{ File : has
    CustomerApplication ||--o{ Folder : organized_in
    
    Department ||--o{ User : manages
    Branch ||--o{ User : manages
    Position ||--o{ User : has
    
    File ||--o{ Folder : belongs_to
    Folder ||--o{ File : contains
    
    User {
        uuid id PK
        string username
        string email
        string password_hash
        string first_name
        string last_name
        string role
        uuid department_id FK
        uuid branch_id FK
        uuid position_id FK
    }
    
    CustomerApplication {
        uuid id PK
        uuid user_id FK
        string status
        string account_id
        json loan_details
        json borrower_info
        json guarantor_info
        json financial_data
    }
    
    File {
        uuid id PK
        string filename
        string original_filename
        string file_path
        bigint file_size
        uuid uploaded_by FK
        uuid application_id FK
        uuid folder_id FK
    }
```

### 4. File Storage System

**MinIO Integration**:
- **Object Storage**: S3-compatible storage for documents
- **Presigned URLs**: Secure, time-limited file access
- **Organized Storage**: Hierarchical folder structure
- **Multiple Upload Methods**: Direct upload, presigned URLs, chunked uploads

**File Upload Flow**:
```mermaid
sequenceDiagram
    participant Client
    participant API
    participant MinIOService
    participant Database
    participant MinIO

    Client->>API: POST /api/v1/files/upload
    API->>API: Authorization check
    API->>Database: Validate application/folder access
    Database-->>API: validation result
    API->>MinIOService: upload_file(content, metadata)
    MinIOService->>MinIO: PUT object
    MinIO-->>MinIOService: object_name
    MinIOService-->>API: storage_path
    API->>Database: create File record
    Database-->>API: file_id
    API-->>Client: FileResponse
```

**Storage Organization**:
```
lc-workflow-files (bucket)
├── applications/
│   ├── {application_id}/
│   │   ├── borrower-documents/
│   │   ├── guarantor-documents/
│   │   └── collateral-documents/
├── user-uploads/
│   └── {user_id}/
└── system/
    └── templates/
```

### 5. Customer Application Processing

**Application Lifecycle**:
```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> submitted : submit_application
    submitted --> initial_review : auto_assignment
    initial_review --> credit_check : review_complete
    credit_check --> approval_pending : risk_assessment
    approval_pending --> approved : manager_approval
    approval_pending --> rejected : rejection_reason
    approved --> disbursed : loan_disbursement
    rejected --> [*]
    disbursed --> completed : loan_repayment
    completed --> [*]
```

**Data Processing Pipeline**:
1. **Application Creation**: User creates draft with basic information
2. **Document Collection**: Upload supporting documents to folders
3. **Risk Assessment**: Automated credit scoring and risk categorization
4. **Workflow Assignment**: Automatic assignment to reviewers based on workload
5. **Approval Process**: Multi-level approval with audit trails
6. **Loan Disbursement**: Integration with core banking system

### 6. Configuration Management

**Environment Configuration**:
- **Pydantic Settings**: Type-safe configuration with validation
- **Environment Variables**: Railway-compatible configuration
- **Fallback Values**: Default values for local development
- **SSL/TLS**: Automatic SSL configuration for production

**Key Configuration Areas**:
```yaml
# Database
DATABASE_URL: postgresql+asyncpg://...

# Security
SECRET_KEY: your-jwt-secret
ACCESS_TOKEN_EXPIRE_MINUTES: 60

# Storage
MINIO_ENDPOINT: minio.railway.app
MINIO_ACCESS_KEY: access-key
MINIO_SECRET_KEY: secret-key
MINIO_BUCKET_NAME: lc-workflow-files

# CORS
ALLOWED_ORIGINS: ["http://localhost:3000", "https://yourdomain.com"]
```

## 🔄 Data Flow Patterns

### 1. Request Processing Flow

```mermaid
flowchart TD
    A[HTTP Request] --> B[CORS Middleware]
    B --> C[Authentication Middleware]
    C --> D[Route Handler]
    D --> E[Service Layer]
    E --> F[Database Query]
    F --> G[ORM Mapping]
    G --> H[Response Serialization]
    H --> I[HTTP Response]
```

### 2. File Upload Flow

```mermaid
flowchart TD
    A[Client Upload Request] --> B{Authorization Check}
    B -->|Authorized| C[Validate File]
    B -->|Unauthorized| D[403 Forbidden]
    C --> E{File Size Check}
    E -->|Valid| F[Upload to MinIO]
    E -->|Invalid| G[413 Too Large]
    F --> H[Generate Object Name]
    H --> I[Store in Database]
    I --> J[Return File Metadata]
    J --> K[Client Success Response]
```

### 3. Application Processing Flow

```mermaid
flowchart TD
    A[New Application] --> B[Create Draft]
    B --> C[Upload Documents]
    C --> D[Submit Application]
    D --> E[Auto-assign Reviewer]
    E --> F[Risk Assessment]
    F --> G{Approval Decision}
    G -->|Approve| H[Update Status]
    G -->|Reject| I[Send Notification]
    H --> J[Loan Disbursement]
    J --> K[Complete Process]
```

## 📊 Performance & Scalability

### 1. Database Optimization

**Connection Management**:
- **Async Sessions**: Non-blocking database operations
- **Connection Pooling**: Efficient connection reuse
- **Query Optimization**: Indexed foreign keys and search fields

**Indexing Strategy**:
```sql
-- User indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_department ON users(department_id);

-- Application indexes
CREATE INDEX idx_applications_user ON customer_applications(user_id);
CREATE INDEX idx_applications_status ON customer_applications(status);
CREATE INDEX idx_applications_account ON customer_applications(account_id);

-- File indexes
CREATE INDEX idx_files_application ON files(application_id);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX idx_files_created_at ON files(created_at);
```

### 2. Storage Optimization

**MinIO Best Practices**:
- **Presigned URLs**: Reduce server load for file transfers
- **Multipart Uploads**: Handle large files efficiently
- **Lifecycle Policies**: Automatic archival of old documents
- **CDN Integration**: Serve static files via CDN

### 3. Caching Strategy

**Redis Integration** (Future enhancement):
- **Session Management**: Cache user sessions
- **Query Results**: Cache frequently accessed data
- **File Metadata**: Cache file information
- **Rate Limiting**: API rate limiting per user

## 🔐 Security Architecture

### 1. Authentication Layers

**Token-Based Security**:
- **JWT Access Tokens**: Short-lived tokens (60 minutes)
- **Refresh Tokens**: Long-lived tokens (7 days)
- **Token Validation**: Signature verification on every request
- **Token Revocation**: Logout functionality

**Role-Based Access Control (RBAC)**:
```python
# Permission matrix
permissions = {
    "admin": ["*"],  # All permissions
    "manager": ["read", "write", "approve"],
    "officer": ["read", "write"],
    "viewer": ["read"]
}
```

### 2. Data Protection

**Encryption**:
- **Password Hashing**: bcrypt with salt
- **Database Encryption**: Column-level encryption for sensitive data
- **File Encryption**: Server-side encryption for stored files
- **HTTPS**: TLS 1.3 for all communications

**Audit Trail**:
- **User Actions**: Track all user activities
- **File Access**: Log file downloads and uploads
- **Application Changes**: Track status changes and approvals
- **System Events**: Monitor system health and errors

## 🚀 Deployment Architecture

### 1. Railway Deployment

**Infrastructure as Code**:
```yaml
# railway.toml
[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
```

**Service Dependencies**:
- **PostgreSQL**: Managed database service
- **MinIO**: Object storage service
- **Redis**: Caching and session storage
- **Monitoring**: Health checks and logging

### 2. Environment Configuration

**Railway Environment Variables**:
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/database

# MinIO/S3
MINIO_ENDPOINT=minio.railway.app
MINIO_ACCESS_KEY=access-key
MINIO_SECRET_KEY=secret-key
MINIO_BUCKET_NAME=lc-workflow-files

# Security
SECRET_KEY=your-jwt-secret-key
DEBUG=false
```

## 📈 Monitoring & Observability

### 1. Health Checks

**Endpoints**:
- `/health` - Basic service health
- `/api/v1/health` - Database connectivity check
- `/metrics` - Prometheus metrics (future)

**Health Check Flow**:
```mermaid
sequenceDiagram
    participant Monitor
    participant API
    participant Database
    participant MinIO

    Monitor->>API: GET /health
    API->>Database: SELECT 1
    Database-->>API: OK
    API->>MinIO: bucket_exists()
    MinIO-->>API: OK
    API-->>Monitor: {"status": "healthy"}
```

### 2. Logging Strategy

**Structured Logging**:
- **Request ID**: Trace requests across services
- **User Context**: Log user actions with context
- **Performance Metrics**: Response times and database queries
- **Error Tracking**: Centralized error reporting

## 🔄 Integration Patterns

### 1. External Service Integration

**Banking System Integration** (Future):
- **REST APIs**: Core banking system APIs
- **Webhooks**: Real-time notifications
- **Batch Processing**: Nightly reconciliation
- **Audit Compliance**: Regulatory reporting

### 2. Third-Party Services

**Document Verification**:
- **OCR Services**: Automatic document processing
- **Identity Verification**: KYC compliance
- **Credit Bureaus**: Credit score integration
- **SMS/Email**: Notification services

## 🎯 Future Enhancements

### 1. Microservices Architecture

**Service Decomposition**:
- **User Service**: Authentication and user management
- **Application Service**: Loan application processing
- **Document Service**: File storage and management
- **Notification Service**: Real-time notifications
- **Analytics Service**: Business intelligence and reporting

### 2. Event-Driven Architecture

**Message Queue Integration**:
- **Application Events**: Application status changes
- **File Processing**: Document upload notifications
- **User Notifications**: Email/SMS triggers
- **Audit Events**: Compliance logging

### 3. Advanced Features

**Machine Learning**:
- **Risk Scoring**: AI-powered risk assessment
- **Document Classification**: Automatic document categorization
- **Fraud Detection**: Pattern recognition for fraud prevention
- **Chatbot Integration**: AI-powered customer support

---

This architecture provides a robust, scalable foundation for the LC Workflow system with clear separation of concerns, security best practices, and room for future growth and enhancement.