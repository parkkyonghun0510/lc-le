import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { AuthResponse, LoginCredentials } from '@/types/models';
import { handleApiError } from './handleApiError';

// Force HTTPS in production environments to prevent mixed content issues
const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function normalizeBaseUrl(raw: string): string {
  try {
    let url = raw.trim();
    
    // Remove trailing slashes
    url = url.replace(/\/$/, '');
    
    // Remove trailing /api or /api/v1 segments if provided in env
    url = url.replace(/\/(api|api\/v1)\/?$/i, '');

    // Force HTTPS in production environments
    const isProduction = process.env.NODE_ENV === 'production';
    const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production';
    
    // Ensure Railway deployments always use HTTPS
    if (isProduction || isRailway || url.includes('railway.app')) {
      // Always use HTTPS in production
      url = url.replace(/^http:\/\//i, 'https://');
    } else if (typeof window !== 'undefined' && window.location.protocol === 'https:' && /^http:\/\//i.test(url)) {
      // Auto-upgrade to HTTPS when page is served via HTTPS
      url = url.replace(/^http:\/\//i, 'https://');
    }

    // Ensure WSS for WebSocket URLs
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('ws://')) {
      url = url.replace(/^ws:\/\//i, 'wss://');
    }

    return url;
  } catch {
    return raw;
  }
}

export function getApiOrigin(): string {
  return normalizeBaseUrl(RAW_API_BASE_URL);
}

const API_ORIGIN = getApiOrigin();
const API_BASE_URL = `${API_ORIGIN}/api/v1`;

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Always log API URL for debugging in all environments
    if (typeof window !== 'undefined') {
      console.log('[api] Environment:', {
        NODE_ENV: process.env.NODE_ENV,
        RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
        RAW_API_BASE_URL: RAW_API_BASE_URL,
        API_BASE_URL: API_BASE_URL,
        windowLocation: window.location.href,
        windowProtocol: window.location.protocol
      });
    }

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh and authentication errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const originalRequestUrl = error.config?.url as string | undefined;
        const status = error.response?.status;

        if (status === 401) {
          // Handle authentication errors
          console.error('Authentication error:', error.response?.data?.detail || 'Unauthorized');
          
          // Don't redirect for /auth/me failures, as this is used for auth checks
          if (originalRequestUrl?.endsWith('/auth/me')) {
            return Promise.reject(error);
          }

          // Clear invalid tokens
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
          }

          // Redirect to login with error message
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            const errorMessage = encodeURIComponent(error.response?.data?.detail || 'Session expired. Please login again.');
            window.location.href = `/login?error=${errorMessage}`;
          }
          return Promise.reject(error);
        }

        if (status === 403) {
          console.error('Forbidden access:', error.response?.data?.detail || 'Access denied');
        }

        // Handle mixed content errors specifically
        if (error.message?.includes('mixed content') || error.message?.includes('blocked')) {
          console.error('Mixed content error detected. Ensure HTTPS is used for all API calls.');
          console.error('Current API URL:', API_BASE_URL);
          console.error('Please check NEXT_PUBLIC_API_URL environment variable');
        }

        // For all other errors, use the global handler
        if (!originalRequestUrl?.endsWith('/auth/me')) {
            handleApiError(error, 'An unexpected error occurred');
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    const response = await this.client.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const { access_token, refresh_token, user } = response.data;

    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));
    }

    return response.data;
  }

  async logout() {
    try {
      await this.client.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async getCurrentUser(): Promise<any> {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // Generic API methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data as unknown as T;
  }

  // File upload helper
  async uploadFile(url: string, file: File, onProgress?: (progress: number) => void): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export const axiosInstance = apiClient['client'];

// Convenience export for other modules needing the API origin (without /api/v1)
export const API_ORIGIN_FOR_LINKS = API_ORIGIN;