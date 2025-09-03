import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProductTypes, useIDCardTypes } from '../useEnums';
import { apiClient } from '@/lib/api';

// Mock the API client
jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn()
  }
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const TestWrapper = ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  
  TestWrapper.displayName = 'TestWrapper';
  return TestWrapper;
};

describe('useProductTypes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null for null/undefined product type', async () => {
    mockApiClient.get.mockResolvedValue([
      { value: 'loan', label: 'Personal Loan' },
      { value: 'credit', label: 'Credit Card' }
    ]);

    const { result } = renderHook(() => useProductTypes(), {
      wrapper: createWrapper()
    });

    // Wait for the query to resolve
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result.current.getLabel(null)).toBe(null);
    expect(result.current.getLabel(undefined)).toBe(null);
    expect(result.current.getLabel('')).toBe(null);
    expect(result.current.getLabel('   ')).toBe(null);
  });

  it('should return correct label for valid product type', async () => {
    mockApiClient.get.mockResolvedValue([
      { value: 'loan', label: 'Personal Loan' },
      { value: 'credit', label: 'Credit Card' }
    ]);

    const { result } = renderHook(() => useProductTypes(), {
      wrapper: createWrapper()
    });

    // Wait for the query to resolve
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result.current.getLabel('loan')).toBe('Personal Loan');
    expect(result.current.getLabel('credit')).toBe('Credit Card');
  });

  it('should return null for invalid product type', async () => {
    mockApiClient.get.mockResolvedValue([
      { value: 'loan', label: 'Personal Loan' },
      { value: 'credit', label: 'Credit Card' }
    ]);

    const { result } = renderHook(() => useProductTypes(), {
      wrapper: createWrapper()
    });

    // Wait for the query to resolve
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result.current.getLabel('invalid')).toBe(null);
  });

  it('should handle trimmed product type values', async () => {
    mockApiClient.get.mockResolvedValue([
      { value: 'loan', label: '  Personal Loan  ' }
    ]);

    const { result } = renderHook(() => useProductTypes(), {
      wrapper: createWrapper()
    });

    // Wait for the query to resolve
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result.current.getLabel('  loan  ')).toBe('Personal Loan');
  });
});

describe('useIDCardTypes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return correct label and Khmer label for valid ID card type', async () => {
    mockApiClient.get.mockResolvedValue([
      { value: 'national_id', label: 'National ID', label_khmer: 'អត្តសញ្ញាណប័ណ្ណជាតិ' },
      { value: 'passport', label: 'Passport', label_khmer: 'លិខិតឆ្លងដែន' }
    ]);

    const { result } = renderHook(() => useIDCardTypes(), {
      wrapper: createWrapper()
    });

    // Wait for the query to resolve
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result.current.getLabel('national_id')).toBe('National ID');
    expect(result.current.getLabelKhmer('national_id')).toBe('អត្តសញ្ញាណប័ណ្ណជាតិ');
  });

  it('should return null for invalid ID card type', async () => {
    mockApiClient.get.mockResolvedValue([
      { value: 'national_id', label: 'National ID', label_khmer: 'អត្តសញ្ញាណប័ណ្ណជាតិ' }
    ]);

    const { result } = renderHook(() => useIDCardTypes(), {
      wrapper: createWrapper()
    });

    // Wait for the query to resolve
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result.current.getLabel('invalid')).toBe(null);
    expect(result.current.getLabelKhmer('invalid')).toBe(null);
  });
});