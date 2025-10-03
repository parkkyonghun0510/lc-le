'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadFile } from '@/hooks/useFiles';
import {
  XMarkIcon,
  DocumentIcon,
  CloudArrowUpIcon,
  PhotoIcon,
  UserGroupIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
} from '@heroicons/react/24/outline';
import { formatBytes } from '@/lib/utils';
import { DocumentType } from '../../../app/applications/new/types';
import { UploadController, UploadOptions } from '@/lib/upload/UploadController';
import { BulkCategoryOperations, FileWithCategory as BulkFileWithCategory } from '@/lib/upload/BulkCategoryOperations';
import { PerformanceOptimizer, ProgressAggregator } from '@/lib/upload/PerformanceOptimizer';
import { RetryManager, RetryConfigs } from '@/lib/upload/RetryManager';

interface GroupFileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId?: string;
  documentTypes: Array<{
    type: DocumentType;
    label: string;
  }>;
}

interface FileWithCategory {
  file: File;
  category: DocumentType | null;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

const getDocumentTypeInfo = (type: DocumentType) => {
  switch (type) {
    case 'borrower_photo':
    case 'guarantor_photo':
    case 'collateral_photo':
      return {
        icon: PhotoIcon,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-300',
        description: 'Photos and images'
      };
    case 'borrower_id':
    case 'guarantor_id':
      return {
        icon: DocumentIcon,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-300',
        description: 'ID documents'
      };
    case 'borrower_income_proof':
    case 'guarantor_income_proof':
      return {
        icon: DocumentDuplicateIcon,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        borderColor: 'border-purple-300',
        description: 'Income proof documents'
      };
    case 'land_title':
    case 'collateral_document':
    case 'contract':
      return {
        icon: DocumentDuplicateIcon,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-300',
        description: 'Legal documents'
      };
    case 'other':
      return {
        icon: DocumentIcon,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        description: 'Other documents'
      };
    default:
      return {
        icon: DocumentIcon,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        description: 'Documents'
      };
  }
};

export default function GroupFileUploadModal({
  isOpen,
  onClose,
  applicationId,
  documentTypes,
}: GroupFileUploadModalProps) {
  const [files, setFiles] = useState<FileWithCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<DocumentType | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSessionId, setUploadSessionId] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);

  const uploadFileMutation = useUploadFile();
  const uploadControllerRef = useRef<UploadController | null>(null);
  const bulkCategoryOpsRef = useRef<BulkCategoryOperations | null>(null);
  const progressAggregatorRef = useRef<ProgressAggregator | null>(null);
  const performanceOptimizerRef = useRef(PerformanceOptimizer.getInstance());

  // Initialize upload infrastructure
  useEffect(() => {
    if (isOpen && !uploadControllerRef.current) {
      const uploadOptions: UploadOptions = {
        queue: {
          maxConcurrent: 3,
          maxRetries: 3,
          retryDelay: 1000,
          retryDelayMultiplier: 2,
        },
        retry: RetryConfigs.standard,
        onProgress: (taskId, progress) => {
          setFiles(prev => prev.map(f =>
            f.file.name === taskId ? { ...f, progress } : f
          ));
        },
        onComplete: (taskId) => {
          setFiles(prev => prev.map(f =>
            f.file.name === taskId ? { ...f, status: 'completed', progress: 100 } : f
          ));
        },
        onError: (taskId, error) => {
          setFiles(prev => prev.map(f =>
            f.file.name === taskId ? { ...f, status: 'error', error: String(error) } : f
          ));
        },
      };

      // Create actual upload function that uses the mutation
      const actualUploadFn = async (
        file: File,
        applicationId?: string,
        onProgress?: (progress: number) => void,
        documentType?: string,
        fieldName?: string
      ) => {
        return new Promise((resolve, reject) => {
          // Check if mutation is already in progress
          if (uploadFileMutation.isPending) {
            reject(new Error('Another upload is already in progress'));
            return;
          }

          uploadFileMutation.mutate(
            {
              file,
              applicationId,
              documentType: documentType as any,
              fieldName,
              onProgress,
            },
            {
              onSuccess: (data) => {
                resolve(data);
              },
              onError: (error) => {
                // Immediately reject on any server error
                console.error('Upload failed with server error:', error);
                reject(error);
              },
            }
          );
        });
      };

      uploadControllerRef.current = new UploadController(uploadOptions, actualUploadFn);
      bulkCategoryOpsRef.current = new BulkCategoryOperations();
      progressAggregatorRef.current = new ProgressAggregator();

      // Set up overall progress tracking
      progressAggregatorRef.current.setAggregatedCallback((overall) => {
        setOverallProgress(overall.percentage);
        setUploadSpeed(overall.speed);
        setEstimatedTimeRemaining(overall.remainingTime);
      });
    }

    return () => {
      if (uploadControllerRef.current && !isUploading) {
        uploadControllerRef.current.destroy();
        uploadControllerRef.current = null;
        bulkCategoryOpsRef.current = null;
        progressAggregatorRef.current = null;
      }
    };
  }, [isOpen, isUploading, uploadFileMutation]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map((file) => ({
        file,
        category: selectedCategory,
        progress: 0,
        status: 'pending' as const,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    },
    [selectedCategory]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
    },
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFileCategory = (index: number, category: DocumentType) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, category } : f))
    );
  };

  const uploadFile = async (fileWithCategory: FileWithCategory, index: number) => {
    if (!fileWithCategory.category) {
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: 'error',
                error: 'Please select a category for this file',
              }
            : f
        )
      );
      return;
    }

    if (!uploadControllerRef.current) {
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: 'error',
                error: 'Upload controller not initialized',
              }
            : f
        )
      );
      return;
    }

    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, status: 'uploading' } : f))
    );

    try {
      // Create upload session if not exists
      if (!uploadSessionId) {
        const sessionId = uploadControllerRef.current.createSession();
        setUploadSessionId(sessionId);
      }

      // Upload file using new infrastructure with actual API call
      const taskId = await uploadControllerRef.current.uploadFile(
        fileWithCategory.file,
        fileWithCategory.category,
        uploadSessionId || undefined,
        {
          onProgress: (progress) => {
            setFiles((prev) =>
              prev.map((f) =>
                f.file.name === fileWithCategory.file.name ? { ...f, progress: Number(progress) } : f
              )
            );
          },
          onComplete: () => {
            // Only mark as completed when server confirms success
            setFiles((prev) =>
              prev.map((f) =>
                f.file.name === fileWithCategory.file.name
                  ? { ...f, status: 'completed', progress: 100 }
                  : f
              )
            );
          },
          onError: (error) => {
            // Immediately stop upload and show error when server fails
            setFiles((prev) =>
              prev.map((f) =>
                f.file.name === fileWithCategory.file.name
                  ? { ...f, status: 'error', error: String(error) }
                  : f
              )
            );
          },
        }
      );

      // Add to progress aggregator
      if (progressAggregatorRef.current) {
        progressAggregatorRef.current.addUpload(taskId, fileWithCategory.file.size);
      }

      setIsUploading(true);

    } catch (error: any) {
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: 'error',
                error: error.message || 'Upload failed',
              }
            : f
        )
      );
    }
  };

  const uploadAllFiles = async () => {
    if (!uploadControllerRef.current) return;

    const pendingFiles = files.filter((f) => f.status === 'pending');

    if (pendingFiles.length === 0) return;

    // Create upload session
    const sessionId = uploadControllerRef.current.createSession();
    setUploadSessionId(sessionId);
    setIsUploading(true);

    try {
      // Convert files to upload format
      const filesToUpload = pendingFiles.map(f => ({
        file: f.file,
        category: f.category,
        priority: f.category === 'borrower_photo' ? 2 : 1, // Higher priority for photos
      }));

      // Upload all files in parallel using new infrastructure with actual API calls
      const taskIds = await uploadControllerRef.current.uploadFiles(
        filesToUpload,
        sessionId,
        {
          onProgress: (progress) => {
            setFiles(prev => prev.map(f => {
              // Find file by matching with task ID (simplified - in real implementation you'd map properly)
              const matchingFile = prev.find(pf => pf.status === 'uploading');
              return matchingFile ? { ...matchingFile, progress: Number(progress) } : f;
            }));
          },
          onComplete: (taskId) => {
            // Only mark as completed when server confirms success
            setFiles(prev => prev.map(f =>
              f.status === 'uploading' ? { ...f, status: 'completed', progress: 100 } : f
            ));
          },
          onError: (taskId, error) => {
            // Immediately stop upload and show error when server fails
            setFiles(prev => prev.map(f =>
              f.status === 'uploading' ? { ...f, status: 'error', error: String(error) } : f
            ));
          },
        }
      );

      // Add all uploads to progress aggregator
      if (progressAggregatorRef.current) {
        taskIds.forEach((taskId, index) => {
          if (pendingFiles[index]) {
            progressAggregatorRef.current!.addUpload(taskId, pendingFiles[index].file.size);
          }
        });
      }

    } catch (error: any) {
      console.error('Bulk upload failed:', error);
      setIsUploading(false);
      // Show error for all uploading files
      setFiles(prev => prev.map(f =>
        f.status === 'uploading' ? { ...f, status: 'error', error: String(error) } : f
      ));
    }
  };

  const cancelAllUploads = () => {
    if (uploadControllerRef.current) {
      uploadControllerRef.current.cancelAll();
      setIsUploading(false);
      setUploadSessionId(null);

      // Reset file statuses
      setFiles(prev => prev.map(f =>
        f.status === 'uploading' ? { ...f, status: 'pending', error: undefined } : f
      ));
    }
  };

  // Enhanced error handling for server errors
  const handleUploadError = (error: any) => {
    console.error('Server upload error:', error);

    // Check if it's a server error (500, 502, 503, etc.)
    const isServerError = error?.response?.status >= 500 ||
                         error?.message?.includes('500') ||
                         error?.message?.includes('502') ||
                         error?.message?.includes('503') ||
                         error?.message?.includes('504');

    if (isServerError) {
      // For server errors, stop all uploads and show error
      setIsUploading(false);
      setFiles(prev => prev.map(f =>
        f.status === 'uploading'
          ? { ...f, status: 'error', error: `Server Error: ${error.response?.data?.detail || error.message}` }
          : f
      ));
      return true; // Indicates error was handled
    }

    return false; // Indicates error was not a server error
  };

  const pauseUploads = () => {
    if (uploadControllerRef.current && uploadSessionId) {
      uploadControllerRef.current.pauseSession(uploadSessionId);
    }
  };

  const resumeUploads = () => {
    if (uploadControllerRef.current && uploadSessionId) {
      uploadControllerRef.current.resumeSession(uploadSessionId, 3);
    }
  };

  const handleClose = () => {
    setFiles([]);
    setSelectedCategory(null);
    onClose();
  };

  const allCompleted = files.length > 0 && files.every((f) => f.status === 'completed');
  const hasFiles = files.length > 0;
  const hasPendingFiles = files.some((f) => f.status === 'pending');
  const hasUncategorizedFiles = files.some((f) => f.status === 'pending' && !f.category);
  const hasUploadingFiles = files.some((f) => f.status === 'uploading');
  const hasFailedFiles = files.some((f) => f.status === 'error');
  const hasServerErrors = files.some((f) => f.error?.includes('Server Error'));

  // Bulk operations
  const applyCategoryToUncategorized = (category: DocumentType) => {
    if (bulkCategoryOpsRef.current) {
      bulkCategoryOpsRef.current.updateFiles(files as BulkFileWithCategory[]);
      const result = bulkCategoryOpsRef.current.applyToUncategorized(category);
      setFiles(result.updatedFiles as FileWithCategory[]);
    }
  };

  const autoCategorizeFiles = () => {
    if (bulkCategoryOpsRef.current) {
      bulkCategoryOpsRef.current.updateFiles(files as BulkFileWithCategory[]);
      const result = bulkCategoryOpsRef.current.autoCategorize([
        { type: 'borrower_photo', patterns: ['photo', 'image', 'jpg', 'jpeg', 'png'] },
        { type: 'borrower_id', patterns: ['id', 'identification', 'card'] },
        { type: 'borrower_income_proof', patterns: ['income', 'salary', 'pay', 'proof'] },
        { type: 'contract', patterns: ['contract', 'agreement'] },
      ]);
      setFiles(result.updatedFiles as FileWithCategory[]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Group File Upload
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Upload multiple files and organize them by category
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Category Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Select Default Category
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {documentTypes.map((docType) => {
                const typeInfo = getDocumentTypeInfo(docType.type);
                const Icon = typeInfo.icon;
                const isSelected = selectedCategory === docType.type;

                return (
                  <button
                    key={docType.type}
                    onClick={() => setSelectedCategory(docType.type)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? `${typeInfo.borderColor} ${typeInfo.bgColor} dark:bg-opacity-20`
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected ? typeInfo.bgColor : 'bg-gray-100 dark:bg-gray-700'
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 ${
                            isSelected ? typeInfo.color : 'text-gray-500 dark:text-gray-400'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {docType.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {typeInfo.description}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 absolute top-2 right-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
              isDragActive
                ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
            }`}
          >
            <input {...getInputProps()} />
            <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-full w-fit mx-auto mb-6">
              <CloudArrowUpIcon className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
            {isDragActive ? (
              <p className="text-blue-600 dark:text-blue-400 font-semibold text-lg">
                Drop the files here...
              </p>
            ) : (
              <div>
                <p className="text-gray-700 dark:text-gray-200 mb-3 font-semibold text-lg">
                  Drag & drop files here, or click to select files
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg inline-block">
                  Supports: Images, PDF, Word, Excel, Text files (max 10MB each)
                </p>
                {selectedCategory && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                    Files will be categorized as: {documentTypes.find(d => d.type === selectedCategory)?.label}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Bulk Operations */}
          {hasUncategorizedFiles && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-300">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {files.filter(f => f.status === 'pending' && !f.category).length} files need categories
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={autoCategorizeFiles}
                    className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                  >
                    Auto-Categorize
                  </button>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        applyCategoryToUncategorized(e.target.value as DocumentType);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Apply to all...</option>
                    {documentTypes.map((docType) => (
                      <option key={docType.type} value={docType.type}>
                        {docType.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Server Error Alert */}
          {hasServerErrors && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Server Error Detected
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    The server encountered an error (500). Please check your connection and try again.
                    All uploads have been stopped for safety.
                  </p>
                </div>
                <button
                  onClick={() => {
                    // Reset files with server errors
                    setFiles(prev => prev.map(f =>
                      f.error?.includes('Server Error')
                        ? { ...f, status: 'pending', error: undefined, progress: 0 }
                        : f
                    ));
                  }}
                  className="flex-shrink-0 px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
                >
                  Retry All
                </button>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && !hasServerErrors && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Upload Progress
                </span>
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  {Math.round(overallProgress)}%
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-blue-600 dark:text-blue-400">
                <span>
                  {uploadSpeed > 0 && `Speed: ${formatBytes(uploadSpeed)}/s`}
                </span>
                <span>
                  {estimatedTimeRemaining > 0 && `~${Math.round(estimatedTimeRemaining)}s remaining`}
                </span>
              </div>
            </div>
          )}

          {/* File List */}
          {hasFiles && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Selected Files ({files.length})
                </h3>
                <div className="flex items-center space-x-2">
                  {hasFailedFiles && (
                    <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <span className="text-xs">
                        {files.filter(f => f.status === 'error').length} failed
                      </span>
                    </div>
                  )}
                  {hasUncategorizedFiles && (
                    <div className="flex items-center space-x-1 text-amber-600 dark:text-amber-400">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <span className="text-xs">
                        {files.filter(f => f.status === 'pending' && !f.category).length} need category
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                {files.map((fileWithCategory, index) => {
                  const categoryInfo = fileWithCategory.category
                    ? getDocumentTypeInfo(fileWithCategory.category)
                    : null;

                  return (
                    <div
                      key={index}
                      className="group flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-blue-50 dark:hover:bg-gray-700/50 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl mr-3 flex-shrink-0">
                          <DocumentIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
                            {fileWithCategory.file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {formatBytes(fileWithCategory.file.size)}
                          </p>
                          {fileWithCategory.status === 'uploading' && (
                            <div className="mt-3">
                              <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-300"
                                  style={{ width: `${fileWithCategory.progress}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                                {fileWithCategory.progress}% uploaded
                              </p>
                            </div>
                          )}
                          {fileWithCategory.status === 'error' && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">
                              {fileWithCategory.error}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Category Selection */}
                      <div className="flex items-center gap-3 ml-4">
                        {fileWithCategory.status === 'pending' && (
                          <select
                            value={fileWithCategory.category || ''}
                            onChange={(e) =>
                              updateFileCategory(index, e.target.value as DocumentType)
                            }
                            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select category</option>
                            {documentTypes.map((docType) => (
                              <option key={docType.type} value={docType.type}>
                                {docType.label}
                              </option>
                            ))}
                          </select>
                        )}

                        {fileWithCategory.category && fileWithCategory.status !== 'error' && (
                          <div className="flex items-center space-x-2">
                            {categoryInfo && (
                              <div
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                  categoryInfo.bgColor
                                } ${categoryInfo.color}`}
                              >
                                {documentTypes.find(d => d.type === fileWithCategory.category)?.label}
                              </div>
                            )}
                          </div>
                        )}

                        {fileWithCategory.status === 'completed' && (
                          <span className="px-3 py-1.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-sm font-semibold rounded-lg">
                            ✓ Uploaded
                          </span>
                        )}
                        {fileWithCategory.status === 'error' && (
                          <span className="px-3 py-1.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 text-sm font-semibold rounded-lg">
                            ✗ Failed
                          </span>
                        )}
                        {fileWithCategory.status === 'pending' && (
                          <button
                            onClick={() => removeFile(index)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors duration-200"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 font-semibold transition-colors duration-200"
            >
              {allCompleted ? 'Close' : 'Cancel'}
            </button>

            {/* Upload Controls */}
            {isUploading && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={pauseUploads}
                  className="p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 rounded-lg transition-colors duration-200"
                  title="Pause uploads"
                >
                  <PauseIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={cancelAllUploads}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors duration-200"
                  title="Cancel all uploads"
                >
                  <StopIcon className="h-5 w-5" />
                </button>
              </div>
            )}

            {!isUploading && hasPendingFiles && hasUncategorizedFiles && (
              <div className="px-3 py-2 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-lg text-sm">
                Please categorize files before uploading
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {hasPendingFiles && !hasUncategorizedFiles && !hasServerErrors && (
              <button
                onClick={uploadAllFiles}
                disabled={isUploading || hasServerErrors}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <CloudArrowUpIcon className="h-4 w-4" />
                    <span>Upload All Files</span>
                  </>
                )}
              </button>
            )}

            {hasServerErrors && (
              <div className="px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-xl text-sm font-medium">
                Server error - please retry
              </div>
            )}

            {isUploading && (
              <button
                onClick={resumeUploads}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors duration-200 flex items-center space-x-2"
              >
                <PlayIcon className="h-4 w-4" />
                <span>Resume</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}