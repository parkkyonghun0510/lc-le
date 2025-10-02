// Form field types based on backend enums and application requirements
export type LoanPurpose = 'commerce' | 'agriculture' | 'education' | 'housing' | 'vehicle' | 'medical' | 'other';
export type ProductType = 'monthly_loan' | 'biweekly_loan' | 'weekly_loan' | 'daily_loan';
export type IDCardType = 'cambodian_identity' | 'passport' | 'driver-license' | 'gov-card' | 'monk-card' | 'family-book' | 'birth-certificate' | 'other';
export type LoanTerm = number;
export type DocumentType = 'borrower_photo' | 'borrower_id' | 'borrower_income_proof' | 'guarantor_photo' | 'guarantor_id' | 'guarantor_income_proof' | 'collateral_photo' | 'collateral_document' | 'land_title' | 'contract' | 'other';

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
  { type: 'borrower_photo', label: 'Borrower Photo' },
  { type: 'borrower_id', label: 'Borrower ID' },
  { type: 'borrower_income_proof', label: 'Borrower Income Proof' },
  { type: 'guarantor_photo', label: 'Guarantor Photo' },
  { type: 'guarantor_id', label: 'Guarantor ID' },
  { type: 'guarantor_income_proof', label: 'Guarantor Income Proof' },
  { type: 'collateral_photo', label: 'Collateral Photo' },
  { type: 'collateral_document', label: 'Collateral Document' },
  { type: 'land_title', label: 'Land Title' },
  { type: 'contract', label: 'Contract' },
  { type: 'other', label: 'Other' },
];