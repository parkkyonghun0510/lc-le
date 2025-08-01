import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import { handleApiError } from '@/lib/handleApiError';

// Settings query keys
export const settingsKeys = {
  all: ['settings'] as const,
  lists: () => [...settingsKeys.all, 'list'] as const,
  list: (category?: string) => [...settingsKeys.lists(), category] as const,
  categories: () => [...settingsKeys.all, 'categories'] as const,
  detail: (key: string) => [...settingsKeys.all, 'detail', key] as const,
};

// Settings interfaces
export interface Setting {
  id: string;
  key: string;
  value: any;
  category: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface SettingsByCategory {
  [category: string]: {
    [key: string]: {
      id: string;
      value: any;
      description?: string;
      is_public: boolean;
      created_at: string;
      updated_at: string;
    };
  };
}

export interface SettingCreate {
  key: string;
  value: any;
  category: string;
  description?: string;
  is_public?: boolean;
}

export interface SettingUpdate {
  value: any;
  description?: string;
  is_public?: boolean;
}

// Settings hooks
export const useSettings = (category?: string) => {
  return useQuery({
    queryKey: settingsKeys.list(category),
    queryFn: (): Promise<SettingsByCategory> => {
      const params = category ? `?category=${category}` : '';
      return apiClient.get(`/settings${params}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Settings don't change frequently
  });
};

export const useSettingCategories = () => {
  return useQuery({
    queryKey: settingsKeys.categories(),
    queryFn: (): Promise<string[]> => apiClient.get('/settings/categories'),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });
};

export const useSetting = (key: string) => {
  return useQuery({
    queryKey: settingsKeys.detail(key),
    queryFn: (): Promise<Setting> => apiClient.get(`/settings/${key}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!key,
    refetchOnWindowFocus: false,
  });
};

export const useCreateSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SettingCreate): Promise<Setting> => 
      apiClient.post('/settings', data),
    onSuccess: (newSetting) => {
      // Invalidate all settings queries
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      toast.success(`Setting '${newSetting.key}' created successfully`);
    },
    onError: (error: any) => {
      handleApiError(error, 'Failed to create setting');
    },
  });
};

export const useUpdateSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, data }: { key: string; data: SettingUpdate }): Promise<Setting> =>
      apiClient.put(`/settings/${key}`, data),
    onSuccess: (updatedSetting) => {
      // Update the specific setting in cache
      queryClient.setQueryData(
        settingsKeys.detail(updatedSetting.key),
        updatedSetting
      );
      
      // Invalidate lists to refresh grouped data
      queryClient.invalidateQueries({ queryKey: settingsKeys.lists() });
      
      toast.success(`Setting '${updatedSetting.key}' updated successfully`);
    },
    onError: (error: any) => {
      handleApiError(error, 'Failed to update setting');
    },
  });
};

export const useBulkUpdateSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Record<string, any>): Promise<{ message: string; settings: any }> =>
      apiClient.patch('/settings/bulk', settings),
    onSuccess: (response) => {
      // Invalidate all settings queries to refresh data
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      
      const count = Object.keys(response.settings).length;
      toast.success(`Successfully updated ${count} settings`);
    },
    onError: (error: any) => {
      handleApiError(error, 'Failed to update settings');
    },
  });
};

export const useDeleteSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (key: string): Promise<{ message: string }> =>
      apiClient.delete(`/settings/${key}`),
    onSuccess: (_, key) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: settingsKeys.detail(key) });
      
      // Invalidate lists to refresh grouped data
      queryClient.invalidateQueries({ queryKey: settingsKeys.lists() });
      
      toast.success(`Setting '${key}' deleted successfully`);
    },
    onError: (error: any) => {
      handleApiError(error, 'Failed to delete setting');
    },
  });
};

export const useInitializeSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (): Promise<{ message: string; created: number; skipped: number; total: number }> =>
      apiClient.post('/settings/initialize'),
    onSuccess: (response) => {
      // Invalidate all settings queries to refresh data
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      
      toast.success(`Initialized ${response.created} default settings (${response.skipped} already existed)`);
    },
    onError: (error: any) => {
      handleApiError(error, 'Failed to initialize settings');
    },
  });
};

// Utility hooks for specific setting categories
export const useGeneralSettings = () => {
  return useSettings('general');
};

export const useSecuritySettings = () => {
  return useSettings('security');
};

export const useUserSettings = () => {
  return useSettings('users');
};

export const useApplicationSettings = () => {
  return useSettings('applications');
};

export const useNotificationSettings = () => {
  return useSettings('notifications');
};

// Helper hook to get a specific setting value with fallback
export const useSettingValue = (key: string, fallback: any = null) => {
  const { data: setting } = useSetting(key);
  return setting?.value ?? fallback;
};