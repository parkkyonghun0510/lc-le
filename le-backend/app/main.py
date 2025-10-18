from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
import os
import warnings
from dotenv import load_dotenv
from starlette.middleware.trustedhost import TrustedHostMiddleware
from datetime import datetime, timezone

from app.database import engine, Base
from app.routers import auth, applications, files, departments, branches, dashboard, positions
from app.routers.users import router as users_router
from app.routers import folders, customers, enums, selfies, validation, account_validation
from app.routers import settings as settings_router
from app.routers import permissions, performance, security, employees, admin
from app.core.config import settings
from app.core.error_handlers import register_error_handlers
from app.middleware.database_middleware import DatabaseConnectionMiddleware

# Configure logging for production
import logging
import logging.config
import sys

# Use logging configuration file if available
try:
    logging.config.fileConfig('logging.conf')
    print("Using logging.conf configuration")
except FileNotFoundError:
    # Fallback to basic configuration
    logging.basicConfig(
        level=logging.WARNING if not settings.DEBUG else logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        stream=sys.stdout
    )

# Configure specific loggers
if not settings.DEBUG:
    # In production, be more restrictive
    logging.getLogger('sqlalchemy.engine').setLevel(logging.ERROR)
    logging.getLogger('sqlalchemy.pool').setLevel(logging.ERROR)
    logging.getLogger('sqlalchemy.orm').setLevel(logging.WARNING)
    logging.getLogger('uvicorn.access').setLevel(logging.WARNING)
else:
    # In development, allow more logging
    logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
    logging.getLogger('sqlalchemy.pool').setLevel(logging.INFO)
    logging.getLogger('sqlalchemy.orm').setLevel(logging.INFO)

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

    # Run permission seeding automatically
    try:
        import sys
        import os
        # Add the parent directory to the path to import scripts
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from scripts.seed_permissions import seed_default_permissions
        from app.database import AsyncSessionLocal
        
        async with AsyncSessionLocal() as db:
            results = await seed_default_permissions(db)
            print(f"Permission seeding completed: {results['permissions_created']} permissions created, {results['roles_created']} roles created")
    except Exception as e:
        print(f"Warning: Could not run permission seeding: {e}")
        print("Permission system may not be fully initialized")

    # Initialize notification pub/sub service
    try:
        from app.services.notification_pubsub_service import notification_pubsub
        initialized = await notification_pubsub.initialize()
        if initialized:
            print("Notification Pub/Sub service initialized successfully")
        else:
            print("Warning: Notification Pub/Sub service initialization failed (Redis/DragonflyDB may not be available)")
    except Exception as e:
        print(f"Warning: Could not initialize Notification Pub/Sub service: {e}")

    # Validate external service connections in production
    if not settings.DEBUG:
        try:
            from app.core.database_health import check_database_health
            health = await check_database_health()
            if health["status"] != "healthy":
                print(f"Warning: Database health check failed: {health.get('error')}")
        except Exception as e:
            print(f"Warning: Could not check database health: {e}")

    yield

app = FastAPI(
    title="LC Work Flow API",
    description="Backend API for LC Work Flow application",
    version="1.0.0",
    lifespan=lifespan,
    # Configure OpenAPI schema generation to handle non-serializable defaults gracefully
    generate_unique_id_function=lambda route: f"{route.tags[0]}-{route.name}" if route.tags else route.name,
    # Add exception handlers for graceful error handling
    exception_handlers={
        Exception: lambda request, exc: JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "details": {"error_type": type(exc).__name__} if not settings.DEBUG else {"error_type": type(exc).__name__, "message": str(exc)},
                    "suggestions": ["Please try again later", "Contact support if the problem persists"]
                }
            }
        )
    }
)

# Behind Railway's proxy, trust all hosts for forwarded headers
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# Add database connection middleware
app.add_middleware(DatabaseConnectionMiddleware, max_reconnect_attempts=3)

# Configure CORS LAST so it's outermost and applies to all responses (including errors)
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
app.include_router(users_router, prefix="/api/v1/users", tags=["users"])
app.include_router(applications.router, prefix="/api/v1/applications", tags=["applications"])
app.include_router(files.router, prefix="/api/v1/files", tags=["files"])
app.include_router(folders.router, prefix="/api/v1/folders", tags=["folders"])
app.include_router(customers.router, prefix="/api/v1/customers", tags=["customers"])
app.include_router(departments.router, prefix="/api/v1/departments", tags=["departments"])
app.include_router(branches.router, prefix="/api/v1/branches", tags=["branches"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(settings_router.router, prefix="/api/v1/settings", tags=["settings"])
app.include_router(positions.router, prefix="/api/v1/positions", tags=["positions"])
app.include_router(permissions.router, prefix="/api/v1/permissions", tags=["permissions"])
app.include_router(performance.router, prefix="/api/v1", tags=["performance"])
app.include_router(security.router, prefix="/api/v1", tags=["security"])
app.include_router(enums.router, prefix="/api/v1/enums", tags=["enums"])
app.include_router(selfies.router, prefix="/api/v1/selfies", tags=["selfies"])
app.include_router(validation.router, prefix="/api/v1", tags=["validation"])
app.include_router(employees.router, prefix="/api/v1", tags=["employees"])
app.include_router(admin.router, prefix="/api/v1", tags=["admin"])
# app.include_router(account_validation.router, prefix="/api/v1", tags=["account-validation"])

# Import and include WebSocket router
from app.routers import websocket
app.include_router(websocket.router, prefix="/api/v1/ws", tags=["websocket"])

# Import and include HTTP notification router
from app.routers import notification_http
app.include_router(notification_http.router, prefix="/api/v1", tags=["notifications-http"])

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
    import os

    # Use PORT environment variable from Railway, fallback to settings
    port = int(os.getenv("PORT", settings.PORT))

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=port,
        reload=settings.DEBUG
    )