# Project Structure

## Root Directory Layout

```
├── app/                    # Backend FastAPI application
├── lc-workflow-frontend/   # Next.js frontend application
├── migrations/             # Alembic database migrations
├── static/                 # Static file serving directory
├── uploads/                # File upload storage
├── tests/                  # Backend test files
├── venv/                   # Python virtual environment
└── .kiro/                  # Kiro AI assistant configuration
```

## Backend Structure (`app/`)

```
app/
├── core/                   # Core configuration and utilities
├── routers/                # FastAPI route handlers
│   ├── auth.py            # Authentication endpoints
│   ├── users.py           # User management endpoints
│   ├── applications.py    # Loan application endpoints
│   ├── files.py           # File management endpoints
│   ├── departments.py     # Department endpoints
│   └── branches.py        # Branch endpoints
├── database.py            # Database connection and session management
├── models.py              # SQLAlchemy ORM models
├── schemas.py             # Pydantic request/response schemas
├── main.py                # FastAPI application entry point
└── __init__.py
```

## Frontend Structure (`lc-workflow-frontend/`)

```
lc-workflow-frontend/
├── src/                   # Source code
├── public/                # Static assets
├── .next/                 # Next.js build output
├── node_modules/          # NPM dependencies
├── package.json           # NPM configuration
├── next.config.ts         # Next.js configuration
├── tsconfig.json          # TypeScript configuration
└── tailwind.config.js     # Tailwind CSS configuration
```

## Database Migrations (`migrations/`)

```
migrations/
├── versions/              # Migration version files
├── env.py                # Alembic environment configuration
└── script.py.mako        # Migration template
```

## Configuration Files

- **Environment**: `.env`, `.env.example`, `.env.production`
- **Docker**: `docker-compose.yml`, `Dockerfile`, `podman-compose.yml`
- **Database**: `alembic.ini` for migration configuration
- **Deployment**: `railway.toml`, `Procfile` for Railway deployment
- **Dependencies**: `requirements.txt` (Python), `package.json` (Node.js)

## Key Architectural Patterns

### Backend Organization
- **Routers**: Separate files for each domain (auth, users, applications, etc.)
- **Models**: Single `models.py` with all SQLAlchemy models
- **Schemas**: Single `schemas.py` with all Pydantic schemas
- **Database**: Centralized connection management in `database.py`

### File Naming Conventions
- **Python**: Snake_case for files and variables
- **Models**: PascalCase class names (User, CustomerApplication)
- **Endpoints**: RESTful patterns with `/api/v1/` prefix
- **Database**: Plural table names (users, customer_applications)

### Data Flow
1. **Request** → Router → Schema validation
2. **Business Logic** → Database operations via models
3. **Response** → Schema serialization → JSON output

### File Storage
- **Uploads**: Local `uploads/` directory for development
- **Production**: MinIO S3-compatible storage
- **Static**: `static/` directory served by FastAPI