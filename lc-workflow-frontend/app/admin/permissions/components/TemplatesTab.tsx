'use client';

import { useState, useEffect } from 'react';
import { getAuthHeaders } from '../lib/api';

interface Template {
  id: string;
  name: string;
  description: string;
  template_type: string;
  permissions: string[];
  usage_count: number;
  is_active: boolean;
}

export default function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}permissions/templates`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (templateId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}permissions/templates/${templateId}/export`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json();
      
      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template_${data.template_name}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export template');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading templates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Permission Templates</h3>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Import Template
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <div key={template.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-semibold text-gray-900">{template.name}</h4>
              <span className="text-xs text-gray-500">
                Used {template.usage_count}x
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {template.description}
            </p>
            <div className="flex items-center justify-between text-sm mb-4">
              <span className="text-gray-500">
                {template.permissions.length} permissions
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {template.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleExport(template.id)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                Export
              </button>
              <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                Apply
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <ImportTemplateModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            fetchTemplates();
          }}
        />
      )}
    </div>
  );
}

function ImportTemplateModal({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [updateIfExists, setUpdateIfExists] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}permissions/templates/import?update_if_exists=${updateIfExists}`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData,
        }
      );

      if (!response.ok) throw new Error('Failed to import template');
      
      const result = await response.json();
      alert(`Template ${result.action}: ${result.mapped_count} permissions mapped, ${result.unmapped_count} unmapped`);
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to import template');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Import Template</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template File (JSON)
            </label>
            <input
              type="file"
              accept=".json"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="updateIfExists"
              checked={updateIfExists}
              onChange={(e) => setUpdateIfExists(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="updateIfExists" className="ml-2 text-sm text-gray-700">
              Update if template already exists
            </label>
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
              {submitting ? 'Importing...' : 'Import'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
