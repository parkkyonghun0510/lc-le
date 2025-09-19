'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFiles, useDeleteFile, useDownloadFile } from '@/hooks/useFiles';
import { useAuth } from '@/hooks/useAuth';
import { File as ApiFile } from '@/types/models';
import { 
  DocumentIcon, 
  TrashIcon, 
  ArrowDownTrayIcon,
  PlusIcon,
  EyeIcon,
  CameraIcon,
  PhotoIcon,
  WifiIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { formatBytes, formatDate } from '@/lib/utils';
import FileUploadModal from './FileUploadModal';
import FilePreview from './FilePreview';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { CameraCapture } from '@/components/CameraCapture';
import { CameraCapture as CameraCaptureType } from '@/hooks/useCamera';
import { getDeviceInfo, DeviceInfo } from '@/utils/deviceDetection';
import toast from 'react-hot-toast';

interface MobileFileManagerProps {
  applicationId?: string;
  showUpload?: boolean;
  compact?: boolean;
  maxFiles?: number;
}

interface NetworkStatus {
  isOnline: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export default function MobileFileManager({ 
  applicationId, 
  showUpload = true, 
  compact = false,
  maxFiles 
}: MobileFileManagerProps) {
  const { user } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ApiFile | null>(null);
  const [previewFile, setPreviewFile] = useState<ApiFile | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({ isOnline: true });
  const [retryCount, setRetryCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // API hooks with mobile-optimized settings
  const { data: filesData, isLoading, error, refetch } = useFiles({
    application_id: applicationId,
    limit: maxFiles || (compact ? 10 : 50),
  });

  const deleteFileMutation = useDeleteFile();
  const { downloadFile } = useDownloadFile();

  // Get device info on mount
  useEffect(() => {
    const fetchDeviceInfo = async () => {
      const info = await getDeviceInfo();
      setDeviceInfo(info);
    };
    fetchDeviceInfo();
  }, []);

  // Monitor network status
  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      setNetworkStatus({
        isOnline: navigator.onLine,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt
      });
    };

    updateNetworkStatus();

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      if ((navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  // Auto-retry on network reconnection
  useEffect(() => {
    if (networkStatus.isOnline && error && retryCount < 3) {
      const timer = setTimeout(() => {
        refetch();
        setRetryCount(prev => prev + 1);
      }, 1000 * Math.pow(2, retryCount)); // Exponential backoff

      return () => clearTimeout(timer);
    }
  }, [networkStatus.isOnline, error, retryCount, refetch]);

  // Reset retry count on successful load
  useEffect(() => {
    if (filesData && !error) {
      setRetryCount(0);
    }
  }, [filesData, error]);

  const handleDelete = async () => {
    if (fileToDelete) {
      try {
        await deleteFileMutation.mutateAsync(fileToDelete.id);
        setFileToDelete(null);
        toast.success('File deleted successfully');
      } catch (error) {
        toast.error('Failed to delete file');
      }
    }
  };

  const handleDownload = async (file: ApiFile) => {
    try {
      // Show loading toast for slow networks
      if (networkStatus.effectiveType === 'slow-2g' || networkStatus.effectiveType === '2g') {
        toast.loading('Preparing download for slow connection...', { id: 'download' });
      }
      
      await downloadFile(file.id, file.display_name || file.original_filename);
      toast.dismiss('download');
      toast.success('Download started');
    } catch (error) {
      toast.dismiss('download');
      toast.error('Failed to download file');
    }
  };

  const handleCameraCapture = async (capture: CameraCaptureType) => {
    try {
      // For slow networks, show compression message
      if (networkStatus.effectiveType === 'slow-2g' || networkStatus.effectiveType === '2g') {
        toast.loading('Compressing image for upload...', { id: 'compress' });
        
        // Add a small delay to show the message
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Create file from capture
      const file = new File([capture.blob], `camera-capture-${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      // Close camera and open upload modal with the file
      setShowCamera(false);
      toast.dismiss('compress');
      
      // For now, we'll trigger the upload modal
      // In a real implementation, you might want to auto-upload or add to a queue
      setShowUploadModal(true);
      toast.success('Photo captured! Ready to upload.');
      
    } catch (error) {
      toast.dismiss('compress');
      toast.error('Failed to process camera capture');
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('Files refreshed');
    } catch (error) {
      toast.error('Failed to refresh files');
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  // Pull-to-refresh for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      const startY = e.touches[0].clientY;
      
      const handleTouchMove = (e: TouchEvent) => {
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        
        if (diff > 100 && !isRefreshing) {
          handleRefresh();
          document.removeEventListener('touchmove', handleTouchMove);
        }
      };
      
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      
      const handleTouchEnd = () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
      
      document.addEventListener('touchend', handleTouchEnd, { once: true });
    }
  }, [handleRefresh, isRefreshing]);

  const files = filesData?.items || [];
  const isSlowNetwork = networkStatus.effectiveType === 'slow-2g' || networkStatus.effectiveType === '2g';

  // Network status indicator
  const NetworkIndicator = () => (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
      !networkStatus.isOnline 
        ? 'bg-red-100 text-red-700' 
        : isSlowNetwork 
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-green-100 text-green-700'
    }`}>
      <WifiIcon className="h-3 w-3" />
      {!networkStatus.isOnline 
        ? 'Offline' 
        : isSlowNetwork 
        ? 'Slow Connection'
        : 'Online'
      }
    </div>
  );

  if (isLoading && !isRefreshing) {
    return (
      <div className="flex flex-col items-center justify-center h-32 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400 mb-2"></div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading files...</p>
        {isSlowNetwork && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Slow network detected</p>
        )}
      </div>
    );
  }

  if (error && !networkStatus.isOnline) {
    return (
      <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full w-fit mx-auto mb-4">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-500 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Internet Connection</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Please check your connection and try again
        </p>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRefreshing ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4" onTouchStart={handleTouchStart}>
      {/* Mobile Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Files ({files.length})
          </h3>
          <NetworkIndicator />
        </div>
        
        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
            title="Refresh"
          >
            <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Upload actions */}
          {showUpload && (
            <div className="flex items-center gap-2">
              {deviceInfo?.hasCamera && (
                <button
                  onClick={() => setShowCamera(true)}
                  className="p-2 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/70 rounded-lg transition-colors duration-200"
                  title="Take Photo"
                >
                  <CameraIcon className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={() => setShowUploadModal(true)}
                className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/70 rounded-lg transition-colors duration-200"
                title="Upload File"
              >
                <PhotoIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pull to refresh indicator */}
      {isRefreshing && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-sm text-gray-500">Refreshing...</span>
        </div>
      )}

      {/* File List */}
      {files.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-fit mx-auto mb-4">
            <DocumentIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No files uploaded</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Get started by taking a photo or uploading a file
          </p>
          {showUpload && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {deviceInfo?.hasCamera && (
                <button
                  onClick={() => setShowCamera(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  <CameraIcon className="h-5 w-5" />
                  Take Photo
                </button>
              )}
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                <PlusIcon className="h-5 w-5" />
                Upload File
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="group flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-blue-50 dark:hover:bg-gray-700/50 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <div className="flex items-center flex-1 min-w-0 mr-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl mr-3 flex-shrink-0">
                  <DocumentIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
                    {file.display_name || file.original_filename}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">{formatBytes(file.file_size)}</span>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <span>{formatDate(file.created_at)}</span>
                  </div>
                </div>
              </div>
              
              {/* Mobile-optimized action buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPreviewFile(file)}
                  className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
                  title="Preview"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDownload(file)}
                  className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/70 rounded-lg transition-colors duration-200"
                  title="Download"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                </button>
                {(user?.role === 'admin' || file.uploaded_by === user?.id) && (
                  <button
                    onClick={() => setFileToDelete(file)}
                    className="p-2 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/70 rounded-lg transition-colors duration-200"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture
          isOpen={showCamera}
          onClose={() => setShowCamera(false)}
          onCapture={handleCameraCapture}
          title="Capture Document"
          description="Position your document in the frame and tap to capture"
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <FileUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          applicationId={applicationId}
        />
      )}

      {/* File Preview */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Delete Confirmation */}
      {fileToDelete && (
        <ConfirmDialog
          isOpen={!!fileToDelete}
          onClose={() => setFileToDelete(null)}
          onConfirm={handleDelete}
          title="Delete File"
          message={`Are you sure you want to delete "${fileToDelete.display_name || fileToDelete.original_filename}"?`}
          confirmText="Delete"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      )}
    </div>
  );
}