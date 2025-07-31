from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

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
    
    # JWT
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8090
    DEBUG: bool = False
    
    # CORS
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
    
    # Environment variables from podman-compose.yml
    MINIO_ENDPOINT: str = ""
    MINIO_ACCESS_KEY: str = ""
    MINIO_SECRET_KEY: str = ""
    MINIO_BUCKET_NAME: str = "lc-workflow-files"
    MINIO_SECURE: bool = False
    CORS_ORIGINS: str = ""
    
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
        
        # Handle CORS origins from environment
        if self.CORS_ORIGINS:
            origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
            self.ALLOWED_ORIGINS.extend(origins)

settings = Settings()