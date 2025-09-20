import toast from 'react-hot-toast';
import { toastManager } from './toastManager';

export const handleApiError = (error: any, defaultMessage: string, options?: {
  showRetry?: boolean;
  onRetry?: () => void;
  persistent?: boolean;
}) => {
  let message = defaultMessage;
  let title = 'Error';

  const detail = error.response?.data?.detail;
  const status = error.response?.status;

  // Extract error message
  if (typeof detail === 'string') {
    message = detail;
  } else if (Array.isArray(detail)) {
    message = detail.map((err) => err.msg || 'An error occurred').join('\n');
  } else if (error.response?.data?.errors) {
    const errors = error.response.data.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      message = errors.map((err: any) => err.msg || 'Validation error').join('\n');
    }
  } else if (status === 422) {
    message = 'Invalid data provided';
    title = 'Validation Error';
  } else if (status === 401) {
    message = 'Authentication required';
    title = 'Authentication Error';
  } else if (status === 403) {
    message = 'Access denied';
    title = 'Permission Error';
  } else if (status === 404) {
    message = 'Resource not found';
    title = 'Not Found';
  } else if (status === 429) {
    message = 'Too many requests. Please try again later.';
    title = 'Rate Limited';
  } else if (status >= 500) {
    message = 'Server error occurred. Please try again.';
    title = 'Server Error';
  } else if (error.code === 'NETWORK_ERROR' || !status) {
    message = 'Network connection error. Please check your internet connection.';
    title = 'Connection Error';
  }

  // Use enhanced toast manager if retry is needed
  if (options?.showRetry && options?.onRetry) {
    toastManager.error(title, message, {
      onRetry: options.onRetry,
      persistent: options.persistent,
      duration: options.persistent ? Infinity : 8000,
    });
  } else {
    // Use regular toast for simple errors
    toast.error(message, {
      duration: options?.persistent ? Infinity : 6000,
      style: {
        maxWidth: '400px',
      },
    });
  }
};

// Network-specific error handler
export const handleNetworkError = (error: any, operation: string, onRetry?: () => void) => {
  const isNetworkError = !error.response?.status || error.code === 'NETWORK_ERROR';
  const isServerError = error.response?.status >= 500;
  const isTimeout = error.message?.includes('timeout');

  if (isNetworkError || isServerError || isTimeout) {
    handleApiError(error, `Failed to ${operation}`, {
      showRetry: !!onRetry,
      onRetry,
      persistent: !!onRetry,
    });
  } else {
    handleApiError(error, `Failed to ${operation}`);
  }
};

// File upload specific error handler
export const handleFileUploadError = (error: any, filename: string, onRetry?: () => void) => {
  const status = error.response?.status;
  let message = `Failed to upload ${filename}`;
  let title = 'Upload Failed';

  if (status === 413) {
    message = `File ${filename} is too large`;
    title = 'File Too Large';
  } else if (status === 415) {
    message = `File type not supported for ${filename}`;
    title = 'Unsupported File Type';
  } else if (status === 429) {
    message = `Upload rate limit exceeded. Please wait before uploading ${filename} again.`;
    title = 'Rate Limited';
  } else if (status >= 500 || !status || error.code === 'NETWORK_ERROR') {
    // These are retryable errors
    toastManager.fileUploadFailed(filename, error.message || 'Upload failed', onRetry);
    return;
  }

  toastManager.error(title, message, {
    onRetry,
    persistent: !!onRetry,
  });
};