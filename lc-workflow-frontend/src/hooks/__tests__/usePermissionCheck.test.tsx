/**
 * usePermissionCheck Hook - Unit Tests
 * 
 * Tests for the generalized permission checking hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePermissionCheck, createPermissionName, parsePermissionName } from '../usePermissionCheck';
import { useAuth } from '../useAuth';
import { permissionsApi } from '@/lib/api/permissions';
import { ResourceType, PermissionAction, PermissionScope } from '@/types/permissions';
import type { UserPermissionsResponse } from '@/types/permissions';

// Mock dependencies
jest.mock('../useAuth');
jest.mock('@/lib/api/permissions');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockPermissionsApi = permissionsApi as jest.Mocked<typeof permissionsApi>;

// Test data
const mockUser: any = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  role: 'manager',
  is_active: true,
  first_name: 'Test',
  last_name: 'User',
  status: 'active',
};

const mockUserPermissions: UserPermissionsResponse = {
  user_id: 'user-123',
  roles: [
    {
      id: 'role-1',
      name: 'manager',
      display_name: 'Manager',
      description: 'Manager role',
      level: 2,
      is_system_role: true,
      is_active: true,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
  direct_permissions: [],
  effective_permissions: [
    {
      permission: {
        id: 'perm-1',
        name: 'application:create',
        description: 'Create applications',
        resource_type: ResourceType.APPLICATION,
        action: PermissionAction.CREATE,
        scope: PermissionScope.GLOBAL,
        is_active: true,
        is_system_permission: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      source: 'role',
      role_name: 'manager',
      role_id: 'role-1',
      is_granted: true,
    },
    {
      permission: {
        id: 'perm-2',
        name: 'application:approve',
        description: 'Approve applications',
        resource_type: ResourceType.APPLICATION,
        action: PermissionAction.APPROVE,
        scope: PermissionScope.DEPARTMENT,
        is_active: true,
        is_system_permission: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      source: 'role',
      role_name: 'manager',
      role_id: 'role-1',
      is_granted: true,
    },
    {
      permission: {
        id: 'perm-3',
        name: 'user:read',
        description: 'Read users',
        resource_type: ResourceType.USER,
        action: PermissionAction.READ,
        scope: PermissionScope.OWN,
        is_active: true,
        is_system_permission: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      source: 'direct',
      is_granted: true,
    },
  ],
};

// Helper to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  return Wrapper;
};

describe('usePermissionCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock setup
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
    
    mockPermissionsApi.getCurrentUserPermissions.mockResolvedValue(mockUserPermissions);
  });
  
  describe('can() function', () => {
    it('should return true when user has permission', async () => {
      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.can(ResourceType.APPLICATION, PermissionAction.CREATE)).toBe(true);
    });
    
    it('should return false when user does not have permission', async () => {
      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.can(ResourceType.APPLICATION, PermissionAction.DELETE)).toBe(false);
    });
    
    it('should check scope when provided', async () => {
      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      // Has permission with DEPARTMENT scope
      expect(result.current.can(
        ResourceType.APPLICATION,
        PermissionAction.APPROVE,
        PermissionScope.DEPARTMENT
      )).toBe(true);
      
      // Does not have permission with GLOBAL scope
      expect(result.current.can(
        ResourceType.APPLICATION,
        PermissionAction.APPROVE,
        PermissionScope.GLOBAL
      )).toBe(false);
    });
    
    it('should accept string values for resource and action', async () => {
      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.can('application', 'create')).toBe(true);
    });
    
    it('should return false while loading', () => {
      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      });
      
      // Should return false immediately while loading
      expect(result.current.can(ResourceType.APPLICATION, PermissionAction.CREATE)).toBe(false);
    });
  });
  
  describe('hasRole() function', () => {
    it('should return true when user has role', async () => {
      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.hasRole('manager')).toBe(true);
    });
    
    it('should return false when user does not have role', async () => {
      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.hasRole('admin')).toBe(false);
    });
    
    it('should be case-insensitive', async () => {
      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.hasRole('MANAGER')).toBe(true);
      expect(result.current.hasRole('Manager')).toBe(true);
      expect(result.current.hasRole('manager')).toBe(true);
    });
  });
  
  describe('hasPermission() function', () => {
    it('should return true when user has named permission', async () => {
      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.hasPermission('application:create')).toBe(true);
      expect(result.current.hasPermission('application:approve')).toBe(true);
    });
    
    it('should return false when user does not have named permission', async () => {
      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.hasPermission('application:delete')).toBe(false);
    });
    
    it('should be case-insensitive', async () => {
      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.hasPermission('APPLICATION:CREATE')).toBe(true);
      expect(result.current.hasPermission('Application:Create')).toBe(true);
    });
  });
  
  describe('loading state', () => {
    it('should be true initially', () => {
      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      });
      
      expect(result.current.loading).toBe(true);
    });
    
    it('should be false after data loads', async () => {
      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });
  
  describe('permissions and roles properties', () => {
    it('should expose permissions array', async () => {
      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.permissions).toHaveLength(3);
      expect(result.current.permissions[0].permission.name).toBe('application:create');
    });
    
    it('should expose roles array', async () => {
      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.roles).toEqual(['manager']);
    });
  });
  
  describe('invalidateCache()', () => {
    it('should invalidate cache and refetch', async () => {
      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      // Clear mock calls
      mockPermissionsApi.getCurrentUserPermissions.mockClear();
      
      // Invalidate cache
      await result.current.invalidateCache();
      
      // Should trigger refetch
      await waitFor(() => {
        expect(mockPermissionsApi.getCurrentUserPermissions).toHaveBeenCalled();
      });
    });
  });
  
  describe('error handling', () => {
    it('should return false for all checks on error', async () => {
      mockPermissionsApi.getCurrentUserPermissions.mockRejectedValue(
        new Error('API Error')
      );
      
      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      });
      
      // Wait for retries to complete (React Query retries 2 times)
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 5000 });
      
      // After error, all checks should return false (safe default)
      expect(result.current.can(ResourceType.APPLICATION, PermissionAction.CREATE)).toBe(false);
      expect(result.current.hasRole('manager')).toBe(false);
      expect(result.current.hasPermission('application:create')).toBe(false);
      expect(result.current.permissions).toEqual([]);
      expect(result.current.roles).toEqual([]);
    });
  });
  
  describe('unauthenticated user', () => {
    it('should not fetch permissions when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      
      renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      });
      
      expect(mockPermissionsApi.getCurrentUserPermissions).not.toHaveBeenCalled();
    });
  });
});

describe('Helper functions', () => {
  describe('createPermissionName()', () => {
    it('should create permission name from resource and action', () => {
      expect(createPermissionName(ResourceType.APPLICATION, PermissionAction.CREATE))
        .toBe('application:create');
      
      expect(createPermissionName('user', 'read'))
        .toBe('user:read');
    });
  });
  
  describe('parsePermissionName()', () => {
    it('should parse valid permission name', () => {
      const result = parsePermissionName('application:create');
      expect(result).toEqual({
        resource: 'application',
        action: 'create',
      });
    });
    
    it('should return null for invalid permission name', () => {
      expect(parsePermissionName('invalid')).toBeNull();
      expect(parsePermissionName('too:many:parts')).toBeNull();
      expect(parsePermissionName('')).toBeNull();
    });
  });
});
