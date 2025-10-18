/**
 * PermissionErrorBoundary - Usage Examples
 * 
 * This file demonstrates how to use the PermissionErrorBoundary component
 * with different types of errors and configurations.
 */

import React, { useState } from 'react';
import PermissionErrorBoundary, { PermissionErrorDisplay } from './PermissionErrorBoundary';
import { PermissionError, ApiError, NetworkError } from '@/lib/api/permissionErrors';
import { Button } from '@/components/ui';

// Component that throws different types of errors for demonstration
const ErrorThrower: React.FC<{ errorType?: string }> = ({ errorType }) => {
  if (errorType === 'permission') {
    throw new PermissionError(
      'You do not have permission to access the permission matrix',
      'SYSTEM.VIEW_ALL',
      ['admin', 'manager']
    );
  }
  
  if (errorType === 'api-404') {
    throw new ApiError(
      'Permission matrix endpoint not found',
      404,
      'NOT_FOUND',
      {},
      '/api/v1/permissions/matrix',
      'GET'
    );
  }
  
  if (errorType === 'api-500') {
    throw new ApiError(
      'Internal server error',
      500,
      'INTERNAL_ERROR'
    );
  }
  
  if (errorType === 'network') {
    throw new NetworkError(
      'Network connection failed',
      new Error('Connection timeout')
    );
  }
  
  if (errorType === 'generic') {
    throw new Error('Something unexpected happened');
  }
  
  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <h3 className="text-green-800 font-medium">No Error</h3>
      <p className="text-green-700 text-sm">Component is working normally.</p>
    </div>
  );
};

/**
 * Example 1: Basic Permission Error Boundary
 */
export const BasicExample: React.FC = () => {
  const [errorType, setErrorType] = useState<string>('');

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Permission Error Boundary Example</h3>
        <p className="text-sm text-gray-600 mb-4">
          Click the buttons below to simulate different types of errors and see how the error boundary handles them.
        </p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Button onClick={() => setErrorType('')} variant="outline" size="sm">
            No Error
          </Button>
          <Button onClick={() => setErrorType('permission')} variant="outline" size="sm">
            Permission Error (403)
          </Button>
          <Button onClick={() => setErrorType('api-404')} variant="outline" size="sm">
            API Error (404)
          </Button>
          <Button onClick={() => setErrorType('api-500')} variant="outline" size="sm">
            Server Error (500)
          </Button>
          <Button onClick={() => setErrorType('network')} variant="outline" size="sm">
            Network Error
          </Button>
          <Button onClick={() => setErrorType('generic')} variant="outline" size="sm">
            Generic Error
          </Button>
        </div>
      </div>

      <PermissionErrorBoundary context="ExampleComponent">
        <ErrorThrower errorType={errorType} />
      </PermissionErrorBoundary>
    </div>
  );
};

/**
 * Example 2: Custom Fallback Component
 */
const CustomErrorFallback: React.FC<{ 
  error?: Error; 
  resetError: () => void; 
  errorId?: string; 
}> = ({ error, resetError, errorId }) => (
  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
    <h3 className="text-purple-900 font-medium mb-2">Custom Error Handler</h3>
    <p className="text-purple-700 text-sm mb-4">
      This is a custom error fallback component. Error: {error?.message}
    </p>
    {errorId && (
      <p className="text-xs text-purple-600 mb-4">ID: {errorId}</p>
    )}
    <Button onClick={resetError} variant="outline" size="sm">
      Custom Retry
    </Button>
  </div>
);

export const CustomFallbackExample: React.FC = () => {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Custom Fallback Example</h3>
        <p className="text-sm text-gray-600 mb-4">
          This example shows how to use a custom fallback component.
        </p>
        
        <Button 
          onClick={() => setHasError(!hasError)} 
          variant="outline" 
          size="sm"
        >
          {hasError ? 'Clear Error' : 'Trigger Error'}
        </Button>
      </div>

      <PermissionErrorBoundary 
        context="CustomFallbackExample"
        fallback={CustomErrorFallback}
      >
        <ErrorThrower errorType={hasError ? 'permission' : ''} />
      </PermissionErrorBoundary>
    </div>
  );
};

/**
 * Example 3: Inline Permission Error Display
 */
export const InlineErrorExample: React.FC = () => {
  const [showError, setShowError] = useState(false);

  const permissionError = new PermissionError(
    'You need administrator privileges to perform this action',
    'SYSTEM.ADMIN',
    ['admin']
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Inline Error Display Example</h3>
        <p className="text-sm text-gray-600 mb-4">
          This shows how to display permission errors inline without using an error boundary.
        </p>
        
        <Button 
          onClick={() => setShowError(!showError)} 
          variant="outline" 
          size="sm"
        >
          {showError ? 'Hide Error' : 'Show Error'}
        </Button>
      </div>

      {showError && (
        <PermissionErrorDisplay 
          error={permissionError}
          onRetry={() => setShowError(false)}
        />
      )}
    </div>
  );
};

/**
 * Example 4: Nested Error Boundaries
 */
export const NestedExample: React.FC = () => {
  const [outerError, setOuterError] = useState(false);
  const [innerError, setInnerError] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Nested Error Boundaries Example</h3>
        <p className="text-sm text-gray-600 mb-4">
          This shows how error boundaries work when nested. The inner boundary catches errors first.
        </p>
        
        <div className="flex gap-2 mb-4">
          <Button 
            onClick={() => setOuterError(!outerError)} 
            variant="outline" 
            size="sm"
          >
            {outerError ? 'Clear Outer Error' : 'Trigger Outer Error'}
          </Button>
          <Button 
            onClick={() => setInnerError(!innerError)} 
            variant="outline" 
            size="sm"
          >
            {innerError ? 'Clear Inner Error' : 'Trigger Inner Error'}
          </Button>
        </div>
      </div>

      <PermissionErrorBoundary context="OuterBoundary">
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium mb-2">Outer Component</h4>
          <ErrorThrower errorType={outerError ? 'network' : ''} />
          
          <PermissionErrorBoundary context="InnerBoundary">
            <div className="border border-gray-300 rounded-lg p-4 mt-4">
              <h4 className="font-medium mb-2">Inner Component</h4>
              <ErrorThrower errorType={innerError ? 'permission' : ''} />
            </div>
          </PermissionErrorBoundary>
        </div>
      </PermissionErrorBoundary>
    </div>
  );
};

/**
 * Complete Example Page
 */
export const PermissionErrorBoundaryExamples: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Permission Error Boundary Examples</h1>
        <p className="text-gray-600">
          These examples demonstrate different ways to use the PermissionErrorBoundary component
          to handle permission-related errors gracefully.
        </p>
      </div>

      <BasicExample />
      <CustomFallbackExample />
      <InlineErrorExample />
      <NestedExample />
    </div>
  );
};

export default PermissionErrorBoundaryExamples;