'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadFile } from '@/hooks/useFiles';
import { XMarkIcon, DocumentIcon, CloudArrowUpIcon, CameraIcon } from '@heroicons/react/24/outline';
import { formatBytes } from '@/lib/utils';
import { CameraCapture } from '@/components/CameraCapture';
import { isMobileDevice, getDeviceInfo, DeviceInfo } from '@/utils/deviceDetection';
import { CameraCapture as CameraCaptureType } from '@/hooks/useCamera';

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
  const [showCamera, setShowCamera] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [fieldName, setFieldName] = useState<string>('');
  const uploadFileMutation = useUploadFile();

  // Get device info on component mount
  useEffect(() => {
    const fetchDeviceInfo = async () => {
      const info = await getDeviceInfo();
      setDeviceInfo(info);
    };
    fetchDeviceInfo();
  }, []);

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
    setShowCamera(false);
    setFieldName('');
    onClose();
  };

  // Handle camera capture
  const handleCameraCapture = () => {
    setShowCamera(true);
  };

  // Handle camera photo capture
  const handleCameraPhoto = async (capture: CameraCaptureType) => {
    try {
      // Convert base64 to blob
      const response = await fetch(capture.dataUrl);
      const blob = await response.blob();
      
      // Create file from blob
      const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
      
      // Add to files list
      const newFile = {
        file,
        progress: 0,
        status: 'pending' as const,
      };
      
      setFiles(prev => [...prev, newFile]);
      setShowCamera(false);
    } catch (error) {
      console.error('Error processing camera capture:', error);
    }
  };

  const allCompleted = files.length > 0 && files.every(f => f.status === 'completed');
  const hasFiles = files.length > 0;
  const hasPendingFiles = files.some(f => f.status === 'pending');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Upload Files</h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Field Name Input */}
          <div className="mb-6">
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
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Specify a field name to generate structured filenames like: fieldname_20240115_uuid.ext
            </p>
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
              <p className="text-blue-600 dark:text-blue-400 font-semibold text-lg">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-gray-700 dark:text-gray-200 mb-3 font-semibold text-lg">
                  Drag & drop files here, or click to select files
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg inline-block mb-4">
                  Supports: Images, PDF, Word, Excel, Text files (max 10MB each)
                </p>
                
                {/* Camera Capture Button */}
                {deviceInfo?.hasCamera && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCameraCapture();
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

          {/* File List */}
          {hasFiles && (
            <div className="mt-8">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">
                Selected Files ({files.length})
              </h3>
              <div className="space-y-4">
                {files.map((fileWithProgress, index) => (
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
                          {fileWithProgress.file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          {formatBytes(fileWithProgress.file.size)}
                        </p>
                        {fileWithProgress.status === 'uploading' && (
                          <div className="mt-3">
                            <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${fileWithProgress.progress}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                              {fileWithProgress.progress}% uploaded
                            </p>
                          </div>
                        )}
                        {fileWithProgress.status === 'error' && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">
                            {fileWithProgress.error}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      {fileWithProgress.status === 'completed' && (
                        <span className="px-3 py-1.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-sm font-semibold rounded-lg">
                          ✓ Uploaded
                        </span>
                      )}
                      {fileWithProgress.status === 'error' && (
                        <span className="px-3 py-1.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 text-sm font-semibold rounded-lg">
                          ✗ Failed
                        </span>
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
        <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 font-semibold transition-colors duration-200"
          >
            {allCompleted ? 'Close' : 'Cancel'}
          </button>
          {hasPendingFiles && (
            <button
              onClick={uploadAllFiles}
              disabled={uploadFileMutation.isPending}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none"
            >
              {uploadFileMutation.isPending ? 'Uploading...' : 'Upload All'}
            </button>
          )}
        </div>
      </div>
      
      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture
          isOpen={showCamera}
          onClose={() => setShowCamera(false)}
          onCapture={handleCameraPhoto}
          title="Capture Document"
          description="Position your document in the frame and tap to capture"
        />
      )}
    </div>
  );
}