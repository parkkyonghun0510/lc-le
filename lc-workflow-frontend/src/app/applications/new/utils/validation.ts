import { ApplicationFormValues, ValidationResult } from '../types';

// Phone number validation (basic pattern)
const PHONE_REGEX = /^[+]?[\d\s\-()]+$/;

// ID card number validation (alphanumeric)
const ID_CARD_REGEX = /^[A-Za-z0-9]+$/;

/**
 * Validates customer information step
 */
export const validateCustomerInformation = (
  formValues: Partial<ApplicationFormValues>
): ValidationResult => {
  const errors: string[] = [];

  // Required fields validation
  if (!formValues.full_name_latin?.trim()) {
    errors.push('Customer name is required');
  } else if (formValues.full_name_latin.trim().length < 2) {
    errors.push('Customer name must be at least 2 characters long');
  } else if (formValues.full_name_latin.trim().length > 255) {
    errors.push('Customer name cannot exceed 255 characters');
  }

  if (!formValues.id_card_type) {
    errors.push('ID card type is required');
  }

  if (!formValues.id_number?.trim()) {
    errors.push('ID card number is required');
  } else if (!ID_CARD_REGEX.test(formValues.id_number.trim())) {
    errors.push('ID card number must contain only letters and numbers');
  } else if (formValues.id_number.trim().length > 50) {
    errors.push('ID card number cannot exceed 50 characters');
  }

  if (!formValues.phone?.trim()) {
    errors.push('Phone number is required');
  } else if (!PHONE_REGEX.test(formValues.phone.trim())) {
    errors.push('Please enter a valid phone number');
  } else if (formValues.phone.trim().length > 20) {
    errors.push('Phone number cannot exceed 20 characters');
  }

  // Optional fields validation

  if (formValues.portfolio_officer_name && formValues.portfolio_officer_name.trim().length > 255) {
    errors.push('Portfolio officer name cannot exceed 255 characters');
  }

  if (formValues.date_of_birth) {
    const birthDate = new Date(formValues.date_of_birth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 18) {
      errors.push('Customer must be at least 18 years old');
    }
    if (age > 100) {
      errors.push('Please enter a valid date of birth');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates loan information step
 */
export const validateLoanInformation = (
  formValues: Partial<ApplicationFormValues>
): ValidationResult => {
  const errors: string[] = [];

  // Required fields validation
  if (!formValues.requested_amount?.trim()) {
    errors.push('Requested amount is required');
  } else {
    const amount = parseFloat(formValues.requested_amount);
    if (isNaN(amount) || amount <= 0) {
      errors.push('Requested amount must be a positive number');
    } else if (amount > 10000000) {
      errors.push('Requested amount cannot exceed 10,000,000');
    } else if (amount < 100) {
      errors.push('Requested amount must be at least 100');
    }
  }

  if (!formValues.desired_loan_term) {
    errors.push('Loan term is required');
  } else if (formValues.desired_loan_term <= 0) {
    errors.push('Loan term must be a positive number');
  } else if (formValues.desired_loan_term > 360) {
    errors.push('Loan term cannot exceed 360 months');
  }

  if (!formValues.product_type) {
    errors.push('Product type is required');
  } else if (formValues.product_type.length > 50) {
    errors.push('Product type cannot exceed 50 characters');
  }

  if (!formValues.requested_disbursement_date) {
    errors.push('Disbursement date is required');
  } else {
    const disbursementDate = new Date(formValues.requested_disbursement_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (disbursementDate < today) {
      errors.push('Disbursement date cannot be in the past');
    }
    
    // Check if date is too far in the future (e.g., more than 1 year)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    if (disbursementDate > oneYearFromNow) {
      errors.push('Disbursement date cannot be more than 1 year in the future');
    }
  }

  if (!formValues.loan_purposes || formValues.loan_purposes.length === 0) {
    errors.push('Loan purpose is required');
  }

  if (formValues.purpose_details && formValues.purpose_details.trim().length > 1000) {
    errors.push('Purpose details cannot exceed 1000 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates guarantor information step
 */
export const validateGuarantorInformation = (
  formValues: Partial<ApplicationFormValues>
): ValidationResult => {
  const errors: string[] = [];

  // Guarantor information is optional, but if provided, should be valid
  if (formValues.guarantor_name && formValues.guarantor_name.trim().length < 2) {
    errors.push('Guarantor name must be at least 2 characters long');
  } else if (formValues.guarantor_name && formValues.guarantor_name.trim().length > 255) {
    errors.push('Guarantor name cannot exceed 255 characters');
  }

  if (formValues.guarantor_phone && 
      !PHONE_REGEX.test(formValues.guarantor_phone.trim())) {
    errors.push('Please enter a valid guarantor phone number');
  } else if (formValues.guarantor_phone && formValues.guarantor_phone.trim().length > 20) {
    errors.push('Guarantor phone number cannot exceed 20 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates document attachment step
 */
export const validateDocumentAttachment = (): ValidationResult => {
  // Document attachment is optional
  return {
    isValid: true,
    errors: [],
  };
};

/**
 * Validates a specific step based on step number
 */
export const validateStep = (
  stepNumber: number,
  formValues: Partial<ApplicationFormValues>
): ValidationResult => {
  switch (stepNumber) {
    case 0:
      return validateCustomerInformation(formValues);
    case 1:
      return validateLoanInformation(formValues);
    case 2:
      return validateGuarantorInformation(formValues);
    case 3:
      return validateDocumentAttachment();
    default:
      return { isValid: true, errors: [] };
  }
};

/**
 * Validates the entire form
 */
export const validateEntireForm = (
  formValues: ApplicationFormValues
): ValidationResult => {
  const customerValidation = validateCustomerInformation(formValues);
  const loanValidation = validateLoanInformation(formValues);
  const guarantorValidation = validateGuarantorInformation(formValues);
  const documentValidation = validateDocumentAttachment();

  const allErrors = [
    ...customerValidation.errors,
    ...loanValidation.errors,
    ...guarantorValidation.errors,
    ...documentValidation.errors,
  ];

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
};