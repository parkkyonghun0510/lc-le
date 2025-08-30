# Theme Integration Guide for Flutter Frontend

## Overview

This guide explains how to integrate the new theme management system with your Flutter frontend application. The backend now provides comprehensive theme settings to address text color and dark/light mode issues.

## 🎨 Theme Configuration Available

### API Endpoints

#### 1. Get Theme Settings
```http
GET /api/settings/theme
Authorization: Bearer <token>
```

**Response Structure:**
```json
{
  "theme_config": {
    "mode": "system",
    "colors": {
      "light": {
        "background": "#FFFFFF",
        "surface": "#F5F5F5",
        "primary": "#2196F3",
        "secondary": "#FF5722",
        "text_primary": "#212121",
        "text_secondary": "#757575",
        "text_disabled": "#BDBDBD",
        "divider": "#E0E0E0",
        "error": "#F44336",
        "success": "#4CAF50",
        "warning": "#FF9800",
        "info": "#2196F3"
      },
      "dark": {
        "background": "#121212",
        "surface": "#1E1E1E",
        "primary": "#64B5F6",
        "secondary": "#FF8A65",
        "text_primary": "#FFFFFF",
        "text_secondary": "#B3B3B3",
        "text_disabled": "#6D6D6D",
        "divider": "#373737",
        "error": "#EF5350",
        "success": "#66BB6A",
        "warning": "#FFB74D",
        "info": "#64B5F6"
      }
    },
    "accessibility": {
      "text_contrast_ratio": 4.5,
      "enable_high_contrast": false,
      "font_scale_factor": 1.0
    },
    "preferences": {
      "primary_color": "#2196F3",
      "secondary_color": "#FF5722",
      "allow_user_theme_choice": true
    }
  },
  "last_updated": "2025-08-29T10:30:00Z",
  "settings_count": 9
}
```

#### 2. Update Theme Settings
```http
PUT /api/settings/theme
Authorization: Bearer <token>
Content-Type: application/json

{
  "default_theme_mode": "dark",
  "primary_color": "#1976D2",
  "enable_high_contrast": true,
  "font_scale_factor": 1.2
}
```

#### 3. Get Color Palettes
```http
GET /api/settings/theme/colors?theme_mode=dark
Authorization: Bearer <token>
```

## 🔧 Flutter Integration

### 1. Create Theme Data Classes

```dart
// lib/models/theme_config.dart
class ThemeConfig {
  final String mode;
  final ColorPalettes colors;
  final AccessibilitySettings accessibility;
  final ThemePreferences preferences;

  ThemeConfig({
    required this.mode,
    required this.colors,
    required this.accessibility,
    required this.preferences,
  });

  factory ThemeConfig.fromJson(Map<String, dynamic> json) {
    return ThemeConfig(
      mode: json['mode'] ?? 'system',
      colors: ColorPalettes.fromJson(json['colors']),
      accessibility: AccessibilitySettings.fromJson(json['accessibility']),
      preferences: ThemePreferences.fromJson(json['preferences']),
    );
  }
}

class ColorPalettes {
  final ColorScheme light;
  final ColorScheme dark;

  ColorPalettes({required this.light, required this.dark});

  factory ColorPalettes.fromJson(Map<String, dynamic> json) {
    return ColorPalettes(
      light: ColorScheme.fromJson(json['light']),
      dark: ColorScheme.fromJson(json['dark']),
    );
  }
}

class ColorScheme {
  final Color background;
  final Color surface;
  final Color primary;
  final Color secondary;
  final Color textPrimary;
  final Color textSecondary;
  final Color textDisabled;
  final Color divider;
  final Color error;
  final Color success;
  final Color warning;
  final Color info;

  ColorScheme({
    required this.background,
    required this.surface,
    required this.primary,
    required this.secondary,
    required this.textPrimary,
    required this.textSecondary,
    required this.textDisabled,
    required this.divider,
    required this.error,
    required this.success,
    required this.warning,
    required this.info,
  });

  factory ColorScheme.fromJson(Map<String, dynamic> json) {
    return ColorScheme(
      background: _hexToColor(json['background']),
      surface: _hexToColor(json['surface']),
      primary: _hexToColor(json['primary']),
      secondary: _hexToColor(json['secondary']),
      textPrimary: _hexToColor(json['text_primary']),
      textSecondary: _hexToColor(json['text_secondary']),
      textDisabled: _hexToColor(json['text_disabled']),
      divider: _hexToColor(json['divider']),
      error: _hexToColor(json['error']),
      success: _hexToColor(json['success']),
      warning: _hexToColor(json['warning']),
      info: _hexToColor(json['info']),
    );
  }

  static Color _hexToColor(String hex) {
    return Color(int.parse(hex.substring(1, 7), radix: 16) + 0xFF000000);
  }
}
```

