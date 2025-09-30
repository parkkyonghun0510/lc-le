'use client';

import React from 'react';
import { FormOption } from '../types';

interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: FormOption[];
  placeholder?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  icon: Icon,
  required = false,
  error,
  disabled = false,
  className = '',
}) => {
  const baseSelectClasses = `
    w-full pr-8 sm:pr-10 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent 
    transition-all duration-200 appearance-none bg-white dark:bg-gray-700 dark:text-white text-sm sm:text-base
    hover:border-gray-400 dark:hover:border-gray-500
    ${Icon ? 'pl-9 sm:pl-10' : 'pl-3 sm:pl-4'}
    ${error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}
    ${disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''}
    ${className}
  `;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500" />
        )}
        <select
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={baseSelectClasses}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${name}-error` : undefined}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3 pointer-events-none">
          <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};