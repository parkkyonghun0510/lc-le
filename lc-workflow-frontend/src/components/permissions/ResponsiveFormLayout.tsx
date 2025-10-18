/**
 * ResponsiveFormLayout Component
 * 
 * Mobile-optimized form layouts with:
 * - Single-column layout on mobile
 * - Larger touch targets
 * - Better spacing for mobile
 * - Sticky action buttons
 */

'use client';

import React from 'react';

interface ResponsiveFormLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  stickyActions?: boolean;
  className?: string;
}

export default function ResponsiveFormLayout({
  children,
  title,
  description,
  actions,
  stickyActions = true,
  className = '',
}: ResponsiveFormLayoutProps) {
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      {(title || description) && (
        <div className="px-4 py-4 sm:px-6 border-b border-gray-200 bg-white">
          {title && (
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
      )}

      {/* Form content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-4 sm:space-y-6">
        {children}
      </div>

      {/* Actions */}
      {actions && (
        <div
          className={`px-4 py-4 sm:px-6 border-t border-gray-200 bg-white ${
            stickyActions ? 'sticky bottom-0 z-10 shadow-lg' : ''
          }`}
        >
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            {actions}
          </div>
        </div>
      )}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  required = false,
  error,
  hint,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function FormSection({
  title,
  description,
  children,
  collapsible = false,
  defaultExpanded = true,
}: FormSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
        className={`w-full px-4 py-3 bg-gray-50 text-left ${
          collapsible ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default'
        }`}
        disabled={!collapsible}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
            {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
          </div>
          {collapsible && (
            <svg
              className={`h-5 w-5 text-gray-400 transition-transform ${
                isExpanded ? 'transform rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>
      {isExpanded && <div className="px-4 py-4 space-y-4">{children}</div>}
    </div>
  );
}

interface MobileActionButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export function MobileActionButton({
  children,
  variant = 'primary',
  fullWidth = true,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
}: MobileActionButtonProps) {
  const baseClasses = 'px-4 py-3 sm:py-2 rounded-lg font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-indigo-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${fullWidth ? 'w-full sm:w-auto' : ''}`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function MobileInput({ error, className = '', ...props }: MobileInputProps) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-3 sm:py-2 border rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
        error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500'
      } ${className}`}
    />
  );
}

interface MobileSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function MobileSelect({ error, className = '', children, ...props }: MobileSelectProps) {
  return (
    <select
      {...props}
      className={`w-full px-4 py-3 sm:py-2 border rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
        error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500'
      } ${className}`}
    >
      {children}
    </select>
  );
}

interface MobileTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function MobileTextarea({ error, className = '', ...props }: MobileTextareaProps) {
  return (
    <textarea
      {...props}
      className={`w-full px-4 py-3 sm:py-2 border rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
        error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500'
      } ${className}`}
    />
  );
}

interface MobileCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function MobileCheckbox({ label, className = '', ...props }: MobileCheckboxProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        {...props}
        className={`h-5 w-5 sm:h-4 sm:w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 ${className}`}
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
