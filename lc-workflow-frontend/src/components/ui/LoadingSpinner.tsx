/**
 * Enhanced Loading Spinner Component
 * Provides various loading states with accessibility support.
 */

import React from 'react';
import { Loader2, RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'bounce';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  text?: string;
  showIcon?: boolean;
  className?: string;
  'aria-label'?: string;
  children?: React.ReactNode;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'spinner',
  color = 'primary',
  text,
  showIcon = true,
  className = '',
  'aria-label': ariaLabel = 'Loading...',
  children
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'md':
        return 'w-6 h-6';
      case 'lg':
        return 'w-8 h-8';
      case 'xl':
        return 'w-12 h-12';
      default:
        return 'w-6 h-6';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'primary':
        return 'text-blue-600';
      case 'secondary':
        return 'text-gray-600';
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'spinner':
        return 'animate-spin';
      case 'dots':
        return 'animate-pulse';
      case 'pulse':
        return 'animate-pulse';
      case 'bounce':
        return 'animate-bounce';
      default:
        return 'animate-spin';
    }
  };

  const renderSpinner = () => {
    const baseClasses = `${getSizeClasses()} ${getColorClasses()} ${getVariantClasses()}`;
    
    switch (variant) {
      case 'dots':
        return (
          <div className="flex space-x-1">
            <div className={`w-2 h-2 bg-current rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
            <div className={`w-2 h-2 bg-current rounded-full animate-bounce`} style={{ animationDelay: '150ms' }} />
            <div className={`w-2 h-2 bg-current rounded-full animate-bounce`} style={{ animationDelay: '300ms' }} />
          </div>
        );
      case 'pulse':
        return (
          <div className={`${getSizeClasses()} bg-current rounded-full animate-pulse`} />
        );
      case 'bounce':
        return (
          <div className={`${getSizeClasses()} bg-current rounded-full animate-bounce`} />
        );
      default:
        return (
          <Loader2 className={`${baseClasses}`} />
        );
    }
  };

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-label={ariaLabel}
    >
      {children || (showIcon && renderSpinner())}
      {text && (
        <span className={`ml-2 text-sm ${getColorClasses()}`}>
          {text}
        </span>
      )}
    </div>
  );
};

// Loading states for different operations
export const LoadingStates = {
  // Generic loading
  Loading: (props?: Partial<LoadingSpinnerProps>) => (
    <LoadingSpinner {...props} text="Loading..." />
  ),

  // Saving
  Saving: (props?: Partial<LoadingSpinnerProps>) => (
    <LoadingSpinner {...props} text="Saving..." showIcon={false}>
      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
    </LoadingSpinner>
  ),

  // Processing
  Processing: (props?: Partial<LoadingSpinnerProps>) => (
    <LoadingSpinner {...props} text="Processing..." showIcon={false}>
      <Clock className="w-4 h-4 animate-pulse text-yellow-600" />
    </LoadingSpinner>
  ),

  // Success
  Success: (props?: Partial<LoadingSpinnerProps>) => (
    <LoadingSpinner {...props} text="Success!" showIcon={false} color="success">
      <CheckCircle className="w-4 h-4 text-green-600" />
    </LoadingSpinner>
  ),

  // Error
  Error: (props?: Partial<LoadingSpinnerProps>) => (
    <LoadingSpinner {...props} text="Error occurred" showIcon={false} color="error">
      <AlertCircle className="w-4 h-4 text-red-600" />
    </LoadingSpinner>
  ),

  // Uploading
  Uploading: (props?: Partial<LoadingSpinnerProps>) => (
    <LoadingSpinner {...props} text="Uploading..." variant="pulse" />
  ),

  // Downloading
  Downloading: (props?: Partial<LoadingSpinnerProps>) => (
    <LoadingSpinner {...props} text="Downloading..." variant="dots" />
  ),

  // Syncing
  Syncing: (props?: Partial<LoadingSpinnerProps>) => (
    <LoadingSpinner {...props} text="Syncing..." variant="bounce" />
  )
};

// Loading overlay component
interface LoadingOverlayProps {
  isVisible: boolean;
  text?: string;
  variant?: LoadingSpinnerProps['variant'];
  color?: LoadingSpinnerProps['color'];
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  text = 'Loading...',
  variant = 'spinner',
  color = 'primary',
  className = ''
}) => {
  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <LoadingSpinner
          size="lg"
          variant={variant}
          color={color}
          text={text}
        />
      </div>
    </div>
  );
};

// Inline loading component
export const InlineLoading: React.FC<{
  isLoading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}> = ({
  isLoading,
  children,
  fallback = <LoadingSpinner size="sm" />,
  className = ''
}) => {
  return (
    <div className={className}>
      {isLoading ? fallback : children}
    </div>
  );
};

export default LoadingSpinner;