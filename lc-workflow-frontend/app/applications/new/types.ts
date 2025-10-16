// Form field types based on backend enums and application requirements
export type LoanPurpose = 'commerce' | 'agriculture' | 'education' | 'housing' | 'vehicle' | 'medical' | 'other';
export type ProductType = 'monthly_loan' | 'biweekly_loan' | 'weekly_loan' | 'daily_loan';
export type IDCardType = 'cambodian_identity' | 'passport' | 'driver-license' | 'gov-card' | 'monk-card' | 'family-book' | 'birth-certificate' | 'other';
export type LoanTerm = number;
export type DocumentType =
  // Borrower documents
  | 'borrower_photo'
  | 'borrower_id_card'
  | 'borrower_family_book'
  | 'borrower_income_proof'
  | 'borrower_bank_statement'
  // Guarantor documents
  | 'guarantor_photo'
  | 'guarantor_id_card'
  | 'guarantor_family_book'
  | 'guarantor_income_proof'
  | 'guarantor_bank_statement'
  // Collateral documents
  | 'land_title'
  | 'property_valuation'
  | 'property_photos'
  | 'vehicle_registration'
  | 'vehicle_photos'
  // Business documents
  | 'business_license'
  | 'business_registration'
  | 'business_financial_statement'
  // Supporting documents
  | 'loan_application_form'
  | 'credit_report'
  | 'reference_letter'
  | 'other_supporting_doc'
  | 'other'
  // Legacy compatibility aliases
  | 'borrower_id'  // alias for borrower_id_card
  | 'guarantor_id'  // alias for guarantor_id_card
  | 'collateral_photo'  // alias for property_photos/vehicle_photos
  | 'collateral_document'  // alias for land_title/vehicle_registration
  | 'contract';  // alias for loan_application_form

// Import employee assignment types
import { EmployeeAssignmentCreate } from '@/types/models';

// Form values interface aligned with backend schema
export interface ApplicationFormValues {
  // Customer Information (aligned with backend)
  full_name_latin: string;
  full_name_khmer: string;
  id_card_type: IDCardType;
  id_number: string;
  phone: string;
  current_address: string;
  date_of_birth: string;
  portfolio_officer_name: string;
  sex: string;
  marital_status: string;

  // Address Information (optional)
  province?: string;
  district?: string;
  commune?: string;
  village?: string;

  // Employment Information (optional)
  occupation?: string;
  employer_name?: string;
  monthly_income?: number;
  income_source?: string;

  // Loan Information
  requested_amount: string;
  desired_loan_term: number;
  product_type: ProductType;
  requested_disbursement_date: string;
  loan_purposes: LoanPurpose[];
  purpose_details: string;
  interest_rate?: number;

  // Guarantor Information
  guarantor_name: string;
  guarantor_phone: string;
  guarantor_id_number?: string;
  guarantor_address?: string;
  guarantor_relationship?: string;

  // Financial Information (optional)
  monthly_expenses?: number;
  assets_value?: number;

  // Employee Assignment System
  employee_assignments?: EmployeeAssignmentCreate[];
}

// Step configuration
export interface Step {
  id: number;
  title: string;
  // description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

// Document type info
export interface DocumentTypeInfo {
  type: DocumentType;
  label: string;
}

// Form field option
export interface FormOption {
  value: string;
  label: string;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Constants
export const LOAN_PURPOSES: LoanPurpose[] = ['commerce', 'agriculture', 'education', 'housing', 'vehicle', 'medical', 'other'];
export const PRODUCT_TYPES: ProductType[] = ['monthly_loan', 'biweekly_loan', 'weekly_loan', 'daily_loan'];
export const ID_CARD_TYPES: IDCardType[] = ['cambodian_identity', 'passport', 'driver-license', 'gov-card', 'monk-card', 'family-book', 'birth-certificate', 'other'];
// Removed LOAN_TERMS constant as loan term is now a manual numeric input

export const DOCUMENT_TYPES: DocumentTypeInfo[] = [
  // Borrower documents
  { type: 'borrower_photo', label: 'Borrower Photo' },
  { type: 'borrower_id_card', label: 'Borrower ID Card' },
  { type: 'borrower_family_book', label: 'Borrower Family Book' },
  { type: 'borrower_income_proof', label: 'Borrower Income Proof' },
  { type: 'borrower_bank_statement', label: 'Borrower Bank Statement' },

  // Guarantor documents
  { type: 'guarantor_photo', label: 'Guarantor Photo' },
  { type: 'guarantor_id_card', label: 'Guarantor ID Card' },
  { type: 'guarantor_family_book', label: 'Guarantor Family Book' },
  { type: 'guarantor_income_proof', label: 'Guarantor Income Proof' },
  { type: 'guarantor_bank_statement', label: 'Guarantor Bank Statement' },

  // Collateral documents
  { type: 'land_title', label: 'Land Title' },
  { type: 'property_valuation', label: 'Property Valuation' },
  { type: 'property_photos', label: 'Property Photos' },
  { type: 'vehicle_registration', label: 'Vehicle Registration' },
  { type: 'vehicle_photos', label: 'Vehicle Photos' },

  // Business documents
  { type: 'business_license', label: 'Business License' },
  { type: 'business_registration', label: 'Business Registration' },
  { type: 'business_financial_statement', label: 'Business Financial Statement' },

  // Supporting documents
  { type: 'loan_application_form', label: 'Loan Application Form' },
  { type: 'credit_report', label: 'Credit Report' },
  { type: 'reference_letter', label: 'Reference Letter' },
  { type: 'other_supporting_doc', label: 'Other Supporting Document' },
  { type: 'other', label: 'Other' },

  // Legacy compatibility aliases (for backward compatibility)
  { type: 'borrower_id', label: 'Borrower ID (Legacy)' },
  { type: 'guarantor_id', label: 'Guarantor ID (Legacy)' },
  { type: 'collateral_photo', label: 'Collateral Photo (Legacy)' },
  { type: 'collateral_document', label: 'Collateral Document (Legacy)' },
  { type: 'contract', label: 'Contract (Legacy)' },
];