### 2. Create Theme Service

```dart
// lib/services/theme_service.dart
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class ThemeService {
  final String baseUrl;
  final String? authToken;

  ThemeService({required this.baseUrl, this.authToken});

  Future<ThemeConfig> getThemeConfig() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/settings/theme'),
      headers: {
        'Authorization': 'Bearer $authToken',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return ThemeConfig.fromJson(data['theme_config']);
    } else {
      throw Exception('Failed to load theme configuration');
    }
  }

  Future<void> updateThemeSettings(Map<String, dynamic> updates) async {
    final response = await http.put(
      Uri.parse('$baseUrl/api/settings/theme'),
      headers: {
        'Authorization': 'Bearer $authToken',
        'Content-Type': 'application/json',
      },
      body: json.encode(updates),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to update theme settings');
    }
  }
}
```

### 3. Create Theme Provider

```dart
// lib/providers/theme_provider.dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class ThemeProvider extends ChangeNotifier {
  ThemeConfig? _themeConfig;
  ThemeMode _themeMode = ThemeMode.system;
  
  ThemeConfig? get themeConfig => _themeConfig;
  ThemeMode get themeMode => _themeMode;

  Future<void> loadThemeConfig() async {
    try {
      final service = ThemeService(baseUrl: 'YOUR_API_BASE_URL', authToken: 'TOKEN');
      _themeConfig = await service.getThemeConfig();
      
      // Set theme mode based on configuration
      switch (_themeConfig!.mode) {
        case 'light':
          _themeMode = ThemeMode.light;
          break;
        case 'dark':
          _themeMode = ThemeMode.dark;
          break;
        default:
          _themeMode = ThemeMode.system;
      }
      
      notifyListeners();
    } catch (e) {
      print('Error loading theme config: $e');
    }
  }

  ThemeData get lightTheme {
    if (_themeConfig == null) return _defaultLightTheme;
    
    final colors = _themeConfig!.colors.light;
    
    return ThemeData(
      brightness: Brightness.light,
      primaryColor: colors.primary,
      scaffoldBackgroundColor: colors.background,
      colorScheme: ColorScheme.light(
        primary: colors.primary,
        secondary: colors.secondary,
        surface: colors.surface,
        background: colors.background,
        error: colors.error,
      ),
      textTheme: TextTheme(
        bodyLarge: TextStyle(color: colors.textPrimary),
        bodyMedium: TextStyle(color: colors.textSecondary),
        displayLarge: TextStyle(color: colors.textPrimary),
        displayMedium: TextStyle(color: colors.textPrimary),
        displaySmall: TextStyle(color: colors.textPrimary),
        headlineLarge: TextStyle(color: colors.textPrimary),
        headlineMedium: TextStyle(color: colors.textPrimary),
        headlineSmall: TextStyle(color: colors.textPrimary),
        titleLarge: TextStyle(color: colors.textPrimary),
        titleMedium: TextStyle(color: colors.textPrimary),
        titleSmall: TextStyle(color: colors.textSecondary),
        labelLarge: TextStyle(color: colors.textPrimary),
        labelMedium: TextStyle(color: colors.textSecondary),
        labelSmall: TextStyle(color: colors.textDisabled),
        bodySmall: TextStyle(color: colors.textSecondary),
      ),
      dividerColor: colors.divider,
    );
  }

  ThemeData get darkTheme {
    if (_themeConfig == null) return _defaultDarkTheme;
    
    final colors = _themeConfig!.colors.dark;
    
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: colors.primary,
      scaffoldBackgroundColor: colors.background,
      colorScheme: ColorScheme.dark(
        primary: colors.primary,
        secondary: colors.secondary,
        surface: colors.surface,
        background: colors.background,
        error: colors.error,
      ),
      textTheme: TextTheme(
        bodyLarge: TextStyle(color: colors.textPrimary),
        bodyMedium: TextStyle(color: colors.textSecondary),
        displayLarge: TextStyle(color: colors.textPrimary),
        displayMedium: TextStyle(color: colors.textPrimary),
        displaySmall: TextStyle(color: colors.textPrimary),
        headlineLarge: TextStyle(color: colors.textPrimary),
        headlineMedium: TextStyle(color: colors.textPrimary),
        headlineSmall: TextStyle(color: colors.textPrimary),
        titleLarge: TextStyle(color: colors.textPrimary),
        titleMedium: TextStyle(color: colors.textPrimary),
        titleSmall: TextStyle(color: colors.textSecondary),
        labelLarge: TextStyle(color: colors.textPrimary),
        labelMedium: TextStyle(color: colors.textSecondary),
        labelSmall: TextStyle(color: colors.textDisabled),
        bodySmall: TextStyle(color: colors.textSecondary),
      ),
      dividerColor: colors.divider,
    );
  }

  // Default themes as fallback
  ThemeData get _defaultLightTheme => ThemeData.light();
  ThemeData get _defaultDarkTheme => ThemeData.dark();

  Future<void> updateThemeMode(String mode) async {
    try {
      final service = ThemeService(baseUrl: 'YOUR_API_BASE_URL', authToken: 'TOKEN');
      await service.updateThemeSettings({'default_theme_mode': mode});
      
      switch (mode) {
        case 'light':
          _themeMode = ThemeMode.light;
          break;
        case 'dark':
          _themeMode = ThemeMode.dark;
          break;
        default:
          _themeMode = ThemeMode.system;
      }
      
      notifyListeners();
    } catch (e) {
      print('Error updating theme mode: $e');
    }
  }
}
```

