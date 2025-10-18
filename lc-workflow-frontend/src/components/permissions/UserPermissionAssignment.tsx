"use client";

/**
 * User Permission Assignment Component
 * 
 * Comprehensive interface for managing user roles and permissions.
 * Supports user search, role assignment, direct permission grants, and effective permission display.
 */

import React, { useState, useMemo } from 'react';
import { Search, User as UserIcon, Shield, AlertCircle, X, Plus, Trash2, Filter } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { 
  useUserPermissions, 
  useAssignRoleToUser, 
  useRevokeRoleFromUser, 
  useGrantPermissionToUser, 
  useRevokePermissionFromUser,
  useRoleList,
  usePermissionList
} from '@/hooks/usePermissionManagement';
import useDebounce from '@/hooks/useDebounce';
import { User, Department, Branch } from '@/types/models';
import { EffectivePermission, ResourceType } from '@/types/permissions';
import { PermissionErrorBoundary } from './PermissionErrorBoundary';
import { PermissionListSkeleton } from './PermissionLoadingStates';

interface UserPermissionAssignmentProps {
  className?: string;
  userId?: string;
}

export default function UserPermissionAssignment({ className = '', userId }: UserPermissionAssignmentProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    department_id: '',
    branch_id: '',
    role: '',
  });

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch user if userId is provided
  const { data: usersData } = useUsers({
    search: '',
    size: 1,
  });

  // Set selected user if userId prop is provided
  React.useEffect(() => {
    if (userId && usersData?.items) {
      const user = usersData.items.find((u: User) => u.id === userId);
      if (user) {
        setSelectedUser(user);
      }
    }
  }, [userId, usersData]);

  return (
    <PermissionErrorBoundary>
      <div className={`space-y-6 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              User Permission Assignment
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Assign roles and permissions to users
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Search Panel */}
          <div className="lg:col-span-1">
            <UserSearchPanel
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              debouncedSearch={debouncedSearch}
              filters={filters}
              onFiltersChange={setFilters}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
              selectedUser={selectedUser}
              onUserSelect={setSelectedUser}
            />
          </div>

          {/* User Details and Permissions Panel */}
          <div className="lg:col-span-2">
            {selectedUser ? (
              <UserPermissionsPanel user={selectedUser} />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No User Selected
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Search and select a user to view and manage their permissions
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PermissionErrorBoundary>
  );
}

// ============================================================================
// User Search Panel Component
// ============================================================================

interface UserSearchPanelProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  debouncedSearch: string;
  filters: {
    department_id: string;
    branch_id: string;
    role: string;
  };
  onFiltersChange: (filters: any) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  selectedUser: User | null;
  onUserSelect: (user: User) => void;
}

function UserSearchPanel({
  searchQuery,
  onSearchChange,
  debouncedSearch,
  filters,
  onFiltersChange,
  showFilters,
  onToggleFilters,
  selectedUser,
  onUserSelect,
}: UserSearchPanelProps) {
  const { data: usersData, isLoading, error } = useUsers({
    search: debouncedSearch,
    department_id: filters.department_id || undefined,
    branch_id: filters.branch_id || undefined,
    role: filters.role || undefined,
    size: 50,
  });

  const users = usersData?.items || [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search users by name, email, or username..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Toggle */}
        <button
          onClick={onToggleFilters}
          className="mt-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <select
                value={filters.role}
                onChange={(e) => onFiltersChange({ ...filters, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="officer">Officer</option>
              </select>
            </div>

            {filters.role || filters.department_id || filters.branch_id ? (
              <button
                onClick={() => onFiltersChange({ department_id: '', branch_id: '', role: '' })}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Clear Filters
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* User List */}
      <div className="overflow-y-auto max-h-[600px]">
        {isLoading ? (
          <div className="p-4">
            <PermissionListSkeleton count={3} />
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to load users
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No users found
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <UserListItem
                key={user.id}
                user={user}
                isSelected={selectedUser?.id === user.id}
                onSelect={() => onUserSelect(user)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Results Count */}
      {usersData && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
          Showing {users.length} of {usersData.total} users
        </div>
      )}
    </div>
  );
}

// ============================================================================
// User List Item Component
// ============================================================================

interface UserListItemProps {
  user: User;
  isSelected: boolean;
  onSelect: () => void;
}

function UserListItem({ user, isSelected, onSelect }: UserListItemProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {user.profile_image_url ? (
            <img
              src={user.profile_image_url}
              alt={user.username}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user.first_name} {user.last_name}
            </p>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
              user.role === 'manager' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}>
              {user.role}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {user.email}
          </p>
          {user.department && (
            <p className="text-xs text-gray-500 dark:text-gray-500 truncate mt-1">
              {user.department.name}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// User Permissions Panel Component
// ============================================================================

interface UserPermissionsPanelProps {
  user: User;
}

function UserPermissionsPanel({ user }: UserPermissionsPanelProps) {
  const { data: permissionsData, isLoading, error } = useUserPermissions(user.id);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <PermissionListSkeleton count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load user permissions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Profile Summary */}
      <UserProfileSummary user={user} permissionsData={permissionsData} />

      {/* Role Assignments */}
      <RoleAssignmentSection user={user} permissionsData={permissionsData} />

      {/* Direct Permissions */}
      <DirectPermissionsSection user={user} permissionsData={permissionsData} />

      {/* Effective Permissions */}
      <EffectivePermissionsSection permissionsData={permissionsData} />
    </div>
  );
}

// ============================================================================
// User Profile Summary Component
// ============================================================================

interface UserProfileSummaryProps {
  user: User;
  permissionsData: any;
}

function UserProfileSummary({ user, permissionsData }: UserProfileSummaryProps) {
  const roleCount = permissionsData?.roles?.length || 0;
  const directPermissionCount = permissionsData?.direct_permissions?.length || 0;
  const effectivePermissionCount = permissionsData?.effective_permissions?.length || 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {user.profile_image_url ? (
            <img
              src={user.profile_image_url}
              alt={user.username}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-gray-500 dark:text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {user.first_name} {user.last_name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {user.email}
          </p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {roleCount} {roleCount === 1 ? 'Role' : 'Roles'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {directPermissionCount} Direct Permissions
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {effectivePermissionCount} Total Permissions
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Role Assignment Section Component
// ============================================================================

interface RoleAssignmentSectionProps {
  user: User;
  permissionsData: any;
}

function RoleAssignmentSection({ user, permissionsData }: RoleAssignmentSectionProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [roleToRemove, setRoleToRemove] = useState<string | null>(null);

  const assignedRoles = permissionsData?.roles || [];

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Role Assignments
          </h3>
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Assign Role
          </button>
        </div>

        {assignedRoles.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No roles assigned to this user
            </p>
            <button
              onClick={() => setShowAssignModal(true)}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              Assign a role
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {assignedRoles.map((role: any) => (
              <RoleAssignmentCard
                key={role.id}
                role={role}
                onRemove={() => setRoleToRemove(role.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Assign Role Modal */}
      {showAssignModal && (
        <AssignRoleModal
          userId={user.id}
          assignedRoleIds={assignedRoles.map((r: any) => r.id)}
          onClose={() => setShowAssignModal(false)}
        />
      )}

      {/* Remove Role Confirmation */}
      {roleToRemove && (
        <RemoveRoleConfirmation
          userId={user.id}
          roleId={roleToRemove}
          roleName={assignedRoles.find((r: any) => r.id === roleToRemove)?.display_name || ''}
          onClose={() => setRoleToRemove(null)}
        />
      )}
    </>
  );
}

// ============================================================================
// Direct Permissions Section Component
// ============================================================================

interface DirectPermissionsSectionProps {
  user: User;
  permissionsData: any;
}

function DirectPermissionsSection({ user, permissionsData }: DirectPermissionsSectionProps) {
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [permissionToRevoke, setPermissionToRevoke] = useState<string | null>(null);

  const directPermissions = permissionsData?.direct_permissions || [];

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Direct Permissions
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Permissions granted or denied directly to this user, overriding role-based permissions
            </p>
          </div>
          <button
            onClick={() => setShowGrantModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Grant Permission
          </button>
        </div>

        {directPermissions.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No direct permissions assigned
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              User permissions are inherited from assigned roles
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {directPermissions.map((userPerm: any) => (
              <DirectPermissionCard
                key={userPerm.id}
                userPermission={userPerm}
                onRevoke={() => setPermissionToRevoke(userPerm.permission_id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Grant Permission Modal */}
      {showGrantModal && (
        <GrantPermissionModal
          userId={user.id}
          existingPermissionIds={directPermissions.map((p: any) => p.permission_id)}
          onClose={() => setShowGrantModal(false)}
        />
      )}

      {/* Revoke Permission Confirmation */}
      {permissionToRevoke && (
        <RevokePermissionConfirmation
          userId={user.id}
          permissionId={permissionToRevoke}
          permissionName={
            directPermissions.find((p: any) => p.permission_id === permissionToRevoke)?.permission?.name || ''
          }
          onClose={() => setPermissionToRevoke(null)}
        />
      )}
    </>
  );
}

// ============================================================================
// Role Assignment Card Component
// ============================================================================

interface RoleAssignmentCardProps {
  role: any;
  onRemove: () => void;
}

function RoleAssignmentCard({ role, onRemove }: RoleAssignmentCardProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <Shield className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {role.display_name}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {role.description}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-500">
              Level {role.level}
            </span>
            {role.is_system_role && (
              <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
                System
              </span>
            )}
            {!role.is_active && (
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded">
                Inactive
              </span>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={onRemove}
        disabled={role.is_system_role}
        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={role.is_system_role ? 'Cannot remove system role' : 'Remove role'}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================================
// Assign Role Modal Component
// ============================================================================

interface AssignRoleModalProps {
  userId: string;
  assignedRoleIds: string[];
  onClose: () => void;
}

function AssignRoleModal({ userId, assignedRoleIds, onClose }: AssignRoleModalProps) {
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: rolesData, isLoading } = useRoleList({
    is_active: true,
    search: searchQuery,
    size: 100,
  });

  const assignRoleMutation = useAssignRoleToUser();

  const availableRoles = useMemo(() => {
    const roles = rolesData?.items || [];
    return roles.filter(role => !assignedRoleIds.includes(role.id));
  }, [rolesData, assignedRoleIds]);

  const handleAssign = async () => {
    if (!selectedRoleId) return;

    try {
      await assignRoleMutation.mutateAsync({
        userId,
        data: { role_id: selectedRoleId },
      });
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Assign Role
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search roles..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Role List */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : availableRoles.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No available roles to assign
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableRoles.map((role) => (
                <label
                  key={role.id}
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedRoleId === role.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.id}
                    checked={selectedRoleId === role.id}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {role.display_name}
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        Level {role.level}
                      </span>
                      {role.is_system_role && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
                          System
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {role.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedRoleId || assignRoleMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {assignRoleMutation.isPending ? 'Assigning...' : 'Assign Role'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Remove Role Confirmation Component
// ============================================================================

interface RemoveRoleConfirmationProps {
  userId: string;
  roleId: string;
  roleName: string;
  onClose: () => void;
}

function RemoveRoleConfirmation({ userId, roleId, roleName, onClose }: RemoveRoleConfirmationProps) {
  const revokeRoleMutation = useRevokeRoleFromUser();

  const handleRemove = async () => {
    try {
      await revokeRoleMutation.mutateAsync({ userId, roleId });
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Remove Role
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This action cannot be undone
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
            Are you sure you want to remove the role <span className="font-semibold">{roleName}</span> from this user?
            This will revoke all permissions associated with this role.
          </p>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRemove}
              disabled={revokeRoleMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {revokeRoleMutation.isPending ? 'Removing...' : 'Remove Role'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Direct Permission Card Component
// ============================================================================

interface DirectPermissionCardProps {
  userPermission: any;
  onRevoke: () => void;
}

function DirectPermissionCard({ userPermission, onRevoke }: DirectPermissionCardProps) {
  const permission = userPermission.permission;
  const isGranted = userPermission.is_granted;

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border ${
      isGranted
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    }`}>
      <div className="flex items-center gap-3 flex-1">
        <div className="flex-shrink-0">
          <Shield className={`w-5 h-5 ${isGranted ? 'text-green-600' : 'text-red-600'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {permission.name}
            </p>
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
              isGranted
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {isGranted ? 'Granted' : 'Denied'}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {permission.description}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-500">
              {permission.resource_type} • {permission.action}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-500">
              Scope: {permission.scope}
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={onRevoke}
        className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title="Revoke permission"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================================
// Grant Permission Modal Component
// ============================================================================

interface GrantPermissionModalProps {
  userId: string;
  existingPermissionIds: string[];
  onClose: () => void;
}

function GrantPermissionModal({ userId, existingPermissionIds, onClose }: GrantPermissionModalProps) {
  const [selectedPermissionId, setSelectedPermissionId] = useState('');
  const [isGranted, setIsGranted] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<ResourceType | ''>('');

  const { data: permissionsData, isLoading } = usePermissionList({
    is_active: true,
    search: searchQuery,
    resource_type: resourceTypeFilter || undefined,
    size: 100,
  });

  const grantPermissionMutation = useGrantPermissionToUser();

  const availablePermissions = useMemo(() => {
    const permissions = permissionsData?.items || [];
    return permissions.filter(perm => !existingPermissionIds.includes(perm.id));
  }, [permissionsData, existingPermissionIds]);

  const handleGrant = async () => {
    if (!selectedPermissionId) return;

    try {
      await grantPermissionMutation.mutateAsync({
        userId,
        data: {
          permission_id: selectedPermissionId,
          is_granted: isGranted,
        },
      });
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Grant Direct Permission
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Grant/Deny Toggle */}
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Permission Type
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="permission-type"
                  checked={isGranted}
                  onChange={() => setIsGranted(true)}
                  className="text-green-600"
                />
                <span className="text-sm text-gray-900 dark:text-white">
                  Grant (Allow access)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="permission-type"
                  checked={!isGranted}
                  onChange={() => setIsGranted(false)}
                  className="text-red-600"
                />
                <span className="text-sm text-gray-900 dark:text-white">
                  Deny (Override role permissions)
                </span>
              </label>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              {isGranted
                ? 'Grant this permission directly to the user'
                : 'Deny this permission, overriding any role-based grants'}
            </p>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search permissions..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <select
              value={resourceTypeFilter}
              onChange={(e) => setResourceTypeFilter(e.target.value as ResourceType | '')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">All Resource Types</option>
              <option value={ResourceType.USER}>User</option>
              <option value={ResourceType.APPLICATION}>Application</option>
              <option value={ResourceType.DEPARTMENT}>Department</option>
              <option value={ResourceType.BRANCH}>Branch</option>
              <option value={ResourceType.FILE}>File</option>
              <option value={ResourceType.ANALYTICS}>Analytics</option>
              <option value={ResourceType.SYSTEM}>System</option>
            </select>
          </div>

          {/* Permission List */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : availablePermissions.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No available permissions to assign
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availablePermissions.map((permission) => (
                <label
                  key={permission.id}
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedPermissionId === permission.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="permission"
                    value={permission.id}
                    checked={selectedPermissionId === permission.id}
                    onChange={(e) => setSelectedPermissionId(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {permission.name}
                      </p>
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded">
                        {permission.resource_type}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                        {permission.action}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
                        {permission.scope}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {permission.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGrant}
            disabled={!selectedPermissionId || grantPermissionMutation.isPending}
            className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isGranted
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {grantPermissionMutation.isPending
              ? 'Processing...'
              : isGranted
              ? 'Grant Permission'
              : 'Deny Permission'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Revoke Permission Confirmation Component
// ============================================================================

interface RevokePermissionConfirmationProps {
  userId: string;
  permissionId: string;
  permissionName: string;
  onClose: () => void;
}

function RevokePermissionConfirmation({ userId, permissionId, permissionName, onClose }: RevokePermissionConfirmationProps) {
  const revokePermissionMutation = useRevokePermissionFromUser();

  const handleRevoke = async () => {
    try {
      await revokePermissionMutation.mutateAsync({ userId, permissionId });
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Revoke Permission
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This action cannot be undone
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
            Are you sure you want to revoke the permission <span className="font-semibold">{permissionName}</span> from this user?
          </p>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRevoke}
              disabled={revokePermissionMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {revokePermissionMutation.isPending ? 'Revoking...' : 'Revoke Permission'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Effective Permissions Section Component
// ============================================================================

interface EffectivePermissionsSectionProps {
  permissionsData: any;
}

function EffectivePermissionsSection({ permissionsData }: EffectivePermissionsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'role' | 'direct'>('all');

  const effectivePermissions = permissionsData?.effective_permissions || [];

  const filteredPermissions = useMemo(() => {
    return effectivePermissions.filter((ep: EffectivePermission) => {
      const matchesSearch = !searchQuery || 
        ep.permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.permission.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesResourceType = !resourceTypeFilter || 
        ep.permission.resource_type === resourceTypeFilter;
      
      const matchesSource = sourceFilter === 'all' || ep.source === sourceFilter;

      return matchesSearch && matchesResourceType && matchesSource;
    });
  }, [effectivePermissions, searchQuery, resourceTypeFilter, sourceFilter]);

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, EffectivePermission[]> = {};
    filteredPermissions.forEach((ep: EffectivePermission) => {
      const resourceType = ep.permission.resource_type;
      if (!groups[resourceType]) {
        groups[resourceType] = [];
      }
      groups[resourceType].push(ep);
    });
    return groups;
  }, [filteredPermissions]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Effective Permissions
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          All permissions currently active for this user from all sources
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search permissions..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <select
          value={resourceTypeFilter}
          onChange={(e) => setResourceTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        >
          <option value="">All Resources</option>
          <option value="user">User</option>
          <option value="application">Application</option>
          <option value="department">Department</option>
          <option value="branch">Branch</option>
          <option value="file">File</option>
          <option value="analytics">Analytics</option>
          <option value="system">System</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        >
          <option value="all">All Sources</option>
          <option value="role">From Roles</option>
          <option value="direct">Direct</option>
        </select>
      </div>

      {/* Permission Count */}
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredPermissions.length} of {effectivePermissions.length} permissions
      </div>

      {/* Grouped Permissions */}
      {Object.keys(groupedPermissions).length === 0 ? (
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No permissions found
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPermissions).map(([resourceType, permissions]) => (
            <div key={resourceType}>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 capitalize">
                {resourceType} Permissions ({permissions.length})
              </h4>
              <div className="space-y-2">
                {permissions.map((ep: EffectivePermission, index: number) => (
                  <EffectivePermissionCard key={`${ep.permission.id}-${index}`} effectivePermission={ep} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Effective Permission Card Component
// ============================================================================

interface EffectivePermissionCardProps {
  effectivePermission: EffectivePermission;
}

function EffectivePermissionCard({ effectivePermission }: EffectivePermissionCardProps) {
  const { permission, source, role_name, is_granted } = effectivePermission;

  return (
    <div className={`p-3 rounded-lg border ${
      is_granted
        ? 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {permission.name}
            </p>
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
              {permission.action}
            </span>
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
              {permission.scope}
            </span>
            {!is_granted && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded">
                Denied
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {permission.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded ${
              source === 'role'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              {source === 'role' ? `From Role: ${role_name}` : 'Direct Permission'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
