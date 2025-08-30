# LC Workflow Backend - Detailed Sequence Diagrams

## 1. Complete User Authentication Flow

### User Registration and Login

```mermaid
sequenceDiagram
    participant Frontend
    participant API
    participant AuthRouter
    participant UserService
    participant Database
    participant JWTService
    participant MinIO

    Frontend->>API: POST /api/v1/auth/setup-required
    API->>Database: SELECT COUNT(*) FROM users
    Database-->>API: user_count = 0
    API-->>Frontend: {setup_required: true}

    Frontend->>API: POST /api/v1/users/register (first user)
    API->>UserService: create_user(user_data)
    UserService->>UserService: hash_password(password)
    UserService->>Database: INSERT INTO users
    Database-->>UserService: user_created
    UserService-->>API: user_response
    API-->>Frontend: {user: {...}, message: "User created"}

    Frontend->>API: POST /api/v1/auth/login
    API->>AuthRouter: login(username, password)
    AuthRouter->>Database: SELECT * FROM users WHERE username = ?
    Database-->>AuthRouter: user_record
    AuthRouter->>AuthRouter: verify_password(password, hash)
    AuthRouter->>Database: UPDATE users SET last_login_at = NOW()
    Database-->>AuthRouter: updated
    AuthRouter->>JWTService: create_access_token(user_id)
    JWTService-->>AuthRouter: access_token
    AuthRouter->>JWTService: create_refresh_token(user_id)
    JWTService-->>AuthRouter: refresh_token
    AuthRouter-->>Frontend: {access_token, refresh_token, user}
```

## 2. File Upload with Authorization Check

### Direct File Upload Flow

```mermaid
sequenceDiagram
    participant Client
    participant FilesRouter
    participant AuthMiddleware
    participant Database
    participant MinIOService
    participant MinIO

    Client->>FilesRouter: POST /api/v1/files/upload (multipart/form-data)
    FilesRouter->>AuthMiddleware: get_current_user(token)
    AuthMiddleware->>Database: SELECT * FROM users WHERE username = ?
    Database-->>AuthMiddleware: user_record
    AuthMiddleware-->>FilesRouter: current_user

    FilesRouter->>Database: SELECT * FROM customer_applications WHERE id = ?
    Database-->>FilesRouter: application_record
    FilesRouter->>FilesRouter: check_user_permission(current_user, application)

    FilesRouter->>FilesRouter: validate_file_size(file.size)
    FilesRouter->>FilesRouter: read_file_content(file)

    FilesRouter->>MinIOService: upload_file(content, filename, content_type, prefix)
    MinIOService->>MinIO: PUT /lc-workflow-files/{prefix}/{uuid_filename}
    MinIO-->>MinIOService: upload_success
    MinIOService-->>FilesRouter: object_name

    FilesRouter->>Database: INSERT INTO files (filename, path, size, user_id, app_id)
    Database-->>FilesRouter: file_record
    FilesRouter-->>Client: FileResponse {id, filename, url, size, created_at}
```

### Presigned URL Upload Flow

```mermaid
sequenceDiagram
    participant Client
    participant FilesRouter
    participant MinIOService
    participant MinIO

    Client->>FilesRouter: POST /api/v1/files/upload-url
    FilesRouter->>FilesRouter: validate_request(application_id, folder_id)
    FilesRouter->>MinIOService: get_upload_url(filename)
    MinIOService->>MinIO: presigned PUT URL
    MinIO-->>MinIOService: {url, expires_in}
    MinIOService-->>FilesRouter: upload_credentials
    FilesRouter-->>Client: {upload_url, object_name, expires_in}

    Client->>MinIO: PUT {upload_url} (file content)
    MinIO-->>Client: 200 OK

    Client->>FilesRouter: POST /api/v1/files/finalize
    FilesRouter->>MinIOService: get_file_info(object_name)
    MinIOService->>MinIO: HEAD {object_name}
    MinIO-->>MinIOService: file_metadata
    MinIOService-->>FilesRouter: {size, content_type}

    FilesRouter->>Database: INSERT INTO files (...)
    Database-->>FilesRouter: file_record
    FilesRouter-->>Client: FileResponse
```

## 3. Customer Application Processing

### Application Creation Flow

```mermaid
sequenceDiagram
    participant Frontend
    participant ApplicationsRouter
    participant Database
    participant FileService
    participant NotificationService

    Frontend->>ApplicationsRouter: POST /api/v1/applications
    ApplicationsRouter->>Database: INSERT INTO customer_applications (draft)
    Database-->>ApplicationsRouter: application_id

    Frontend->>ApplicationsRouter: PATCH /api/v1/applications/{id}
    ApplicationsRouter->>Database: UPDATE customer_applications SET data = ?
    Database-->>ApplicationsRouter: updated

    Frontend->>FileService: POST /api/v1/files/upload (with application_id)
    FileService->>Database: INSERT INTO files (application_id = ...)
    FileService-->>Frontend: file_uploaded

    Frontend->>ApplicationsRouter: POST /api/v1/applications/{id}/submit
    ApplicationsRouter->>Database: UPDATE status = 'submitted'
    ApplicationsRouter->>Database: UPDATE submitted_at = NOW()
    ApplicationsRouter->>NotificationService: send_notification(reviewer)
    NotificationService-->>ApplicationsRouter: notification_sent
    ApplicationsRouter-->>Frontend: {status: 'submitted'}
```

### Application Review Workflow

```mermaid
sequenceDiagram
    participant Reviewer
    participant ApplicationsRouter
    participant Database
    participant AuditService
    participant NotificationService

    Reviewer->>ApplicationsRouter: GET /api/v1/applications?status=submitted
    ApplicationsRouter->>Database: SELECT * FROM customer_applications WHERE status = 'submitted'
    Database-->>ApplicationsRouter: applications_list
    ApplicationsRouter-->>Reviewer: applications_response

    Reviewer->>ApplicationsRouter: GET /api/v1/applications/{id}
    ApplicationsRouter->>Database: SELECT * FROM applications WHERE id = ?
    Database-->>ApplicationsRouter: application_details
    ApplicationsRouter->>Database: SELECT * FROM files WHERE application_id = ?
    Database-->>ApplicationsRouter: application_files
    ApplicationsRouter-->>Reviewer: full_application_data

    Reviewer->>ApplicationsRouter: PATCH /api/v1/applications/{id}/review
    ApplicationsRouter->>Database: UPDATE workflow_stage = 'credit_check'
    ApplicationsRouter->>AuditService: log_action(user_id, action, application_id)
    AuditService-->>ApplicationsRouter: audit_logged
    ApplicationsRouter-->>Reviewer: update_success

    Reviewer->>ApplicationsRouter: POST /api/v1/applications/{id}/approve
    ApplicationsRouter->>Database: UPDATE status = 'approved', approved_by = ?, approved_at = NOW()
    ApplicationsRouter->>NotificationService: notify_user(application.user_id, 'approved')
    NotificationService-->>ApplicationsRouter: user_notified
    ApplicationsRouter-->>Reviewer: approval_complete
```

## 4. File Download and Access

### Secure File Access Flow

```mermaid
sequenceDiagram
    participant Client
    participant FilesRouter
    participant Database
    participant MinIOService
    participant MinIO

    Client->>FilesRouter: GET /api/v1/files/{file_id}/download
    FilesRouter->>Database: SELECT * FROM files WHERE id = ?
    Database-->>FilesRouter: file_record
    
    FilesRouter->>Database: SELECT * FROM customer_applications WHERE id = ?
    Database-->>FilesRouter: application_record
    
    FilesRouter->>FilesRouter: check_file_access_permission(current_user, file, application)
    
    FilesRouter->>MinIOService: get_file_url(file.file_path, expires=3600)
    MinIOService->>MinIO: presigned GET URL
    MinIO-->>MinIOService: {presigned_url, expires_in}
    MinIOService-->>FilesRouter: download_url
    
    FilesRouter-->>Client: 302 Redirect {presigned_url}
    Client->>MinIO: GET {presigned_url}
    MinIO-->>Client: file_content (200 OK)
```

