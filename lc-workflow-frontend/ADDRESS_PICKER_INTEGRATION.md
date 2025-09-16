# Address Picker Integration Guide

## ✅ Successfully Created Components

### 1. Core Components
- **AddressPicker.tsx** - Main cascading dropdown component
- **AddressFormField.tsx** - Form-ready wrapper component
- **AddressPickerExample.tsx** - Standalone demo component
- **UserRegistrationForm.tsx** - Complete form integration example

### 2. Utilities
- **useAddressPicker.ts** - Custom hook for state management
- **API route** - `/api/users/register` for handling form submissions

### 3. Demo Page
- **`/address-picker-demo`** - Live demo page showing both standalone and form integration

## ✅ Fixed Issues

1. **TypeScript Errors**: Fixed type mismatches between `null` and `undefined`
2. **Code Compatibility**: Handles mixed string/number codes in JSON data
3. **Build Errors**: Fixed lodash dependency and unrelated compilation issues
4. **Syntax Validation**: All components compile successfully

## 🚀 How to Use

### Quick Start
```bash
# Navigate to your project
cd lc-workflow-frontend

# Start development server
npm run dev

# Visit the demo page
# http://localhost:3000/address-picker-demo
```

### Basic Integration
```tsx
import AddressPicker from '@/components/AddressPicker';

function MyComponent() {
  const handleAddressChange = (address) => {
    console.log('Selected address:', address);
  };

  return (
    <AddressPicker
      onAddressChange={handleAddressChange}
      language="km" // or "en"
    />
  );
}
```

### Form Integration
```tsx
import AddressFormField from '@/components/AddressFormField';

function MyForm() {
  const [formData, setFormData] = useState({ address: {} });

  const handleAddressChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form>
      <AddressFormField
        label="Address"
        name="address"
        value={formData.address}
        onChange={handleAddressChange}
        required
      />
    </form>
  );
}
```

## 📊 Data Structure

### Input (JSON Files)
- `province.json` - Provincial data
- `district.json` - District data
- `commune.json` - Commune data
- `vilige.json` - Village data

### Output Format
```javascript
{
  // Raw location objects
  province: { code: "01", name_km: "បន្ទាយមានជ័យ", name_en: "Banteay Meanchey" },
  district: { code: "0102", name_km: "មង្គលបូរី", name_en: "Mongkol Borei" },
  commune: { code: "010201", name_km: "បន្ទាយនាង", name_en: "Banteay Neang" },
  village: { code: "01020101", name_km: "អូរធំ", name_en: "Ou Thum" },
  
  // Formatted for forms
  province_code: "01",
  district_code: "0102", 
  commune_code: "010201",
  village_code: "01020101",
  full_address_km: "អូរធំ, បន្ទាយនាង, មង្គលបូរី, បន្ទាយមានជ័យ",
  full_address_en: "Ou Thum, Banteay Neang, Mongkol Borei, Banteay Meanchey"
}
```

## 🎯 Features

- ✅ **Hierarchical Selection**: Province → District → Commune → Village
- ✅ **Bilingual Support**: Khmer and English
- ✅ **Cascading Dropdowns**: Auto-filters based on parent selection
- ✅ **TypeScript Support**: Fully typed
- ✅ **Form Integration**: Easy validation and error handling
- ✅ **Accessibility**: Proper ARIA labels and keyboard navigation
- ✅ **Responsive Design**: Works on mobile and desktop
- ✅ **No External Dependencies**: Uses only React and Heroicons

## 🔧 Customization

### Styling
The components use Tailwind CSS. Customize by:
- Passing `className` prop
- Modifying the component files directly
- Using CSS modules or styled-components

### Language
Switch between Khmer and English:
```tsx
<AddressPicker language="en" /> // English
<AddressPicker language="km" /> // Khmer (default)
```

### Validation
Add custom validation rules in your form:
```tsx
const validateAddress = (address) => {
  if (!address.village_code) {
    return 'Please select complete address';
  }
  return null;
};
```

## 📝 Next Steps

1. **Test the demo page**: Visit `/address-picker-demo` to see it in action
2. **Integrate into your forms**: Use `AddressFormField` in existing forms
3. **Customize styling**: Modify CSS classes to match your design
4. **Add validation**: Implement custom validation rules as needed
5. **Backend integration**: Use the provided API route as a template

## 🐛 Troubleshooting

### Common Issues
1. **JSON import errors**: Ensure `resolveJsonModule: true` in tsconfig.json
2. **Type errors**: Make sure all interfaces match between components
3. **Build errors**: Check that all dependencies are installed
4. **Styling issues**: Verify Tailwind CSS is properly configured

### Support
- Check the demo page for working examples
- Review the comprehensive README in the components folder
- All components are fully typed for better IDE support