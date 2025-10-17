/**
 * Permission Management System - Error Handling Utilities
 * 
 * Specialized error handling for permission-related API operations.
 * Provides user-friendly error messages and error categorization.
 */

import { AxiosError } from 'axios';
import { PermissionApiError } from '@/types/permissions';

/**
 * Permission error categories
 */
export enum PermissionErrorCategory {
  VALIDATION = 'validation',
  DUPLICATE = 'duplicate',
  NOT_FOUND = 'not_found',
  FORBIDDEN = 'forbidden',
  SYSTEM_PERMISSION = 'system_permission',
  IN_USE = 'in_use',
  NETWORK = 'network',
  SERVER = 'server',
  UNKNOWN = 'unknown',
}

/**
 * Categorize permission API errors
 */
export const categorizePermissionError = (error: AxiosError<PermissionApiError>): PermissionErrorCategory => {
  if (!error.response) {
    return PermissionErrorCategory.NETWORK;
  }

  const status = error.response.status;
  const detail = error.response.data?.detail?.toLowerCase() || '';
  const errorCode = error.response.data?.error_code?.toLowerCase() || '';

  // Check for specific error codes first
  if (errorCode.includes('duplicate') || detail.includes('already exists')) {
    return PermissionErrorCategory.DUPLICATE;
  }

  if (errorCode.includes('system') || detail.includes('system permission') || detail.includes('system role')) {
    return PermissionErrorCategory.SYSTEM_PERMISSION;
  }

  if (errorCode.includes('in_use') || detail.includes('in use') || detail.includes('assigned to')) {
    return PermissionErrorCategory.IN_USE;
  }

  // Check by status code
  switch (status) {
    case 400:
    case 422:
      return PermissionErrorCategory.VALIDATION;
    case 403:
      return PermissionErrorCategory.FORBIDDEN;
    case 404:
      return PermissionErrorCategory.NOT_FOUND;
    case 409:
      return PermissionErrorCategory.DUPLICATE;
    case 500:
    case 502:
    case 503:
      return PermissionErrorCategory.SERVER;
    default:
      return PermissionErrorCategory.UNKNOWN;
  }
};

/**
 * Get user-friendly error message for permission errors
 */
export const getPermissionErrorMessage = (
  error: AxiosError<PermissionApiError>,
  context?: {
    operation?: 'create' | 'update' | 'delete' | 'assign' | 'revoke';
    entityType?: 'permission' | 'role' | 'user_permission';
  }
): string => {
  const category = categorizePermissionError(error);
  const detail = error.response?.data?.detail || '';
  const operation = context?.operation || 'perform this operation';
  const entityType = context?.entityType || 'item';

  switch (category) {
    case PermissionErrorCategory.VALIDATION:
      if (error.response?.data?.field_errors) {
        const fieldErrors = Object.entries(error.response.data.field_errors)
          .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
          .join('; ');
        return `Validation failed: ${fieldErrors}`;
      }
      return detail || `Invalid data provided. Please check your input and try again.`;

    case PermissionErrorCategory.DUPLICATE:
      return `A ${entityType} with this name already exists. Please use a different name.`;

    case PermissionErrorCategory.NOT_FOUND:
      return `The ${entityType} you're trying to ${operation} was not found. It may have been deleted.`;

    case PermissionErrorCategory.FORBIDDEN:
      return `You don't have permission to ${operation} this ${entityType}.`;

    case PermissionErrorCategory.SYSTEM_PERMISSION:
      return `Cannot modify system ${entityType}s. They are protected and managed by the system.`;

    case PermissionErrorCategory.IN_USE:
      return `Cannot delete this ${entityType} because it is currently in use. Remove all assignments first.`;

    case PermissionErrorCategory.NETWORK:
      return `Network error. Please check your connection and try again.`;

    case PermissionErrorCategory.SERVER:
      return `Server error occurred. Please try again later or contact support.`;

    case PermissionErrorCategory.UNKNOWN:
    default:
      return detail || `An unexpected error occurred while trying to ${operation} the ${entityType}.`;
  }
};

/**
 * Extract field errors from API response
 */
export const extractFieldErrors = (
  error: AxiosError<PermissionApiError>
): Record<string, string> | null => {
  const fieldErrors = error.response?.data?.field_errors;
  
  if (!fieldErrors) {
    return null;
  }

  // Transform array of errors to single string per field
  const transformedErrors: Record<string, string> = {};
  
  Object.entries(fieldErrors).forEach(([field, errors]) => {
    transformedErrors[field] = Array.isArray(errors) ? errors.join(', ') : String(errors);
  });

  return transformedErrors;
};

/**
 * Check if error is a validation error
 */
