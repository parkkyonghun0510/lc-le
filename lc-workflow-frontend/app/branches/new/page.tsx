'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateBranch } from '@/hooks/useBranches';
import { ArrowLeft, MapPin } from 'lucide-react';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function NewBranchPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createBranchMutation = useCreateBranch();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Branch name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Branch code is required';
    } else if (formData.code.length < 2) {
      newErrors.code = 'Branch code must be at least 2 characters';
    } else if (!/^[A-Z0-9_-]+$/i.test(formData.code)) {
      newErrors.code = 'Branch code can only contain letters, numbers, hyphens, and underscores';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Branch address is required';
    }



    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await createBranchMutation.mutateAsync({
        name: formData.name.trim(),
        code: formData.code.trim(),
        address: formData.address.trim(),
        phone_number: formData.phone.trim() || undefined,
      });
      router.push('/branches');
    } catch (error: any) {
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          setErrors({ general: error.response.data.detail });
        } else if (Array.isArray(error.response.data.detail)) {
          const newErrors: Record<string, string> = {};
          error.response.data.detail.forEach((err: any) => {
            if (err.loc && err.loc.length > 1) {
              newErrors[err.loc[1]] = err.msg;
            }
          });
          setErrors(newErrors);
        }
      } else {
        setErrors({ general: 'Failed to create branch. Please try again.' });
      }
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/branches"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Branches
          </Link>
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Branch</h1>
              <p className="text-gray-600">Add a new branch location to the system</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}

            {/* Branch Name and Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Branch Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter branch name"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  Branch Code *
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={(e) => {
                    const { name, value } = e.target;
                    setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
                    if (errors[name]) {
                      setErrors(prev => ({ ...prev, [name]: '' }));
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.code ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter branch code (e.g., NYC, LA, CHI)"
                  maxLength={20}
                />
                {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
                <p className="mt-1 text-sm text-gray-500">
                  Short code for the branch (letters, numbers, hyphens, underscores only)
                </p>
              </div>
            </div>



            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.address ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter branch address"
              />
              {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.phone ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter phone number"
              />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Link
                href="/branches"
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={createBranchMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createBranchMutation.isPending ? 'Creating...' : 'Create Branch'}
              </button>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Branch Creation Guidelines</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Branch name and code must be unique across the system</li>
            <li>• Address is required for proper branch identification</li>
            <li>• Phone number is optional but recommended</li>
            <li>• All fields can be updated later if needed</li>
          </ul>
        </div>
      </div>
    </Layout>
  </ProtectedRoute>
  );
}