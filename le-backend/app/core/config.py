from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union, Optional
import secrets
import os
from pydantic import Field, validator
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class DatabaseSettings(BaseSettings):
    """
    Database configuration settings.

    Handles database connections, connection pooling, and database-specific configurations.
    Supports PostgreSQL with asyncpg driver and Redis for caching/sessions.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        populate_by_name=True,
        extra="allow",
    )

    # Database connection
    database_url: str = Field(
        default="postgresql+asyncpg://user:password@localhost/lc_workflow",
        description="Database connection URL. Automatically converts postgres:// to postgresql+asyncpg:// for async support"
    )

    # Redis configuration
    redis_url: str = Field(
        default="redis://localhost:6379",
        description="Redis connection URL for caching and sessions"
    )

    # Connection pool settings
    database_pool_size: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Database connection pool size (1-100)"
    )

    database_pool_recycle: int = Field(
        default=3600,
        ge=60,
        description="Database connection pool recycle time in seconds (minimum 60)"
    )

    database_pool_timeout: int = Field(
        default=30,
        ge=5,
        description="Database connection pool timeout in seconds (minimum 5)"
    )

    # Redis connection pool settings
    redis_pool_max_connections: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Redis connection pool max connections (1-100)"
    )

    redis_pool_timeout: int = Field(
        default=5,
        ge=1,
        description="Redis connection pool timeout in seconds"
    )

    # Database monitoring
    enable_database_query_logging: bool = Field(
        default=False,
        description="Enable database query logging for performance monitoring"
    )

    database_query_log_threshold: float = Field(
        default=1.0,
        ge=0.1,
        description="Database query log threshold in seconds"
    )

    def model_post_init(self, __context) -> None:
        """Post-initialization processing for database settings."""
        self._process_database_url()
        self._process_redis_url()

    def _process_database_url(self) -> None:
        """Process and validate database URL."""
        if not self.database_url:
            logger.warning("DATABASE_URL not configured")
            return

        logger.info(f"Processing database URL: {self.database_url[:50]}...")

        # Convert postgres:// to postgresql+asyncpg:// for async support
        if self.database_url.startswith('postgres://'):
            self.database_url = self.database_url.replace('postgres://', 'postgresql+asyncpg://', 1)
            logger.info("Converted postgres:// to postgresql+asyncpg://")
        elif self.database_url.startswith('postgresql://') and 'asyncpg' not in self.database_url:
            # Add asyncpg driver if not present
            self.database_url = self.database_url.replace('postgresql://', 'postgresql+asyncpg://', 1)
            logger.info("Added asyncpg driver to PostgreSQL URL")

    def _process_redis_url(self) -> None:
        """Process Redis URL from environment variables."""
        # Handle Railway Dragonfly URL
        dragonfly_url = os.getenv("DRAGONFLY_URL")
        redis_url_env = os.getenv("REDIS_URL")

        if dragonfly_url:
            logger.info("Using Dragonfly URL for Redis connection")
            self.redis_url = dragonfly_url
        elif redis_url_env:
            logger.info(f"Using Redis URL: {self.redis_url[:30]}...")
            self.redis_url = redis_url_env


class SecuritySettings(BaseSettings):
    """
    Security configuration settings.

    Handles authentication, authorization, password policies, session security,
    rate limiting, and other security-related configurations.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        populate_by_name=True,
        extra="allow",
    )

    # JWT Configuration
    secret_key: str = Field(
        default_factory=lambda: os.getenv("SECRET_KEY", secrets.token_urlsafe(64)),
        description="JWT secret key. Auto-generated if not provided"
    )

    algorithm: str = Field(
        default="HS256",
        description="JWT algorithm for token signing"
    )

    access_token_expire_minutes: int = Field(
        default=60,
        ge=5,
        le=1440,  # Max 24 hours
        description="Access token expiration time in minutes (5-1440)"
    )

    refresh_token_expire_days: int = Field(
        default=7,
        ge=1,
        le=30,
        description="Refresh token expiration time in days (1-30)"
    )

    # Password Policy
    min_password_length: int = Field(
        default=8,
        ge=6,
        le=128,
        description="Minimum password length (6-128 characters)"
    )

    require_password_special_chars: bool = Field(
        default=True,
        description="Require special characters in passwords"
    )

    require_password_numbers: bool = Field(
        default=True,
        description="Require numbers in passwords"
    )

    require_password_uppercase: bool = Field(
        default=True,
        description="Require uppercase letters in passwords"
    )

    # Session Security
    session_cookie_secure: bool = Field(
        default=True,
        description="Use secure session cookies (HTTPS only)"
    )

    session_cookie_httponly: bool = Field(
        default=True,
        description="Use HTTP-only session cookies"
    )

    session_cookie_samesite: str = Field(
        default="lax",
        description="Session cookie SameSite policy (strict, lax, none)"
    )

    session_max_age: int = Field(
        default=3600,
        ge=300,
        le=86400,  # Max 24 hours
        description="Session maximum age in seconds (300-86400)"
    )

    # Rate Limiting
    rate_limit_enabled: bool = Field(
        default=True,
        description="Enable rate limiting"
    )

    rate_limit_requests: int = Field(
        default=100,
        ge=10,
        le=1000,
        description="Rate limit requests per window (10-1000)"
    )

    rate_limit_window: int = Field(
        default=60,
        ge=10,
        le=3600,
        description="Rate limit window in seconds (10-3600)"
    )

    # Security Headers
    security_headers_enabled: bool = Field(
        default=True,
        description="Enable security headers middleware"
    )

    csp_policy: str = Field(
        default="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com;",
        description="Content Security Policy"
    )

    # Account Security
    max_login_attempts: int = Field(
        default=5,
        ge=3,
        le=10,
        description="Maximum login attempts before account lockout (3-10)"
    )

    account_lockout_duration: int = Field(
        default=900,
        ge=300,
        le=3600,
        description="Account lockout duration in seconds (300-3600)"
    )

    password_reset_token_expire_minutes: int = Field(
        default=15,
        ge=5,
        le=60,
        description="Password reset token expiration in minutes (5-60)"
    )

    # Secret Rotation
    enable_secret_rotation: bool = Field(
        default=False,
        description="Enable automatic secret rotation"
    )

    secret_rotation_interval_days: int = Field(
        default=90,
        ge=30,
        le=365,
        description="Secret rotation interval in days (30-365)"
    )

    @property
    def access_token_expire_timedelta(self) -> timedelta:
        """Get access token expiration as timedelta."""
        return timedelta(minutes=self.access_token_expire_minutes)

    @property
    def refresh_token_expire_timedelta(self) -> timedelta:
        """Get refresh token expiration as timedelta."""
        return timedelta(days=self.refresh_token_expire_days)

    def is_password_strong(self, password: str) -> tuple[bool, list[str]]:
        """
        Validate password strength against policy.

        Returns:
            tuple: (is_valid, list_of_violations)
        """
        violations = []

        if len(password) < self.min_password_length:
            violations.append(f"Password must be at least {self.min_password_length} characters long")

        if self.require_password_uppercase and not any(c.isupper() for c in password):
            violations.append("Password must contain at least one uppercase letter")

        if self.require_password_numbers and not any(c.isdigit() for c in password):
            violations.append("Password must contain at least one number")

        if self.require_password_special_chars and not any(not c.isalnum() for c in password):
            violations.append("Password must contain at least one special character")

        return len(violations) == 0, violations


