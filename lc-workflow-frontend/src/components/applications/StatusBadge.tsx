'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  icon: ReactNode;
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantStyles = {
  default: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700',
  success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700',
  warning: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700',
  error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700',
  info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700'
};

const sizeStyles = {
  sm: {
    container: 'px-3 py-1.5 text-xs',
    icon: 'w-3 h-3 mr-1.5'
  },
  md: {
    container: 'px-4 py-2 text-sm',
    icon: 'w-4 h-4 mr-2'
  },
  lg: {
    container: 'px-5 py-3 text-base',
    icon: 'w-5 h-5 mr-3'
  }
};

export function StatusBadge({ 
  status, 
  icon, 
  label, 
  variant = 'default',
  size = 'md',
  className 
}: StatusBadgeProps) {
  const sizeStyle = sizeStyles[size];

  return (
    <div className={cn(
      'relative inline-flex items-center justify-center rounded-xl border-2 shadow-lg backdrop-blur-sm font-semibold',
      variantStyles[variant],
      sizeStyle.container,
      className
    )}>
      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-xl"></div>
      <div className={cn('relative z-10 flex-shrink-0', sizeStyle.icon)}>
        {icon}
      </div>
      <span className="relative z-10">{label}</span>
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-current rounded-full opacity-60 animate-pulse"></div>
    </div>
  );
}