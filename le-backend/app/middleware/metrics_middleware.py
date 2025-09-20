"""
Metrics Collection Middleware

This middleware automatically collects metrics for HTTP requests,
particularly focusing on file and folder operations.
"""

import time
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.services.metrics_service import metrics_service

logger = logging.getLogger(__name__)

class MetricsMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, collect_all_requests: bool = False):
        super().__init__(app)
        self.collect_all_requests = collect_all_requests
        
        # Define which endpoints to track
        self.tracked_endpoints = {
            '/api/v1/files/upload': 'file_upload',
            '/api/v1/files/download': 'file_download',
            '/api/v1/files/': 'file_operation',  # Matches file operations
            '/api/v1/folders/': 'folder_operation',  # Matches folder operations
            '/api/v1/applications/': 'application_operation',
            '/api/v1/monitoring/': 'monitoring_operation'
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Determine if this request should be tracked
        operation_name = self._get_operation_name(request)
        should_track = operation_name is not None or self.collect_all_requests
        
        # Process request
        try:
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000
            
            # Collect metrics if tracking is enabled
            if should_track:
                await self._collect_request_metrics(
                    request, response, operation_name, duration_ms, None
                )
            
            return response
            
        except Exception as e:
            # Calculate duration for failed requests
            duration_ms = (time.time() - start_time) * 1000
            
            # Collect error metrics
            if should_track:
                await self._collect_request_metrics(
                    request, None, operation_name, duration_ms, str(e)
                )
            
            # Re-raise the exception
            raise
    
    def _get_operation_name(self, request: Request) -> str:
        """Determine the operation name based on the request path and method"""
        path = request.url.path
        method = request.method
        
        # Check for exact matches first
        for endpoint, operation in self.tracked_endpoints.items():
            if path.startswith(endpoint):
                # Refine operation name based on method and path
                if 'files' in endpoint:
                    if method == 'POST' and 'upload' in path:
                        return 'file_upload'
                    elif method == 'GET' and ('download' in path or path.endswith('.pdf') or path.endswith('.jpg')):
                        return 'file_download'
                    elif method == 'DELETE':
                        return 'file_delete'
                    elif method == 'GET':
                        return 'file_list'
                    else:
                        return 'file_operation'
                
                elif 'folders' in endpoint:
                    if method == 'POST':
                        return 'folder_create'
                    elif method == 'GET':
                        return 'folder_list'
                    elif method == 'PUT':
                        return 'folder_update'
                    elif method == 'DELETE':
                        return 'folder_delete'
                    else:
                        return 'folder_operation'
                
                elif 'applications' in endpoint:
                    if method == 'POST':
                        return 'application_create'
                    elif method == 'GET':
                        return 'application_list'
                    elif method == 'PUT':
                        return 'application_update'
                    else:
                        return 'application_operation'
                
                return operation
        
        return None
    
    async def _collect_request_metrics(
        self, 
        request: Request, 
        response: Response, 
        operation_name: str, 
        duration_ms: float,
        error: str
    ):
        """Collect metrics for the request"""
        try:
            # Determine success status
            success = error is None and (response is None or response.status_code < 400)
            
            # Get user ID if available
            user_id = None
            if hasattr(request.state, 'user') and request.state.user:
                user_id = str(request.state.user.id)
            
            # Determine error type
            error_type = None
            if not success:
                if response and response.status_code:
                    if response.status_code >= 500:
                        error_type = 'server_error'
                    elif response.status_code >= 400:
                        error_type = 'client_error'
                elif error:
                    error_type = 'exception'
            
            # Record operation metrics
            if operation_name:
                metrics_service.collector.record_operation(
                    operation=operation_name,
                    success=success,
                    duration_ms=duration_ms,
                    error_type=error_type,
                    user_id=user_id
                )
            
            # Record specialized metrics for file operations
            if operation_name and operation_name.startswith('file_'):
                await self._collect_file_metrics(
                    request, response, operation_name, success, duration_ms, error_type, user_id
                )
            
            # Record specialized metrics for folder operations
            elif operation_name and operation_name.startswith('folder_'):
                await self._collect_folder_metrics(
                    request, response, operation_name, success, duration_ms, error_type, user_id
                )
            
            # Record general HTTP metrics
            status_code = response.status_code if response else 500
            metrics_service.collector.record_counter(
                'http_requests_total',
                1.0,
                {
                    'method': request.method,
                    'status_code': str(status_code),
                    'operation': operation_name or 'unknown'
                }
            )
            
            metrics_service.collector.record_timer(
                'http_request_duration_ms',
                duration_ms,
                {
                    'method': request.method,
                    'operation': operation_name or 'unknown'
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to collect request metrics: {e}")
    
    async def _collect_file_metrics(
        self,
        request: Request,
        response: Response,
        operation_name: str,
        success: bool,
        duration_ms: float,
        error_type: str,
        user_id: str
    ):
        """Collect specialized metrics for file operations"""
        try:
            if operation_name == 'file_upload':
                # Try to get file size from request
                file_size = 0
                content_length = request.headers.get('content-length')
                if content_length:
                    file_size = int(content_length)
                
                # Try to determine file type
                file_type = 'unknown'
                content_type = request.headers.get('content-type', '')
                if 'image' in content_type:
                    file_type = 'image'
                elif 'pdf' in content_type:
                    file_type = 'pdf'
                elif 'document' in content_type:
                    file_type = 'document'
                
                metrics_service.file_metrics.record_file_upload(
                    success=success,
                    file_size=file_size,
                    duration_ms=duration_ms,
                    file_type=file_type,
                    user_id=user_id,
                    error_type=error_type
                )
            
            elif operation_name == 'file_download':
                # Try to get file size from response
                file_size = 0
                if response and response.headers.get('content-length'):
                    file_size = int(response.headers['content-length'])
                
                metrics_service.file_metrics.record_file_download(
                    success=success,
                    file_size=file_size,
                    duration_ms=duration_ms,
                    user_id=user_id,
                    error_type=error_type
                )
            
            elif operation_name == 'file_delete':
                metrics_service.file_metrics.record_file_deletion(
                    success=success,
                    duration_ms=duration_ms,
                    user_id=user_id,
                    error_type=error_type
                )
                
        except Exception as e:
            logger.error(f"Failed to collect file metrics: {e}")
    
    async def _collect_folder_metrics(
        self,
        request: Request,
        response: Response,
        operation_name: str,
        success: bool,
        duration_ms: float,
        error_type: str,
        user_id: str
    ):
        """Collect specialized metrics for folder operations"""
        try:
            if operation_name == 'folder_create':
                # Determine folder type from request data
                folder_type = 'user_created'
                # You could parse request body to get more specific folder type
                
                metrics_service.folder_metrics.record_folder_creation(
                    success=success,
                    duration_ms=duration_ms,
                    folder_type=folder_type,
                    user_id=user_id,
                    error_type=error_type
                )
            
            elif operation_name in ['folder_list', 'folder_access']:
                metrics_service.folder_metrics.record_folder_access(
                    success=success,
                    duration_ms=duration_ms,
                    user_id=user_id,
                    error_type=error_type
                )
                
        except Exception as e:
            logger.error(f"Failed to collect folder metrics: {e}")