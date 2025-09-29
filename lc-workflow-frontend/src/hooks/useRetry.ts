import { useState, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import { useNetworkStatus } from './useNetworkStatus';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
  onMaxAttemptsReached?: (error: any) => void;
}

export interface RetryState {
  isRetrying: boolean;
  attempts: number;
  lastError: any;
  canRetry: boolean;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error: any) => {
    // Retry on network errors, timeouts, and 5xx errors
    if (!error.response) return true;
    const status = error.response.status;
    return status >= 500 || status === 429 || status === 408;
  },
};

// Network-aware retry configuration
const getNetworkAwareConfig = (networkStatus: any): Partial<RetryConfig> => {
  const isOffline = !networkStatus.isOnline;
  const isSlowConnection = networkStatus.isSlowConnection;

  if (isOffline) {
    return {
      maxAttempts: 1, // Don't retry if offline
      baseDelay: 0,
      retryCondition: () => false,
    };
  }

  if (isSlowConnection) {
    return {
      maxAttempts: 2, // Fewer retries for slow connections
      baseDelay: 2000, // Longer delay for slow connections
      maxDelay: 8000,
    };
  }

  return {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  };
};

export const useRetry = (config: Partial<RetryConfig> = {}) => {
  const networkStatus = useNetworkStatus();
  const networkAwareConfig = getNetworkAwareConfig(networkStatus);
  const finalConfig = { ...DEFAULT_CONFIG, ...networkAwareConfig, ...config };
  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    attempts: 0,
    lastError: null,
    canRetry: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const calculateDelay = useCallback((attempt: number): number => {
    const delay = finalConfig.baseDelay * Math.pow(finalConfig.backoffFactor, attempt - 1);
    return Math.min(delay, finalConfig.maxDelay);
  }, [finalConfig]);

  const sleep = useCallback((ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }, []);

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> => {
    let lastError: any;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        setState(prev => ({
          ...prev,
          isRetrying: attempt > 1,
          attempts: attempt,
          lastError: null,
          canRetry: attempt < finalConfig.maxAttempts,
        }));

        // Create new abort controller for each attempt
        abortControllerRef.current = new AbortController();

        const result = await operation();

        // Success - log and return
        if (attempt > 1) {
          logger.info('Operation succeeded after retry', {
            category: 'retry_success',
            context: context || 'unknown',
            attempt,
            maxAttempts: finalConfig.maxAttempts,
          });
        }

        setState(prev => ({
          ...prev,
          isRetrying: false,
          attempts: 0,
          lastError: null,
          canRetry: false,
        }));

        return result;
      } catch (error) {
        lastError = error;

        const shouldRetry = finalConfig.retryCondition!(error);

        logger.warn('Operation failed, evaluating retry', {
          category: 'retry_attempt',
          context: context || 'unknown',
          attempt,
          maxAttempts: finalConfig.maxAttempts,
          shouldRetry,
          error: error instanceof Error ? error.message : String(error),
          networkStatus: {
            isOnline: networkStatus.isOnline,
            connectionQuality: networkStatus.connectionQuality,
            effectiveType: networkStatus.effectiveType,
          },
        });

        // If this is the last attempt or we shouldn't retry, throw the error
        if (attempt === finalConfig.maxAttempts || !shouldRetry) {
          setState(prev => ({
            ...prev,
            isRetrying: false,
            lastError: error,
            canRetry: false,
          }));

          finalConfig.onMaxAttemptsReached?.(error);

          logger.error('Operation failed after all retry attempts', error instanceof Error ? error : new Error(String(error)), {
            category: 'retry_exhausted',
            context: context || 'unknown',
            attempt,
            maxAttempts: finalConfig.maxAttempts,
          });

          throw error;
        }

        // Wait before retrying
        const delay = calculateDelay(attempt);
        finalConfig.onRetry?.(attempt, error);

        logger.info('Waiting before retry attempt', {
          category: 'retry_delay',
          context: context || 'unknown',
          attempt,
          delay,
        });

        await sleep(delay);
      }
    }

    throw lastError;
  }, [finalConfig, calculateDelay, sleep]);

  const retry = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> => {
    return executeWithRetry(operation, context);
  }, [executeWithRetry]);

  const reset = useCallback(() => {
    setState({
      isRetrying: false,
      attempts: 0,
      lastError: null,
      canRetry: false,
    });
    abortControllerRef.current = null;
  }, []);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    ...state,
    retry,
    reset,
    abort,
    config: finalConfig,
  };
};

// Specialized hook for API operations
export const useApiRetry = (config?: Partial<RetryConfig>) => {
  return useRetry({
    maxAttempts: 3,
    baseDelay: 1000,
    retryCondition: (error: any) => {
      // Don't retry auth errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        return false;
      }
      // Retry network errors, timeouts, and server errors
      if (!error.response) return true;
      const status = error.response.status;
      return status >= 500 || status === 429 || status === 408;
    },
    ...config,
  });
};

// Hook for optimistic updates with rollback
export const useOptimisticRetry = <T>(
  operation: () => Promise<T>,
  rollback?: () => void,
  config?: Partial<RetryConfig>
) => {
  const retry = useRetry(config);
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async (context?: string) => {
    setIsLoading(true);
    try {
      const result = await retry.retry(operation, context);
      setData(result);
      return result;
    } catch (error) {
      // Rollback on failure
      if (rollback) {
        logger.info('Rolling back optimistic update', {
          category: 'optimistic_rollback',
          context: context || 'unknown',
        });
        rollback();
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [retry, operation, rollback]);

  return {
    data,
    isLoading: isLoading || retry.isRetrying,
    error: retry.lastError,
    execute,
    reset: retry.reset,
    attempts: retry.attempts,
    canRetry: retry.canRetry,
  };
};

export default useRetry;