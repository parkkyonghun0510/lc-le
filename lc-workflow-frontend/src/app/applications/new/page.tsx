'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useCreateApplication } from '@/hooks/useApplications';
import { CustomerApplicationCreate } from '@/types/models';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function NewApplicationPage() {
  const router = useRouter();
  const { mutate: createApplication, isPending } = useCreateApplication();
  
  const [formData, setFormData] = useState<CustomerApplicationCreate>({
    full_name_latin: '',
    full_name_khmer: '',
    phone: '',
    id_card_type: 'national_id',
    id_number: '',
    date_of_birth: '',
    requested_amount: 0,
    product_type: '',
    desired_loan_term: '',
    requested_disbursement_date: '',
    loan_purposes: [],
    purpose_details: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric fields
    if (name === 'requested_amount') {
      setFormData({
        ...formData,
        [name]: value ? parseFloat(value) : 0,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }

    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const handleLoanPurposeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    if (checked) {
      setFormData({
        ...formData,
        loan_purposes: [...(formData.loan_purposes || []), value],
      });
    } else {
      setFormData({
        ...formData,
        loan_purposes: (formData.loan_purposes || []).filter(purpose => purpose !== value),
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.full_name_latin) {
      newErrors.full_name_latin = 'Full name (Latin) is required';
    }
    
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    }
    
    if (!formData.requested_amount || formData.requested_amount <= 0) {
      newErrors.requested_amount = 'Please enter a valid loan amount';
    }
    
    if (!formData.product_type) {
      newErrors.product_type = 'Product type is required';
    }
    
    if (!formData.desired_loan_term) {
      newErrors.desired_loan_term = 'Loan term is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    createApplication(formData, {
      onSuccess: (data) => {
        router.push(`/applications/${data.id}`);
      },
    });
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link
              href="/applications"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Applications
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">New Loan Application</h1>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Application Form</h2>
              <p className="text-sm text-gray-500 mt-1">
                Fill in the customer and loan details below
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="full_name_latin" className="block text-sm font-medium text-gray-700">
                      Full Name (Latin) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="full_name_latin"
                      name="full_name_latin"
                      value={formData.full_name_latin}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md border ${errors.full_name_latin ? 'border-red-300' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
                    />
                    {errors.full_name_latin && (
                      <p className="mt-1 text-sm text-red-600">{errors.full_name_latin}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="full_name_khmer" className="block text-sm font-medium text-gray-700">
                      Full Name (Khmer)
                    </label>
                    <input
                      type="text"
                      id="full_name_khmer"
                      name="full_name_khmer"
                      value={formData.full_name_khmer || ''}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="phone"
                      name="phone"
                      value={formData.phone || ''}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md border ${errors.phone ? 'border-red-300' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      id="date_of_birth"
                      name="date_of_birth"
                      value={formData.date_of_birth || ''}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="id_card_type" className="block text-sm font-medium text-gray-700">
                      ID Card Type
                    </label>
                    <select
                      id="id_card_type"
                      name="id_card_type"
                      value={formData.id_card_type || 'national_id'}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="national_id">National ID</option>
                      <option value="passport">Passport</option>
                      <option value="drivers_license">Driver's License</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="id_number" className="block text-sm font-medium text-gray-700">
                      ID Number
                    </label>
                    <input
                      type="text"
                      id="id_number"
                      name="id_number"
                      value={formData.id_number || ''}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Loan Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Loan Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="requested_amount" className="block text-sm font-medium text-gray-700">
                      Requested Amount ($) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="requested_amount"
                      name="requested_amount"
                      value={formData.requested_amount || ''}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className={`mt-1 block w-full rounded-md border ${errors.requested_amount ? 'border-red-300' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
                    />
                    {errors.requested_amount && (
                      <p className="mt-1 text-sm text-red-600">{errors.requested_amount}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="product_type" className="block text-sm font-medium text-gray-700">
                      Product Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="product_type"
                      name="product_type"
                      value={formData.product_type || ''}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md border ${errors.product_type ? 'border-red-300' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
                    >
                      <option value="">Select a product</option>
                      <option value="personal_loan">Personal Loan</option>
                      <option value="business_loan">Business Loan</option>
                      <option value="home_loan">Home Loan</option>
                      <option value="auto_loan">Auto Loan</option>
                      <option value="education_loan">Education Loan</option>
                    </select>
                    {errors.product_type && (
                      <p className="mt-1 text-sm text-red-600">{errors.product_type}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="desired_loan_term" className="block text-sm font-medium text-gray-700">
                      Loan Term <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="desired_loan_term"
                      name="desired_loan_term"
                      value={formData.desired_loan_term || ''}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md border ${errors.desired_loan_term ? 'border-red-300' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
                    >
                      <option value="">Select a term</option>
                      <option value="3_months">3 Months</option>
                      <option value="6_months">6 Months</option>
                      <option value="12_months">12 Months</option>
                      <option value="24_months">24 Months</option>
                      <option value="36_months">36 Months</option>
                      <option value="48_months">48 Months</option>
                      <option value="60_months">60 Months</option>
                    </select>
                    {errors.desired_loan_term && (
                      <p className="mt-1 text-sm text-red-600">{errors.desired_loan_term}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="requested_disbursement_date" className="block text-sm font-medium text-gray-700">
                      Requested Disbursement Date
                    </label>
                    <input
                      type="date"
                      id="requested_disbursement_date"
                      name="requested_disbursement_date"
                      value={formData.requested_disbursement_date || ''}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loan Purpose
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {['business', 'education', 'home_improvement', 'medical', 'debt_consolidation', 'vehicle', 'other'].map((purpose) => (
                      <div key={purpose} className="flex items-center">
                        <input
                          id={`purpose_${purpose}`}
                          name={`purpose_${purpose}`}
                          type="checkbox"
                          value={purpose}
                          checked={(formData.loan_purposes || []).includes(purpose)}
                          onChange={handleLoanPurposeChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`purpose_${purpose}`} className="ml-2 block text-sm text-gray-700 capitalize">
                          {purpose.replace('_', ' ')}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <label htmlFor="purpose_details" className="block text-sm font-medium text-gray-700">
                    Purpose Details
                  </label>
                  <textarea
                    id="purpose_details"
                    name="purpose_details"
                    rows={3}
                    value={formData.purpose_details || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Please provide more details about the loan purpose..."
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-5 border-t border-gray-200">
                <div className="flex justify-end space-x-3">
                  <Link
                    href="/applications"
                    className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? 'Creating...' : 'Create Application'}
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