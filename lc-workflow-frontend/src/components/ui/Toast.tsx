'use client';

import React from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon, 
  InformationCircleIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  onDismiss?: () => void;
  progress?: number;
  showProgress?: boolean;
}

const toastIcons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
  loading: ArrowPathIcon,
};

const toastStyles = {
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
  loading: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200',
};

const iconStyles = {
  success: 'text-green-500 dark:text-green-400',
  error: 'text-red-500 dark:text-red-400',
  warning: 'text-yellow-500 dark:text-yellow-400',
  info: 'text-blue-500 dark:text-blue-400',
  loading: 'text-gray-500 dark:text-gray-400',
};

export function Toast({ 
  id, 
  type, 
  title, 
  message, 
  actions, 
  onDismiss, 
  progress,
  showProgress = false 
}: ToastProps) {
  const Icon = toastIcons[type];

  return (
    <div
      className={`
        relative max-w-sm w-full rounded-lg border shadow-lg p-4 pointer-events-auto
        transform transition-all duration-300 ease-in-out
        ${toastStyles[type]}
      `}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      {/* Progress bar */}
      {showProgress && typeof progress === 'number' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}

      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon 
            className={`h-5 w-5 ${iconStyles[type]} ${type === 'loading' ? 'animate-spin' : ''}`} 
            aria-hidden="true" 
          />
        </div>
        
        <div className="ml-3 flex-1">
          <p className="text-sm font-semibold">
            {title}
          </p>
          {message && (
            <p className="mt-1 text-sm opacity-90">
              {message}
            </p>
          )}
          
          {/* Progress text */}
          {showProgress && typeof progress === 'number' && (
            <p className="mt-1 text-xs opacity-75">
              {Math.round(progress)}% complete
            </p>
          )}
          
          {/* Action buttons */}
          {actions && actions.length > 0 && (
            <div className="mt-3 flex gap-2">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200
                    ${action.variant === 'primary' 
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                      : 'text-current hover:bg-black/5 dark:hover:bg-white/5'
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Dismiss button */}
        {onDismiss && (
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={onDismiss}
              className="inline-flex text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
              aria-label="Dismiss notification"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}