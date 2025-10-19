import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { LoginCredentials, User } from '@/types/models';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { handleApiError } from '@/lib/handleApiError';

// Auth query keys
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
};

// Auth hooks
export const useLogin = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => {
      return apiClient.login(credentials);
    },
    onSuccess: async (data) => {
      // Check what was actually stored
      const storedToken = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');

      // Ensure token is stored before redirecting
      await new Promise(resolve => setTimeout(resolve, 500));

      // Force refetch user data to update auth state
      await queryClient.invalidateQueries({ queryKey: authKeys.user() });
      await queryClient.refetchQueries({ queryKey: authKeys.user() });

      toast.success('Login successful!');
      // Add small delay to ensure auth state is updated
      setTimeout(() => router.push('/dashboard'), 200);
    },
    onError: (error: any) => {
      handleApiError(error, 'Login failed');
    },
  });
};

export const useLogout = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      // Clear local storage (apiClient.logout already does this, but just in case)
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      
      // Clear React Query cache
      queryClient.clear();
      
      // Redirect to login
      router.push('/login');
      toast.success('Logged out successfully');
    },
    onError: (error: any) => {
      handleApiError(error, 'Logout failed');
      // Even if logout API fails, clear local data and redirect
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      queryClient.clear();
      router.push('/login');
    },
  });
};

export const useCurrentUser = () => {
   const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
   const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
   const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

   // Enhanced debugging for token state
   const tokenInfo = {
     hasToken: !!token,
     tokenLength: token?.length || 0,
     tokenPrefix: token?.substring(0, 20) + '...' || 'none',
     hasRefreshToken: !!refreshToken,
     refreshTokenLength: refreshToken?.length || 0,
     hasUserData: !!userData,
     isClient: typeof window !== 'undefined',
     timestamp: new Date().toISOString(),
     localStorageKeys: typeof window !== 'undefined' ? Object.keys(localStorage).filter(key =>
       key.includes('token') || key.includes('user')
     ) : [],
   };


   // Validate token format if present
   if (token && token.split('.').length !== 3) {
     // Invalid JWT format detected
   }

   return useQuery<User>({
     queryKey: authKeys.user(),
     // Ensure type aligns with updated User including optional position fields
     queryFn: async () => {
       // Additional pre-flight checks
       const preFlightToken = localStorage.getItem('access_token');
       if (!preFlightToken) {
         throw new Error('No access token available');
       }

       try {
         const user = await apiClient.getCurrentUser();
         return user;
       } catch (error: any) {
         // Special handling for 401 errors
         if (error.response?.status === 401) {
           // 401 Unauthorized - Token validation failed
         }

         throw error;
       }
     },
     staleTime: 5 * 60 * 1000, // 5 minutes
     retry: 1,
     retryDelay: 500,
     enabled: typeof window !== 'undefined' && !!localStorage.getItem('access_token'), // Only run when token exists
   });
};

// Utility hook to check if user is authenticated
export const useAuth = () => {
  const { data: user, isLoading, error } = useCurrentUser();

  return {
    user: user || null,
    isLoading: typeof window === 'undefined' ? false : isLoading,
    isAuthenticated: typeof window === 'undefined' ? false : (!!user && !error),
    error: typeof window === 'undefined' ? null : error,
  };
};

/**
 * @deprecated This hook is deprecated and will be removed in a future version.
 * Please use `usePermissionCheck()` from '@/hooks/usePermissionCheck' instead.
 * 
 * Migration guide:
 * - Instead of `isAdmin`, use `hasRole('admin')` or `isAdmin()` from usePermissionCheck
 * - Instead of `isManager`, use `hasRole('manager')` from usePermissionCheck
 * - Instead of `isOfficer`, use `hasRole('officer')` from usePermissionCheck
 * - For access control, use `can(resource, action, scope)` from usePermissionCheck
 * 
 * @see {@link https://github.com/your-repo/docs/PERMISSION_MIGRATION_GUIDE.md}
 */
export const useRole = () => {
  const { user } = useAuth();

  // Deprecation warning silenced - migration is complete
  // The hook is kept for backward compatibility only
  // if (process.env.NODE_ENV === 'development') {
  //   console.warn(
  //     '⚠️ useRole() is deprecated and will be removed in a future version.\n' +
  //     'Please migrate to usePermissionCheck() for permission-based access control.\n' +
  //     'See PERMISSION_MIGRATION_GUIDE.md for migration instructions.'
  //   );
  // }

  return {
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isOfficer: user?.role === 'officer',
    role: user?.role,
  };
};