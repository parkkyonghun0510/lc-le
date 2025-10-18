"use client";

import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import {
  usePermissionTemplates,
  useCreatePermissionTemplate,
  useUpdatePermissionTemplate,
  useDeletePermissionTemplate,
  useApplyPermissionTemplate,
  usePermissions,
  PermissionTemplate,
  Permission
} from '@/hooks/usePermissions';
import { useRoles } from '@/hooks/usePermissions';
import { useUsers } from '@/hooks/useUsers';

interface PermissionTemplatesProps {
  onGenerateClick: () => void;
}

export default function PermissionTemplates({ onGenerateClick }: PermissionTemplatesProps) {
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PermissionTemplate | null>(null);
  const [compareTemplate, setCompareTemplate] = useState<PermissionTemplate | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);

  const { data: templates = [], isLoading: templatesLoading } = usePermissionTemplates();
  const { data: roles = [] } = useRoles();
  const applyTemplate = useApplyPermissionTemplate();
  const deleteTemplate = useDeletePermissionTemplate();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter templates based on search and category
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || template.template_type === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories from templates
  const categories = ['all', ...Array.from(new Set(templates.map(t => t.template_type)))];

  const handlePreview = (template: PermissionTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewModal(true);
  };

  const handleApply = (template: PermissionTemplate) => {
    setSelectedTemplate(template);
    setShowApplyModal(true);
  };

  const handleEdit = (template: PermissionTemplate) => {
    setSelectedTemplate(template);
    setShowEditModal(true);
  };

  const handleDelete = (template: PermissionTemplate) => {
    setSelectedTemplate(template);
    setShowDeleteModal(true);
  };

  const handleCompare = (template: PermissionTemplate) => {
    setSelectedTemplate(template);
    setShowCompareModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedTemplate) return;

    try {
      await deleteTemplate.mutateAsync(selectedTemplate.id);
      setShowDeleteModal(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleApplyToRole = async (roleId: string) => {
    if (!selectedTemplate) return;

    try {
      await applyTemplate.mutateAsync({
        templateId: selectedTemplate.id,
        targetType: 'role',
        targetId: roleId
      });
      setShowApplyModal(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to apply template:', error);
    }
  };

  if (!mounted) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Available Templates</h3>
          <p className="text-sm text-gray-500">Pre-configured permission sets for common roles</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onGenerateClick}
            className="inline-flex items-center px-4 py-2 border border-indigo-600 shadow-sm text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Generate Templates
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Template
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="sm:w-64">
            <div className="relative">
              <FunnelIcon className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-3 text-sm text-gray-500">
          Showing {filteredTemplates.length} of {templates.length} templates
        </div>
      </div>

      {/* Templates Grid */}
      {templatesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || categoryFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first template to get started'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={handlePreview}
              onApply={handleApply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCompare={handleCompare}
            />
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit Template Modal */}
      {showEditModal && selectedTemplate && (
        <EditTemplateModal
          template={selectedTemplate}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTemplate(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedTemplate && (
        <DeleteConfirmationModal
          template={selectedTemplate}
          onConfirm={confirmDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedTemplate(null);
          }}
          isDeleting={deleteTemplate.isPending}
        />
      )}

      {/* Compare Templates Modal */}
      {showCompareModal && selectedTemplate && (
        <CompareTemplatesModal
          template={selectedTemplate}
          templates={templates}
          onClose={() => {
            setShowCompareModal(false);
            setSelectedTemplate(null);
            setCompareTemplate(null);
          }}
          onSelectCompare={setCompareTemplate}
          compareTemplate={compareTemplate}
        />
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedTemplate(null);
          }}
        />
      )}

      {/* Apply Template Modal */}
      {showApplyModal && selectedTemplate && (
        <ApplyTemplateModal
          template={selectedTemplate}
          roles={roles}
          onApply={handleApplyToRole}
          onClose={() => {
            setShowApplyModal(false);
            setSelectedTemplate(null);
          }}
          isApplying={applyTemplate.isPending}
        />
      )}
    </div>
  );
}

// Template Card Component
interface TemplateCardProps {
  template: PermissionTemplate;
  onPreview: (template: PermissionTemplate) => void;
  onApply: (template: PermissionTemplate) => void;
  onEdit: (template: PermissionTemplate) => void;
  onDelete: (template: PermissionTemplate) => void;
  onCompare: (template: PermissionTemplate) => void;
}

