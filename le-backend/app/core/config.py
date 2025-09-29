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
    
    # Database - Use Railway environment variable or fallback to provided URL
    # DATABASE_URL: str = "postgresql+asyncpg://postgres:DiCKQpigDCyOAlIwRAACCIfXvnrzjUUl@interchange.proxy.rlwy.net:33042/railway"

    
    # Redis
    # REDIS_URL: str = "redis://localhost:6379"
    # REDIS_URL: str = "redis://default:rpKlwePA8Sdut7FwtHjt6HmZ5umnpYzM@maglev.proxy.rlwy.net:40813"

    
    # JWT - Use environment variables with fallbacks
    SECRET_KEY: str = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8090"))  # Use Railway's PORT or default to 8090
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # CORS - Restrict origins in production
    ALLOWED_ORIGINS: List[str] = []
    
    # File Storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "static/uploads")
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB
    # Define as Union to handle both list and string from env
    ALLOWED_FILE_TYPES: Union[List[str], str] = [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf", "text/plain", "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
    
    # Security Settings
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))  # requests per window
    RATE_LIMIT_WINDOW: int = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # window in seconds
    
    # Password Policy
    MIN_PASSWORD_LENGTH: int = int(os.getenv("MIN_PASSWORD_LENGTH", "8"))
    REQUIRE_PASSWORD_SPECIAL_CHARS: bool = os.getenv("REQUIRE_PASSWORD_SPECIAL_CHARS", "true").lower() == "true"
    REQUIRE_PASSWORD_NUMBERS: bool = os.getenv("REQUIRE_PASSWORD_NUMBERS", "true").lower() == "true"
    REQUIRE_PASSWORD_UPPERCASE: bool = os.getenv("REQUIRE_PASSWORD_UPPERCASE", "true").lower() == "true"
    
    # Session Security
    SESSION_COOKIE_SECURE: bool = os.getenv("SESSION_COOKIE_SECURE", "true").lower() == "true"
    SESSION_COOKIE_HTTPONLY: bool = os.getenv("SESSION_COOKIE_HTTPONLY", "true").lower() == "true"
    SESSION_COOKIE_SAMESITE: str = os.getenv("SESSION_COOKIE_SAMESITE", "lax")
    
    # MinIO/S3 Configuration - Use environment variables
    MINIO_ENDPOINT: str = os.getenv("MINIO_ENDPOINT", "")
    MINIO_ACCESS_KEY: str = os.getenv("MINIO_ACCESS_KEY", "")
    MINIO_SECRET_KEY: str = os.getenv("MINIO_SECRET_KEY", "")
    MINIO_BUCKET_NAME: str = os.getenv("MINIO_BUCKET_NAME", "lc-workflow-files")
    MINIO_SECURE: bool = os.getenv("MINIO_SECURE", "true").lower() == "true"
    # CORS Origins - Use environment variable with fallback
    CORS_ORIGINS: Union[List[str], str] = os.getenv("CORS_ORIGINS", "")
    
    # Railway specific environment variables
    DRAGONFLY_URL: str = os.getenv("DRAGONFLY_URL", "")
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    MINIO_PRIVATE_ENDPOINT: str = os.getenv("MINIO_PRIVATE_ENDPOINT", "")
    MINIO_ROOT_USER: str = os.getenv("MINIO_ROOT_USER", "")
    MINIO_ROOT_PASSWORD: str = os.getenv("MINIO_ROOT_PASSWORD", "")
    
    # S3 aliases for compatibility
    S3_ENDPOINT: str = os.getenv("S3_ENDPOINT", "")
    S3_ACCESS_KEY: str = os.getenv("S3_ACCESS_KEY", "")
    S3_SECRET_KEY: str = os.getenv("S3_SECRET_KEY", "")
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "lc-workflow-files")
    S3_REGION: str = os.getenv("S3_REGION", "us-east-1")
    S3_USE_SSL: bool = os.getenv("S3_USE_SSL", "true").lower() == "true"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        
        # Handle Railway DATABASE_URL environment variable
        database_url = os.getenv('DATABASE_URL')
        if database_url:
            print(f"Found DATABASE_URL environment variable")
            # Convert postgres:// to postgresql+asyncpg:// for async support
            if database_url.startswith('postgres://'):
                database_url = database_url.replace('postgres://', 'postgresql+asyncpg://', 1)
                print(f"Converted postgres:// to postgresql+asyncpg://")
            elif not database_url.startswith('postgresql+asyncpg://'):
                # Add asyncpg driver if not present
                database_url = database_url.replace('postgresql://', 'postgresql+asyncpg://', 1)
                print(f"Added asyncpg driver to PostgreSQL URL")
            self.DATABASE_URL = database_url
        else:
            print("Warning: DATABASE_URL environment variable not found - using default database configuration")
            
        # Map Railway environment variables
        if self.DRAGONFLY_URL and not self.REDIS_URL:
            self.REDIS_URL = self.DRAGONFLY_URL
        elif self.REDIS_URL and not self.DRAGONFLY_URL:
            self.DRAGONFLY_URL = self.REDIS_URL
            
        # Map MinIO variables from Railway
        if self.MINIO_PRIVATE_ENDPOINT and not self.MINIO_ENDPOINT:
            self.MINIO_ENDPOINT = self.MINIO_PRIVATE_ENDPOINT
        if self.MINIO_ENDPOINT and not self.S3_ENDPOINT:
            self.S3_ENDPOINT = self.MINIO_ENDPOINT

        if self.MINIO_ROOT_USER and not self.MINIO_ACCESS_KEY:
            self.MINIO_ACCESS_KEY = self.MINIO_ROOT_USER
        if self.MINIO_ACCESS_KEY and not self.S3_ACCESS_KEY:
            self.S3_ACCESS_KEY = self.MINIO_ACCESS_KEY

        if self.MINIO_ROOT_PASSWORD and not self.MINIO_SECRET_KEY:
            self.MINIO_SECRET_KEY = self.MINIO_ROOT_PASSWORD
        if self.MINIO_SECRET_KEY and not self.S3_SECRET_KEY:
            self.S3_SECRET_KEY = self.MINIO_SECRET_KEY

        # Ensure we have valid credentials for production
        if not self.DEBUG and not self.MINIO_ACCESS_KEY:
            print("Warning: MINIO_ACCESS_KEY not set - file uploads may not work")
        if not self.DEBUG and not self.MINIO_SECRET_KEY:
            print("Warning: MINIO_SECRET_KEY not set - file uploads may not work")
            
        if self.MINIO_BUCKET_NAME and not self.S3_BUCKET_NAME:
            self.S3_BUCKET_NAME = self.MINIO_BUCKET_NAME
            
        # Sync SSL settings between MinIO and S3
        if self.MINIO_SECURE and not self.S3_USE_SSL:
            self.S3_USE_SSL = self.MINIO_SECURE
        
        # Handle CORS origins from environment and merge with default origins
        print(f"CORS_ORIGINS type: {type(self.CORS_ORIGINS)}, value: {self.CORS_ORIGINS}")
        if isinstance(self.CORS_ORIGINS, str):
            cors_list = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
            if cors_list:
                # Merge with existing origins, avoiding duplicates
                all_origins = list(set(self.ALLOWED_ORIGINS + cors_list))
                self.ALLOWED_ORIGINS = all_origins
                print(f"CORS origins configured from string: {self.ALLOWED_ORIGINS}")
        elif isinstance(self.CORS_ORIGINS, list):
            if self.CORS_ORIGINS:
                # Merge with existing origins, avoiding duplicates
                all_origins = list(set(self.ALLOWED_ORIGINS + self.CORS_ORIGINS))
                self.ALLOWED_ORIGINS = all_origins
                print(f"CORS origins configured from list: {self.ALLOWED_ORIGINS}")
        
        if not self.ALLOWED_ORIGINS:
            print("Warning: No CORS origins configured - this may block frontend requests")
                
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