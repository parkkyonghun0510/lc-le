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
  const [localValue, setLocalValue] = useState(value || '');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value || '');
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
        return <Loader2 className={cn(iconClass, 'animate-spin text-primary')} />;
      case 'success':
        return <CheckCircleIcon className={cn(iconClass, 'text-success')} />;
      case 'error':
        return <XCircleIcon className={cn(iconClass, 'text-error')} />;
      default:
        return null;
    }
  };

  const getInputBorderClass = () => {
    const state = getValidationState();
    switch (state) {
      case 'success':
        return 'border-success focus:border-success focus:ring-success';
      case 'error':
        return 'border-error focus:border-error focus:ring-error';
      case 'validating':
        return 'border-primary focus:border-primary focus:ring-primary';
      default:
        return 'border-border focus:border-primary focus:ring-primary';
    }
  };

  const getValidationMessageClass = () => {
    const state = getValidationState();
    switch (state) {
      case 'success':
        return 'text-success';
      case 'error':
        return 'text-error';
      case 'validating':
        return 'text-primary';
      default:
        return 'text-secondary';
    }
  };

  const displayMessage = error || validationMessage;

  return (
    <div className={cn('space-y-1', className)}>
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          type={type}
          value={localValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'input-base',
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
        <div className="flex items-center space-x-2 text-sm text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking availability...</span>
        </div>
      )}
    </div>
  );
};

export default ValidationInput;