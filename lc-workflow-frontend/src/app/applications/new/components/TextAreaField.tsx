'use client';

import React from 'react';

interface TextAreaFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const TextAreaField: React.FC<TextAreaFieldProps> = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  rows = 3,
  required = false,
  error,
  disabled = false,
  className = '',
}) => {
  const baseTextAreaClasses = `
    w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent 
    transition-all duration-200 resize-none hover:border-gray-400 dark:hover:border-gray-500
    dark:bg-gray-700 dark:text-white
    ${error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}
    ${disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''}
    ${className}
  `;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        required={required}
        disabled={disabled}
        className={baseTextAreaClasses}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};