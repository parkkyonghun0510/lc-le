# Browser Compatibility Detection

This module provides browser detection and compatibility checking for the LC Workflow application.

## Overview

The browser compatibility system detects the user's browser and version, then displays a warning banner if they're using an unsupported version. The warning can be dismissed and the dismissal is stored in localStorage.

## Features

- ✅ Automatic browser detection on app initialization
- ✅ Support for Chrome, Firefox, Safari, and Edge
- ✅ Configurable minimum version requirements
- ✅ Dismissible warning banner with localStorage persistence
- ✅ Accessible UI with ARIA labels and keyboard navigation
- ✅ Dark mode support
- ✅ Comprehensive test coverage

## Supported Browsers

| Browser | Minimum Version |
|---------|----------------|
| Chrome  | 90+            |
| Firefox | 88+            |
| Safari  | 14+            |
| Edge    | 90+            |

## Architecture

### Components

1. **BrowserCompatibilityWarning** (`src/components/BrowserCompatibilityWarning.tsx`)
   - React component that displays the warning banner
   - Automatically detects browser on mount
   - Shows warning only for unsupported browsers
   - Respects dismissal state from localStorage

2. **browserDetection** (`src/utils/browserDetection.ts`)
   - Core utility functions for browser detection
   - Version checking logic
   - localStorage management for dismissal state

### Integration

The warning is integrated into the `AppInitializer` component, which wraps the entire application:

```tsx
// src/components/AppInitializer.tsx
export function AppInitializer({ children }: AppInitializerProps) {
  // ... other initialization logic
  
  return (
    <>
      <BrowserCompatibilityWarning />
      {children}
    </>
  );
}
```

## Usage

### Basic Usage

The browser compatibility warning is automatically enabled for all users. No additional setup is required.

### Detecting Browser Programmatically

```typescript
import { detectBrowser } from '@/utils/browserDetection';

const browser = detectBrowser();
console.log(browser.name);        // 'chrome', 'firefox', 'safari', 'edge', or 'unknown'
console.log(browser.version);     // e.g., 95
console.log(browser.isSupported); // true or false
```

### Checking Browser Support

```typescript
import { checkBrowserSupport } from '@/utils/browserDetection';

const isSupported = checkBrowserSupport('chrome', 95);
// Returns true if Chrome 95 meets minimum requirements
```

### Getting Minimum Version

```typescript
import { getMinimumVersion } from '@/utils/browserDetection';

const minVersion = getMinimumVersion('chrome');
// Returns 90
```

### Managing Warning Dismissal

```typescript
import { 
  isWarningDismissed, 
  dismissWarning, 
  clearWarningDismissal 
} from '@/utils/browserDetection';

// Check if warning was dismissed
if (isWarningDismissed()) {
  console.log('User dismissed the warning');
}

// Dismiss the warning
dismissWarning();

// Clear dismissal (for testing)
clearWarningDismissal();
```

## Configuration

To change the minimum supported versions, edit the `MINIMUM_VERSIONS` constant in `src/utils/browserDetection.ts`:

```typescript
const MINIMUM_VERSIONS: MinimumVersions = {
  chrome: 90,
  firefox: 88,
  safari: 14,
  edge: 90,
};
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run browser detection tests only
npm test browserDetection

# Run component tests only
npm test BrowserCompatibilityWarning
```

### Test Coverage

- ✅ Browser detection for Chrome, Firefox, Safari, Edge
- ✅ Version parsing from user agent strings
- ✅ Support checking for all browsers
- ✅ Warning dismissal and localStorage persistence
- ✅ Component rendering and interaction
- ✅ Accessibility attributes

### Manual Testing

To manually test the warning banner:

1. **Clear dismissal state:**
   ```javascript
   localStorage.removeItem('browser-compatibility-warning-dismissed');
   ```

2. **Mock an old browser:**
   - Open DevTools Console
   - Run: `Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 Chrome/85.0', configurable: true })`
   - Refresh the page

3. **Test dismissal:**
   - Click the X button
   - Refresh the page
   - Warning should not appear

## Browser Detection Logic

### User Agent Parsing

The system parses the `navigator.userAgent` string to identify the browser:

1. **Edge**: Looks for `Edg/` in user agent (Chromium-based Edge)
2. **Chrome**: Looks for `Chrome/` (but not `Edg/`)
3. **Firefox**: Looks for `Firefox/`
4. **Safari**: Looks for `Safari/` (but not `Chrome/`)

### Version Extraction

Version numbers are extracted using regex patterns:
- Chrome: `/Chrome\/(\d+)/`
- Firefox: `/Firefox\/(\d+)/`
- Safari: `/Version\/(\d+)/`
- Edge: `/Edg\/(\d+)/`

### Unknown Browsers

Browsers that don't match any pattern are marked as `unknown` and considered unsupported.

## Accessibility

The warning banner follows WCAG 2.1 AA standards:

- ✅ `role="alert"` for screen reader announcement
- ✅ `aria-live="polite"` for non-intrusive updates
- ✅ `aria-label` on dismiss button
- ✅ Keyboard accessible (Tab, Enter, Escape)
- ✅ Sufficient color contrast (4.5:1 minimum)
- ✅ Focus indicators visible

## Styling

The warning uses Tailwind CSS with dark mode support:

- **Light mode**: Yellow background (`bg-yellow-50`)
- **Dark mode**: Dark yellow background (`dark:bg-yellow-900/20`)
- **Fixed positioning**: Top of viewport (`fixed top-0`)
- **High z-index**: Above other content (`z-50`)

## Troubleshooting

### Warning doesn't appear

1. Check if browser is actually unsupported
2. Clear localStorage: `localStorage.removeItem('browser-compatibility-warning-dismissed')`
3. Check browser console for errors

### Warning appears incorrectly

1. Verify user agent string: `console.log(navigator.userAgent)`
2. Check detection logic in `detectBrowser()`
3. Verify minimum version requirements

### Tests failing

1. Ensure Jest environment is configured correctly
2. Check that localStorage is mocked in tests
3. Verify user agent mocking works in test environment

## Future Enhancements

Potential improvements for future versions:

- [ ] Add support for more browsers (Opera, Brave, etc.)
- [ ] Provide download links for browser updates
- [ ] Show different messages for mobile browsers
- [ ] Add telemetry to track browser usage
- [ ] Implement feature detection instead of version checking
- [ ] Add automatic browser update checking

## Related Files

- `src/components/BrowserCompatibilityWarning.tsx` - Warning banner component
- `src/utils/browserDetection.ts` - Browser detection utilities
- `src/components/AppInitializer.tsx` - App initialization wrapper
- `src/utils/__tests__/browserDetection.test.ts` - Utility tests
- `src/components/__tests__/BrowserCompatibilityWarning.test.tsx` - Component tests

## Requirements

This implementation satisfies the following requirements from the Permission Management System spec:

- **15.1**: Function correctly on Chrome 90+
- **15.2**: Function correctly on Firefox 88+
- **15.3**: Function correctly on Safari 14+
- **15.4**: Function correctly on Edge 90+
- **15.5**: Display warning on unsupported browsers with supported versions list

## Support

For issues or questions about browser compatibility:

1. Check this README
2. Review test files for examples
3. Check browser console for detection results
4. Contact the development team
