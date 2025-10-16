'use client';

import React, { useMemo } from 'react';
import {
  UserIcon,
  IdentificationIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { IDCardType } from '../types';
import { FormField } from './FormField';
import { SelectField } from './SelectField';
import { AddressField } from './AddressField';
import { useIDCardTypes } from '@/hooks/useEnums';
import { getIDNumberPlaceholder } from '@/utils/idCardHelpers';
import { EmployeeSelector } from '@/components/employees/EmployeeSelector';
import { useAuth } from '@/hooks/useAuth';

import { EmployeeAssignmentCreate } from '@/types/models';
import { ApplicationFormValues } from '../types';

interface CustomerInformationStepProps {
  formValues: ApplicationFormValues;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onEmployeeAssignmentsChange?: (assignments: EmployeeAssignmentCreate[]) => void;
}

export const CustomerInformationStep: React.FC<CustomerInformationStepProps> = ({
  formValues,
  onInputChange,
  onEmployeeAssignmentsChange,
}) => {
  const { data: idCardTypes, isLoading: isLoadingIdCardTypes } = useIDCardTypes();
  const { user } = useAuth();

  // Get dynamic placeholder for ID number based on selected ID card type
  const idNumberPlaceholder = useMemo(() => {
    return getIDNumberPlaceholder(formValues.id_card_type);
  }, [formValues.id_card_type]);

  // Options for Sex field
  const sexOptions = [
    { value: 'male', label: 'ប្រុស' },
    { value: 'female', label: 'ស្រី' },
  ];

  // Options for Marital Status field
  const maritalStatusOptions = [
    { value: 'single', label: 'នៅលីវ' },
    { value: 'married', label: 'រៀបការរួច' },
    { value: 'divorced', label: 'មេម៉ាយ' },
    { value: 'widowed', label: 'ពោះម៉ាយ' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <FormField
          label="ឈ្មោះជាភាសាខ្មែរ"
          name="full_name_khmer"
          type="text"
          value={formValues.full_name_khmer}
          onChange={onInputChange}
          placeholder="បញ្ចូលឈ្មោះជាភាសាខ្មែរ"
          icon={UserIcon}
          required
        />

        <FormField
          label="ឈ្មោះជាអក្សរឡាតាំង"
          name="full_name_latin"
          type="text"
          value={formValues.full_name_latin}
          onChange={onInputChange}
          placeholder="Enter name in Latin"
          icon={UserIcon}
          required
        />

        <SelectField
          label="ប្រភេទអត្តសញ្ញាណប័ណ្ណ"
          name="id_card_type"
          value={formValues.id_card_type}
          onChange={onInputChange}
          options={idCardTypes?.map(type => ({ value: type.value, label: type.label })) || []}
          placeholder="សូមជ្រើសរើស"
          icon={IdentificationIcon}
          required
          disabled={isLoadingIdCardTypes}
        />

        <FormField
          label="លេខសម្គាល់ប័ណ្ណ"
          name="id_number"
          type="text"
          value={formValues.id_number}
          onChange={onInputChange}
          placeholder={idNumberPlaceholder}
          icon={IdentificationIcon}
          required
        />

        <FormField
          label="លេខទូរស័ព្ទ"
          name="phone"
          type="tel"
          value={formValues.phone}
          onChange={onInputChange}
          placeholder="012 345 678"
          icon={PhoneIcon}
          required
        />

        <SelectField
          label="ភេទ"
          name="sex"
          value={formValues.sex}
          onChange={onInputChange}
          options={sexOptions}
          placeholder="សូមជ្រើសរើស"
          icon={UserIcon}
          required
        />



        <FormField
          label="ថ្ងៃខែឆ្នាំកំណើត"
          name="date_of_birth"
          type="date"
          value={formValues.date_of_birth}
          onChange={onInputChange}
          icon={UserIcon}
        />


        <SelectField
          label="ស្ថានភាពគ្រួសារ"
          name="marital_status"
          value={formValues.marital_status}
          onChange={onInputChange}
          options={maritalStatusOptions}
          placeholder="សូមជ្រើសរើស"
          icon={UserIcon}
          required
        />
        <AddressField
          label="អស័យដ្ឋាន"
          name="current_address"
          value={formValues.current_address}
          required
          onChange={onInputChange}
          placeholder="ជ្រើសរើសអាសយដ្ឋាន"
        />
      </div>

      {/* Employee Assignment Section */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Employee Assignment
        </h3>
        <EmployeeSelector
          value={formValues.employee_assignments || []}
          onChange={(assignments) => {
            if (onEmployeeAssignmentsChange) {
              onEmployeeAssignmentsChange(assignments);
            }
          }}
          branchId={user?.branch_id}
          allowMultiple={true}
        />
        
        {/* Keep portfolio_officer_name for backward compatibility (optional/hidden) */}
        <div className="mt-4">
          <FormField
            label="មន្រ្តី ទទួលបន្ទុក (Legacy)"
            name="portfolio_officer_name"
            type="text"
            value={formValues.portfolio_officer_name}
            onChange={onInputChange}
            placeholder="ឈ្មោះមន្ត្រី"
            icon={UserIcon}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            This field is kept for backward compatibility. Use employee assignments above instead.
          </p>
        </div>
      </div>
    </div>
  );
};
