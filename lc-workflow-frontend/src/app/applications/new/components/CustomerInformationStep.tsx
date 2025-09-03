'use client';

import React, { useMemo } from 'react';
import {
  UserIcon,
  IdentificationIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { IDCardType } from '../types';
import { FormField } from './FormField';
import { SelectField } from './SelectField';
import { useIDCardTypes } from '@/hooks/useEnums';
import { getIDNumberPlaceholder } from '@/utils/idCardHelpers';

interface CustomerInformationStepProps {
  formValues: {
    full_name_khmer: string;
    full_name_latin: string;
    id_card_type: IDCardType;
    id_number: string;
    phone: string;
    current_address: string;
    date_of_birth: string;
    portfolio_officer_name: string;
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export const CustomerInformationStep: React.FC<CustomerInformationStepProps> = ({
  formValues,
  onInputChange,
}) => {
  const { data: idCardTypes, isLoading: isLoadingIdCardTypes } = useIDCardTypes();

  // Get dynamic placeholder for ID number based on selected ID card type
  const idNumberPlaceholder = useMemo(() => {
    return getIDNumberPlaceholder(formValues.id_card_type);
  }, [formValues.id_card_type]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          placeholder="Select ID Card Type"
          icon={IdentificationIcon}
          required
          disabled={isLoadingIdCardTypes}
        />

        <FormField
          label="លេខអត្តសញ្ញាណប័ណ្ណ"
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



        <FormField
          label="Address"
          name="current_address"
          type="text"
          value={formValues.current_address}
          onChange={onInputChange}
          placeholder="Enter address"
          icon={MapPinIcon}
        />

        <FormField
          label="ថ្ងៃខែឆ្នាំកំណើត"
          name="date_of_birth"
          type="date"
          value={formValues.date_of_birth}
          onChange={onInputChange}
          icon={UserIcon}
        />

        <FormField
          label="Portfolio Officer Name"
          name="portfolio_officer_name"
          type="text"
          value={formValues.portfolio_officer_name}
          onChange={onInputChange}
          placeholder="Enter portfolio officer name"
          icon={UserIcon}
        />
      </div>
    </div>
  );
};