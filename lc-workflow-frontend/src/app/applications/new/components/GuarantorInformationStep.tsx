'use client';

import React from 'react';
import { UserIcon, PhoneIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { FormField } from './FormField';
import { AddressField } from './AddressField';

interface GuarantorInformationStepProps {
  formValues: {
    guarantor_name: string;
    guarantor_phone: string;
    guarantor_id_number?: string;
    guarantor_address?: string;
    guarantor_relationship?: string;
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const GuarantorInformationStep: React.FC<GuarantorInformationStepProps> = ({
  formValues,
  onInputChange,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="ឈ្មោះ អ្នកធានា"
          name="guarantor_name"
          type="text"
          value={formValues.guarantor_name}
          onChange={onInputChange}
          placeholder="Enter guarantor name"
          icon={UserIcon}
        />

        <FormField
          label="លេខទូរស័ព្ទ"
          name="guarantor_phone"
          type="tel"
          value={formValues.guarantor_phone}
          onChange={onInputChange}
          placeholder="Enter guarantor phone number"
          icon={PhoneIcon}
          required
        />

        <FormField
          label="លេខសម្គាល់ប័ណ្ណ"
          name="guarantor_id_number"
          type="text"
          value={formValues.guarantor_id_number || ''}
          onChange={onInputChange}
          placeholder="Enter guarantor ID number"
          icon={UserIcon}
          required
        />

        <AddressField
          label="អស័យដ្ឋាន"
          name="guarantor_address"
          value={formValues.guarantor_address || ''}
          required
          onChange={onInputChange}
          placeholder="ជ្រើសរើសអាសយដ្ឋាន"
        />

        <FormField
          label="Relationship to Applicant"
          name="guarantor_relationship"
          type="text"
          value={formValues.guarantor_relationship || ''}
          onChange={onInputChange}
          placeholder="e.g., Spouse, Parent, Friend"
          icon={UserGroupIcon}
        />

      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <UserGroupIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Guarantor Information
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Providing guarantor information is optional but may help with loan approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};