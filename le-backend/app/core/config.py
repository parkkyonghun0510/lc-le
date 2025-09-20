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
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost/lc_workflow"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
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
        "http://localhost:8080",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8000",
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
    
    # File Security Settings
    ENCRYPTION_MASTER_KEY: str = ""
    ENCRYPTION_KEY_FILE: str = ""
    YARA_RULES_PATH: str = ""
    MALWARE_HASHES_FILE: str = ""
    ENABLE_FILE_ENCRYPTION: bool = True
    ENABLE_MALWARE_SCANNING: bool = True
    ENABLE_ACCESS_CONTROL: bool = True
    ENABLE_AUDIT_LOGGING: bool = True
    
    # Environment variables from podman-compose.yml
    MINIO_ENDPOINT: str = ""
    MINIO_ACCESS_KEY: str = ""
    MINIO_SECRET_KEY: str = ""
    MINIO_BUCKET_NAME: str = "lc-workflow-files"
    MINIO_SECURE: bool = False
    # Define as Union to handle both list and string from env
    CORS_ORIGINS: Union[List[str], str] = []
    
    # Railway specific environment variables
    DRAGONFLY_URL: str = ""
    MINIO_PRIVATE_ENDPOINT: str = ""
    MINIO_ROOT_USER: str = ""
    MINIO_ROOT_PASSWORD: str = ""
    
    # S3 aliases for compatibility
    S3_ENDPOINT: str = ""
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET_NAME: str = "lc-workflow-files"
    S3_REGION: str = "us-east-1"
    S3_USE_SSL: bool = False

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