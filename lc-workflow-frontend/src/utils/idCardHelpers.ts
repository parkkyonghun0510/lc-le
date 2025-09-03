// Utility functions for ID card type handling

export interface IDCardTypeConfig {
  placeholder: string;
  pattern?: string;
  maxLength?: number;
  example?: string;
}

// Configuration for different ID card types
export const ID_CARD_TYPE_CONFIG: Record<string, IDCardTypeConfig> = {
  'cambodian_identity': {
    placeholder: 'Enter Cambodian ID number (9 digits)',
    pattern: '^[0-9]{9}$',
    maxLength: 9,
    example: '123456789'
  },
  'passport': {
    placeholder: 'Enter passport number',
    pattern: '^[A-Z0-9]{6,12}$',
    maxLength: 12,
    example: 'A1234567'
  },
  'driver-license': {
    placeholder: 'Enter driver license number',
    pattern: '^[A-Z0-9]{8,15}$',
    maxLength: 15,
    example: 'DL12345678'
  },
  'gov-card': {
    placeholder: 'Enter government card number',
    pattern: '^[A-Z0-9]{8,12}$',
    maxLength: 12,
    example: 'GOV123456'
  },
  'monk-card': {
    placeholder: 'Enter monk card number',
    pattern: '^[A-Z0-9]{6,10}$',
    maxLength: 10,
    example: 'MNK12345'
  },
  'family-book': {
    placeholder: 'Enter family book number',
    pattern: '^[A-Z0-9]{8,12}$',
    maxLength: 12,
    example: 'FB12345678'
  },
  'birth-certificate': {
    placeholder: 'Enter birth certificate number',
    pattern: '^[A-Z0-9]{8,15}$',
    maxLength: 15,
    example: 'BC123456789'
  },
  'other': {
    placeholder: 'Enter ID number',
    maxLength: 20,
    example: 'Enter your ID number'
  },
  // Legacy support for old format
  'National ID': {
    placeholder: 'Enter National ID number (9 digits)',
    pattern: '^[0-9]{9}$',
    maxLength: 9,
    example: '123456789'
  },
  'Passport': {
    placeholder: 'Enter passport number',
    pattern: '^[A-Z0-9]{6,12}$',
    maxLength: 12,
    example: 'A1234567'
  },
  'Driving License': {
    placeholder: 'Enter driver license number',
    pattern: '^[A-Z0-9]{8,15}$',
    maxLength: 15,
    example: 'DL12345678'
  }
};

/**
 * Get configuration for a specific ID card type
 * @param idCardType - The ID card type value
 * @returns Configuration object with placeholder, pattern, etc.
 */
export const getIDCardTypeConfig = (idCardType: string): IDCardTypeConfig => {
  return ID_CARD_TYPE_CONFIG[idCardType] || ID_CARD_TYPE_CONFIG['other'];
};

/**
 * Get placeholder text for ID number field based on ID card type
 * @param idCardType - The selected ID card type
 * @returns Placeholder text for the ID number input
 */
export const getIDNumberPlaceholder = (idCardType: string): string => {
  const config = getIDCardTypeConfig(idCardType);
  return config.placeholder;
};

/**
 * Validate ID number format based on ID card type
 * @param idCardType - The ID card type
 * @param idNumber - The ID number to validate
 * @returns True if valid, false otherwise
 */
export const validateIDNumber = (idCardType: string, idNumber: string): boolean => {
  if (!idNumber.trim()) return false;
  
  const config = getIDCardTypeConfig(idCardType);
  
  // Check max length
  if (config.maxLength && idNumber.length > config.maxLength) {
    return false;
  }
  
  // Check pattern if defined
  if (config.pattern) {
    const regex = new RegExp(config.pattern);
    return regex.test(idNumber);
  }
  
  return true;
};

/**
 * Clear ID number when ID card type changes (optional behavior)
 * @param newIdCardType - The new ID card type
 * @param currentIdNumber - Current ID number value
 * @returns Empty string to clear the field, or current value to keep it
 */
export const shouldClearIDNumber = (newIdCardType: string, currentIdNumber: string): string => {
  // For now, we'll keep the current value and let user decide
  // In the future, this could be configurable
  return currentIdNumber;
};