'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AxiosRequestConfig } from 'axios';
import { enhancedApiClient, apiCache } from '@/lib/apiCache';

interface UseOptimizedQueryOptions {
  enabled?: boolean;
  useCache?: boolean;
  cacheTime?: number;
  debounceMs?: number;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
}

interface UseOptimizedQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isStale: boolean;
}

// Enhanced query hook with caching, debouncing, and performance optimizations
export function useOptimizedQuery<T>(
  config: AxiosRequestConfig,
  options: UseOptimizedQueryOptions = {}
): UseOptimizedQueryResult<T> {
  const {
    enabled = true,
    useCache = true,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    debounceMs = 0,
    refetchOnMount = false,
    refetchOnWindowFocus = false,
    staleTime = 0,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Check if data is stale
  const isStale = Date.now() - lastFetch > staleTime;

  const fetchData = useCallback(async () => {
    if (!enabled || !mountedRef.current) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const result = await enhancedApiClient.getCached<T>(config, {
        useCache,
        customTtl: cacheTime,
        debounceMs,
      });

      if (mountedRef.current) {
        setData(result);
        setLastFetch(Date.now());
      }
    } catch (err) {
      if (mountedRef.current && !abortControllerRef.current?.signal.aborted) {
        setError(err instanceof Error ? err : new Error('An error occurred'));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, config, useCache, cacheTime, debounceMs]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    if (enabled && (refetchOnMount || !data)) {
      fetchData();
    }

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, refetchOnMount]);

  // Window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return;

    const handleFocus = () => {
      if (isStale) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, enabled, isStale, fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
    isStale,
  };
}

// Specialized hooks for common use cases
export function useCachedQuery<T>(
  config: AxiosRequestConfig,
  cacheTime: number = 5 * 60 * 1000
) {
  return useOptimizedQuery<T>(config, {
    useCache: true,
    cacheTime,
    staleTime: cacheTime / 2, // Consider stale at half cache time
  });
}

export function useDebouncedQuery<T>(
  config: AxiosRequestConfig,
  debounceMs: number = 300
) {
  return useOptimizedQuery<T>(config, {
    debounceMs,
    useCache: false, // Usually don't want cache with debouncing
  });
}

export function useRealtimeQuery<T>(
  config: AxiosRequestConfig,
  intervalMs: number = 30000
) {
  const query = useOptimizedQuery<T>(config, {
    useCache: false,
    refetchOnMount: true,
    staleTime: intervalMs,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      query.refetch();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs, query.refetch]);

  return query;
}

// Hook for managing cache invalidation
export function useCacheManager() {
  const invalidateCache = useCallback((config: AxiosRequestConfig) => {
    // This would need to be implemented with access to cache keys
    apiCache.clear();
  }, []);

  const clearAllCache = useCallback(() => {
    apiCache.clear();
  }, []);

  const cleanupCache = useCallback(() => {
    apiCache.cleanup();
  }, []);

  return {
    invalidateCache,
    clearAllCache,
    cleanupCache,
    cacheSize: apiCache.size(),
  };
}