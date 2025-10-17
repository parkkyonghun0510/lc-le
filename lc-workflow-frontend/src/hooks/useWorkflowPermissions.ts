/**
 * Hook for checking workflow permissions
 * 
 * Provides easy-to-use permission checks combining role and position
 */

import { useAuth } from './useAuth';
import { 
  canPerformWorkflowAction, 
  canPerformAnyAction,
  WORKFLOW_ACTION_GROUPS,
  type WorkflowAction 
} from '@/config/permissions';

export const useWorkflowPermissions = () => {
  const { user } = useAuth();
  
  const userRole = user?.role;
  const positionId = user?.position?.id;
  
  /**
   * Check if user can perform a specific workflow action
   */
  const can = (action: WorkflowAction): boolean => {
    return canPerformWorkflowAction(userRole, positionId, action);
  };
  
  /**
   * Check if user can perform any action in a group
   */
  const canAny = (actions: WorkflowAction[]): boolean => {
    return canPerformAnyAction(userRole, positionId, actions);
  };
  
  /**
   * Specific permission checks for common actions
   */
  const permissions = {
    // Teller permissions
    canStartTellerProcessing: can('start_teller_processing'),
    canSubmitToManager: can('submit_to_manager'),
    canProcessAsTeller: canAny(WORKFLOW_ACTION_GROUPS.TELLER_ACTIONS),
    
    // Manager permissions
    canApprove: can('approve_application'),
    canReject: can('reject_application'),
    canReviewAsManager: canAny(WORKFLOW_ACTION_GROUPS.MANAGER_ACTIONS),
    
    // User info
    userRole,
    positionId,
    positionName: user?.position?.name,
  };
  
  return {
    can,
    canAny,
    ...permissions,
  };
};
