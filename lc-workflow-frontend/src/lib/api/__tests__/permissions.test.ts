/**
 * Permission API Client - Unit Tests
 * 
 * Tests for the permission management API client with enhanced error handling
 */

import { buildQueryString, transformPermissionFormToRequest, transformPermissionToForm, permissionsApi } from '../permissions';
import { ResourceType, PermissionAction, PermissionScope, Permission } from '@/types/permissions';
import { PermissionError, ApiError, NetworkError, ValidationError } from '../permissionErrors';
import { AxiosError } from 'axios';

// Mock the apiClient
jest.mock('../../api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import { apiClient } from '../../api';
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('Permission API Client', () => {
  describe('buildQueryString', () => {
    it('should build query string from params', () => {
      const params = {
        page: 1,
        size: 50,
        search: 'test',
        is_active: true,
      };
      
      const result = buildQueryString(params);
      expect(result).toContain('page=1');
      expect(result).toContain('size=50');
      expect(result).toContain('search=test');
      expect(result).toContain('is_active=true');
    });

    it('should skip undefined and null values', () => {
      const params = {
        page: 1,
        size: undefined,
        search: null,
        is_active: '',
      };
      
      const result = buildQueryString(params);
      expect(result).toContain('page=1');
      expect(result).not.toContain('size');
      expect(result).not.toContain('search');
      expect(result).not.toContain('is_active');
    });

    it('should return empty string for empty params', () => {
      const result = buildQueryString({});
      expect(result).toBe('');
    });
  });

  describe('transformPermissionFormToRequest', () => {
    it('should transform form data to API request', () => {
      const formData = {
        name: 'test.permission',
        description: 'Test permission',
        resource_type: ResourceType.APPLICATION,
        action: PermissionAction.CREATE,
        scope: PermissionScope.OWN,
        is_active: true,
      };

      const result = transformPermissionFormToRequest(formData);
      
      expect(result).toEqual({
        name: 'test.permission',
        description: 'Test permission',
        resource_type: ResourceType.APPLICATION,
        action: PermissionAction.CREATE,
        scope: PermissionScope.OWN,
        is_active: true,
      });
    });

    it('should parse JSON conditions', () => {
      const formData = {
        name: 'test.permission',
        description: 'Test permission',
        resource_type: ResourceType.APPLICATION,
        action: PermissionAction.CREATE,
        scope: PermissionScope.OWN,
        conditions: '{"department_id": "123"}',
        is_active: true,
      };

      const result = transformPermissionFormToRequest(formData);
      
      expect(result.conditions).toEqual({ department_id: '123' });
    });

    it('should skip invalid JSON conditions', () => {
      const formData = {
        name: 'test.permission',
        description: 'Test permission',
        resource_type: ResourceType.APPLICATION,
        action: PermissionAction.CREATE,
        scope: PermissionScope.OWN,
        conditions: 'invalid json',
        is_active: true,
      };

      const result = transformPermissionFormToRequest(formData);
      
      expect(result.conditions).toBeUndefined();
    });
  });

  describe('transformPermissionToForm', () => {
    it('should transform permission to form data', () => {
      const permission: Permission = {
        id: '123',
        name: 'test.permission',
        description: 'Test permission',
        resource_type: ResourceType.APPLICATION,
        action: PermissionAction.CREATE,
        scope: PermissionScope.OWN,
        is_active: true,
        is_system_permission: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = transformPermissionToForm(permission);
      
      expect(result).toEqual({
        name: 'test.permission',
        description: 'Test permission',
        resource_type: ResourceType.APPLICATION,
        action: PermissionAction.CREATE,
        scope: PermissionScope.OWN,
        is_active: true,
        conditions: undefined,
      });
    });

    it('should stringify conditions', () => {
      const permission: Permission = {
        id: '123',
        name: 'test.permission',
        description: 'Test permission',
        resource_type: ResourceType.APPLICATION,
        action: PermissionAction.CREATE,
        scope: PermissionScope.OWN,
        conditions: { department_id: '123' },
        is_active: true,
        is_system_permission: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = transformPermissionToForm(permission);
      
      expect(result.conditions).toBe('{\n  "department_id": "123"\n}');
    });
  });
});

describe('Permission API Type Safety', () => {
  it('should enforce ResourceType enum', () => {
    const validType: ResourceType = ResourceType.APPLICATION;
    expect(validType).toBe('application');
    
    // TypeScript will catch invalid values at compile time
    // @ts-expect-error - Testing type safety
    const invalidType: ResourceType = 'invalid';
  });

  it('should enforce PermissionAction enum', () => {
    const validAction: PermissionAction = PermissionAction.CREATE;
    expect(validAction).toBe('create');
  });

  it('should enforce PermissionScope enum', () => {
    const validScope: PermissionScope = PermissionScope.OWN;
    expect(validScope).toBe('own');
  });
});

describe('Permission API Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMatrix', () => {
    it('should handle 403 permission errors', async () => {
      const axiosError = {
        response: {
          status: 403,
          data: {
            detail: {
              message: 'You do not have permission to view the permission matrix',
              required_permission: 'SYSTEM.VIEW_ALL',
              required_roles: ['admin']
            }
          }
        }
      } as AxiosError;

      mockApiClient.get.mockRejectedValue(axiosError);

      await expect(permissionsApi.getMatrix()).rejects.toThrow(PermissionError);
      
      try {
        await permissionsApi.getMatrix();
      } catch (error) {
        expect(error).toBeInstanceOf(PermissionError);
        expect((error as PermissionError).requiredPermission).toBe('SYSTEM.VIEW_ALL');
        expect((error as PermissionError).requiredRoles).toEqual(['admin']);
      }
    });

    it('should handle 404 not found errors', async () => {
      const axiosError = {
        response: {
          status: 404,
          data: {
            detail: 'Permission matrix endpoint not found'
          }
        }
      } as AxiosError;

      mockApiClient.get.mockRejectedValue(axiosError);

      await expect(permissionsApi.getMatrix()).rejects.toThrow(ApiError);
      
      try {
        await permissionsApi.getMatrix();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(404);
      }
    });

    it('should handle network errors', async () => {
      const axiosError = {
        message: 'Network Error',
        code: 'NETWORK_ERROR'
      } as AxiosError;

      mockApiClient.get.mockRejectedValue(axiosError);

      await expect(permissionsApi.getMatrix()).rejects.toThrow(NetworkError);
    });

    it('should return data on success', async () => {
      const mockResponse = {
        roles: [],
        permissions: [],
        assignments: {}
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await permissionsApi.getMatrix();
      expect(result).toEqual(mockResponse);
      expect(mockApiClient.get).toHaveBeenCalledWith('/permissions/matrix');
    });
  });

  describe('listRoles', () => {
    it('should handle 403 permission errors with clear messages', async () => {
      const axiosError = {
        response: {
          status: 403,
          data: {
            detail: {
              message: 'You need SYSTEM.VIEW_ALL permission or admin role to access this resource',
              required_permission: 'SYSTEM.VIEW_ALL',
              required_roles: ['admin']
            }
          }
        }
      } as AxiosError;

      mockApiClient.get.mockRejectedValue(axiosError);

      await expect(permissionsApi.listRoles()).rejects.toThrow(PermissionError);
      
      try {
        await permissionsApi.listRoles();
      } catch (error) {
        expect(error).toBeInstanceOf(PermissionError);
        expect((error as PermissionError).message).toContain('SYSTEM.VIEW_ALL');
      }
    });

    it('should return roles data on success', async () => {
      const mockResponse = {
        items: [],
        total: 0,
        page: 1,
        size: 50,
        pages: 0
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await permissionsApi.listRoles();
      expect(result).toEqual(mockResponse);
      expect(mockApiClient.get).toHaveBeenCalledWith('/roles');
    });

    it('should handle query parameters correctly', async () => {
      const mockResponse = {
        items: [],
        total: 0,
        page: 1,
        size: 10,
        pages: 0
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await permissionsApi.listRoles({ page: 1, size: 10, search: 'admin' });
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/roles?page=1&size=10&search=admin');
    });
  });

  describe('listTemplates', () => {
    it('should handle 403 permission errors', async () => {
      const axiosError = {
        response: {
          status: 403,
          data: {
            detail: 'You do not have permission to view permission templates'
          }
        }
      } as AxiosError;

      mockApiClient.get.mockRejectedValue(axiosError);

      await expect(permissionsApi.listTemplates()).rejects.toThrow(PermissionError);
    });

    it('should return templates data on success', async () => {
      const mockResponse: any[] = [];

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await permissionsApi.listTemplates();
      expect(result).toEqual(mockResponse);
      expect(mockApiClient.get).toHaveBeenCalledWith('/permissions/templates');
    });
  });

  describe('getErrorMessage', () => {
    it('should return user-friendly message for PermissionError', () => {
      const error = new PermissionError(
        'Access denied',
        'SYSTEM.VIEW_ALL',
        ['admin']
      );

      const message = permissionsApi.getErrorMessage(error);
      expect(message).toContain('Access denied');
      expect(message).toContain('SYSTEM.VIEW_ALL');
      expect(message).toContain('admin');
      expect(message).toContain('contact your system administrator');
    });

    it('should return user-friendly message for ApiError', () => {
      const error = new ApiError('Not found', 404);

      const message = permissionsApi.getErrorMessage(error);
      expect(message).toContain('not found');
    });

    it('should return user-friendly message for NetworkError', () => {
      const error = new NetworkError('Connection failed');

      const message = permissionsApi.getErrorMessage(error);
      expect(message).toContain('Network connection problem');
    });

    it('should return user-friendly message for ValidationError', () => {
      const error = new ValidationError('Validation failed', {
        name: ['Name is required'],
        email: ['Invalid email format']
      });

      const message = permissionsApi.getErrorMessage(error);
      expect(message).toContain('Validation failed');
      expect(message).toContain('name: Name is required');
      expect(message).toContain('email: Invalid email format');
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error');

      const message = permissionsApi.getErrorMessage(error);
      expect(message).toBe('Unknown error');
    });
  });

  describe('testConnection', () => {
    it('should return success when connection works', async () => {
      mockApiClient.get.mockResolvedValue({ status: 'healthy' });

      const result = await permissionsApi.testConnection();
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error details when connection fails', async () => {
      const axiosError = {
        message: 'Network Error',
        code: 'NETWORK_ERROR'
      } as AxiosError;

      mockApiClient.get.mockRejectedValue(axiosError);

      const result = await permissionsApi.testConnection();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network connection failed');
    });
  });
});
