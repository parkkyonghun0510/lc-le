'use client';

import React from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ArrowPathIcon,
  PauseCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export type ProgressStatus = 'pending' | 'uploading' | 'completed' | 'error' | 'paused' | 'cancelled';

export interface ProgressIndicatorProps {
  progress: number;
  status: ProgressStatus;
  filename?: string;
  fileSize?: number;
  uploadSpeed?: number;
  timeRemaining?: number;
  error?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  className?: string;
  compact?: boolean;
}

const statusIcons = {
  pending: ArrowPathIcon,
  uploading: ArrowPathIcon,
  completed: CheckCircleIcon,
  error: XCircleIcon,
  paused: PauseCircleIcon,
  cancelled: XCircleIcon,
};

const statusColors = {
  pending: 'text-gray-500',
  uploading: 'text-blue-500',
  completed: 'text-green-500',
  error: 'text-red-500',
  paused: 'text-yellow-500',
  cancelled: 'text-gray-500',
};

const progressColors = {
  pending: 'bg-gray-200',
  uploading: 'bg-blue-500',
  completed: 'bg-green-500',
  error: 'bg-red-500',
  paused: 'bg-yellow-500',
  cancelled: 'bg-gray-500',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function ProgressIndicator({
  progress,
  status,
  filename,
  fileSize,
  uploadSpeed,
  timeRemaining,
  error,
  onCancel,
  onRetry,
  onPause,
  onResume,
  className = '',
  compact = false
}: ProgressIndicatorProps) {
  const Icon = statusIcons[status];
  const clampedProgress = Math.max(0, Math.min(100, progress));

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="relative">
          <Icon 
            className={`h-5 w-5 ${statusColors[status]} ${
              status === 'uploading' ? 'animate-spin' : ''
            }`} 
          />
          {status === 'uploading' && (
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-current animate-spin opacity-30" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate font-medium text-gray-900 dark:text-gray-100">
              {filename || 'File'}
            </span>
            <span className="text-gray-500 dark:text-gray-400 ml-2">
              {Math.round(clampedProgress)}%
            </span>
          </div>
          
          <div className="mt-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${progressColors[status]}`}
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Icon 
              className={`h-6 w-6 ${statusColors[status]} ${
                status === 'uploading' ? 'animate-spin' : ''
              }`} 
            />
            {status === 'uploading' && (
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-current animate-spin opacity-30" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {filename || 'File Upload'}
            </h4>
            {fileSize && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatBytes(fileSize)}
              </p>
            )}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {status === 'uploading' && onPause && (
            <button
              onClick={onPause}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Pause upload"
            >
              <PauseCircleIcon className="h-5 w-5" />
            </button>
          )}
          
          {status === 'paused' && onResume && (
            <button
              onClick={onResume}
              className="p-1 text-blue-500 hover:text-blue-600 transition-colors"
              title="Resume upload"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          )}
          
          {status === 'error' && onRetry && (
            <button
              onClick={onRetry}
              className="p-1 text-blue-500 hover:text-blue-600 transition-colors"
              title="Retry upload"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          )}
          
          {(status === 'uploading' || status === 'paused') && onCancel && (
            <button
              onClick={onCancel}
              className="p-1 text-red-500 hover:text-red-600 transition-colors"
              title="Cancel upload"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-gray-400">
            {status === 'completed' ? 'Completed' : 
             status === 'error' ? 'Failed' :
             status === 'paused' ? 'Paused' :
             status === 'cancelled' ? 'Cancelled' :
             'Uploading...'}
          </span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {Math.round(clampedProgress)}%
          </span>
        </div>
        
        <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${progressColors[status]}`}
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      </div>
      
      {/* Status information */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-4">
          {uploadSpeed && status === 'uploading' && (
            <span>{formatBytes(uploadSpeed)}/s</span>
          )}
          
          {timeRemaining && status === 'uploading' && timeRemaining > 0 && (
            <span>{formatTime(timeRemaining)} remaining</span>
          )}
          
          {status === 'completed' && (
            <span className="text-green-600 dark:text-green-400 font-medium">
              Upload completed successfully
            </span>
          )}
        </div>
        
        {status === 'error' && error && (
          <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <span className="font-medium">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}