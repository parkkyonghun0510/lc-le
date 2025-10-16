'use client';

import { User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserManagerBadgeProps {
  manager: {
    id: string;
    // User fields (legacy)
    first_name?: string;
    last_name?: string;
    username?: string;
    phone_number?: string;
    // Employee fields (new)
    full_name_latin?: string;
    full_name_khmer?: string;
    employee_code?: string;
  } | null | undefined;
  type: 'portfolio' | 'line_manager';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showPhone?: boolean;
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

const typeConfig = {
  portfolio: {
    label: 'Portfolio Manager',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600'
  },
  line_manager: {
    label: 'Line Manager',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600'
  }
};

export function UserManagerBadge({ 
  manager, 
  type,
  size = 'md', 
  showIcon = true, 
  showPhone = false,
  className 
}: UserManagerBadgeProps) {
  if (!manager) {
    return (
      <div className={cn(
        'inline-flex items-center text-gray-400',
        sizeStyles[size].container,
        className
      )}>
        <span>No {type === 'portfolio' ? 'portfolio manager' : 'line manager'}</span>
      </div>
    );
  }

  const sizeStyle = sizeStyles[size];
  const config = typeConfig[type];

  // Determine if this is an Employee or User object
  const isEmployee = !!manager.employee_code;
  const displayName = isEmployee 
    ? manager.full_name_latin 
    : `${manager.first_name} ${manager.last_name}`;
  const displayCode = isEmployee 
    ? manager.employee_code 
    : manager.username;

  return (
    <div className={cn(
      'inline-flex items-center border rounded-lg font-medium',
      config.bgColor,
      config.textColor,
      config.borderColor,
      sizeStyle.container,
      className
    )}>
      {showIcon && (
        <User className={cn(config.iconColor, sizeStyle.icon)} />
      )}
      <div className={cn('flex flex-col', sizeStyle.spacing)}>
        <span className="font-semibold">
          {displayName}
        </span>
        <span className="text-xs opacity-75">
          {isEmployee ? `Code: ${displayCode}` : `@${displayCode}`}
        </span>
        {showPhone && manager.phone_number && (
          <span className="text-xs opacity-75">{manager.phone_number}</span>
        )}
      </div>
    </div>
  );
}
