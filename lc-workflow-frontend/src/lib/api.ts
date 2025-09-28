import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { AuthResponse, LoginCredentials } from '@/types/models';
import { handleApiError } from './handleApiError';

const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090/api/v1';

function normalizeBaseUrl(raw: string): string {
  try {
    let url = raw.trim().replace(/\/$/, '');
    const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isProd = process.env.NODE_ENV === 'production' || (typeof window !== 'undefined' && window.location.hostname.endsWith('railway.app'));
    if (isHttpsPage || isProd) url = url.replace(/^http:\/\//i, 'https://');
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('ws://')) url = url.replace(/^ws:\/\//i, 'wss://');
    return url;
  } catch {
    return raw;
  }
}

export function getApiOrigin(): string {
  return normalizeBaseUrl(RAW_API_BASE_URL);
}

const API_ORIGIN = getApiOrigin();
const API_BASE_URL = API_ORIGIN;
class ApiClient {
  private client: AxiosInstance;

  constructor() {
    console.log('API_BASE_URL', API_BASE_URL);
    this.client = axios.create({ baseURL: API_BASE_URL, timeout: 10000, headers: { 'Content-Type': 'application/json' }, withCredentials: true });
    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const url = error.config?.url as string | undefined;
        const status = error.response?.status;
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
        if (status === 403) console.error('Forbidden:', error.response?.data?.detail || 'Access denied');
        if (!url?.endsWith('/auth/me')) handleApiError(error, 'An unexpected error occurred');
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
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, body?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, body, config);
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