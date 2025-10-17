/**
 * Permission API Client - Unit Tests
 * 
 * Tests for the permission management API client
 */

import { buildQueryString, transformPermissionFormToRequest, transformPermissionToForm } from '../permissions';
import { ResourceType, PermissionAction, PermissionScope, Permission } from '@/types/permissions';

// Mock the apiClient
jest.mock('../../api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

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