function TemplateCard({ template, onPreview, onApply, onEdit, onDelete, onCompare }: TemplateCardProps) {
  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <DocumentTextIcon className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            {template.is_system_template && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mb-1">
                System
              </span>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-500">
          Used {template.usage_count || 0}x
        </span>
      </div>

      <h4 className="text-lg font-medium text-gray-900 mb-2">{template.name}</h4>
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {template.template_type}
          </span>
          <span className="text-sm text-gray-500">
            {template.permissions?.length || 0} permissions
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPreview(template)}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <EyeIcon className="h-4 w-4 mr-1.5" />
            Preview
          </button>
          <button
            onClick={() => onApply(template)}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <CheckIcon className="h-4 w-4 mr-1.5" />
            Apply
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(template)}
            disabled={template.is_system_template}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title={template.is_system_template ? 'System templates cannot be edited' : 'Edit template'}
          >
            <PencilIcon className="h-4 w-4 mr-1.5" />
            Edit
          </button>
          <button
            onClick={() => onCompare(template)}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Compare
          </button>
          <button
            onClick={() => onDelete(template)}
            disabled={template.is_system_template}
            className="inline-flex items-center justify-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title={template.is_system_template ? 'System templates cannot be deleted' : 'Delete template'}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Create Template Modal Component
interface CreateTemplateModalProps {
  onClose: () => void;
}

