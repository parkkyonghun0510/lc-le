import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { UserCreate, User } from '@/types/models';
import toast from 'react-hot-toast';

// Setup hooks
export const useSetupRequired = () => {
  return useQuery({
    queryKey: ['setup', 'required'],
    queryFn: async () => {
      const response = await apiClient.get('/auth/setup-required');
      return (response as { data: { setup_required: boolean } }).data;
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
      const message = error.response?.data?.detail || 'Failed to complete setup';
      toast.error(message);
    },
  });
};