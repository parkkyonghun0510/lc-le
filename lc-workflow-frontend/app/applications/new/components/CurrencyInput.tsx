import React, { useState, useRef, useEffect } from 'react';
import { BanknotesIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '@/lib/utils';

interface CurrencyInputProps {
  label: string;
  name: string;
  value: string; // raw numeric string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  currency?: string;
  locale?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  required,
  icon: Icon = BanknotesIcon,
  currency = 'KHR',
  locale = 'km-KH',
  min = 0,
  max,
  step = 0.01,
  disabled = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatCurrencyValue = (val: string): string => {
    if (!val || val === '') return '';
    const num = parseFloat(val);
    if (isNaN(num)) return '';
    return formatCurrency(num, currency, locale);
  };

  const parseCurrencyValue = (val: string): string => {
    // Remove all non-numeric characters except decimal point and minus
    const cleaned = val.replace(/[^0-9.-]/g, '');
    
    // Handle multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    
    return cleaned;
  };

  const displayValue = isEditing ? (value || '') : formatCurrencyValue(value || '');
  
  const baseInputClasses = `
    w-full pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent 
    transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500
    dark:bg-gray-700 dark:text-white
    ${Icon ? 'pl-10' : 'pl-4'}
    ${error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
  `;

  const validateCurrencyValue = (val: string): string | null => {
    if (!val || val.trim() === '') {
      return required ? `${label || 'Amount'} is required` : null;
    }
    
    const num = parseFloat(val);
    if (isNaN(num)) {
      return 'Please enter a valid number';
    }
    
    if (min != null) {
      const minValue = Number(min);
      if (!isNaN(minValue) && num < minValue) {
        return `Amount must be at least ${formatCurrency(minValue, currency, locale)}`;
      }
    }
    
    if (max != null) {
      const maxValue = Number(max);
      if (!isNaN(maxValue) && num > maxValue) {
        return `Amount must be no more than ${formatCurrency(maxValue, currency, locale)}`;
      }
    }
    
    const parts = val.split('.');
    if (parts.length > 1 && parts[1] && parts[1].length > 2) {
      return 'Amount cannot have more than 2 decimal places';
    }
    
    if (num <= 0) {
      return 'Amount must be greater than zero';
    }
    
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const parsedValue = parseCurrencyValue(rawValue);
    
    // Preserve cursor position for better UX
    if (inputRef.current) {
      const cursorPos = inputRef.current.selectionStart ?? 0;
      const beforeCursor = rawValue.substring(0, cursorPos);
      const cleanedBeforeCursor = parseCurrencyValue(beforeCursor);
      setCursorPosition(cleanedBeforeCursor.length);
    }
    
    const event = {
      ...e,
      target: {
        ...e.target,
        name: name,
        value: parsedValue,
      },
    };
    onChange(event as React.ChangeEvent<HTMLInputElement>);
    
    // Clear error on change
    if (error) setError(null);
  };

  const handleFocus = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const validationError = validateCurrencyValue(value);
    setError(validationError);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow common keyboard shortcuts
    if (e.ctrlKey || e.metaKey) return;
    
    // Allow: backspace, delete, tab, escape, enter, decimal point, minus
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', '.', '-'];
    
    // Allow number keys and numpad keys
    const isNumber = /^[0-9]$/.test(e.key) || /^[0-9]$/.test(e.code.replace('Digit', '').replace('Numpad', ''));
    
    if (!isNumber && !allowedKeys.includes(e.key)) {
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (cursorPosition !== null && inputRef.current && isEditing) {
      inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
      setCursorPosition(null);
    }
  }, [cursorPosition, isEditing]);

  useEffect(() => {
    // Validate on mount if there's a value
    if (value && value !== '') {
      const validationError = validateCurrencyValue(value);
      setError(validationError);
    }
  }, []); // Empty dependency array to run only on mount

  const currencySymbol = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).formatToParts(0).find(part => part.type === 'currency')?.value || currency;

  return (
    <div className="space-y-2">
      <label 
        htmlFor={name} 
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      
      <div className="relative">
        {Icon && (
          <Icon 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 pointer-events-none" 
            aria-hidden="true"
          />
        )}
        
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          name={name}
          id={name}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={baseInputClasses}
          placeholder={placeholder || `${currencySymbol} 0.00`}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          aria-label={ariaLabel || label}
          aria-describedby={error ? `${name}-error` : ariaDescribedBy}
          aria-invalid={error ? 'true' : 'false'}
          aria-required={required ? 'true' : 'false'}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
        
        <div 
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400 pointer-events-none"
          aria-hidden="true"
        >
          {currency}
        </div>
      </div>
      
      {error && (
        <p 
          id={`${name}-error`} 
          className="text-sm text-red-600 dark:text-red-400"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
      
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {value && value !== '' && !isEditing && 
          `Current value: ${formatCurrencyValue(value)}`
        }
      </div>
    </div>
  );
};