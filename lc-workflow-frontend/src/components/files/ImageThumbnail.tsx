'use client';

import { useEffect, useState } from 'react';
import { File } from '@/types/models';
import { PhotoIcon, DocumentIcon, MusicalNoteIcon, FilmIcon, CodeBracketIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';
import { useFileThumbnail } from '@/hooks/useFiles';

interface ImageThumbnailProps {
  file: File;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  showFileName?: boolean;
  enableHoverPreview?: boolean;
}

export default function ImageThumbnail({ 
  file, 
  size = 'md', 
  className = '', 
  onClick, 
  showFileName = false,
  enableHoverPreview = false,
}: ImageThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  // Use the thumbnail hook with size key
  const sizeKey: 'sm' | 'md' | 'lg' = size;
  const { data: thumbnailUrl, isLoading: isThumbnailLoading } = useFileThumbnail(file.id, sizeKey);
  
  useEffect(() => {
    setIsLoading(isThumbnailLoading);
    setHasError(!thumbnailUrl && !isThumbnailLoading);
  }, [thumbnailUrl, isThumbnailLoading]);
  
  const getFileIcon = () => {
    const mimeType = file.mime_type.toLowerCase();
    
    if (mimeType.includes('image')) return <PhotoIcon className="h-8 w-8 text-blue-500 dark:text-blue-400" />;
    if (mimeType.includes('pdf')) return <DocumentIcon className="h-8 w-8 text-red-500 dark:text-red-400" />;
    if (mimeType.includes('video')) return <FilmIcon className="h-8 w-8 text-purple-500 dark:text-purple-400" />;
    if (mimeType.includes('audio')) return <MusicalNoteIcon className="h-8 w-8 text-green-500 dark:text-green-400" />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('csv')) 
      return <TableCellsIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />;
    if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html') || mimeType.includes('css')) 
      return <CodeBracketIcon className="h-8 w-8 text-gray-600 dark:text-gray-400" />;
    
    return <DocumentIcon className="h-8 w-8 text-gray-500 dark:text-gray-400" />;
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const isImage = file.mime_type.startsWith('image/');

  return (
    <div 
      className={`relative ${sizeClasses[size]} ${className} ${onClick ? 'cursor-pointer group' : ''} transition-all duration-200 hover:scale-105`}
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {isImage && !hasError ? (
        <div className="relative w-full h-full">
          {/* Loading skeleton */}
          {isLoading && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 animate-pulse rounded-xl flex items-center justify-center shadow-sm">
              <PhotoIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
            </div>
          )}
          
          {/* Thumbnail image */}
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt={file.original_filename}
              className={`w-full h-full object-cover rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 transition-all duration-200 group-hover:shadow-xl ${
                isLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
              decoding="async"
            />
          )}

          {/* Hover large preview */}
          {enableHoverPreview && isHovering && thumbnailUrl && (
            <div className="absolute z-20 left-0 top-full mt-2 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-600 p-2 backdrop-blur-sm">
              <img
                src={thumbnailUrl}
                alt={file.original_filename}
                className="object-contain rounded-lg shadow-sm"
                style={{ width: size === 'lg' ? 256 : 192, height: size === 'lg' ? 256 : 192 }}
                loading="lazy"
                decoding="async"
                onError={handleImageError}
              />
            </div>
          )}
        </div>
      ) : (
        /* Non-image file icon */
        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-600 shadow-sm group-hover:shadow-lg transition-all duration-200">
          <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg backdrop-blur-sm">
            {getFileIcon()}
          </div>
        </div>
      )}

      {/* File name overlay */}
      {showFileName && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs p-2 rounded-b-xl backdrop-blur-sm">
          <p className="truncate font-medium" title={file.original_filename}>
            {file.original_filename}
          </p>
        </div>
      )}

      {/* Image type indicator */}
      {isImage && (
        <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs px-2 py-1 rounded-full shadow-lg backdrop-blur-sm font-medium">
          IMG
        </div>
      )}
    </div>
  );
}
