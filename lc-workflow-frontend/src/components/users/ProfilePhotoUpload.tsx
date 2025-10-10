'use client';

import React, { useState, useRef } from 'react';
import { Camera, Loader2, Check, AlertCircle } from 'lucide-react';
import { UserAvatar } from './OptimizedAvatar';

interface ProfilePhotoUploadProps {
  userId: string;
  currentPhotoUrl?: string | null;
  userName: string;
  userInitials: string;
  onUploadSuccess?: (urls: any) => void;
  onUploadError?: (error: string) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
}

/**
 * ProfilePhotoUpload Component
 * 
 * Features:
 * - Drag and drop support
 * - File validation (size, type)
 * - Upload progress
 * - Preview before upload
 * - Delete existing photo
 * - Optimized image handling
 */
export default function ProfilePhotoUpload({
  userId,
  currentPhotoUrl,
  userName,
  userInitials,
  onUploadSuccess,
  onUploadError,
  size = 'xl',
  editable = true
}: ProfilePhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)';
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 10MB';
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setSuccess(false);

    try {
      // Get auth token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

      if (!token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/v1/users/${userId}/profile-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload photo');
      }

      const data = await response.json();

      setSuccess(true);
      setUploadProgress(100);

      if (onUploadSuccess) {
        onUploadSuccess(data);
      }

      // Clear preview after successful upload
      setTimeout(() => {
        setPreviewUrl(null);
        setSuccess(false);
      }, 2000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload photo';
      setError(errorMessage);

      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your profile photo?')) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Get auth token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

      if (!token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const response = await fetch(`/api/v1/users/${userId}/profile-photo`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete photo');
      }

      setSuccess(true);

      if (onUploadSuccess) {
        onUploadSuccess({ urls: {}, primary_url: null });
      }

      setTimeout(() => {
        setSuccess(false);
      }, 2000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete photo';
      setError(errorMessage);

      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!editable) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleClick = () => {
    if (editable && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Avatar with upload overlay */}
      <div
        className="relative group cursor-pointer"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleClick}
      >
        <UserAvatar
          user={{
            first_name: userName.split(' ')[0],
            last_name: userName.split(' ')[1],
            profile_image_url: previewUrl || currentPhotoUrl
          }}
          alt={userName}
          size={size}
          priority={true}
          lazy={false}
        />

        {/* Upload overlay */}
        {editable && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            {isUploading ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : success ? (
              <Check className="h-6 w-6 text-green-400" />
            ) : (
              <Camera className="h-6 w-6 text-white" />
            )}
          </div>
        )}

        {/* Upload progress ring */}
        {isUploading && uploadProgress > 0 && (
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="2"
            />
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - uploadProgress / 100)}`}
              className="transition-all duration-300"
            />
          </svg>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Error message */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 text-sm">
          <Check className="h-4 w-4" />
          <span>Photo updated successfully!</span>
        </div>
      )}

      {/* Upload instructions */}
      {editable && !isUploading && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs">
          Hover and click or drag & drop to upload<br />
          JPEG, PNG, GIF, or WebP (max 10MB)
        </p>
      )}
    </div>
  );
}
