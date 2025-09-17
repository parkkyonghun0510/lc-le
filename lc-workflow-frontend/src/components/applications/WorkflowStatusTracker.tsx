'use client';

import React from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleIconSolid,
  ClockIcon as ClockIconSolid,
  UserIcon as UserIconSolid,
  BuildingOfficeIcon as BuildingOfficeIconSolid,
  ShieldCheckIcon as ShieldCheckIconSolid
} from '@heroicons/react/24/solid';
import { WorkflowStatus } from '@/types/models';
import { formatDate } from '@/lib/utils';

interface WorkflowStep {
  id: WorkflowStatus;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  solidIcon: React.ComponentType<any>;
}

interface WorkflowStatusTrackerProps {
  currentStatus: WorkflowStatus;
  userCompletedAt?: string | null;
  tellerProcessingAt?: string | null;
  managerApprovedAt?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
  className?: string;
}

const workflowSteps: WorkflowStep[] = [
  {
    id: 'PO_CREATED' as WorkflowStatus,
    label: 'បង្កើតដោយ PO',
    description: 'ពាក្យសុំត្រូវបានបង្កើតដោយមន្ត្រីឥណទាន',
    icon: UserIcon,
    solidIcon: UserIconSolid
  },
  {
    id: 'USER_COMPLETED' as WorkflowStatus,
    label: 'បានបញ្ចប់ដោយអ្នកប្រើប្រាស់',
    description: 'អ្នកប្រើប្រាស់បានបំពេញព័ត៌មានរួចរាល់',
    icon: CheckCircleIcon,
    solidIcon: CheckCircleIconSolid
  },
  {
    id: 'TELLER_PROCESSING' as WorkflowStatus,
    label: 'កំពុងដំណើរការដោយ Teller',
    description: 'Teller កំពុងពិនិត្យនិងដំណើរការ',
    icon: BuildingOfficeIcon,
    solidIcon: BuildingOfficeIconSolid
  },
  {
    id: 'MANAGER_REVIEW' as WorkflowStatus,
    label: 'កំពុងពិនិត្យដោយអ្នកគ្រប់គ្រង',
    description: 'អ្នកគ្រប់គ្រងកំពុងពិនិត្យសម្រាប់អនុម័ត',
    icon: ShieldCheckIcon,
    solidIcon: ShieldCheckIconSolid
  },
  {
    id: 'APPROVED' as WorkflowStatus,
    label: 'បានអនុម័ត',
    description: 'ពាក្យសុំត្រូវបានអនុម័តដោយអ្នកគ្រប់គ្រង',
    icon: CheckCircleIcon,
    solidIcon: CheckCircleIconSolid
  }
];

const getStepStatus = (
  step: WorkflowStep,
  currentStatus: WorkflowStatus,
  rejectedAt?: string | null
): 'completed' | 'current' | 'pending' | 'rejected' => {
  if (rejectedAt && currentStatus === 'REJECTED') {
    return 'rejected';
  }

  const stepIndex = workflowSteps.findIndex(s => s.id === step.id);
  const currentIndex = workflowSteps.findIndex(s => s.id === currentStatus);

  if (stepIndex < currentIndex) {
    return 'completed';
  } else if (stepIndex === currentIndex) {
    return 'current';
  } else {
    return 'pending';
  }
};

const getStepTimestamp = (
  step: WorkflowStep,
  userCompletedAt?: string | null,
  tellerProcessingAt?: string | null,
  managerApprovedAt?: string | null
): string | null => {
  switch (step.id) {
    case 'USER_COMPLETED':
      return userCompletedAt || null;
    case 'TELLER_PROCESSING':
      return tellerProcessingAt || null;
    case 'APPROVED':
      return managerApprovedAt || null;
    default:
      return null;
  }
};

export function WorkflowStatusTracker({
  currentStatus,
  userCompletedAt,
  tellerProcessingAt,
  managerApprovedAt,
  rejectedAt,
  rejectedBy,
  rejectionReason,
  className = ''
}: WorkflowStatusTrackerProps) {
  const isRejected = currentStatus === 'REJECTED';

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          ស្ថានភាពដំណើរការពាក្យសុំ
        </h3>
        <p className="text-sm text-gray-600">
          តាមដានដំណើរការនៃពាក្យសុំរបស់អ្នក
        </p>
      </div>

      {/* Rejection Notice */}
      {isRejected && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <ExclamationCircleIcon className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800">
                ពាក្យសុំត្រូវបានបដិសេធ
              </h4>
              {rejectedBy && (
                <p className="text-sm text-red-700 mt-1">
                  បដិសេធដោយ: {rejectedBy}
                </p>
              )}
              {rejectedAt && (
                <p className="text-sm text-red-700 mt-1">
                  កាលបរិច្ឆេទ: {formatDate(rejectedAt)}
                </p>
              )}
              {rejectionReason && (
                <p className="text-sm text-red-700 mt-2">
                  មូលហេតុ: {rejectionReason}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Workflow Steps */}
      <div className="space-y-4">
        {workflowSteps.map((step, index) => {
          const status = getStepStatus(step, currentStatus, rejectedAt);
          const timestamp = getStepTimestamp(step, userCompletedAt, tellerProcessingAt, managerApprovedAt);
          const Icon = status === 'completed' ? step.solidIcon : step.icon;
          
          let statusColor = '';
          let bgColor = '';
          let borderColor = '';
          
          switch (status) {
            case 'completed':
              statusColor = 'text-green-600';
              bgColor = 'bg-green-50';
              borderColor = 'border-green-200';
              break;
            case 'current':
              statusColor = 'text-blue-600';
              bgColor = 'bg-blue-50';
              borderColor = 'border-blue-200';
              break;
            case 'rejected':
              statusColor = 'text-red-600';
              bgColor = 'bg-red-50';
              borderColor = 'border-red-200';
              break;
            default:
              statusColor = 'text-gray-400';
              bgColor = 'bg-gray-50';
              borderColor = 'border-gray-200';
          }

          return (
            <div key={step.id} className="relative">
              {/* Connector Line */}
              {index < workflowSteps.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200" />
              )}
              
              <div className={`flex items-start space-x-4 p-4 rounded-lg border ${bgColor} ${borderColor}`}>
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${bgColor}`}>
                  <Icon className={`h-6 w-6 ${statusColor}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-medium ${statusColor}`}>
                      {step.label}
                    </h4>
                    {status === 'current' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <ClockIconSolid className="h-3 w-3 mr-1" />
                        កំពុងដំណើរការ
                      </span>
                    )}
                    {status === 'completed' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircleIconSolid className="h-3 w-3 mr-1" />
                        បានបញ្ចប់
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">
                    {step.description}
                  </p>
                  
                  {timestamp && (
                    <p className="text-xs text-gray-500 mt-2">
                      បានបញ្ចប់នៅ: {formatDate(timestamp)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-6">
        <div className="flex justify-between text-xs text-gray-600 mb-2">
          <span>ដំណើរការ</span>
          <span>
            {isRejected 
              ? 'បដិសេធ'
              : `${Math.round((workflowSteps.findIndex(s => s.id === currentStatus) + 1) / workflowSteps.length * 100)}%`
            }
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              isRejected 
                ? 'bg-red-500' 
                : 'bg-blue-500'
            }`}
            style={{
              width: isRejected 
                ? '100%' 
                : `${(workflowSteps.findIndex(s => s.id === currentStatus) + 1) / workflowSteps.length * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default WorkflowStatusTracker;