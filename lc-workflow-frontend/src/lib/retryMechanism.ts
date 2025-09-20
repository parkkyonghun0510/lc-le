import { toastManager } from './toastManager';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
  onMaxAttemptsReached?: (error: any) => void;
}

export interface RetryState {
  attempt: number;
  isRetrying: boolean;
  lastError?: any;
  nextRetryAt?: Date;
}

export class RetryMechanism {
  private retryStates = new Map<string, RetryState>();
  private retryTimeouts = new Map<string, NodeJS.Timeout>();

  private defaultOptions: Required<RetryOptions> = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffFactor: 2,
    retryCondition: (error: any) => {
      // Retry on network errors, timeouts, and 5xx server errors
      const status = error?.response?.status;
      const isNetworkError = !status || error.code === 'NETWORK_ERROR';
      const isServerError = status >= 500;
      const isTimeout = error.code === 'TIMEOUT' || error.message?.includes('timeout');

      return isNetworkError || isServerError || isTimeout;
    },
    onRetry: () => { },
    onMaxAttemptsReached: () => { },
  };

  async executeWithRetry<T>(
    id: string,
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };

    // Initialize retry state
    this.retryStates.set(id, {
      attempt: 0,
      isRetrying: false,
    });

    return this.attemptOperation(id, operation, opts);
  }

  private async attemptOperation<T>(
    id: string,
    operation: () => Promise<T>,
    options: Required<RetryOptions>
  ): Promise<T> {
    const state = this.retryStates.get(id)!;
    state.attempt++;

    try {
      const result = await operation();

      // Success - clean up retry state
      this.cleanup(id);
      return result;

    } catch (error) {
      state.lastError = error;

      // Check if we should retry
      const shouldRetry = state.attempt < options.maxAttempts &&
        options.retryCondition(error);

      if (shouldRetry) {
        // Calculate delay with exponential backoff
        const delay = Math.min(
          options.baseDelay * Math.pow(options.backoffFactor, state.attempt - 1),
          options.maxDelay
        );

        state.isRetrying = true;
        state.nextRetryAt = new Date(Date.now() + delay);

        // Notify about retry
        options.onRetry(state.attempt, error);

        // Schedule retry
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(async () => {
            try {
              const result = await this.attemptOperation(id, operation, options);
              resolve(result);
            } catch (retryError) {
              reject(retryError);
            }
          }, delay);

          this.retryTimeouts.set(id, timeout);
        });

      } else {
        // Max attempts reached or non-retryable error
        options.onMaxAttemptsReached(error);
        this.cleanup(id);
        throw error;
      }
    }
  }

  // Cancel a retry operation
  cancelRetry(id: string): void {
    const timeout = this.retryTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(id);
    }

    this.retryStates.delete(id);
  }

  // Get retry state for an operation
  getRetryState(id: string): RetryState | undefined {
    return this.retryStates.get(id);
  }

  // Check if an operation is currently retrying
  isRetrying(id: string): boolean {
    return this.retryStates.get(id)?.isRetrying || false;
  }

  // Get time until next retry
  getTimeUntilNextRetry(id: string): number {
    const state = this.retryStates.get(id);
    if (!state?.nextRetryAt) return 0;

    return Math.max(0, state.nextRetryAt.getTime() - Date.now());
  }

  private cleanup(id: string): void {
    const timeout = this.retryTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(id);
    }

    this.retryStates.delete(id);
  }

  // Clean up all retry operations
  cleanup(): void {
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
    this.retryStates.clear();
  }
}

