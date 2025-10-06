import toast from 'react-hot-toast';
import { logger } from './logger';
import { externalLogging } from './externalLogging';

export interface ApiError {
  response?: {
    status: number;
    data?: {
      detail?: string | any[];
      errors?: any[];
      message?: string;
    };
  };
  message?: string;
  code?: string;
}

export const handleApiError = (error: ApiError, defaultMessage: string = 'An unexpected error occurred') => {
  let message = defaultMessage;
  let errorCategory = 'unknown';
  let shouldShowToast = true;

  const status = error.response?.status;
  const detail = error.response?.data?.detail;

  // Categorize error and determine message
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
    errorCategory = 'validation';
  } else if (status === 423) {
    message = 'Account temporarily locked due to multiple failed login attempts';
    errorCategory = 'authentication';
  } else if (status === 401) {
    message = 'Authentication required';
    errorCategory = 'authentication';
    shouldShowToast = false; // Don't show toast for auth errors, handled by interceptor
  } else if (status === 403) {
    message = 'Access denied';
    errorCategory = 'authorization';
  } else if (status === 404) {
    message = 'Resource not found';
    errorCategory = 'not_found';
  } else if (status === 409) {
    message = 'A conflict occurred. The resource may have been modified by another user.';
    errorCategory = 'conflict';
  } else if (status === 429) {
    message = 'Too many requests. Please wait and try again.';
    errorCategory = 'rate_limit';
  } else if (status && status >= 500) {
    message = 'Server error occurred. Please try again later.';
    errorCategory = 'server_error';
  } else if (error.code === 'NETWORK_ERROR' || !status) {
    message = 'Network connection problem. Please check your internet connection.';
    errorCategory = 'network';
  } else if (error.code === 'TIMEOUT') {
    message = 'Request timed out. Please try again.';
    errorCategory = 'timeout';
  }

  // Log the error with enhanced context
  logger.error('API Error handled', new Error(message), {
    category: 'api_error_handled',
    errorCategory,
    status,
    originalMessage: error.message,
    responseData: error.response?.data,
    shouldShowToast,
  });

  // Report to external logging service
  externalLogging.captureException(new Error(message), {
    category: 'api_error',
    errorCategory,
    status,
    handled: true,
  });

  // Show toast notification if appropriate
  if (shouldShowToast) {
    toast.error(message, {
      duration: errorCategory === 'network' || errorCategory === 'timeout' ? 8000 : 5000,
      style: {
        maxWidth: '500px',
      },
    });
  }

  return {
    message,
    category: errorCategory,
    status,
    shouldRetry: ['network', 'timeout', 'server_error', 'rate_limit'].includes(errorCategory),
  };
};