class StorageSettings(BaseSettings):
    """
    Storage configuration settings.

    Handles file storage, MinIO/S3 configurations, and file upload settings.
    Supports both local storage and cloud storage providers.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        populate_by_name=True,
        extra="allow",
    )

    # File Storage
    upload_dir: str = Field(
        default="static/uploads",
        description="Local upload directory path"
    )

    max_file_size: int = Field(
        default=10485760,  # 10MB
        ge=1024,  # 1KB minimum
        le=104857600,  # 100MB maximum
        description="Maximum file size in bytes (1KB-100MB)"
    )

    allowed_file_types: List[str] = Field(
        default=[
            "image/jpeg", "image/png", "image/gif", "image/webp",
            "application/pdf", "text/plain", "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],
        description="Allowed MIME types for file uploads"
    )

    # MinIO Configuration
    minio_endpoint: str = Field(
        default="",
        description="MinIO server endpoint URL"
    )

    minio_access_key: str = Field(
        default="",
        description="MinIO access key"
    )

    minio_secret_key: str = Field(
        default="",
        description="MinIO secret key"
    )

    minio_bucket_name: str = Field(
        default="lc-workflow-files",
        description="MinIO bucket name"
    )

    minio_secure: bool = Field(
        default=True,
        description="Use HTTPS for MinIO connection"
    )

    # S3 Configuration (aliases for MinIO compatibility)
    s3_endpoint: str = Field(
        default="",
        description="S3 endpoint URL"
    )

    s3_access_key: str = Field(
        default="",
        description="S3 access key"
    )

    s3_secret_key: str = Field(
        default="",
        description="S3 secret key"
    )

    s3_bucket_name: str = Field(
        default="lc-workflow-files",
        description="S3 bucket name"
    )

    s3_region: str = Field(
        default="us-east-1",
        description="S3 region"
    )

    s3_use_ssl: bool = Field(
        default=True,
        description="Use SSL for S3 connection"
    )

    # Railway-specific variables
    minio_private_endpoint: str = Field(
        default="",
        description="MinIO private endpoint (Railway)"
    )

    minio_root_user: str = Field(
        default="",
        description="MinIO root user (Railway)"
    )

    minio_root_password: str = Field(
        default="",
        description="MinIO root password (Railway)"
    )

    # Storage preferences
    preferred_storage: str = Field(
        default="local",
        description="Preferred storage backend (local, minio, s3)"
    )

    enable_storage_encryption: bool = Field(
        default=False,
        description="Enable encryption for stored files"
    )

    storage_encryption_key: str = Field(
        default="",
        description="Encryption key for stored files"
    )

    def model_post_init(self, __context) -> None:
        """Post-initialization processing for storage settings."""
        self._map_railway_variables()
        self._sync_minio_s3_settings()
        self._validate_storage_credentials()
        self._ensure_upload_dir()

    def _map_railway_variables(self) -> None:
        """Map Railway-specific environment variables."""
        # Map MinIO variables from Railway
        if self.minio_private_endpoint and not self.minio_endpoint:
            self.minio_endpoint = self.minio_private_endpoint
            logger.info("Mapped MINIO_PRIVATE_ENDPOINT to MINIO_ENDPOINT")

        if self.minio_root_user and not self.minio_access_key:
            self.minio_access_key = self.minio_root_user
            logger.info("Mapped MINIO_ROOT_USER to MINIO_ACCESS_KEY")

        if self.minio_root_password and not self.minio_secret_key:
            self.minio_secret_key = self.minio_root_password
            logger.info("Mapped MINIO_ROOT_PASSWORD to MINIO_SECRET_KEY")

    def _sync_minio_s3_settings(self) -> None:
        """Sync settings between MinIO and S3 configurations."""
        # Sync endpoints
        if self.minio_endpoint and not self.s3_endpoint:
            self.s3_endpoint = self.minio_endpoint
            logger.info("Synced MinIO endpoint to S3 endpoint")

        # Sync credentials
        if self.minio_access_key and not self.s3_access_key:
            self.s3_access_key = self.minio_access_key
            logger.info("Synced MinIO access key to S3 access key")

        if self.minio_secret_key and not self.s3_secret_key:
            self.s3_secret_key = self.minio_secret_key
            logger.info("Synced MinIO secret key to S3 secret key")

        # Sync bucket names
        if self.minio_bucket_name and not self.s3_bucket_name:
            self.s3_bucket_name = self.minio_bucket_name
            logger.info("Synced MinIO bucket name to S3 bucket name")

        # Sync SSL settings
        if self.minio_secure and not self.s3_use_ssl:
            self.s3_use_ssl = self.minio_secure
            logger.info("Synced MinIO SSL setting to S3 SSL setting")

    def _validate_storage_credentials(self) -> None:
        """Validate storage credentials for production."""
        debug = os.getenv("DEBUG", "false").lower() == "true"

        if not debug:
            if not self.minio_access_key:
                logger.warning("MINIO_ACCESS_KEY not set - file uploads may not work")
            if not self.minio_secret_key:
                logger.warning("MINIO_SECRET_KEY not set - file uploads may not work")

    def _ensure_upload_dir(self) -> None:
        """Ensure upload directory exists."""
        try:
            os.makedirs(self.upload_dir, exist_ok=True)
            logger.info(f"Ensured upload directory exists: {self.upload_dir}")
        except Exception as e:
            logger.error(f"Failed to create upload directory {self.upload_dir}: {e}")

    def is_file_type_allowed(self, mime_type: str) -> bool:
        """Check if file type is allowed."""
        return mime_type in self.allowed_file_types

    def get_storage_config(self) -> dict:
        """Get storage configuration for the preferred backend."""
        if self.preferred_storage == "s3":
            return {
                "endpoint": self.s3_endpoint,
                "access_key": self.s3_access_key,
                "secret_key": self.s3_secret_key,
                "bucket_name": self.s3_bucket_name,
                "region": self.s3_region,
                "use_ssl": self.s3_use_ssl,
            }
        else:  # minio or local
            return {
                "endpoint": self.minio_endpoint,
                "access_key": self.minio_access_key,
                "secret_key": self.minio_secret_key,
                "bucket_name": self.minio_bucket_name,
                "secure": self.minio_secure,
            }


class ServerSettings(BaseSettings):
    """
    Server configuration settings.

    Handles server configuration, CORS settings, and server-specific options.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        populate_by_name=True,
        extra="allow",
    )

    # Server Configuration
    host: str = Field(
        default="0.0.0.0",
        description="Server host address"
    )

    port: int = Field(
        default=8090,
        ge=1024,
        le=65535,
        description="Server port (1024-65535)"
    )

    debug: bool = Field(
        default=False,
        description="Enable debug mode"
    )

    workers: int = Field(
        default=1,
        ge=1,
        le=16,
        description="Number of worker processes (1-16)"
    )

    # CORS Configuration
    allowed_origins: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:8090",
            "http://localhost:8000",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "http://127.0.0.1:8090",
            "http://127.0.0.1:8000",
            "https://le-workflow-03fc.up.railway.app",
            "https://bucket-production-9546.up.railway.app:443",
            # Production frontend URL - update this with your actual frontend domain
            "https://le-workflow-03fc.up.railway.app"
        ],
        description="Allowed CORS origins"
    )

    cors_origins_env: Union[List[str], str] = Field(
        default="",
        description="Additional CORS origins from environment variable"
    )

    # CORS Settings
    cors_allow_credentials: bool = Field(
        default=True,
        description="Allow credentials in CORS requests"
    )

    cors_allow_methods: List[str] = Field(
        default=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        description="Allowed CORS methods"
    )

    cors_allow_headers: List[str] = Field(
        default=["*"],
        description="Allowed CORS headers"
    )

    cors_max_age: int = Field(
        default=3600,
        ge=0,
        description="CORS max age in seconds"
    )

    # Server Monitoring
    enable_request_logging: bool = Field(
        default=True,
        description="Enable request logging"
    )

    enable_performance_monitoring: bool = Field(
        default=False,
        description="Enable performance monitoring"
    )

    request_timeout: int = Field(
        default=300,
        ge=10,
        le=3600,
        description="Request timeout in seconds (10-3600)"
    )

    def model_post_init(self, __context) -> None:
        """Post-initialization processing for server settings."""
        self._process_cors_origins()

    def _process_cors_origins(self) -> None:
        """Process and merge CORS origins from environment."""
        if isinstance(self.cors_origins_env, str):
            if self.cors_origins_env.strip():
                cors_list = [origin.strip() for origin in self.cors_origins_env.split(",") if origin.strip()]
                if cors_list:
                    # Merge with existing origins, avoiding duplicates
                    all_origins = list(set(self.allowed_origins + cors_list))
                    self.allowed_origins = all_origins
                    logger.info(f"Merged CORS origins from environment: {len(cors_list)} additional origins")
        elif isinstance(self.cors_origins_env, list):
            if self.cors_origins_env:
                # Merge with existing origins, avoiding duplicates
                all_origins = list(set(self.allowed_origins + self.cors_origins_env))
                self.allowed_origins = all_origins
                logger.info(f"Merged CORS origins from list: {len(self.cors_origins_env)} additional origins")

        if not self.allowed_origins:
            logger.warning("No CORS origins configured - this may block frontend requests")

    def get_cors_config(self) -> dict:
        """Get CORS configuration for FastAPI."""
        return {
            "allow_origins": self.allowed_origins,
            "allow_credentials": self.cors_allow_credentials,
            "allow_methods": self.cors_allow_methods,
            "allow_headers": self.cors_allow_headers,
            "max_age": self.cors_max_age,
        }


