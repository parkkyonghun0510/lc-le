"use client";

/**
 * Permission Retry Hook
 * 
 * Provides retry mechanisms for failed API calls with exponential backoff.
 */

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number) => void;
  onMaxRetriesReached?: () => void;
}

interface RetryState {
  isRetrying: boolean;
  retryCount: number;
  lastError: Error | null;
}

export function usePermissionRetry(options: RetryOptions = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
    onMaxRetriesReached,
  } = options;

  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    retryCount: 0,
    lastError: null,
  });

  const calculateDelay = useCallback((attempt: number): number => {
    const delay = initialDelay * Math.pow(backoffMultiplier, attempt);
    return Math.min(delay, maxDelay);
  }, [initialDelay, backoffMultiplier, maxDelay]);

  const retry = useCallback(async <T>(
    operation: () => Promise<T>,
    customOptions?: Partial<RetryOptions>
  ): Promise<T> => {
    const effectiveMaxRetries = customOptions?.maxRetries ?? maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= effectiveMaxRetries; attempt++) {
      try {
        setState(prev => ({
          ...prev,
          isRetrying: attempt > 0,
          retryCount: attempt,
        }));

        if (attempt > 0) {
          const delay = calculateDelay(attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          if (onRetry) {
            onRetry(attempt);
          }
          
          toast(`Retrying... (Attempt ${attempt}/${effectiveMaxRetries})`);
        }

        const result = await operation();
        
        setState({
          isRetrying: false,
          retryCount: 0,
          lastError: null,
        });

        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === effectiveMaxRetries) {
          setState({
            isRetrying: false,
            retryCount: attempt,
            lastError,
          });

          if (onMaxRetriesReached) {
            onMaxRetriesReached();
          }

          throw error;
        }
      }
    }

    throw lastError;
  }, [maxRetries, calculateDelay, onRetry, onMaxRetriesReached]);

  const reset = useCallback(() => {
    setState({
      isRetrying: false,
      retryCount: 0,
      lastError: null,
    });
  }, []);

  return {
    retry,
    reset,
    ...state,
  };
}

/**
 * Hook for automatic retry with React Query
 */
export function useQueryRetry() {
  return {
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    retryOnMount: false,
  };
}

/**
 * Hook for mutation retry with React Query
 */
export function useMutationRetry() {
  return {
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  };
}

/**
 * Network error detection
 */
export function isNetworkError(error: any): boolean {
  return (
    error?.message?.includes('network') ||
    error?.message?.includes('fetch') ||
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ETIMEDOUT' ||
    !navigator.onLine
  );
}

/**
 * Retryable error detection
 */
export function isRetryableError(error: any): boolean {
  if (isNetworkError(error)) {
    return true;
  }

  // Retry on 5xx server errors
  if (error?.response?.status >= 500 && error?.response?.status < 600) {
    return true;
  }

  // Retry on 429 (rate limit)
  if (error?.response?.status === 429) {
    return true;
  }

  return false;
}
