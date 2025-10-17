# Permission Management Error Handling Guide

## Overview
This guide explains the error handling patterns implemented in the Permission Management System and how to maintain consistency when adding new features.

## Error Handling Pattern

### 1. Query Error Handling

When fetching data with React Query, always:

```typescript
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['resource-name'],
  queryFn: async () => {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: any = new Error(errorData.detail || 'Failed to fetch resource');
      error.status = response.status;
      error.response = { status: response.status, data: errorData };
      throw error;
    }
    
    return response.json();
  },
  retry: (failureCount, error: any) => {
    // Don't retry on 4xx errors (client errors)
    if (error?.status >= 400 && error?.status < 500) {
      return false;
    }
    // Retry up to 2 times for 5xx and network errors
    return failureCount < 2;
  }
});
```

### 2. Mutation Error Handling

For mutations, implement comprehensive error handling:

```typescript
const mutation = useMutation({
  mutationFn: async (data) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: any = new Error(errorData.detail || 'Operation failed');
      error.status = response.status;
      error.response = { status: response.status, data: errorData };
      throw error;
    }
    
    return response.json();
  },
  onSuccess: (data) => {
    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['resource'] });
    // Show success toast
    toast.success('Operation completed successfully', { duration: 3000 });
  },
  onError: (error: any) => {
    const status = error?.status || error?.response?.status;
    
    // Handle specific error codes
    if (status === 403) {
      showErrorToast('Permission denied', {
        context: 'You don\'t have permission to perform this action.',
        suggestions: [
          'Contact your administrator for access',
          'Verify your role has the necessary permissions'
        ]
      });
    } else if (status === 404) {
      showErrorToast('Resource not found', {
        context: 'The resource you are trying to access no longer exists.',
        suggestions: [
          'Refresh the page to reload the data',
          'The resource may have been deleted'
        ],
        onRetry: () => refetch()
      });
    } else if (status === 409) {
      showErrorToast('Conflict', {
        context: 'The operation conflicts with existing data.',
        suggestions: [
          'Check if the resource already exists',
          'Refresh the page to see current state'
        ]
      });
    } else if (status === 422) {
      showErrorToast('Invalid data', {
        context: error.message || 'Please check your input and try again.',
        suggestions: [
          'Review all required fields',
          'Ensure data meets validation requirements'
        ]
      });
    } else if (status === 500 || status >= 500) {
      ErrorToasts.serverError(() => refetch());
    } else if (!status) {
      ErrorToasts.networkError(() => refetch());
    } else {
      showErrorToast('Operation failed', {
        context: error.message || 'An unexpected error occurred'
      });
    }
  }
});
```

### 3. Error Display in Components

When displaying query errors:

```typescript
if (error) {
  const errorObj = error as any;
  const status = errorObj?.status || errorObj?.response?.status;
  
  let errorMessage = 'Error loading data';
  let errorContext = errorObj.message || 'An unexpected error occurred';
  let suggestions: string[] = [];
  
  // Categorize error by status code
  if (status === 403) {
    errorMessage = 'Access denied';
    errorContext = 'You don\'t have permission to view this data.';
    suggestions = [
      'Contact your administrator for access',
      'Verify you are logged in with the correct account'
    ];
  } else if (status === 404) {
    errorMessage = 'Resource not found';
    errorContext = 'The requested data could not be found.';
    suggestions = ['Refresh the page', 'Contact support if the problem persists'];
  } else if (status === 500 || status >= 500) {
    errorMessage = 'Server error';
    errorContext = 'The server encountered an error.';
    suggestions = [
      'Try again in a few moments',
      'Refresh the page',
      'Contact support if the error continues'
    ];
  } else if (!status) {
    errorMessage = 'Network error';
    errorContext = 'Unable to connect to the server.';
    suggestions = [
      'Check your internet connection',
      'Try refreshing the page'
    ];
  }
  
  return (
    <div className="text-center p-6">
      {/* Error icon */}
      <svg className="mx-auto h-12 w-12 text-red-500" /* ... */ />
      
      {/* Error message */}
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {errorMessage}
      </h3>
      <p className="text-sm text-gray-500 mb-4">{errorContext}</p>
      
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="text-left max-w-md mx-auto mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Try these solutions:
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Retry button */}
      <button
        onClick={() => refetch()}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Try Again
      </button>
    </div>
  );
}
```

### 4. Loading States for Buttons

Always show loading state during async operations:

