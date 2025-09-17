'use client';

import React from 'react';
import { format } from 'date-fns';
import { CheckCircleIcon, ClockIcon, XCircleIcon, UserIcon } from '@heroicons/react/24/outline';
import { WorkflowHistoryEntry as WorkflowHistoryType, WorkflowStatus } from '@/types/models';
import { useWorkflowHistory } from '@/hooks/useApplications';
import { cn } from '@/lib/utils';

interface WorkflowHistoryProps {
  applicationId: string;
  className?: string;
}

interface HistoryItemProps {
  item: WorkflowHistoryType;
  isLast: boolean;
}

const getStatusIcon = (status: WorkflowStatus) => {
  switch (status) {
    case 'APPROVED':
      return <CheckCircleIcon className="h-5 w-5 text-success" />;
    case 'REJECTED':
      return <XCircleIcon className="h-5 w-5 text-error" />;
    case 'PO_CREATED':
    case 'USER_COMPLETED':
    case 'TELLER_PROCESSING':
    case 'MANAGER_REVIEW':
      return <ClockIcon className="h-5 w-5 text-warning" />;
    default:
      return <UserIcon className="h-5 w-5 text-gray-400" />;
  }
};

const getStatusLabel = (status: WorkflowStatus): string => {
  switch (status) {
    case 'PO_CREATED':
      return 'Application Created';
    case 'USER_COMPLETED':
      return 'User Completed';
    case 'TELLER_PROCESSING':
      return 'Teller Processing';
    case 'MANAGER_REVIEW':
      return 'Manager Review';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    default:
      return status;
  }
};

const getStatusColor = (status: WorkflowStatus): string => {
  switch (status) {
    case 'APPROVED':
      return 'text-success';
    case 'REJECTED':
      return 'text-error';
    case 'PO_CREATED':
    case 'USER_COMPLETED':
    case 'TELLER_PROCESSING':
    case 'MANAGER_REVIEW':
      return 'text-warning';
    default:
      return 'text-gray-500';
  }
};

const HistoryItem: React.FC<HistoryItemProps> = ({ item, isLast }) => {
  return (
    <div className="relative flex items-start space-x-3 pb-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-4 top-8 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
      )}
      
      {/* Status icon */}
      <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
        {getStatusIcon(item.status)}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={cn('text-sm font-medium', getStatusColor(item.status))}>
            {getStatusLabel(item.status)}
          </p>
          <time className="text-xs text-gray-500 dark:text-gray-400">
            {format(new Date(item.timestamp), 'MMM d, yyyy HH:mm')}
          </time>
        </div>
        
        {item.user_name && (
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
            by {item.user_name}
          </p>
        )}
        
        {item.notes && (
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 bg-gray-50 dark:bg-gray-800 p-2 rounded">
            {item.notes}
          </p>
        )}
        
        {/* Metadata section removed as it's not part of WorkflowHistoryEntry interface */}
      </div>
    </div>
  );
};

export const WorkflowHistory: React.FC<WorkflowHistoryProps> = ({ 
  applicationId, 
  className 
}) => {
  const { data: history, isLoading, error } = useWorkflowHistory(applicationId);

  if (isLoading) {
    return (
      <div className={cn('p-4', className)}>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3">
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('p-4 text-center', className)}>
        <p className="text-error text-sm">Failed to load workflow history</p>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className={cn('p-4 text-center', className)}>
        <p className="text-gray-500 dark:text-gray-400 text-sm">No workflow history available</p>
      </div>
    );
  }

  return (
    <div className={cn('p-4', className)}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Workflow History
      </h3>
      
      <div className="space-y-0">
        {history.map((item, index) => (
          <HistoryItem 
            key={`${item.status}-${item.timestamp}`} 
            item={item} 
            isLast={index === history.length - 1}
          />
        ))}
      </div>
    </div>
  );
};

export default WorkflowHistory;