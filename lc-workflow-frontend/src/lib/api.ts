import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { AuthResponse, LoginCredentials } from '@/types/models';
import { handleApiError } from './handleApiError';
import { logger } from './logger';

// Enhanced API URL detection with safe fallback strategies
function detectApiBaseUrl(): string {
  // 1. Use environment variable if provided (highest priority)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 2. Auto-detect based on current location (development only)
  if (typeof window !== 'undefined' && window.location) {
    const currentHost = window.location.hostname;
    const currentPort = window.location.port;

    // Only use localhost detection for development
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      if (currentPort && currentPort !== '3000') {
        return `http://localhost:8090/api/v1`;
      }
      // If frontend is on 3000, backend should be on 8090
      if (currentPort === '3000' || !currentPort) {
        return `http://localhost:8090/api/v1`;
      }
    }

    // 3. For production deployments without NEXT_PUBLIC_API_URL set, log warning but don't fallback to internal networking
    if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      console.warn('NEXT_PUBLIC_API_URL not set for production deployment. Please configure this environment variable.');
      console.warn('Current host:', currentHost);
      // Don't attempt internal networking - it can cause timeouts
      // Instead, throw an error to make the configuration issue obvious
      throw new Error('NEXT_PUBLIC_API_URL environment variable is required for production deployments');
    }
  }

  // 4. Final fallback for development/testing
  return 'http://localhost:8090/api/v1';
}

const RAW_API_BASE_URL = detectApiBaseUrl();

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

      // Detailed network error logging with enhanced diagnostics
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
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        },
        // Enhanced debugging info
        debugging: {
          axiosVersion: '1.x',
          nodeEnvironment: typeof process !== 'undefined' ? process.env.NODE_ENV : 'unknown',
          apiBaseUrl: API_BASE_URL,
          requestHeaders: error.config?.headers,
        }
      });

      // Additional logging to help diagnose the issue
      if (typeof window !== 'undefined') {
        logger.info('Browser network diagnostics', {
          category: 'browser_network_info',
          isOnline: navigator.onLine,
          cookieEnabled: navigator.cookieEnabled,
          connection: typeof navigator !== 'undefined' && 'connection' in navigator ? (navigator as any).connection : 'not available',
          localStorage: typeof Storage !== 'undefined' ? 'available' : 'not available',
          sessionStorage: typeof Storage !== 'undefined' ? 'available' : 'not available',
        });
      }

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
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
      const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;

        // Enhanced token debugging for auth requests
        if (config.url?.includes('/auth/me')) {
          logger.info('🔐 [API] Auth request with token details:', {
            category: 'auth_debug',
            token: {
              exists: !!token,
              length: token.length,
              prefix: token.substring(0, 20) + '...',
              isJwtFormat: token.split('.').length === 3,
            },
            refreshToken: {
              exists: !!refreshToken,
              length: refreshToken?.length || 0,
            },
            userData: {
              exists: !!userData,
              isValidJson: (() => {
                try {
                  return userData ? JSON.parse(userData) : null;
                } catch {
                  return false;
                }
              })(),
            },
            timestamp: new Date().toISOString(),
            url: config.url,
            method: config.method,
          });
        }
      } else {
        // Log when no token is present for auth requests
        if (config.url?.includes('/auth/me')) {
          logger.warn('🚨 [API] Auth request without token:', {
            category: 'auth_debug',
            token: {
              exists: false,
              localStorage: {
                hasAccessToken: localStorage.getItem('access_token') !== null,
                hasRefreshToken: localStorage.getItem('refresh_token') !== null,
                hasUser: localStorage.getItem('user') !== null,
              }
            },
            timestamp: new Date().toISOString(),
            url: config.url,
            method: config.method,
          });
        }
      }

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

