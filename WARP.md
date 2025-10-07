# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**LC Workflow** is a full-stack loan application management system consisting of:
- **Frontend**: Next.js 15 (App Router) with TypeScript, React Query, and Tailwind CSS
- **Backend**: FastAPI with async PostgreSQL, MinIO object storage, and WebSocket support
- **Architecture**: Microservices with separate frontend/backend deployment on Railway

## Repository Structure

```
lc-le/
├── lc-workflow-frontend/    # Next.js frontend application
│   ├── app/                  # Next.js App Router pages
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── hooks/           # Custom React hooks (useAuth, useApplications, etc.)
│   │   ├── lib/             # API client (api.ts) and utilities
│   │   ├── contexts/        # React contexts
│   │   └── types/           # TypeScript type definitions
│   ├── package.json
│   └── next.config.ts
│
└── le-backend/              # FastAPI backend application
    ├── app/
    │   ├── routers/         # API endpoint routers
    │   ├── services/        # Business logic services
    │   ├── core/            # Config, security, error handling
    │   ├── models.py        # SQLAlchemy database models
    │   └── main.py          # FastAPI application entry point
    ├── migrations/          # Alembic database migrations
    ├── tests/               # Backend test files
    ├── requirements.txt
    └── alembic.ini
```

## Common Development Commands

### Frontend Development

```bash
# Navigate to frontend directory
cd lc-workflow-frontend

# Install dependencies
npm install

# Start development server (with Turbopack)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Run tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:coverage

# Analyze bundle size
npm run analyze
```

### Backend Development

```bash
# Navigate to backend directory
cd le-backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8090

# Run all tests
pytest

# Run tests with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_auth.py -v

# Run tests by marker
pytest -m unit          # Unit tests only
pytest -m integration   # Integration tests only
pytest -m "not slow"    # Skip slow tests
```

### Database Management

```bash
# Navigate to backend directory
cd le-backend

# Create new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history

# Check current migration version
alembic current

# Initialize database with tables
python init_db.py
```

### Running Both Services

```bash
# Terminal 1 - Backend
cd le-backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8090

# Terminal 2 - Frontend
cd lc-workflow-frontend
npm run dev
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8090
- API Documentation: http://localhost:8090/docs
- Alternative API Docs: http://localhost:8090/redoc

## High-Level Architecture

### Authentication Flow

The system uses JWT-based authentication with role-based access control (RBAC):

1. **Login**: User submits credentials → Backend validates → Returns access token (60 min) + refresh token (7 days)
2. **Token Storage**: Frontend stores tokens in memory and uses axios interceptors for automatic inclusion
3. **Token Refresh**: Automatic refresh before expiration using refresh token
4. **Authorization**: Role-based (admin, manager, officer, viewer) with permission checks in backend

**Key Files**:
- Frontend: `lc-workflow-frontend/src/hooks/useAuth.ts`, `src/lib/api.ts`
- Backend: `le-backend/app/routers/auth.py`, `app/core/security.py`

### Data Flow Architecture

```
User Action (Frontend) 
  → React Query Hook (src/hooks/) 
  → API Client (src/lib/api.ts) 
  → Axios Interceptors (token injection)
  → FastAPI Router (app/routers/) 
  → Service Layer (app/services/ or router logic)
  → Database (PostgreSQL via SQLAlchemy async)
  → Response → API Client → React Query Cache → UI Update
```

### File Upload System

The application uses **MinIO** (S3-compatible) for file storage with a hierarchical folder structure:

1. **Upload Flow**: 
   - Frontend uploads via `POST /api/v1/files/upload`
   - Backend validates authorization and application/folder access
   - File stored in MinIO with metadata in PostgreSQL
   - Returns file ID and metadata

2. **Folder Organization**:
   - Applications have associated folders (borrower docs, guarantor docs, etc.)
   - Files are organized by `application_id` and `folder_id`
   - Soft delete support for both files and folders

**Key Files**:
- Frontend: `src/hooks/useFiles.ts`, `src/hooks/useFolders.ts`
- Backend: `app/routers/files.py`, `app/routers/folders.py`

### WebSocket Notifications

Real-time notifications are implemented via WebSocket connections:

- **Endpoint**: `ws://localhost:8090/api/v1/ws/realtime?token=<jwt_token>`
- **Connection**: Authenticated using JWT token in query param
- **Frontend Hook**: `src/hooks/useWebSocketNotifications.ts`
- **Backend Router**: `app/routers/websocket.py`
- **Service**: `app/services/notification_pubsub_service.py`

