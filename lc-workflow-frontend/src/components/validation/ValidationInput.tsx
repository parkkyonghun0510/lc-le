'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ValidationInputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  onValidate?: (value: string, excludeId?: string) => void;
  isValidating?: boolean;
  isAvailable?: boolean;
  validationMessage?: string;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  excludeId?: string;
  className?: string;
  showValidationIcon?: boolean;
  debounceMs?: number;
}

export const ValidationInput: React.FC<ValidationInputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  onValidate,
  isValidating = false,
  isAvailable,
  validationMessage,
  error,
  placeholder,
  required = false,
  disabled = false,
  excludeId,
  className,
  showValidationIcon = true,
  debounceMs = 500,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer for validation
    if (onValidate && newValue.trim()) {
      const timer = setTimeout(() => {
        onValidate(newValue, excludeId);
      }, debounceMs);
      setDebounceTimer(timer);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  const getValidationState = () => {
    if (error) return 'error';
    if (isValidating) return 'validating';
    if (isAvailable === true) return 'success';
    if (isAvailable === false) return 'error';
    return 'default';
  };

  const getValidationIcon = () => {
    if (!showValidationIcon || !localValue.trim()) return null;

    const state = getValidationState();
    const iconClass = 'h-5 w-5';

    switch (state) {
      case 'validating':
        return <Loader2 className={cn(iconClass, 'animate-spin text-blue-500')} />;
      case 'success':
        return <CheckCircleIcon className={cn(iconClass, 'text-green-500')} />;
      case 'error':
        return <XCircleIcon className={cn(iconClass, 'text-red-500')} />;
      default:
        return null;
    }
  };

  const getInputBorderClass = () => {
    const state = getValidationState();
    switch (state) {
      case 'success':
        return 'border-green-300 focus:border-green-500 focus:ring-green-500';
      case 'error':
        return 'border-red-300 focus:border-red-500 focus:ring-red-500';
      case 'validating':
        return 'border-blue-300 focus:border-blue-500 focus:ring-blue-500';
      default:
        return 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';
    }
  };

  const getValidationMessageClass = () => {
    const state = getValidationState();
    switch (state) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'validating':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const displayMessage = error || validationMessage;

  return (
    <div className={cn('space-y-1', className)}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          type={type}
          value={localValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400',
            'focus:outline-none focus:ring-1 sm:text-sm',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            'dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400',
            'dark:disabled:bg-gray-700 dark:disabled:text-gray-400',
            getInputBorderClass(),
            showValidationIcon && localValue.trim() ? 'pr-10' : ''
          )}
        />
        
        {/* Validation Icon */}
        {showValidationIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {getValidationIcon()}
          </div>
        )}
      </div>
      
      {/* Validation Message */}
      {displayMessage && (
        <div className={cn('flex items-start space-x-1 text-sm', getValidationMessageClass())}>
          {getValidationState() === 'error' && (
            <ExclamationTriangleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
          )}
          <span>{displayMessage}</span>
        </div>
      )}
      
      {/* Loading indicator for validation */}
      {isValidating && (
        <div className="flex items-center space-x-2 text-sm text-blue-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking availability...</span>
        </div>
      )}
    </div>
  );
};

export default ValidationInput;