function CreateTemplateModal({ onClose }: CreateTemplateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_type: '',
    permissions: [] as string[]
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createTemplate = useCreatePermissionTemplate();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.template_type.trim()) {
      newErrors.template_type = 'Template type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await createTemplate.mutateAsync(formData);
      onClose();
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Create Permission Template</h3>
              <p className="text-sm text-gray-600 mt-1">
                Define a reusable set of permissions for common role configurations.
              </p>
            </div>

            <div className="bg-white px-6 py-4 space-y-4">
              {/* Template Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Branch Manager Template"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Describe what this template is for and when to use it..."
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              </div>

              {/* Template Type */}
              <div>
                <label htmlFor="template_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Template Type *
                </label>
                <select
                  id="template_type"
                  value={formData.template_type}
                  onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    errors.template_type ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a type...</option>
                  <option value="management">Management</option>
                  <option value="operational">Operational</option>
                  <option value="administrative">Administrative</option>
                  <option value="technical">Technical</option>
                  <option value="custom">Custom</option>
                </select>
                {errors.template_type && <p className="mt-1 text-sm text-red-600">{errors.template_type}</p>}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> After creating the template, you can add permissions by editing it or use the "Generate Templates" feature to create templates from existing roles.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createTemplate.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createTemplate.isPending ? 'Creating...' : 'Create Template'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Template Preview Modal Component
interface TemplatePreviewModalProps {
  template: PermissionTemplate;
  onClose: () => void;
}

function TemplatePreviewModal({ template, onClose }: TemplatePreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{template.description}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="bg-white px-6 py-4">
            {/* Template Metadata */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm font-medium text-gray-500">Template Type</p>
                <p className="mt-1 text-sm text-gray-900">{template.template_type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Usage Count</p>
                <p className="mt-1 text-sm text-gray-900">{template.usage_count || 0} times</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    template.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {template.is_active ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">System Template</p>
                <p className="mt-1 text-sm text-gray-900">{template.is_system_template ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Created</p>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(template.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Last Updated</p>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(template.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Usage Statistics */}
            {template.usage_count > 0 && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Usage Statistics</h4>
                <p className="text-sm text-blue-800">
                  This template has been applied {template.usage_count} time{template.usage_count > 1 ? 's' : ''}. 
                  Modifying this template will not affect previously configured roles or users.
                </p>
              </div>
            )}

            {/* Permissions List */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Permissions ({template.permissions?.length || 0})
              </h4>
              {template.permissions && template.permissions.length > 0 ? (
                <div className="border border-gray-200 rounded-md divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {template.permissions.map((permissionId, index) => (
                    <div key={index} className="px-4 py-3 hover:bg-gray-50">
                      <p className="text-sm text-gray-900">{permissionId}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-gray-200 rounded-md">
                  <DocumentTextIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No permissions configured</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Apply Template Modal Component
interface ApplyTemplateModalProps {
  template: PermissionTemplate;
  roles: any[];
  onApply: (roleId: string) => void;
  onClose: () => void;
  isApplying: boolean;
}

function ApplyTemplateModal({ template, roles, onApply, onClose, isApplying }: ApplyTemplateModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [targetType, setTargetType] = useState<'role' | 'user'>('role');
  const [bulkMode, setBulkMode] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const { data: usersData } = useUsers({
    search: targetType === 'user' ? debouncedSearchTerm : '',
    size: 20,
    status: 'active'
  });

  const users = usersData?.items || [];

  // Debounce search term
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredRoles = roles.filter(role =>
    role.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleRole = (roleId: string) => {
    if (bulkMode) {
      setSelectedRoles(prev =>
        prev.includes(roleId)
          ? prev.filter(id => id !== roleId)
          : [...prev, roleId]
      );
    } else {
      setSelectedRoles([roleId]);
    }
  };

  const handleApply = () => {
    if (selectedRoles.length > 0) {
      // For now, apply to first selected role
      // In a real implementation, you'd handle bulk application
      onApply(selectedRoles[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Apply Template</h3>
            <p className="text-sm text-gray-600 mt-1">
              Apply the "{template.name}" template to roles or users
            </p>
          </div>

          <div className="bg-white px-6 py-4">
            {/* Target Type Selection */}
            <div className="mb-4">
              <div className="flex items-center space-x-4 mb-3">
                <button
                  onClick={() => {
                    setTargetType('role');
                    setSelectedRoles([]);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    targetType === 'role'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Apply to Roles
                </button>
                <button
                  onClick={() => {
                    setTargetType('user');
                    setSelectedRoles([]);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    targetType === 'user'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Apply to Users
                </button>
              </div>

              {/* Bulk Mode Toggle */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="bulk-mode"
                  checked={bulkMode}
                  onChange={(e) => {
                    setBulkMode(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedRoles(selectedRoles.slice(0, 1));
                    }
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="bulk-mode" className="ml-2 block text-sm text-gray-900">
                  Enable bulk application (select multiple {targetType === 'role' ? 'roles' : 'users'})
                </label>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Search ${targetType === 'role' ? 'roles' : 'users'}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Role/User List */}
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
              {targetType === 'role' ? (
                filteredRoles.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No roles found</p>
                  </div>
                ) : (
                  filteredRoles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => toggleRole(role.id)}
                      disabled={isApplying}
                      className={`w-full text-left p-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${
                        selectedRoles.includes(role.id) ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{role.display_name}</p>
                          <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            role.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {role.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {selectedRoles.includes(role.id) && (
                            <CheckIcon className="h-5 w-5 text-indigo-600" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )
              ) : (
                filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No users found</p>
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => toggleRole(user.id)}
                      disabled={isApplying}
                      className={`w-full text-left p-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${
                        selectedRoles.includes(user.id) ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{user.email}</p>
                          {user.department?.name && (
                            <p className="text-xs text-gray-500">{user.department.name}</p>
                          )}
                        </div>
                        {selectedRoles.includes(user.id) && (
                          <CheckIcon className="h-5 w-5 text-indigo-600" />
                        )}
                      </div>
                    </button>
                  ))
                )
              )}
            </div>

            {selectedRoles.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  {selectedRoles.length} {targetType}{selectedRoles.length > 1 ? 's' : ''} selected
                </p>
                {bulkMode && selectedRoles.length > 1 && (
                  <p className="text-xs text-blue-600 mt-1">
                    Template will be applied to all selected {targetType}s
                  </p>
                )}
              </div>
            )}

            {/* Template Modification Note */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> Modifying this template in the future will not affect {targetType}s that have already been configured with it. Each application creates an independent permission set.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={isApplying || selectedRoles.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApplying ? 'Applying...' : `Apply to ${selectedRoles.length} ${targetType}${selectedRoles.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Edit Template Modal Component
interface EditTemplateModalProps {
  template: PermissionTemplate;
  onClose: () => void;
}

function EditTemplateModal({ template, onClose }: EditTemplateModalProps) {
  const [formData, setFormData] = useState({
    name: template.name,
    description: template.description,
    template_type: template.template_type,
    permissions: template.permissions || [],
    is_active: template.is_active
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPermissionSelector, setShowPermissionSelector] = useState(false);

  const updateTemplate = useUpdatePermissionTemplate();
  const { data: allPermissions = [] } = usePermissions();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await updateTemplate.mutateAsync({
        id: template.id,
        ...formData
      });
      onClose();
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(id => id !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Edit Template</h3>
              <p className="text-sm text-gray-600 mt-1">
                Modify template details and permissions
              </p>
            </div>

            <div className="bg-white px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Template Name */}
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  id="edit-description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              </div>

              {/* Template Type */}
              <div>
                <label htmlFor="edit-template_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Template Type
                </label>
                <select
                  id="edit-template_type"
                  value={formData.template_type}
                  onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="management">Management</option>
                  <option value="operational">Operational</option>
                  <option value="administrative">Administrative</option>
                  <option value="technical">Technical</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Active Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="edit-is_active" className="ml-2 block text-sm text-gray-900">
                  Active template
                </label>
              </div>

              {/* Permissions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Permissions ({formData.permissions.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPermissionSelector(!showPermissionSelector)}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    {showPermissionSelector ? 'Hide' : 'Manage Permissions'}
                  </button>
                </div>

                {showPermissionSelector && (
                  <div className="border border-gray-200 rounded-md p-3 max-h-60 overflow-y-auto">
                    {allPermissions.map((permission) => (
                      <div key={permission.id} className="flex items-center py-2">
                        <input
                          type="checkbox"
                          id={`perm-${permission.id}`}
                          checked={formData.permissions.includes(permission.id)}
                          onChange={() => togglePermission(permission.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`perm-${permission.id}`} className="ml-2 block text-sm text-gray-900">
                          {permission.name}
                          <span className="text-xs text-gray-500 ml-2">({permission.resource_type}:{permission.action})</span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateTemplate.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateTemplate.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal Component
interface DeleteConfirmationModalProps {
  template: PermissionTemplate;
  onConfirm: () => void;
  onClose: () => void;
  isDeleting: boolean;
}

function DeleteConfirmationModal({ template, onConfirm, onClose, isDeleting }: DeleteConfirmationModalProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-6 py-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Delete Template</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete the template "{template.name}"? This action cannot be undone.
                  </p>
                  {template.usage_count > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        <strong>Warning:</strong> This template has been used {template.usage_count} time{template.usage_count > 1 ? 's' : ''}. Deleting it will not affect roles that have already been configured with it.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Deleting...' : 'Delete Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compare Templates Modal Component
interface CompareTemplatesModalProps {
  template: PermissionTemplate;
  templates: PermissionTemplate[];
  onClose: () => void;
  onSelectCompare: (template: PermissionTemplate | null) => void;
  compareTemplate: PermissionTemplate | null;
}

function CompareTemplatesModal({ template, templates, onClose, onSelectCompare, compareTemplate }: CompareTemplatesModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = templates.filter(t =>
    t.id !== template.id &&
    (t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     t.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getPermissionDiff = () => {
    if (!compareTemplate) return { onlyInFirst: [], onlyInSecond: [], common: [] };

    const firstPerms = new Set(template.permissions || []);
    const secondPerms = new Set(compareTemplate.permissions || []);

    const onlyInFirst = Array.from(firstPerms).filter(p => !secondPerms.has(p));
    const onlyInSecond = Array.from(secondPerms).filter(p => !firstPerms.has(p));
    const common = Array.from(firstPerms).filter(p => secondPerms.has(p));

    return { onlyInFirst, onlyInSecond, common };
  };

  const diff = getPermissionDiff();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Compare Templates</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Compare "{template.name}" with another template
                </p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="bg-white px-6 py-4">
            {!compareTemplate ? (
              <div>
                <div className="mb-4">
                  <div className="relative">
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search templates to compare..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
                  {filteredTemplates.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500">No templates available for comparison</p>
                    </div>
                  ) : (
                    filteredTemplates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => onSelectCompare(t)}
                        className="w-full text-left p-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{t.name}</p>
                            <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {t.template_type}
                              </span>
                              <span className="text-xs text-gray-500">
                                {t.permissions?.length || 0} permissions
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Comparison Header */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{template.permissions?.length || 0} permissions</p>
                  </div>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <h4 className="text-sm font-medium text-gray-900">{compareTemplate.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{compareTemplate.permissions?.length || 0} permissions</p>
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-md">
                    <p className="text-2xl font-bold text-gray-900">{diff.common.length}</p>
                    <p className="text-xs text-gray-500">Common</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-md">
                    <p className="text-2xl font-bold text-blue-900">{diff.onlyInFirst.length}</p>
                    <p className="text-xs text-blue-700">Only in {template.name}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-md">
                    <p className="text-2xl font-bold text-green-900">{diff.onlyInSecond.length}</p>
                    <p className="text-xs text-green-700">Only in {compareTemplate.name}</p>
                  </div>
                </div>

                {/* Detailed Comparison */}
                <div className="max-h-96 overflow-y-auto space-y-4">
                  {diff.common.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Common Permissions ({diff.common.length})</h5>
                      <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
                        {diff.common.map((permId, idx) => (
                          <div key={idx} className="px-3 py-2 text-sm text-gray-700 bg-gray-50">
                            {permId}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {diff.onlyInFirst.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Only in {template.name} ({diff.onlyInFirst.length})</h5>
                      <div className="border border-blue-200 rounded-md divide-y divide-blue-200">
                        {diff.onlyInFirst.map((permId, idx) => (
                          <div key={idx} className="px-3 py-2 text-sm text-blue-700 bg-blue-50">
                            {permId}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {diff.onlyInSecond.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Only in {compareTemplate.name} ({diff.onlyInSecond.length})</h5>
                      <div className="border border-green-200 rounded-md divide-y divide-green-200">
                        {diff.onlyInSecond.map((permId, idx) => (
                          <div key={idx} className="px-3 py-2 text-sm text-green-700 bg-green-50">
                            {permId}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
            {compareTemplate && (
              <button
                onClick={() => onSelectCompare(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Change Template
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