class ApplicationSettings(BaseSettings):
    """
    General application configuration settings.

    Handles general application settings, feature flags, and application-specific configurations.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        populate_by_name=True,
        extra="allow",
    )

    # Application Info
    app_name: str = Field(
        default="LC Workflow",
        description="Application name"
    )

    app_version: str = Field(
        default="1.0.0",
        description="Application version"
    )

    app_description: str = Field(
        default="Loan Management Workflow System",
        description="Application description"
    )

    # Environment
    environment: str = Field(
        default="development",
        description="Application environment (development, staging, production)"
    )

    # Feature Flags
    enable_user_registration: bool = Field(
        default=True,
        description="Enable user registration"
    )

    enable_file_upload: bool = Field(
        default=True,
        description="Enable file upload functionality"
    )

    enable_notifications: bool = Field(
        default=True,
        description="Enable notification system"
    )

    enable_audit_logging: bool = Field(
        default=False,
        description="Enable audit logging"
    )

    enable_analytics: bool = Field(
        default=False,
        description="Enable analytics tracking"
    )

    # Performance Settings
    enable_caching: bool = Field(
        default=True,
        description="Enable caching"
    )

    cache_ttl: int = Field(
        default=300,
        ge=60,
        le=3600,
        description="Default cache TTL in seconds (60-3600)"
    )

    # API Settings
    api_prefix: str = Field(
        default="/api",
        description="API prefix"
    )

    api_version: str = Field(
        default="v1",
        description="API version"
    )

    # Pagination
    default_page_size: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Default pagination page size (1-100)"
    )

    max_page_size: int = Field(
        default=100,
        ge=10,
        le=1000,
        description="Maximum pagination page size (10-1000)"
    )

    # Logging
    log_level: str = Field(
        default="INFO",
        description="Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)"
    )

    log_format: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        description="Log format"
    )

    # Health Check
    health_check_path: str = Field(
        default="/health",
        description="Health check endpoint path"
    )

    # Maintenance Mode
    maintenance_mode: bool = Field(
        default=False,
        description="Enable maintenance mode"
    )

    maintenance_message: str = Field(
        default="System is under maintenance. Please try again later.",
        description="Maintenance mode message"
    )


class Settings(BaseSettings):
    """
    Main application settings.

    This class composes all the specific settings classes and provides
    backward compatibility with the existing configuration structure.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        populate_by_name=True,
        extra="allow",
    )

    # Compose all settings classes
    database: DatabaseSettings = Field(
        default_factory=DatabaseSettings,
        description="Database configuration settings"
    )

    security: SecuritySettings = Field(
        default_factory=SecuritySettings,
        description="Security configuration settings"
    )

    storage: StorageSettings = Field(
        default_factory=StorageSettings,
        description="Storage configuration settings"
    )

    server: ServerSettings = Field(
        default_factory=ServerSettings,
        description="Server configuration settings"
    )

    application: ApplicationSettings = Field(
        default_factory=ApplicationSettings,
        description="Application configuration settings"
    )

    # Backward compatibility properties
    @property
    def DATABASE_URL(self) -> str:
        """Backward compatibility for DATABASE_URL."""
        return self.database.database_url

    @property
    def REDIS_URL(self) -> str:
        """Backward compatibility for REDIS_URL."""
        return self.database.redis_url

    @property
    def SECRET_KEY(self) -> str:
        """Backward compatibility for SECRET_KEY."""
        return self.security.secret_key

    @property
    def ALGORITHM(self) -> str:
        """Backward compatibility for ALGORITHM."""
        return self.security.algorithm

    @property
    def ACCESS_TOKEN_EXPIRE_MINUTES(self) -> int:
        """Backward compatibility for ACCESS_TOKEN_EXPIRE_MINUTES."""
        return self.security.access_token_expire_minutes

    @property
    def REFRESH_TOKEN_EXPIRE_DAYS(self) -> int:
        """Backward compatibility for REFRESH_TOKEN_EXPIRE_DAYS."""
        return self.security.refresh_token_expire_days

    @property
    def HOST(self) -> str:
        """Backward compatibility for HOST."""
        return self.server.host

    @property
    def PORT(self) -> int:
        """Backward compatibility for PORT."""
        return self.server.port

    @property
    def DEBUG(self) -> bool:
        """Backward compatibility for DEBUG."""
        return self.server.debug

    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        """Backward compatibility for ALLOWED_ORIGINS."""
        return self.server.allowed_origins

    @property
    def UPLOAD_DIR(self) -> str:
        """Backward compatibility for UPLOAD_DIR."""
        return self.storage.upload_dir

    @property
    def MAX_FILE_SIZE(self) -> int:
        """Backward compatibility for MAX_FILE_SIZE."""
        return self.storage.max_file_size

    @property
    def ALLOWED_FILE_TYPES(self) -> List[str]:
        """Backward compatibility for ALLOWED_FILE_TYPES."""
        return self.storage.allowed_file_types

    @property
    def RATE_LIMIT_ENABLED(self) -> bool:
        """Backward compatibility for RATE_LIMIT_ENABLED."""
        return self.security.rate_limit_enabled

    @property
    def RATE_LIMIT_REQUESTS(self) -> int:
        """Backward compatibility for RATE_LIMIT_REQUESTS."""
        return self.security.rate_limit_requests

    @property
    def RATE_LIMIT_WINDOW(self) -> int:
        """Backward compatibility for RATE_LIMIT_WINDOW."""
        return self.security.rate_limit_window

    @property
    def MIN_PASSWORD_LENGTH(self) -> int:
        """Backward compatibility for MIN_PASSWORD_LENGTH."""
        return self.security.min_password_length

    @property
    def REQUIRE_PASSWORD_SPECIAL_CHARS(self) -> bool:
        """Backward compatibility for REQUIRE_PASSWORD_SPECIAL_CHARS."""
        return self.security.require_password_special_chars

    @property
    def REQUIRE_PASSWORD_NUMBERS(self) -> bool:
        """Backward compatibility for REQUIRE_PASSWORD_NUMBERS."""
        return self.security.require_password_numbers

    @property
    def REQUIRE_PASSWORD_UPPERCASE(self) -> bool:
        """Backward compatibility for REQUIRE_PASSWORD_UPPERCASE."""
        return self.security.require_password_uppercase

    @property
    def SESSION_COOKIE_SECURE(self) -> bool:
        """Backward compatibility for SESSION_COOKIE_SECURE."""
        return self.security.session_cookie_secure

    @property
    def SESSION_COOKIE_HTTPONLY(self) -> bool:
        """Backward compatibility for SESSION_COOKIE_HTTPONLY."""
        return self.security.session_cookie_httponly

    @property
    def SESSION_COOKIE_SAMESITE(self) -> str:
        """Backward compatibility for SESSION_COOKIE_SAMESITE."""
        return self.security.session_cookie_samesite

    @property
    def MINIO_ENDPOINT(self) -> str:
        """Backward compatibility for MINIO_ENDPOINT."""
        return self.storage.minio_endpoint

    @property
    def MINIO_ACCESS_KEY(self) -> str:
        """Backward compatibility for MINIO_ACCESS_KEY."""
        return self.storage.minio_access_key

    @property
    def MINIO_SECRET_KEY(self) -> str:
        """Backward compatibility for MINIO_SECRET_KEY."""
        return self.storage.minio_secret_key

    @property
    def MINIO_BUCKET_NAME(self) -> str:
        """Backward compatibility for MINIO_BUCKET_NAME."""
        return self.storage.minio_bucket_name

    @property
    def MINIO_SECURE(self) -> bool:
        """Backward compatibility for MINIO_SECURE."""
        return self.storage.minio_secure

    @property
    def CORS_ORIGINS(self) -> Union[List[str], str]:
        """Backward compatibility for CORS_ORIGINS."""
        return self.server.cors_origins_env

    @property
    def DRAGONFLY_URL(self) -> str:
        """Backward compatibility for DRAGONFLY_URL."""
        return os.getenv("DRAGONFLY_URL", "")

    @property
    def S3_ENDPOINT(self) -> str:
        """Backward compatibility for S3_ENDPOINT."""
        return self.storage.s3_endpoint

    @property
    def S3_ACCESS_KEY(self) -> str:
        """Backward compatibility for S3_ACCESS_KEY."""
        return self.storage.s3_access_key

    @property
    def S3_SECRET_KEY(self) -> str:
        """Backward compatibility for S3_SECRET_KEY."""
        return self.storage.s3_secret_key

    @property
    def S3_BUCKET_NAME(self) -> str:
        """Backward compatibility for S3_BUCKET_NAME."""
        return self.storage.s3_bucket_name

    @property
    def S3_REGION(self) -> str:
        """Backward compatibility for S3_REGION."""
        return self.storage.s3_region

    @property
    def S3_USE_SSL(self) -> bool:
        """Backward compatibility for S3_USE_SSL."""
        return self.storage.s3_use_ssl

    def validate_configuration(self) -> tuple[bool, List[str]]:
        """
        Validate the entire configuration.

        Returns:
            tuple: (is_valid, list_of_validation_errors)
        """
        errors = []

        # Validate database configuration
        if not self.database.database_url:
            errors.append("Database URL is required")

        # Validate security configuration
        if not self.security.secret_key or len(self.security.secret_key) < 32:
            errors.append("Secret key must be at least 32 characters long")

        # Validate storage configuration
        if not self.storage.minio_access_key and not self.storage.s3_access_key:
            if not self.server.debug:
                errors.append("Storage credentials are required for production")

        # Validate server configuration
        if not self.server.allowed_origins:
            errors.append("At least one CORS origin must be configured")

        return len(errors) == 0, errors

    def get_database_config(self) -> dict:
        """Get database configuration for SQLAlchemy."""
        return {
            "url": self.database.database_url,
            "pool_size": self.database.database_pool_size,
            "pool_recycle": self.database.database_pool_recycle,
            "pool_timeout": self.database.database_pool_timeout,
            "echo": self.database.enable_database_query_logging,
        }

    def get_redis_config(self) -> dict:
        """Get Redis configuration."""
        return {
            "url": self.database.redis_url,
            "max_connections": self.database.redis_pool_max_connections,
            "timeout": self.database.redis_pool_timeout,
        }

    def get_security_config(self) -> dict:
        """Get security configuration."""
        return {
            "secret_key": self.security.secret_key,
            "algorithm": self.security.algorithm,
            "access_token_expire_minutes": self.security.access_token_expire_minutes,
            "refresh_token_expire_days": self.security.refresh_token_expire_days,
        }

    def get_storage_config(self) -> dict:
        """Get storage configuration."""
        return self.storage.get_storage_config()

    def get_server_config(self) -> dict:
        """Get server configuration."""
        return {
            "host": self.server.host,
            "port": self.server.port,
            "debug": self.server.debug,
            "workers": self.server.workers,
            "request_timeout": self.server.request_timeout,
        }

    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.application.environment.lower() == "production"

    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.application.environment.lower() == "development"

    def is_testing(self) -> bool:
        """Check if running in testing environment."""
        return self.application.environment.lower() == "testing"

    def get_feature_flags(self) -> dict:
        """Get all feature flags as a dictionary."""
        return {
            "user_registration": self.application.enable_user_registration,
            "file_upload": self.application.enable_file_upload,
            "notifications": self.application.enable_notifications,
            "audit_logging": self.application.enable_audit_logging,
            "analytics": self.application.enable_analytics,
            "caching": self.application.enable_caching,
        }

    def is_feature_enabled(self, feature: str) -> bool:
        """Check if a specific feature is enabled."""
        flags = self.get_feature_flags()
        return flags.get(feature, False)

    def get_performance_config(self) -> dict:
        """Get performance monitoring configuration."""
        return {
            "enable_monitoring": self.server.enable_performance_monitoring,
            "cache_ttl": self.application.cache_ttl,
            "request_timeout": self.server.request_timeout,
            "database_query_logging": self.database.enable_database_query_logging,
            "database_query_threshold": self.database.database_query_log_threshold,
        }

    def get_logging_config(self) -> dict:
        """Get logging configuration."""
        return {
            "level": self.application.log_level,
            "format": self.application.log_format,
        }

    def get_health_check_config(self) -> dict:
        """Get health check configuration."""
        return {
            "path": self.application.health_check_path,
            "database_enabled": True,
            "redis_enabled": True,
            "storage_enabled": True,
        }

    def export_configuration(self, include_secrets: bool = False) -> dict:
        """
        Export configuration as a dictionary for debugging or monitoring.

        Args:
            include_secrets: Whether to include sensitive information

        Returns:
            dict: Configuration dictionary
        """
        config = {
            "application": {
                "name": self.application.app_name,
                "version": self.application.app_version,
                "environment": self.application.environment,
                "debug": self.server.debug,
            },
            "server": {
                "host": self.server.host,
                "port": self.server.port,
                "workers": self.server.workers,
                "cors_origins_count": len(self.server.allowed_origins),
            },
            "database": {
                "configured": bool(self.database.database_url),
                "pool_size": self.database.database_pool_size,
                "query_logging": self.database.enable_database_query_logging,
            },
            "storage": {
                "provider": self.storage.preferred_storage,
                "upload_dir": self.storage.upload_dir,
                "max_file_size": self.storage.max_file_size,
                "encryption": self.storage.enable_storage_encryption,
            },
            "security": {
                "rate_limiting": self.security.rate_limit_enabled,
                "secret_rotation": self.security.enable_secret_rotation,
                "password_policy": {
                    "min_length": self.security.min_password_length,
                    "require_special_chars": self.security.require_password_special_chars,
                    "require_numbers": self.security.require_password_numbers,
                    "require_uppercase": self.security.require_password_uppercase,
                },
            },
            "features": self.get_feature_flags(),
        }

        if include_secrets:
            config["security"]["secret_key_length"] = len(self.security.secret_key)
            config["storage"]["credentials_configured"] = bool(
                self.storage.minio_access_key or self.storage.s3_access_key
            )

        return config


# Global settings instance
settings = Settings()

# Validate configuration on startup
is_valid, errors = settings.validate_configuration()
if not is_valid:
    error_msg = f"Configuration validation failed: {'; '.join(errors)}"
    logger.error(error_msg)
    raise ValueError(error_msg)

logger.info("Configuration loaded and validated successfully")
logger.info(f"Application: {settings.application.app_name} v{settings.application.app_version}")
logger.info(f"Environment: {settings.application.environment}")
logger.info(f"Debug mode: {settings.server.debug}")