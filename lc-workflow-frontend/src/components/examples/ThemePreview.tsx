'use client';

import { useTheme } from '@/providers/ThemeProvider';

export function ThemePreview() {
  const { theme, themeConfig } = useTheme();
  
  if (!themeConfig) {
    return (
      <div className="p-6 text-center">
        <p>Loading theme preview...</p>
      </div>
    );
  }
  
  // Get current theme colors
  const currentColors = themeConfig.colors[theme] || themeConfig.colors.light;
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Current Theme: {theme}</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(currentColors).map(([name, color]) => (
            <div 
              key={name} 
              className="rounded-lg overflow-hidden border"
              style={{ 
                borderColor: themeConfig.colors[theme]?.divider || 
                  (theme === 'dark' ? '#373737' : '#E0E0E0') 
              }}
            >
              <div 
                className="h-16"
                style={{ backgroundColor: color as string }}
              />
              <div 
                className="p-2 text-xs"
                style={{ 
                  backgroundColor: themeConfig.colors[theme]?.surface || 
                    (theme === 'dark' ? '#1E1E1E' : '#F5F5F5'),
                  color: themeConfig.colors[theme]?.text_primary || 
                    (theme === 'dark' ? '#FFFFFF' : '#212121')
                }}
              >
                <div className="font-medium capitalize">{name.replace(/_/g, ' ')}</div>
                <div className="font-mono text-xs opacity-75">{color as string}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-4">Accessibility Settings</h3>
        <div 
          className="rounded-lg p-4"
          style={{ 
            backgroundColor: themeConfig.colors[theme]?.surface || 
              (theme === 'dark' ? '#1E1E1E' : '#F5F5F5'),
            border: `1px solid ${themeConfig.colors[theme]?.divider || 
              (theme === 'dark' ? '#373737' : '#E0E0E0')}`
          }}
        >
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Text Contrast Ratio</span>
              <span className="font-medium">
                {themeConfig.accessibility?.text_contrast_ratio || 4.5}:1
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>High Contrast Mode</span>
              <span className="font-medium">
                {themeConfig.accessibility?.enable_high_contrast ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Font Scale</span>
              <span className="font-medium">
                {themeConfig.accessibility?.font_scale_factor || 1.0}x
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-4">Theme Preferences</h3>
        <div 
          className="rounded-lg p-4"
          style={{ 
            backgroundColor: themeConfig.colors[theme]?.surface || 
              (theme === 'dark' ? '#1E1E1E' : '#F5F5F5'),
            border: `1px solid ${themeConfig.colors[theme]?.divider || 
              (theme === 'dark' ? '#373737' : '#E0E0E0')}`
          }}
        >
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Primary Color</span>
              <div className="flex items-center">
                <div 
                  className="w-6 h-6 rounded mr-2 border"
                  style={{ 
                    backgroundColor: themeConfig.preferences?.primary_color || '#2196F3',
                    borderColor: themeConfig.colors[theme]?.divider || 
                      (theme === 'dark' ? '#373737' : '#E0E0E0')
                  }}
                />
                <span className="font-medium">
                  {themeConfig.preferences?.primary_color || '#2196F3'}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>Secondary Color</span>
              <div className="flex items-center">
                <div 
                  className="w-6 h-6 rounded mr-2 border"
                  style={{ 
                    backgroundColor: themeConfig.preferences?.secondary_color || '#FF5722',
                    borderColor: themeConfig.colors[theme]?.divider || 
                      (theme === 'dark' ? '#373737' : '#E0E0E0')
                  }}
                />
                <span className="font-medium">
                  {themeConfig.preferences?.secondary_color || '#FF5722'}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>User Theme Choice</span>
              <span className="font-medium">
                {themeConfig.preferences?.allow_user_theme_choice ? 'Allowed' : 'Not Allowed'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}