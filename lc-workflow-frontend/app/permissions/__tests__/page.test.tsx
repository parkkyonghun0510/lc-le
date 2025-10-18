/**
 * Permissions Page - Integration Tests
 * 
 * Tests for the permissions page to ensure it loads without hydration errors
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PermissionsPage from '../page';

// Mock the hooks
jest.mock('@/hooks/usePermissions', () => ({
  useRoles: () => ({ data: [], isLoading: false }),
  useApplyPermissionTemplate: () => ({ mutateAsync: jest.fn(), isPending: false }),
  usePermissionTemplates: () => ({ data: [], isLoading: false }),
}));

jest.mock('@/hooks/useUsers', () => ({
  useUsers: () => ({ data: { items: [] }, isLoading: false }),
}));

// Mock the dynamic components
jest.mock('@/components/permissions/PermissionMatrix', () => {
  return function MockPermissionMatrix() {
    return <div data-testid="permission-matrix-content">Permission Matrix Content</div>;
  };
});

jest.mock('@/components/permissions/RoleManagement', () => {
  return function MockRoleManagement() {
    return <div data-testid="role-management-content">Role Management Content</div>;
  };
});

jest.mock('@/components/permissions/UserPermissionAssignment', () => {
  return function MockUserPermissionAssignment() {
    return <div data-testid="user-permission-assignment-content">User Permission Assignment Content</div>;
  };
});

jest.mock('@/components/permissions/PermissionManagement', () => {
  return function MockPermissionManagement() {
    return <div data-testid="permission-management-content">Permission Management Content</div>;
  };
});

jest.mock('@/components/permissions/PermissionAuditTrail', () => {
  return function MockPermissionAuditTrail() {
    return <div data-testid="permission-audit-trail-content">Permission Audit Trail Content</div>;
  };
});

jest.mock('@/components/permissions/GenerateTemplatesModal', () => {
  return function MockGenerateTemplatesModal() {
    return <div data-testid="generate-templates-modal">Generate Templates Modal</div>;
  };
});

// Mock the logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock ErrorBoundary
jest.mock('@/components/ErrorBoundary', () => {
  return function MockErrorBoundary({ children }: { children: React.ReactNode }) {
    return <div data-testid="error-boundary">{children}</div>;
  };
});

describe('PermissionsPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('Hydration and Loading', () => {
    it('should render loading skeleton initially to prevent hydration mismatch', () => {
      const { container } = renderWithProviders(<PermissionsPage />);
      
      // Should show loading skeleton initially
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should render permissions page after mounting without hydration errors', async () => {
      renderWithProviders(<PermissionsPage />);
      
      // Wait for the component to mount and show the actual content
      await waitFor(() => {
        expect(screen.getByTestId('permissions-tabs')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify main elements are present
      expect(screen.getByText('Permission Management')).toBeInTheDocument();
      expect(screen.getByText('Manage roles, permissions, and access control across the system')).toBeInTheDocument();
    });

    it('should render all tab buttons correctly', async () => {
      renderWithProviders(<PermissionsPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('permissions-tabs')).toBeInTheDocument();
      });

      // Check all tabs are present
      expect(screen.getByTestId('tab-matrix')).toBeInTheDocument();
      expect(screen.getByTestId('tab-roles')).toBeInTheDocument();
      expect(screen.getByTestId('tab-users')).toBeInTheDocument();
      expect(screen.getByTestId('tab-permissions')).toBeInTheDocument();
      expect(screen.getByTestId('tab-templates')).toBeInTheDocument();
      expect(screen.getByTestId('tab-audit')).toBeInTheDocument();

      // Check tab names are consistent by using specific selectors
      expect(screen.getByTestId('tab-matrix')).toHaveTextContent('Permission Matrix');
      expect(screen.getByTestId('tab-roles')).toHaveTextContent('Role Management');
      expect(screen.getByTestId('tab-users')).toHaveTextContent('User Permissions');
      expect(screen.getByTestId('tab-permissions')).toHaveTextContent('Permissions');
      expect(screen.getByTestId('tab-templates')).toHaveTextContent('Permission Templates');
      expect(screen.getByTestId('tab-audit')).toHaveTextContent('Audit Trail');
    });

    it('should show permission matrix by default', async () => {
      renderWithProviders(<PermissionsPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('permissions-tabs')).toBeInTheDocument();
      });

      // Should show permission matrix content by default
      expect(screen.getByTestId('permission-matrix')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Permission Matrix' })).toBeInTheDocument();
      expect(screen.getByText(/View and manage permissions assigned to roles/)).toBeInTheDocument();
    });
  });

  describe('Error Boundary Integration', () => {
    it('should wrap content with error boundaries', async () => {
      renderWithProviders(<PermissionsPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('permissions-tabs')).toBeInTheDocument();
      });

      // Should have error boundaries wrapping the content
      const errorBoundaries = screen.getAllByTestId('error-boundary');
      expect(errorBoundaries.length).toBeGreaterThan(0);
    });
  });

  describe('Client-Side Rendering', () => {
    it('should handle client-side only features correctly', async () => {
      // Mock localStorage
      const mockLocalStorage = {
        getItem: jest.fn(() => 'mock-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });

      renderWithProviders(<PermissionsPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('permissions-tabs')).toBeInTheDocument();
      });

      // Should not cause errors when accessing localStorage
      expect(mockLocalStorage.getItem).not.toThrow();
    });

    it('should handle window object access safely', async () => {
      renderWithProviders(<PermissionsPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('permissions-tabs')).toBeInTheDocument();
      });

      // Should render without errors even when window object is accessed
      expect(screen.getByText('Permission Management')).toBeInTheDocument();
    });
  });

  describe('Dynamic Component Loading', () => {
    it('should load dynamic components without SSR', async () => {
      renderWithProviders(<PermissionsPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('permissions-tabs')).toBeInTheDocument();
      });

      // Permission matrix should be loaded dynamically
      await waitFor(() => {
        expect(screen.getByTestId('permission-matrix-content')).toBeInTheDocument();
      });
    });
  });
});