# Address Format Update - Added Location Type Labels

## Summary
Updated the address formatting to include location type labels (ភូមិ, ឃុំ/សង្កាត់, ស្រុក/ក្រុង, ខេត្ត) before each location name for better clarity and readability.

## Changes Made

### File Updated
`lc-workflow-frontend/src/hooks/useAddressPicker.ts`

### Function Modified
`getFullAddress()` - Updated to include location type labels

## Format Comparison

### Before (Without Labels)
```
គោកចារ, ស្ពានស្រែង, ភ្នំស្រុក, បន្ទាយមានជ័យ
```

### After (With Labels)
```
ភូមិ គោកចារ ឃុំ/សង្កាត់ ស្ពានស្រែង ស្រុក/ក្រុង ភ្នំស្រុក ខេត្ត បន្ទាយមានជ័យ
```

## Implementation Details

### Khmer Labels
- **ភូមិ** - Village
- **ឃុំ/សង្កាត់** - Commune/Sangkat
- **ស្រុក/ក្រុង** - District/City
- **ខេត្ត** - Province

### English Labels
- **Village** - Village name
- **Commune** - Commune name
- **District** - District name
- **Province** - Province name

### Code Changes
```typescript
// Before:
if (address.village) {
  parts.push(language === 'km' ? address.village.name_km : address.village.name_en);
}

// After:
if (address.village) {
  const label = language === 'km' ? 'ភូមិ' : 'Village';
  const name = language === 'km' ? address.village.name_km : address.village.name_en;
  parts.push(`${label} ${name}`);
}
```

### Separator Change
- **Before**: Comma and space `, `
- **After**: Single space ` `

This makes the address more readable since each part now has its own label.

## Impact on All Pages

This change affects address display across the entire application:

### 1. Create Application Form
When user selects address:
```
Input field shows: ភូមិ គោកចារ ឃុំ/សង្កាត់ ស្ពានស្រែង ស្រុក/ក្រុង ភ្នំស្រុក ខេត្ត បន្ទាយមានជ័យ
```

### 2. Edit Application Form
When reopening address picker:
```
Preview shows: ភូមិ គោកចារ ឃុំ/សង្កាត់ ស្ពានស្រែង ស្រុក/ក្រុង ភ្នំស្រុក ខេត្ត បន្ទាយមានជ័យ
```

### 3. Application Detail/View Page
Address display:
```
🏠 Address / អាសយដ្ឋាន
ភូមិ គោកចារ ឃុំ/សង្កាត់ ស្ពានស្រែង ស្រុក/ក្រុង ភ្នំស្រុក ខេត្ត បន្ទាយមានជ័យ
```

### 4. Address Picker Modal
Preview at bottom:
```
📍 Selected Address:
ភូមិ គោកចារ ឃុំ/សង្កាត់ ស្ពានស្រែង ស្រុក/ក្រុង ភ្នំស្រុក ខេត្ត បន្ទាយមានជ័យ
```

### 5. Database Storage
Stored in `current_address` field:
```sql
current_address = "ភូមិ គោកចារ ឃុំ/សង្កាត់ ស្ពានស្រែង ស្រុក/ក្រុង ភ្នំស្រុក ខេត្ត បន្ទាយមានជ័យ"
```

## Benefits

1. **Clarity**: Users immediately understand what each part of the address represents
2. **Consistency**: Follows Cambodian address format conventions
3. **Readability**: Labels make it easier to parse the address visually
4. **Professional**: More formal and official-looking format
5. **Self-Documenting**: No need to explain the address structure

## Examples

### Full Address (All 4 Levels)
```
ភូមិ គោកចារ ឃុំ/សង្កាត់ ស្ពានស្រែង ស្រុក/ក្រុង ភ្នំស្រុក ខេត្ត បន្ទាយមានជ័យ
```

### Partial Address (Province and District Only)
```
ស្រុក/ក្រុង ភ្នំស្រុក ខេត្ត បន្ទាយមានជ័យ
```

### English Format
```
Village Kouk Char Commune Spean Sraeng District Phnum Srok Province Banteay Meanchey
```

## Backward Compatibility

### Existing Data
Old addresses without labels will remain in the database:
```
"គោកចារ, ស្ពានស្រែង, ភ្នំស្រុក, បន្ទាយមានជ័យ"
```

### New Data
New addresses will have labels:
```
"ភូមិ គោកចារ ឃុំ/សង្កាត់ ស្ពានស្រែង ស្រុក/ក្រុង ភ្នំស្រុក ខេត្ត បន្ទាយមានជ័យ"
```

Both formats are valid and will display correctly.

## Testing Checklist

✅ **Create New Application**:
- Select address → Shows with labels
- Save → Stores with labels in database

✅ **Edit Application**:
- Open address picker → Preview shows with labels
- Change address → New format with labels

✅ **View Application**:
- Address displays with labels
- Readable and clear

✅ **Address Picker Modal**:
- Preview at bottom shows with labels
- Updates as user selects locations

✅ **Both Languages**:
- Khmer: ភូមិ, ឃុំ/សង្កាត់, ស្រុក/ក្រុង, ខេត្ត
- English: Village, Commune, District, Province

## Technical Notes

- The change is centralized in one function (`getFullAddress`)
- All pages using this hook automatically get the new format
- No changes needed in individual components
- The location codes (province, district, commune, village) remain unchanged in the database
- Only the `current_address` display string is affected

This is a display-only change that improves user experience without affecting the underlying data structure.
