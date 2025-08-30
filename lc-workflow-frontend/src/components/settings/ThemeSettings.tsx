'use client';

import { useState, useEffect } from 'react';
import { useThemeSettings, useUpdateThemeSettings } from '@/hooks/useThemeSettings';
import { useTheme } from '@/providers/ThemeProvider';
import toast from 'react-hot-toast';

export function ThemeSettings() {
  const { data: themeSettings, isLoading, isError } = useThemeSettings();
  const { mutate: updateThemeSettings, isPending: isUpdating } = useUpdateThemeSettings();
  const { theme: currentTheme, setTheme } = useTheme();
  const [localSettings, setLocalSettings] = useState<any>(null);

  // Initialize local settings from backend
  useEffect(() => {
    if (themeSettings?.theme_config) {
      setLocalSettings(themeSettings.theme_config);
    }
  }, [themeSettings]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load theme settings</p>
      </div>
    );
  }

  if (!localSettings) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">No theme settings available</p>
      </div>
    );
  }

  const handleThemeModeChange = (mode: 'light' | 'dark' | 'system') => {
    setLocalSettings({
      ...localSettings,
      mode
    });
    setTheme(mode);
  };

  const handleColorChange = (palette: 'light' | 'dark', colorKey: string, value: string) => {
    setLocalSettings({
      ...localSettings,
      colors: {
        ...localSettings.colors,
        [palette]: {
          ...localSettings.colors[palette],
          [colorKey]: value
        }
      }
    });
  };

  const handlePreferenceChange = (key: string, value: any) => {
    setLocalSettings({
      ...localSettings,
      preferences: {
        ...localSettings.preferences,
        [key]: value
      }
    });
  };

  const handleAccessibilityChange = (key: string, value: any) => {
    setLocalSettings({
      ...localSettings,
      accessibility: {
        ...localSettings.accessibility,
        [key]: value
      }
    });
  };

  const handleSave = async () => {
    try {
      // Prepare updates for the backend
      const updates: Record<string, any> = {};
      
      // Add theme mode if changed
      if (localSettings.mode !== themeSettings?.theme_config?.mode) {
        updates.default_theme_mode = localSettings.mode;
      }
      
      // Add preference changes
      if (localSettings.preferences.primary_color !== themeSettings?.theme_config?.preferences?.primary_color) {
        updates.primary_color = localSettings.preferences.primary_color;
      }
      
      if (localSettings.preferences.secondary_color !== themeSettings?.theme_config?.preferences?.secondary_color) {
        updates.secondary_color = localSettings.preferences.secondary_color;
      }
      
      if (localSettings.preferences.allow_user_theme_choice !== themeSettings?.theme_config?.preferences?.allow_user_theme_choice) {
        updates.allow_user_theme_choice = localSettings.preferences.allow_user_theme_choice;
      }
      
      // Add accessibility changes
      if (localSettings.accessibility.enable_high_contrast !== themeSettings?.theme_config?.accessibility?.enable_high_contrast) {
        updates.enable_high_contrast = localSettings.accessibility.enable_high_contrast;
      }
      
      if (localSettings.accessibility.font_scale_factor !== themeSettings?.theme_config?.accessibility?.font_scale_factor) {
        updates.font_scale_factor = localSettings.accessibility.font_scale_factor;
      }
      
      // Only send updates if there are changes
      if (Object.keys(updates).length > 0) {
        updateThemeSettings(updates, {
          onSuccess: () => {
            toast.success('Theme settings saved successfully!');
          },
          onError: () => {
            toast.error('Failed to save theme settings');
          }
        });
      } else {
        toast.success('No changes to save');
      }
    } catch (error) {
      console.error('Failed to save theme settings:', error);
      toast.error('Failed to save theme settings');
    }
  };

  const resetToDefaults = () => {
    if (themeSettings?.theme_config) {
      setLocalSettings(themeSettings.theme_config);
      toast.success('Reset to default settings');
    }
  };

  return (
    <div className="space-y-6">
      {/* Theme Mode Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Theme Mode</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleThemeModeChange('light')}
            className={`p-4 rounded-lg border-2 transition-all ${
              currentTheme === 'light'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-yellow-400"></div>
              <span className="font-medium text-gray-900 dark:text-white">Light</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Light background with dark text
            </p>
          </button>

          <button
            onClick={() => handleThemeModeChange('dark')}
            className={`p-4 rounded-lg border-2 transition-all ${
              currentTheme === 'dark'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-gray-800"></div>
              <span className="font-medium text-gray-900 dark:text-white">Dark</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Dark background with light text
            </p>
          </button>

          <button
            onClick={() => handleThemeModeChange('system')}
            className={`p-4 rounded-lg border-2 transition-all ${
              currentTheme === 'system'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-gray-200 to-gray-800"></div>
              <span className="font-medium text-gray-900 dark:text-white">System</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Follow system preference
            </p>
          </button>
        </div>
      </div>

      {/* Color Palettes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Color Palettes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Light Theme Colors */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Light Theme</h4>
            <div className="space-y-3">
              {Object.entries(localSettings.colors.light).map(([key, value]) => (
                <div key={`light-${key}`} className="flex items-center justify-between">
                  <label className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {key.replace(/_/g, ' ')}
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={value as string}
                      onChange={(e) => handleColorChange('light', key, e.target.value)}
                      className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={value as string}
                      onChange={(e) => handleColorChange('light', key, e.target.value)}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dark Theme Colors */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Dark Theme</h4>
            <div className="space-y-3">
              {Object.entries(localSettings.colors.dark).map(([key, value]) => (
                <div key={`dark-${key}`} className="flex items-center justify-between">
                  <label className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {key.replace(/_/g, ' ')}
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={value as string}
                      onChange={(e) => handleColorChange('dark', key, e.target.value)}
                      className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={value as string}
                      onChange={(e) => handleColorChange('dark', key, e.target.value)}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Allow User Theme Choice
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Let users select their preferred theme
              </p>
            </div>
            <button
              onClick={() => handlePreferenceChange('allow_user_theme_choice', !localSettings.preferences.allow_user_theme_choice)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localSettings.preferences.allow_user_theme_choice
                  ? 'bg-blue-600'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localSettings.preferences.allow_user_theme_choice ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Primary Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={localSettings.preferences.primary_color}
                  onChange={(e) => handlePreferenceChange('primary_color', e.target.value)}
                  className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={localSettings.preferences.primary_color}
                  onChange={(e) => handlePreferenceChange('primary_color', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Secondary Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={localSettings.preferences.secondary_color}
                  onChange={(e) => handlePreferenceChange('secondary_color', e.target.value)}
                  className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={localSettings.preferences.secondary_color}
                  onChange={(e) => handlePreferenceChange('secondary_color', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accessibility */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Accessibility</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Enable High Contrast
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Increase contrast for better visibility
              </p>
            </div>
            <button
              onClick={() => handleAccessibilityChange('enable_high_contrast', !localSettings.accessibility.enable_high_contrast)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localSettings.accessibility.enable_high_contrast
                  ? 'bg-blue-600'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localSettings.accessibility.enable_high_contrast ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Text Contrast Ratio: {localSettings.accessibility.text_contrast_ratio}:1
            </label>
            <input
              type="range"
              min="3"
              max="7"
              step="0.1"
              value={localSettings.accessibility.text_contrast_ratio}
              onChange={(e) => handleAccessibilityChange('text_contrast_ratio', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>3:1 (Minimum)</span>
              <span>4.5:1 (AA Standard)</span>
              <span>7:1 (AAA Standard)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Font Scale Factor: {localSettings.accessibility.font_scale_factor}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={localSettings.accessibility.font_scale_factor}
              onChange={(e) => handleAccessibilityChange('font_scale_factor', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>0.5x (Smaller)</span>
              <span>1x (Normal)</span>
              <span>2x (Larger)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          onClick={resetToDefaults}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        >
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={isUpdating}
        >
          {isUpdating ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}