**Note**: If WebSocket connection fails (1006 errors), the backend WebSocket server may not be running or the route may need debugging.

### Application Workflow System

Customer loan applications follow a multi-stage workflow:

1. **PO Created** (`po_created`): Portfolio Officer creates application
2. **User Completed** (`user_completed`): User fills in details
3. **Teller Processing** (`teller_processing`): Teller validates account_id
4. **Manager Review** (`manager_review`): Manager performs final approval
5. **Approved/Rejected**: Final status

Each stage tracks timestamp and responsible user ID.

**Key Models**: `CustomerApplication` in `le-backend/app/models.py`

## Critical Database Models

### User Model
- **Primary Key**: UUID
- **Authentication**: username, email, password_hash (bcrypt)
- **Organization**: department_id, branch_id, position_id
- **Hierarchy**: portfolio_id (portfolio officer), line_manager_id
- **Status Management**: status, status_reason, status_changed_at, status_changed_by
- **Soft Delete**: is_deleted, deleted_at, deleted_by

### CustomerApplication Model
- **Primary Key**: UUID
- **Owner**: user_id (FK to User)
- **Workflow**: workflow_status, workflow_stage
- **Account Grouping**: account_id (external identifier)
- **Borrower Info**: id_card_type, id_number, full_name_khmer, full_name_latin, etc.
- **Loan Details**: requested_amount, loan_purposes (JSON), product_type, desired_loan_term
- **Guarantor Info**: guarantor_name, guarantor_phone, guarantor_id_number, etc.
- **Financial Data**: monthly_income, monthly_expenses, assets_value, existing_loans (JSON)
- **Documents**: JSON fields for collaterals, documents; text fields for photo paths

### File Model
- **Storage**: filename, file_path (MinIO), file_size
- **Organization**: folder_id, application_id
- **Metadata**: original_filename, display_name, mime_type
- **Ownership**: uploaded_by (FK to User)

## Environment Configuration

### Frontend Environment Variables

