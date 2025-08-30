# 🎨 Theme Integration Guide

## Overview
This document explains how to use and customize the theme system in the LC Workflow admin frontend.

## Features Implemented

### 1. Backend-Integrated Theme System
- Theme settings are stored and managed in the backend
- Real-time synchronization between frontend and backend
- Admin-controlled theme configuration

### 2. Theme Modes
- **Light Mode**: Clean, bright interface with dark text
- **Dark Mode**: Dark interface with light text for low-light environments
- **System Mode**: Automatically follows the user's system preference

### 3. Color Customization
- Full control over color palettes for both light and dark themes
- WCAG AA compliant contrast ratios (4.5:1 minimum)
- Customizable primary and secondary colors

### 4. Accessibility Features
- High contrast mode toggle
- Adjustable font scaling (0.5x to 2x)
- Configurable text contrast ratios

## File Structure
```
src/
├── hooks/
│   └── useThemeSettings.ts     # Backend integration hooks
├── providers/
│   └── ThemeProvider.tsx       # Theme context provider
├── components/
│   └── settings/
│       └── ThemeSettings.tsx   # UI component for theme configuration
└── app/
    └── layout.tsx             # Root layout with theme provider
```

## How It Works

### 1. Theme Provider
The [ThemeProvider](file:///Volumes/SYBazzarData/LC-Project/backend/lc-workflow-frontend/src/providers/ThemeProvider.tsx#L24-L80) component manages the theme state and integrates with backend settings:
- Uses `useBackendSettings={true}` to fetch theme configuration from the backend
- Automatically applies the user's preferred theme mode
- Provides theme context to all child components

### 2. Backend Integration
The [useThemeSettings](file:///Volumes/SYBazzarData/LC-Project/backend/lc-workflow-frontend/src/hooks/useThemeSettings.ts#L70-L79) hook connects to the backend API:
- Fetches theme configuration from `/api/settings/theme`
- Updates settings via `/api/settings/theme` PUT endpoint
- Uses React Query for efficient caching and state management

### 3. Theme Settings UI
The [ThemeSettings](file:///Volumes/SYBazzarData/LC-Project/backend/lc-workflow-frontend/src/components/settings/ThemeSettings.tsx#L15-L365) component provides an admin interface for:
- Selecting theme mode (light/dark/system)
- Customizing color palettes
- Adjusting accessibility settings
- Saving changes to the backend

## Usage

### 1. Accessing Theme Settings
1. Navigate to the Settings page in the admin panel
2. Select "Theme & Appearance" from the sidebar
3. Customize theme options as needed
4. Click "Save Changes" to persist settings

### 2. Using Theme in Components
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

### 3. Theme Configuration API
The backend provides the following theme configuration structure:

```json
{
  "theme_config": {
    "mode": "system",
    "colors": {
      "light": {
        "background": "#FFFFFF",
        "text_primary": "#212121",
        "primary": "#2196F3"
      },
      "dark": {
        "background": "#121212", 
        "text_primary": "#FFFFFF",
        "primary": "#64B5F6"
      }
    },
    "accessibility": {
      "text_contrast_ratio": 4.5,
      "enable_high_contrast": false,
      "font_scale_factor": 1.0
    },
    "preferences": {
      "primary_color": "#2196F3",
      "allow_user_theme_choice": true
    }
  }
}
```

## Testing

### Manual Testing Checklist
- [ ] Theme mode switching works (light/dark/system)
- [ ] Color customization persists after page refresh
- [ ] Settings page loads theme configuration from backend
- [ ] Changes save successfully to backend
- [ ] Text has sufficient contrast in both modes
- [ ] UI elements are visible in both light and dark modes

### Automated Testing
Run the integration test script:
```bash
cd lc-workflow-frontend
node test-theme-integration.js
```

## Troubleshooting

### Common Issues

1. **Theme not loading**
   - Check network tab for API errors to `/api/settings/theme`
   - Verify backend is running and accessible
   - Ensure user has proper authentication

2. **Color changes not saving**
   - Check browser console for JavaScript errors
   - Verify backend API is accepting PUT requests
   - Ensure user has admin permissions

3. **Theme not persisting**
   - Check that `useBackendSettings={true}` is set in ThemeProvider
   - Verify localStorage fallback is working
   - Check for caching issues in React Query

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS variables for dynamic theme switching
- localStorage for client-side theme persistence

## Customization

### Adding New Theme Properties
1. Update the backend `DEFAULT_SETTINGS` in `app/routers/settings.py`
2. Add corresponding fields to the TypeScript interfaces in `useThemeSettings.ts`
3. Update the `ThemeSettings` component UI
4. Modify the `ThemeProvider` if needed for new functionality

### Extending Color Palette
1. Add new color properties to the backend theme settings
2. Update the `ThemeColors` interface in `useThemeSettings.ts`
3. Add new color inputs to the `ThemeSettings` component
4. Use the new colors in your components via the theme context

This theme system provides a robust, accessible, and customizable solution for managing the application's appearance while maintaining consistency with the backend configuration.