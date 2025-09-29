import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { AuthResponse, LoginCredentials } from '@/types/models';
import { handleApiError } from './handleApiError';
import { logger } from './logger';

const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090/api/v1';

export function getApiOrigin(): string {
  return RAW_API_BASE_URL.replace(/\/$/, ''); // Just remove trailing slash, no URL conversion
}

const API_ORIGIN = getApiOrigin();
const API_BASE_URL = API_ORIGIN;

// Error categories for better error handling
export enum ApiErrorCategory {
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  CLIENT_ERROR = 'client_error',
  UNKNOWN = 'unknown',
}

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
  onRetry?: (attempt: number, error: AxiosError) => void;
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryCondition: (error: AxiosError) => {
    // Retry on network errors, timeouts, and 5xx errors
    if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') return true;
    if (error.response?.status && error.response.status >= 500) return true;
    return false;
  },
};

class ApiClient {
  private client: AxiosInstance;
  private retryConfig: RetryConfig;

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // Increased timeout
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true
    });
    this.setupInterceptors();
  }

  // Utility function to categorize errors
  private categorizeError(error: AxiosError): ApiErrorCategory {
    // Enhanced network error detection and logging
    if (!error.response) {
      if (error.code === 'TIMEOUT') {
        logger.warn('Request timeout detected', {
          category: 'network_diagnostic',
          errorCode: error.code,
          message: error.message,
          config: {
            timeout: error.config?.timeout,
            url: error.config?.url,
            method: error.config?.method,
          }
        });
        return ApiErrorCategory.TIMEOUT;
      }

      // Detailed network error logging
      logger.error('Network error detected - no response received', error, {
        category: 'network_diagnostic',
        errorCode: error.code,
        message: error.message,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
        },
        // Additional network diagnostics
        networkInfo: {
          isOnline: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
          timestamp: new Date().toISOString(),
        }
      });
      return ApiErrorCategory.NETWORK;
    }

    const status = error.response.status;
    switch (status) {
      case 401:
        return ApiErrorCategory.AUTHENTICATION;
      case 403:
        return ApiErrorCategory.AUTHORIZATION;
      case 404:
        return ApiErrorCategory.NOT_FOUND;
      case 422:
        return ApiErrorCategory.VALIDATION;
      case 429:
        return ApiErrorCategory.RATE_LIMIT;
      default:
        if (status >= 400 && status < 500) return ApiErrorCategory.CLIENT_ERROR;
        if (status >= 500) return ApiErrorCategory.SERVER_ERROR;
        return ApiErrorCategory.UNKNOWN;
    }
  }

  // Get user-friendly error message based on error category
  private getErrorMessage(error: AxiosError, category: ApiErrorCategory): string {
    const status = error.response?.status;

    switch (category) {
      case ApiErrorCategory.NETWORK:
        return 'Network connection problem. Please check your internet connection and try again.';
      case ApiErrorCategory.TIMEOUT:
        return 'Request timed out. The server is taking too long to respond. Please try again.';
      case ApiErrorCategory.AUTHENTICATION:
        return 'Your session has expired. Please log in again.';
      case ApiErrorCategory.AUTHORIZATION:
        return 'You don\'t have permission to access this resource.';
      case ApiErrorCategory.NOT_FOUND:
        return 'The requested resource was not found.';
      case ApiErrorCategory.VALIDATION:
        return 'Please check your input and try again.';
      case ApiErrorCategory.RATE_LIMIT:
        return 'Too many requests. Please wait a moment and try again.';
      case ApiErrorCategory.SERVER_ERROR:
        return 'Server error occurred. Our team has been notified. Please try again later.';
      case ApiErrorCategory.CLIENT_ERROR:
        return 'There was a problem with your request. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  // Utility function to implement retry with exponential backoff
  private async retryRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    url: string,
    method: string
  ): Promise<AxiosResponse<T>> {
    let lastError: AxiosError;

    // Log initial request attempt
    logger.debug(`Starting API request`, {
      url,
      method,
      baseURL: API_BASE_URL,
      category: 'api_request_start',
    });

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await requestFn();

        // Log successful retry
        if (attempt > 0) {
          logger.info(`API request succeeded after ${attempt} retries`, {
            url,
            method,
            attempt,
            category: 'api_retry_success',
          });
        }

        return response;
      } catch (error) {
        lastError = error as AxiosError;

        const shouldRetry = this.retryConfig.retryCondition?.(lastError) ?? false;

        if (attempt < this.retryConfig.maxRetries && shouldRetry) {
          const delay = this.retryConfig.retryDelay * Math.pow(2, attempt); // Exponential backoff

          logger.warn(`API request failed, retrying in ${delay}ms`, {
            url,
            method,
            attempt: attempt + 1,
            maxRetries: this.retryConfig.maxRetries,
            error: lastError.message,
            errorCode: lastError.code,
            category: 'api_retry_attempt',
            networkInfo: {
              isOnline: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
            }
          });

          this.retryConfig.onRetry?.(attempt + 1, lastError);

          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Final attempt failed, log and throw
        logger.error(`API request failed after ${attempt} attempts`, lastError, {
          url,
          method,
          attempt,
          maxRetries: this.retryConfig.maxRetries,
          category: 'api_retry_exhausted',
          finalError: {
            code: lastError.code,
            message: lastError.message,
            isNetworkError: !lastError.response,
          },
          networkInfo: {
            isOnline: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
            timestamp: new Date().toISOString(),
          }
        });

        throw lastError;
      }
    }

    throw lastError!;
  }

  private setupInterceptors() {
    // Request interceptor with logging
    this.client.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (token) config.headers.Authorization = `Bearer ${token}`;

      // Log API request
      logger.logApiRequest(config.method?.toUpperCase() || 'GET', config.url || '', {
        category: 'api_request',
        headers: config.headers,
      });

      return config;
    });

    // Response interceptor with enhanced error handling and logging
    this.client.interceptors.response.use(
      (response) => {
        // Log successful API response
        logger.logApiResponse(
          response.config.method?.toUpperCase() || 'GET',
          response.config.url || '',
          response.status,
          response.headers['x-response-time'] ? parseInt(response.headers['x-response-time']) : undefined,
          {
            category: 'api_response_success',
            contentType: response.headers['content-type'],
          }
        );

        return response;
      },
      async (error) => {
        const url = error.config?.url as string | undefined;
        const method = error.config?.method?.toUpperCase() || 'GET';
        const status = error.response?.status;
        const errorCategory = this.categorizeError(error);

        // Enhanced error logging with categorization
        logger.error(`API Error: ${method} ${url}`, error, {
          category: 'api_error',
          errorCategory,
          status,
          method,
          url,
          responseData: error.response?.data,
          requestData: error.config?.data,
        });

        if (status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
          }
          if (url?.endsWith('/auth/me')) return Promise.reject(error);
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            const msg = encodeURIComponent(error.response?.data?.detail || 'Session expired. Please login again.');
            window.location.href = `/login?error=${msg}`;
          }
          return Promise.reject(error);
        }

        if (status === 403) {
          logger.warn('API Authorization Error', {
            category: 'api_auth_error',
            url,
            detail: error.response?.data?.detail || 'Access denied',
          });
        }

        if (status === 404) {
          logger.warn('API Not Found Error', {
            category: 'api_not_found',
            url,
            detail: error.response?.data?.detail || 'Resource not found',
          });
        }

        if (status === 429) {
          logger.warn('API Rate Limit Error', {
            category: 'api_rate_limit',
            url,
            retryAfter: error.response?.headers['retry-after'],
          });
        }

        if (status && status >= 500) {
          logger.error('API Server Error', error, {
            category: 'api_server_error',
            url,
            status,
            detail: error.response?.data?.detail || 'Internal server error',
          });
        }

        // Enhanced error handling with categorization
        const errorMessage = this.getErrorMessage(error, errorCategory);

        // Only handle API errors for non-auth endpoints
        if (!url?.endsWith('/auth/me')) {
          handleApiError(error, errorMessage);
        }

        return Promise.reject(error);
      }
    );
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const form = new URLSearchParams();
    form.append('username', credentials.username);
    form.append('password', credentials.password);
    const { data } = await this.client.post<AuthResponse>('/auth/login', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  }

  async logout(): Promise<void> {
    try { await this.client.post('/auth/logout'); } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  }

  async getCurrentUser(): Promise<any> {
    const { data } = await this.client.get('/auth/me');
    return data;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.retryRequest(
      () => this.client.get(url, config),
      url,
      'GET'
    );
    return response.data;
  }

  async post<T>(url: string, body?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.retryRequest(
      () => this.client.post(url, body, config),
      url,
      'POST'
    );
    return response.data;
  }

  async put<T>(url: string, body?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, body, config);
    return response.data;
  }

  async patch<T>(url: string, body?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, body, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data as unknown as T;
  }

  async uploadFile(url: string, file: globalThis.File, onProgress?: (progress: number) => void): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await this.client.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: (e) => { if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total)); } });
    return data;
  }
}

export const apiClient = new ApiClient();
export const axiosInstance = (apiClient as any)['client'];
export const API_ORIGIN_FOR_LINKS = API_ORIGIN;

// Add a simple connectivity test function
export const testApiConnection = async (): Promise<boolean> => {
  try {
    await apiClient.get('/settings/theme');
    return true;
  } catch (error) {
    console.error('API connection test failed:', error);
    return false;
  }
};