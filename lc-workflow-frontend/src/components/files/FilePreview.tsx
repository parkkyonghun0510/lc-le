'use client';

import { useState } from 'react';
import { File } from '@/types/models';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useDownloadFile } from '@/hooks/useFiles';

interface FilePreviewProps {
  file: File;
  isOpen: boolean;
  onClose: () => void;
}

export default function FilePreview({ file, isOpen, onClose }: FilePreviewProps) {
  const [imageError, setImageError] = useState(false);
  const { downloadFile } = useDownloadFile();

  if (!isOpen) return null;

  const handleDownload = () => {
    downloadFile(file.id, file.original_filename);
  };

  const getPreviewUrl = () => {
    const token = localStorage.getItem('access_token');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    return `${baseUrl}/files/${file.id}/download`;
  };

  const renderPreview = () => {
    if (file.mime_type.startsWith('image/') && !imageError) {
      return (
        <div className="flex items-center justify-center h-full">
          <img
            src={getPreviewUrl()}
            alt={file.original_filename}
            className="max-w-full max-h-full object-contain"
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    if (file.mime_type === 'application/pdf') {
      return (
        <div className="h-full">
          <iframe
            src={`${getPreviewUrl()}#toolbar=0`}
            className="w-full h-full border-0"
            title={file.original_filename}
          />
        </div>
      );
    }

    if (file.mime_type.startsWith('text/')) {
      return (
        <div className="p-6 h-full overflow-auto">
          <iframe
            src={getPreviewUrl()}
            className="w-full h-full border-0"
            title={file.original_filename}
          />
        </div>
      );
    }

    // Fallback for unsupported file types
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <div className="text-6xl mb-4">📄</div>
        <p className="text-lg font-medium mb-2">Preview not available</p>
        <p className="text-sm mb-4">
          This file type cannot be previewed in the browser
        </p>
        <button
          onClick={handleDownload}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Download File
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-6xl max-h-[90vh] mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {file.original_filename}
            </h2>
            <p className="text-sm text-gray-500">
              {file.mime_type} • {Math.round(file.file_size / 1024)} KB
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={handleDownload}
              className="text-gray-600 hover:text-gray-800 p-2"
              title="Download"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800 p-2"
              title="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 h-[calc(100%-80px)]">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}