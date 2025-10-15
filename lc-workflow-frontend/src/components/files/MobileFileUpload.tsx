'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadFile } from '@/hooks/useFiles';
import { DocumentType } from '../../../app/applications/new/types';
import { 
  XMarkIcon, 
  DocumentIcon, 
  CloudArrowUpIcon, 
  CameraIcon,
  PhotoIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  WifiIcon
} from '@heroicons/react/24/outline';
import { formatBytes } from '@/lib/utils';
import { CameraCapture } from '@/components/CameraCapture';
import { getDeviceInfo, DeviceInfo } from '@/utils/deviceDetection';
import { CameraCapture as CameraCaptureType } from '@/hooks/useCamera';
import toast from 'react-hot-toast';

interface MobileFileUploadProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId?: string;
  documentType?: DocumentType;
  maxFileSize?: number;
  allowedTypes?: string[];
}

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'compressing';
  error?: string;
  compressed?: boolean;
  originalSize?: number;
}

interface NetworkStatus {
  isOnline: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

// Image compression utility
const compressImage = async (file: File, quality: number = 0.7): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions (max 1920x1080 for mobile)
      const maxWidth = 1920;
      const maxHeight = 1080;
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.src = URL.createObjectURL(file);
  });
};

export default function MobileFileUpload({ 
  isOpen, 
  onClose, 
  applicationId, 
  documentType,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  allowedTypes = ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
}: MobileFileUploadProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({ isOnline: true });
  const [fieldName, setFieldName] = useState<string>('');
  const [uploadQueue, setUploadQueue] = useState<FileWithProgress[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const uploadFileMutation = useUploadFile();
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Process upload queue when network comes back online
  useEffect(() => {
    if (networkStatus.isOnline && uploadQueue.length > 0 && !isProcessingQueue) {
      processUploadQueue();
    }
  }, [networkStatus.isOnline, uploadQueue.length]);

  const isSlowNetwork = networkStatus.effectiveType === 'slow-2g' || networkStatus.effectiveType === '2g';
  const shouldCompress = isSlowNetwork || (networkStatus.downlink && networkStatus.downlink < 1);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: FileWithProgress[] = [];
    
    for (const file of acceptedFiles) {
      // Check file size
      if (file.size > maxFileSize) {
        toast.error(`File ${file.name} is too large. Maximum size is ${formatBytes(maxFileSize)}`);
        continue;
      }

      let processedFile = file;
      let compressed = false;
      const originalSize = file.size;

      // Compress images for slow networks
      if (shouldCompress && file.type.startsWith('image/')) {
        try {
          setFiles(prev => [...prev, {
            file,
            progress: 0,
            status: 'compressing',
            originalSize: file.size
          }]);

          processedFile = await compressImage(file, isSlowNetwork ? 0.5 : 0.7);
          compressed = true;
          
          toast.success(`Image compressed: ${formatBytes(originalSize)} → ${formatBytes(processedFile.size)}`);
        } catch (error) {
          console.error('Compression failed:', error);
          toast.error('Image compression failed, using original file');
        }
      }

      newFiles.push({
        file: processedFile,
        progress: 0,
        status: 'pending',
        compressed,
        originalSize
      });
    }

    setFiles(prev => {
      // Remove any compressing files and add new ones
      const filtered = prev.filter(f => f.status !== 'compressing');
      return [...filtered, ...newFiles];
    });
  }, [maxFileSize, shouldCompress, isSlowNetwork]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: maxFileSize,
    accept: allowedTypes.reduce((acc, type) => {
      if (type === 'image/*') {
        acc['image/*'] = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
      } else if (type === 'application/pdf') {
        acc['application/pdf'] = ['.pdf'];
      } else if (type === 'application/msword') {
        acc['application/msword'] = ['.doc'];
      } else if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        acc['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] = ['.docx'];
      }
      return acc;
    }, {} as Record<string, string[]>),
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (fileWithProgress: FileWithProgress, index: number) => {
    if (!networkStatus.isOnline) {
      // Add to queue for later
      setUploadQueue(prev => [...prev, fileWithProgress]);
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'pending', error: 'Queued for upload when online' } : f
      ));
      return;
    }

    setFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, status: 'uploading', error: undefined } : f
    ));

    try {
      await uploadFileMutation.mutateAsync({
        file: fileWithProgress.file,
        applicationId,
        documentType,
        fieldName: fieldName.trim() || undefined,
        onProgress: (progress) => {
          setFiles(prev => prev.map((f, i) => 
            i === index ? { ...f, progress } : f
          ));
        },
      });

      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'completed', progress: 100 } : f
      ));

      // Show success message with compression info
      if (fileWithProgress.compressed && fileWithProgress.originalSize) {
        toast.success(`File uploaded successfully! Saved ${formatBytes(fileWithProgress.originalSize - fileWithProgress.file.size)} bandwidth`);
      } else {
        toast.success('File uploaded successfully!');
      }

    } catch (error: any) {
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'error', 
          error: error.message || 'Upload failed' 
        } : f
      ));

      // Add to retry queue for network errors
      if (error.message?.includes('network') || error.message?.includes('timeout')) {
        setUploadQueue(prev => [...prev, fileWithProgress]);
      }
    }
  };

  const processUploadQueue = async () => {
    if (uploadQueue.length === 0 || isProcessingQueue) return;

    setIsProcessingQueue(true);
    toast.success(`Processing ${uploadQueue.length} queued uploads...`);

    for (const queuedFile of uploadQueue) {
      if (networkStatus.isOnline) {
        const fileIndex = files.findIndex(f => f.file.name === queuedFile.file.name);
        if (fileIndex !== -1) {
          await uploadFile(queuedFile, fileIndex);
        }
      }
    }

    setUploadQueue([]);
    setIsProcessingQueue(false);
  };

  const uploadAllFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    if (!networkStatus.isOnline && pendingFiles.length > 0) {
      setUploadQueue(prev => [...prev, ...pendingFiles]);
      toast.success(`${pendingFiles.length} files queued for upload when online`);
      return;
    }

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'pending') {
        await uploadFile(files[i], i);
        
        // Add delay for slow networks to prevent overwhelming
        if (isSlowNetwork) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  };

  const retryFailedUploads = async () => {
    const failedFiles = files.filter(f => f.status === 'error');
    
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'error') {
        await uploadFile(files[i], i);
        
        if (isSlowNetwork) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  };

  const handleClose = () => {
    setFiles([]);
    setShowCamera(false);
    setFieldName('');
    setUploadQueue([]);
    onClose();
  };

  const handleCameraCapture = async (capture: CameraCaptureType) => {
    try {
      let processedFile = capture.file;
      let compressed = false;
      const originalSize = capture.file.size;

      // Always compress camera captures for mobile
      if (capture.file.type.startsWith('image/')) {
        setFiles(prev => [...prev, {
          file: capture.file,
          progress: 0,
          status: 'compressing',
          originalSize: capture.file.size
        }]);

        processedFile = await compressImage(capture.file, shouldCompress ? 0.5 : 0.7);
        compressed = true;
      }

      const newFile = {
        file: processedFile,
        progress: 0,
        status: 'pending' as const,
        compressed,
        originalSize
      };

      setFiles(prev => {
        const filtered = prev.filter(f => f.status !== 'compressing');
        return [...filtered, newFile];
      });
      
      setShowCamera(false);
      
      if (compressed) {
        toast.success(`Photo captured and compressed: ${formatBytes(originalSize)} → ${formatBytes(processedFile.size)}`);
      } else {
        toast.success('Photo captured successfully!');
      }
      
    } catch (error) {
      toast.error('Failed to process camera capture');
    }
  };

  const allCompleted = files.length > 0 && files.every(f => f.status === 'completed');
  const hasFiles = files.length > 0;
  const hasPendingFiles = files.some(f => f.status === 'pending');
  const hasFailedFiles = files.some(f => f.status === 'error');
  const hasCompressingFiles = files.some(f => f.status === 'compressing');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl sm:max-h-[90vh] max-h-[95vh] overflow-hidden border-t border-gray-200 dark:border-gray-700 sm:border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">Upload Files</h2>
            {/* Network status indicator */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              !networkStatus.isOnline 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' 
                : isSlowNetwork 
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400'
                : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
            }`}>
              <WifiIcon className="h-3 w-3" />
              {!networkStatus.isOnline 
                ? 'Offline' 
                : isSlowNetwork 
                ? 'Slow'
                : 'Online'
              }
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-140px)] sm:max-h-[calc(90vh-140px)]">
          {/* Field Name Input */}
          <div className="mb-4 sm:mb-6">
            <label htmlFor="fieldName" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Document Field Name (Optional)
            </label>
            <input
              type="text"
              id="fieldName"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              placeholder="e.g., NID, borrower_photo, salary_certificate"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
            />
          </div>

          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
              isDragActive
                ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
            }`}
          >
            <input {...getInputProps()} />
            <div className="p-3 sm:p-4 bg-blue-100 dark:bg-blue-900/50 rounded-full w-fit mx-auto mb-4 sm:mb-6">
              <CloudArrowUpIcon className="h-8 sm:h-12 w-8 sm:w-12 text-blue-600 dark:text-blue-400" />
            </div>
            {isDragActive ? (
              <p className="text-blue-600 dark:text-blue-400 font-semibold text-base sm:text-lg">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-gray-700 dark:text-gray-200 mb-2 sm:mb-3 font-semibold text-base sm:text-lg">
                  Tap to select files or drag & drop
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 sm:px-4 py-2 rounded-lg inline-block mb-3 sm:mb-4">
                  Max {formatBytes(maxFileSize)} each
                  {shouldCompress && ' • Images will be compressed'}
                </p>
                
                {/* Camera Button */}
                {deviceInfo?.hasCamera && (
                  <div className="mt-3 sm:mt-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCamera(true);
                      }}
                      className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200"
                    >
                      <CameraIcon className="h-5 w-5 mr-2" />
                      Take Photo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Queue Status */}
          {uploadQueue.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {uploadQueue.length} files queued for upload when online
                </span>
              </div>
            </div>
          )}

          {/* File List */}
          {hasFiles && (
            <div className="mt-6 sm:mt-8">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
                Selected Files ({files.length})
              </h3>
              <div className="space-y-3 sm:space-y-4">
                {files.map((fileWithProgress, index) => (
                  <div
                    key={index}
                    className="group flex items-center justify-between p-3 sm:p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-blue-50 dark:hover:bg-gray-700/50 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl mr-3 flex-shrink-0">
                        <DocumentIcon className="h-6 sm:h-8 w-6 sm:w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
                          {fileWithProgress.file.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                          <span>{formatBytes(fileWithProgress.file.size)}</span>
                          {fileWithProgress.compressed && fileWithProgress.originalSize && (
                            <>
                              <span className="text-gray-300 dark:text-gray-600">•</span>
                              <span className="text-green-600 dark:text-green-400">
                                Compressed from {formatBytes(fileWithProgress.originalSize)}
                              </span>
                            </>
                          )}
                        </div>
                        
                        {/* Progress Bar */}
                        {fileWithProgress.status === 'uploading' && (
                          <div className="mt-2">
                            <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${fileWithProgress.progress}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                              {fileWithProgress.progress}% uploaded
                            </p>
                          </div>
                        )}
                        
                        {/* Status Messages */}
                        {fileWithProgress.status === 'compressing' && (
                          <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 font-medium flex items-center gap-2">
                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            Compressing image...
                          </p>
                        )}
                        {fileWithProgress.status === 'error' && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">
                            {fileWithProgress.error}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Status Icons and Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {fileWithProgress.status === 'completed' && (
                        <CheckCircleIcon className="h-6 w-6 text-green-500" />
                      )}
                      {fileWithProgress.status === 'error' && (
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                      )}
                      {fileWithProgress.status === 'compressing' && (
                        <ArrowPathIcon className="h-6 w-6 text-blue-500 animate-spin" />
                      )}
                      {fileWithProgress.status === 'pending' && (
                        <button
                          onClick={() => removeFile(index)}
                          className="px-3 py-1.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/70 text-sm font-medium rounded-lg transition-colors duration-200"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700">
          <button
            onClick={handleClose}
            className="px-4 sm:px-6 py-2.5 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 font-semibold transition-colors duration-200"
          >
            {allCompleted ? 'Close' : 'Cancel'}
          </button>
          
          <div className="flex items-center gap-2">
            {hasFailedFiles && (
              <button
                onClick={retryFailedUploads}
                disabled={uploadFileMutation.isPending || hasCompressingFiles}
                className="px-4 sm:px-6 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors duration-200"
              >
                Retry Failed
              </button>
            )}
            
            {hasPendingFiles && (
              <button
                onClick={uploadAllFiles}
                disabled={uploadFileMutation.isPending || hasCompressingFiles}
                className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none"
              >
                {uploadFileMutation.isPending || hasCompressingFiles ? 'Processing...' : 
                 !networkStatus.isOnline ? 'Queue for Upload' : 'Upload All'}
              </button>
            )}
          </div>
        </div>
      </div>
      
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
    </div>
  );
}