import React from 'react';
import { cn } from '@/lib/utils';

// Base loading spinner component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <div className={cn('animate-spin rounded-full border-2 border-gray-300 border-t-blue-600', sizeClasses[size], className)} />
  );
};

// Loading dots animation
export const LoadingDots: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex space-x-1', className)}>
    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
  </div>
);

// Skeleton loader component
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height,
  rounded = false
}) => (
  <div
    className={cn(
      'animate-pulse bg-gray-200 dark:bg-gray-700',
      rounded && 'rounded',
      className
    )}
    style={{ width, height }}
  />
);

// Text skeleton
export const TextSkeleton: React.FC<{
  lines?: number;
  className?: string;
  width?: string[];
}> = ({ lines = 1, className, width = [] }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton
        key={i}
        height="h-4"
        width={width[i] || (i === lines - 1 ? 'w-3/4' : 'w-full')}
        className="mb-2"
      />
    ))}
  </div>
);

// Card skeleton
export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border', className)}>
    <div className="flex items-center space-x-4 mb-4">
      <Skeleton width={40} height={40} rounded />
      <div className="flex-1">
        <TextSkeleton lines={2} />
      </div>
    </div>
    <TextSkeleton lines={3} />
  </div>
);

// Table skeleton
export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className }) => (
  <div className={cn('space-y-3', className)}>
    {Array.from({ length: rows }, (_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4">
        {Array.from({ length: columns }, (_, colIndex) => (
          <Skeleton
            key={colIndex}
            height="h-8"
            width={`${100 / columns}%`}
          />
        ))}
      </div>
    ))}
  </div>
);

// List skeleton
export const ListSkeleton: React.FC<{
  items?: number;
  className?: string;
}> = ({ items = 5, className }) => (
  <div className={cn('space-y-3', className)}>
    {Array.from({ length: items }, (_, i) => (
      <div key={i} className="flex items-center space-x-3 p-3">
        <Skeleton width={32} height={32} rounded />
        <div className="flex-1">
          <TextSkeleton lines={1} width={['w-1/3']} />
        </div>
      </div>
    ))}
  </div>
);

// Full page loading
export const PageLoading: React.FC<{
  message?: string;
  className?: string;
}> = ({ message = 'Loading...', className }) => (
  <div className={cn('min-h-screen flex items-center justify-center', className)}>
    <div className="text-center">
      <LoadingSpinner size="xl" className="mx-auto mb-4" />
      <p className="text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  </div>
);

// Inline loading
export const InlineLoading: React.FC<{
  message?: string;
  className?: string;
}> = ({ message = 'Loading...', className }) => (
  <div className={cn('flex items-center space-x-2', className)}>
    <LoadingSpinner size="sm" />
    <span className="text-sm text-gray-600 dark:text-gray-400">{message}</span>
  </div>
);

// Button loading state
export const ButtonLoading: React.FC<{
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
}> = ({ children, loading = false, className }) => (
  <button
    disabled={loading}
    className={cn(
      'inline-flex items-center space-x-2',
      loading && 'cursor-not-allowed opacity-75',
      className
    )}
  >
    {loading && <LoadingSpinner size="sm" />}
    <span>{children}</span>
  </button>
);

// Form field loading
export const FieldLoading: React.FC<{
  label?: string;
  className?: string;
}> = ({ label = 'Loading...', className }) => (
  <div className={cn('space-y-2', className)}>
    {label && (
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
    )}
    <div className="relative">
      <Skeleton height="h-10" className="w-full" />
      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
        <LoadingSpinner size="sm" />
      </div>
    </div>
  </div>
);

// Dashboard skeleton
export const DashboardSkeleton: React.FC = () => (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <TextSkeleton lines={1} width={['w-48']} />
      <Skeleton width={120} height={32} />
    </div>

    {/* Stats cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>

    {/* Chart area */}
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
      <TextSkeleton lines={1} width={['w-32']} className="mb-4" />
      <Skeleton height="h-64" className="w-full" />
    </div>

    {/* Table */}
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
      <TextSkeleton lines={1} width={['w-40']} className="mb-4" />
      <TableSkeleton rows={5} columns={4} />
    </div>
  </div>
);

// Application form skeleton
export const ApplicationFormSkeleton: React.FC = () => (
  <div className="max-w-4xl mx-auto p-6 space-y-8">
    {/* Form header */}
    <div className="text-center">
      <TextSkeleton lines={1} width={['w-64']} className="mx-auto mb-2" />
      <TextSkeleton lines={1} width={['w-96']} className="mx-auto" />
    </div>

    {/* Progress indicator */}
    <div className="flex justify-center space-x-2">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} width={40} height={8} rounded />
      ))}
    </div>

    {/* Form sections */}
    <div className="space-y-6">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>

    {/* Navigation buttons */}
    <div className="flex justify-between">
      <Skeleton width={100} height={40} />
      <Skeleton width={100} height={40} />
    </div>
  </div>
);

// File explorer skeleton
export const FileExplorerSkeleton: React.FC = () => (
  <div className="space-y-4">
    {/* Toolbar */}
    <div className="flex space-x-2">
      <Skeleton width={80} height={32} />
      <Skeleton width={100} height={32} />
      <Skeleton width={90} height={32} />
    </div>

    {/* Breadcrumb */}
    <div className="flex space-x-2">
      <Skeleton width={60} height={24} />
      <Skeleton width={8} height={24} />
      <Skeleton width={80} height={24} />
      <Skeleton width={8} height={24} />
      <Skeleton width={70} height={24} />
    </div>

    {/* File list */}
    <ListSkeleton items={8} />
  </div>
);

// Chat/message skeleton
export const ChatSkeleton: React.FC = () => (
  <div className="space-y-4 max-w-2xl">
    {Array.from({ length: 3 }, (_, i) => (
      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${i % 2 === 0 ? 'bg-gray-200 dark:bg-gray-700' : 'bg-blue-500'}`}>
          <TextSkeleton lines={2} width={['w-full', 'w-3/4']} />
        </div>
      </div>
    ))}
  </div>
);

// Mobile-specific loading states
export const MobileLoadingStates = {
  Card: ({ className }: { className?: string }) => (
    <div className={cn('p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border', className)}>
      <div className="flex items-center space-x-3 mb-3">
        <Skeleton width={40} height={40} rounded />
        <div className="flex-1">
          <TextSkeleton lines={1} width={['w-2/3']} />
        </div>
      </div>
      <TextSkeleton lines={2} />
    </div>
  ),

  ListItem: ({ className }: { className?: string }) => (
    <div className={cn('flex items-center space-x-3 p-3 border-b', className)}>
      <Skeleton width={48} height={48} rounded />
      <div className="flex-1">
        <TextSkeleton lines={1} width={['w-3/4']} className="mb-1" />
        <TextSkeleton lines={1} width={['w-1/2']} />
      </div>
      <LoadingSpinner size="sm" />
    </div>
  ),

  FullScreen: ({ message = 'Loading...' }: { message?: string }) => (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="text-center">
        <LoadingSpinner size="xl" className="mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 text-lg">{message}</p>
      </div>
    </div>
  ),
};

const LoadingStates = {
  LoadingSpinner,
  LoadingDots,
  Skeleton,
  TextSkeleton,
  CardSkeleton,
  TableSkeleton,
  ListSkeleton,
  PageLoading,
  InlineLoading,
  ButtonLoading,
  FieldLoading,
  DashboardSkeleton,
  ApplicationFormSkeleton,
  FileExplorerSkeleton,
  ChatSkeleton,
  MobileLoadingStates,
};

export default LoadingStates;