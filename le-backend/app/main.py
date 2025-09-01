from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
import os
from dotenv import load_dotenv

from app.database import engine, Base
from app.routers import auth, users, applications, files, departments, branches, dashboard, positions
from app.routers import folders, customers, enums, selfies, validation
from app.routers import settings as settings_router
from app.core.config import settings
from app.core.error_handlers import register_error_handlers

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
    lifespan=lifespan
)

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
    try:
        # Test database connectivity
        from sqlalchemy import text
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return {
            "status": "healthy", 
            "service": "lc-workflow-api",
            "database": "connected"
        }
    except Exception as e:
        # Return healthy status even if database is unavailable
        # This allows Railway health check to pass while database is starting
        return {
            "status": "healthy",
            "service": "lc-workflow-api", 
            "database": "disconnected",
            "warning": "Database not available, but service is running",
            "error": str(e)
        }

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )