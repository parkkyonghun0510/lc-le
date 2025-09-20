from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
import os
import warnings
from dotenv import load_dotenv
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.database import engine, Base
from app.routers import auth, users, applications, files, departments, branches, dashboard, positions
from app.routers import folders, customers, enums, selfies, validation, account_validation
from app.routers import settings as settings_router
from app.core.config import settings
from app.core.error_handlers import register_error_handlers
from app.middleware.database_middleware import DatabaseConnectionMiddleware

# Suppress Pydantic JSON schema warnings for non-serializable defaults
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic.json_schema")

load_dotenv()

# Startup diagnostics
print(f"[Startup] HOST={settings.HOST}, PORT={settings.PORT}, DEBUG={settings.DEBUG}")
print(f"[Startup] DATABASE_URL set: {bool(getattr(settings, 'DATABASE_URL', ''))}")
print(f"[Startup] Allowed origins count: {len(settings.ALLOWED_ORIGINS)}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Try to create database tables, but don't fail if database is not available
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Database tables created successfully")
    except Exception as e:
        print(f"Warning: Could not create database tables: {e}")
        print("Application will start without database connectivity")
    yield

app = FastAPI(
    title="LC Work Flow API",
    description="Backend API for LC Work Flow application",
    version="1.0.0",
    lifespan=lifespan,
    # Configure OpenAPI schema generation to handle non-serializable defaults gracefully
    generate_unique_id_function=lambda route: f"{route.tags[0]}-{route.name}" if route.tags else route.name
)

# Behind Railway's proxy, trust all hosts for forwarded headers
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# Add database connection middleware
app.add_middleware(DatabaseConnectionMiddleware, max_reconnect_attempts=3)

# Add metrics collection middleware
from app.middleware.metrics_middleware import MetricsMiddleware
app.add_middleware(MetricsMiddleware, collect_all_requests=False)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register error handlers
register_error_handlers(app)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(applications.router, prefix="/api/v1/applications", tags=["applications"])
app.include_router(files.router, prefix="/api/v1/files", tags=["files"])
app.include_router(folders.router, prefix="/api/v1/folders", tags=["folders"])
app.include_router(customers.router, prefix="/api/v1/customers", tags=["customers"])
app.include_router(departments.router, prefix="/api/v1/departments", tags=["departments"])
app.include_router(branches.router, prefix="/api/v1/branches", tags=["branches"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(settings_router.router, prefix="/api/v1/settings", tags=["settings"])
app.include_router(positions.router, prefix="/api/v1/positions", tags=["positions"])
app.include_router(enums.router, prefix="/api/v1/enums", tags=["enums"])
app.include_router(selfies.router, prefix="/api/v1/selfies", tags=["selfies"])
app.include_router(validation.router, prefix="/api/v1", tags=["validation"])
app.include_router(account_validation.router, prefix="/api/v1", tags=["account-validation"])

# Data synchronization and consistency router
from app.routers import data_sync
app.include_router(data_sync.router, prefix="/api/v1/data-sync", tags=["data-sync"])

# Health monitoring and metrics router
from app.routers import health_monitoring
app.include_router(health_monitoring.router, prefix="/api/v1/monitoring", tags=["monitoring"])

# Feature flags management router
from app.routers import feature_flags
app.include_router(feature_flags.router, prefix="/api/v1/feature-flags", tags=["feature-flags"])

# Serve static files for uploaded documents
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root() -> dict:
    return {"message": "LC Work Flow API is running"}

@app.get("/health")
async def health_check() -> dict:
    return {"status": "healthy"}

@app.get("/api/v1/health")
async def api_health_check() -> dict:
    from app.core.database_health import check_database_health
    
    try:
        db_health = await check_database_health()
        
        return {
            "status": "healthy" if db_health["status"] == "healthy" else "degraded",
            "service": "lc-workflow-api",
            "database": db_health,
            "timestamp": db_health["timestamp"]
        }
    except Exception as e:
        # Return degraded status if health check fails
        return {
            "status": "degraded",
            "service": "lc-workflow-api", 
            "database": {
                "status": "unhealthy",
                "error": str(e)
            },
            "warning": "Database health check failed, but service is running"
        }

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )