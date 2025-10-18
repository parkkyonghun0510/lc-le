/**
 * Permission System - Custom Error Classes
 * 
 * Custom error classes for handling permission-related API errors with
 * enhanced error information and user-friendly messages.
 */

import { AxiosError } from 'axios';

/**
 * Base class for permission-related errors
 */
export class PermissionError extends Error {
  public readonly requiredPermission?: string;
  public readonly requiredRoles?: string[];
  public readonly statusCode?: number;
  public readonly errorCode?: string;
  public readonly details?: any;

  constructor(
    message: string,
    requiredPermission?: string,
    requiredRoles?: string[],
    statusCode?: number,
    errorCode?: string,
    details?: any
  ) {
    super(message);
    this.name = 'PermissionError';
    this.requiredPermission = requiredPermission;
    this.requiredRoles = requiredRoles;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PermissionError);
    }
  }

  /**
   * Get user-friendly error message with actionable guidance
   */
  getUserFriendlyMessage(): string {
    let message = this.message;

    if (this.requiredPermission) {
      message += `\n\nRequired permission: ${this.requiredPermission}`;
    }

    if (this.requiredRoles && this.requiredRoles.length > 0) {
      message += `\n\nRequired roles: ${this.requiredRoles.join(', ')}`;
    }

    message += '\n\nPlease contact your system administrator to request access.';

    return message;
  }

  /**
   * Get structured error information for logging
   */
  getErrorInfo(): {
    name: string;
    message: string;
    requiredPermission?: string;
    requiredRoles?: string[];
    statusCode?: number;
    errorCode?: string;
    details?: any;
  } {
    return {
      name: this.name,
      message: this.message,
      requiredPermission: this.requiredPermission,
      requiredRoles: this.requiredRoles,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      details: this.details,
    };
  }
}

/**
 * General API error class for non-permission specific errors
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode?: string;
  public readonly details?: any;
  public readonly endpoint?: string;
  public readonly method?: string;

  constructor(
    message: string,
    statusCode: number,
    errorCode?: string,
    details?: any,
    endpoint?: string,
    method?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.endpoint = endpoint;
    this.method = method;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Get user-friendly error message based on status code
   */
  getUserFriendlyMessage(): string {
    switch (this.statusCode) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 404:
        return 'The requested resource was not found. It may have been deleted or moved.';
      case 409:
        return 'A conflict occurred. The resource may have been modified by another user. Please refresh and try again.';
      case 422:
        return 'Invalid data provided. Please check your input and try again.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error occurred. Our team has been notified. Please try again later.';
      case 502:
        return 'Service temporarily unavailable. Please try again in a few moments.';
      case 503:
        return 'Service is currently under maintenance. Please try again later.';
      default:
        return this.message || 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Get structured error information for logging
   */
  getErrorInfo(): {
    name: string;
    message: string;
    statusCode: number;
    errorCode?: string;
    details?: any;
    endpoint?: string;
    method?: string;
  } {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      details: this.details,
      endpoint: this.endpoint,
      method: this.method,
    };
  }
}

/**
 * Network-related error class
 */
export class NetworkError extends Error {
  public readonly originalError?: Error;
  public readonly endpoint?: string;
  public readonly method?: string;

  constructor(
    message: string,
    originalError?: Error,
    endpoint?: string,
    method?: string
  ) {
    super(message);
    this.name = 'NetworkError';
    this.originalError = originalError;
    this.endpoint = endpoint;
    this.method = method;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError);
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(): string {
    return 'Network connection problem. Please check your internet connection and try again.';
  }
}

/**
 * Validation error class for form validation issues
 */
export class ValidationError extends Error {
  public readonly fieldErrors: Record<string, string[]>;

  constructor(message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }

  /**
   * Get formatted field errors as a string
   */
  getFieldErrorsString(): string {
    const errors: string[] = [];
    
    Object.entries(this.fieldErrors).forEach(([field, fieldErrors]) => {
      errors.push(`${field}: ${fieldErrors.join(', ')}`);
    });

    return errors.join('\n');
  }

  /**
   * Get user-friendly error message with field details
   */
  getUserFriendlyMessage(): string {
    let message = this.message;
    
    const fieldErrorsString = this.getFieldErrorsString();
    if (fieldErrorsString) {
      message += `\n\nField errors:\n${fieldErrorsString}`;
    }

    return message;
  }
}

/**
 * Extract error details from backend API response
 */
export interface BackendErrorDetail {
  error?: string;
  message?: string;
  detail?: string | string[];
  required_permission?: string;
  required_roles?: string[];
  field_errors?: Record<string, string[]>;
  error_code?: string;
}

/**
 * Utility function to extract error details from Axios error response
 */
export function extractErrorDetails(error: AxiosError): BackendErrorDetail {
  const responseData = error.response?.data as any;
  
  if (!responseData) {
    return {};
  }

  // Handle different backend error response formats
  const details: BackendErrorDetail = {};

  // Extract main error message
  if (responseData.detail) {
    if (typeof responseData.detail === 'string') {
      details.message = responseData.detail;
    } else if (Array.isArray(responseData.detail)) {
      details.message = responseData.detail.join(', ');
    } else if (typeof responseData.detail === 'object') {
      // Handle structured detail object
      details.message = responseData.detail.message || 'An error occurred';
      details.required_permission = responseData.detail.required_permission;
      details.required_roles = responseData.detail.required_roles;
      details.error_code = responseData.detail.error_code || responseData.detail.error;
    }
  } else if (responseData.message) {
    details.message = responseData.message;
  } else if (responseData.error) {
    details.message = responseData.error;
  }

  // Extract permission requirements
  if (responseData.required_permission) {
    details.required_permission = responseData.required_permission;
  }

  if (responseData.required_roles) {
    details.required_roles = responseData.required_roles;
  }

  // Extract field errors for validation
  if (responseData.field_errors) {
    details.field_errors = responseData.field_errors;
  }

  // Extract error code
  if (responseData.error_code) {
    details.error_code = responseData.error_code;
  }

  return details;
}

/**
 * Create appropriate error instance from Axios error
 */
export function createErrorFromAxiosError(
  axiosError: AxiosError,
  endpoint?: string,
  method?: string
): PermissionError | ApiError | NetworkError | ValidationError {
  const status = axiosError.response?.status;
  const details = extractErrorDetails(axiosError);

  // Network errors (no response)
  if (!axiosError.response) {
    return new NetworkError(
      details.message || 'Network connection failed',
      axiosError,
      endpoint,
      method
    );
  }

  // Permission errors (403 Forbidden)
  if (status === 403) {
    return new PermissionError(
      details.message || 'You do not have permission to perform this action',
      details.required_permission,
      details.required_roles,
      status,
      details.error_code,
      details
    );
  }

  // Validation errors (422 Unprocessable Entity)
  if (status === 422 && details.field_errors) {
    return new ValidationError(
      details.message || 'Validation failed',
      details.field_errors
    );
  }

  // General API errors
  return new ApiError(
    details.message || axiosError.message || 'An API error occurred',
    status || 500,
    details.error_code,
    details,
    endpoint,
    method
  );
}

/**
 * Type guard to check if error is a PermissionError
 */
export function isPermissionError(error: any): error is PermissionError {
  return error instanceof PermissionError;
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Type guard to check if error is a NetworkError
 */
export function isNetworkError(error: any): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Type guard to check if error is a ValidationError
 */
export function isValidationError(error: any): error is ValidationError {
  return error instanceof ValidationError;
}