// Enhanced connectivity test with multiple URL attempts
export const testApiConnection = async (customUrl?: string): Promise<{
  success: boolean;
  url: string;
  error?: string;
  responseTime?: number;
}> => {
  const testUrls = customUrl ? [customUrl] : [
    API_BASE_URL,
    'http://localhost:8090/api/v1',
    'http://127.0.0.1:8090/api/v1',
  ];

  // Test API connectivity

  for (const url of testUrls) {
    const startTime = Date.now();
    try {
      // Use direct fetch for testing to avoid interceptor complexity
      const response = await fetch(`${url}/settings/theme`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          url,
          responseTime,
        };
      } else {
        // HTTP error response
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Connection failed
    }
  }

  return {
    success: false,
    url: API_BASE_URL,
    error: 'All connection attempts failed',
  };
};

// Add a comprehensive network diagnostic function
export const diagnoseNetworkIssues = async (): Promise<{
  apiConnection: boolean;
  networkDiagnostics: {
    isOnline?: boolean;
    cookieEnabled?: boolean;
    connection?: any;
    userAgent?: string;
    language?: string;
    platform?: string;
  };
  browserInfo: {
    localStorage?: string;
    sessionStorage?: string;
    indexedDB?: string;
    serviceWorker?: string;
  };
  suggestions: string[];
}> => {

  const results = {
    apiConnection: false,
    networkDiagnostics: {} as any,
    browserInfo: {} as any,
    suggestions: [] as string[],
  };

  try {
    // Test API connection
    const apiTestResult = await testApiConnection();
    results.apiConnection = apiTestResult.success;

    // Get network diagnostics
    if (typeof navigator !== 'undefined') {
      results.networkDiagnostics = {
        isOnline: navigator.onLine,
        cookieEnabled: navigator.cookieEnabled,
        connection: 'connection' in navigator ? (navigator as any).connection : 'not available',
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
      };

      results.browserInfo = {
        localStorage: typeof Storage !== 'undefined' ? 'available' : 'not available',
        sessionStorage: typeof Storage !== 'undefined' ? 'available' : 'not available',
        indexedDB: typeof indexedDB !== 'undefined' ? 'available' : 'not available',
        serviceWorker: 'serviceWorker' in navigator ? 'available' : 'not available',
      };
    }

    // Generate suggestions based on results
    if (!results.apiConnection) {
      results.suggestions.push('API connection failed - check if backend server is running');
      results.suggestions.push('Verify NEXT_PUBLIC_API_URL environment variable');
      results.suggestions.push('Check browser network tab for failed requests');
    }

    if (!results.networkDiagnostics.isOnline) {
      results.suggestions.push('Browser reports offline status - check internet connection');
    }

    if (!results.browserInfo.localStorage) {
      results.suggestions.push('LocalStorage not available - check browser settings');
    }


    // Also log to external logging service if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'network_diagnosis', {
        event_category: 'debug',
        api_connection: results.apiConnection,
        is_online: results.networkDiagnostics.isOnline,
        suggestions_count: results.suggestions.length,
      });
    }

    return results;

  } catch (error) {
    results.suggestions.push('Network diagnosis encountered an error');
    return results;
  }
};

// Quick connectivity check for login issues
export const checkLoginConnectivity = async (): Promise<{
  canConnect: boolean;
  issues: string[];
  suggestions: string[];
}> => {

  const issues: string[] = [];
  const suggestions: string[] = [];

  try {
    // Test basic API connectivity
    const apiResult = await testApiConnection();

    if (!apiResult.success) {
      issues.push('Cannot connect to backend API');
      suggestions.push('Check if the backend server is running on port 8090');
      suggestions.push('Verify NEXT_PUBLIC_API_URL environment variable');
      suggestions.push('Try running: curl http://localhost:8090/health');
    }

    // Test authentication endpoint specifically
    if (apiResult.success) {
      try {
        await apiClient.get('/auth/me');
      } catch (authError: any) {
        if (authError.response?.status === 401) {
          // This is expected if not logged in, not really an issue
        } else {
          issues.push('Authentication service not responding properly');
          suggestions.push('Check authentication configuration in backend');
        }
      }
    }

    return {
      canConnect: issues.length === 0,
      issues,
      suggestions,
    };

  } catch (error) {
    return {
      canConnect: false,
      issues: ['Connectivity check failed'],
      suggestions: ['Check browser console for detailed error messages'],
    };
  }
};

