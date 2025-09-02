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
          className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-3"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          Download File
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative max-w-6xl w-full bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden max-h-[90vh] transform transition-all duration-300 scale-100 hover:scale-[1.01]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50/80 to-white/80 dark:from-gray-800/80 dark:to-gray-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Navigation buttons */}
            {onNavigate && files.length > 1 && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl p-2 border border-gray-300 dark:border-gray-600">
                <button
                  onClick={() => onNavigate('prev')}
                  disabled={currentIndex === 0}
                  className="group p-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed rounded-lg hover:bg-white/50 dark:hover:bg-gray-600/50 transition-all duration-200"
                  title="Previous file (←)"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 px-3 py-1 bg-white/60 dark:bg-gray-600/60 rounded-lg">
                  {currentIndex + 1} of {files.length}
                </span>
                <button
                  onClick={() => onNavigate('next')}
                  disabled={currentIndex === files.length - 1}
                  className="group p-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed rounded-lg hover:bg-white/50 dark:hover:bg-gray-600/50 transition-all duration-200"
                  title="Next file (→)"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                {file.original_filename}
              </h2>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {file.mime_type} • {Math.round(file.file_size / 1024)} KB
              </p>
              {caption && (
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 truncate bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-2 py-1 rounded-lg border border-blue-200/50 dark:border-blue-700/50" title={caption}>
                  {caption}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 ml-4">
            {/* Zoom controls for images */}
            {file.mime_type.startsWith('image/') && !imageError && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl p-2 border border-gray-300 dark:border-gray-600">
                <button
                  onClick={handleZoomOut}
                  disabled={imageZoom <= 1}
                  className="group p-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 disabled:text-gray-300 dark:disabled:text-gray-600 rounded-lg hover:bg-white/50 dark:hover:bg-gray-600/50 transition-all duration-200"
                  title="Zoom out (-)"
                >
                  <MagnifyingGlassMinusIcon className="h-4 w-4" />
                </button>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 min-w-[3rem] text-center px-2 py-1 bg-white/60 dark:bg-gray-600/60 rounded-lg">
                  {Math.round(imageZoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  disabled={imageZoom >= 5}
                  className="group p-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 disabled:text-gray-300 dark:disabled:text-gray-600 rounded-lg hover:bg-white/50 dark:hover:bg-gray-600/50 transition-all duration-200"
                  title="Zoom in (+)"
                >
                  <MagnifyingGlassPlusIcon className="h-4 w-4" />
                </button>
              </div>
            )}
            
            <button
              onClick={handleDownload}
              className="group p-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
              title="Download"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="group p-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
              title="Close (Esc)"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="h-[calc(100%-96px)] overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
          {renderPreview()}
          
          {/* Enhanced navigation buttons for better visibility */}
          {files.length > 1 && onNavigate && (
            <>
              <button
                onClick={() => onNavigate('prev')}
                className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-full shadow-xl border border-gray-200 dark:border-gray-600 z-10 hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-600 dark:hover:to-gray-700 disabled:opacity-50 transition-all duration-200 hover:scale-110"
                disabled={currentIndex === 0}
                title="Previous file"
              >
                <ChevronLeftIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
              </button>
              <button
                onClick={() => onNavigate('next')}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-full shadow-xl border border-gray-200 dark:border-gray-600 z-10 hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-600 dark:hover:to-gray-700 disabled:opacity-50 transition-all duration-200 hover:scale-110"
                disabled={currentIndex === files.length - 1}
                title="Next file"
              >
                <ChevronRightIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}