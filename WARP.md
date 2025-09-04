# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a full-stack loan application workflow system with:
- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, and App Router
- **Backend**: FastAPI with async SQLAlchemy, PostgreSQL, and JWT authentication
- **Architecture**: Microservices-style separation between frontend (`lc-workflow-frontend/`) and backend (`le-backend/`)

## Development Commands

### Backend (FastAPI) - le-backend/
```bash
# Setup virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Database operations
alembic upgrade head                    # Run migrations
alembic revision --autogenerate -m "description"  # Create migration
createdb lc_workflow                   # Create PostgreSQL database

# Development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8090

# Testing
pytest                                 # Run all tests
pytest tests/test_auth.py -v          # Run specific test file
pytest --cov=app tests/                # Run with coverage

# Code quality
black app/ tests/                      # Format code
isort app/ tests/                      # Sort imports
mypy app/                             # Type checking
```

### Frontend (Next.js) - lc-workflow-frontend/
```bash
# Install dependencies
npm install

# Development server
npm run dev                           # Uses Turbopack for faster builds

# Production build
npm run build
npm start

# Testing and linting
npm test                              # Run Jest tests
npm run lint                          # Run ESLint
```

## Architecture Overview

### Backend Architecture (FastAPI)

**Core Structure**:
- `app/main.py` - FastAPI application with CORS, error handling, and router registration
- `app/core/` - Configuration, security, and shared utilities
- `app/routers/` - API endpoints organized by domain (auth, users, applications, files, etc.)
- `app/models.py` - SQLAlchemy database models
- `app/schemas.py` - Pydantic models for request/response validation
- `app/database.py` - Database connection and session management

**Key Patterns**:
- Async/await throughout for performance
- JWT-based authentication with role-based access control (Admin, Manager, Officer, Viewer)
- Pydantic settings management with environment variable mapping
- MinIO/S3 compatible file storage integration
- Railway and Docker deployment ready

**API Structure**: All endpoints prefixed with `/api/v1/`
- Authentication: `/api/v1/auth/`
- Core entities: `/api/v1/{applications,users,files,departments,branches}/`
- Health checks: `/api/v1/health`

### Frontend Architecture (Next.js 15)

**Core Structure**:
- App Router with TypeScript
- `src/app/` - Next.js pages and layouts
- `src/components/` - Reusable UI components
- `src/hooks/` - Custom React hooks for API integration
- `src/providers/` - React context providers (Auth, Theme, Query)
- `src/lib/` - Utility functions and API client configuration

**Key Patterns**:
- React Query (TanStack Query) for server state management
- Context-based authentication with JWT token management
- Dynamic theme system with light/dark/system modes
- Tailwind CSS for styling with custom theming
- Role-based component rendering
- Form handling with React Hook Form + Zod validation

**Provider Hierarchy**:
```typescript
QueryProvider > ThemeProvider > AuthProvider > App Components
```

### Cross-Cutting Concerns

**Authentication Flow**:
1. JWT tokens with automatic refresh
2. Role-based route protection
3. API request interceptors for token management
4. Centralized auth state management

**File Management**:
- Backend: MinIO/S3 integration with streaming uploads
- Frontend: React Dropzone with role-based access control
- Validation: File type and size restrictions

**Database Strategy**:
- PostgreSQL with async SQLAlchemy
- Alembic for schema migrations
- Connection pooling and async operations
- Audit trails and soft deletes

## Environment Configuration

### Backend (.env)
Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT signing secret
- `REDIS_URL` - Redis connection (optional)
- `MINIO_*` - File storage configuration
- `CORS_ORIGINS` - Comma-separated allowed origins

### Frontend (.env.local)
Required environment variables:
- `NEXT_PUBLIC_API_URL` - Backend API endpoint
- `NEXT_PUBLIC_WS_URL` - WebSocket URL (if applicable)

## Deployment

### Railway Deployment
Both frontend and backend are configured for Railway deployment:
- Backend: `le-backend/railway.toml` with PostgreSQL service
- Frontend: `lc-workflow-frontend/railway.toml` with static build
- Automatic deployments from main branch
- Environment variables managed through Railway dashboard

### Docker Support
- Backend: `le-backend/Dockerfile` with multi-stage build
- Frontend: `lc-workflow-frontend/Dockerfile` optimized for Next.js
- Docker Compose and Podman Compose configurations available

## Testing Strategy

### Backend Testing
- `pytest` with async support
- Test categories: unit, integration, slow (via markers)
- Coverage reporting configured in `pyproject.toml`
- Test database isolation

### Frontend Testing
- Jest with React Testing Library
- jsdom environment for component testing
- MSW (Mock Service Worker) for API mocking
- Coverage reporting available

## Key Development Notes

### When Adding New Features

**Backend**:
1. Create database model in `models.py`
2. Add Pydantic schemas in `schemas.py`
3. Implement router in `routers/{feature}.py`
4. Register router in `main.py`
5. Add database migration with Alembic

**Frontend**:
1. Define TypeScript types in `types/models.ts`
2. Add API methods in `lib/api.ts`
3. Create React Query hooks in `hooks/`
4. Build UI components
5. Add routes in `src/app/`

### Security Considerations
- All API endpoints require JWT authentication except `/health` and `/auth/login`
- File uploads are validated by type and size
- CORS is strictly configured for allowed origins
- Password policies enforced in backend configuration
- Role-based access control throughout the application

### Performance Optimization
- Database queries use appropriate indexes
- Frontend uses React Query for caching and background updates
- File uploads stream directly to MinIO/S3
- Async operations throughout backend
- Next.js App Router for optimal bundle splitting
