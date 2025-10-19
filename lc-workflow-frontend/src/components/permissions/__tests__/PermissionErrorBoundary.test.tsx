/**
 * PermissionErrorBoundary - Unit Tests
 * 
 * Tests for the permission error boundary component with different error types
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PermissionErrorBoundary, { PermissionErrorDisplay } from '../PermissionErrorBoundary';
import { PermissionError, ApiError, NetworkError } from '@/lib/api/permissionErrors';

// Mock the logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Test component that throws errors
const ThrowError: React.FC<{ error?: Error }> = ({ error }) => {
  if (error) {
    throw error;
  }
  return <div>No error</div>;
};

describe('PermissionErrorBoundary', () => {
  // Suppress console.error for these tests since we're intentionally throwing errors
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <PermissionErrorBoundary>
          <div>Test content</div>
        </PermissionErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
  });

  describe('Permission Error Handling', () => {
    it('should display permission error with required permission', () => {
      const permissionError = new PermissionError(
        'You do not have permission to access this resource',
        'SYSTEM.VIEW_ALL',
        ['admin']
      );

      render(
        <PermissionErrorBoundary>
          <ThrowError error={permissionError} />
        </PermissionErrorBoundary>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('You do not have permission to access this resource')).toBeInTheDocument();
      expect(screen.getByText('Required Permission:')).toBeInTheDocument();
      expect(screen.getByText('SYSTEM.VIEW_ALL')).toBeInTheDocument();
      expect(screen.getByText('Required Roles:')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('Contact your system administrator to request access')).toBeInTheDocument();
    });

    it('should display permission error without roles', () => {
      const permissionError = new PermissionError(
        'Access denied',
        'SYSTEM.READ'
      );

      render(
        <PermissionErrorBoundary>
          <ThrowError error={permissionError} />
        </PermissionErrorBoundary>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('SYSTEM.READ')).toBeInTheDocument();
      expect(screen.queryByText('Required Roles:')).not.toBeInTheDocument();
    });

    it('should show retry button for permission errors', () => {
      const permissionError = new PermissionError('Access denied');

      render(
        <PermissionErrorBoundary>
          <ThrowError error={permissionError} />
        </PermissionErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  describe('API Error Handling', () => {
    it('should display 404 error correctly', () => {
      const apiError = new ApiError(
        'Endpoint not found',
        404,
        'NOT_FOUND',
        {},
        '/api/v1/permissions/matrix',
        'GET'
      );

      render(
        <PermissionErrorBoundary>
          <ThrowError error={apiError} />
        </PermissionErrorBoundary>
      );

      expect(screen.getByText('Feature Not Available')).toBeInTheDocument();
      expect(screen.getByText(/requested feature or endpoint is not available/)).toBeInTheDocument();
      expect(screen.getByText('HTTP 404: Endpoint not found')).toBeInTheDocument();
      expect(screen.getByText('Endpoint: GET /api/v1/permissions/matrix')).toBeInTheDocument();
    });

    it('should display server error correctly', () => {
      const apiError = new ApiError('Internal server error', 500);

      render(
        <PermissionErrorBoundary>
          <ThrowError error={apiError} />
        </PermissionErrorBoundary>
      );

      expect(screen.getByText('Server Error')).toBeInTheDocument();
      expect(screen.getByText(/servers are experiencing issues/)).toBeInTheDocument();
    });

    it('should not show retry button for 404 errors', () => {
      const apiError = new ApiError('Not found', 404);

      render(
        <PermissionErrorBoundary>
          <ThrowError error={apiError} />
        </PermissionErrorBoundary>
      );

      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    });
  });

  describe('Network Error Handling', () => {
    it('should display network error with troubleshooting steps', () => {
      const networkError = new NetworkError('Connection failed');

      render(
        <PermissionErrorBoundary>
          <ThrowError error={networkError} />
        </PermissionErrorBoundary>
      );

      expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      expect(screen.getByText(/check your internet connection/)).toBeInTheDocument();
      expect(screen.getByText('Troubleshooting Steps:')).toBeInTheDocument();
      expect(screen.getByText('Check your internet connection')).toBeInTheDocument();
      expect(screen.getByText('Try refreshing the page')).toBeInTheDocument();
    });
  });

  describe('Hydration Error Handling', () => {
    it('should display hydration error with helpful message', () => {
      const hydrationError = new Error('Hydration failed because the initial UI does not match what was rendered on the server');

      render(
        <PermissionErrorBoundary>
          <ThrowError error={hydrationError} />
        </PermissionErrorBoundary>
      );

      expect(screen.getByText('Loading Issue Detected')).toBeInTheDocument();
      expect(screen.getByText(/temporary issue loading this section/)).toBeInTheDocument();
      expect(screen.getByText('What happened?')).toBeInTheDocument();
      expect(screen.getByText(/page content didn't load correctly/)).toBeInTheDocument();
    });

    it('should detect hydration errors by message content', () => {
      const hydrationError = new Error('Text content does not match server-rendered HTML');

      render(
        <PermissionErrorBoundary>
          <ThrowError error={hydrationError} />
        </PermissionErrorBoundary>
      );

      expect(screen.getByText('Loading Issue Detected')).toBeInTheDocument();
    });

    it('should show retry button for hydration errors', () => {
      const hydrationError = new Error('hydration mismatch');

      render(
        <PermissionErrorBoundary>
          <ThrowError error={hydrationError} />
        </PermissionErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    });
  });

  describe('Generic Error Handling', () => {
    it('should display generic error for unknown error types', () => {
      const genericError = new Error('Unknown error');

      render(
        <PermissionErrorBoundary>
          <ThrowError error={genericError} />
        </PermissionErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/unexpected error occurred/)).toBeInTheDocument();
    });

    it('should show development error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const genericError = new Error('Test error');

      render(
        <PermissionErrorBoundary>
          <ThrowError error={genericError} />
        </PermissionErrorBoundary>
      );

      expect(screen.getByText('Error Details (Development Only)')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Retry Functionality', () => {
    it('should show retry button for permission errors', () => {
      const permissionError = new PermissionError('Access denied');

      render(
        <PermissionErrorBoundary>
          <ThrowError error={permissionError} />
        </PermissionErrorBoundary>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should show refresh page button for all error types', () => {
      const permissionError = new PermissionError('Access denied');

      render(
        <PermissionErrorBoundary>
          <ThrowError error={permissionError} />
        </PermissionErrorBoundary>
      );

      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    it('should use custom fallback component when provided', () => {
      const CustomFallback: React.FC<{ error?: Error; resetError: () => void }> = ({ error }) => (
        <div>Custom error: {error?.message}</div>
      );

      const testError = new Error('Test error');

      render(
        <PermissionErrorBoundary fallback={CustomFallback}>
          <ThrowError error={testError} />
        </PermissionErrorBoundary>
      );

      expect(screen.getByText('Custom error: Test error')).toBeInTheDocument();
    });
  });

  describe('Error Logging', () => {
    it('should log errors with proper context', async () => {
      const { logger } = await import('@/lib/logger');
      const permissionError = new PermissionError('Access denied');

      render(
        <PermissionErrorBoundary context="TestContext">
          <ThrowError error={permissionError} />
        </PermissionErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Permission Error Boundary caught an error',
        permissionError,
        expect.objectContaining({
          context: 'TestContext',
          errorBoundary: 'permission',
          isPermissionError: true,
        })
      );
    });
  });
});

describe('PermissionErrorDisplay', () => {
  it('should display inline permission error', () => {
    const error = new PermissionError(
      'You need admin access',
      'SYSTEM.ADMIN'
    );

    render(<PermissionErrorDisplay error={error} />);

    expect(screen.getByText('Permission Required')).toBeInTheDocument();
    expect(screen.getByText('You need admin access')).toBeInTheDocument();
    expect(screen.getByText('SYSTEM.ADMIN')).toBeInTheDocument();
    expect(screen.getByText('Please contact your administrator to request access.')).toBeInTheDocument();
  });

  it('should show retry button when onRetry is provided', () => {
    const error = new PermissionError('Access denied');
    const onRetry = jest.fn();

    render(<PermissionErrorDisplay error={error} onRetry={onRetry} />);

    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    const error = new PermissionError('Access denied');

    const { container } = render(
      <PermissionErrorDisplay error={error} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});