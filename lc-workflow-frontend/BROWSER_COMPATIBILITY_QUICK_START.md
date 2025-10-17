# Browser Compatibility Detection - Quick Start Guide

## What It Does

Automatically detects the user's browser and version, then displays a warning banner if they're using an unsupported version.

## Supported Browsers

| Browser | Minimum Version |
|---------|----------------|
| Chrome  | 90+            |
| Firefox | 88+            |
| Safari  | 14+            |
| Edge    | 90+            |

## How It Works

1. **On app load**: Browser is detected automatically
2. **If unsupported**: Warning banner appears at top of page
3. **User can dismiss**: Click X button to hide warning
4. **Dismissal persists**: Warning won't show again (stored in localStorage)

## Files

- **Utility**: `src/utils/browserDetection.ts`
- **Component**: `src/components/BrowserCompatibilityWarning.tsx`
- **Integration**: `src/components/AppInitializer.tsx`
- **Tests**: `src/utils/__tests__/browserDetection.test.ts`
- **Demo**: `app/browser-compatibility-demo/page.tsx`

## Quick Usage

### Detect Browser

```typescript
import { detectBrowser } from '@/utils/browserDetection';

const browser = detectBrowser();
console.log(browser.name);        // 'chrome', 'firefox', 'safari', 'edge'
console.log(browser.version);     // e.g., 95
console.log(browser.isSupported); // true or false
```

### Check Support

```typescript
import { checkBrowserSupport } from '@/utils/browserDetection';

const isSupported = checkBrowserSupport('chrome', 95);
// Returns true if Chrome 95 meets minimum requirements
```

### Manage Dismissal

```typescript
import { 
  isWarningDismissed, 
  dismissWarning, 
  clearWarningDismissal 
} from '@/utils/browserDetection';

// Check if dismissed
if (isWarningDismissed()) {
  console.log('User dismissed warning');
}

// Dismiss warning
dismissWarning();

// Clear dismissal (for testing)
clearWarningDismissal();
```

## Testing

### Run Tests

```bash
npm test -- browserDetection
npm test -- BrowserCompatibilityWarning
```

### Manual Testing

1. **Clear dismissal:**
   ```javascript
   localStorage.removeItem('browser-compatibility-warning-dismissed');
   ```

2. **Mock old browser:**
   ```javascript
   Object.defineProperty(navigator, 'userAgent', {
     value: 'Mozilla/5.0 Chrome/85.0',
     configurable: true
   });
   ```

3. **Refresh page** - Warning should appear

4. **Click X** - Warning disappears

5. **Refresh again** - Warning stays hidden

### Demo Page

Visit `/browser-compatibility-demo` to see:
- Current browser detection
- Supported browsers list
- Dismissal status
- Test commands for different browsers

## Configuration

To change minimum versions, edit `src/utils/browserDetection.ts`:

```typescript
const MINIMUM_VERSIONS: MinimumVersions = {
  chrome: 90,
  firefox: 88,
  safari: 14,
  edge: 90,
};
```

## Accessibility

✅ WCAG 2.1 AA compliant  
✅ Screen reader compatible  
✅ Keyboard accessible  
✅ High contrast colors  
✅ Focus indicators visible  

## Documentation

- **Full README**: `src/utils/BROWSER_COMPATIBILITY_README.md`
- **Implementation Summary**: `TASK_19_BROWSER_COMPATIBILITY_IMPLEMENTATION.md`
- **Requirements**: `.kiro/specs/permission-management-system/requirements.md` (Requirement 15)

## Support

For issues or questions:
1. Check the full README
2. Review test files for examples
3. Visit the demo page
4. Check browser console for detection results
