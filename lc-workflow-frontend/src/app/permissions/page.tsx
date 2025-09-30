"use client";

import React, { useState } from 'react';
import {
  ShieldCheckIcon,
  UserGroupIcon,
  CogIcon,
  ChartBarIcon,
  DocumentTextIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import PermissionMatrix from '@/components/permissions/PermissionMatrix';
import RoleManagement from '@/components/permissions/RoleManagement';
import GenerateTemplatesModal from '@/components/permissions/GenerateTemplatesModal';
import { useRoles, useApplyPermissionTemplate, usePermissionTemplates } from '@/hooks/usePermissions';

export default function PermissionsPage() {
  const [activeTab, setActiveTab] = useState<'matrix' | 'roles' | 'users' | 'templates' | 'audit'>('matrix');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

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
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon
                    className={`-ml-0.5 mr-2 h-5 w-5 ${
                      activeTab === tab.id
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
  );
}

// Placeholder components for remaining tabs
function UserPermissionManagement() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-center py-12">
        <CogIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">User Permission Management</h3>
        <p className="text-gray-500 mb-4">
          Search for users and manage their individual permissions and role assignments.
        </p>
        <div className="max-w-md mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div className="absolute left-3 top-2.5">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
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
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        role.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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

function PermissionAuditTrail() {
  const auditEntries = [
    {
      id: 1,
      action: 'Permission Granted',
      target: 'User: John Doe',
      permission: 'application_approve',
      performedBy: 'Admin User',
      timestamp: '2025-09-27 14:30:00',
      reason: 'Promotion to senior officer'
    },
    {
      id: 2,
      action: 'Role Assigned',
      target: 'User: Jane Smith',
      permission: 'Manager Role',
      performedBy: 'Admin User',
      timestamp: '2025-09-27 13:15:00',
      reason: 'Department restructuring'
    },
    {
      id: 3,
      action: 'Permission Revoked',
      target: 'Role: Officer',
      permission: 'user_delete',
      performedBy: 'Security Admin',
      timestamp: '2025-09-27 11:45:00',
      reason: 'Security policy update'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <option>All Actions</option>
            <option>Permission Granted</option>
            <option>Permission Revoked</option>
            <option>Role Assigned</option>
            <option>Role Revoked</option>
          </select>
          <input
            type="text"
            placeholder="Search target..."
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            type="date"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700">
            Filter
          </button>
        </div>
      </div>

      {/* Audit Entries */}
      <div className="divide-y divide-gray-200">
        {auditEntries.map((entry) => (
          <div key={entry.id} className="p-6 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    entry.action.includes('Granted') || entry.action.includes('Assigned')
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {entry.action}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{entry.target}</span>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  <span className="font-medium">{entry.permission}</span>
                  {entry.reason && <span> • {entry.reason}</span>}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  by {entry.performedBy} at {entry.timestamp}
                </div>
              </div>
              <ChartBarIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Showing 1-3 of 150 entries</span>
          <div className="flex space-x-2">
            <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              Previous
            </button>
            <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}