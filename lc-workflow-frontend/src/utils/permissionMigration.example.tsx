/**
 * Permission Migration Examples
 * 
 * This file contains practical examples of migrating from role-based
 * to permission-based access control using the migration utilities.
 */

import React from 'react';
import { usePermissionMigration, usePermissions, usePageAccess, useFeatureFlags } from '@/hooks/usePermissionMigration';
import { useAuth } from '@/hooks/useAuth';
import { permissionLogger, getMigrationStatus, exportMigrationReport } from '@/utils/permissionMigration';

/**
 * Example 1: Basic Permission Check with Fallback
 * 
 * This example shows how to replace simple role checks with permission checks
 * while maintaining backward compatibility.
 */
export function Example1_BasicPermissionCheck() {
  const { can, loading } = usePermissionMigration();
  
  if (loading) {
    return <div>Loading permissions...</div>;
  }
  
  // Old way: if (isAdmin || isManager)
  // New way: Check specific permission
  const canViewApplications = can('application', 'read', 'department');
  
  if (!canViewApplications) {
    return <div>Access Denied</div>;
  }
  
  return (
    <div>
      <h1>Applications</h1>
      {/* Application list content */}
    </div>
  );
}

/**
 * Example 2: Multiple Permission Checks
 * 
 * Shows how to check multiple permissions efficiently using the usePermissions hook.
 */
export function Example2_MultiplePermissions() {
  const permissions = usePermissions({
    canCreate: ['application', 'create', 'own'],
    canUpdate: ['application', 'update', 'own'],
    canDelete: ['application', 'delete', 'global'],
    canApprove: ['application', 'approve', 'department'],
  });
  
  if (permissions.loading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div>
      <h1>Application Actions</h1>
      <div className="button-group">
        {permissions.canCreate && <button>Create Application</button>}
        {permissions.canUpdate && <button>Edit Application</button>}
        {permissions.canDelete && <button>Delete Application</button>}
        {permissions.canApprove && <button>Approve Application</button>}
      </div>
    </div>
  );
}

/**
 * Example 3: Page-Level Access Control
 * 
 * Shows how to protect entire pages with permission checks.
 */
export function Example3_PageAccess() {
  const { hasAccess, loading, reason } = usePageAccess('system', 'manage', 'global');
  
  if (loading) {
    return <div>Checking permissions...</div>;
  }
  
  if (!hasAccess) {
    return (
      <div>
        <h1>Access Denied</h1>
        <p>{reason || 'You do not have permission to access this page.'}</p>
      </div>
    );
  }
  
  return (
    <div>
      <h1>System Administration</h1>
      {/* Admin content */}
    </div>
  );
}

/**
 * Example 4: Feature Flags
 * 
 * Shows how to use permission-based feature flags for conditional rendering.
 */
export function Example4_FeatureFlags() {
  const features = useFeatureFlags({
    showAdminPanel: ['system', 'manage', 'global'],
    showUserManagement: ['user', 'manage', 'department'],
    showReports: ['report', 'view', 'department'],
    showAuditLog: ['audit', 'view', 'global'],
  });
  
  return (
    <nav>
      <ul>
        <li><a href="/dashboard">Dashboard</a></li>
        {features.showUserManagement && <li><a href="/users">Users</a></li>}
        {features.showReports && <li><a href="/reports">Reports</a></li>}
        {features.showAuditLog && <li><a href="/audit">Audit Log</a></li>}
        {features.showAdminPanel && <li><a href="/admin">Admin</a></li>}
      </ul>
    </nav>
  );
}

/**
 * Example 5: Detailed Permission Check
 * 
 * Shows how to get detailed information about permission checks.
 */
export function Example5_DetailedCheck() {
  const { canWithDetails } = usePermissionMigration();
  
  const handleAction = () => {
    const result = canWithDetails('application', 'delete', 'global');
    
    if (!result.allowed) {
      alert(`Action denied: ${result.reason}`);
      console.log('Permission check details:', {
        source: result.source,
        timestamp: result.timestamp,
      });
      return;
    }
    
    // Perform the action
    console.log('Action allowed via:', result.source);
  };
  
  return <button onClick={handleAction}>Delete Application</button>;
}

/**
 * Example 6: Admin Check with Fallback
 * 
 * Shows how to check for admin role with automatic fallback.
 */
export function Example6_AdminCheck() {
  const { isAdmin, loading } = usePermissionMigration();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  const isAdminUser = isAdmin();
  
  return (
    <div>
      <h1>User Profile</h1>
      {isAdminUser && (
        <div className="admin-badge">
          <span>Administrator</span>
        </div>
      )}
      {/* Profile content */}
    </div>
  );
}

