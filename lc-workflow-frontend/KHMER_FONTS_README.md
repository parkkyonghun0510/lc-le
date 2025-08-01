# Google Fonts Khmer Implementation

This document explains how Google Fonts Khmer (Noto Sans Khmer) has been implemented in the LC Workflow frontend.

## Overview

The frontend now supports both Khmer and English fonts using Google Fonts:
- **Khmer Font**: Noto Sans Khmer (អក្សរខ្មែរ)
- **English Font**: Inter (English text)

## Implementation Details

### 1. Font Configuration

**File**: `src/app/layout.tsx`
```typescript
import { Inter, Noto_Sans_Khmer } from "next/font/google";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter"
});

const notoSansKhmer = Noto_Sans_Khmer({ 
  subsets: ["khmer"],
  variable: "--font-khmer",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"]
});
```

### 2. CSS Variables

**File**: `src/app/globals.css`
```css
:root {
  --font-inter: var(--font-inter);
  --font-khmer: var(--font-khmer);
}

@theme inline {
  --font-sans: var(--font-inter), system-ui, sans-serif;
  --font-khmer: var(--font-khmer), "Noto Sans Khmer", system-ui, sans-serif;
}
```

### 3. Utility Classes

Available CSS classes for font usage:
- `.font-khmer` - Khmer font family
- `.font-english` - English font family
- `.text-khmer-xs` through `.text-khmer-4xl` - Responsive font sizes

## Usage Methods

### Method 1: CSS Classes

```jsx
// Khmer text
<p className="font-khmer text-base">
  សូមអភ័យទោស ខ្ញុំចង់ដាក់ពាក្យសុំកម្ចី។
</p>

// English text
<p className="font-english text-base">
  Please excuse me, I would like to submit a loan application.
</p>

// Mixed text
<p className="text-base">
  <span className="font-khmer">ឈ្មោះ: </span>
  <span className="font-english">Sok Vanna</span>
</p>
```

### Method 2: React Components

**File**: `src/components/ui/KhmerText.tsx`

```jsx
import { KhmerText, EnglishText } from '@/components/ui/KhmerText';

// Khmer text component
<KhmerText className="text-lg font-semibold">
  ពាក្យសុំកម្ចី
</KhmerText>

// English text component
<EnglishText className="text-base">
  Loan Application
</EnglishText>

// Mixed usage
<p>
  <KhmerText>ឈ្មោះ: </KhmerText>
  <EnglishText>Sok Vanna</EnglishText>
</p>
```

### Method 3: Inline Styles

```jsx
<p style={{ fontFamily: 'var(--font-khmer)' }}>
  អត្ថបទជាភាសាខ្មែរ
</p>

<p style={{ fontFamily: 'var(--font-inter)' }}>
  English text
</p>
```

## Font Sizes

Custom Khmer font sizes are available:

```css
.text-khmer-xs    /* 0.75rem */
.text-khmer-sm    /* 0.875rem */
.text-khmer-base  /* 1rem */
.text-khmer-lg    /* 1.125rem */
.text-khmer-xl    /* 1.25rem */
.text-khmer-2xl   /* 1.5rem */
.text-khmer-3xl   /* 1.875rem */
.text-khmer-4xl   /* 2.25rem */
```

## Examples

### Application Status Badges

```jsx
<span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
  <KhmerText>កំពុងពិនិត្យ</KhmerText>
</span>
```

### Form Labels

```jsx
<label className="block text-sm font-medium text-gray-700 mb-1">
  <KhmerText>ឈ្មោះជាភាសាខ្មែរ</KhmerText>
</label>
```

### Mixed Content

```jsx
<div className="space-y-3">
  <div className="flex justify-between">
    <KhmerText className="text-sm text-gray-600">ឈ្មោះ:</KhmerText>
    <EnglishText className="text-sm font-medium text-gray-900">Sok Vanna</EnglishText>
  </div>
  
  <div className="flex justify-between">
    <KhmerText className="text-sm text-gray-600">ចំនួនទឹកប្រាក់:</KhmerText>
    <EnglishText className="text-lg font-bold text-green-600">$50,000 USD</EnglishText>
  </div>
</div>
```

## Demo Page

Visit `/font-demo` to see all font implementations in action.

## Browser Support

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support

## Performance

- Fonts are loaded from Google Fonts CDN
- Fonts are optimized for web use
- Fallback fonts are provided for better loading experience

## Best Practices

1. **Use KhmerText component** for Khmer content
2. **Use EnglishText component** for English content
3. **Mix fonts appropriately** for bilingual content
4. **Test on different devices** to ensure proper rendering
5. **Consider font loading** for better user experience

## Troubleshooting

### Font Not Loading
- Check internet connection
- Verify Google Fonts is accessible
- Check browser console for errors

### Text Not Displaying Properly
- Ensure proper font-family is applied
- Check if Khmer text is properly encoded
- Verify CSS classes are correctly applied

### Performance Issues
- Consider font preloading for critical fonts
- Use font-display: swap for better loading
- Optimize font weights based on usage

## Future Enhancements

- [ ] Add more Khmer font options
- [ ] Implement font loading optimization
- [ ] Add font fallback strategies
- [ ] Create font loading indicators
- [ ] Add font size utilities for different screen sizes 