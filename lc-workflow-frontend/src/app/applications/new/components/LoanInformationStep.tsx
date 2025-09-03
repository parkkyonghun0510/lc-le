'use client';

import React from 'react';
import {
  BanknotesIcon,
  ClockIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { LoanPurpose, ProductType } from '../types';
import { FormField } from './FormField';
import { SelectField } from './SelectField';
import { TextAreaField } from './TextAreaField';
import { useProductTypes } from '@/hooks/useEnums';

interface LoanInformationStepProps {
  formValues: {
    requested_amount: string;
    desired_loan_term: number;
    product_type: ProductType;
    requested_disbursement_date: string;
    loan_purposes: LoanPurpose[];
    purpose_details: string;
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;

  loanPurposes: LoanPurpose[];
}

export const LoanInformationStep: React.FC<LoanInformationStepProps> = ({
  formValues,
  onInputChange,
  loanPurposes,
}) => {
  const { data: productTypes, isLoading: isLoadingProductTypes } = useProductTypes();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Requested Amount"
          name="requested_amount"
          type="number"
          value={formValues.requested_amount}
          onChange={onInputChange}
          placeholder="Enter requested amount"
          icon={BanknotesIcon}
          required
        />

        <FormField
          label="Loan Term (months)"
          name="desired_loan_term"
          type="number"
          value={formValues.desired_loan_term.toString()}
          onChange={onInputChange}
          placeholder="Enter loan term in months"
          icon={ClockIcon}
          min="1"
          max="60"
          required
        />

        <SelectField
          label="Product Type"
          name="product_type"
          value={formValues.product_type}
          onChange={onInputChange}
          options={productTypes?.map(type => ({ value: type.value, label: type.label })) || []}
          placeholder="Select product type"
          icon={BuildingOfficeIcon}
          disabled={isLoadingProductTypes}
          required
        />

        <FormField
          label="Disbursement Date"
          name="requested_disbursement_date"
          type="date"
          value={formValues.requested_disbursement_date}
          onChange={onInputChange}
          icon={CalendarIcon}
          required
        />

        <SelectField
          label="Loan Purpose"
          name="loan_purposes"
          value={formValues.loan_purposes[0] || ''}
          onChange={onInputChange}
          options={loanPurposes.map(purpose => ({ value: purpose, label: purpose }))}
          placeholder="Select loan purpose"
          icon={CurrencyDollarIcon}
          required
        />
      </div>

      <TextAreaField
        label="Loan Purpose Details"
        name="purpose_details"
        value={formValues.purpose_details}
        onChange={onInputChange}
        placeholder="Provide additional details about the loan purpose"
        rows={4}
      />
    </div>
  );
};