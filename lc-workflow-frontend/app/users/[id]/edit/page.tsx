'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser, useUpdateUser } from '@/hooks/useUsers';
import { useDepartments } from '@/hooks/useDepartments';
import { useBranches } from '@/hooks/useBranches';
import { UserUpdate } from '@/types/models';
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { usePositions } from '@/hooks/usePositions';
import { useEmployees } from '@/hooks/useEmployees';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<UserUpdate>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    role: 'officer',
    department_id: '',
    branch_id: '',
    is_active: true,
    employee_id: '',
    position_id: '',
    portfolio_id: '',
    line_manager_id: '',
  });

  const { data: user, isLoading } = useUser(userId);
  const updateUser = useUpdateUser(userId);
  const { data: departmentsData } = useDepartments({ size: 100 });
  const { data: branchesData } = useBranches({ size: 100 });
  const { data: positionsData } = usePositions({ size: 100 });
  const { data: employeesData } = useEmployees({ 
    size: 100,
    branch_id: formData.branch_id || undefined, // Filter by selected branch
    is_active: true // Only show active employees
  }); // For portfolio and line manager dropdowns

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone_number: user.phone_number || '',
        role: user.role || 'officer',
        department_id: user.department_id || '',
        branch_id: user.branch_id || '',
        position_id: user.position_id || '',
        portfolio_id: user.portfolio_id || '',
        line_manager_id: user.line_manager_id || '',
        is_active: user.is_active ?? true,
        employee_id: user.employee_id || '',
      });
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username?.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.first_name?.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name?.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (formData.phone_number && !/^\+?[\d\s-()]+$/.test(formData.phone_number)) {
      newErrors.phone_number = 'Please enter a valid phone number';
    }

    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Prepare data for PATCH: strip empty fields, only send valid 4-digit employee_id
    const submitData: UserUpdate = {
      ...formData,
      department_id: formData.department_id || undefined,
      branch_id: formData.branch_id || undefined,
      role: formData.role || undefined,
      is_active: formData.is_active,
      employee_id: formData.employee_id || undefined,
      position_id: formData.position_id || undefined,
      portfolio_id: formData.portfolio_id || undefined,
      line_manager_id: formData.line_manager_id || undefined,
      phone_number: formData.phone_number || undefined,
    };
    if (!submitData.employee_id || !/^\d{4}$/.test(submitData.employee_id)) {
      delete submitData.employee_id;
    }
    // Remove password if it's empty
    if (!submitData.password?.trim()) {
      delete submitData.password;
    }

    updateUser.mutate(submitData, {
      onSuccess: () => {
        router.push('/users');
      },
      onError: (error: any) => {
        // Handle branch validation errors specifically
        const errorMessage = error.response?.data?.detail || 'Failed to update user';
        if (errorMessage.includes('same branch')) {
          setErrors(prev => ({
            ...prev,
            portfolio_id: errorMessage.includes('Portfolio') ? errorMessage : '',
            line_manager_id: errorMessage.includes('Line') ? errorMessage : ''
          }));
        }
      },
    });
  };

  const handleInputChange = (field: keyof UserUpdate, value: string | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // If branch changes, clear portfolio and line manager selections
      if (field === 'branch_id') {
        newData.portfolio_id = '';
        newData.line_manager_id = '';
      }
      
      return newData;
    });
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field as string]: '' }));
    }
  };

  // Filter employees by selected branch for portfolio and line manager dropdowns
  const getFilteredEmployees = () => {
    if (!formData.branch_id || !employeesData?.items) {
      return [];
    }
    
    return employeesData.items.filter(employee => 
      employee.branch_id === formData.branch_id &&
      employee.is_active
    );
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!user) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">User not found</h2>
              <p className="text-gray-600 mt-2">The user you're looking for doesn't exist.</p>
              <Link
                href="/users"
                className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Users
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <Link
              href="/users"
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Back to Users
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Edit User</h1>
          <p className="text-gray-600">Update user information</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employee ID (HR 4-digit) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee ID (4 digits)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    pattern="\d{4}"
                    value={formData.employee_id || ''}
                    onChange={(e) => handleInputChange('employee_id', e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. 1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={formData.username || ''}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.username ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter username"
                  />
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter email address"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.first_name || ''}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.first_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter first name"
                  />
                  {errors.first_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.last_name || ''}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.last_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter last name"
                  />
                  {errors.last_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone_number || ''}
                    onChange={(e) => handleInputChange('phone_number', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.phone_number ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter phone number"
                  />
                  {errors.phone_number && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone_number}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password || ''}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Leave empty to keep current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    Leave empty to keep the current password
                  </p>
                </div>
              </div>
            </div>

            {/* Role and Assignment */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Role and Assignment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={formData.role || 'officer'}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="officer">Officer</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department_id || ''}
                    onChange={(e) => handleInputChange('department_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Department</option>
                    {departmentsData?.items?.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch
                  </label>
                  <select
                    value={formData.branch_id || ''}
                    onChange={(e) => handleInputChange('branch_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Branch</option>
                    {branchesData?.items?.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Positions
                    </label>
                    <select
                      value={formData.position_id || ''}
                      onChange={(e) => handleInputChange('position_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Position</option>
                      {positionsData?.items?.map((position) => (
                        <option key={position.id} value={position.id}>
                          {position.name}
                        </option>
                      ))}
                    </select>
                </div>
              </div>
            </div>

            {/* Portfolio and Management */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Portfolio and Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Portfolio Manager
                  </label>
                  <select
                    value={formData.portfolio_id || ''}
                    onChange={(e) => handleInputChange('portfolio_id', e.target.value)}
                    disabled={!formData.branch_id}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!formData.branch_id ? 'Select Branch First' : 'Select Portfolio Manager'}
                    </option>
                    {getFilteredEmployees().map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.full_name_latin} ({employee.employee_code})
                      </option>
                    ))}
                  </select>
                  {!formData.branch_id && (
                    <p className="mt-1 text-sm text-gray-500">
                      Please select a branch to see available portfolio managers
                    </p>
                  )}
                  {errors.portfolio_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.portfolio_id}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Line Manager
                  </label>
                  <select
                    value={formData.line_manager_id || ''}
                    onChange={(e) => handleInputChange('line_manager_id', e.target.value)}
                    disabled={!formData.branch_id}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!formData.branch_id ? 'Select Branch First' : 'Select Line Manager'}
                    </option>
                    {getFilteredEmployees().map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.full_name_latin} ({employee.employee_code})
                      </option>
                    ))}
                  </select>
                  {!formData.branch_id && (
                    <p className="mt-1 text-sm text-gray-500">
                      Please select a branch to see available line managers
                    </p>
                  )}
                  {errors.line_manager_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.line_manager_id}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active ?? true}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Active User
                </label>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Inactive users cannot log in to the system
              </p>
            </div>

            {/* Form Actions */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-end space-x-4">
                <Link
                  href="/users"
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={updateUser.isPending}
                  className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updateUser.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update User
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