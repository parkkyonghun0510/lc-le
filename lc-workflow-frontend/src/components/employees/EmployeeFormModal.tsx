'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Employee } from '@/types/models';
import { useCreateEmployee, useUpdateEmployee } from '@/hooks/useEmployees';
import { useNextEmployeeCode, useCheckEmployeeCode } from '@/hooks/useEmployeeCode';
import { useDepartments } from '@/hooks/useDepartments';
import { useBranches } from '@/hooks/useBranches';
import { useUsers } from '@/hooks/useUsers';
import useDebounce from '@/hooks/useDebounce';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface EmployeeFormModalProps {
  open: boolean;
  onClose: () => void;
  employee?: Employee;
  mode: 'create' | 'edit';
}

interface FormData {
  employee_code: string;
  full_name_khmer: string;
  full_name_latin: string;
  phone_number: string;
  email: string;
  position: string;
  department_id: string;
  branch_id: string;
  user_id: string;
  notes: string;
  is_active: boolean;
}

interface FormErrors {
  employee_code?: string;
  full_name_khmer?: string;
  full_name_latin?: string;
  phone_number?: string;
  email?: string;
}

const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  open,
  onClose,
  employee,
  mode,
}) => {
  const [formData, setFormData] = useState<FormData>({
    employee_code: '',
    full_name_khmer: '',
    full_name_latin: '',
    phone_number: '',
    email: '',
    position: '',
    department_id: '',
    branch_id: '',
    user_id: '',
    notes: '',
    is_active: true,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [userSearch, setUserSearch] = useState('');
  const [suggestedCode, setSuggestedCode] = useState<string | null>(null);
  const [existingEmployee, setExistingEmployee] = useState<{ id: string; full_name_khmer: string; full_name_latin: string } | null>(null);

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee(employee?.id || '');
  const { data: departmentsData } = useDepartments({ size: 100 });
  const { data: branchesData } = useBranches({ size: 100 });
  const { data: usersData } = useUsers({ 
    search: userSearch || undefined, 
    size: 20 
  });

  // Fetch next available code for create mode
  const { data: nextCodeData, refetch: refetchNextCode } = useNextEmployeeCode();

  // Debounced employee code for availability checking
  const debouncedCode = useDebounce(formData.employee_code, 500);

  // Check code availability (only in create mode and when code is not empty)
  const { data: availabilityData, isLoading: isCheckingAvailability } = useCheckEmployeeCode(
    debouncedCode,
    mode === 'create' && debouncedCode.length > 0
  );

  // Initialize form data when employee prop changes
  useEffect(() => {
    if (employee && mode === 'edit') {
      setFormData({
        employee_code: employee.employee_code || '',
        full_name_khmer: employee.full_name_khmer || '',
        full_name_latin: employee.full_name_latin || '',
        phone_number: employee.phone_number || '',
        email: employee.email || '',
        position: employee.position || '',
        department_id: employee.department_id || '',
        branch_id: employee.branch_id || '',
        user_id: employee.user_id || '',
        notes: employee.notes || '',
        is_active: employee.is_active ?? true,
      });
    } else {
      // Reset form for create mode
      setFormData({
        employee_code: '',
        full_name_khmer: '',
        full_name_latin: '',
        phone_number: '',
        email: '',
        position: '',
        department_id: '',
        branch_id: '',
        user_id: '',
        notes: '',
        is_active: true,
      });
    }
    setErrors({});
    setSuggestedCode(null);
    setExistingEmployee(null);
  }, [employee, mode, open]);

  // Auto-fill employee code when modal opens in create mode
  useEffect(() => {
    if (open && mode === 'create' && nextCodeData?.code && !formData.employee_code) {
      setFormData(prev => ({
        ...prev,
        employee_code: nextCodeData.code
      }));
    }
  }, [open, mode, nextCodeData, formData.employee_code]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields validation
    if (!formData.employee_code.trim()) {
      newErrors.employee_code = 'Employee code is required';
    } else if (formData.employee_code.length > 20) {
      newErrors.employee_code = 'Employee code must be 20 characters or less';
    }

    if (!formData.full_name_khmer.trim()) {
      newErrors.full_name_khmer = 'Khmer name is required';
    } else if (formData.full_name_khmer.length > 255) {
      newErrors.full_name_khmer = 'Khmer name must be 255 characters or less';
    }

    if (!formData.full_name_latin.trim()) {
      newErrors.full_name_latin = 'Latin name is required';
    } else if (formData.full_name_latin.length > 255) {
      newErrors.full_name_latin = 'Latin name must be 255 characters or less';
    }

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Phone number is required';
    } else if (formData.phone_number.length > 20) {
      newErrors.phone_number = 'Phone number must be 20 characters or less';
    }

    // Email validation (optional but must be valid if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    // Clear suggested code when user manually changes employee code
    if (name === 'employee_code') {
      setSuggestedCode(null);
      setExistingEmployee(null);
    }
  };

  // Handler to use suggested code
  const handleUseSuggestedCode = useCallback(() => {
    if (suggestedCode) {
      setFormData(prev => ({
        ...prev,
        employee_code: suggestedCode
      }));
      setSuggestedCode(null);
      setExistingEmployee(null);
      setErrors(prev => ({ ...prev, employee_code: undefined }));
    }
  }, [suggestedCode]);

  // Handler to fetch and suggest next code
  const handleSuggestCode = useCallback(async () => {
    const result = await refetchNextCode();
    if (result.data?.code) {
      setFormData(prev => ({
        ...prev,
        employee_code: result.data.code
      }));
    }
  }, [refetchNextCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    try {
      // Prepare payload - remove empty strings for optional fields
      const payload: any = {
        employee_code: formData.employee_code,
        full_name_khmer: formData.full_name_khmer,
        full_name_latin: formData.full_name_latin,
        phone_number: formData.phone_number,
        email: formData.email || undefined,
        position: formData.position || undefined,
        department_id: formData.department_id || undefined,
        branch_id: formData.branch_id || undefined,
        user_id: formData.user_id || undefined,
        notes: formData.notes || undefined,
        is_active: formData.is_active,
      };

      if (mode === 'create') {
        await createEmployee.mutateAsync(payload);
        toast.success('Employee created successfully');
      } else {
        await updateEmployee.mutateAsync(payload);
        toast.success('Employee updated successfully');
      }

      onClose();
    } catch (error: any) {
      console.error('Form submission error:', error);
      
      // Handle enhanced duplicate error response
      if (error.response?.status === 409 && error.response?.data?.detail) {
        const detail = error.response.data.detail;
        
        // Check if it's the enhanced error format
        if (typeof detail === 'object' && detail.suggested_code) {
          setSuggestedCode(detail.suggested_code);
          setExistingEmployee(detail.existing_employee || null);
          setErrors(prev => ({
            ...prev,
            employee_code: detail.message || 'Employee code already exists'
          }));
          toast.error(detail.message || 'Employee code already exists');
        } else {
          toast.error(typeof detail === 'string' ? detail : 'Failed to save employee');
        }
      } else {
        toast.error(error.response?.data?.detail || 'Failed to save employee');
      }
    }
  };

  const isLoading = createEmployee.isPending || updateEmployee.isPending;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={mode === 'create' ? 'Create Employee' : 'Edit Employee'}
      description={
        mode === 'create'
          ? 'Add a new employee to the system'
          : 'Update employee information'
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Code */}
        <div>
          <label htmlFor="employee_code" className="block text-sm font-medium text-gray-700 mb-1">
            Employee Code <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="employee_code"
              name="employee_code"
              value={formData.employee_code}
              onChange={handleInputChange}
              disabled={mode === 'edit'} // Don't allow changing code in edit mode
              className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.employee_code ? 'border-red-500' : 'border-gray-300'
              } ${mode === 'edit' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="e.g., EMP-2025-001"
            />
            
            {/* Availability Indicator */}
            {mode === 'create' && formData.employee_code && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isCheckingAvailability && (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                )}
                {!isCheckingAvailability && availabilityData?.available === true && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {!isCheckingAvailability && availabilityData?.available === false && (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            )}
          </div>
          
          {/* Duplicate Error with Suggestion */}
          {mode === 'create' && availabilityData?.available === false && availabilityData.existing_employee && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">Code Already Taken</p>
                  <p className="text-sm text-red-700 mt-1">
                    Employee code "{formData.employee_code}" is already used by{' '}
                    <strong>{availabilityData.existing_employee.full_name_latin}</strong>
                    {' '}({availabilityData.existing_employee.full_name_khmer})
                  </p>
                  {suggestedCode && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-red-700">
                        Suggested code: <strong className="font-mono">{suggestedCode}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={handleUseSuggestedCode}
                        className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        Use This Code
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Suggest Code Button */}
          {mode === 'create' && !formData.employee_code && (
            <button
              type="button"
              onClick={handleSuggestCode}
              className="mt-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Suggest Code
            </button>
          )}
          
          {errors.employee_code && !availabilityData?.existing_employee && (
            <p className="mt-1 text-sm text-red-600">{errors.employee_code}</p>
          )}
        </div>

        {/* Names Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Khmer Name */}
          <div>
            <label htmlFor="full_name_khmer" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name (Khmer) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="full_name_khmer"
              name="full_name_khmer"
              value={formData.full_name_khmer}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.full_name_khmer ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="ឈ្មោះពេញជាភាសាខ្មែរ"
            />
            {errors.full_name_khmer && (
              <p className="mt-1 text-sm text-red-600">{errors.full_name_khmer}</p>
            )}
          </div>

          {/* Latin Name */}
          <div>
            <label htmlFor="full_name_latin" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name (Latin) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="full_name_latin"
              name="full_name_latin"
              value={formData.full_name_latin}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.full_name_latin ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Full Name in Latin"
            />
            {errors.full_name_latin && (
              <p className="mt-1 text-sm text-red-600">{errors.full_name_latin}</p>
            )}
          </div>
        </div>

        {/* Contact Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Phone Number */}
          <div>
            <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.phone_number ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="012 345 678"
            />
            {errors.phone_number && (
              <p className="mt-1 text-sm text-red-600">{errors.phone_number}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="employee@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>
        </div>

        {/* Position */}
        <div>
          <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
            Position
          </label>
          <input
            type="text"
            id="position"
            name="position"
            value={formData.position}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Loan Officer, Field Officer"
          />
        </div>

        {/* Department and Branch Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Department */}
          <div>
            <label htmlFor="department_id" className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              id="department_id"
              name="department_id"
              value={formData.department_id}
              onChange={handleInputChange}
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

          {/* Branch */}
          <div>
            <label htmlFor="branch_id" className="block text-sm font-medium text-gray-700 mb-1">
              Branch
            </label>
            <select
              id="branch_id"
              name="branch_id"
              value={formData.branch_id}
              onChange={handleInputChange}
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
        </div>

        {/* User Linking */}
        <div>
          <label htmlFor="user_id" className="block text-sm font-medium text-gray-700 mb-1">
            Link to System User (Optional)
          </label>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              id="user_id"
              name="user_id"
              value={formData.user_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No linked user</option>
              {usersData?.items?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name && user.last_name 
                    ? `${user.first_name} ${user.last_name}` 
                    : user.username} ({user.email})
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Link this employee to a system user account for automatic association
          </p>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Additional notes about this employee..."
          />
        </div>

        {/* Active Status */}
        {mode === 'edit' && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
              Active Employee
            </label>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                <span className="ml-2">Saving...</span>
              </>
            ) : mode === 'create' ? (
              'Create Employee'
            ) : (
              'Update Employee'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EmployeeFormModal;
