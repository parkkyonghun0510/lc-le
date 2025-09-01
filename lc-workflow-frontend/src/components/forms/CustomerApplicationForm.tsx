'use client';

import React, { useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ValidationInput } from '@/components/validation/ValidationInput';
import {
  usePhoneValidation,
  useIdNumberValidation,
  useFormValidation,
} from '@/hooks/useValidation';

// Basic UI components using Tailwind CSS
const Button = ({ children, type = 'button', disabled = false, className = '', ...props }: any) => (
  <button
    type={type}
    disabled={disabled}
    className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed ${className}`}
    {...props}
  >
    {children}
  </button>
);

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white dark:bg-gray-800 shadow-lg rounded-lg ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children }: any) => (
  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
    {children}
  </div>
);

const CardTitle = ({ children }: any) => (
  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
    {children}
  </h2>
);

const CardContent = ({ children }: any) => (
  <div className="px-6 py-4">
    {children}
  </div>
);

const Alert = ({ children, variant = 'default', className = '' }: any) => {
  const variantClasses = {
    default: 'bg-blue-50 border-blue-200 text-blue-800',
    destructive: 'bg-red-50 border-red-200 text-red-800'
  };
  return (
    <div className={`p-4 border rounded-md ${variantClasses[variant as keyof typeof variantClasses]} ${className}`}>
      {children}
    </div>
  );
};

const AlertDescription = ({ children }: any) => (
  <div className="text-sm">{children}</div>
);

const Select = ({ value, onChange, children, className = '', ...props }: any) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white ${className}`}
    {...props}
  >
    {children}
  </select>
);

export interface CustomerApplicationFormData {
  first_name: string;
  last_name: string;
  id_number: string;
  id_card_type: 'national_id' | 'passport' | 'driver_license';
  phone: string;
  email?: string;
  address?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  occupation?: string;
  monthly_income?: number;
}

export interface CustomerApplicationFormProps {
  onSubmit: (data: CustomerApplicationFormData) => Promise<void>;
  isLoading?: boolean;
  excludeApplicationId?: string;
  initialData?: Partial<CustomerApplicationFormData>;
  mode?: 'create' | 'edit';
}

export const CustomerApplicationForm: React.FC<CustomerApplicationFormProps> = ({
  onSubmit,
  isLoading = false,
  excludeApplicationId,
  initialData = {},
  mode = 'create',
}) => {
  const [formData, setFormData] = useState<CustomerApplicationFormData>({
    first_name: initialData.first_name || '',
    last_name: initialData.last_name || '',
    id_number: initialData.id_number || '',
    id_card_type: initialData.id_card_type || 'national_id',
    phone: initialData.phone || '',
    email: initialData.email || '',
    address: initialData.address || '',
    date_of_birth: initialData.date_of_birth || '',
    gender: initialData.gender || 'male',
    occupation: initialData.occupation || '',
    monthly_income: initialData.monthly_income || 0,
  });

  const [submitError, setSubmitError] = useState<string>('');

  // Individual field validations
  const phoneValidation = usePhoneValidation();
  const idNumberValidation = useIdNumberValidation();

  // Form-level validation
  const formValidation = useFormValidation('customer_application', excludeApplicationId);

  const updateField = (field: keyof CustomerApplicationFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSubmitError(''); // Clear submit error when user makes changes
  };

  const isFormValid = (): boolean => {
    // Check required fields
    const requiredFields = ['first_name', 'last_name', 'id_number', 'phone'];
    const hasRequiredFields = requiredFields.every(field => {
      const value = formData[field as keyof CustomerApplicationFormData];
      return typeof value === 'string' ? value.trim() !== '' : value !== undefined;
    });

    // Check validation states
    const hasValidationErrors = 
      !phoneValidation.isAvailable ||
      !idNumberValidation.isAvailable;

    // Check if any validations are still loading
    const isValidating = 
      phoneValidation.isValidating ||
      idNumberValidation.isValidating ||
      formValidation.isValidating;

    return hasRequiredFields && !hasValidationErrors && !isValidating;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!isFormValid()) {
      setSubmitError('Please fix all validation errors before submitting');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'An error occurred while saving application'
      );
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'New Customer Application' : 'Edit Customer Application'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ValidationInput
              label="First Name"
              value={formData.first_name}
              onChange={(value) => updateField('first_name', value)}
              placeholder="Enter first name"
              required
              showValidationIcon={false}
            />
            
            <ValidationInput
              label="Last Name"
              value={formData.last_name}
              onChange={(value) => updateField('last_name', value)}
              placeholder="Enter last name"
              required
              showValidationIcon={false}
            />
          </div>

          {/* ID Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                ID Card Type
                <span className="text-red-500 ml-1">*</span>
              </label>
              <Select
                value={formData.id_card_type}
                onChange={(value: string) => updateField('id_card_type', value)}
              >
                <option value="national_id">National ID</option>
                <option value="passport">Passport</option>
                <option value="driver_license">Driver's License</option>
              </Select>
            </div>

            <ValidationInput
              label="ID Number"
              value={formData.id_number}
              onChange={(value) => updateField('id_number', value)}
              onValidate={idNumberValidation.validate}
              isValidating={idNumberValidation.isValidating}
              isAvailable={idNumberValidation.isAvailable}
              validationMessage={idNumberValidation.message || ''}
              placeholder="Enter ID number"
              required
              excludeId={excludeApplicationId}
            />
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ValidationInput
              label="Phone Number"
              type="tel"
              value={formData.phone}
              onChange={(value) => updateField('phone', value)}
              onValidate={phoneValidation.validate}
              isValidating={phoneValidation.isValidating}
              isAvailable={phoneValidation.isAvailable}
              validationMessage={phoneValidation.message || ''}
              placeholder="Enter phone number"
              required
              excludeId={excludeApplicationId}
            />

            <ValidationInput
              label="Email Address"
              type="email"
              value={formData.email || ''}
              onChange={(value) => updateField('email', value)}
              placeholder="Enter email address (optional)"
              showValidationIcon={false}
            />
          </div>

          {/* Additional Information */}
          <ValidationInput
            label="Address"
            value={formData.address || ''}
            onChange={(value) => updateField('address', value)}
            placeholder="Enter address (optional)"
            showValidationIcon={false}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ValidationInput
              label="Date of Birth"
              type="date"
              value={formData.date_of_birth || ''}
              onChange={(value) => updateField('date_of_birth', value)}
              showValidationIcon={false}
            />

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Gender
              </label>
              <Select
                value={formData.gender || 'male'}
                onChange={(value: string) => updateField('gender', value)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            </div>

            <ValidationInput
              label="Monthly Income"
              type="number"
              value={formData.monthly_income?.toString() || '0'}
              onChange={(value) => updateField('monthly_income', parseFloat(value) || 0)}
              placeholder="Enter monthly income"
              showValidationIcon={false}
            />
          </div>

          <ValidationInput
            label="Occupation"
            value={formData.occupation || ''}
            onChange={(value) => updateField('occupation', value)}
            placeholder="Enter occupation (optional)"
            showValidationIcon={false}
          />

          {/* Form-level validation errors */}
          {formValidation.generalError && (
            <Alert variant="destructive">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertDescription>{formValidation.generalError.message}</AlertDescription>
            </Alert>
          )}

          {/* Submit error */}
          {submitError && (
            <Alert variant="destructive">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="submit"
              disabled={!isFormValid() || isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                mode === 'create' ? 'Submit Application' : 'Update Application'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CustomerApplicationForm;