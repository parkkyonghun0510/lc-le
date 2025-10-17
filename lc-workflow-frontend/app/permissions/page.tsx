"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ShieldCheckIcon,
  UserGroupIcon,
  CogIcon,
  ChartBarIcon,
  DocumentTextIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import { useRoles, useApplyPermissionTemplate, usePermissionTemplates } from '@/hooks/usePermissions';
import { useUsers } from '@/hooks/useUsers';
import { User } from '@/types/models';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useQueryClient } from '@tanstack/react-query';

// Lazy load heavy components with loading fallbacks
const PermissionMatrix = dynamic(
  () => import('@/components/permissions/PermissionMatrix'),
  {
    loading: () => (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    ),
    ssr: false
  }
);

const RoleManagement = dynamic(
  () => import('@/components/permissions/RoleManagement'),
  {
    loading: () => (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    ),
    ssr: false
  }
);

const UserPermissionAssignment = dynamic(
  () => import('@/components/permissions/UserPermissionAssignment'),
  {
    loading: () => (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    ),
    ssr: false
  }
);

const GenerateTemplatesModal = dynamic(
  () => import('@/components/permissions/GenerateTemplatesModal'),
  {
    loading: () => null,
    ssr: false
  }
);

const PermissionManagement = dynamic(
  () => import('@/components/permissions/PermissionManagement'),
  {
    loading: () => (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    ),
    ssr: false
  }
);

const PermissionAuditTrail = dynamic(
  () => import('@/components/permissions/PermissionAuditTrail'),
  {
    loading: () => (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    ),
    ssr: false
  }
);

