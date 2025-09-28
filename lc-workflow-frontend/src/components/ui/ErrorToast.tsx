/**
 * Enhanced Error Toast Component
 * Provides user-friendly error messages with contextual help and actions.
 */

import React from 'react';
import { toast, Toast } from 'react-hot-toast';
import { AlertCircle, X, RefreshCw, HelpCircle, ExternalLink } from 'lucide-react';
import { Button } from './Button';

interface ErrorToastProps {
  t: Toast;
  message: string;
  error?: any;
  context?: string;
  suggestions?: string[];
  helpUrl?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorToast({
  t,
  message,
  error,
  context,
  suggestions = [],
  helpUrl,
  onRetry,
  onDismiss
}: ErrorToastProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
    toast.dismiss(t.id);
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
    toast.dismiss(t.id);
  };

  const handleHelpClick = () => {
    if (helpUrl) {
      window.open(helpUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
    >
      <div className="flex-1 w-0 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">
              {message}
            </p>
            
            {context && (
              <p className="mt-1 text-sm text-gray-500">
                {context}
              </p>
            )}
            
            {suggestions.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Try these solutions:
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {error && process.env.NODE_ENV === 'development' && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                  Technical Details
                </summary>
                <pre className="mt-1 text-xs text-gray-400 bg-gray-50 p-2 rounded overflow-auto">
                  {JSON.stringify(error, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex border-l border-gray-200">
        {onRetry && (
          <button
            onClick={handleRetry}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Retry action"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
        
        {helpUrl && (
          <button
            onClick={handleHelpClick}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Get help"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        )}
        
        <button
          onClick={handleDismiss}
          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Enhanced error toast function
export function showErrorToast(
  message: string,
  options: {
    error?: any;
    context?: string;
    suggestions?: string[];
    helpUrl?: string;
    onRetry?: () => void;
    onDismiss?: () => void;
    duration?: number;
  } = {}
) {
  const {
    error,
    context,
    suggestions = [],
    helpUrl,
    onRetry,
    onDismiss,
    duration = 8000
  } = options;

  return toast.custom(
    (t) => (
      <ErrorToast
        t={t}
        message={message}
        error={error}
        context={context}
        suggestions={suggestions}
        helpUrl={helpUrl}
        onRetry={onRetry}
        onDismiss={onDismiss}
      />
    ),
    {
      duration,
      position: 'top-right',
    }
  );
}

// Predefined error toasts for common scenarios
export const ErrorToasts = {
  networkError: (onRetry?: () => void) =>
    showErrorToast(
      'Network connection failed',
      {
        context: 'Unable to connect to the server. Please check your internet connection.',
        suggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Contact support if the problem persists'
        ],
        onRetry,
        helpUrl: '/help/network-issues'
      }
    ),

  serverError: (onRetry?: () => void) =>
    showErrorToast(
      'Server error occurred',
      {
        context: 'The server encountered an unexpected error while processing your request.',
        suggestions: [
          'Try again in a few moments',
          'Refresh the page',
          'Contact support if the error continues'
        ],
        onRetry,
        helpUrl: '/help/server-errors'
      }
    ),

  validationError: (field?: string) =>
    showErrorToast(
      'Validation error',
      {
        context: field ? `Please check the ${field} field and try again.` : 'Please check your input and try again.',
        suggestions: [
          'Review the highlighted fields',
          'Ensure all required fields are filled',
          'Check that your input meets the requirements'
        ],
        helpUrl: '/help/validation-errors'
      }
    ),

  permissionError: () =>
    showErrorToast(
      'Access denied',
      {
        context: 'You do not have permission to perform this action.',
        suggestions: [
          'Contact your administrator for access',
          'Check if you are logged in with the correct account',
          'Verify your role has the necessary permissions'
        ],
        helpUrl: '/help/permissions'
      }
    ),

  timeoutError: (onRetry?: () => void) =>
    showErrorToast(
      'Request timed out',
      {
        context: 'The request took too long to complete.',
        suggestions: [
          'Try again with a smaller dataset',
          'Check your internet connection',
          'Contact support if the problem persists'
        ],
        onRetry,
        helpUrl: '/help/timeout-errors'
      }
    )
};