// Simple login connectivity helper
export const getLoginTroubleshootingInfo = (): {
  currentApiUrl: string;
  suggestedActions: string[];
  environmentInfo: Record<string, any>;
} => {
  const currentApiUrl = API_BASE_URL;

  const suggestedActions = [
    'Check if backend is running: curl http://localhost:8090/health',
    'Verify API URL configuration in .env file',
    'Try using the Network Debugger component',
    'Check browser Network tab for failed requests',
  ];

  // Add environment-specific suggestions
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('railway.app')) {
      suggestedActions.unshift('For Railway deployment, use internal networking: https://your-app-backend.railway.internal/api/v1/');
    }
  }

  const environmentInfo = {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
    protocol: typeof window !== 'undefined' ? window.location.protocol : 'unknown',
    port: typeof window !== 'undefined' ? window.location.port : 'unknown',
  };

  return {
    currentApiUrl,
    suggestedActions,
    environmentInfo,
  };
};

// Comprehensive token debugging utility
export const debugTokenState = (): {
  tokenState: {
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    hasUserData: boolean;
    accessTokenLength: number;
    refreshTokenLength: number;
    accessTokenPrefix: string;
    refreshTokenPrefix: string;
    isAccessTokenJwtFormat: boolean;
    isRefreshTokenJwtFormat: boolean;
    userDataValid: boolean;
    userData: any;
  };
  localStorage: {
    allKeys: string[];
    authKeys: string[];
    authValues: Record<string, string>;
  };
  suggestions: string[];
  timestamp: string;
} => {

  const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
  const userDataString = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

  let userData = null;
  let userDataValid = false;

  try {
    userData = userDataString ? JSON.parse(userDataString) : null;
    userDataValid = true;
  } catch (e) {
    // Invalid user data JSON
  }

  const allKeys = typeof window !== 'undefined' ? Object.keys(localStorage) : [];
  const authKeys = allKeys.filter(key => key.includes('token') || key.includes('user'));
  const authValues: Record<string, string> = {};

  authKeys.forEach(key => {
    const value = localStorage.getItem(key);
    authValues[key] = value ? `${value.substring(0, 20)}...` : 'null';
  });

  const suggestions: string[] = [];

  if (!accessToken) {
    suggestions.push('No access token found - user needs to log in');
  } else if (accessToken.split('.').length !== 3) {
    suggestions.push('Access token is not in valid JWT format (should have 3 parts separated by dots)');
  }

  if (!refreshToken) {
    suggestions.push('No refresh token found - may cause issues when access token expires');
  } else if (refreshToken.split('.').length !== 3) {
    suggestions.push('Refresh token is not in valid JWT format');
  }

  if (!userDataValid) {
    suggestions.push('User data is corrupted or missing');
  }

  if (accessToken && accessToken.length < 100) {
    suggestions.push('Access token seems unusually short - may be corrupted');
  }

  const result = {
    tokenState: {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasUserData: !!userDataString,
      accessTokenLength: accessToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0,
      accessTokenPrefix: accessToken?.substring(0, 20) + '...' || 'none',
      refreshTokenPrefix: refreshToken?.substring(0, 20) + '...' || 'none',
      isAccessTokenJwtFormat: accessToken ? accessToken.split('.').length === 3 : false,
      isRefreshTokenJwtFormat: refreshToken ? refreshToken.split('.').length === 3 : false,
      userDataValid,
      userData: userData ? { id: userData.id, username: userData.username, role: userData.role } : null,
    },
    localStorage: {
      allKeys,
      authKeys,
      authValues,
    },
    suggestions,
    timestamp: new Date().toISOString(),
  };


  return result;
};