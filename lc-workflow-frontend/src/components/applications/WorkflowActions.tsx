'use client';

import React, { useState } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui';
import { useEmployees } from '@/hooks/useEmployees';
import { useWorkflowPermissions } from '@/hooks/useWorkflowPermissions';

interface WorkflowActionsProps {
  applicationId: string;
  workflowStatus?: string;
  status?: string;
  userRole?: string;
  userId?: string;
  applicationUserId?: string;
  onSubmit?: () => void;
  onTellerProcess?: (accountId: string, reviewerId?: string, notes?: string, currentStatus?: string) => void;
  onManagerApprove?: () => void;
  onManagerReject?: (reason: string) => void;
  isLoading?: boolean;
}

export const WorkflowActions: React.FC<WorkflowActionsProps> = ({
  applicationId,
  workflowStatus,
  status,
  userRole,
  userId,
  applicationUserId,
  onSubmit,
  onTellerProcess,
  onManagerApprove,
  onManagerReject,
  isLoading,
}) => {
  const [showTellerForm, setShowTellerForm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  // Fetch employees for reviewer assignment
  const { data: employeesData } = useEmployees({ 
    is_active: true,
    size: 100 
  });
  const employees = employeesData?.items || [];
  
  // Filter managers/reviewers (you can adjust this filter based on your needs)
  const reviewers = employees.filter(emp => 
    emp.position?.toLowerCase().includes('manager') || 
    emp.position?.toLowerCase().includes('reviewer') ||
    emp.position?.toLowerCase().includes('supervisor')
  );

  // Get workflow permissions (combines role + position checks)
  const { canProcessAsTeller, canReviewAsManager } = useWorkflowPermissions();
  
  // Determine what actions are available based on permissions and workflow status
  const canSubmit = userId === applicationUserId && status === 'draft';
  
  // Tellers can process in two stages (if they have permission):
  // 1. USER_COMPLETED -> TELLER_PROCESSING (start processing)
  // 2. TELLER_PROCESSING -> MANAGER_REVIEW (submit to manager)
  const canTellerProcess = canProcessAsTeller && 
                           (workflowStatus === 'USER_COMPLETED' || workflowStatus === 'TELLER_PROCESSING');
  
  // Managers can review applications (if they have permission)
  const canManagerReview = canReviewAsManager && workflowStatus === 'MANAGER_REVIEW';

  const handleTellerSubmit = () => {
    if (accountId.trim() && onTellerProcess) {
      // Pass the target status based on current workflow status
      // If USER_COMPLETED, move to TELLER_PROCESSING first
      // If TELLER_PROCESSING, move to MANAGER_REVIEW
      onTellerProcess(accountId, reviewerId || undefined, notes, workflowStatus);
      setShowTellerForm(false);
      setAccountId('');
      setReviewerId('');
      setNotes('');
    }
  };

  const handleManagerReject = () => {
    if (rejectReason.trim() && onManagerReject) {
      onManagerReject(rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
    }
  };

  // Debug: Log permission checks (can be removed in production)
  // console.log('Workflow Actions Permissions:', {
  //   userRole,
  //   workflowStatus,
  //   status,
  //   canSubmit,
  //   canTellerProcess,
  //   canManagerReview
  // });

  // Don't render if no actions are available
  if (!canSubmit && !canTellerProcess && !canManagerReview) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* User Submit Action */}
      {canSubmit && onSubmit && (
        <Button
          variant="primary"
          size="md"
          onClick={onSubmit}
          isLoading={isLoading}
          className="w-full"
        >
          <DocumentTextIcon className="w-4 h-4 mr-2" />
          ដាក់ស្នើ (Submit)
        </Button>
      )}

      {/* Teller Processing Actions */}
      {canTellerProcess && (
        <div className="space-y-3">
          {!showTellerForm ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowTellerForm(true)}
              className="w-full"
            >
              <ArrowRightIcon className="w-4 h-4 mr-2" />
              {workflowStatus === 'USER_COMPLETED' 
                ? 'ចាប់ផ្តើមដំណើរការ (Start Processing)' 
                : 'ដាក់ទៅអ្នកគ្រប់គ្រង (Submit to Manager)'}
            </Button>
          ) : (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700 space-y-3">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center">
                <DocumentTextIcon className="w-5 h-5 mr-2" />
                Teller Processing
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="Enter account ID (e.g., 00012345)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <UserIcon className="w-4 h-4 inline mr-1" />
                  Assign Reviewer (Optional)
                </label>
                <select
                  value={reviewerId}
                  onChange={(e) => setReviewerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Reviewer --</option>
                  {reviewers.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name_khmer} ({emp.employee_code})
                      {emp.position && ` - ${emp.position}`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Assign a specific manager/reviewer for this application
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add validation notes or special instructions..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleTellerSubmit}
                  disabled={!accountId.trim()}
                  isLoading={isLoading}
                  className="flex-1"
                >
                  <CheckCircleIcon className="w-4 h-4 mr-2" />
                  Submit to Manager
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowTellerForm(false);
                    setAccountId('');
                    setReviewerId('');
                    setNotes('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manager Review Actions */}
      {canManagerReview && (
        <div className="space-y-3">
          <Button
            variant="success"
            size="md"
            onClick={onManagerApprove}
            isLoading={isLoading}
            className="w-full"
          >
            <CheckCircleIcon className="w-4 h-4 mr-2" />
            អនុម័ត (Approve)
          </Button>
          <Button
            variant="error"
            size="md"
            onClick={() => setShowRejectModal(true)}
            className="w-full"
          >
            <XCircleIcon className="w-4 h-4 mr-2" />
            បដិសេធ (Reject)
          </Button>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-red-500 rounded-xl shadow-lg mr-4">
                <XCircleIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                បដិសេធពាក្យសុំ
              </h3>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                មូលហេតុបដិសេធ <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 resize-none"
                placeholder="សូមបញ្ជាក់មូលហេតុនៃការបដិសេធ..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
              >
                បោះបង់
              </Button>
              <Button
                variant="error"
                size="md"
                onClick={handleManagerReject}
                disabled={!rejectReason.trim()}
                isLoading={isLoading}
              >
                បដិសេធ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
