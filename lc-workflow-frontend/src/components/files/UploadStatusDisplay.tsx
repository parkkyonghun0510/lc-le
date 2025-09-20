'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChevronUpIcon, 
  ChevronDownIcon,
  XMarkIcon,
  ArrowPathIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  StopCircleIcon
} from '@heroicons/react/24/outline';
import { ProgressIndicator } from '@/components/ui/ProgressIndicator';
import { uploadStatusTracker, UploadStatus, UploadEvent } from '@/lib/uploadStatusTracker';
import { formatBytes } from '@/lib/utils';

interface UploadStatusDisplayProps {
  className?: string;
  maxVisible?: number;
  showCompleted?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export function UploadStatusDisplay({
  className = '',
  maxVisible = 5,
  showCompleted = true,
  autoHide = true,
  autoHideDelay = 5000
}: UploadStatusDisplayProps) {
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateUploads = () => {
      const allUploads = uploadStatusTracker.getAllUploads();
      const filteredUploads = showCompleted 
        ? allUploads 
        : allUploads.filter(u => u.status !== 'completed');
      
      setUploads(filteredUploads);
      setIsVisible(filteredUploads.length > 0);
    };

    const handleUploadEvent = (event: UploadEvent) => {
      updateUploads();
      
      // Auto-hide completed uploads after delay
      if (autoHide && event.type === 'upload_completed') {
        setTimeout(() => {
          const upload = uploadStatusTracker.getUpload(event.uploadId);
          if (upload?.status === 'completed') {
            uploadStatusTracker.removeUpload(event.uploadId);
            updateUploads();
          }
        }, autoHideDelay);
      }
    };

    // Initial load
    updateUploads();

    // Listen for upload events
    const removeListener = uploadStatusTracker.addEventListener(handleUploadEvent);

    return removeListener;
  }, [showCompleted, autoHide, autoHideDelay]);

  const activeUploads = uploads.filter(u => 
    u.status === 'uploading' || u.status === 'pending' || u.status === 'paused'
  );
  const completedUploads = uploads.filter(u => u.status === 'completed');
  const failedUploads = uploads.filter(u => u.status === 'error');

  const visibleUploads = isExpanded ? uploads : uploads.slice(0, maxVisible);
  const hiddenCount = uploads.length - visibleUploads.length;

  const handleRetry = (uploadId: string) => {
    uploadStatusTracker.retryUpload(uploadId);
  };

  const handlePause = (uploadId: string) => {
    uploadStatusTracker.pauseUpload(uploadId);
  };

  const handleResume = (uploadId: string) => {
    uploadStatusTracker.resumeUpload(uploadId);
  };

  const handleCancel = (uploadId: string) => {
    uploadStatusTracker.cancelUpload(uploadId);
  };

  const handleRemove = (uploadId: string) => {
    uploadStatusTracker.removeUpload(uploadId);
  };

  const handleClearAll = () => {
    uploadStatusTracker.clear();
  };

  if (!isVisible || uploads.length === 0) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-md w-full ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              File Uploads
            </h3>
            
            {/* Status indicators */}
            <div className="flex items-center gap-2 text-xs">
              {activeUploads.length > 0 && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full">
                  {activeUploads.length} active
                </span>
              )}
              {completedUploads.length > 0 && (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full">
                  {completedUploads.length} done
                </span>
              )}
              {failedUploads.length > 0 && (
                <span className="px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-full">
                  {failedUploads.length} failed
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {uploads.length > maxVisible && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronUpIcon className="h-4 w-4" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4" />
                )}
              </button>
            )}
            
            <button
              onClick={handleClearAll}
              className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Clear all"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Overall progress */}
        {activeUploads.length > 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-700 dark:text-gray-300">Overall Progress</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {Math.round(uploadStatusTracker.getTotalProgress())}%
              </span>
            </div>
            
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadStatusTracker.getTotalProgress()}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>
                {formatBytes(uploadStatusTracker.getOverallUploadSpeed())}/s
              </span>
              <span>
                {Math.round(uploadStatusTracker.getEstimatedTimeRemaining())}s remaining
              </span>
            </div>
          </div>
        )}

        {/* Upload list */}
        <div className="max-h-96 overflow-y-auto">
          {visibleUploads.map((upload) => (
            <div
              key={upload.id}
              className="p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
            >
              <ProgressIndicator
                progress={upload.progress}
                status={upload.status}
                filename={upload.filename}
                fileSize={upload.fileSize}
                uploadSpeed={upload.uploadSpeed}
                timeRemaining={upload.timeRemaining}
                error={upload.error}
                onCancel={upload.status === 'uploading' || upload.status === 'paused' 
                  ? () => handleCancel(upload.id) 
                  : undefined}
                onRetry={upload.status === 'error' && upload.retryCount < upload.maxRetries
                  ? () => handleRetry(upload.id)
                  : undefined}
                onPause={upload.status === 'uploading' 
                  ? () => handlePause(upload.id)
                  : undefined}
                onResume={upload.status === 'paused'
                  ? () => handleResume(upload.id)
                  : undefined}
                compact={true}
              />
              
              {/* Additional actions for completed/failed uploads */}
              {(upload.status === 'completed' || upload.status === 'error') && (
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => handleRemove(upload.id)}
                    className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
          
          {hiddenCount > 0 && !isExpanded && (
            <div className="p-3 text-center">
              <button
                onClick={() => setIsExpanded(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Show {hiddenCount} more uploads
              </button>
            </div>
          )}
        </div>

        {/* Footer with batch actions */}
        {(activeUploads.length > 1 || failedUploads.length > 0) && (
          <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {activeUploads.length > 1 && (
                  <>
                    <button
                      onClick={() => activeUploads.forEach(u => handlePause(u.id))}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                      <PauseCircleIcon className="h-4 w-4" />
                      Pause All
                    </button>
                    
                    <button
                      onClick={() => activeUploads.forEach(u => handleCancel(u.id))}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                    >
                      <StopCircleIcon className="h-4 w-4" />
                      Cancel All
                    </button>
                  </>
                )}
              </div>
              
              {failedUploads.length > 0 && (
                <button
                  onClick={() => failedUploads.forEach(u => handleRetry(u.id))}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  Retry Failed ({failedUploads.length})
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}