/**
 * Example 7: Role Check with Fallback
 * 
 * Shows how to check for specific roles with automatic fallback.
 */
export function Example7_RoleCheck() {
  const { hasRole, loading } = usePermissionMigration();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  const isManager = hasRole('manager');
  const isOfficer = hasRole('officer');
  
  return (
    <div>
      <h1>Dashboard</h1>
      {isManager && <div>Manager Dashboard Content</div>}
      {isOfficer && <div>Officer Dashboard Content</div>}
    </div>
  );
}

/**
 * Example 8: Owner-Based Access Control
 * 
 * Shows how to combine permission checks with ownership checks.
 */
export function Example8_OwnerBasedAccess({ item }: { item: { id: string; created_by: string } }) {
  const { user } = useAuth();
  const { can } = usePermissionMigration();
  
  // Can edit own items OR has global edit permission
  const canEditOwn = can('application', 'update', 'own');
  const canEditAll = can('application', 'update', 'global');
  
  const isOwner = user?.id === item.created_by;
  const canEdit = (canEditOwn && isOwner) || canEditAll;
  
  // Can delete only with global permission
  const canDelete = can('application', 'delete', 'global');
  
  return (
    <div>
      <h2>Application #{item.id}</h2>
      <div className="actions">
        {canEdit && <button>Edit</button>}
        {canDelete && <button>Delete</button>}
      </div>
    </div>
  );
}

/**
 * Example 9: Conditional Form Fields
 * 
 * Shows how to conditionally show/hide form fields based on permissions.
 */
export function Example9_ConditionalFormFields() {
  const permissions = usePermissions({
    canSetStatus: ['application', 'update', 'global'],
    canAssignOfficer: ['application', 'assign', 'department'],
    canSetPriority: ['application', 'manage', 'department'],
  });
  
  return (
    <form>
      <div>
        <label>Application Name</label>
        <input type="text" name="name" />
      </div>
      
      {permissions.canSetStatus && (
        <div>
          <label>Status</label>
          <select name="status">
            <option>Pending</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
        </div>
      )}
      
      {permissions.canAssignOfficer && (
        <div>
          <label>Assigned Officer</label>
          <select name="officer_id">
            {/* Officer options */}
          </select>
        </div>
      )}
      
      {permissions.canSetPriority && (
        <div>
          <label>Priority</label>
          <select name="priority">
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </div>
      )}
      
      <button type="submit">Save</button>
    </form>
  );
}

/**
 * Example 10: Migration Monitoring
 * 
 * Shows how to monitor permission checks during migration.
 */
export function Example10_MigrationMonitoring() {
  const [status, setStatus] = React.useState<any>(null);
  const [logs, setLogs] = React.useState<any[]>([]);
  
  const refreshStatus = () => {
    const migrationStatus = getMigrationStatus();
    setStatus(migrationStatus);
    setLogs(permissionLogger.getLogs().slice(-10)); // Last 10 logs
  };
  
  const exportReport = () => {
    const report = exportMigrationReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `permission-migration-report-${Date.now()}.json`;
    a.click();
  };
  
  React.useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);
  
  if (!status) {
    return <div>Loading migration status...</div>;
  }
  
  return (
    <div className="migration-monitoring">
      <h2>Permission Migration Status</h2>
      
      <div className="stats">
        <div>Total Checks: {status.totalChecks}</div>
        <div>Permission Checks: {status.permissionChecks}</div>
        <div>Role Checks: {status.roleChecks}</div>
        <div>Fallback Checks: {status.fallbackChecks}</div>
        <div>Denied Checks: {status.deniedChecks}</div>
      </div>
      
      <div className="actions">
        <button onClick={refreshStatus}>Refresh</button>
        <button onClick={exportReport}>Export Report</button>
        <button onClick={() => permissionLogger.clear()}>Clear Logs</button>
      </div>
      
      <div className="recent-logs">
        <h3>Recent Permission Checks</h3>
        <table>
          <thead>
            <tr>
              <th>Resource</th>
              <th>Action</th>
              <th>Result</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr key={index}>
                <td>{log.resource}</td>
                <td>{log.action}</td>
                <td>{log.result.allowed ? '✅ Allowed' : '❌ Denied'}</td>
                <td>{log.result.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Example 11: Complex Permission Logic
 * 
 * Shows how to handle complex permission scenarios.
 */
export function Example11_ComplexPermissions({ application }: { application: any }) {
  const { user } = useAuth();
  const { can, isAdmin } = usePermissionMigration();
  
  // Complex logic: Can approve if:
  // 1. User is admin, OR
  // 2. User has approve permission at department level AND application is in their department, OR
  // 3. User has approve permission at branch level AND application is in their branch
  const canApprove = React.useMemo(() => {
    if (isAdmin()) return true;
    
    const hasDeptApprove = can('application', 'approve', 'department');
    const hasBranchApprove = can('application', 'approve', 'branch');
    const hasGlobalApprove = can('application', 'approve', 'global');
    
    if (hasGlobalApprove) return true;
    
    if (hasDeptApprove && application.department_id === user?.department_id) {
      return true;
    }
    
    if (hasBranchApprove && application.branch_id === user?.branch_id) {
      return true;
    }
    
    return false;
  }, [can, isAdmin, application, user]);
  
  return (
    <div>
      <h2>Application Details</h2>
      {canApprove && (
        <div className="approval-section">
          <button>Approve</button>
          <button>Reject</button>
        </div>
      )}
    </div>
  );
}

/**
 * Example 12: Loading State Handling
 * 
 * Shows different ways to handle loading states.
 */
export function Example12_LoadingStates() {
  const { can, loading } = usePermissionMigration();
  
  // Option 1: Show loading spinner
  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner" />
        <p>Loading permissions...</p>
      </div>
    );
  }
  
  // Option 2: Disable buttons while loading
  const canEdit = can('application', 'update', 'own');
  const canDelete = can('application', 'delete', 'global');
  
  return (
    <div>
      <button disabled={loading || !canEdit}>
        {loading ? 'Loading...' : 'Edit'}
      </button>
      <button disabled={loading || !canDelete}>
        {loading ? 'Loading...' : 'Delete'}
      </button>
    </div>
  );
}

