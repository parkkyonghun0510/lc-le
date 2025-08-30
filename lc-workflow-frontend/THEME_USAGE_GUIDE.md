# 🎨 Theme Usage Guide

This guide explains how to properly integrate and use the theme system in your components and layouts.

## 1. Theme Integration in Layout

The theme system is already integrated in the root layout at `src/app/layout.tsx`. The [ThemeProvider](file:///Volumes/SYBazzarData/LC-Project/backend/lc-workflow-frontend/src/providers/ThemeProvider.tsx#L24-L80) is wrapped around all components and configured to use backend settings:

```tsx
// src/app/layout.tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="km">
      <body className={`${inter.variable} ${notoSansKhmer.variable} font-sans antialiased`}>
        <QueryProvider>
          <ThemeProvider useBackendSettings={true}>
            <AuthProvider>
              <ToasterClient />
              {children}
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

## 2. Using Theme in Components

To use the theme in your components, you need to import and use the [useTheme](file:///Volumes/SYBazzarData/LC-Project/backend/lc-workflow-frontend/src/providers/ThemeProvider.tsx#L76-L83) hook from the ThemeProvider.

### Basic Usage

```tsx
import { useTheme } from '@/providers/ThemeProvider';

export function MyComponent() {
  const { theme, themeConfig } = useTheme();
  
  return (
    <div className={`bg-${theme === 'dark' ? 'gray-900' : 'white'}`}>
      <h1 className="text-primary">Themed Content</h1>
    </div>
  );
}
```

### Advanced Usage with Theme Configuration

```tsx
import { useTheme } from '@/providers/ThemeProvider';

export function ThemedComponent() {
  const { theme, themeConfig } = useTheme();
  
  // Access theme configuration
  const backgroundColor = themeConfig?.colors[theme]?.background || 
    (theme === 'dark' ? '#121212' : '#FFFFFF');
    
  const textColor = themeConfig?.colors[theme]?.text_primary || 
    (theme === 'dark' ? '#FFFFFF' : '#212121');
  
  return (
    <div 
      style={{ 
        backgroundColor: backgroundColor,
        color: textColor,
        padding: '1rem',
        borderRadius: '0.5rem'
      }}
    >
      <h2>This component adapts to the current theme</h2>
      <p>Current theme: {theme}</p>
    </div>
  );
}
```

## 3. CSS Class-Based Theming

The theme system automatically applies CSS classes to the root HTML element based on the current theme:

- `light` class for light theme
- `dark` class for dark theme

You can use these classes in your CSS or Tailwind classes:

```css
/* In your CSS files */
.dark .my-component {
  background-color: #1e1e1e;
  color: #ffffff;
}

.light .my-component {
  background-color: #ffffff;
  color: #212121;
}
```

Or with Tailwind:

```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  <p>This text adapts to the theme</p>
</div>
```

## 4. Dynamic Styling Based on Theme Configuration

For more advanced theming, you can access the full theme configuration:

```tsx
import { useTheme } from '@/providers/ThemeProvider';

export function AdvancedThemedComponent() {
  const { theme, themeConfig } = useTheme();
  
  // Get primary color based on current theme
  const primaryColor = themeConfig?.colors[theme]?.primary || '#2196F3';
  
  // Get accessibility settings
  const highContrast = themeConfig?.accessibility?.enable_high_contrast || false;
  const fontScale = themeConfig?.accessibility?.font_scale_factor || 1;
  
  return (
    <div 
      style={{ 
        backgroundColor: themeConfig?.colors[theme]?.background,
        color: themeConfig?.colors[theme]?.text_primary,
        fontSize: `${fontScale}rem`,
        border: highContrast ? `2px solid ${themeConfig?.colors[theme]?.text_primary}` : '1px solid transparent'
      }}
    >
      <h2 style={{ color: primaryColor }}>Dynamically themed content</h2>
      <p>Primary color: {primaryColor}</p>
      <p>Font scale: {fontScale}x</p>
      <p>High contrast: {highContrast ? 'Enabled' : 'Disabled'}</p>
    </div>
  );
}
```

## 5. Theme Mode Switching

To allow users to switch themes, you can use the [setTheme](file:///Volumes/SYBazzarData/LC-Project/backend/lc-workflow-frontend/src/providers/ThemeProvider.tsx#L39-L56) function:

```tsx
import { useTheme } from '@/providers/ThemeProvider';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="flex space-x-2">
      <button 
        onClick={() => setTheme('light')}
        className={`px-4 py-2 rounded ${theme === 'light' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
      >
        Light
      </button>
      <button 
        onClick={() => setTheme('dark')}
        className={`px-4 py-2 rounded ${theme === 'dark' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
      >
        Dark
      </button>
      <button 
        onClick={() => setTheme('system')}
        className={`px-4 py-2 rounded ${theme === 'system' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
      >
        System
      </button>
    </div>
  );
}
```

## 6. Working with Theme Settings

To access or modify theme settings, use the hooks from [useThemeSettings](file:///Volumes/SYBazzarData/LC-Project/backend/lc-workflow-frontend/src/hooks/useThemeSettings.ts#L70-L79):

```tsx
import { useThemeSettings, useUpdateThemeSettings } from '@/hooks/useThemeSettings';

export function ThemeSettingsManager() {
  const { data: themeSettings, isLoading, isError } = useThemeSettings();
  const { mutate: updateThemeSettings } = useUpdateThemeSettings();
  
  if (isLoading) return <div>Loading theme settings...</div>;
  if (isError) return <div>Error loading theme settings</div>;
  
  const handlePrimaryColorChange = (newColor: string) => {
    updateThemeSettings({ primary_color: newColor });
  };
  
  return (
    <div>
      <h3>Current Theme Settings</h3>
      <p>Mode: {themeSettings?.theme_config?.mode}</p>
      <p>Primary Color: {themeSettings?.theme_config?.preferences?.primary_color}</p>
      
      <div className="mt-4">
        <label>Change Primary Color:</label>
        <input 
          type="color" 
          value={themeSettings?.theme_config?.preferences?.primary_color || '#2196F3'}
          onChange={(e) => handlePrimaryColorChange(e.target.value)}
        />
      </div>
    </div>
  );
}
```

## 7. Best Practices

1. **Always use the ThemeProvider**: Ensure all components that need theme information are wrapped by the ThemeProvider.

2. **Use CSS variables or Tailwind dark variants**: For simple theme switching, use Tailwind's dark mode classes or CSS variables.

3. **Access theme configuration when needed**: For advanced theming, use the themeConfig object from the useTheme hook.

4. **Handle loading states**: When using theme settings from the backend, always handle loading and error states.

5. **Respect user preferences**: Use the system theme mode by default unless the user explicitly chooses a different mode.

6. **Test all theme modes**: Always test your components in light, dark, and system modes.

## 8. Example Implementations

### Basic Themed Card Component

Here's a complete example of a themed component:

```tsx
// src/components/ThemedCard.tsx
'use client';

import { useTheme } from '@/providers/ThemeProvider';

export function ThemedCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme, themeConfig } = useTheme();
  
  const cardStyle = {
    backgroundColor: themeConfig?.colors[theme]?.surface || (theme === 'dark' ? '#1e1e1e' : '#f5f5f5'),
    color: themeConfig?.colors[theme]?.text_primary || (theme === 'dark' ? '#ffffff' : '#212121'),
    border: `1px solid ${themeConfig?.colors[theme]?.divider || (theme === 'dark' ? '#373737' : '#e0e0e0')}`,
    borderRadius: '0.5rem',
    padding: '1rem',
    boxShadow: theme === 'dark' ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)'
  };
  
  const titleStyle = {
    color: themeConfig?.colors[theme]?.primary || '#2196F3',
    marginBottom: '0.5rem',
    fontSize: '1.25rem',
    fontWeight: '600'
  };

  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>{title}</h3>
      <div>{children}</div>
    </div>
  );
}
```

### Advanced Dashboard Card Component

For a more advanced example, see the [ThemedDashboardCard](file:///Volumes/SYBazzarData/LC-Project/backend/lc-workflow-frontend/src/components/examples/ThemedDashboardCard.tsx) component which demonstrates:
- Dynamic color application based on theme
- Trend indicators with theme-appropriate colors
- Responsive design with hover effects
- Icon support with themed backgrounds

### Theme Preview Component

The [ThemePreview](file:///Volumes/SYBazzarData/LC-Project/backend/lc-workflow-frontend/src/components/examples/ThemePreview.tsx) component shows how to:
- Display current theme colors in a visual palette
- Show accessibility settings
- Present theme preferences
- Handle loading states gracefully

These components will automatically adapt to the current theme and use the appropriate colors from the theme configuration.