Required for local development (`.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:8090/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8090/api/v1/ws
```

For production deployment on Railway:
```bash
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app/api/v1/ws
NEXT_PUBLIC_FORCE_HTTPS=true
NODE_ENV=production
```

### Backend Environment Variables

Required variables (see `le-backend/.env.example` or `static/.env.example`):
```bash
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
SECRET_KEY=your-secret-key-for-jwt
CORS_ORIGINS=http://localhost:3000,https://your-frontend.railway.app
MINIO_ENDPOINT=your-minio-endpoint
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET_NAME=lc-workflow-files
```

## Common Development Patterns

### Adding a New API Endpoint

1. **Define Pydantic schema** in `le-backend/app/schemas.py`
2. **Create router function** in appropriate `le-backend/app/routers/*.py`
3. **Add database model** if needed in `le-backend/app/models.py`
4. **Create migration**: `alembic revision --autogenerate -m "Add new model"`
5. **Apply migration**: `alembic upgrade head`
6. **Add frontend TypeScript types** in `lc-workflow-frontend/src/types/models.ts`
7. **Create React Query hook** in `lc-workflow-frontend/src/hooks/use*.ts`
8. **Use hook in component** with proper error handling

### Testing a Single Component

```bash
# Frontend - run specific test file
cd lc-workflow-frontend
npm test -- ComponentName.test.tsx

# Backend - run specific test file
cd le-backend
pytest tests/test_specific.py -v

# Backend - run single test function
pytest tests/test_auth.py::test_login_success -v
```

### Debugging API Issues

1. Check backend logs in terminal running uvicorn
2. Use FastAPI interactive docs: http://localhost:8090/docs
3. Check frontend network tab for request/response
4. Review API client error handling in `lc-workflow-frontend/src/lib/api.ts`
5. Check axios interceptors for token injection issues
6. Verify CORS configuration in `le-backend/app/main.py`

### Handling Database Changes

When modifying models:
1. Update model in `le-backend/app/models.py`
2. Create migration: `alembic revision --autogenerate -m "Description"`
3. **Review generated migration** - Alembic may not catch everything
4. Apply: `alembic upgrade head`
5. Update corresponding Pydantic schemas
6. Update frontend TypeScript types if needed

## Key Technical Decisions

### Async Throughout
- Backend uses async/await with AsyncPG and SQLAlchemy async
- Database connections use connection pooling with pre-ping health checks
- All database operations are async to handle concurrent requests efficiently

### React Query for State Management
- Frontend uses TanStack Query (React Query) for server state
- Automatic caching, background refetching, and optimistic updates
- Custom hooks wrap queries for reusability (useApplications, useUsers, etc.)

### UUID Primary Keys
- All models use UUID instead of auto-incrementing integers
- Enables distributed systems and prevents ID enumeration attacks
- Generated with `uuid.uuid4()` in Python, `UUID(as_uuid=True)` in SQLAlchemy

### Role-Based Access Control
- Four main roles: admin, manager, officer, viewer
- Permission system with UserRole and UserPermission tables
- Frontend route protection via ProtectedRoute component
- Backend endpoint protection via dependency injection

### Soft Deletion Pattern
- Users have `is_deleted`, `deleted_at`, `deleted_by` fields
- Queries filter out soft-deleted records by default
- Enables audit trail and potential recovery

### API Error Handling
- Backend uses structured error responses with error codes
- Frontend categorizes errors (network, auth, validation, etc.)
- Automatic retry logic for transient failures
- User-friendly error messages in UI

## Railway Deployment

### Frontend Deployment
```bash
cd lc-workflow-frontend
npm run build:railway  # Builds with NEXT_PUBLIC_FORCE_HTTPS=true
```

Railway automatically detects Dockerfile and builds/deploys.

### Backend Deployment
Railway detects `railway.toml` and uses configuration.

**Important**: Set all environment variables in Railway dashboard before deployment.

### Migration on Deployment
Backend runs migrations automatically on startup via `app/main.py` lifespan event.

## Troubleshooting

### WebSocket Connection Failures
- Verify backend WebSocket router is included in `app/main.py`
- Check WebSocket endpoint: `ws://localhost:8090/api/v1/ws/realtime?token=<jwt>`
- Ensure JWT token is valid and not expired
- Check CORS configuration allows WebSocket connections

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- For Railway PostgreSQL, ensure SSL is enabled: `ssl=require`
- Check connection pool settings in `app/database.py`
- Use health check endpoint: http://localhost:8090/api/v1/health

### File Upload Failures
- Verify MinIO is running and accessible
- Check MinIO credentials in environment variables
- Ensure bucket exists: `MINIO_BUCKET_NAME`
- Check file size limits and MIME type validation

### Frontend Build Errors
- Clear `.next` folder: `rm -rf .next`
- Clear node_modules: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run lint`
- Verify all environment variables are set

### Test Failures
- Backend: Check database connection in test environment
- Backend: Ensure test fixtures in `tests/conftest.py` are correct
- Frontend: Check Jest configuration in `jest.config.js`
- Clear test cache: `pytest --cache-clear` or `npm test -- --clearCache`

## Development Workflow Tips

- **Always activate virtual environment** before working on backend
- **Run migrations** after pulling changes that modify models
- **Check API docs** at `/docs` when unsure about endpoint schema
- **Use React Query DevTools** in frontend for debugging queries
- **Monitor backend logs** for detailed error messages
- **Test with different user roles** to verify permission logic
- **Use PostgreSQL indexes** for query performance (already configured in models)