### 4. Integrate with Your App

```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (context) => ThemeProvider(),
      child: MyApp(),
    ),
  );
}

class MyApp extends StatefulWidget {
  @override
  _MyAppState createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  @override
  void initState() {
    super.initState();
    // Load theme configuration on app startup
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<ThemeProvider>(context, listen: false).loadThemeConfig();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, child) {
        return MaterialApp(
          title: 'LC Workflow System',
          theme: themeProvider.lightTheme,
          darkTheme: themeProvider.darkTheme,
          themeMode: themeProvider.themeMode,
          home: HomeScreen(),
        );
      },
    );
  }
}
```

## 🎯 Key Benefits

1. **Improved Text Readability**: Proper contrast ratios for both light and dark modes
2. **Consistent Theming**: Centralized color management from backend
3. **Accessibility Compliance**: WCAG AA standard contrast ratios
4. **User Preference Support**: Allow users to choose their preferred theme
5. **Easy Customization**: Admin can update theme colors without app updates

## 🔄 Migration Steps

1. **Initialize Theme Settings**: Call `/api/settings/initialize` (admin only) to create default theme settings
2. **Update Frontend Code**: Implement the Flutter integration code above
3. **Test Both Modes**: Verify light and dark mode appearance
4. **Customize Colors**: Use admin panel to adjust colors as needed

## 🎨 Color Customization

The color palettes are designed with proper contrast ratios:

### Light Mode Colors
- **Background**: #FFFFFF (Pure white)
- **Text Primary**: #212121 (Dark gray for high contrast)
- **Text Secondary**: #757575 (Medium gray)
- **Primary**: #2196F3 (Material Blue)

### Dark Mode Colors
- **Background**: #121212 (Material dark surface)
- **Text Primary**: #FFFFFF (Pure white)
- **Text Secondary**: #B3B3B3 (Light gray)
- **Primary**: #64B5F6 (Lighter blue for dark backgrounds)

## 🚨 Troubleshooting

### Common Issues

1. **Text not visible**: Check contrast ratios in theme settings
2. **Colors not updating**: Ensure API calls are successful and app restarts
3. **System theme not working**: Verify ThemeMode.system is properly handled

### API Error Codes

- **403**: User doesn't have permission (admin required for updates)
- **404**: Theme setting not found
- **400**: Invalid theme value (e.g., invalid color format)

## 📱 Testing Checklist

- [ ] Light mode displays properly
- [ ] Dark mode displays properly  
- [ ] System theme follows device setting
- [ ] Text has sufficient contrast
- [ ] All UI elements are visible in both modes
- [ ] Theme switching works smoothly
- [ ] Settings persist after app restart

This implementation should resolve the text color and dark mode issues you mentioned. The backend now provides comprehensive theme management that your Flutter frontend can consume for a consistent, accessible user experience.