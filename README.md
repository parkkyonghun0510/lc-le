# LC Workflow Backend API

A high-performance FastAPI backend for loan application management with comprehensive file handling and user management capabilities.

## Features

- **JWT Authentication & Authorization** - Secure role-based access control
- **Loan Application Management** - Complete lifecycle management
- **File Upload & Storage** - MinIO/S3 compatible file management
- **User & Organization Management** - Departments, branches, and positions
- **Performance Optimized** - Database indexes and async operations
- **Production Ready** - Security headers, rate limiting, and monitoring

## Quick Start

### Development Setup

1. **Clone and setup environment:**
   ```bash
   git clone <repository-url>
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure environment:**
   ```bash
   cp .env.production .env
   # Edit .env with your database and MinIO credentials
   ```

3. **Setup database:**
   ```bash
   # Create PostgreSQL database
   createdb lc_workflow
   
   # Run migrations
   alembic upgrade head
   ```

4. **Start development server:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8090
   ```

### Production Deployment

#### Railway Deployment (Recommended)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Deploy to production"
   git push origin main
   ```

2. **Deploy on Railway:**
   - Go to [Railway.app](https://railway.app)
   - Create new project from GitHub repository
   - Add PostgreSQL service
   - Configure environment variables from `.env.production`
   - Deploy automatically

3. **Configure Environment Variables:**
   ```env
   DATABASE_URL=<railway-postgresql-url>
   SECRET_KEY=<secure-secret-key>
   CORS_ORIGINS=<your-frontend-url>
   MINIO_ENDPOINT=<your-minio-endpoint>
   # ... see .env.production for complete list
   ```

#### Docker Deployment

```bash
# Build and run
docker-compose up --build

# Or with Podman
podman-compose up --build
```

## API Documentation

Once running, access:
- **Swagger UI**: http://localhost:8090/docs
- **ReDoc**: http://localhost:8090/redoc
- **Health Check**: http://localhost:8090/api/v1/health

## Project Structure

```
backend/
├── app/
│   ├── core/          # Configuration and security
│   ├── routers/       # API endpoints
│   ├── services/      # Business logic services
│   ├── models.py      # Database models
│   ├── schemas.py     # Pydantic models
│   └── main.py        # FastAPI application
├── migrations/        # Database migrations
├── scripts/          # Utility scripts
├── tests/            # Unit tests
├── docs/             # Documentation
├── static/           # Static file uploads
├── Dockerfile        # Container configuration
├── railway.toml      # Railway deployment config
└── requirements.txt  # Python dependencies
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Current user info

### Applications
- `GET /api/v1/applications/` - List applications
- `POST /api/v1/applications/` - Create application
- `GET /api/v1/applications/{id}` - Get application
- `PUT /api/v1/applications/{id}` - Update application

### File Management
- `POST /api/v1/files/upload` - Upload files
- `GET /api/v1/files/{id}/download` - Download file
- `GET /api/v1/files/` - List files

### Administration
- `GET /api/v1/users/` - Manage users
- `GET /api/v1/departments/` - Manage departments
- `GET /api/v1/branches/` - Manage branches

## Technology Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL with AsyncPG
- **ORM**: SQLAlchemy (Async)
- **Authentication**: JWT with python-jose
- **File Storage**: MinIO (S3 compatible)
- **Testing**: pytest with async support
- **Deployment**: Railway, Docker

## Security Features

- JWT-based authentication
- Role-based access control (Admin, Manager, Officer, Viewer)
- Password strength validation
- Rate limiting
- Security headers
- File upload validation
- SQL injection prevention

## Performance Features

- Async/await throughout the application
- Database connection pooling
- Comprehensive database indexes
- Efficient query optimization
- File upload streaming

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_auth.py -v
```

## Monitoring & Health

- Health check endpoint: `/api/v1/health`
- Database connectivity validation
- Application status monitoring
- Error logging and tracking

## Development

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Downgrade
alembic downgrade -1
```

### Code Quality

```bash
# Format code
black app/ tests/

# Sort imports
isort app/ tests/

# Type checking
mypy app/
```

## Support & Documentation

- 📚 **API Docs**: `/docs` endpoint when running
- 📖 **Architecture**: See `docs/BACKEND_ARCHITECTURE.md`
- 🚀 **Deployment**: See `RAILWAY_DEPLOYMENT.md`
- 📋 **Checklist**: See `DEPLOYMENT_CHECKLIST.md`

## License

This project is licensed under the MIT License.

---

**🚀 Ready for production deployment!**