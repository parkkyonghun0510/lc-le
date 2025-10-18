"use client";

/**
 * Permission Error Boundary
 * 
 * Graceful error handling for permission management components.
 * Provides fallback UI and retry mechanisms for failed operations.
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class PermissionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const context = this.props.context || 'Permission Component';
    console.error(`Permission Error Boundary (${context}) caught an error:`, error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle>Something went wrong</CardTitle>
            </div>
            <CardDescription>
              An error occurred while loading {this.props.context || 'the permission management interface'}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {this.state.error && (
              <div className="rounded-md bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive">
                  {this.state.error.message}
                </p>
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground">
                      Error details
                    </summary>
                    <pre className="mt-2 text-xs overflow-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="primary">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline">
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for error boundary with hooks support
 */
interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function PermissionErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <Card className="border-destructive">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle>Error Loading Permissions</CardTitle>
        </div>
        <CardDescription>
          We encountered an error while loading the permission data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">
            {error.message || 'An unexpected error occurred'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={resetError} variant="primary">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Lightweight error display for inline errors
 */
interface InlineErrorProps {
  error: Error | string;
  onRetry?: () => void;
  className?: string;
}

export function InlineError({ error, onRetry, className = '' }: InlineErrorProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div className={`flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
      <p className="text-sm text-destructive flex-1">{errorMessage}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="ghost" size="sm">
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