export default function PermissionsPage() {
  const [activeTab, setActiveTab] = useState<'matrix' | 'roles' | 'users' | 'permissions' | 'templates' | 'audit'>('matrix');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Prefetch data for tabs on hover
  const handleTabHover = (tabId: string) => {
    if (tabId === 'matrix') {
      queryClient.prefetchQuery({
        queryKey: ['permission-matrix'],
        queryFn: async () => {
          const response = await fetch('/api/v1/permissions/matrix', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
          });
          if (!response.ok) throw new Error('Failed to fetch permission matrix');
          return response.json();
        },
        staleTime: 5 * 60 * 1000 // 5 minutes
      });
    } else if (tabId === 'roles') {
      queryClient.prefetchQuery({
        queryKey: ['roles', { showInactive: false }],
        queryFn: async () => {
          const response = await fetch('/api/v1/permissions/roles?is_active=true', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
          });
          if (!response.ok) throw new Error('Failed to fetch roles');
          return response.json();
        },
        staleTime: 5 * 60 * 1000
      });
    }
  };

  const tabs = [
    {
      id: 'matrix',
      name: 'Permission Matrix',
      icon: ShieldCheckIcon,
      description: 'View and manage role-permission assignments'
    },
    {
      id: 'roles',
      name: 'Role Management',
      icon: UserGroupIcon,
      description: 'Create and configure system roles'
    },
    {
      id: 'users',
      name: 'User Permissions',
      icon: CogIcon,
      description: 'Manage individual user permissions'
    },
    {
      id: 'permissions',
      name: 'Permissions',
      icon: KeyIcon,
      description: 'Manage individual permissions'
    },
    {
      id: 'templates',
      name: 'Permission Templates',
      icon: DocumentTextIcon,
      description: 'Create and apply permission templates'
    },
    {
      id: 'audit',
      name: 'Audit Trail',
      icon: ChartBarIcon,
      description: 'Track permission changes and access'
    }
  ];

  return (
    <ErrorBoundary context="PermissionsPage">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Permission Management
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Manage roles, permissions, and access control across the system
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Phase 3.1 Complete
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-gray-200 mt-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    onMouseEnter={() => handleTabHover(tab.id)}
                    className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <Icon
                      className={`-ml-0.5 mr-2 h-5 w-5 ${activeTab === tab.id
                        ? 'text-indigo-500'
                        : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                    />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'matrix' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900">Permission Matrix</h2>
                <p className="mt-1 text-sm text-gray-500">
                  View and manage permissions assigned to roles. Click on the permission indicators to grant or revoke permissions.
                </p>
              </div>
              <PermissionMatrix />
            </div>
          )}

          {activeTab === 'roles' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900">Role Management</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Create, edit, and manage system roles. Define role hierarchies and organize permissions into logical groups.
                </p>
              </div>
              <RoleManagement />
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900">User Permissions</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Manage individual user permissions and role assignments. Override role-based permissions for specific users.
                </p>
              </div>
              <UserPermissionManagement />
            </div>
          )}

          {activeTab === 'permissions' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900">Permission Management</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Create, edit, and manage individual permissions. Define what actions users can perform on specific resources.
                </p>
              </div>
              <PermissionManagement />
            </div>
          )}

          {activeTab === 'templates' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900">Permission Templates</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Create and manage permission templates for common role configurations. Apply templates to quickly set up new roles.
                </p>
              </div>
              <PermissionTemplates onGenerateClick={() => setIsGenerateModalOpen(true)} />
            </div>
          )}

          {activeTab === 'audit' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900">Audit Trail</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Track all permission changes, role assignments, and access patterns. Monitor system security and compliance.
                </p>
              </div>
              <PermissionAuditTrail />
            </div>
          )}
        </div>

        {/* Generate Templates Modal */}
        <GenerateTemplatesModal
          isOpen={isGenerateModalOpen}
          onClose={() => setIsGenerateModalOpen(false)}
          onTemplateGenerated={(template) => {
            console.log('Template generated:', template);
            // You could add a toast notification here
          }}
        />
      </div>
    </ErrorBoundary>
  );
}

// User Permission Management Component
function UserPermissionManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch users based on search
  const { data: usersData, isLoading: isSearching } = useUsers({
    search: debouncedSearchTerm,
    size: 10,
    status: 'active'
  });

  const users = usersData?.items || [];

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSearchTerm('');
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
  };

  return (
    <div className="space-y-6">
      {/* User Search Section */}
      {!selectedUser && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-8">
            <CogIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">User Permission Management</h3>
            <p className="text-gray-500 mb-6">
              Search for users by name, email, or employee code to manage their permissions and role assignments.
            </p>

            {/* Search Input */}
            <div className="max-w-md mx-auto">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or employee code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {isSearching && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>

              {/* Search Results */}
              {searchTerm && debouncedSearchTerm && (
                <div className="mt-2 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                      Searching users...
                    </div>
                  ) : users.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {users.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleSelectUser(user)}
                          className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  {user.role}
                                </span>
                                {user.department?.name && (
                                  <span className="text-xs text-gray-500">
                                    {user.department.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No users found matching "{debouncedSearchTerm}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected User Permission Assignment */}
      {selectedUser && (
        <div>
          {/* Selected User Header */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-lg font-medium text-indigo-600">
                    {selectedUser.first_name[0]}{selectedUser.last_name[0]}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                    {selectedUser.department?.name && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-500">{selectedUser.department.name}</span>
                      </>
                    )}
                    {selectedUser.branch?.name && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-500">{selectedUser.branch.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleClearSelection}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Change user"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* User Permission Assignment Component */}
          <UserPermissionAssignment userId={selectedUser.id} />
        </div>
      )}
    </div>
  );
}

function PermissionTemplates({ onGenerateClick }: { onGenerateClick: () => void }) {
  const { data: templates = [], isLoading: templatesLoading } = usePermissionTemplates();
  const { data: roles = [] } = useRoles();
  const applyTemplate = useApplyPermissionTemplate();
  const [showRoleSelector, setShowRoleSelector] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    setShowRoleSelector(templateId);
  };

  const handleRoleSelection = async (roleId: string) => {
    if (!selectedTemplate) return;

    try {
      await applyTemplate.mutateAsync({
        templateId: selectedTemplate,
        targetType: 'role',
        targetId: roleId
      });
      setShowRoleSelector(null);
      setSelectedTemplate(null);
      // You could add a success toast here
    } catch (error) {
      console.error('Failed to apply template:', error);
      // You could add an error toast here
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Buttons */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Available Templates</h3>
          <p className="text-sm text-gray-500">Pre-configured permission sets for common roles</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onGenerateClick}
            className="inline-flex items-center px-4 py-2 border border-indigo-600 shadow-sm text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Generate Default Templates
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
            Create Template
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <DocumentTextIcon className="h-8 w-8 text-indigo-500" />
              <span className="text-xs text-gray-500">Used {template.usage_count} times</span>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">{template.name}</h4>
            <p className="text-sm text-gray-600 mb-4">{template.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{template.permissions?.length || 0} permissions</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleApplyTemplate(template.id)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  Apply
                </button>
                <button className="text-gray-600 hover:text-gray-800 text-sm font-medium">
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Role Selection Modal */}
      {showRoleSelector && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Select Role to Apply Template</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Choose which role should receive the permissions from this template.
                </p>
              </div>

              <div className="bg-white px-6 py-4 max-h-96 overflow-y-auto">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSelection(role.id)}
                    disabled={applyTemplate.isPending}
                    className="w-full text-left p-3 mb-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{role.display_name}</p>
                        <p className="text-xs text-gray-500">{role.description}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${role.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {role.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={() => setShowRoleSelector(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

