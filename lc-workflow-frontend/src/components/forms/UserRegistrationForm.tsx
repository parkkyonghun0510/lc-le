'use client';

import React, { useState } from 'react';
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
import { ValidationInput } from '@/components/validation/ValidationInput';
import {
  useUsernameValidation,
  useEmailValidation,
  usePhoneValidation,
  useEmployeeIdValidation,
  useFormValidation,
} from '@/hooks/useValidation';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export interface UserFormData {
  username: string;
  email: string;
  phone: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  password: string;
  confirm_password: string;
}

export interface UserRegistrationFormProps {
  onSubmit: (data: UserFormData) => Promise<void>;
  isLoading?: boolean;
  excludeUserId?: string;
  initialData?: Partial<UserFormData>;
  mode?: 'create' | 'edit';
}

export const UserRegistrationForm: React.FC<UserRegistrationFormProps> = ({
  onSubmit,
  isLoading = false,
  excludeUserId,
  initialData = {},
  mode = 'create',
}) => {
  const [formData, setFormData] = useState<UserFormData>({
    username: initialData.username || '',
    email: initialData.email || '',
    phone: initialData.phone || '',
    employee_id: initialData.employee_id || '',
    first_name: initialData.first_name || '',
    last_name: initialData.last_name || '',
    password: initialData.password || '',
    confirm_password: initialData.confirm_password || '',
  });

  const [submitError, setSubmitError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');

  // Individual field validations
  const usernameValidation = useUsernameValidation();
  const emailValidation = useEmailValidation();
  const phoneValidation = usePhoneValidation();
  const employeeIdValidation = useEmployeeIdValidation();

  // Form-level validation
  const formValidation = useFormValidation('user', excludeUserId);

  const updateField = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSubmitError(''); // Clear submit error when user makes changes
    
    // Clear password error when passwords are updated
    if (field === 'password' || field === 'confirm_password') {
      setPasswordError('');
    }
  };

  const validatePasswords = (): boolean => {
    if (mode === 'create' || formData.password) {
      if (formData.password.length < 8) {
        setPasswordError('Password must be at least 8 characters long');
        return false;
      }
      if (formData.password !== formData.confirm_password) {
        setPasswordError('Passwords do not match');
        return false;
      }
    }
    return true;
  };

  const isFormValid = (): boolean => {
    // Check required fields
    const requiredFields = ['username', 'email', 'first_name', 'last_name'];
    const hasRequiredFields = requiredFields.every(field => 
      formData[field as keyof UserFormData].trim() !== ''
    );

    // Check validation states
    const hasValidationErrors = 
      !usernameValidation.isAvailable ||
      !emailValidation.isAvailable ||
      (formData.phone && !phoneValidation.isAvailable) ||
      (formData.employee_id && !employeeIdValidation.isAvailable);

    // Check if any validations are still loading
    const isValidating = 
      usernameValidation.isValidating ||
      emailValidation.isValidating ||
      phoneValidation.isValidating ||
      employeeIdValidation.isValidating ||
      formValidation.isValidating;

    return hasRequiredFields && !hasValidationErrors && !isValidating && validatePasswords();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setPasswordError('');

    if (!validatePasswords()) {
      return;
    }

    if (!isFormValid()) {
      setSubmitError('Please fix all validation errors before submitting');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'An error occurred while saving user'
      );
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Create New User' : 'Edit User'}
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

          {/* Unique Fields with Validation */}
          <ValidationInput
            label="Username"
            value={formData.username}
            onChange={(value) => updateField('username', value)}
            onValidate={usernameValidation.validate}
            isValidating={usernameValidation.isValidating}
            isAvailable={usernameValidation.isAvailable}
            validationMessage={usernameValidation.message || ''}
            placeholder="Enter username"
            required
            excludeId={excludeUserId}
          />

          <ValidationInput
            label="Email"
            type="email"
            value={formData.email}
            onChange={(value) => updateField('email', value)}
            onValidate={emailValidation.validate}
            isValidating={emailValidation.isValidating}
            isAvailable={emailValidation.isAvailable}
            validationMessage={emailValidation.message || ''}
            placeholder="Enter email address"
            required
            excludeId={excludeUserId}
          />

          <ValidationInput
            label="Phone Number"
            type="tel"
            value={formData.phone}
            onChange={(value) => updateField('phone', value)}
            onValidate={phoneValidation.validate}
            isValidating={phoneValidation.isValidating}
            isAvailable={phoneValidation.isAvailable}
            validationMessage={phoneValidation.message || ''}
            placeholder="Enter phone number (optional)"
            excludeId={excludeUserId}
          />

          <ValidationInput
            label="Employee ID"
            value={formData.employee_id}
            onChange={(value) => updateField('employee_id', value)}
            onValidate={employeeIdValidation.validate}
            isValidating={employeeIdValidation.isValidating}
            isAvailable={employeeIdValidation.isAvailable}
            validationMessage={employeeIdValidation.message || ''}
            placeholder="Enter employee ID (optional)"
            excludeId={excludeUserId}
          />

          {/* Password Fields */}
          {(mode === 'create' || formData.password) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ValidationInput
                label="Password"
                type="password"
                value={formData.password}
                onChange={(value) => updateField('password', value)}
                placeholder="Enter password"
                required={mode === 'create'}
                showValidationIcon={false}
              />
              
              <ValidationInput
                label="Confirm Password"
                type="password"
                value={formData.confirm_password}
                onChange={(value) => updateField('confirm_password', value)}
                placeholder="Confirm password"
                required={mode === 'create' || !!formData.password}
                error={passwordError}
                showValidationIcon={false}
              />
            </div>
          )}

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
                mode === 'create' ? 'Create User' : 'Update User'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default UserRegistrationForm;