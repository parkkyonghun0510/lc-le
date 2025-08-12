import os
from typing import Optional
from minio import Minio
from minio.error import S3Error
import uuid
from urllib.parse import urlparse
from io import BytesIO
from datetime import timedelta
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
                secure = parsed_url.scheme == 'https'
            else:
                # Fallback to original endpoint if parsing fails
                minio_endpoint = endpoint
                secure = settings.MINIO_SECURE
            
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

    def upload_file(self, file_content: bytes, original_filename: str, content_type: str = "application/octet-stream", prefix: Optional[str] = None) -> str:
        """Upload file to MinIO and return the object name.
        If prefix is provided, the object will be stored under that prefix (folder-like path).
        """
        if not self.enabled:
            raise Exception("MinIO service not configured. Please check environment variables.")
        
        try:
            # Generate unique filename
            file_extension = os.path.splitext(original_filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"

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

    def get_file_url(self, object_name: str, expires: int = 3600) -> str:
        """Get presigned URL for file download"""
        if not self.enabled:
            raise Exception("MinIO service not configured. Please check environment variables.")
        
        try:
            # Convert seconds to timedelta for MinIO client
            expires_delta = timedelta(seconds=expires)
            return self.client.presigned_get_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                expires=expires_delta
            )
        except S3Error as e:
            raise Exception(f"Failed to generate file URL: {e}")
        except Exception as e:
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