// File upload specific retry mechanism
export class FileUploadRetryMechanism extends RetryMechanism {
  async uploadWithRetry(
    fileId: string,
    filename: string,
    uploadFn: () => Promise<any>,
    options: RetryOptions = {}
  ): Promise<any> {
    const uploadOptions: RetryOptions = {
      maxAttempts: 3,
      baseDelay: 2000, // 2 seconds for file uploads
      maxDelay: 60000, // 1 minute max delay
      backoffFactor: 2,
      retryCondition: (error: any) => {
        const status = error?.response?.status;
        const isNetworkError = !status || error.code === 'NETWORK_ERROR';
        const isServerError = status >= 500;
        const isTimeout = error.code === 'TIMEOUT' || error.message?.includes('timeout');
        const isRateLimited = status === 429;

        return isNetworkError || isServerError || isTimeout || isRateLimited;
      },
      onRetry: (attempt: number, error: any) => {
        toastManager.fileUploadRetrying(filename, attempt);
      },
      onMaxAttemptsReached: (error: any) => {
        const errorMessage = this.getErrorMessage(error);
        toastManager.fileUploadFailed(filename, errorMessage);
      },
      ...options,
    };

    return this.executeWithRetry(fileId, uploadFn, uploadOptions);
  }

  private getErrorMessage(error: any): string {
    if (error?.response?.data?.detail) {
      return error.response.data.detail;
    }

    if (error?.response?.status) {
      const status = error.response.status;
      switch (status) {
        case 413:
          return 'File too large';
        case 415:
          return 'File type not supported';
        case 429:
          return 'Too many requests, please try again later';
        case 500:
          return 'Server error';
        case 503:
          return 'Service temporarily unavailable';
        default:
          return `HTTP ${status} error`;
      }
    }

    if (error?.code === 'NETWORK_ERROR') {
      return 'Network connection error';
    }

    if (error?.message?.includes('timeout')) {
      return 'Request timed out';
    }

    return error?.message || 'Unknown error occurred';
  }
}

// Network status aware retry mechanism
export class NetworkAwareRetryMechanism extends FileUploadRetryMechanism {
  private isOnline: boolean;
  private queuedOperations = new Map<string, () => Promise<any>>();

  constructor() {
    super();

    // Initialize online status safely in constructor
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Listen for network status changes (only in browser)
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    }
  }

  private handleOnline(): void {
    this.isOnline = true;
    toastManager.networkOnline();

    // Process queued operations
    this.processQueuedOperations();
  }

  private handleOffline(): void {
    this.isOnline = false;
    toastManager.networkOffline();
  }

  async uploadWithNetworkRetry(
    fileId: string,
    filename: string,
    uploadFn: () => Promise<any>,
    options: RetryOptions = {}
  ): Promise<any> {
    // If offline, queue the operation
    if (!this.isOnline) {
      return new Promise((resolve, reject) => {
        this.queuedOperations.set(fileId, async () => {
          try {
            const result = await this.uploadWithRetry(fileId, filename, uploadFn, options);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });

        toastManager.fileUploadQueued(filename);
      });
    }

    // If online, proceed with normal retry mechanism
    return this.uploadWithRetry(fileId, filename, uploadFn, options);
  }

  private async processQueuedOperations(): Promise<void> {
    if (this.queuedOperations.size === 0) return;

    const operations = Array.from(this.queuedOperations.entries());
    this.queuedOperations.clear();

    toastManager.info(
      'Processing Queued Uploads',
      `Processing ${operations.length} queued file uploads...`
    );

    for (const [id, operation] of operations) {
      try {
        await operation();
      } catch (error) {
        console.error(`Failed to process queued operation ${id}:`, error);
      }
    }
  }

  // Get queued operations count
  getQueuedCount(): number {
    return this.queuedOperations.size;
  }

  // Clear all queued operations
  clearQueue(): void {
    this.queuedOperations.clear();
  }

  // Check if network is online
  getNetworkStatus(): boolean {
    // Update status if in browser
    if (typeof navigator !== 'undefined') {
      this.isOnline = navigator.onLine;
    }
    return this.isOnline;
  }
}

// Global instances
export const retryMechanism = new RetryMechanism();
export const fileUploadRetry = new FileUploadRetryMechanism();
export const networkAwareRetry = new NetworkAwareRetryMechanism();