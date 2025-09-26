import React from 'react';
import { UserStatus } from '@/types/models';

interface StatusIndicatorProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    description: 'Account created, awaiting activation'
  },
  active: {
    label: 'Active',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    description: 'User is active and can access the system'
  },
  inactive: {
    label: 'Inactive',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    description: 'User is temporarily inactive'
  },
  suspended: {
    label: 'Suspended',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    description: 'User account is suspended'
  },
  archived: {
    label: 'Archived',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    description: 'User account is archived'
  }
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, className = '' }) => {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active;
  
  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
        config.bgColor
      } ${config.textColor} ${className}`}
      title={config.description}
    >
      {config.label}
    </span>
  );
};

export default StatusIndicator;