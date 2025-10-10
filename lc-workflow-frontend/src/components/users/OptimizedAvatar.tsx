'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User } from 'lucide-react';

interface OptimizedAvatarProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallbackInitials?: string;
  className?: string;
  lazy?: boolean;
  priority?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg'
};

/**
 * OptimizedAvatar Component
 * 
 * Features:
 * - Lazy loading with Intersection Observer
 * - Responsive image loading with srcset
 * - Fallback to initials or icon
 * - Loading state with skeleton
 * - Error handling with fallback
 * - CDN-optimized image URLs
 */
export default function OptimizedAvatar({
  src,
  alt,
  size = 'md',
  fallbackInitials,
  className = '',
  lazy = true,
  priority = false
}: OptimizedAvatarProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!lazy || priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [lazy, priority, shouldLoad]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  // Handle image error
  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
  };

  // Generate srcset for responsive images
  const generateSrcSet = (baseUrl: string) => {
    if (!baseUrl) return '';
    
    // If the URL contains size indicators, generate srcset
    const sizes = [
      { name: 'thumbnail', width: 64 },
      { name: 'medium', width: 128 },
      { name: 'large', width: 256 }
    ];

    return sizes
      .map(({ name, width }) => {
        const url = baseUrl.replace(/\/(thumbnail|medium|large|original)\//, `/${name}/`);
        return `${url} ${width}w`;
      })
      .join(', ');
  };

  // Determine which size to use based on component size
  const getImageSize = () => {
    switch (size) {
      case 'sm':
        return 'thumbnail';
      case 'md':
        return 'medium';
      case 'lg':
      case 'xl':
        return 'large';
      default:
        return 'medium';
    }
  };

  // Get optimized image URL
  const getOptimizedUrl = (url: string) => {
    if (!url) return url;
    
    const targetSize = getImageSize();
    // Replace size in URL if it exists
    return url.replace(/\/(thumbnail|medium|large|original)\//, `/${targetSize}/`);
  };

  const sizeClass = sizeClasses[size];
  const showImage = src && shouldLoad && !hasError;
  const showFallback = !src || hasError;

  return (
    <div
      ref={containerRef}
      className={`relative ${sizeClass} rounded-full overflow-hidden ${className}`}
    >
      {/* Loading skeleton */}
      {!isLoaded && shouldLoad && src && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 animate-pulse" />
      )}

      {/* Image */}
      {showImage && (
        <img
          ref={imgRef}
          src={getOptimizedUrl(src)}
          srcSet={generateSrcSet(src)}
          sizes={`${sizeClasses[size].match(/h-(\d+)/)?.[1] || 10}px`}
          alt={alt}
          loading={lazy && !priority ? 'lazy' : 'eager'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`
            ${sizeClass} 
            rounded-full 
            object-cover 
            transition-opacity 
            duration-300
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
          `}
        />
      )}

      {/* Fallback - Initials or Icon */}
      {showFallback && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          {fallbackInitials ? (
            <span className={`text-white font-semibold ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}`}>
              {fallbackInitials}
            </span>
          ) : (
            <User className={`text-white ${size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6'}`} />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to generate initials from name
 */
export function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return `${first}${last}` || '?';
}

/**
 * Avatar with automatic initials generation
 */
interface UserAvatarProps extends Omit<OptimizedAvatarProps, 'fallbackInitials'> {
  user: {
    first_name?: string;
    last_name?: string;
    profile_image_url?: string | null;
  };
}

export function UserAvatar({ user, alt, ...props }: UserAvatarProps) {
  const initials = getInitials(user.first_name, user.last_name);
  const avatarAlt = alt || `${user.first_name} ${user.last_name}`;

  return (
    <OptimizedAvatar
      src={user.profile_image_url}
      alt={avatarAlt}
      fallbackInitials={initials}
      {...props}
    />
  );
}
