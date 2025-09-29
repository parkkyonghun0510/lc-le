from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union
import secrets
import os

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="allow",
        case_sensitive=False,
        populate_by_name=True,
    )
    
    # Database
    # DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost/lc_workflow"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:DiCKQpigDCyOAlIwRAACCIfXvnrzjUUl@interchange.proxy.rlwy.net:33042/railway"

    
    # Redis
    # REDIS_URL: str = "redis://localhost:6379"
    REDIS_URL: str = "redis://default:rpKlwePA8Sdut7FwtHjt6HmZ5umnpYzM@maglev.proxy.rlwy.net:40813"

    
    # JWT - Generate secure secret key if not provided
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = int(os.getenv("PORT", 8090))  # Use Railway's PORT or default to 8090
    DEBUG: bool = False
    
    # CORS - Restrict origins in production
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8090",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:8090",
        "http://127.0.0.1:8000",
        # Production frontend URLs
        "https://le-workflow-03fc.up.railway.app",
        "https://frontend-production-c749.up.railway.app",
    ]
    
    # File Storage
    UPLOAD_DIR: str = "static/uploads"
    MAX_FILE_SIZE: int = 10485760  # 10MB
    # Define as Union to handle both list and string from env
    ALLOWED_FILE_TYPES: Union[List[str], str] = [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf", "text/plain", "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
    
    # Security Settings
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 100  # requests per window
    RATE_LIMIT_WINDOW: int = 60  # window in seconds
    
    # Password Policy
    MIN_PASSWORD_LENGTH: int = 8
    REQUIRE_PASSWORD_SPECIAL_CHARS: bool = True
    REQUIRE_PASSWORD_NUMBERS: bool = True
    REQUIRE_PASSWORD_UPPERCASE: bool = True
    
    # Session Security
    SESSION_COOKIE_SECURE: bool = True
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "lax"
    
    # Environment variables from podman-compose.yml
    MINIO_ENDPOINT: str = "https://bucket-production-9546.up.railway.app:443"
    MINIO_ACCESS_KEY: str = "uJ8Z7zDRJh17MwHoKfF2"
    MINIO_SECRET_KEY: str = "hbA41Ti9O1l9ewDFr5A7S0aHfNSnqakl2iyTVFqe"
    MINIO_BUCKET_NAME: str = "lc-workflow-files"
    MINIO_SECURE: bool = True
    # Define as Union to handle both list and string from env
    CORS_ORIGINS: Union[List[str], str] = [
        "https://frontend-production-c749.up.railway.app",
        "https://le-workflow-03fc.up.railway.app",
    ]
    
    # Railway specific environment variables
    DRAGONFLY_URL: str = "redis://default:rpKlwePA8Sdut7FwtHjt6HmZ5umnpYzM@maglev.proxy.rlwy.net:40813"
    MINIO_PRIVATE_ENDPOINT: str = "https://bucket-production-9546.up.railway.app:443"
    MINIO_ROOT_USER: str = ""
    MINIO_ROOT_PASSWORD: str = ""
    
    # S3 aliases for compatibility
    S3_ENDPOINT: str = "https://bucket-production-9546.up.railway.app:443"
    S3_ACCESS_KEY: str = "uJ8Z7zDRJh17MwHoKfF2"
    S3_SECRET_KEY: str = "hbA41Ti9O1l9ewDFr5A7S0aHfNSnqakl2iyTVFqe"
    S3_BUCKET_NAME: str = "lc-workflow-files"
    S3_REGION: str = "us-east-1"
    S3_USE_SSL: bool = True

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Map Railway environment variables
        if hasattr(self, 'DRAGONFLY_URL') and self.DRAGONFLY_URL:
            self.REDIS_URL = self.DRAGONFLY_URL
            
        # Map MinIO variables from Railway
        if hasattr(self, 'MINIO_PRIVATE_ENDPOINT') and self.MINIO_PRIVATE_ENDPOINT:
            self.MINIO_ENDPOINT = self.MINIO_PRIVATE_ENDPOINT
            self.S3_ENDPOINT = self.MINIO_PRIVATE_ENDPOINT

        if hasattr(self, 'MINIO_ROOT_USER') and self.MINIO_ROOT_USER:
            self.MINIO_ACCESS_KEY = self.MINIO_ROOT_USER
            self.S3_ACCESS_KEY = self.MINIO_ROOT_USER

        if hasattr(self, 'MINIO_ROOT_PASSWORD') and self.MINIO_ROOT_PASSWORD:
            self.MINIO_SECRET_KEY = self.MINIO_ROOT_PASSWORD
            self.S3_SECRET_KEY = self.MINIO_ROOT_PASSWORD

        # Ensure we have valid credentials for production
        if not self.DEBUG and not self.MINIO_ACCESS_KEY:
            print("Warning: MINIO_ACCESS_KEY not set - file uploads may not work")
        if not self.DEBUG and not self.MINIO_SECRET_KEY:
            print("Warning: MINIO_SECRET_KEY not set - file uploads may not work")
            
        if hasattr(self, 'MINIO_BUCKET_NAME') and self.MINIO_BUCKET_NAME:
            self.S3_BUCKET_NAME = self.MINIO_BUCKET_NAME
            
        if hasattr(self, 'MINIO_SECURE'):
            self.S3_USE_SSL = self.MINIO_SECURE
            self.MINIO_SECURE = self.MINIO_SECURE
            
        # Map MinIO to S3 variables for compatibility (fallback)
        if not self.S3_ENDPOINT and self.MINIO_ENDPOINT:
            self.S3_ENDPOINT = self.MINIO_ENDPOINT
        if not self.S3_ACCESS_KEY and self.MINIO_ACCESS_KEY:
            self.S3_ACCESS_KEY = self.MINIO_ACCESS_KEY
        if not self.S3_SECRET_KEY and self.MINIO_SECRET_KEY:
            self.S3_SECRET_KEY = self.MINIO_SECRET_KEY
        if not self.S3_BUCKET_NAME and self.MINIO_BUCKET_NAME:
            self.S3_BUCKET_NAME = self.MINIO_BUCKET_NAME
        
        # Handle CORS origins from environment and merge with default origins
        if isinstance(self.CORS_ORIGINS, str):
            cors_list = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
            if cors_list:
                # Merge with existing origins, avoiding duplicates
                all_origins = list(set(self.ALLOWED_ORIGINS + cors_list))
                self.ALLOWED_ORIGINS = all_origins
        elif isinstance(self.CORS_ORIGINS, list):
            if self.CORS_ORIGINS:
                # Merge with existing origins, avoiding duplicates
                all_origins = list(set(self.ALLOWED_ORIGINS + self.CORS_ORIGINS))
                self.ALLOWED_ORIGINS = all_origins
                
        # Handle ALLOWED_FILE_TYPES from environment
        if isinstance(self.ALLOWED_FILE_TYPES, str):
            self.ALLOWED_FILE_TYPES = [ftype.strip() for ftype in self.ALLOWED_FILE_TYPES.split(',') if ftype.strip()]
        elif not isinstance(self.ALLOWED_FILE_TYPES, list):
            # Fallback to default if neither string nor list
            self.ALLOWED_FILE_TYPES = [
                "image/jpeg", "image/png", "image/gif", "image/webp",
                "application/pdf", "text/plain", "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ]
        
        # Ensure upload directory exists
        import os
        os.makedirs(self.UPLOAD_DIR, exist_ok=True)

settings = Settings()