### Batch File Operations

```mermaid
sequenceDiagram
    participant Client
    participant FilesRouter
    participant Database
    participant MinIOService

    Client->>FilesRouter: GET /api/v1/files?application_id=xxx&page=1&size=20
    FilesRouter->>Database: SELECT * FROM files WHERE application_id = ? ORDER BY created_at DESC LIMIT 20 OFFSET 0
    Database-->>FilesRouter: files_list
    
    FilesRouter->>FilesRouter: filter_files_by_permissions(current_user, files)
    
    FilesRouter->>Database: SELECT COUNT(*) FROM files WHERE application_id = ?
    Database-->>FilesRouter: total_count
    
    FilesRouter-->>Client: PaginatedResponse {items, total, page, size}

    Client->>FilesRouter: DELETE /api/v1/files/{file_id}
    FilesRouter->>Database: SELECT * FROM files WHERE id = ?
    Database-->>FilesRouter: file_record
    
    FilesRouter->>Database: DELETE FROM files WHERE id = ?
    Database-->>FilesRouter: deleted
    
    FilesRouter->>MinIOService: delete_file(file.file_path)
    MinIOService->>MinIO: DELETE /lc-workflow-files/{file_path}
    MinIO-->>MinIOService: deleted
    
    FilesRouter-->>Client: {success: true}
```

## 5. User Management Operations

### User Creation with Department/Branch Assignment

```mermaid
sequenceDiagram
    participant Admin
    participant UsersRouter
    participant Database
    participant ValidationService

    Admin->>UsersRouter: POST /api/v1/users
    UsersRouter->>ValidationService: validate_user_data(user_data)
    ValidationService->>Database: SELECT * FROM departments WHERE id = ?
    Database-->>ValidationService: department_exists
    ValidationService->>Database: SELECT * FROM branches WHERE id = ?
    Database-->>ValidationService: branch_exists
    ValidationService->>Database: SELECT * FROM positions WHERE id = ?
    Database-->>ValidationService: position_exists
    ValidationService-->>UsersRouter: validation_passed

    UsersRouter->>UsersRouter: hash_password(password)
    UsersRouter->>Database: INSERT INTO users (...)
    Database-->>UsersRouter: user_created
    UsersRouter-->>Admin: UserResponse {id, username, email, department, branch, position}
```

### User Update with Role Changes

```mermaid
sequenceDiagram
    participant Admin
    participant UsersRouter
    participant Database
    participant AuditService

    Admin->>UsersRouter: PATCH /api/v1/users/{user_id}
    UsersRouter->>Database: SELECT * FROM users WHERE id = ?
    Database-->>UsersRouter: current_user_data
    
    UsersRouter->>Database: UPDATE users SET role = 'manager', department_id = ?
    Database-->>UsersRouter: updated
    
    UsersRouter->>AuditService: log_user_role_change(admin_id, user_id, old_role, new_role)
    AuditService-->>UsersRouter: audit_logged
    
    UsersRouter-->>Admin: UserResponse {updated_user_data}
```

## 6. Error Handling and Recovery

### Database Connection Failure

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Database
    participant HealthService

    Client->>API: GET /api/v1/applications
    API->>Database: SELECT * FROM customer_applications
    Database-->>API: ConnectionError
    
    API->>HealthService: check_database_health()
    HealthService->>Database: SELECT 1
    Database-->>HealthService: timeout
    HealthService-->>API: database_unhealthy
    
    API->>API: retry_connection(max_retries=3)
    API->>Database: SELECT * FROM customer_applications
    Database-->>API: success
    API-->>Client: applications_list
