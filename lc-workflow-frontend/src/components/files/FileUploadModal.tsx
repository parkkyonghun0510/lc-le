'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadFile } from '@/hooks/useFiles';
import { XMarkIcon, DocumentIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { formatBytes } from '@/lib/utils';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId?: string;
  documentType?: 'photos' | 'references' | 'supporting_docs';
}

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export default function FileUploadModal({ isOpen, onClose, applicationId, documentType }: FileUploadModalProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const uploadFileMutation = useUploadFile();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

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
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (fileWithProgress: FileWithProgress, index: number) => {
    setFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, status: 'uploading' } : f
    ));

    try {
      await uploadFileMutation.mutateAsync({
        file: fileWithProgress.file,
        applicationId,
        documentType,
        onProgress: (progress) => {
          setFiles(prev => prev.map((f, i) => 
            i === index ? { ...f, progress } : f
          ));
        },
      });

      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'completed', progress: 100 } : f
      ));
    } catch (error: any) {
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'error', 
          error: error.message || 'Upload failed' 
        } : f
      ));
    }
  };

  const uploadAllFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'pending') {
        await uploadFile(files[i], i);
      }
    }
  };

  const handleClose = () => {
    setFiles([]);
    onClose();
  };

  const allCompleted = files.length > 0 && files.every(f => f.status === 'completed');
  const hasFiles = files.length > 0;
  const hasPendingFiles = files.some(f => f.status === 'pending');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Upload Files</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-blue-600">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  Drag & drop files here, or click to select files
                </p>
                <p className="text-sm text-gray-500">
                  Supports: Images, PDF, Word, Excel, Text files (max 10MB each)
                </p>
              </div>
            )}
          </div>

          {/* File List */}
          {hasFiles && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Selected Files ({files.length})
              </h3>
              <div className="space-y-3">
                {files.map((fileWithProgress, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <DocumentIcon className="h-8 w-8 text-gray-400 mr-3 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {fileWithProgress.file.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatBytes(fileWithProgress.file.size)}
                        </p>
                        {fileWithProgress.status === 'uploading' && (
                          <div className="mt-2">
                            <div className="bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${fileWithProgress.progress}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {fileWithProgress.progress}% uploaded
                            </p>
                          </div>
                        )}
                        {fileWithProgress.status === 'error' && (
                          <p className="text-sm text-red-600 mt-1">
                            {fileWithProgress.error}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {fileWithProgress.status === 'completed' && (
                        <span className="text-green-600 text-sm font-medium">
                          ✓ Uploaded
                        </span>
                      )}
                      {fileWithProgress.status === 'error' && (
                        <span className="text-red-600 text-sm font-medium">
                          ✗ Failed
                        </span>
                      )}
                      {fileWithProgress.status === 'pending' && (
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
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
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {allCompleted ? 'Close' : 'Cancel'}
          </button>
          {hasPendingFiles && (
            <button
              onClick={uploadAllFiles}
              disabled={uploadFileMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadFileMutation.isPending ? 'Uploading...' : 'Upload All'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}