/**
 * Example 13: Error Handling
 * 
 * Shows how to handle permission check errors.
 */
export function Example13_ErrorHandling() {
  const { can, loading, error, refetch } = usePermissionMigration();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (error) {
    return (
      <div className="error-container">
        <h2>Error Loading Permissions</h2>
        <p>{error.message || 'Failed to load permissions'}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }
  
  const canView = can('application', 'read', 'department');
  
  if (!canView) {
    return <div>Access Denied</div>;
  }
  
  return <div>Content</div>;
}

/**
 * Example 14: Memoized Permission Checks
 * 
 * Shows how to optimize performance with memoization.
 */
export function Example14_MemoizedChecks() {
  const { can } = usePermissionMigration();
  
  // Memoize expensive permission calculations
  const permissions = React.useMemo(() => ({
    canCreate: can('application', 'create', 'own'),
    canUpdate: can('application', 'update', 'own'),
    canDelete: can('application', 'delete', 'global'),
    canApprove: can('application', 'approve', 'department'),
    canReject: can('application', 'reject', 'department'),
    canAssign: can('application', 'assign', 'department'),
    canExport: can('application', 'export', 'department'),
  }), [can]);
  
  return (
    <div>
      {permissions.canCreate && <button>Create</button>}
      {permissions.canUpdate && <button>Update</button>}
      {permissions.canDelete && <button>Delete</button>}
      {permissions.canApprove && <button>Approve</button>}
      {permissions.canReject && <button>Reject</button>}
      {permissions.canAssign && <button>Assign</button>}
      {permissions.canExport && <button>Export</button>}
    </div>
  );
}

/**
 * Example 15: Testing Helper
 * 
 * Shows how to test components with permission checks.
 */
export function Example15_TestingHelper() {
  // This is a helper component for testing
  // In tests, you can mock usePermissionMigration to return specific permissions
  
  const { can } = usePermissionMigration();
  
  return (
    <div data-testid="permission-test">
      {can('application', 'create', 'own') && (
        <button data-testid="create-button">Create</button>
      )}
      {can('application', 'delete', 'global') && (
        <button data-testid="delete-button">Delete</button>
      )}
    </div>
  );
}

// Export all examples
export const examples = {
  Example1_BasicPermissionCheck,
  Example2_MultiplePermissions,
  Example3_PageAccess,
  Example4_FeatureFlags,
  Example5_DetailedCheck,
  Example6_AdminCheck,
  Example7_RoleCheck,
  Example8_OwnerBasedAccess,
  Example9_ConditionalFormFields,
  Example10_MigrationMonitoring,
  Example11_ComplexPermissions,
  Example12_LoadingStates,
  Example13_ErrorHandling,
  Example14_MemoizedChecks,
  Example15_TestingHelper,
};
