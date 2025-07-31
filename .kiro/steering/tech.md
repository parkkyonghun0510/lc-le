# Technology Stack

## Backend (Python/FastAPI)

- **Framework**: FastAPI 0.104.1 with async/await support
- **Database**: PostgreSQL with asyncpg driver and SQLAlchemy 2.0 ORM
- **Caching**: DragonflyDB (Redis-compatible) for sessions and caching
- **Authentication**: JWT tokens with python-jose and passlib for password hashing
- **File Storage**: MinIO (S3-compatible) for document storage
- **Migrations**: Alembic for database schema management
- **Server**: Uvicorn ASGI server

## Frontend (Next.js/React)

- **Framework**: Next.js 15.4.5 with React 19.1.0
- **Styling**: Tailwind CSS 4.0 with Headless UI components
- **State Management**: TanStack Query for server state
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Axios for API communication
- **UI Components**: Heroicons, Lucide React, Framer Motion

## Infrastructure

- **Containerization**: Docker/Podman with compose files
- **Database**: PostgreSQL 15 Alpine
- **Cache/Session Store**: DragonflyDB
- **File Storage**: MinIO server
- **Deployment**: Railway platform support

## Common Commands

### Backend Development
```bash
# Setup virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Database migrations
alembic revision --autogenerate -m "Description"
alembic upgrade head

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest tests/
```

### Frontend Development
```bash
# Navigate to frontend
cd lc-workflow-frontend

# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build
npm start
```

### Docker/Podman
```bash
# Start all services
docker-compose up --build
# or
podman-compose up --build

# Windows Podman setup
.\setup-podman.ps1
```

## Key Libraries & Patterns

- **Async/Await**: All database operations use async patterns
- **Pydantic**: Data validation and serialization with BaseModel
- **UUID**: Primary keys use UUID4 for all entities
- **Role-Based Access**: Middleware for authentication and authorization
- **RESTful APIs**: Standard REST patterns with /api/v1/ prefix
- **Health Checks**: Built-in health endpoints for monitoring