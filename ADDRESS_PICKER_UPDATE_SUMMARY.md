# Address Picker Update - Location Tree Integration

## Summary
Successfully integrated the JSON location tree data (province, district, commune, village) into the application form's address picker. The system now remembers the user's selection when re-opening the address picker and stores the structured address data in the database.

## Changes Made

### 1. Updated AddressField Component
**File**: `lc-workflow-frontend/app/applications/new/components/AddressField.tsx`

- Added `onAddressDataChange` callback prop to pass structured address data to parent
- Added `initialAddress` prop to remember previously selected address
- Updated to pass address codes (province, district, commune, village) to the modal
- The component now stores both the full address string AND the individual location codes

### 2. Updated CustomerInformationStep Component
**File**: `lc-workflow-frontend/app/applications/new/components/CustomerInformationStep.tsx`

- Added `onAddressDataChange` handler to update form values with structured address data
- Added `initialAddress` prop to pass current address codes to the AddressField
- Now updates province, district, commune, and village fields when user selects an address

### 3. Updated New Application Page
**File**: `lc-workflow-frontend/app/applications/new/page.tsx`

- Added province, district, commune, and village fields to API calls
- Both `createDraftApplication` and `handleSubmit` now include the structured address data
- The form now sends the location codes to the backend for storage

### 4. Updated Edit Application Page
**File**: `lc-workflow-frontend/app/applications/[id]/edit/page.tsx`

- Replaced textarea with AddressField component for better UX
- Added province, district, commune, and village to formData state
- Updated to load existing address codes from the application
- Added address fields to the update payload
- Imported AddressField component

### 5. Updated TypeScript Types
**File**: `lc-workflow-frontend/src/types/models.ts`

- Added `province`, `district`, `commune`, and `village` fields to `CustomerApplication` interface
- Added the same fields to `CustomerApplicationCreate` interface
- These changes ensure type safety across the application

## How It Works

### Data Flow

1. **User Selects Address**:
   - User clicks on the address field
   - AddressPickerModal opens with the location tree
   - User selects: Province → District → Commune → Village
   - Modal returns both full address string and individual codes

2. **Data Storage**:
   ```typescript
   {
     current_address: "ភូមិ X, ឃុំ Y, ស្រុក Z, ខេត្ត W",  // Full address string
     province: "01",      // Province code
     district: "0102",    // District code
     commune: "010201",   // Commune code
     village: "01020101"  // Village code
   }
   ```

3. **Data Retrieval**:
   - When editing, the system loads the stored codes
   - AddressField receives `initialAddress` with the codes
   - AddressPickerModal pre-selects the locations based on codes
   - User sees their previously selected address

### Location Data Structure

The system uses JSON files from `lc-workflow-frontend/src/location_map/`:
- `province.json` - 25 provinces
- `district.json` - Districts linked by province_code
- `commune.json` - Communes linked by district_code  
- `vilige.json` - Villages linked by commune_code

Each location has:
- `code`: Unique identifier
- `name_km`: Khmer name
- `name_en`: English name
- Parent code (province_code, district_code, or commune_code)

## Backend Integration

The backend already has the necessary fields in the schema:
```python
# Address Information
current_address: Optional[str] = None
province: Optional[str] = Field(None, max_length=100)
district: Optional[str] = Field(None, max_length=100)
commune: Optional[str] = Field(None, max_length=100)
village: Optional[str] = Field(None, max_length=100)
```

No backend changes were required - the fields were already available!

## Benefits

1. **Structured Data**: Address is stored in a structured format for better querying and reporting
2. **Consistency**: Users select from predefined locations, ensuring data consistency
3. **User Experience**: The system remembers selections, making editing easier
4. **Flexibility**: Both full address string and individual codes are available
5. **Reporting**: Can now generate reports by province, district, commune, or village

## Testing Recommendations

1. **Create New Application**:
   - Select an address using the picker
   - Verify all fields are saved correctly
   - Check that province, district, commune, and village codes are stored

2. **Edit Existing Application**:
   - Open an application with an address
   - Click the address field
   - Verify the previously selected location is pre-selected
   - Change the address and save
   - Verify the new address is saved correctly

3. **Data Validation**:
   - Check that the location codes match the selected names
   - Verify the full address string is correctly formatted
   - Test with different provinces and districts

## Future Enhancements

1. **Search Functionality**: Add search/filter in the address picker for faster selection
2. **Recent Addresses**: Show recently used addresses for quick selection
3. **Address Validation**: Validate that the codes match the full address string
4. **Bulk Import**: Support importing addresses from CSV with location codes
5. **Address Analytics**: Generate reports showing application distribution by location
