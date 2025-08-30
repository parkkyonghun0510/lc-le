import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// Theme configuration interfaces
export interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  text_primary: string;
  text_secondary: string;
  text_disabled: string;
  divider: string;
  error: string;
  success: string;
  warning: string;
  info: string;
}

export interface ColorPalettes {
  light: ThemeColors;
  dark: ThemeColors;
}

export interface AccessibilitySettings {
  text_contrast_ratio: number;
  enable_high_contrast: boolean;
  font_scale_factor: number;
}

export interface ThemePreferences {
  primary_color: string;
  secondary_color: string;
  allow_user_theme_choice: boolean;
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  colors: ColorPalettes;
  accessibility: AccessibilitySettings;
  preferences: ThemePreferences;
}

export interface ThemeSettingsResponse {
  theme_config: ThemeConfig;
  last_updated: string;
  settings_count: number;
}

// Theme settings query keys
export const themeKeys = {
  all: ['theme'] as const,
  config: () => [...themeKeys.all, 'config'] as const,
  colors: (mode?: 'light' | 'dark') => [...themeKeys.all, 'colors', mode] as const,
};

// Theme settings hooks
export const useThemeSettings = () => {
  return useQuery({
    queryKey: themeKeys.config(),
    queryFn: async (): Promise<ThemeSettingsResponse> => {
      return await apiClient.get('/settings/theme');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

export const useThemeColors = (mode?: 'light' | 'dark') => {
  return useQuery({
    queryKey: themeKeys.colors(mode),
    queryFn: async (): Promise<{ 
      color_palettes: Partial<ColorPalettes>;
      requested_mode: 'light' | 'dark' | null;
      available_modes: string[];
    }> => {
      const params = mode ? `?theme_mode=${mode}` : '';
      return await apiClient.get(`/settings/theme/colors${params}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    enabled: !!mode,
  });
};

// Theme update mutation
export const useUpdateThemeSettings = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      return await apiClient.put('/settings/theme', updates);
    },
    onSuccess: () => {
      // Invalidate theme settings to refetch updated data
      queryClient.invalidateQueries({ queryKey: themeKeys.config() });
      queryClient.invalidateQueries({ queryKey: themeKeys.colors() });
    },
    onError: (error: any) => {
      console.error('Failed to update theme settings:', error);
      // In a real implementation, we would show an error toast
    },
  });
};