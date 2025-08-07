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
    mutationFn: (credentials: LoginCredentials) => apiClient.login(credentials),
    onSuccess: async (data) => {
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
      queryClient.clear();
      router.push('/login');
      toast.success('Logged out successfully');
    },
    onError: (error: any) => {
      handleApiError(error, 'Logout failed');
      // Still clear cache and redirect even if logout API fails
      queryClient.clear();
      router.push('/login');
    },
  });
};

export const useCurrentUser = () => {
  return useQuery<User>({
    queryKey: authKeys.user(),
    // Ensure type aligns with updated User including optional position fields
    queryFn: () => apiClient.getCurrentUser() as Promise<User>,
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

// Hook to check user roles
export const useRole = () => {
  const { user } = useAuth();

  return {
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isOfficer: user?.role === 'officer',
    role: user?.role,
  };
};