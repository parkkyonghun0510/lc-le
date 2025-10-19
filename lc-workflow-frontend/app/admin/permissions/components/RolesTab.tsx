'use client';

import { useState, useEffect } from 'react';
import { getAuthHeaders } from '../lib/api';

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  level: number;
  is_system_role: boolean;
  is_active: boolean;
  permission_count?: number;
}

interface Template {
  id: string;
  name: string;
  description: string;
}

export default function RolesTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [standardRoles, setStandardRoles] = useState<Role[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, standardRes, templatesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}permissions/roles`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}permissions/roles/standard`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}permissions/templates`, {
          headers: getAuthHeaders(),
        }),
      ]);

      const [rolesData, standardData, templatesData] = await Promise.all([
        rolesRes.json(),
        standardRes.json(),
        templatesRes.json(),
      ]);

      setRoles(rolesData);
      setStandardRoles(standardData);
      setTemplates(templatesData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading roles...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Role Management</h3>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Create from Template
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Role
            </button>
          </div>
        </div>
      </div>

      {/* Standard Roles */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Standard Roles</h3>
          <p className="text-sm text-gray-600 mt-1">
            Pre-configured system roles with standard permission sets
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {standardRoles.map(role => (
              <div
                key={role.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer"
                onClick={() => setSelectedRole(role)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{role.display_name}</h4>
                    <p className="text-xs text-gray-500 mt-1">Level {role.level}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    System
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{role.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Roles */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Custom Roles</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.filter(r => !r.is_system_role).map(role => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{role.display_name}</div>
                      <div className="text-sm text-gray-500">{role.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {role.level}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {role.permission_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      role.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {role.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedRole(role)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View
                    </button>
                    <button className="text-gray-600 hover:text-gray-900 mr-3">
                      Edit
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {roles.filter(r => !r.is_system_role).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No custom roles yet. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create from Template Modal */}
      {showTemplateModal && (
        <CreateFromTemplateModal
          templates={templates}
          onClose={() => setShowTemplateModal(false)}
          onSuccess={() => {
            setShowTemplateModal(false);
            fetchData();
          }}
        />
      )}

      {/* Role Details Modal */}
      {selectedRole && (
        <RoleDetailsModal
          role={selectedRole}
          onClose={() => setSelectedRole(null)}
        />
      )}
    </div>
  );
}

function CreateFromTemplateModal({ templates, onClose, onSuccess }: {
  templates: Template[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState(50);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}permissions/roles/from-template`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: selectedTemplate,
          name,
          display_name: displayName,
          description,
          level,
        }),
      });

      if (!response.ok) throw new Error('Failed to create role');
      
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create role');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Create Role from Template</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select a template...</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="e.g., custom_manager"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="e.g., Custom Manager"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Level (1-100)
            </label>
            <input
              type="number"
              value={level}
              onChange={(e) => setLevel(parseInt(e.target.value))}
              min={1}
              max={100}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoleDetailsModal({ role, onClose }: { role: Role; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">{role.display_name}</h3>
            <p className="text-sm text-gray-600 mt-1">{role.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-500">Name:</span>
              <p className="text-sm text-gray-900">{role.name}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Level:</span>
              <p className="text-sm text-gray-900">{role.level}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Type:</span>
              <p className="text-sm text-gray-900">
                {role.is_system_role ? 'System Role' : 'Custom Role'}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Status:</span>
              <p className="text-sm text-gray-900">
                {role.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600">
              View full permission details in the Permission Matrix tab.
            </p>
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
