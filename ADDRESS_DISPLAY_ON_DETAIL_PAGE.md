# Address Information Display on Application Detail Page

## Summary
Added address information display to the application detail/view page, showing both the full address string and the structured location data (province, district, commune, village).

## Changes Made

### File Updated
`lc-workflow-frontend/app/applications/[id]/page.tsx`

### Location
Added address information section within the Customer Information card, after the personal details and before the Loan Details card.

## Implementation

### Layout Structure
```
Customer Information Card
├── Personal Details (Name, Phone, ID, DOB)
└── Address Information Section (NEW)
    ├── Full Address (full width)
    ├── Village
    ├── Commune
    ├── District
    └── Province
```

### Features

#### 1. Conditional Display
```typescript
{(application.current_address || application.province || 
  application.district || application.commune || application.village) && (
  // Show address section
)}
```
- Only shows if at least one address field has data
- Prevents empty section from appearing

#### 2. Section Header
- Icon: HomeIcon (house icon)
- Bilingual title: "Address Information / ព័ត៌មានអាសយដ្ឋាន"
- Separated from personal details with border-top

#### 3. Responsive Grid Layout
```typescript
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
```
- Mobile: Single column
- Desktop: Two columns
- Full address spans both columns

#### 4. Individual Fields
Each field uses the existing `InfoCard` component:
- **Full Address**: Spans 2 columns, shows complete address string
- **Village** (ភូមិ): Shows village code
- **Commune** (ឃុំ/សង្កាត់): Shows commune code
- **District** (ស្រុក/ក្រុង): Shows district code
- **Province** (ខេត្ត): Shows province code

#### 5. Conditional Field Display
Each field only shows if it has data:
```typescript
{application.village && (
  <InfoCard ... />
)}
```

## Visual Design

### Section Header
```
🏠 Address Information / ព័ត៌មានអាសយដ្ឋាន
─────────────────────────────────────────────
```

### Field Layout (Desktop)
```
┌─────────────────────────────────────────────┐
│ 🏠 Full Address                             │
│ គោកចារ, ស្ពានស្រែង, ភ្នំស្រុក, បន្ទាយមានជ័យ │
└─────────────────────────────────────────────┘

┌──────────────────────┐ ┌──────────────────────┐
│ 🏠 Village           │ │ 🏠 Commune           │
│ 01030404             │ │ 010304               │
└──────────────────────┘ └──────────────────────┘

┌──────────────────────┐ ┌──────────────────────┐
│ 🏠 District          │ │ 🏠 Province          │
│ 0103                 │ │ 01                   │
└──────────────────────┘ └──────────────────────┘
```

## Data Flow

### From Database
```json
{
  "current_address": "គោកចារ, ស្ពានស្រែង, ភ្នំស្រុក, បន្ទាយមានជ័យ",
  "province": "01",
  "district": "0103",
  "commune": "010304",
  "village": "01030404"
}
```

### Display
- **Full Address**: Human-readable string for quick reference
- **Location Codes**: Structured data for reporting and filtering

## Benefits

1. **Complete Information**: Shows both human-readable and structured data
2. **Flexible Display**: Only shows fields that have data
3. **Consistent Design**: Uses existing InfoCard component
4. **Responsive**: Works on mobile and desktop
5. **Bilingual**: Labels in both English and Khmer
6. **Visual Hierarchy**: Clear section separation with header

## Future Enhancements

### Option 1: Show Location Names Instead of Codes
Currently shows codes (01, 0103, etc.). Could enhance to show names:
```typescript
// Instead of: "01"
// Show: "បន្ទាយមានជ័យ (01)"
```

### Option 2: Add Map Integration
Could add a map icon that opens Google Maps with the address

### Option 3: Copy Address Button
Add a button to copy the full address to clipboard

### Option 4: Address Verification Badge
Show a badge if the address has been verified

## Testing Checklist

✅ **With Full Address Data**:
- Shows all 5 fields (full address + 4 location codes)
- Layout is responsive
- Icons display correctly

✅ **With Partial Address Data**:
- Only shows fields that have data
- No empty cards displayed
- Section still looks balanced

✅ **With No Address Data**:
- Entire address section is hidden
- No empty space or borders shown

✅ **Dark Mode**:
- Colors and borders adapt correctly
- Text remains readable

## Integration Points

This display integrates with:
- ✅ Address picker (create/edit forms)
- ✅ Location JSON data (province, district, commune, village)
- ✅ Backend API (stores all address fields)
- ✅ Existing InfoCard component
- ✅ Application detail page layout

The address information is now fully integrated across create, edit, and view pages!
