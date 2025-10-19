"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  ShieldCheckIcon,
  UserGroupIcon,
  CogIcon,
  ChartBarIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import { User } from '@/types/models';
import ErrorBoundary from '@/components/ErrorBoundary';
import { PermissionErrorBoundary } from '@/components/permissions/PermissionErrorBoundary';
import { useQueryClient } from '@tanstack/react-query';
import { useUsers } from '@/hooks/useUsers';

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

const PermissionTemplates = dynamic(
  () => import('@/components/permissions/PermissionTemplates'),
  {
    loading: () => (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
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
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();

  // Prevent hydration mismatch by ensuring client-side rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prefetch data for tabs on hover (only after mounting to avoid SSR issues)
  const handleTabHover = (tabId: string) => {
    if (!mounted) return; // Prevent SSR issues
    
    if (tabId === 'matrix') {
      queryClient.prefetchQuery({
        queryKey: ['permission-matrix'],
        queryFn: async () => {
          const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
          if (!token) throw new Error('No access token available');
          
          const response = await fetch('/api/v1/permissions/matrix', {
            headers: {
              'Authorization': `Bearer ${token}`
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
          const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
          if (!token) throw new Error('No access token available');
          
          const response = await fetch('/api/v1/permissions/roles?is_active=true', {
            headers: {
              'Authorization': `Bearer ${token}`
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

  // Show loading skeleton during hydration to prevent mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-gray-200 mt-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <div key={tab.id} className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-24 mb-4"></div>
                </div>
              ))}
            </nav>
          </div>
          <div className="py-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary context="PermissionsPage">
      <PermissionErrorBoundary context="PermissionsPageContent">
        <div className="min-h-screen bg-gray-50">
        {/* Skip to main content link for accessibility */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-md"
        >
          Skip to main content
        </a>

        {/* Header */}
        <header className="bg-white shadow">
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
                  <span 
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    role="status"
                    aria-label="Implementation status: Phase 3.1 Complete"
                  >
                    Phase 3.1 Complete
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-gray-200 mt-6 relative">
            {/* Scroll indicators for mobile */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none sm:hidden" aria-hidden="true"></div>
            <nav 
              className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" 
              data-testid="permissions-tabs"
              role="tablist"
              aria-label="Permission management sections"
              style={{ 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    onMouseEnter={() => handleTabHover(tab.id)}
                    onKeyDown={(e) => {
                      // Keyboard navigation for tabs
                      if (e.key === 'ArrowRight') {
                        const currentIndex = tabs.findIndex(t => t.id === tab.id);
                        const nextTab = tabs[(currentIndex + 1) % tabs.length];
                        setActiveTab(nextTab.id as any);
                        e.preventDefault();
                      } else if (e.key === 'ArrowLeft') {
                        const currentIndex = tabs.findIndex(t => t.id === tab.id);
                        const prevTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
                        setActiveTab(prevTab.id as any);
                        e.preventDefault();
                      }
                    }}
                    className={`group inline-flex items-center py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${isActive
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    data-testid={`tab-${tab.id}`}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`tabpanel-${tab.id}`}
                    aria-label={`${tab.name}: ${tab.description}`}
                    tabIndex={isActive ? 0 : -1}
                  >
                    <Icon
                      className={`-ml-0.5 mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 ${isActive
                        ? 'text-indigo-500'
                        : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                      aria-hidden="true"
                    />
                    <span className="hidden sm:inline">{tab.name}</span>
                    <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <main 
          id="main-content" 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          role="main"
        >
          {activeTab === 'matrix' && (
            <div 
              role="tabpanel" 
              id="tabpanel-matrix"
              aria-labelledby="tab-matrix"
              tabIndex={0}
            >
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900" id="matrix-heading">Permission Matrix</h2>
                <p className="mt-1 text-sm text-gray-500">
                  View and manage permissions assigned to roles. Click on the permission indicators to grant or revoke permissions.
                </p>
              </div>
              <PermissionErrorBoundary context="PermissionMatrix">
                <div data-testid="permission-matrix" aria-labelledby="matrix-heading">
                  <PermissionMatrix />
                </div>
              </PermissionErrorBoundary>
            </div>
          )}

          {activeTab === 'roles' && (
            <div 
              role="tabpanel" 
              id="tabpanel-roles"
              aria-labelledby="tab-roles"
              tabIndex={0}
            >
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900" id="roles-heading">Role Management</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Create, edit, and manage system roles. Define role hierarchies and organize permissions into logical groups.
                </p>
              </div>
              <PermissionErrorBoundary context="RoleManagement">
                <div aria-labelledby="roles-heading">
                  <RoleManagement />
                </div>
              </PermissionErrorBoundary>
            </div>
          )}

          {activeTab === 'users' && (
            <div 
              role="tabpanel" 
              id="tabpanel-users"
              aria-labelledby="tab-users"
              tabIndex={0}
            >
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900" id="users-heading">User Permissions</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Manage individual user permissions and role assignments. Override role-based permissions for specific users.
                </p>
              </div>
              <PermissionErrorBoundary context="UserPermissionManagement">
                <div aria-labelledby="users-heading">
                  <UserPermissionManagement />
                </div>
              </PermissionErrorBoundary>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div 
              role="tabpanel" 
              id="tabpanel-permissions"
              aria-labelledby="tab-permissions"
              tabIndex={0}
            >
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900" id="permissions-heading">Permission Management</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Create, edit, and manage individual permissions. Define what actions users can perform on specific resources.
                </p>
              </div>
              <PermissionErrorBoundary context="PermissionManagement">
                <div aria-labelledby="permissions-heading">
                  <PermissionManagement />
                </div>
              </PermissionErrorBoundary>
            </div>
          )}

          {activeTab === 'templates' && (
            <div 
              role="tabpanel" 
              id="tabpanel-templates"
              aria-labelledby="tab-templates"
              tabIndex={0}
            >
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900" id="templates-heading">Permission Templates</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Create and manage permission templates for common role configurations. Apply templates to quickly set up new roles.
                </p>
              </div>
              <PermissionErrorBoundary context="PermissionTemplates">
                <div aria-labelledby="templates-heading">
                  <PermissionTemplates onGenerateClick={() => setIsGenerateModalOpen(true)} />
                </div>
              </PermissionErrorBoundary>
            </div>
          )}

          {activeTab === 'audit' && (
            <div 
              role="tabpanel" 
              id="tabpanel-audit"
              aria-labelledby="tab-audit"
              tabIndex={0}
            >
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900" id="audit-heading">Audit Trail</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Track all permission changes, role assignments, and access patterns. Monitor system security and compliance.
                </p>
              </div>
              <PermissionErrorBoundary context="PermissionAuditTrail">
                <div aria-labelledby="audit-heading">
                  <PermissionAuditTrail />
                </div>
              </PermissionErrorBoundary>
            </div>
          )}
        </main>

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
      </PermissionErrorBoundary>
    </ErrorBoundary>
  );
}

// User Permission Management Component
function UserPermissionManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounce search term
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch users based on search (only after mounting)
  const { data: usersData, isLoading: isSearching } = useUsers({
    search: mounted ? debouncedSearchTerm : '',
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
              <label htmlFor="user-search" className="sr-only">
                Search users
              </label>
              <div className="relative">
                <MagnifyingGlassIcon 
                  className="h-5 w-5 absolute left-3 top-3 text-gray-400" 
                  aria-hidden="true"
                />
                <input
                  id="user-search"
                  type="search"
                  placeholder="Search users by name, email, or employee code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  aria-label="Search users by name, email, or employee code"
                  aria-describedby="search-description"
                />
                {isSearching && (
                  <div className="absolute right-3 top-3" role="status" aria-label="Searching users">
                    <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                    <span className="sr-only">Searching users...</span>
                  </div>
                )}
              </div>
              <p id="search-description" className="sr-only">
                Type to search for users. Results will appear below as you type.
              </p>

              {/* Search Results */}
              {searchTerm && debouncedSearchTerm && (
                <div 
                  className="mt-2 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-y-auto"
                  role="listbox"
                  aria-label="User search results"
                >
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
                          className="w-full text-left p-4 hover:bg-gray-50 transition-colors focus:outline-none focus:bg-indigo-50 focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                          role="option"
                          aria-selected={false}
                          aria-label={`Select ${user.first_name} ${user.last_name}, ${user.role}, ${user.email}`}
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
                            <ShieldCheckIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
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
          <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-base sm:text-lg font-medium text-indigo-600">
                    {selectedUser.first_name[0]}{selectedUser.last_name[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </h3>
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{selectedUser.email}</p>
                    {selectedUser.department?.name && (
                      <>
                        <span className="text-gray-300 hidden sm:inline">•</span>
                        <span className="text-xs sm:text-sm text-gray-500">{selectedUser.department.name}</span>
                      </>
                    )}
                    {selectedUser.branch?.name && (
                      <>
                        <span className="text-gray-300 hidden sm:inline">•</span>
                        <span className="text-xs sm:text-sm text-gray-500">{selectedUser.branch.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleClearSelection}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                title="Change user"
                aria-label="Change selected user"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* User Permission Assignment Component */}
          <PermissionErrorBoundary context="UserPermissionAssignment">
            <UserPermissionAssignment userId={selectedUser.id} />
          </PermissionErrorBoundary>
        </div>
      )}
    </div>
  );
}



