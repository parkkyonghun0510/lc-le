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
    
    if (mimeType.includes('image')) return <PhotoIcon className="h-8 w-8 text-blue-400" />;
    if (mimeType.includes('pdf')) return <DocumentIcon className="h-8 w-8 text-red-400" />;
    if (mimeType.includes('video')) return <FilmIcon className="h-8 w-8 text-purple-400" />;
    if (mimeType.includes('audio')) return <MusicalNoteIcon className="h-8 w-8 text-green-400" />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('csv')) 
      return <TableCellsIcon className="h-8 w-8 text-green-600" />;
    if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html') || mimeType.includes('css')) 
      return <CodeBracketIcon className="h-8 w-8 text-gray-600" />;
    
    return <DocumentIcon className="h-8 w-8 text-gray-400" />;
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
      className={`relative ${sizeClasses[size]} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {isImage && !hasError ? (
        <div className="relative w-full h-full">
          {/* Loading skeleton */}
          {isLoading && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
              <PhotoIcon className="h-6 w-6 text-gray-400" />
            </div>
          )}
          
          {/* Thumbnail image */}
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt={file.original_filename}
              className={`w-full h-full object-cover rounded-lg shadow-sm border border-gray-200 transition-opacity duration-200 ${
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
            <div className="absolute z-20 left-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-1">
              <img
                src={thumbnailUrl}
                alt={file.original_filename}
                className="object-contain rounded-md"
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
        <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
          {getFileIcon()}
        </div>
      )}

      {/* File name overlay */}
      {showFileName && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg">
          <p className="truncate" title={file.original_filename}>
            {file.original_filename}
          </p>
        </div>
      )}

      {/* Image type indicator */}
      {isImage && (
        <div className="absolute top-1 right-1 bg-purple-500 text-white text-xs px-1 py-0.5 rounded">
          IMG
        </div>
      )}
    </div>
  );
}
