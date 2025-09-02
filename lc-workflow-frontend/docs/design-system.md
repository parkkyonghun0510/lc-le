# Modern Design System Documentation

## Overview

This document outlines the technical specifications and implementation guidelines for the modern design system used in the LC Workflow Frontend application. The design system emphasizes clean architecture, consistent styling, and comprehensive dark mode support.

## Design Principles

### 1. Consistency
- Uniform spacing using Tailwind CSS spacing scale
- Consistent color palette with semantic naming
- Standardized component patterns across the application

### 2. Accessibility
- Full dark mode support with proper contrast ratios
- Bilingual support (English/Khmer) with appropriate typography
- Semantic HTML structure and ARIA labels

### 3. Responsiveness
- Mobile-first approach with progressive enhancement
- Flexible grid systems that adapt to different screen sizes
- Touch-friendly interactive elements

## Color System

### Light Mode Colors
```css
/* Primary Colors */
--primary-50: #eff6ff;    /* Light blue backgrounds */
--primary-100: #dbeafe;   /* Card backgrounds */
--primary-600: #2563eb;   /* Primary actions */
--primary-700: #1d4ed8;   /* Hover states */

/* Neutral Colors */
--gray-50: #f9fafb;       /* Light backgrounds */
--gray-100: #f3f4f6;      /* Card borders */
--gray-200: #e5e7eb;      /* Dividers */
--gray-600: #4b5563;      /* Secondary text */
--gray-900: #111827;      /* Primary text */
```

### Dark Mode Colors
```css
/* Dark Mode Equivalents */
--dark-gray-700: #374151; /* Card backgrounds */
--dark-gray-800: #1f2937; /* Main backgrounds */
--dark-gray-600: #4b5563; /* Borders */
--dark-blue-400: #60a5fa; /* Primary actions */
--dark-white: #ffffff;    /* Primary text */
--dark-gray-400: #9ca3af; /* Secondary text */
```

## Component Patterns

### 1. Card Components

#### Basic Card Structure
```jsx
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
  {/* Card content */}
</div>
```

#### Card with Header
```jsx
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
  <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
    <div className="flex items-center space-x-3">
      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg">
        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Title</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Subtitle</p>
      </div>
    </div>
  </div>
  <div className="p-6">
    {/* Card body content */}
  </div>
</div>
```

### 2. Interactive Elements

#### Primary Button
```jsx
<button className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md text-sm">
  Button Text
</button>
```

#### Secondary Button
```jsx
<button className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 text-sm">
  Button Text
</button>
```

### 3. Status Indicators

#### Status Badges
```jsx
{/* Success */}
<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400">
  Success
</span>

{/* Warning */}
<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-400">
  Warning
</span>

{/* Error */}
<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-400">
  Error
</span>
```

## Layout Patterns

### 1. Grid Systems

#### Responsive Grid
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
  {/* Grid items */}
</div>
```

#### Dashboard Layout
```jsx
<div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
  <div className="xl:col-span-2">
    {/* Main content */}
  </div>
  <div>
    {/* Sidebar content */}
  </div>
</div>
```

### 2. Spacing System

- **xs**: 0.25rem (4px) - Fine adjustments
- **sm**: 0.5rem (8px) - Small spacing
- **md**: 1rem (16px) - Default spacing
- **lg**: 1.5rem (24px) - Large spacing
- **xl**: 2rem (32px) - Extra large spacing

## Typography

### Headings
```jsx
{/* Page Title */}
<h1 className="text-xl font-bold text-gray-900 dark:text-white">

{/* Section Title */}
<h2 className="text-lg font-semibold text-gray-900 dark:text-white">

{/* Subsection Title */}
<h3 className="text-base font-medium text-gray-900 dark:text-white">
```

### Body Text
```jsx
{/* Primary Text */}
<p className="text-sm text-gray-900 dark:text-white">

{/* Secondary Text */}
<p className="text-sm text-gray-600 dark:text-gray-400">

{/* Caption Text */}
<p className="text-xs text-gray-500 dark:text-gray-400">
```

## Animation and Transitions

### Standard Transitions
```css
/* Hover Effects */
transition-all duration-200

/* Scale Animations */
group-hover:scale-110 transition-transform duration-200

/* Color Transitions */
transition-colors duration-200

/* Shadow Transitions */
hover:shadow-md transition-shadow duration-200
```

### Loading States
```jsx
{/* Skeleton Loading */}
<div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-6 w-20 rounded-lg"></div>

{/* Pulse Indicator */}
<div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
```

## Bilingual Support

### Text Structure
```jsx
<div>
  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
    English Title
  </h3>
  <p className="text-sm text-gray-600 dark:text-gray-400">
    ចំណងជើងខ្មែរ
  </p>
</div>
```

## Implementation Guidelines

### 1. Dark Mode Implementation
- Always provide dark mode variants for all colors
- Use semantic color names rather than specific color values
- Test contrast ratios for accessibility compliance

### 2. Component Development
- Follow the established card patterns for consistency
- Use the standardized spacing system
- Implement hover states and transitions
- Include proper TypeScript types

### 3. Responsive Design
- Start with mobile-first approach
- Use Tailwind's responsive prefixes (sm:, md:, lg:, xl:)
- Test on multiple screen sizes

### 4. Performance Considerations
- Use CSS-in-JS sparingly, prefer Tailwind classes
- Implement proper loading states
- Optimize images and icons

## Code Examples

### Complete Dashboard Card Example
```jsx
const DashboardCard = ({ title, khmerTitle, value, icon: Icon, color, change, changeType }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          color === 'blue' ? 'bg-blue-100 dark:bg-blue-900' :
          color === 'green' ? 'bg-green-100 dark:bg-green-900' :
          color === 'purple' ? 'bg-purple-100 dark:bg-purple-900' :
          'bg-orange-100 dark:bg-orange-900'
        } group-hover:scale-110 transition-transform duration-200`}>
          <Icon className={`h-6 w-6 ${
            color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
            color === 'green' ? 'text-green-600 dark:text-green-400' :
            color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
            'text-orange-600 dark:text-orange-400'
          }`} />
        </div>
        <div className={`text-xs px-2 py-1 rounded-full font-medium ${
          changeType === 'positive' 
            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400' 
            : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-400'
        }`}>
          {change}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {khmerTitle}
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
          {value}
        </p>
      </div>
    </div>
  );
};
```

## Maintenance and Updates

### Version Control
- Document all design system changes in this file
- Use semantic versioning for major updates
- Maintain backward compatibility when possible

### Testing
- Test all components in both light and dark modes
- Verify responsive behavior across devices
- Validate accessibility compliance
- Check bilingual text rendering

### Future Enhancements
- Consider implementing CSS custom properties for easier theming
- Explore component library extraction for reusability
- Add animation presets for consistent motion design
- Implement design tokens for better maintainability