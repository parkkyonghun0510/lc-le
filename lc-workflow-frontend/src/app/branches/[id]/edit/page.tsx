'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBranch, useUpdateBranch } from '@/hooks/useBranches';
import { useDepartments } from '@/hooks/useDepartments';
import { ArrowLeft, MapPin } from 'lucide-react';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function EditBranchPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params.id as string;
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    department_id: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: branch, isLoading } = useBranch(branchId);
  const { data: departmentsData } = useDepartments({ size: 100 });
  const updateBranchMutation = useUpdateBranch();

  useEffect(() => {
    if (branch) {
      setFormData({
        name: branch.name,
        address: branch.address || '',
        phone: branch.phone || '',
        department_id: branch.department_id,
      });
    }
  }, [branch]);

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

    if (!formData.department_id) {
      newErrors.department_id = 'Department is required';
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
      await updateBranchMutation.mutateAsync({
        id: branchId,
        data: {
          name: formData.name.trim(),
          address: formData.address.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          department_id: formData.department_id,
        },
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
        setErrors({ general: 'Failed to update branch. Please try again.' });
      }
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!branch) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Branch not found</h2>
              <p className="text-gray-600 mt-2">The branch you're looking for doesn't exist.</p>
              <Link
                href="/branches"
                className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Branches
              </Link>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

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
              <h1 className="text-2xl font-bold text-gray-900">Edit Branch</h1>
              <p className="text-gray-600">Update branch information</p>
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

            {/* Branch Name */}
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

            {/* Department */}
            <div>
              <label htmlFor="department_id" className="block text-sm font-medium text-gray-700 mb-2">
                Department *
              </label>
              <select
                id="department_id"
                name="department_id"
                value={formData.department_id}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.department_id ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select a department</option>
                {departmentsData?.items?.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              {errors.department_id && <p className="mt-1 text-sm text-red-600">{errors.department_id}</p>}
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Address
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
                disabled={updateBranchMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateBranchMutation.isPending ? 'Updating...' : 'Update Branch'}
              </button>
            </div>
          </form>
        </div>

        {/* Branch Info */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Branch Information</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><span className="font-medium">Branch ID:</span> {branch.id}</p>
            <p><span className="font-medium">Created:</span> {new Date(branch.created_at).toLocaleDateString()}</p>
            <p><span className="font-medium">Last Updated:</span> {new Date(branch.updated_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </Layout>
  </ProtectedRoute>
  );
}