export const isValidationError = (error: AxiosError<PermissionApiError>): boolean => {
  return categorizePermissionError(error) === PermissionErrorCategory.VALIDATION;
};

/**
 * Check if error is a duplicate error
 */
export const isDuplicateError = (error: AxiosError<PermissionApiError>): boolean => {
  return categorizePermissionError(error) === PermissionErrorCategory.DUPLICATE;
};

/**
 * Check if error is a system permission error
 */
export const isSystemPermissionError = (error: AxiosError<PermissionApiError>): boolean => {
  return categorizePermissionError(error) === PermissionErrorCategory.SYSTEM_PERMISSION;
};

/**
 * Check if error is an "in use" error
 */
export const isInUseError = (error: AxiosError<PermissionApiError>): boolean => {
  return categorizePermissionError(error) === PermissionErrorCategory.IN_USE;
};

/**
 * Format error for display in toast notification
 */
export const formatErrorForToast = (
  error: AxiosError<PermissionApiError>,
  context?: {
    operation?: 'create' | 'update' | 'delete' | 'assign' | 'revoke';
    entityType?: 'permission' | 'role' | 'user_permission';
  }
): {
  title: string;
  description: string;
  variant: 'destructive' | 'default';
} => {
  const category = categorizePermissionError(error);
  const message = getPermissionErrorMessage(error, context);

  let title = 'Error';
  
  switch (category) {
    case PermissionErrorCategory.VALIDATION:
      title = 'Validation Error';
      break;
    case PermissionErrorCategory.DUPLICATE:
      title = 'Duplicate Entry';
      break;
    case PermissionErrorCategory.NOT_FOUND:
      title = 'Not Found';
      break;
    case PermissionErrorCategory.FORBIDDEN:
      title = 'Permission Denied';
      break;
    case PermissionErrorCategory.SYSTEM_PERMISSION:
      title = 'System Protected';
      break;
    case PermissionErrorCategory.IN_USE:
      title = 'Cannot Delete';
      break;
    case PermissionErrorCategory.NETWORK:
      title = 'Network Error';
      break;
    case PermissionErrorCategory.SERVER:
      title = 'Server Error';
      break;
  }

  return {
    title,
    description: message,
    variant: 'destructive',
  };
};

/**
 * Handle permission API error with toast notification
 * 
 * This is a convenience function that can be used in catch blocks
 * to automatically show appropriate error messages to users.
 * 
 * @example
 * try {
 *   await permissionsApi.create(data);
 * } catch (error) {
 *   handlePermissionError(error, toast, { operation: 'create', entityType: 'permission' });
 * }
 */
export const handlePermissionError = (
  error: unknown,
  toast: (options: { title: string; description: string; variant: 'destructive' | 'default' }) => void,
  context?: {
    operation?: 'create' | 'update' | 'delete' | 'assign' | 'revoke';
    entityType?: 'permission' | 'role' | 'user_permission';
  }
): void => {
  if (error instanceof Error && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<PermissionApiError>;
    const toastOptions = formatErrorForToast(axiosError, context);
    toast(toastOptions);
  } else {
    toast({
      title: 'Error',
      description: 'An unexpected error occurred. Please try again.',
      variant: 'destructive',
    });
  }
};

/**
 * Retry configuration for permission operations
 */
export const PERMISSION_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableErrors: [
    PermissionErrorCategory.NETWORK,
    PermissionErrorCategory.SERVER,
  ],
};

/**
 * Check if error should be retried
 */
export const shouldRetryPermissionError = (error: AxiosError<PermissionApiError>): boolean => {
  const category = categorizePermissionError(error);
  return PERMISSION_RETRY_CONFIG.retryableErrors.includes(category);
};

/**
 * Get suggested action for error
 */
export const getSuggestedAction = (error: AxiosError<PermissionApiError>): string | null => {
  const category = categorizePermissionError(error);

  switch (category) {
    case PermissionErrorCategory.VALIDATION:
      return 'Please check your input and correct any errors.';
    case PermissionErrorCategory.DUPLICATE:
      return 'Try using a different name or modify the existing entry.';
    case PermissionErrorCategory.NOT_FOUND:
      return 'Refresh the page to see the latest data.';
    case PermissionErrorCategory.FORBIDDEN:
      return 'Contact your administrator to request access.';
    case PermissionErrorCategory.SYSTEM_PERMISSION:
      return 'System items cannot be modified. Create a custom version instead.';
    case PermissionErrorCategory.IN_USE:
      return 'Remove all assignments before attempting to delete.';
    case PermissionErrorCategory.NETWORK:
      return 'Check your internet connection and try again.';
    case PermissionErrorCategory.SERVER:
      return 'Wait a moment and try again. If the problem persists, contact support.';
    default:
      return null;
  }
};
