"use client";

import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  DocumentTextIcon,
  EyeIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useRoles, useGenerateTemplateFromRoles, usePreviewTemplateGeneration } from '@/hooks/usePermissions';

interface GenerateTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateGenerated?: (template: any) => void;
}

interface TemplateConfig {
  templateName: string;
  templateDescription: string;
  selectedRoleIds: string[];
  includeInactiveRoles: boolean;
}

export default function GenerateTemplatesModal({
  isOpen,
  onClose,
  onTemplateGenerated
}: GenerateTemplatesModalProps) {
  const [activeStep, setActiveStep] = useState<'select' | 'configure' | 'preview' | 'generate'>('select');
  const [config, setConfig] = useState<TemplateConfig>({
    templateName: '',
    templateDescription: '',
    selectedRoleIds: [],
    includeInactiveRoles: false
  });
  const [previewData, setPreviewData] = useState<any>(null);

  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const generateTemplate = useGenerateTemplateFromRoles();
  const previewGeneration = usePreviewTemplateGeneration();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveStep('select');
      setConfig({
        templateName: '',
        templateDescription: '',
        selectedRoleIds: [],
        includeInactiveRoles: false
      });
      setPreviewData(null);
    }
  }, [isOpen]);

  const handleRoleSelection = (roleId: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      selectedRoleIds: checked
        ? [...prev.selectedRoleIds, roleId]
        : prev.selectedRoleIds.filter(id => id !== roleId)
    }));
  };

  const handlePreview = async () => {
    if (config.selectedRoleIds.length === 0) return;

    try {
      const result = await previewGeneration.mutateAsync({
        source_role_ids: config.selectedRoleIds,
        include_inactive_roles: config.includeInactiveRoles,
        preview_type: 'detailed'
      });
      setPreviewData(result);
      setActiveStep('preview');
    } catch (error) {
      console.error('Failed to preview template:', error);
    }
  };

  const handleGenerate = async () => {
    if (!config.templateName.trim() || !config.templateDescription.trim()) return;

    try {
      const result = await generateTemplate.mutateAsync({
        source_role_ids: config.selectedRoleIds,
        template_name: config.templateName.trim(),
        template_description: config.templateDescription.trim(),
        include_inactive_roles: config.includeInactiveRoles
      });

      onTemplateGenerated?.(result);
      onClose();
    } catch (error) {
      console.error('Failed to generate template:', error);
    }
  };

  const canProceedToConfigure = config.selectedRoleIds.length > 0;
  const canPreview = config.selectedRoleIds.length > 0;
  const canGenerate = config.templateName.trim() && config.templateDescription.trim() && previewData;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DocumentTextIcon className="h-6 w-6 text-indigo-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">
                  Generate Permission Template
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="mt-4 flex items-center space-x-4">
              {[
                { key: 'select', label: 'Select Roles', icon: '1' },
                { key: 'configure', label: 'Configure', icon: '2' },
                { key: 'preview', label: 'Preview', icon: '3' },
                { key: 'generate', label: 'Generate', icon: '4' }
              ].map((step, index) => (
                <div key={step.key} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    activeStep === step.key
                      ? 'bg-indigo-600 text-white'
                      : ['select', 'configure', 'preview', 'generate'].indexOf(activeStep) > index
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {['select', 'configure', 'preview', 'generate'].indexOf(activeStep) > index ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <span className={`ml-2 text-sm ${
                    activeStep === step.key ? 'text-indigo-600 font-medium' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                  {index < 3 && (
                    <div className={`ml-4 w-12 h-px ${
                      ['select', 'configure', 'preview', 'generate'].indexOf(activeStep) > index
                        ? 'bg-green-500'
                        : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-6">
            {activeStep === 'select' && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Select Source Roles
                </h4>
                <p className="text-sm text-gray-600 mb-6">
                  Choose the roles you want to generate a template from. The template will include all permissions from the selected roles.
                </p>

                <div className="max-h-96 overflow-y-auto">
                  {rolesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <ArrowPathIcon className="h-6 w-6 text-indigo-600 animate-spin mr-2" />
                      <span className="text-gray-600">Loading roles...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {roles.map((role) => (
                        <label key={role.id} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={config.selectedRoleIds.includes(role.id)}
                            onChange={(e) => handleRoleSelection(role.id, e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{role.display_name}</p>
                                <p className="text-sm text-gray-500">{role.description}</p>
                              </div>
                              <div className="text-right">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  role.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {role.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <p className="text-xs text-gray-500 mt-1">{role.permission_count} permissions</p>
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {config.selectedRoleIds.length > 0 && (
                  <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
                    <p className="text-sm text-indigo-800">
                      {config.selectedRoleIds.length} role{config.selectedRoleIds.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeStep === 'configure' && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Configure Template
                </h4>
                <p className="text-sm text-gray-600 mb-6">
                  Provide a name and description for your template.
                </p>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      id="templateName"
                      value={config.templateName}
                      onChange={(e) => setConfig(prev => ({ ...prev, templateName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Manager Template"
                    />
                  </div>

                  <div>
                    <label htmlFor="templateDescription" className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      id="templateDescription"
                      value={config.templateDescription}
                      onChange={(e) => setConfig(prev => ({ ...prev, templateDescription: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Describe what this template is for and when to use it..."
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includeInactive"
                      checked={config.includeInactiveRoles}
                      onChange={(e) => setConfig(prev => ({ ...prev, includeInactiveRoles: e.target.checked }))}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeInactive" className="ml-2 text-sm text-gray-700">
                      Include inactive roles in template generation
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeStep === 'preview' && previewData && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Preview Generated Template
                </h4>
                <p className="text-sm text-gray-600 mb-6">
                  Review the permissions that will be included in your template.
                </p>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Template Name:</span>
                      <p className="text-gray-900">{config.templateName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Source Roles:</span>
                      <p className="text-gray-900">{config.selectedRoleIds.length} selected</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Total Permissions:</span>
                      <p className="text-gray-900">{previewData.estimated_template_size}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Description:</span>
                      <p className="text-gray-900">{config.templateDescription}</p>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h5 className="text-sm font-medium text-gray-900">Permissions to be included</h5>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {previewData.suggested_permissions?.map((permission: any) => (
                      <div key={permission.id} className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{permission.name}</p>
                            <p className="text-xs text-gray-500">{permission.description}</p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            permission.resource_type === 'SYSTEM' ? 'bg-purple-100 text-purple-800' :
                            permission.resource_type === 'USER' ? 'bg-blue-100 text-blue-800' :
                            permission.resource_type === 'APPLICATION' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {permission.resource_type}
                          </span>
                        </div>
                      </div>
                    )) || []}
                  </div>
                </div>
              </div>
            )}

            {activeStep === 'generate' && (
              <div className="text-center py-8">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <CheckIcon className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Template Generated Successfully!</h4>
                <p className="text-sm text-gray-600">
                  Your permission template "{config.templateName}" has been created and is now available for use.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {activeStep !== 'select' && activeStep !== 'generate' && (
                <button
                  onClick={() => {
                    if (activeStep === 'preview') setActiveStep('configure');
                    else if (activeStep === 'configure') setActiveStep('select');
                  }}
                  className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                >
                  Back
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {activeStep === 'select' && (
                <>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setActiveStep('configure')}
                    disabled={!canProceedToConfigure}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Next: Configure
                  </button>
                </>
              )}

              {activeStep === 'configure' && (
                <>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePreview}
                    disabled={!canPreview || previewGeneration.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                  >
                    {previewGeneration.isPending ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                        Previewing...
                      </>
                    ) : (
                      <>
                        <EyeIcon className="h-4 w-4 mr-2" />
                        Preview
                      </>
                    )}
                  </button>
                </>
              )}

              {activeStep === 'preview' && (
                <>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={!canGenerate || generateTemplate.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                  >
                    {generateTemplate.isPending ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4 mr-2" />
                        Generate Template
                      </>
                    )}
                  </button>
                </>
              )}

              {activeStep === 'generate' && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                >
                  Close
                </button>
              )}
            </div>
          </div>

          {/* Error Display */}
          {(previewGeneration.error || generateTemplate.error) && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mx-6 mb-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    {previewGeneration.error?.message || generateTemplate.error?.message}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}