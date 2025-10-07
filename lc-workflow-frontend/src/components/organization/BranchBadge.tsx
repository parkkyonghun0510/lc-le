'use client';

import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BranchBadgeProps {
  branch: {
    id: string;
    name: string;
    code?: string;
  } | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showCode?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: {
    container: 'px-2 py-1 text-xs',
    icon: 'h-3 w-3',
    spacing: 'space-x-1'
  },
  md: {
    container: 'px-3 py-1.5 text-sm',
    icon: 'h-4 w-4',
    spacing: 'space-x-2'
  },
  lg: {
    container: 'px-4 py-2 text-base',
    icon: 'h-5 w-5',
    spacing: 'space-x-3'
  }
};

export function BranchBadge({ 
  branch, 
  size = 'md', 
  showIcon = true, 
  showCode = false,
  className 
}: BranchBadgeProps) {
  if (!branch) {
    return (
      <div className={cn(
        'inline-flex items-center text-gray-400',
        sizeStyles[size].container,
        className
      )}>
        <span>No branch</span>
      </div>
    );
  }

  const sizeStyle = sizeStyles[size];

  return (
    <div className={cn(
      'inline-flex items-center bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-medium',
      sizeStyle.container,
      className
    )}>
      {showIcon && (
        <MapPin className={cn('text-blue-600', sizeStyle.icon)} />
      )}
      <div className={cn('flex flex-col', sizeStyle.spacing)}>
        <span>{branch.name}</span>
        {showCode && branch.code && (
          <span className="text-xs text-blue-600 font-mono">{branch.code}</span>
        )}
      </div>
    </div>
  );
}
