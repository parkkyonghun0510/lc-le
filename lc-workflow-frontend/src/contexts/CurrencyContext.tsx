'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';

type Currency = 'USD' | 'KHR';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  toggleCurrency: () => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('KHR');

  // Load currency preference from localStorage on mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem('preferredCurrency') as Currency;
    if (savedCurrency && (savedCurrency === 'USD' || savedCurrency === 'KHR')) {
      setCurrency(savedCurrency);
    }
  }, []);

  // Save currency preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('preferredCurrency', currency);
  }, [currency]);

  const toggleCurrency = () => {
    setCurrency(prev => prev === 'USD' ? 'KHR' : 'USD');
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, toggleCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

// Hook to format currency with automatic conversion based on user preference
export function useFormatCurrency() {
  const { currency } = useCurrency();
  
  return (amount: number, originalCurrency: string = 'KHR') => {
    return formatCurrency(amount, originalCurrency, 'km-KH', {
      convertFrom: originalCurrency,
      preferredCurrency: currency
    });
  };
}