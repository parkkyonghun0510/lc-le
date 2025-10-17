'use client';

import React from 'react';
import {
  ClockIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { ProductType, PRODUCT_TYPES, LoanPurpose } from '../types';
import { FormField } from './FormField';
import { SelectField } from './SelectField';
import { CurrencyInput } from './CurrencyInput';
import { useProductTypes } from '@/hooks/useEnums';

interface LoanInformationStepProps {
  formValues: {
    requested_amount: string;
    product_type: ProductType;
    requested_disbursement_date: string;
    purpose_details: string;
    desired_loan_term: number;
  };
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  loanPurposes: Array<{ value: LoanPurpose; label: string }>;
  isLoadingProductTypes: boolean;
}

export const LoanInformationStep: React.FC<LoanInformationStepProps> = ({
  formValues,
  onInputChange,
  loanPurposes,
  isLoadingProductTypes,
}) => {
  const { data: productTypes, isLoading } = useProductTypes();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-2">
          <SelectField
          label="ប្រភេទ ផលិតផល"
          name="product_type"
          value={formValues.product_type}
          onChange={onInputChange}
          options={productTypes?.map(type => ({ value: type.value, label: type.label })) || []}
          placeholder="ជ្រើសរើសប្រភេទ ផលិតផល"
          icon={BuildingOfficeIcon}
          disabled={isLoadingProductTypes}
          required
        />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="ចំនួន ផលិតផល"
          name="desired_loan_term"
          type="number"
          value={String(formValues.desired_loan_term || 1)}
          onChange={onInputChange}
          placeholder="Enter desired loan term in months"
          required
          min="1"
          max="360"
        />
        <CurrencyInput
          label="ទឹកប្រាក់ កម្ចី"
          name="requested_amount"
          value={formValues.requested_amount || ''}
          onChange={onInputChange}
          placeholder="Enter requested amount"
          required
        />

        <FormField
          label="កាលបរិច្ឆេទ ទទួលប្រាក់"
          name="requested_disbursement_date"
          type="date"
          value={formValues.requested_disbursement_date || ''}
          onChange={onInputChange}
          icon={CalendarIcon}
          required
          min={(() => {
            const date = new Date();
            date.setDate(date.getDate() + 1);
            return date.toISOString().split('T')[0];
          })()}
        />

        <FormField
          label="គោលបំណង"
          name="purpose_details"
          type="text"
          value={formValues.purpose_details || ''}
          onChange={onInputChange}
          placeholder="e.g., Business expansion, Home renovation"
          icon={PencilIcon}
          required
        />
      </div>
    </div>
  );
};