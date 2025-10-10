import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { LoadingSpinner } from './LoadingStates';
import { logger } from '@/lib/logger';

// Error message component with retry functionality
interface ErrorMessageProps {
  title?: string;
  message?: string;
  error?: Error;
  onRetry?: () => void | Promise<void>;
  retryLabel?: string;
  showDetails?: boolean;
  className?: string;
  variant?: 'inline' | 'card' | 'page' | 'toast';
  children?: React.ReactNode;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  error,
  onRetry,
  retryLabel = 'Try Again',
  showDetails = false,
  className = '',
  variant = 'inline',
  children,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;

    setIsRetrying(true);
    try {
      await onRetry();
      logger.info('Error retry successful', {
        category: 'error_retry_success',
        errorMessage: error?.message,
      });
    } catch (retryError) {
      logger.error('Error retry failed', retryError as Error, {
        category: 'error_retry_failed',
        originalError: error?.message,
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const errorVariants = {
    inline: 'p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md',
    card: 'p-6 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg shadow-sm',
    page: 'min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900',
    toast: 'p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md',
  };

  const ErrorContent = ({ children }: { children?: React.ReactNode }) => (
    <div className={errorVariants[variant]}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            {title}
          </h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            {message}
          </p>

          {showDetails && error && (
            <details className="mt-2">
              <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer hover:text-red-800 dark:hover:text-red-200">
                Error Details
              </summary>
              <pre className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/50 p-2 rounded overflow-auto max-w-full">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}

          {onRetry && (
            <div className="mt-4">
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                variant="outline"
                size="sm"
                className="bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40"
              >
                {isRetrying && <LoadingSpinner size="sm" className="mr-2" />}
                {retryLabel}
              </Button>
            </div>
          )}

          {/* Render children if provided */}
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </div>
  );

  if (variant === 'page') {
    return (
      <div className={className}>
        <div className="max-w-md mx-auto">
          <ErrorContent>{children}</ErrorContent>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ErrorContent>{children}</ErrorContent>
    </div>
  );
};

// Network error component
export const NetworkError: React.FC<{
  onRetry?: () => void | Promise<void>;
  className?: string;
}> = ({ onRetry, className }) => (
  <ErrorMessage
    title="Connection Problem"
    message="Unable to connect to our servers. Please check your internet connection and try again."
    onRetry={onRetry}
    retryLabel="Retry Connection"
    variant="card"
    className={className}
  />
);

// Authentication error component
export const AuthError: React.FC<{
  onLogin?: () => void;
  className?: string;
}> = ({ onLogin, className }) => (
  <ErrorMessage
    title="Authentication Required"
    message="Your session has expired or you need to log in to access this feature."
    onRetry={onLogin}
    retryLabel="Log In"
    variant="card"
    className={className}
  />
);

// Permission error component
export const PermissionError: React.FC<{
  className?: string;
}> = ({ className }) => (
  <ErrorMessage
    title="Access Denied"
    message="You don't have permission to access this resource. Please contact your administrator if you believe this is an error."
    variant="card"
    className={className}
  />
);

// Not found error component
export const NotFoundError: React.FC<{
  onGoBack?: () => void;
  className?: string;
}> = ({ onGoBack, className }) => (
  <ErrorMessage
    title="Not Found"
    message="The resource you're looking for doesn't exist or has been moved."
    onRetry={onGoBack}
    retryLabel="Go Back"
    variant="page"
    className={className}
  />
);

// Server error component
export const ServerError: React.FC<{
  onRetry?: () => void | Promise<void>;
  className?: string;
}> = ({ onRetry, className }) => (
  <ErrorMessage
    title="Server Error"
    message="Our servers are experiencing issues. Our team has been notified and we're working to fix it."
    onRetry={onRetry}
    retryLabel="Try Again"
    variant="card"
    className={className}
  />
);

// Timeout error component
export const TimeoutError: React.FC<{
  onRetry?: () => void | Promise<void>;
  className?: string;
}> = ({ onRetry, className }) => (
  <ErrorMessage
    title="Request Timeout"
    message="The request took too long to complete. This might be due to a slow internet connection or server overload."
    onRetry={onRetry}
    retryLabel="Try Again"
    variant="card"
    className={className}
  />
);

// Validation error component
export const ValidationError: React.FC<{
  errors?: string[];
  className?: string;
}> = ({ errors = [], className }) => (
  <ErrorMessage
    title="Invalid Input"
    message="Please check the following errors and try again:"
    variant="card"
    className={className}
  >
    {errors.length > 0 && (
      <ul className="mt-2 text-sm text-red-700 dark:text-red-300 list-disc list-inside">
        {errors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    )}
  </ErrorMessage>
);

// Generic error boundary fallback
export const ErrorFallback: React.FC<{
  error: Error;
  resetError: () => void;
  className?: string;
}> = ({ error, resetError, className }) => (
  <ErrorMessage
    title="Application Error"
    message="Something unexpected happened in the application."
    error={error}
    onRetry={resetError}
    retryLabel="Reload Component"
    showDetails={process.env.NODE_ENV === 'development'}
    variant="card"
    className={className}
  />
);

// Toast error component
export const ToastError: React.FC<{
  message: string;
  onDismiss?: () => void;
  className?: string;
}> = ({ message, onDismiss, className }) => (
  <div className={`flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md ${className}`}>
    <div className="flex items-center space-x-2">
      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <span className="text-sm text-red-800 dark:text-red-200">{message}</span>
    </div>
    {onDismiss && (
      <button
        onClick={onDismiss}
        className="text-red-400 hover:text-red-600 dark:text-red-300 dark:hover:text-red-100"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    )}
  </div>
);

// Error state with suggestions
export const ErrorWithSuggestions: React.FC<{
  title?: string;
  message?: string;
  suggestions?: string[];
  onRetry?: () => void | Promise<void>;
  className?: string;
}> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred.',
  suggestions = [],
  onRetry,
  className
}) => (
  <ErrorMessage
    title={title}
    message={message}
    onRetry={onRetry}
    variant="card"
    className={className}
  >
    {suggestions.length > 0 && (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
          Try these solutions:
        </h4>
        <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
          {suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start space-x-2">
              <span className="text-red-400 mt-1">•</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </ErrorMessage>
);

// Mobile-optimized error states
export const MobileErrorStates = {
  Network: ({ onRetry }: { onRetry?: () => void | Promise<void> }) => (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mx-4">
      <div className="flex items-center space-x-3">
        <svg className="w-8 h-8 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            No Internet Connection
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300">
            Please check your connection and try again.
          </p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} size="sm" variant="outline">
            Retry
          </Button>
        )}
      </div>
    </div>
  ),

  Server: ({ onRetry }: { onRetry?: () => void | Promise<void> }) => (
    <div className="text-center p-6">
      <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Server Unavailable
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        We're having trouble connecting to our servers.
      </p>
      {onRetry && (
        <Button onClick={onRetry} className="w-full">
          Try Again
        </Button>
      )}
    </div>
  ),

  NotFound: () => (
    <div className="text-center p-6">
      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Page Not Found
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        The page you're looking for doesn't exist.
      </p>
    </div>
  ),
};

const ErrorStates = {
  ErrorMessage,
  NetworkError,
  AuthError,
  PermissionError,
  NotFoundError,
  ServerError,
  TimeoutError,
  ValidationError,
  ErrorFallback,
  ToastError,
  ErrorWithSuggestions,
  MobileErrorStates,
};

export default ErrorStates;