/**
 * Date validation utilities for DD/MM/YYYY format
 */

export interface DateValidationResult {
  isValid: boolean;
  error?: string;
  parsedDate?: Date;
}

// DD/MM/YYYY regex pattern - strict validation
export const DD_MM_YYYY_REGEX = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;

// More flexible pattern for partial input validation
export const PARTIAL_DATE_REGEX = /^(\d{0,2})(\/?)(\d{0,2})(\/?)(\d{0,4})$/;

/**
 * Validates a date string in DD/MM/YYYY format
 * @param dateString - The date string to validate
 * @param options - Validation options
 * @returns DateValidationResult
 */
export const validateDDMMYYYY = (
  dateString: string,
  options: {
    allowFuture?: boolean;
    minAge?: number;
    maxAge?: number;
    required?: boolean;
  } = {}
): DateValidationResult => {
  const {
    allowFuture = false,
    minAge = 18,
    maxAge = 100,
    required = false
  } = options;

  // Handle empty input
  if (!dateString || dateString.trim() === '') {
    if (required) {
      return { isValid: false, error: 'Date is required' };
    }
    return { isValid: true };
  }

  // Check format
  if (!DD_MM_YYYY_REGEX.test(dateString)) {
    return {
      isValid: false,
      error: 'Please enter date in DD/MM/YYYY format'
    };
  }

  // Parse date components
  const [day, month, year] = dateString.split('/').map(Number);
  
  // Create date object (month is 0-indexed in JavaScript)
  const date = new Date(year, month - 1, day);
  
  // Validate that the date is actually valid (handles invalid dates like 31/02/2023)
  if (
    date.getDate() !== day ||
    date.getMonth() !== month - 1 ||
    date.getFullYear() !== year
  ) {
    return {
      isValid: false,
      error: 'Please enter a valid date'
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time for accurate comparison
  
  // Check future date restriction
  if (!allowFuture && date > today) {
    return {
      isValid: false,
      error: 'Date cannot be in the future'
    };
  }

  // Calculate age for age-based validation
  if (minAge > 0 || maxAge > 0) {
    const age = calculateAge(date);
    
    if (minAge > 0 && age < minAge) {
      return {
        isValid: false,
        error: `Must be at least ${minAge} years old`
      };
    }
    
    if (maxAge > 0 && age > maxAge) {
      return {
        isValid: false,
        error: 'Please enter a valid date of birth'
      };
    }
  }

  return {
    isValid: true,
    parsedDate: date
  };
};

/**
 * Calculate age from a date
 * @param birthDate - The birth date
 * @returns Age in years
 */
export const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Format date input with DD/MM/YYYY mask
 * @param input - Raw input string
 * @returns Formatted string
 */
export const formatDateInput = (input: string): string => {
  // Remove all non-numeric characters
  const numbers = input.replace(/\D/g, '');
  
  // Apply DD/MM/YYYY formatting
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 4) {
    return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  } else {
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  }
};

/**
 * Convert DD/MM/YYYY to YYYY-MM-DD (ISO format)
 * @param ddmmyyyy - Date in DD/MM/YYYY format
 * @returns Date in YYYY-MM-DD format or empty string if invalid
 */
export const convertDDMMYYYYToISO = (ddmmyyyy: string): string => {
  if (!ddmmyyyy || !DD_MM_YYYY_REGEX.test(ddmmyyyy)) {
    return '';
  }
  
  const [day, month, year] = ddmmyyyy.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

/**
 * Convert YYYY-MM-DD (ISO format) to DD/MM/YYYY
 * @param isoDate - Date in YYYY-MM-DD format
 * @returns Date in DD/MM/YYYY format or empty string if invalid
 */
export const convertISOToDDMMYYYY = (isoDate: string): string => {
  if (!isoDate) return '';
  
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString();
  
  return `${day}/${month}/${year}`;
};

/**
 * Check if a string is a valid DD/MM/YYYY date format
 * @param dateString - The date string to check
 * @returns boolean
 */
export const isValidDDMMYYYYFormat = (dateString: string): boolean => {
  return DD_MM_YYYY_REGEX.test(dateString);
};

/**
 * Get validation error message for common date validation scenarios
 * @param dateString - The date string
 * @param fieldName - Name of the field for error messages
 * @returns Error message or null if valid
 */
export const getDateValidationError = (
  dateString: string,
  fieldName: string = 'Date'
): string | null => {
  const result = validateDDMMYYYY(dateString, {
    required: true,
    minAge: 18,
    maxAge: 100
  });
  
  return result.isValid ? null : result.error || `Invalid ${fieldName.toLowerCase()}`;
};

/**
 * Date validation constants
 */
export const DATE_VALIDATION_CONSTANTS = {
  MIN_AGE: 18,
  MAX_AGE: 100,
  DATE_FORMAT: 'DD/MM/YYYY',
  PLACEHOLDER: 'DD/MM/YYYY',
  MAX_LENGTH: 10
} as const;

/**
 * Common date validation rules for forms
 */
export const DATE_VALIDATION_RULES = {
  dateOfBirth: {
    required: true,
    minAge: 18,
    maxAge: 100,
    allowFuture: false
  },
  loanStartDate: {
    required: false,
    allowFuture: true
  },
  loanEndDate: {
    required: false,
    allowFuture: true
  }
} as const;