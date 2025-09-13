'use client';

import React, { useState } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { WorkflowStatus, WorkflowStatusInfo, WorkflowTransitionRequest } from '@/types/models';
import { useWorkflowTransition } from '@/hooks/useApplications';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

interface WorkflowActionsProps {
  applicationId: string;
  currentStatus: WorkflowStatus;
  workflowInfo?: WorkflowStatusInfo;
  userRole?: string;
  className?: string;
}

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: WorkflowTransitionRequest) => void;
  action: 'submit' | 'process' | 'review' | 'approve' | 'reject';
  currentStatus: WorkflowStatus;
  loading?: boolean;
}

function ActionModal({ isOpen, onClose, onConfirm, action, currentStatus, loading }: ActionModalProps) {
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Map action to new_status based on workflow logic
    const getNewStatus = (action: string, currentStatus: WorkflowStatus): WorkflowStatus => {
      switch (action) {
        case 'submit':
          if (currentStatus === 'PO_CREATED') return 'USER_COMPLETED';
          if (currentStatus === 'USER_COMPLETED') return 'TELLER_PROCESSING';
          break;
        case 'process':
          if (currentStatus === 'TELLER_PROCESSING') return 'MANAGER_REVIEW';
          break;
        case 'review':
          // Review action doesn't change status, just adds notes
          return currentStatus;
        case 'approve':
          if (currentStatus === 'MANAGER_REVIEW') return 'APPROVED';
          break;
        case 'reject':
          return 'REJECTED';
        default:
          return currentStatus;
      }
      return currentStatus;
    };

    const data: WorkflowTransitionRequest = {
      new_status: getNewStatus(action, currentStatus),
      notes: notes || undefined,
    };

    if (action === 'process' && accountId) {
      data.account_id = accountId;
    }

    if (action === 'reject' && rejectionReason) {
      data.notes = rejectionReason;
    }

    onConfirm(data);
  };

  const getActionTitle = () => {
    switch (action) {
      case 'submit': return 'បញ្ជូនពាក្យសុំ';
      case 'process': return 'ដំណើរការពាក្យសុំ';
      case 'review': return 'ពិនិត្យពាក្យសុំ';
      case 'approve': return 'អនុម័តពាក្យសុំ';
      case 'reject': return 'បដិសេធពាក្យសុំ';
      default: return 'សកម្មភាព';
    }
  };

  const getActionDescription = () => {
    switch (action) {
      case 'submit': return 'តើអ្នកប្រាកដថាចង់បញ្ជូនពាក្យសុំនេះមែនទេ?';
      case 'process': return 'បញ្ចូល Account ID ដើម្បីដំណើរការពាក្យសុំ';
      case 'review': return 'តើអ្នកប្រាកដថាចង់ផ្ញើពាក្យសុំនេះទៅអ្នកគ្រប់គ្រងមែនទេ?';
      case 'approve': return 'តើអ្នកប្រាកដថាចង់អនុម័តពាក្យសុំនេះមែនទេ?';
      case 'reject': return 'សូមបញ្ជាក់មូលហេតុនៃការបដិសេធ';
      default: return '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getActionTitle()}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600 mb-4">
          {getActionDescription()}
        </p>

        {action === 'process' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account ID *
            </label>
            <Input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="បញ្ចូល Account ID"
              required
              className="w-full"
            />
          </div>
        )}

        {action === 'reject' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              មូលហេតុបដិសេធ *
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="សូមបញ្ជាក់មូលហេតុនៃការបដិសេធ"
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            កំណត់ចំណាំ (ស្រេចចិត្ត)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="បញ្ចូលកំណត់ចំណាំបន្ថែម"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            បោះបង់
          </Button>
          <Button
            type="submit"
            variant={action === 'reject' ? 'error' : 'primary'}
            isLoading={loading}
            disabled={loading || (action === 'process' && !accountId) || (action === 'reject' && !rejectionReason)}
          >
            {action === 'reject' ? (
              <>
                <XCircleIcon className="h-4 w-4 mr-2" />
                បដិសេធ
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                បញ្ជាក់
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function WorkflowActions({
  applicationId,
  currentStatus,
  workflowInfo,
  userRole,
  className = ''
}: WorkflowActionsProps) {
  const [activeModal, setActiveModal] = useState<'submit' | 'process' | 'review' | 'approve' | 'reject' | null>(null);
  const workflowTransition = useWorkflowTransition();

  const handleAction = (data: WorkflowTransitionRequest) => {
    workflowTransition.mutate(
      { id: applicationId, data },
      {
        onSuccess: () => {
          setActiveModal(null);
        },
        onError: () => {
          // Error handling is done in the hook
        }
      }
    );
  };

  const getAvailableActions = () => {
    const actions: Array<{
      key: 'submit' | 'process' | 'review' | 'approve' | 'reject';
      label: string;
      icon: React.ComponentType<any>;
      variant: 'primary' | 'secondary' | 'error';
      permission: keyof WorkflowStatusInfo['permissions'];
    }> = [];

    if (workflowInfo?.permissions.can_submit) {
      actions.push({
        key: 'submit',
        label: 'បញ្ជូន',
        icon: ArrowRightIcon,
        variant: 'primary',
        permission: 'can_submit'
      });
    }

    if (workflowInfo?.permissions.can_process) {
      actions.push({
        key: 'process',
        label: 'ដំណើរការ',
        icon: ArrowRightIcon,
        variant: 'primary',
        permission: 'can_process'
      });
    }

    if (workflowInfo?.permissions.can_review) {
      actions.push({
        key: 'review',
        label: 'ពិនិត្យ',
        icon: ArrowRightIcon,
        variant: 'secondary',
        permission: 'can_review'
      });
    }

    if (workflowInfo?.permissions.can_approve) {
      actions.push({
        key: 'approve',
        label: 'អនុម័ត',
        icon: CheckCircleIcon,
        variant: 'primary',
        permission: 'can_approve'
      });
    }

    if (workflowInfo?.permissions.can_reject) {
      actions.push({
        key: 'reject',
        label: 'បដិសេធ',
        icon: XCircleIcon,
        variant: 'error',
        permission: 'can_reject'
      });
    }

    return actions;
  };

  const availableActions = getAvailableActions();

  if (availableActions.length === 0) {
    return null;
  }

  return (
    <>
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            សកម្មភាពដែលអាចធ្វើបាន
          </h3>
          {workflowInfo?.stage_description && (
            <p className="text-sm text-gray-600">
              {workflowInfo.stage_description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {availableActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.key}
                variant={action.variant}
                onClick={() => setActiveModal(action.key)}
                disabled={workflowTransition.isPending}
                className="flex items-center"
              >
                <Icon className="h-4 w-4 mr-2" />
                {action.label}
              </Button>
            );
          })}
        </div>

        {currentStatus === 'REJECTED' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  ពាក្យសុំនេះត្រូវបានបដិសេធ
                </p>
                <p className="text-sm text-red-700 mt-1">
                  សូមពិនិត្យមូលហេតុបដិសេធ និងធ្វើការកែប្រែតាមតម្រូវការ
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Modals */}
      {activeModal && (
        <ActionModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onConfirm={handleAction}
          action={activeModal}
          currentStatus={currentStatus}
          loading={workflowTransition.isPending}
        />
      )}
    </>
  );
}

export default WorkflowActions;