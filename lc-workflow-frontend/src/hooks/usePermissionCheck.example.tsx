/**
 * usePermissionCheck Hook - Usage Examples
 * 
 * This file demonstrates how to use the usePermissionCheck hook
 * to implement dynamic permission checking throughout the application.
 */

import React from 'react';
import { usePermissionCheck } from './usePermissionCheck';
import { ResourceType, PermissionAction, PermissionScope } from '@/types/permissions';

/**
 * Example 1: Basic Permission Checking
 * Check if user can perform specific actions
 */
export const BasicPermissionExample: React.FC = () => {
  const { can, loading } = usePermissionCheck();
  
  if (loading) {
    return <div>Loading permissions...</div>;
  }
  
  return (
    <div>
      {/* Show create button only if user can create applications */}
      {can(ResourceType.APPLICATION, PermissionAction.CREATE) && (
        <button>Create Application</button>
      )}
      
      {/* Show edit button only if user can update applications */}
      {can(ResourceType.APPLICATION, PermissionAction.UPDATE) && (
        <button>Edit Application</button>
      )}
      
      {/* Show delete button only if user can delete applications */}
      {can(ResourceType.APPLICATION, PermissionAction.DELETE) && (
        <button>Delete Application</button>
      )}
    </div>
  );
};

/**
 * Example 2: Scope-Based Permission Checking
 * Check permissions with specific scopes
 */
export const ScopePermissionExample: React.FC = () => {
  const { can, loading } = usePermissionCheck();
  
  if (loading) {
    return <div>Loading permissions...</div>;
  }
  
  return (
    <div>
      {/* User can only view their own applications */}
      {can(ResourceType.APPLICATION, PermissionAction.READ, PermissionScope.OWN) && (
        <div>View My Applications</div>
      )}
      
      {/* User can view department applications */}
      {can(ResourceType.APPLICATION, PermissionAction.READ, PermissionScope.DEPARTMENT) && (
        <div>View Department Applications</div>
      )}
      
      {/* User can view all applications globally */}
      {can(ResourceType.APPLICATION, PermissionAction.READ, PermissionScope.GLOBAL) && (
        <div>View All Applications</div>
      )}
    </div>
  );
};

/**
 * Example 3: Role-Based Checking
 * Check if user has specific roles
 */
export const RoleCheckExample: React.FC = () => {
  const { hasRole, loading, roles } = usePermissionCheck();
  
  if (loading) {
    return <div>Loading permissions...</div>;
  }
  
  return (
    <div>
      <h3>Current Roles: {roles.join(', ')}</h3>
      
      {/* Admin-only features */}
      {hasRole('admin') && (
        <div>
          <h4>Admin Panel</h4>
          <button>Manage Users</button>
          <button>System Settings</button>
        </div>
      )}
      
      {/* Manager features */}
      {hasRole('manager') && (
        <div>
          <h4>Manager Dashboard</h4>
          <button>Approve Applications</button>
          <button>View Reports</button>
        </div>
      )}
      
      {/* Officer features */}
      {hasRole('officer') && (
        <div>
          <h4>Officer Tools</h4>
          <button>Process Applications</button>
        </div>
      )}
    </div>
  );
};

/**
 * Example 4: Named Permission Checking
 * Check for specific named permissions
 */
export const NamedPermissionExample: React.FC = () => {
  const { hasPermission, loading } = usePermissionCheck();
  
  if (loading) {
    return <div>Loading permissions...</div>;
  }
  
  return (
    <div>
      {/* Check for specific permission names */}
      {hasPermission('application:approve') && (
        <button>Approve Application</button>
      )}
      
      {hasPermission('user:manage') && (
        <button>Manage Users</button>
      )}
      
      {hasPermission('analytics:export') && (
        <button>Export Analytics</button>
      )}
    </div>
  );
};

/**
 * Example 5: Complex Permission Logic
 * Combine multiple permission checks
 */
export const ComplexPermissionExample: React.FC = () => {
  const { can, hasRole, loading } = usePermissionCheck();
  
  if (loading) {
    return <div>Loading permissions...</div>;
  }
  
  // Complex logic: User can approve if they're a manager OR have explicit approve permission
  const canApprove = hasRole('manager') || can(ResourceType.APPLICATION, PermissionAction.APPROVE);
  
  // User can export if they have export permission at any scope
  const canExport = 
    can(ResourceType.ANALYTICS, PermissionAction.EXPORT, PermissionScope.OWN) ||
    can(ResourceType.ANALYTICS, PermissionAction.EXPORT, PermissionScope.DEPARTMENT) ||
    can(ResourceType.ANALYTICS, PermissionAction.EXPORT, PermissionScope.GLOBAL);
  
  return (
    <div>
      {canApprove && <button>Approve Application</button>}
      {canExport && <button>Export Data</button>}
    </div>
  );
};

/**
 * Example 6: Navigation Menu with Permissions
 * Show/hide menu items based on permissions
 */
export const NavigationMenuExample: React.FC = () => {
  const { can, hasRole, loading } = usePermissionCheck();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return (
    <nav>
      <ul>
        {/* Always visible */}
        <li><span>Dashboard</span></li>
        
        {/* Only if user can view applications */}
        {can(ResourceType.APPLICATION, PermissionAction.READ) && (
          <li><span>Applications</span></li>
        )}
        
        {/* Only if user can manage users */}
        {can(ResourceType.USER, PermissionAction.MANAGE) && (
          <li><span>User Management</span></li>
        )}
        
        {/* Only for admins */}
        {hasRole('admin') && (
          <li><span>Admin Panel</span></li>
        )}
        
        {/* Only if user can view analytics */}
        {can(ResourceType.ANALYTICS, PermissionAction.READ) && (
          <li><span>Analytics</span></li>
        )}
      </ul>
    </nav>
  );
};

/**
 * Example 7: Cache Invalidation
 * Invalidate permission cache after changes
 */
export const CacheInvalidationExample: React.FC = () => {
  const { can, invalidateCache, loading } = usePermissionCheck();
  
  const handlePermissionChange = async () => {
    // After making permission changes via API
    // (e.g., assigning a role, granting a permission)
    
    // Invalidate the cache to force refetch
    await invalidateCache();
    
    // Now the permissions will be refetched and UI will update
    console.log('Permissions refreshed');
  };
  
  return (
    <div>
      <button onClick={handlePermissionChange}>
        Update My Permissions
      </button>
      
      {loading && <div>Refreshing permissions...</div>}
      
      {can(ResourceType.APPLICATION, PermissionAction.CREATE) && (
        <div>You can create applications</div>
      )}
    </div>
  );
};

/**
 * Example 8: Replacing Hardcoded Role Checks
 * Before and After comparison
 */

// BEFORE: Hardcoded role check
export const BeforeExample: React.FC<{ user: any }> = ({ user }) => {
  return (
    <div>
      {user?.role === 'admin' && <button>Admin Action</button>}
      {user?.role === 'manager' && <button>Manager Action</button>}
    </div>
  );
};

// AFTER: Dynamic permission check
export const AfterExample: React.FC = () => {
  const { hasRole, can } = usePermissionCheck();
  
  return (
    <div>
      {hasRole('admin') && <button>Admin Action</button>}
      {can(ResourceType.APPLICATION, PermissionAction.APPROVE) && (
        <button>Approve Action</button>
      )}
    </div>
  );
};

/**
 * Example 9: Loading State Handling
 * Prevent premature access decisions
 */
export const LoadingStateExample: React.FC = () => {
  const { can, loading } = usePermissionCheck();
  
  // Don't render sensitive content while loading
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded mb-4"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }
  
  // Only render after permissions are loaded
  return (
    <div>
      {can(ResourceType.APPLICATION, PermissionAction.CREATE) ? (
        <button>Create Application</button>
      ) : (
        <div>You don't have permission to create applications</div>
      )}
    </div>
  );
};

/**
 * Example 10: Custom Hook Wrapper
 * Create domain-specific permission hooks
 */
export const useApplicationPermissions = () => {
  const { can, loading } = usePermissionCheck();
  
  return {
    canCreateApplication: can(ResourceType.APPLICATION, PermissionAction.CREATE),
    canViewApplication: can(ResourceType.APPLICATION, PermissionAction.READ),
    canEditApplication: can(ResourceType.APPLICATION, PermissionAction.UPDATE),
    canDeleteApplication: can(ResourceType.APPLICATION, PermissionAction.DELETE),
    canApproveApplication: can(ResourceType.APPLICATION, PermissionAction.APPROVE),
    canRejectApplication: can(ResourceType.APPLICATION, PermissionAction.REJECT),
    loading,
  };
};

// Usage of custom hook
export const CustomHookExample: React.FC = () => {
  const {
    canCreateApplication,
    canApproveApplication,
    loading,
  } = useApplicationPermissions();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {canCreateApplication && <button>Create</button>}
      {canApproveApplication && <button>Approve</button>}
    </div>
  );
};
