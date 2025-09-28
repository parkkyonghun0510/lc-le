'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  khmerTitle?: string;
  subtitle?: string;
  variant?: 'primary' | 'success' | 'warning' | 'info' | 'purple';
  className?: string;
}

const variantStyles = {
  primary: {
    background: 'bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20',
    iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    titleColor: 'text-blue-600 dark:text-blue-400'
  },
  success: {
    background: 'bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20',
    iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
    titleColor: 'text-green-600 dark:text-green-400'
  },
  warning: {
    background: 'bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-red-900/20',
    iconBg: 'bg-gradient-to-br from-amber-500 to-red-600',
    titleColor: 'text-amber-600 dark:text-amber-400'
  },
  info: {
    background: 'bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 dark:from-teal-900/20 dark:via-cyan-900/20 dark:to-blue-900/20',
    iconBg: 'bg-gradient-to-br from-teal-500 to-blue-600',
    titleColor: 'text-teal-600 dark:text-teal-400'
  },
  purple: {
    background: 'bg-gradient-to-r from-purple-50 via-violet-50 to-fuchsia-50 dark:from-purple-900/20 dark:via-violet-900/20 dark:to-fuchsia-900/20',
    iconBg: 'bg-gradient-to-br from-purple-500 to-violet-600',
    titleColor: 'text-purple-600 dark:text-purple-400'
  }
};

export function SectionHeader({ 
  icon, 
  title, 
  khmerTitle, 
  subtitle,
  variant = 'primary',
  className 
}: SectionHeaderProps) {
  const styles = variantStyles[variant];

  return (
    <div className={cn(
      'px-6 py-6 border-b border-gray-200 dark:border-gray-600',
      styles.background,
      className
    )}>
      <div className="flex items-center space-x-4">
        <div className={cn(
          'flex items-center justify-center w-12 h-12 rounded-2xl shadow-lg',
          styles.iconBg
        )}>
          <div className="w-6 h-6 text-white">
            {icon}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          {khmerTitle && (
            <p className={cn('text-base font-medium', styles.titleColor)}>
              {khmerTitle}
            </p>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}