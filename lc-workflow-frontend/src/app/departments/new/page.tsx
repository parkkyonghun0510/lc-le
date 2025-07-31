'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateDepartment } from '@/hooks/useDepartments';
import { DepartmentCreate } from '@/types/models';
import { ArrowLeft, Save, Building } from 'lucide-react';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function NewDepartmentPage() {
  const router = useRouter();
  const createDepartment = useCreateDepartment();

  const [formData, setFormData] = useState<DepartmentCreate>({
    name: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Department name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Department name must be at least 2 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      description: formData.description || undefined,
    };

    createDepartment.mutate(submitData, {
      onSuccess: () => {
        router.push('/departments');
      },
    });
  };

  const handleInputChange = (field: keyof DepartmentCreate, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <Link
              href="/departments"
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Back to Departments
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Create New Department</h1>
          <p className="text-gray-600">Add a new department to the organization</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Department Icon */}
            <div className="flex justify-center">
              <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center">
                <Building className="h-10 w-10 text-blue-600" />
              </div>
            </div>

            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Department Information</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter department name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter department description (optional)"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Provide a brief description of the department's purpose and responsibilities
                  </p>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-end space-x-4">
                <Link
                  href="/departments"
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={createDepartment.isPending}
                  className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createDepartment.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Department
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  </ProtectedRoute>
  );
}