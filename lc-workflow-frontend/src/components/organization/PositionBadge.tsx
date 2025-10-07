'use client';

import { Network } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PositionBadgeProps {
  position: {
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

export function PositionBadge({ 
  position, 
  size = 'md', 
  showIcon = true, 
  showCode = false,
  className 
}: PositionBadgeProps) {
  if (!position) {
    return (
      <div className={cn(
        'inline-flex items-center text-gray-400',
        sizeStyles[size].container,
        className
      )}>
        <span>No position</span>
      </div>
    );
  }

  const sizeStyle = sizeStyles[size];

  return (
    <div className={cn(
      'inline-flex items-center bg-purple-50 text-purple-700 border border-purple-200 rounded-lg font-medium',
      sizeStyle.container,
      className
    )}>
      {showIcon && (
        <Network className={cn('text-purple-600', sizeStyle.icon)} />
      )}
      <div className={cn('flex flex-col', sizeStyle.spacing)}>
        <span>{position.name}</span>
        {showCode && position.code && (
          <span className="text-xs text-purple-600 font-mono">{position.code}</span>
        )}
      </div>
    </div>
  );
}
