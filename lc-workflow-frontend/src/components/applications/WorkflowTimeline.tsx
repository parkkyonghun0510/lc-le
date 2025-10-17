'use client';

import React from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { formatDate } from '@/lib/utils';

interface WorkflowStep {
  id: string;
  label: string;
  khmerLabel: string;
  timestamp?: string;
  user?: string;
  status: 'completed' | 'current' | 'pending' | 'rejected';
}

interface WorkflowTimelineProps {
  workflowStatus?: string;
  priorityLevel?: string;
  assignedReviewer?: string;
  poCreatedAt?: string;
  userCompletedAt?: string;
  tellerProcessedAt?: string;
  managerReviewedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  status?: string;
}

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({
  workflowStatus,
  priorityLevel,
  assignedReviewer,
  poCreatedAt,
  userCompletedAt,
  tellerProcessedAt,
  managerReviewedAt,
  approvedAt,
  rejectedAt,
  status,
}) => {
  // Determine workflow steps based on status
  const steps: WorkflowStep[] = [
    {
      id: 'po_created',
      label: 'PO Created',
      khmerLabel: 'បង្កើតដោយ PO',
      timestamp: poCreatedAt,
      status: poCreatedAt ? 'completed' : 'pending',
    },
    {
      id: 'user_completed',
      label: 'User Completed',
      khmerLabel: 'បញ្ចប់ដោយអ្នកប្រើ',
      timestamp: userCompletedAt,
      status: userCompletedAt ? 'completed' : poCreatedAt ? 'current' : 'pending',
    },
    {
      id: 'teller_processing',
      label: 'Teller Processing',
      khmerLabel: 'ដំណើរការដោយ Teller',
      timestamp: tellerProcessedAt,
      status: tellerProcessedAt ? 'completed' : userCompletedAt ? 'current' : 'pending',
    },
    {
      id: 'manager_review',
      label: 'Manager Review',
      khmerLabel: 'ពិនិត្យដោយអ្នកគ្រប់គ្រង',
      timestamp: managerReviewedAt,
      status: managerReviewedAt ? 'completed' : tellerProcessedAt ? 'current' : 'pending',
    },
  ];

  // Add final step based on status
  if (status === 'approved' || approvedAt) {
    steps.push({
      id: 'approved',
      label: 'Approved',
      khmerLabel: 'អនុម័ត',
      timestamp: approvedAt,
      status: 'completed',
    });
  } else if (status === 'rejected' || rejectedAt) {
    steps.push({
      id: 'rejected',
      label: 'Rejected',
      khmerLabel: 'បដិសេធ',
      timestamp: rejectedAt,
      status: 'rejected',
    });
  } else {
    steps.push({
      id: 'final',
      label: 'Final Decision',
      khmerLabel: 'ការសម្រេចចុងក្រោយ',
      status: 'pending',
    });
  }

  const getStepIcon = (step: WorkflowStep) => {
    if (step.status === 'completed') {
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    } else if (step.status === 'rejected') {
      return <XCircleIcon className="w-5 h-5 text-red-500" />;
    } else if (step.status === 'current') {
      return <ClockIcon className="w-5 h-5 text-blue-500 animate-pulse" />;
    } else {
      return <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />;
    }
  };

  const getStepColor = (step: WorkflowStep) => {
    if (step.status === 'completed') {
      return 'text-green-600 dark:text-green-400';
    } else if (step.status === 'rejected') {
      return 'text-red-600 dark:text-red-400';
    } else if (step.status === 'current') {
      return 'text-blue-600 dark:text-blue-400';
    } else {
      return 'text-gray-400 dark:text-gray-500';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
      case 'urgent':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700';
      case 'low':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Priority Badge */}
      {priorityLevel && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            អាទិភាព
          </span>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold uppercase border ${getPriorityColor(
              priorityLevel
            )}`}
          >
            {priorityLevel}
          </span>
        </div>
      )}

      {/* Workflow Status */}
      {workflowStatus && (
        <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
            ស្ថានភាពបច្ចុប្បន្ន
          </div>
          <div className="text-sm font-bold text-blue-900 dark:text-blue-100">
            {workflowStatus}
          </div>
        </div>
      )}

      {/* Assigned Reviewer */}
      {assignedReviewer && (
        <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <UserIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              អ្នកពិនិត្យ
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {assignedReviewer}
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-[10px] top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.id} className="relative flex items-start space-x-4">
              {/* Icon */}
              <div className="relative z-10 flex-shrink-0 bg-white dark:bg-gray-800 rounded-full">
                {getStepIcon(step)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-2">
                <div className={`text-sm font-semibold ${getStepColor(step)}`}>
                  {step.khmerLabel}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {step.label}
                </div>
                {step.timestamp && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {formatDate(step.timestamp)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow Stage Info */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>បានបញ្ចប់</span>
          </div>
          <div className="flex items-center space-x-2">
            <ClockIcon className="w-3 h-3 text-blue-500" />
            <span>កំពុងដំណើរការ</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full border-2 border-gray-300 dark:border-gray-600" />
            <span>រង់ចាំ</span>
          </div>
        </div>
      </div>
    </div>
  );
};
