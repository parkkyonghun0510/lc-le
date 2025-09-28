'use client';

import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils';

interface InfoCardProps {
  icon: ReactNode;
  label: string;
  khmerLabel?: string;
  value: string | ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}

const variantStyles = {
  default: {
    container: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
    iconBg: 'bg-gray-500',
    labelColor: 'text-gray-700 dark:text-gray-300'
  },
  primary: {
    container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50',
    iconBg: 'bg-blue-500',
    labelColor: 'text-blue-700 dark:text-blue-300'
  },
  success: {
    container: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50',
    iconBg: 'bg-green-500',
    labelColor: 'text-green-700 dark:text-green-300'
  },
  warning: {
    container: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700/50',
    iconBg: 'bg-orange-500',
    labelColor: 'text-orange-700 dark:text-orange-300'
  },
  error: {
    container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50',
    iconBg: 'bg-red-500',
    labelColor: 'text-red-700 dark:text-red-300'
  }
};

export function InfoCard({ 
  icon, 
  label, 
  khmerLabel, 
  value, 
  variant = 'default',
  className 
}: InfoCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card 
      variant="outlined" 
      padding="md"
      className={cn(
        'group hover:shadow-md transition-all duration-200 hover:scale-[1.02]',
        styles.container,
        className
      )}
    >
      <CardContent className="p-0">
        <div className="flex items-start space-x-4">
          <div className={cn(
            'p-3 rounded-xl shadow-md group-hover:shadow-lg transition-shadow',
            styles.iconBg
          )}>
            <div className="w-5 h-5 text-white">
              {icon}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <p className={cn(
                'text-sm font-semibold uppercase tracking-wide',
                styles.labelColor
              )}>
                {label}
              </p>
              <div className={cn('h-1 w-1 rounded-full', styles.iconBg.replace('bg-', 'bg-').replace('-500', '-400'))}></div>
            </div>
            {khmerLabel && (
              <p className={cn(
                'text-xs font-medium mb-3',
                styles.labelColor.replace('-700', '-600').replace('-300', '-400')
              )}>
                {khmerLabel}
              </p>
            )}
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {value}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}