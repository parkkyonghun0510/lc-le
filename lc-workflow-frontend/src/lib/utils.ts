import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(dateString: string): string {
  if (!dateString || dateString.trim() === '') {
    return '';
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return '';
  }
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
export function formatDateDOB(dateString: string): string {
  if (!dateString || dateString.trim() === '') {
    return '';
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return '';
  }
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}


// Currency conversion rates (in a real app, these would come from an API)
const EXCHANGE_RATES = {
  USD_TO_KHR: 4100, // 1 USD = 4100 KHR (approximate)
  KHR_TO_USD: 1 / 4100
};

// Currency conversion functions
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  if (fromCurrency === 'USD' && toCurrency === 'KHR') {
    return amount * EXCHANGE_RATES.USD_TO_KHR;
  }

  if (fromCurrency === 'KHR' && toCurrency === 'USD') {
    return amount * EXCHANGE_RATES.KHR_TO_USD;
  }

  // Default: return original amount if conversion not supported
  return amount;
}
export function formatCurrency(
  amount: number,
  currency = 'KHR',
  locale = 'km-KH',
  options?: {
    convertFrom?: string;
    preferredCurrency?: string;
  }
): string {
  let finalAmount = amount;
  let finalCurrency = currency;

  // Handle currency conversion if needed
  if (options?.convertFrom && options?.preferredCurrency) {
    finalAmount = convertCurrency(amount, options.convertFrom, options.preferredCurrency);
    finalCurrency = options.preferredCurrency;
  }

  if (finalCurrency !== 'KHR') {
    // USD or any other currency → use normal Intl formatting
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: finalCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(finalAmount);
  }

  // KHR branch
  const formatted = new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(finalAmount);

  // remove the trailing ".00" if it's zero
  const clean = formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted;

  return `${clean}៛`;
}

// Helper function to format currency with automatic conversion
export function formatCurrencyWithConversion(
  amount: number,
  originalCurrency: string = 'USD',
  targetCurrency: string = 'KHR',
  locale: string = 'km-KH'
): string {
  return formatCurrency(amount, originalCurrency, locale, {
    convertFrom: originalCurrency,
    preferredCurrency: targetCurrency
  });
}


export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('word')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.startsWith('text/')) return '📄';
  return '📎';
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function validateUUID(uuid: string, context?: string): string {
  if (!isValidUUID(uuid)) {
    throw new Error(`Invalid UUID format${context ? ` for ${context}` : ''}`);
  }
  return uuid;
}

export function sanitizeUUID(uuid: string): string {
  return uuid.replace(/[^a-f0-9-]/gi, '');
}

export function validateAmount(amount: string): string | null {
  const numericValue = parseFloat(amount);
  if (isNaN(numericValue)) {
    return 'Please enter a valid number.';
  }
  if (numericValue <= 0) {
    return 'Amount must be greater than zero.';
  }
  return null;
}

export function validateCurrencyAmount(
  amount: string, 
  options?: {
    min?: number;
    max?: number;
    allowZero?: boolean;
    currency?: string;
    locale?: string;
  }
): string | null {
  const { min = 0, max = Infinity, allowZero = false, currency = 'USD', locale = 'en-US' } = options || {};
  
  if (!amount || amount.trim() === '') {
    return 'Amount is required.';
  }
  
  const numericValue = parseFloat(amount);
  
  if (isNaN(numericValue)) {
    return 'Please enter a valid number.';
  }
  
  if (!allowZero && numericValue <= 0) {
    return 'Amount must be greater than zero.';
  }
  
  if (numericValue < 0) {
    return 'Amount cannot be negative.';
  }
  
  if (typeof min === 'number' && numericValue < min) {
    const formattedMin = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(min);
    return `Amount must be at least ${formattedMin}.`;
  }
  
  if (typeof max === 'number' && numericValue > max) {
    const formattedMax = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(max);
    return `Amount must be no more than ${formattedMax}.`;
  }
  
  // Check for excessive decimal places
  const decimalPlaces = amount.includes('.') ? amount.split('.')[1].length : 0;
  if (decimalPlaces > 2) {
    return 'Amount cannot have more than 2 decimal places.';
  }
  
  return null;
}