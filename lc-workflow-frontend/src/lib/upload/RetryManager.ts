export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryCondition?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

export class RetryManager {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      ...config,
    };
  }

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const mergedConfig = { ...this.config, ...config };
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
      try {
        const result = await fn();
        return {
          success: true,
          result,
          attempts: attempt + 1,
          totalTime: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error as Error;

        // Check if we should retry this error
        if (attempt < mergedConfig.maxRetries) {
          const shouldRetry = mergedConfig.retryCondition
            ? mergedConfig.retryCondition(lastError, attempt)
            : this.defaultRetryCondition(lastError, attempt);

          if (!shouldRetry) {
            break;
          }

          const delay = this.calculateDelay(attempt, mergedConfig);

          // Call retry callback if provided
          mergedConfig.onRetry?.(lastError, attempt, delay);

          // Wait before retrying
          await this.delay(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError || new Error('Retry failed'),
      attempts: mergedConfig.maxRetries + 1,
      totalTime: Date.now() - startTime,
    };
  }

  /**
   * Default retry condition - retry on network errors and 5xx status codes
   */
  private defaultRetryCondition(error: Error, attempt: number): boolean {
    // Don't retry on client errors (4xx) except 408, 429
    if (error.message.includes('400') || error.message.includes('401') ||
        error.message.includes('403') || error.message.includes('404')) {
      return false;
    }

    // Retry on network errors, timeouts, and server errors
    if (error.message.includes('Network Error') ||
        error.message.includes('timeout') ||
        error.message.includes('500') ||
        error.message.includes('502') ||
        error.message.includes('503') ||
        error.message.includes('504') ||
        error.name === 'AbortError') {
      return true;
    }

    // Retry on unknown errors up to max attempts
    return attempt < 2;
  }

  /**
   * Calculate delay for retry attempt using exponential backoff with jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
    delay = Math.min(delay, config.maxDelay);

    if (config.jitter) {
      // Add random jitter (±25% of delay)
      const jitterAmount = delay * 0.25;
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }

    return Math.max(0, Math.floor(delay));
  }

  /**
   * Create a retry-enabled version of a function
   */
  createRetryFunction<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    config?: Partial<RetryConfig>
  ): (...args: TArgs) => Promise<TReturn> {
    return async (...args: TArgs): Promise<TReturn> => {
      const result = await this.executeWithRetry(() => fn(...args), config);

      if (result.success && result.result !== undefined) {
        return result.result;
      } else {
        throw result.error || new Error('Retry function failed');
      }
    };
  }

  /**
   * Execute multiple operations in parallel with retry logic
   */
  async executeParallelWithRetry<T>(
    operations: Array<() => Promise<T>>,
    config?: Partial<RetryConfig> & { maxConcurrent?: number }
  ): Promise<Array<RetryResult<T>>> {
    const mergedConfig = { ...this.config, ...config };
    const maxConcurrent = mergedConfig.maxConcurrent || 3;

    const results: Array<RetryResult<T>> = [];
    const executing = new Set<Promise<void>>();

    for (let i = 0; i < operations.length; i += maxConcurrent) {
      const batch = operations.slice(i, i + maxConcurrent);

      const batchPromises = batch.map(async (operation, index) => {
        const result = await this.executeWithRetry(operation, mergedConfig);
        results[i + index] = result;
      });

      await Promise.all(batchPromises);
    }

    return results;
  }

  /**
   * Circuit breaker pattern - temporarily stop retrying if too many failures
   */
  private failureCount = 0;
  private lastFailureTime = 0;
  private circuitBreakerThreshold = 5;
  private circuitBreakerTimeout = 60000; // 1 minute

  isCircuitBreakerOpen(): boolean {
    const now = Date.now();
    if (this.failureCount >= this.circuitBreakerThreshold) {
      if (now - this.lastFailureTime > this.circuitBreakerTimeout) {
        // Reset circuit breaker after timeout
        this.failureCount = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
  }

  recordSuccess(): void {
    this.failureCount = 0;
  }

  /**
   * Get current retry statistics
   */
  getStats() {
    return {
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      circuitBreakerOpen: this.isCircuitBreakerOpen(),
      circuitBreakerThreshold: this.circuitBreakerThreshold,
      circuitBreakerTimeout: this.circuitBreakerTimeout,
    };
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Predefined retry configurations for common scenarios
export const RetryConfigs = {
  // Fast retry for user interactions
  fast: {
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 2,
    jitter: true,
  },

  // Standard retry for file uploads
  standard: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
  },

  // Slow retry for large operations
  slow: {
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
  },

  // Aggressive retry for critical operations
  aggressive: {
    maxRetries: 7,
    baseDelay: 500,
    maxDelay: 60000,
    backoffMultiplier: 1.5,
    jitter: true,
  },

  // Network-specific retry configuration
  network: {
    maxRetries: 4,
    baseDelay: 1000,
    maxDelay: 8000,
    backoffMultiplier: 2,
    jitter: true,
    retryCondition: (error: Error) => {
      return error.message.includes('Network Error') ||
             error.message.includes('timeout') ||
             error.message.includes('ECONNRESET') ||
             error.message.includes('ENOTFOUND') ||
             error.message.includes('502') ||
             error.message.includes('503') ||
             error.message.includes('504');
    },
  },
} as const;