from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
import os
from dotenv import load_dotenv

from app.database import engine, Base
from app.routers import auth, users, applications, files, departments, branches
from app.core.config import settings

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
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

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(applications.router, prefix="/api/v1/applications", tags=["applications"])
app.include_router(files.router, prefix="/api/v1/files", tags=["files"])
app.include_router(departments.router, prefix="/api/v1/departments", tags=["departments"])
app.include_router(branches.router, prefix="/api/v1/branches", tags=["branches"])

# Serve static files for uploaded documents
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    return {"message": "LC Work Flow API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/v1/health")
async def api_health_check():
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
        return {
            "status": "unhealthy",
            "service": "lc-workflow-api", 
            "database": "disconnected",
            "error": str(e)
        }

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )