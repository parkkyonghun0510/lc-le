/**
 * usePermissionCheck Hook - Usage Examples
 * 
 * This file demonstrates how to properly use the updated usePermissionCheck hook
 * with proper loading state handling and admin role support.
 */

import React from 'react';
import { usePermissionCheck } from './usePermissionCheck';
import { ResourceType, PermissionAction } from '@/types/permissions';

/**
 * Example component showing proper permission checking with loading states
 */
export const PermissionAwareComponent: React.FC = () => {
  const { can, hasRole, hasPermission, isAdmin, loading, error } = usePermissionCheck();

  // Handle loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading permissions...</span>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">
          Failed to load permissions. Some features may not be available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Permission Examples</h2>
      
      {/* Admin check */}
      {isAdmin() && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-700 font-medium">
            🛡️ Admin Access: You have full system access
          </p>
        </div>
      )}
      
      {/* Resource-based permission checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PermissionCard
          title="Create Applications"
          hasPermission={can(ResourceType.APPLICATION, PermissionAction.CREATE)}
          description="Ability to create new loan applications"
        />
        
        <PermissionCard
          title="Manage Users"
          hasPermission={can(ResourceType.USER, PermissionAction.MANAGE)}
          description="Ability to manage user accounts"
        />
        
        <PermissionCard
          title="View System Settings"
          hasPermission={can(ResourceType.SYSTEM, PermissionAction.VIEW_ALL)}
          description="Access to system configuration"
        />
      </div>
      
      {/* Role-based checks */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium mb-2">Role Checks</h3>
        <div className="space-y-2">
          <RoleIndicator role="admin" hasRole={hasRole('admin')} />
          <RoleIndicator role="manager" hasRole={hasRole('manager')} />
          <RoleIndicator role="officer" hasRole={hasRole('officer')} />
        </div>
      </div>
      
      {/* Named permission checks */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium mb-2">Named Permission Checks</h3>
        <div className="space-y-2">
          <PermissionIndicator 
            permission="SYSTEM.VIEW_ALL" 
            hasPermission={hasPermission('SYSTEM.VIEW_ALL')} 
          />
          <PermissionIndicator 
            permission="APPLICATION.APPROVE" 
            hasPermission={hasPermission('APPLICATION.APPROVE')} 
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Component for displaying permission status
 */
interface PermissionCardProps {
  title: string;
  hasPermission: boolean | null;
  description: string;
}

const PermissionCard: React.FC<PermissionCardProps> = ({ 
  title, 
  hasPermission, 
  description 
}) => {
  const getStatusColor = () => {
    if (hasPermission === null) return 'border-gray-300 bg-gray-50';
    return hasPermission ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50';
  };

  const getStatusIcon = () => {
    if (hasPermission === null) return '⏳';
    return hasPermission ? '✅' : '❌';
  };

  const getStatusText = () => {
    if (hasPermission === null) return 'Checking...';
    return hasPermission ? 'Granted' : 'Denied';
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium">{title}</h4>
        <span className="text-lg">{getStatusIcon()}</span>
      </div>
      <p className="text-sm text-gray-600 mb-2">{description}</p>
      <p className="text-sm font-medium">{getStatusText()}</p>
    </div>
  );
};

/**
 * Component for displaying role status
 */
interface RoleIndicatorProps {
  role: string;
  hasRole: boolean | null;
}

const RoleIndicator: React.FC<RoleIndicatorProps> = ({ role, hasRole }) => {
  const getIcon = () => {
    if (hasRole === null) return '⏳';
    return hasRole ? '✅' : '❌';
  };

  return (
    <div className="flex items-center justify-between">
      <span className="capitalize">{role}</span>
      <span>{getIcon()}</span>
    </div>
  );
};

/**
 * Component for displaying named permission status
 */
interface PermissionIndicatorProps {
  permission: string;
  hasPermission: boolean | null;
}

const PermissionIndicator: React.FC<PermissionIndicatorProps> = ({ 
  permission, 
  hasPermission 
}) => {
  const getIcon = () => {
    if (hasPermission === null) return '⏳';
    return hasPermission ? '✅' : '❌';
  };

  return (
    <div className="flex items-center justify-between">
      <code className="text-sm bg-white px-2 py-1 rounded">{permission}</code>
      <span>{getIcon()}</span>
    </div>
  );
};

/**
 * Example of conditional rendering based on permissions
 */
export const ConditionalFeature: React.FC = () => {
  const { can, loading } = usePermissionCheck();

  // Don't render anything while loading
  if (loading) {
    return null;
  }

  // Check permission - null means still loading, false means denied
  const canManageUsers = can(ResourceType.USER, PermissionAction.MANAGE);
  
  // Don't render if permission is denied
  if (canManageUsers === false) {
    return null;
  }

  // Show loading state if permission check is still pending
  if (canManageUsers === null) {
    return <div className="animate-pulse bg-gray-200 h-8 rounded"></div>;
  }

  // Render feature if permission is granted
  return (
    <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
      Manage Users
    </button>
  );
};

/**
 * Example of using permissions in a guard component
 */
interface PermissionGuardProps {
  resource: ResourceType | string;
  action: PermissionAction | string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  resource,
  action,
  fallback = null,
  children
}) => {
  const { can, loading } = usePermissionCheck();

  // Show loading state while checking permissions
  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 h-4 rounded w-full"></div>
    );
  }

  const hasPermission = can(resource, action);

  // Still checking permission
  if (hasPermission === null) {
    return (
      <div className="animate-pulse bg-gray-200 h-4 rounded w-full"></div>
    );
  }

  // Permission denied
  if (!hasPermission) {
    return <>{fallback}</>;
  }

  // Permission granted
  return <>{children}</>;
};

export default PermissionAwareComponent;