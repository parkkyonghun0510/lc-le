import os
import re
from typing import Optional
from minio import Minio
from minio.error import S3Error
import uuid
from urllib.parse import urlparse
from io import BytesIO
from datetime import timedelta, datetime
from app.core.config import settings

class MinIOService:
    def __init__(self):
        # Use S3 variables as fallback if MinIO variables are empty
        endpoint = settings.MINIO_ENDPOINT or settings.S3_ENDPOINT
        access_key = settings.MINIO_ACCESS_KEY or settings.S3_ACCESS_KEY
        secret_key = settings.MINIO_SECRET_KEY or settings.S3_SECRET_KEY
        
        if not all([endpoint, access_key, secret_key]):
            print("Warning: MinIO/S3 credentials not configured. File uploads will fail.")
            self.client = None
        else:
            # Parse endpoint URL to extract host and port for Railway MinIO
            parsed_url = urlparse(endpoint)
            if parsed_url.hostname:
                # Use hostname and port from parsed URL
                minio_endpoint = parsed_url.hostname
                if parsed_url.port:
                    minio_endpoint = f"{minio_endpoint}:{parsed_url.port}"
                # Prefer explicit MINIO_SECURE setting in production; otherwise infer from scheme
                secure = (parsed_url.scheme == 'https') or bool(getattr(settings, 'MINIO_SECURE', False))
            else:
                # Fallback to original endpoint if parsing fails
                minio_endpoint = endpoint
                secure = bool(getattr(settings, 'MINIO_SECURE', False))
            
            print(f"Connecting to MinIO at: {minio_endpoint} (secure: {secure})")
            
            self.client = Minio(
                endpoint=minio_endpoint,
                access_key=access_key,
                secret_key=secret_key,
                secure=secure,
                http_client=None  # Let MinIO use default HTTP client
            )
        
        self.bucket_name = settings.MINIO_BUCKET_NAME or settings.S3_BUCKET_NAME
        self._enabled = self.client is not None
        
        if self._enabled:
            self._ensure_bucket_exists()

    @property
    def enabled(self):
        return self._enabled

    def _ensure_bucket_exists(self):
        """Ensure the bucket exists, create if it doesn't"""
        if not self.enabled:
            return
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
        except Exception as e:
            # Log warning but don't fail initialization for connection issues
            print(f"Warning: Could not connect to MinIO server: {e}")
            print("This is expected in local development. MinIO will be disabled.")
            self.client = None
            self._enabled = False

    def upload_file(self, file_content: bytes, original_filename: str, content_type: str = "application/octet-stream", prefix: Optional[str] = None, field_name: Optional[str] = None) -> str:
        """Upload file to MinIO and return the object name.
        If prefix is provided, the object will be stored under that prefix (folder-like path).
        It avoids overwriting by appending a unique suffix if the file exists.
        """
        if not self.enabled:
            raise Exception("MinIO service not configured. Please check environment variables.")
        
        try:
            file_extension = os.path.splitext(original_filename)[1]
            
            # Generate filename based on field_name if provided
            if field_name and field_name.strip():
                # Sanitize field_name: remove invalid characters and limit length
                sanitized_field_name = self._sanitize_field_name(field_name.strip())
                if sanitized_field_name:
                    # Generate structured filename: {field_name}_{timestamp}_{unique_id}.{extension}
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    unique_id = str(uuid.uuid4())[:8]  # Use shorter UUID for readability
                    unique_filename = f"{sanitized_field_name}_{timestamp}_{unique_id}{file_extension}"
                else:
                    # Fallback to original naming if field_name is invalid after sanitization
                    base_filename = os.path.splitext(original_filename)[0]
                    unique_filename = f"{base_filename}_{uuid.uuid4()}{file_extension}"
            else:
                # Original naming convention when no field_name provided
                base_filename = os.path.splitext(original_filename)[0]
                unique_filename = f"{base_filename}_{uuid.uuid4()}{file_extension}"

            # Build object name with optional prefix
            object_name = unique_filename
            if prefix:
                cleaned = prefix.strip('/').replace('..', '')
                object_name = f"{cleaned}/{unique_filename}"
            
            # Convert bytes to BytesIO for MinIO
            file_data = BytesIO(file_content)
            
            # Upload to MinIO
            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                data=file_data,
                length=len(file_content),
                content_type=content_type
            )
            
            return object_name
        except S3Error as e:
            raise Exception(f"Failed to upload file: {e}")
        except Exception as e:
            raise Exception(f"Failed to upload file: {e}")
    
    def _sanitize_field_name(self, field_name: str) -> str:
        """Sanitize field name to ensure it's safe for use in filenames.
        
        Args:
            field_name: The raw field name to sanitize
            
        Returns:
            Sanitized field name or empty string if invalid
        """
        if not field_name or not field_name.strip():
            return ""
        
        # Remove leading/trailing whitespace
        sanitized = field_name.strip()
        
        # Replace spaces and special characters with underscores
        # Allow only alphanumeric characters, underscores, and hyphens
        sanitized = re.sub(r'[^a-zA-Z0-9_-]', '_', sanitized)
        
        # Remove multiple consecutive underscores
        sanitized = re.sub(r'_+', '_', sanitized)
        
        # Remove leading/trailing underscores
        sanitized = sanitized.strip('_')
        
        # Limit length to prevent overly long filenames
        max_length = 50
        if len(sanitized) > max_length:
            sanitized = sanitized[:max_length].rstrip('_')
        
        # Ensure it's not empty after sanitization
        if not sanitized or len(sanitized) < 1:
            return ""
            
        return sanitized

    def get_file_url(self, object_name: str, expires: int = 3600) -> str:
        """Get presigned URL for file download"""
        import logging
        logger = logging.getLogger(__name__)

        if not self.enabled:
            logger.error("MinIO service not configured or enabled")
            raise Exception("MinIO service not configured. Please check environment variables.")

        logger.info(f"Generating presigned URL for object: {object_name} (expires: {expires}s)")

        try:
            # Convert seconds to timedelta for MinIO client
            expires_delta = timedelta(seconds=expires)
            logger.info(f"Calling presigned_get_object for bucket: {self.bucket_name}, object: {object_name}")
            url = self.client.presigned_get_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                expires=expires_delta
            )

            # Hard guard: if production is secure, ensure presigned URL uses https
            if bool(getattr(settings, 'MINIO_SECURE', False)) and url.startswith('http://'):
                logger.info("Converting HTTP URL to HTTPS for security")
                url = 'https://' + url[len('http://'):]

            logger.info(f"Successfully generated presigned URL for object: {object_name}")
            return url

        except S3Error as e:
            logger.error(f"S3Error generating file URL for object {object_name}: {str(e)}", exc_info=True)
            raise Exception(f"Failed to generate file URL: {e}")
        except Exception as e:
            logger.error(f"General error generating file URL for object {object_name}: {str(e)}", exc_info=True)
            raise Exception(f"Failed to generate file URL: {e}")

    def delete_file(self, object_name: str):
        """Delete file from MinIO"""
        if not self.enabled:
            return  # Silently skip deletion if service not configured
        
        try:
            self.client.remove_object(self.bucket_name, object_name)
        except S3Error as e:
            raise Exception(f"Failed to delete file: {e}")
        except Exception as e:
            raise Exception(f"Failed to delete file: {e}")

    def get_file_info(self, object_name: str):
        """Get file metadata from MinIO"""
        if not self.enabled:
            raise Exception("MinIO service not configured. Please check environment variables.")
        
        try:
            stat = self.client.stat_object(self.bucket_name, object_name)
            return {
                "size": stat.size,
                "content_type": stat.content_type,
                "last_modified": stat.last_modified,
                "etag": stat.etag
            }
        except S3Error as e:
            raise Exception(f"Failed to get file info: {e}")
        except Exception as e:
            raise Exception(f"Failed to get file info: {e}")

    def get_upload_url(self, original_filename: str, expires: int = 3600) -> dict:
        """Generate a presigned PUT URL for direct client upload."""
        if not self.enabled:
            raise Exception("MinIO service not configured. Please check environment variables.")

        try:
            file_extension = os.path.splitext(original_filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            expires_delta = timedelta(seconds=expires)
            url = self.client.presigned_put_object(
                bucket_name=self.bucket_name,
                object_name=unique_filename,
                expires=expires_delta,
            )
            return {"object_name": unique_filename, "upload_url": url, "expires_in": expires}
        except S3Error as e:
            raise Exception(f"Failed to generate upload URL: {e}")
        except Exception as e:
            raise Exception(f"Failed to generate upload URL: {e}")

# Global instance
minio_service = MinIOService()