```

### MinIO Upload Failure Recovery

```mermaid
sequenceDiagram
    participant Client
    participant FilesRouter
    participant MinIOService
    participant MinIO
    participant Database

    Client->>FilesRouter: POST /api/v1/files/upload
    FilesRouter->>MinIOService: upload_file(content, metadata)
    MinIOService->>MinIO: PUT /lc-workflow-files/...
    MinIO-->>MinIOService: 503 Service Unavailable
    
    MinIOService->>MinIOService: retry_upload(max_retries=3, backoff=2s)
    MinIOService->>MinIO: PUT /lc-workflow-files/...
    MinIO-->>MinIOService: 200 OK
    
    MinIOService-->>FilesRouter: object_name
    FilesRouter->>Database: INSERT INTO files (...)
    Database-->>FilesRouter: file_record
    FilesRouter-->>Client: FileResponse
```

## 7. Batch Processing Workflows

### Bulk Application Status Update

```mermaid
sequenceDiagram
    participant Manager
    participant ApplicationsRouter
    participant Database
    participant NotificationService
    participant AuditService

    Manager->>ApplicationsRouter: POST /api/v1/applications/bulk-update
    ApplicationsRouter->>Database: SELECT * FROM customer_applications WHERE id IN (...)
    Database-->>ApplicationsRouter: applications_list
    
    ApplicationsRouter->>Database: BEGIN TRANSACTION
    ApplicationsRouter->>Database: UPDATE customer_applications SET status = ? WHERE id IN (...)
    Database-->>ApplicationsRouter: updated_count
    
    ApplicationsRouter->>NotificationService: send_bulk_notifications(application_ids, status)
    NotificationService-->>ApplicationsRouter: notifications_sent
    
    ApplicationsRouter->>AuditService: log_bulk_update(manager_id, application_ids, status)
    AuditService-->>ApplicationsRouter: audit_logged
    
    ApplicationsRouter->>Database: COMMIT TRANSACTION
    ApplicationsRouter-->>Manager: {success: true, updated: count}
```

### Database Migration Workflow

```mermaid
sequenceDiagram
    participant DevOps
    participant Alembic
    participant Database
    participant Application

    DevOps->>Alembic: alembic revision --autogenerate -m "add new column"
    Alembic->>Database: CREATE migration script
    Database-->>Alembic: migration_created
    
    DevOps->>Alembic: alembic upgrade head
    Alembic->>Database: BEGIN TRANSACTION
    Alembic->>Database: ALTER TABLE ... ADD COLUMN ...
    Database-->>Alembic: column_added
    Alembic->>Database: COMMIT TRANSACTION
    
    Application->>Database: SELECT * FROM information_schema.columns WHERE ...
    Database-->>Application: schema_verified
    Application-->>DevOps: migration_complete
```

## 8. Real-time Updates (WebSocket)

### Application Status Change Notification

```mermaid
sequenceDiagram
    participant Frontend
    participant WebSocket
    participant Backend
    participant Database
    participant NotificationService

    Frontend->>WebSocket: connect /ws/notifications
    WebSocket->>Backend: authenticate(token)
    Backend->>Database: validate_user_session
    Database-->>Backend: user_validated
    Backend-->>WebSocket: connection_established

    Reviewer->>Backend: PATCH /api/v1/applications/{id}/status
    Backend->>Database: UPDATE status = 'approved'
    Database-->>Backend: update_success
    
    Backend->>NotificationService: broadcast_status_change(application_id, status)
    NotificationService->>WebSocket: send_to_user(user_id, {type: 'status_update', data: {...}})
    WebSocket-->>Frontend: {status: 'approved', application_id: '...'}
```

These sequence diagrams provide detailed insights into the backend flow, showing how data moves through the system, how services interact, and how errors are handled throughout the application lifecycle.