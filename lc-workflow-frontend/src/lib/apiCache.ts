// API response caching and request deduplication
import { AxiosRequestConfig, AxiosResponse } from 'axios';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum cache entries
  keyGenerator?: (config: AxiosRequestConfig) => string;
}

class ApiCache {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100,
      keyGenerator: (config: AxiosRequestConfig) => {
        const { url, method, params, data } = config;
        return `${method?.toUpperCase()}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
      },
      ...config,
    };
  }

  generateKey(config: AxiosRequestConfig): string {
    return this.config.keyGenerator!(config);
  }

  get<T>(config: AxiosRequestConfig): T | null {
    const key = this.generateKey(config);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(config: AxiosRequestConfig, data: T, customTtl?: number): void {
    const key = this.generateKey(config);
    const ttl = customTtl || this.config.ttl;

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    this.cache.set(key, entry);
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Request deduplication to prevent duplicate requests
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async dedupe<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // If request is already pending, return the existing promise
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Create new request
    const requestPromise = requestFn()
      .finally(() => {
        // Remove from pending requests when done
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, requestPromise);
    return requestPromise;
  }

  clear(): void {
    this.pendingRequests.clear();
  }
}

// Debounced API calls
class ApiDebouncer {
  private timeoutIds = new Map<string, NodeJS.Timeout>();
  private promises = new Map<string, Promise<any>>();

  debounce<T>(
    key: string,
    fn: () => Promise<T>,
    delay: number = 300
  ): Promise<T> {
    // Clear existing timeout
    const existingTimeout = this.timeoutIds.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // If there's already a promise for this key, return it
    if (this.promises.has(key)) {
      return this.promises.get(key)!;
    }

    // Create new debounced promise
    const promise = new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.promises.delete(key);
          this.timeoutIds.delete(key);
        }
      }, delay);

      this.timeoutIds.set(key, timeoutId);
    });

    this.promises.set(key, promise);
    return promise;
  }

  cancel(key: string): void {
    const timeoutId = this.timeoutIds.get(key);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeoutIds.delete(key);
      this.promises.delete(key);
    }
  }

  clear(): void {
    for (const timeoutId of this.timeoutIds.values()) {
      clearTimeout(timeoutId);
    }
    this.timeoutIds.clear();
    this.promises.clear();
  }
}

// Enhanced API client with caching, deduplication, and debouncing
export class EnhancedApiClient {
  private cache: ApiCache;
  private deduplicator: RequestDeduplicator;
  private debouncer: ApiDebouncer;

  constructor(cacheConfig?: Partial<CacheConfig>) {
    this.cache = new ApiCache(cacheConfig);
    this.deduplicator = new RequestDeduplicator();
    this.debouncer = new ApiDebouncer();
  }

  async getCached<T>(
    config: AxiosRequestConfig,
    options: {
      useCache?: boolean;
      customTtl?: number;
      debounceMs?: number;
    } = {}
  ): Promise<T> {
    const { useCache = true, customTtl, debounceMs } = options;

    // Check cache first
    if (useCache) {
      const cachedData = this.cache.get<T>(config);
      if (cachedData !== null) {
        return cachedData;
      }
    }

    // Create request function
    const requestFn = async () => {
      const response = await fetch(`${config.baseURL || ''}${config.url}`, {
        method: 'GET',
        headers: config.headers as Record<string, string>,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data as T;
    };

    // Apply deduplication and/or debouncing
    let finalRequest: Promise<T>;

    if (debounceMs && debounceMs > 0) {
      const debounceKey = this.cache.generateKey(config);
      finalRequest = this.debouncer.debounce(debounceKey, requestFn, debounceMs);
    } else {
      const dedupeKey = this.cache.generateKey(config);
      finalRequest = this.deduplicator.dedupe(dedupeKey, requestFn);
    }

    const data = await finalRequest;

    // Cache the result
    if (useCache) {
      this.cache.set(config, data, customTtl);
    }

    return data;
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
  }

  cleanupCache(): void {
    this.cache.cleanup();
  }

  getCacheSize(): number {
    return this.cache.size();
  }

  // Request management
  cancelDebounced(key: string): void {
    this.debouncer.cancel(key);
  }

  clearPendingRequests(): void {
    this.deduplicator.clear();
    this.debouncer.clear();
  }
}

// Create default instance
export const apiCache = new ApiCache({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 200,
});

export const requestDeduplicator = new RequestDeduplicator();
export const apiDebouncer = new ApiDebouncer();
export const enhancedApiClient = new EnhancedApiClient();

// Utility functions for common cache patterns
export const cacheUtils = {
  // Cache for 1 minute
  short: (config: AxiosRequestConfig) => apiCache.set(config, null, 60 * 1000),

  // Cache for 5 minutes (default)
  medium: (config: AxiosRequestConfig) => apiCache.set(config, null, 5 * 60 * 1000),

  // Cache for 15 minutes
  long: (config: AxiosRequestConfig) => apiCache.set(config, null, 15 * 60 * 1000),

  // Cache for 1 hour
  extended: (config: AxiosRequestConfig) => apiCache.set(config, null, 60 * 60 * 1000),

  // Never cache
  none: () => {},

  // Invalidate specific cache entry
  invalidate: (config: AxiosRequestConfig) => {
    const key = apiCache.generateKey(config);
    // Note: We'd need to expose delete method in ApiCache for this
  },
};