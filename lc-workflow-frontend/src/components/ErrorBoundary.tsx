'use client';

import React from 'react';
import { Button } from '@/components/ui';
import { logger } from '@/lib/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void; errorId?: string }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo, errorId?: string) => void;
  maxRetries?: number;
  enableErrorReporting?: boolean;
  context?: string;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      retryCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Enhanced error logging with context
    logger.error('React Error Boundary caught an error', error, {
      errorId,
      context: this.props.context || 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      retryCount: this.state.retryCount,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    });

    this.setState({
      error,
      errorInfo,
      errorId,
      retryCount: this.state.retryCount + 1,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }

    // Report to external error tracking if enabled
    if (this.props.enableErrorReporting !== false) {
      this.reportToExternalService(error, errorInfo, errorId);
    }
  }

  private reportToExternalService(error: Error, errorInfo: React.ErrorInfo, errorId: string) {
    // This will be enhanced when we add external logging service integration
    try {
      // Example integration points for services like Sentry
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
          tags: {
            errorId,
            context: this.props.context,
            errorBoundary: 'true',
          },
        });
      }
    } catch (reportingError) {
      logger.error('Failed to report error to external service', reportingError as Error);
    }
  }

  resetError = () => {
    const maxRetries = this.props.maxRetries || 3;

    if (this.state.retryCount < maxRetries) {
      logger.info('Error boundary retry attempt', {
        errorId: this.state.errorId,
        retryCount: this.state.retryCount,
        maxRetries,
        context: this.props.context,
      });

      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorId: undefined,
        retryCount: 0,
      });
    } else {
      logger.warn('Error boundary max retries exceeded', {
        errorId: this.state.errorId,
        retryCount: this.state.retryCount,
        maxRetries,
        context: this.props.context,
      });

      // Show a different message for max retries exceeded
      this.setState({
        hasError: true,
        retryCount: this.state.retryCount + 1,
      });
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback component
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} errorId={this.state.errorId} />;
      }

      const maxRetries = this.props.maxRetries || 3;
      const isMaxRetriesExceeded = this.state.retryCount > maxRetries;
      const canRetry = this.state.retryCount < maxRetries;

      // Default error UI with enhanced user experience
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-red-500"
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

              <h1 className="text-2xl font-bold text-foreground mb-2">
                {isMaxRetriesExceeded ? 'Unable to Load' : 'Something went wrong'}
              </h1>

              <p className="text-secondary mb-4">
                {isMaxRetriesExceeded
                  ? 'We\'ve tried several times but couldn\'t load this section. Please refresh the page or try again later.'
                  : 'We\'re sorry, but something unexpected happened. Don\'t worry, this is usually temporary.'
                }
              </p>

              {this.state.retryCount > 0 && (
                <p className="text-sm text-secondary mb-4">
                  Retry attempt: {this.state.retryCount} of {maxRetries}
                </p>
              )}

              {this.state.errorId && (
                <p className="text-xs text-secondary mb-4 font-mono">
                  Error ID: {this.state.errorId}
                </p>
              )}

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-error mb-2">
                    Error Details (Development Only)
                  </summary>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <div className="space-y-3">
                {canRetry && (
                  <Button
                    onClick={this.resetError}
                    variant="primary"
                    className="w-full"
                  >
                    Try Again
                  </Button>
                )}

                <Button
                  onClick={() => window.location.reload()}
                  variant="secondary"
                  className="w-full"
                >
                  {isMaxRetriesExceeded ? 'Refresh Page' : 'Reload Page'}
                </Button>

                {!isMaxRetriesExceeded && (
                  <Button
                    onClick={() => window.location.href = '/'}
                    variant="outline"
                    className="w-full"
                  >
                    Go to Homepage
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components with enhanced error handling
export const useErrorHandler = (context?: string) => {
  return React.useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.error('Error caught by useErrorHandler', error, {
      errorId,
      context: context || 'useErrorHandler',
      componentStack: errorInfo?.componentStack,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    });

    // Report to external error tracking services
    try {
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo?.componentStack,
            },
          },
          tags: {
            errorId,
            context: context || 'useErrorHandler',
            hook: 'true',
          },
        });
      }
    } catch (reportingError) {
      logger.error('Failed to report error from useErrorHandler to external service', reportingError as Error);
    }
  }, [context]);
};

export default ErrorBoundary;