import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { LoginCredentials, User } from '@/types/models';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

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
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.user(), data.user);
      toast.success('Login successful!');
      router.push('/dashboard');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Login failed';
      toast.error(message);
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
      console.error('Logout error:', error);
      // Still clear cache and redirect even if logout API fails
      queryClient.clear();
      router.push('/login');
    },
  });
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: () => apiClient.getCurrentUser(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
};

// Utility hook to check if user is authenticated
export const useAuth = () => {
  const { data: user, isLoading, error } = useCurrentUser();
  
  return {
    user: user || null,
    isLoading,
    isAuthenticated: !!user && !error,
    error,
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