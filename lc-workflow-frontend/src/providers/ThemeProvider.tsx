'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useThemeSettings, useUpdateThemeSettings } from '@/hooks/useThemeSettings';
import { useAuth } from '@/hooks/useAuth';

type Theme = 'light' | 'dark' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  // When true, uses backend theme settings instead of localStorage
  useBackendSettings?: boolean;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  // Backend theme configuration
  themeConfig?: any;
  isThemeLoading: boolean;
  isThemeError: boolean;
};

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
  themeConfig: undefined,
  isThemeLoading: false,
  isThemeError: false,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'theme',
  useBackendSettings = false,
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  
  // Check if user is authenticated
  const { isAuthenticated } = useAuth();
  
  // Fetch backend theme settings if enabled
  const { data: themeSettings, isLoading: isThemeLoading, isError: isThemeError } = 
    useBackendSettings ? useThemeSettings() : { data: undefined, isLoading: false, isError: false };
  
  // Mutation for updating theme settings
  const { mutate: updateThemeSettings } = useUpdateThemeSettings();
  
  // Initialize theme from localStorage or backend once the component is mounted
  useEffect(() => {
    if (useBackendSettings && themeSettings?.theme_config?.mode) {
      // Use backend theme mode
      setThemeState(themeSettings.theme_config.mode);
    } else {
      // Use localStorage fallback
      try {
        const storedTheme = localStorage.getItem(storageKey) as Theme;
        if (storedTheme) {
          setThemeState(storedTheme);
        }
      } catch (error) {
        // localStorage is not available during server-side rendering
        console.error('localStorage is not available:', error);
      }
    }
  }, [storageKey, useBackendSettings, themeSettings]);

  useEffect(() => {
    try {
      const root = window.document.documentElement;

      root.classList.remove('light', 'dark');

      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
          .matches
          ? 'dark'
          : 'light';

        root.classList.add(systemTheme);
        return;
      }

      root.classList.add(theme);
    } catch (error) {
      // window is not available during server-side rendering
      console.error('window is not available:', error);
    }
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      if (useBackendSettings && isAuthenticated) {
        // Update backend settings with correct format (only if authenticated)
        updateThemeSettings({ default_theme_mode: newTheme });
      } else {
        try {
          localStorage.setItem(storageKey, newTheme);
        } catch (error) {
          // localStorage is not available during server-side rendering
          console.error('localStorage is not available:', error);
        }
      }
      setThemeState(newTheme);
    },
    themeConfig: themeSettings?.theme_config,
    isThemeLoading,
    isThemeError
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};