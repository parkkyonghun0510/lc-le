'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, variant = 'default', leftIcon, rightIcon, required, ...props }, ref) => {
    const baseClasses = 'input-base';
    
    const variantClasses = {
      default: 'border-border focus:border-primary focus:ring-primary',
      success: 'border-success focus:border-success focus:ring-success',
      warning: 'border-warning focus:border-warning focus:ring-warning',
      error: 'border-error focus:border-error focus:ring-error',
    };
    
    const actualVariant = error ? 'error' : variant;
    const displayMessage = error || helperText;
    
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-foreground">
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              {leftIcon}
            </div>
          )}
          
          <input
            type={type}
            className={cn(
              baseClasses,
              variantClasses[actualVariant],
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            ref={ref}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>
        
        {displayMessage && (
          <p className={cn(
            'text-sm',
            actualVariant === 'error' ? 'text-error' :
            actualVariant === 'success' ? 'text-success' :
            actualVariant === 'warning' ? 'text-warning' :
            'text-secondary'
          )}>
            {displayMessage}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };