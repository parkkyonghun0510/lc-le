/**
 * Position-Based Permissions Configuration
 * 
 * This file defines which positions can perform which workflow actions.
 * Uses position IDs (UUIDs) instead of string matching for reliability.
 */

export type WorkflowAction = 
  | 'submit_application'
  | 'start_teller_processing'
  | 'submit_to_manager'
  | 'approve_application'
  | 'reject_application';

export type PositionCapability = {
  positionId: string;
  positionName: string; // For reference only
  capabilities: WorkflowAction[];
};

/**
 * Position Permissions Registry
 * 
 * Add position IDs here to grant workflow permissions.
 * This is the single source of truth for position-based permissions.
 */
export const POSITION_PERMISSIONS: PositionCapability[] = [
  // Teller positions
  {
    positionId: 'teller-position-uuid-1',
    positionName: 'Teller',
    capabilities: ['start_teller_processing', 'submit_to_manager'],
  },
  {
    positionId: 'teller-position-uuid-2',
    positionName: 'Senior Teller',
    capabilities: ['start_teller_processing', 'submit_to_manager'],
  },
  {
    positionId: 'loan-officer-uuid',
    positionName: 'Loan Officer',
    capabilities: ['start_teller_processing', 'submit_to_manager'],
  },
  
  // Manager positions
  {
    positionId: 'branch-manager-uuid',
    positionName: 'Branch Manager',
    capabilities: ['approve_application', 'reject_application'],
  },
  {
    positionId: 'senior-manager-uuid',
    positionName: 'Senior Manager',
    capabilities: ['approve_application', 'reject_application'],
  },
  {
    positionId: 'credit-manager-uuid',
    positionName: 'Credit Manager',
    capabilities: ['approve_application', 'reject_application'],
  },
];

/**
 * Check if a position has a specific capability
 */
export const hasPositionCapability = (
  positionId: string | null | undefined,
  capability: WorkflowAction
): boolean => {
  if (!positionId) return false;
  
  const position = POSITION_PERMISSIONS.find(p => p.positionId === positionId);
  return position?.capabilities.includes(capability) ?? false;
};

/**
 * Get all capabilities for a position
 */
export const getPositionCapabilities = (
  positionId: string | null | undefined
): WorkflowAction[] => {
  if (!positionId) return [];
  
  const position = POSITION_PERMISSIONS.find(p => p.positionId === positionId);
  return position?.capabilities ?? [];
};

/**
 * Check if user can perform workflow action
 * Combines role-based and position-based checks
 */
export const canPerformWorkflowAction = (
  userRole: string | undefined,
  positionId: string | null | undefined,
  action: WorkflowAction
): boolean => {
  // Primary check: Role-based (fallback for users without positions)
  const rolePermissions: Record<string, WorkflowAction[]> = {
    officer: ['start_teller_processing', 'submit_to_manager'],
    manager: ['approve_application', 'reject_application'],
    admin: ['approve_application', 'reject_application'],
  };
  
  const hasRolePermission = userRole && rolePermissions[userRole]?.includes(action);
  
  // Secondary check: Position-based (more granular)
  const hasPositionPermission = hasPositionCapability(positionId, action);
  
  // User needs EITHER role permission OR position permission
  return hasRolePermission || hasPositionPermission;
};

/**
 * Workflow action groups for easier management
 */
export const WORKFLOW_ACTION_GROUPS = {
  TELLER_ACTIONS: ['start_teller_processing', 'submit_to_manager'] as WorkflowAction[],
  MANAGER_ACTIONS: ['approve_application', 'reject_application'] as WorkflowAction[],
} as const;

/**
 * Check if user can perform any action in a group
 */
export const canPerformAnyAction = (
  userRole: string | undefined,
  positionId: string | null | undefined,
  actions: WorkflowAction[]
): boolean => {
  return actions.some(action => 
    canPerformWorkflowAction(userRole, positionId, action)
  );
};
