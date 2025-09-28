'use client';

import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';

interface ErrorBoundaryProviderProps {
  children: React.ReactNode;
}

const ErrorBoundaryProvider: React.FC<ErrorBoundaryProviderProps> = ({ children }) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Application Error:', error);
      console.error('Error Info:', errorInfo);
    }

    // In production, you would send this to your error reporting service
    // Example: Sentry, LogRocket, Bugsnag, etc.
    // Sentry.captureException(error, { contexts: { react: errorInfo } });
  };

  return (
    <ErrorBoundary onError={handleError}>
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundaryProvider;