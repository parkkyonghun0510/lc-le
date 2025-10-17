/**
 * API Client Exports
 * 
 * Central export point for all API clients and utilities
 */

// Re-export the main API client
export { apiClient, axiosInstance, API_ORIGIN_FOR_LINKS } from '../api';

// Re-export permission API
export { permissionsApi, default as permissionsApiDefault } from './permissions';
export * from './permissions';

// Re-export permission error utilities
export * from './permissionErrors';
