'use client';

import { useState, useEffect, useCallback } from 'react';
import { File } from '@/types/models';
import { 
  XMarkIcon, 
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon
} from '@heroicons/react/24/outline';
import { useDownloadFile } from '@/hooks/useFiles';
import { apiClient } from '@/lib/api';

interface FilePreviewProps {
  file: File;
  isOpen: boolean;
  onClose: () => void;
  files?: File[]; // Array of all files for navigation
  currentIndex?: number; // Current file index
  onNavigate?: (direction: 'prev' | 'next') => void;
  caption?: string; // Optional caption describing what the document is for
}

export default function FilePreview({ 
  file, 
  isOpen, 
  onClose, 
  files = [], 
  currentIndex = 0, 
  onNavigate,
  caption
}: FilePreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { downloadFile } = useDownloadFile();

  // Reset zoom and position when file changes

  useEffect(() => {
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
    setImageError(false);
    setPreviewUrl(null);
    // Fetch presigned URL for preview
    (async () => {
      try {
        const res = await apiClient.get<{ download_url: string }>(`/files/${file.id}/download`);
        if (res && (res as any).download_url) {
          setPreviewUrl((res as any).download_url);
        } else if ((res as any).url) {
          // Fallback if backend uses 'url'
          setPreviewUrl((res as any).url);
        }
      } catch (e) {
        setImageError(true);
      }
    })();
  }, [file.id]);

  if (!isOpen) return null;

  const handleDownload = () => {
    downloadFile(file.id, file.original_filename);
  };

  const getPreviewUrl = () => previewUrl || '';

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (imageZoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
    }
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageZoom > 1) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleImageMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = useCallback(() => {
    setImageZoom(prev => Math.min(prev * 1.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setImageZoom(prev => {
      const newZoom = Math.max(prev / 1.5, 1);
      if (newZoom === 1) {
        setImagePosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        if (onNavigate && currentIndex > 0) {
          onNavigate('prev');
        }
        break;
      case 'ArrowRight':
        if (onNavigate && currentIndex < files.length - 1) {
          onNavigate('next');
        }
        break;
      case '+':
      case '=':
        if (file.mime_type.startsWith('image/')) {
          handleZoomIn();
        }
        break;
      case '-':
        if (file.mime_type.startsWith('image/')) {
          handleZoomOut();
        }
        break;
    }
  }, [isOpen, onClose, onNavigate, currentIndex, files.length, file.mime_type, handleZoomIn, handleZoomOut]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const renderPreview = () => {
    if (file.mime_type.startsWith('image/') && !imageError) {
      if (!previewUrl) {
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
          </div>
        );
      }
      return (
        <div 
          className="flex items-center justify-center h-full overflow-hidden cursor-move"
          onMouseDown={handleImageMouseDown}
          onMouseMove={handleImageMouseMove}
          onMouseUp={handleImageMouseUp}
          onMouseLeave={handleImageMouseUp}
        >
          <img
            src={getPreviewUrl()}
            alt={file.original_filename}
            className="object-contain transition-transform duration-200 select-none"
            style={{
              transform: `scale(${imageZoom}) translate(${imagePosition.x / imageZoom}px, ${imagePosition.y / imageZoom}px)`,
              cursor: imageZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
            onError={() => setImageError(true)}
            draggable={false}
          />
        </div>
      );
    }

    if (file.mime_type === 'application/pdf') {
      if (!previewUrl) {
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
          </div>
        );
      }
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
      if (!previewUrl) {
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
          </div>
        );
      }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="relative max-w-6xl w-full bg-white rounded-lg shadow-xl overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Navigation buttons */}
            {onNavigate && files.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onNavigate('prev')}
                  disabled={currentIndex === 0}
                  className="p-2 text-gray-600 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                  title="Previous file (←)"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <span className="text-sm text-gray-500 px-2">
                  {currentIndex + 1} of {files.length}
                </span>
                <button
                  onClick={() => onNavigate('next')}
                  disabled={currentIndex === files.length - 1}
                  className="p-2 text-gray-600 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                  title="Next file (→)"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {file.original_filename}
              </h2>
              <p className="text-sm text-gray-500">
                {file.mime_type} • {Math.round(file.file_size / 1024)} KB
              </p>
              {caption && (
                <p className="text-xs text-gray-500 mt-0.5 truncate" title={caption}>
                  {caption}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {/* Zoom controls for images */}
            {file.mime_type.startsWith('image/') && !imageError && (
              <div className="flex items-center gap-1 mr-2">
                <button
                  onClick={handleZoomOut}
                  disabled={imageZoom <= 1}
                  className="p-2 text-gray-600 hover:text-gray-800 disabled:text-gray-300"
                  title="Zoom out (-)"
                >
                  <MagnifyingGlassMinusIcon className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-500 min-w-[3rem] text-center">
                  {Math.round(imageZoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  disabled={imageZoom >= 5}
                  className="p-2 text-gray-600 hover:text-gray-800 disabled:text-gray-300"
                  title="Zoom in (+)"
                >
                  <MagnifyingGlassPlusIcon className="h-4 w-4" />
                </button>
              </div>
            )}
            
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
              title="Close (Esc)"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="h-[calc(100%-80px)] overflow-auto bg-gray-100 flex items-center justify-center">
          {renderPreview()}
          
          {/* Enhanced navigation buttons for better visibility */}
          {files.length > 1 && onNavigate && (
            <>
              <button
                onClick={() => onNavigate('prev')}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-md z-10 hover:bg-gray-100 disabled:opacity-50"
                disabled={currentIndex === 0}
                title="Previous file"
              >
                <ChevronLeftIcon className="h-6 w-6" />
              </button>
              <button
                onClick={() => onNavigate('next')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-md z-10 hover:bg-gray-100 disabled:opacity-50"
                disabled={currentIndex === files.length - 1}
                title="Next file"
              >
                <ChevronRightIcon className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}