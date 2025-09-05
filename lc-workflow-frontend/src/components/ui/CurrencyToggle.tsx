'use client';

import React from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/Button';
import { DollarSign } from 'lucide-react';

interface CurrencyToggleProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export function CurrencyToggle({ 
  className = '', 
  variant = 'outline',
  size = 'sm'
}: CurrencyToggleProps) {
  const { currency, toggleCurrency } = useCurrency();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleCurrency}
      className={`flex items-center gap-2 ${className}`}
      title={`Switch to ${currency === 'USD' ? 'KHR' : 'USD'}`}
    >
      <DollarSign className="h-4 w-4" />
      <span className="font-medium">
        {currency === 'USD' ? 'USD' : 'KHR ៛'}
      </span>
    </Button>
  );
}

// Compact version for smaller spaces
export function CurrencyToggleCompact({ className = '' }: { className?: string }) {
  const { currency, toggleCurrency } = useCurrency();

  return (
    <button
      onClick={toggleCurrency}
      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 transition-colors ${className}`}
      title={`Switch to ${currency === 'USD' ? 'KHR' : 'USD'}`}
    >
      {currency === 'USD' ? 'USD' : 'KHR ៛'}
    </button>
  );
}