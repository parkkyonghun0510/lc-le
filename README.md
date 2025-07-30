# LC Workflow Backend

A FastAPI backend for the LC Workflow application providing REST APIs for customer loan applications with file management capabilities.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **User Management**: Complete CRUD operations for users with roles (admin, manager, officer, viewer)
- **Department & Branch Management**: Hierarchical organization structure
- **Customer Applications**: Full lifecycle management of loan applications
- **File Management**: Upload, download, and manage application documents
- **Offline Sync Support**: Designed for offline-first mobile applications
- **PostgreSQL Database**: Async SQLAlchemy ORM with Alembic migrations
- **DragonflyDB Caching**: High-performance caching and session management

## Technology Stack

- **FastAPI**: Modern, fast web framework for building APIs
- **PostgreSQL**: Primary database with asyncpg driver
- **DragonflyDB**: High-performance Redis-compatible caching and session storage
- **SQLAlchemy**: Async ORM with Alembic for migrations
- **Pydantic**: Data validation and serialization
- **Passlib**: Password hashing and verification
- **python-jose**: JWT token handling
- **Uvicorn**: ASGI server

## Quick Start

### Prerequisites

- Python 3.8+
- PostgreSQL 12+
- (Optional) MinIO for file storage

### Installation

1. **Clone and navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your database and other settings
   ```

5. **Set up PostgreSQL database**:
   ```bash
   # Create database
   createdb lc_workflow
   
   # Or use psql
   psql -U postgres -c "CREATE DATABASE lc_workflow;"
   ```

6. **Run database migrations**:
   ```bash
   alembic upgrade head
   ```

7. **Start the development server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://username:password@localhost:5432/lc_workflow` |
| `REDIS_URL` | DragonflyDB (Redis-compatible) connection string | `redis://localhost:6379` |
| `SECRET_KEY` | JWT secret key | `your-secret-key-here` |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token expiration | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token expiration | `7` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000,http://localhost:8080` |
| `MINIO_ENDPOINT` | MinIO server endpoint | `localhost:9000` |
| `MINIO_ACCESS_KEY` | MinIO access key | `minioadmin` |
| `MINIO_SECRET_KEY` | MinIO secret key | `minioadmin` |
| `MINIO_BUCKET_NAME` | MinIO bucket name | `lc-workflow-files` |
| `MINIO_SECURE` | Use HTTPS for MinIO | `false` |

## Database Setup

### Initial Migration

1. **Generate initial migration**:
   ```bash
   alembic revision --autogenerate -m "Initial migration"
   ```

2. **Apply migration**:
   ```bash
   alembic upgrade head
   ```

### Creating New Migrations

After modifying models:
```bash
alembic revision --autogenerate -m "Description of changes"
alembic upgrade head
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user

### Users
- `GET /api/v1/users/` - List users (paginated)
- `POST /api/v1/users/` - Create user
- `GET /api/v1/users/{user_id}` - Get user details
- `PUT /api/v1/users/{user_id}` - Update user
- `DELETE /api/v1/users/{user_id}` - Delete user

### Departments
- `GET /api/v1/departments/` - List departments
- `POST /api/v1/departments/` - Create department
- `GET /api/v1/departments/{department_id}` - Get department
- `PUT /api/v1/departments/{department_id}` - Update department
- `DELETE /api/v1/departments/{department_id}` - Delete department

### Branches
- `GET /api/v1/branches/` - List branches
- `POST /api/v1/branches/` - Create branch
- `GET /api/v1/branches/{branch_id}` - Get branch
- `PUT /api/v1/branches/{branch_id}` - Update branch
- `DELETE /api/v1/branches/{branch_id}` - Delete branch

### Customer Applications
- `GET /api/v1/applications/` - List applications
- `POST /api/v1/applications/` - Create application
- `GET /api/v1/applications/{application_id}` - Get application
- `PUT /api/v1/applications/{application_id}` - Update application
- `DELETE /api/v1/applications/{application_id}` - Delete application
- `POST /api/v1/applications/{application_id}/submit` - Submit application
- `POST /api/v1/applications/{application_id}/approve` - Approve application
- `POST /api/v1/applications/{application_id}/reject` - Reject application

### Files
- `POST /api/v1/files/upload` - Upload file
- `GET /api/v1/files/` - List files
- `GET /api/v1/files/{file_id}` - Get file metadata
- `GET /api/v1/files/{file_id}/download` - Download file
- `DELETE /api/v1/files/{file_id}` - Delete file

## Role-Based Access Control

- **Admin**: Full access to all endpoints
- **Manager**: Can manage users, departments, branches, and applications
- **Officer**: Can create and manage applications, upload files
- **Viewer**: Read-only access to applications and files

## Development

### Running Tests

```bash
pytest tests/
```

### Code Formatting

```bash
black app/
isort app/
```

### Docker Setup

1. **Build and run with Docker Compose**:
   ```bash
   docker-compose up --build
   ```

2. **Access services**:
   - API: http://localhost:8000
   - PostgreSQL: localhost:5432
   - MinIO: http://localhost:9000
   - DragonflyDB: localhost:6379 (Redis-compatible)

### Podman Setup (Alternative to Docker)

**Quick setup with scripts**:

**Windows (PowerShell)**:
```powershell
# Run the setup script
.\setup-podman.ps1
```

**Windows (Command Prompt)**:
```cmd
# Run the setup script
setup-podman.bat
```

**Manual setup**:
```bash
# Install Podman and podman-compose first
# Then start services
podman-compose up --build
```

**Access services** (same as Docker):
- API: http://localhost:8000
- PostgreSQL: localhost:5432
- MinIO: http://localhost:9000

For detailed Podman instructions, see [PODMAN_SETUP.md](./PODMAN_SETUP.md)

## Production Deployment

1. **Set production environment variables**
2. **Use PostgreSQL with proper SSL**
3. **Configure MinIO or AWS S3 for file storage**
4. **Set up reverse proxy (nginx)**
5. **Enable HTTPS**
6. **Configure monitoring and logging**

## Troubleshooting

### Common Issues

1. **Database connection errors**:
   - Check PostgreSQL is running
   - Verify DATABASE_URL in .env
   - Ensure database exists

2. **Migration errors**:
   - Run `alembic downgrade base` then `alembic upgrade head`
   - Check for conflicting table names

3. **Port conflicts**:
   - Change port in uvicorn command: `--port 8001`

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## License

This project is licensed under the MIT License.