```typescript
<button
  onClick={handleAction}
  disabled={mutation.isPending}
  className="p-2 text-gray-400 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
  aria-label="Perform action"
  title={mutation.isPending ? "Processing..." : "Perform action"}
>
  {mutation.isPending ? (
    <div className="animate-spin h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full" aria-hidden="true" />
  ) : (
    <ActionIcon className="h-5 w-5" aria-hidden="true" />
  )}
</button>
```

## HTTP Status Code Reference

### 4xx Client Errors

- **400 Bad Request**: Invalid request format
- **401 Unauthorized**: Authentication required or failed
- **403 Forbidden**: Authenticated but not authorized
- **404 Not Found**: Resource doesn't exist
- **409 Conflict**: Operation conflicts with current state
- **422 Unprocessable Entity**: Validation error

### 5xx Server Errors

- **500 Internal Server Error**: Generic server error
- **502 Bad Gateway**: Upstream server error
- **503 Service Unavailable**: Server temporarily unavailable
- **504 Gateway Timeout**: Upstream server timeout

## Toast Notification Guidelines

### Success Messages
- Keep brief and positive
- Duration: 3000ms (3 seconds)
- Example: `toast.success('Role created successfully', { duration: 3000 })`

### Error Messages
- Use `showErrorToast()` for detailed errors
- Include context and suggestions
- Duration: 8000ms (8 seconds) for errors with suggestions
- Example:
  ```typescript
  showErrorToast('Permission denied', {
    context: 'You don\'t have permission to perform this action.',
    suggestions: [
      'Contact your administrator for access',
      'Verify your role has the necessary permissions'
    ]
  });
  ```

### Predefined Error Toasts
Use these for common scenarios:
- `ErrorToasts.networkError(onRetry)`
- `ErrorToasts.serverError(onRetry)`
- `ErrorToasts.validationError(field)`
- `ErrorToasts.permissionError()`
- `ErrorToasts.timeoutError(onRetry)`

## Accessibility Considerations

1. **Screen Reader Announcements**: Use aria-live regions for dynamic updates
   ```typescript
   const [announcement, setAnnouncement] = useState('');
   
   // In component
   <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
     {announcement}
   </div>
   
   // On success
   setAnnouncement('Role created successfully');
   ```

2. **Button States**: Always include aria-label and aria-disabled
   ```typescript
   <button
     aria-label={mutation.isPending ? 'Processing' : 'Perform action'}
     aria-disabled={mutation.isPending}
     disabled={mutation.isPending}
   >
   ```

3. **Error Messages**: Ensure error messages are announced to screen readers

## Best Practices

1. **Always handle errors**: Never leave mutations without error handling
2. **Provide context**: Explain why the error occurred
3. **Offer solutions**: Give users actionable steps to resolve issues
4. **Enable retry**: For transient errors, provide retry functionality
5. **Show loading states**: Always indicate when operations are in progress
6. **Invalidate queries**: Refresh data after successful mutations
7. **Log errors**: Use logger for debugging and monitoring
8. **Test error scenarios**: Verify error handling works for all cases

## Testing Error Scenarios

### Manual Testing Checklist

- [ ] Test with network disconnected
- [ ] Test with invalid authentication token
- [ ] Test with insufficient permissions (403)
- [ ] Test with non-existent resources (404)
- [ ] Test with duplicate data (409)
- [ ] Test with invalid input (422)
- [ ] Test with server errors (simulate 500)
- [ ] Verify retry buttons work
- [ ] Verify loading states appear
- [ ] Verify success toasts appear
- [ ] Verify error toasts appear with correct messages
- [ ] Test screen reader announcements

### Automated Testing

Consider adding tests for:
- Error boundary catches React errors
- Mutations handle all error status codes
- Retry functionality works correctly
- Loading states toggle properly
- Toast notifications appear

## Common Pitfalls to Avoid

1. **Don't swallow errors**: Always show user feedback
2. **Don't use generic messages**: Provide specific, actionable information
3. **Don't forget loading states**: Users need visual feedback
4. **Don't retry 4xx errors**: Client errors won't resolve with retry
5. **Don't forget accessibility**: Screen readers need announcements
6. **Don't block on errors**: Allow users to continue using the app
7. **Don't forget to invalidate queries**: Keep data fresh after mutations

## Resources

- [React Query Error Handling](https://tanstack.com/query/latest/docs/react/guides/query-functions#handling-and-throwing-errors)
- [React Hot Toast Documentation](https://react-hot-toast.com/)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## Support

For questions or issues with error handling:
1. Review this guide
2. Check existing implementations in PermissionMatrix, RoleManagement, or UserPermissionAssignment
3. Consult the TASK_15_IMPLEMENTATION_SUMMARY.md for detailed examples
4. Contact the development team
