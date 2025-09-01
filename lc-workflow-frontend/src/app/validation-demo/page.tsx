'use client';

import React, { useState } from 'react';
import { UserRegistrationForm, UserFormData } from '@/components/forms/UserRegistrationForm';
import { CustomerApplicationForm, CustomerApplicationFormData } from '@/components/forms/CustomerApplicationForm';
import { ValidationInput } from '@/components/validation/ValidationInput';
import {
  useUsernameValidation,
  useEmailValidation,
  usePhoneValidation,
  useEmployeeIdValidation,
  useIdNumberValidation,
} from '@/hooks/useValidation';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Basic UI components
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

const Button = ({ children, onClick, variant = 'primary', className = '', ...props }: any) => {
  const variantClasses: { [key: string]: string } = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700'
  };
  
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md font-medium transition-colors ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Tabs = ({ children, value, onValueChange }: any) => (
  <div className="w-full">
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-8">
        {React.Children.map(children, (child, index) => {
          if (child.type === TabsList) {
            return React.cloneElement(child, { value, onValueChange });
          }
          return null;
        })}
      </nav>
    </div>
    <div className="mt-4">
      {React.Children.map(children, (child) => {
        if (child.type === TabsContent && child.props.value === value) {
          return child;
        }
        return null;
      })}
    </div>
  </div>
);

const TabsList = ({ children, value, onValueChange }: any) => (
  <>
    {React.Children.map(children, (child) =>
      React.cloneElement(child, { isActive: child.props.value === value, onClick: () => onValueChange(child.props.value) })
    )}
  </>
);

const TabsTrigger = ({ children, value, isActive, onClick }: any) => (
  <button
    onClick={onClick}
    className={`py-2 px-1 border-b-2 font-medium text-sm ${
      isActive
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    {children}
  </button>
);

const TabsContent = ({ children, value }: any) => (
  <div>{children}</div>
);

// Individual field testing component
const FieldValidationTest: React.FC = () => {
  const usernameValidation = useUsernameValidation();
  const emailValidation = useEmailValidation();
  const phoneValidation = usePhoneValidation();
  const employeeIdValidation = useEmployeeIdValidation();
  const idNumberValidation = useIdNumberValidation();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ValidationInput
          label="Username"
          value={usernameValidation.username}
          onChange={usernameValidation.validate}
          onValidate={usernameValidation.validate}
          isValidating={usernameValidation.isValidating}
          isAvailable={usernameValidation.isAvailable}
          validationMessage={usernameValidation.message || ''}
          placeholder="Test username availability"
        />

        <ValidationInput
          label="Email"
          type="email"
          value={emailValidation.email}
          onChange={emailValidation.validate}
          onValidate={emailValidation.validate}
          isValidating={emailValidation.isValidating}
          isAvailable={emailValidation.isAvailable}
          validationMessage={emailValidation.message || ''}
          placeholder="Test email availability"
        />

        <ValidationInput
          label="Phone Number"
          type="tel"
          value={phoneValidation.phone}
          onChange={phoneValidation.validate}
          onValidate={phoneValidation.validate}
          isValidating={phoneValidation.isValidating}
          isAvailable={phoneValidation.isAvailable}
          validationMessage={phoneValidation.message || ''}
          placeholder="Test phone availability"
        />

        <ValidationInput
          label="Employee ID"
          value={employeeIdValidation.employeeId}
          onChange={employeeIdValidation.validate}
          onValidate={employeeIdValidation.validate}
          isValidating={employeeIdValidation.isValidating}
          isAvailable={employeeIdValidation.isAvailable}
          validationMessage={employeeIdValidation.message || ''}
          placeholder="Test employee ID availability"
        />

        <ValidationInput
          label="ID Number"
          value={idNumberValidation.idNumber}
          onChange={idNumberValidation.validate}
          onValidate={idNumberValidation.validate}
          isValidating={idNumberValidation.isValidating}
          isAvailable={idNumberValidation.isAvailable}
          validationMessage={idNumberValidation.message || ''}
          placeholder="Test ID number availability"
        />
      </div>

      {/* Validation Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Username', validation: usernameValidation },
              { label: 'Email', validation: emailValidation },
              { label: 'Phone', validation: phoneValidation },
              { label: 'Employee ID', validation: employeeIdValidation },
              { label: 'ID Number', validation: idNumberValidation },
            ].map(({ label, validation }) => (
              <div key={label} className="flex items-center space-x-2 p-3 border rounded-lg">
                <div className="flex-shrink-0">
                  {validation.isValidating ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  ) : validation.isAvailable === true ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : validation.isAvailable === false ? (
                    <XCircleIcon className="h-5 w-5 text-red-500" />
                  ) : (
                    <div className="h-5 w-5 bg-gray-300 rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {validation.isValidating
                      ? 'Checking...'
                      : validation.message || 'No validation performed'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function ValidationDemoPage() {
  const [activeTab, setActiveTab] = useState('fields');

  const handleUserSubmit = async (data: UserFormData) => {
    console.log('User form submitted:', data);
    toast.success('User form submitted successfully!');
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleCustomerSubmit = async (data: CustomerApplicationFormData) => {
    console.log('Customer application submitted:', data);
    toast.success('Customer application submitted successfully!');
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Validation System Demo
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Test the real-time duplicate validation system with comprehensive error handling and user feedback.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="fields">Individual Fields</TabsTrigger>
            <TabsTrigger value="user-form">User Registration</TabsTrigger>
            <TabsTrigger value="customer-form">Customer Application</TabsTrigger>
          </TabsList>

          <TabsContent value="fields">
            <Card>
              <CardHeader>
                <CardTitle>Individual Field Validation Testing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Test individual field validations with real-time duplicate checking. 
                  Try entering existing values to see validation errors and suggestions.
                </p>
                <FieldValidationTest />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="user-form">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Registration Form</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Complete user registration form with integrated validation. 
                    All unique fields are validated in real-time.
                  </p>
                </CardContent>
              </Card>
              <UserRegistrationForm
                onSubmit={handleUserSubmit}
                mode="create"
              />
            </div>
          </TabsContent>

          <TabsContent value="customer-form">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Application Form</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Customer application form with ID number and phone validation. 
                    Demonstrates validation for customer-specific fields.
                  </p>
                </CardContent>
              </Card>
              <CustomerApplicationForm
                onSubmit={handleCustomerSubmit}
                mode="create"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}