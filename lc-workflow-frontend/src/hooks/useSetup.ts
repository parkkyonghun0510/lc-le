import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { UserCreate, User } from '@/types/models';
import toast from 'react-hot-toast';

// Setup hooks
export const useSetupRequired = () => {
  return useQuery({
    queryKey: ['setup', 'required'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/auth/setup-required');
        return (response as { data: { setup_required: boolean } }).data;
      } catch (error) {
        // Return a default value if the API call fails
        console.error('Failed to check setup status:', error);
        return { setup_required: false };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
};

export const useSetupFirstAdmin = () => {
  return useMutation({
    mutationFn: async (data: UserCreate) => {
      const response = await apiClient.post('/auth/setup-first-admin', data);
      return (response as { data: User }).data;
    },
    onSuccess: () => {
      toast.success('Initial setup completed successfully!');
    },
    onError: (error: any) => {
      let message = 'Failed to complete setup';
      
      if (error.response?.data?.detail) {
        message = error.response.data.detail;
      } else if (error.response?.data?.errors) {
        // Handle validation errors from FastAPI (422)
        const errors = error.response.data.errors;
        if (Array.isArray(errors) && errors.length > 0) {
          message = errors.map((err: any) => err.msg || 'Validation error').join(', ');
        }
      }
      
      toast.error(message);
    },
  });
};