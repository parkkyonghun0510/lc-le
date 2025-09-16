# Address Picker Component

A comprehensive address picker component for Cambodian administrative divisions (Province → District → Commune → Village) with bilingual support (Khmer/English).

## Features

- **Hierarchical Selection**: Province → District → Commune → Village
- **Bilingual Support**: Khmer and English labels and data
- **Cascading Dropdowns**: Automatically filters child locations based on parent selection
- **TypeScript Support**: Fully typed for better development experience
- **Flexible API**: Multiple usage patterns for different needs
- **Form Integration**: Easy integration with forms and validation
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Components

### 1. AddressPicker (Main Component)

The core address picker component with cascading dropdowns.

```tsx
import AddressPicker from './components/AddressPicker';

<AddressPicker
  onAddressChange={(address) => {
    console.log('Selected address:', address);
  }}
  language="km" // or "en"
  initialAddress={{
    province_code: "01",
    district_code: "0102"
  }}
/>
```

### 2. AddressFormField (Form Integration)

A form-ready wrapper that handles value formatting for forms.

```tsx
import AddressFormField from './components/AddressFormField';

<AddressFormField
  label="Address"
  name="address"
  value={formData.address}
  onChange={(name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }}
  language="km"
  required
  error={errors.address}
/>
```

### 3. useAddressPicker Hook

A custom hook for managing address state and utilities.

```tsx
import { useAddressPicker } from './hooks/useAddressPicker';

const MyComponent = () => {
  const {
    address,
    handleAddressChange,
    getFullAddress,
    getAddressCodes,
    isComplete,
    reset
  } = useAddressPicker();

  return (
    <div>
      <AddressPicker onAddressChange={handleAddressChange} />
      <p>Full Address: {getFullAddress('km')}</p>
      <p>Complete: {isComplete ? 'Yes' : 'No'}</p>
    </div>
  );
};
```

## Props Reference

### AddressPicker Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onAddressChange` | `(address: AddressData) => void` | Required | Callback when address selection changes |
| `initialAddress` | `InitialAddress` | `undefined` | Initial address codes to pre-select |
| `language` | `'km' \| 'en'` | `'km'` | Display language |
| `className` | `string` | `''` | Additional CSS classes |

### AddressFormField Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | `undefined` | Field label |
| `name` | `string` | Required | Field name for form handling |
| `value` | `AddressCodes` | `undefined` | Current field value |
| `onChange` | `(name: string, value: FormattedAddress) => void` | Required | Change handler |
| `language` | `'km' \| 'en'` | `'km'` | Display language |
| `required` | `boolean` | `false` | Whether field is required |
| `error` | `string` | `undefined` | Error message to display |
| `className` | `string` | `''` | Additional CSS classes |

## Data Types

```typescript
interface LocationItem {
  type: string;
  code: string;
  name_km: string;
  name_en: string;
  province_code?: string;
  district_code?: string;
  commune_code?: string;
}

interface AddressData {
  province?: LocationItem;
  district?: LocationItem;
  commune?: LocationItem;
  village?: LocationItem;
}

interface AddressCodes {
  province_code?: string;
  district_code?: string;
  commune_code?: string;
  village_code?: string;
}

interface FormattedAddress extends AddressCodes {
  full_address_km?: string;
  full_address_en?: string;
}
```

## Usage Examples

### Basic Usage

```tsx
import React, { useState } from 'react';
import AddressPicker from './components/AddressPicker';

const MyForm = () => {
  const [selectedAddress, setSelectedAddress] = useState({});

  return (
    <form>
      <AddressPicker
        onAddressChange={setSelectedAddress}
        language="km"
      />
      <button type="submit">Submit</button>
    </form>
  );
};
```

### With Form Validation

```tsx
import React, { useState } from 'react';
import AddressFormField from './components/AddressFormField';

const UserRegistration = () => {
  const [formData, setFormData] = useState({
    name: '',
    address: {}
  });
  const [errors, setErrors] = useState({});

  const handleAddressChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user makes selection
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.address.village_code) {
      newErrors.address = 'Please select complete address';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      if (validateForm()) {
        console.log('Form data:', formData);
      }
    }}>
      <AddressFormField
        label="Your Address"
        name="address"
        value={formData.address}
        onChange={handleAddressChange}
        required
        error={errors.address}
      />
      <button type="submit">Register</button>
    </form>
  );
};
```

### With Custom Hook

```tsx
import React from 'react';
import AddressPicker from './components/AddressPicker';
import { useAddressPicker } from './hooks/useAddressPicker';

const AddressManager = () => {
  const {
    address,
    handleAddressChange,
    getFullAddress,
    isComplete,
    reset
  } = useAddressPicker();

  const saveAddress = () => {
    if (isComplete) {
      const addressData = {
        codes: getAddressCodes(),
        display: {
          km: getFullAddress('km'),
          en: getFullAddress('en')
        }
      };
      
      // Save to API
      fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressData)
      });
    }
  };

  return (
    <div>
      <AddressPicker onAddressChange={handleAddressChange} />
      
      <div className="mt-4">
        <p>Selected: {getFullAddress('km')}</p>
        <div className="space-x-2">
          <button 
            onClick={saveAddress} 
            disabled={!isComplete}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
          >
            Save Address
          </button>
          <button 
            onClick={reset}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
```

## Styling

The components use Tailwind CSS classes. You can customize the appearance by:

1. **Passing custom className**: Add your own classes via the `className` prop
2. **CSS Modules**: Import and apply custom styles
3. **Styled Components**: Wrap the components with styled-components
4. **Theme Customization**: Modify the default Tailwind classes in the component files

## Data Source

The component uses JSON files located in `src/location_map/`:
- `province.json` - Provincial data
- `district.json` - District data  
- `commune.json` - Commune data
- `vilige.json` - Village data

Each file contains location data with both Khmer and English names, plus hierarchical codes for filtering.

## Dependencies

- React 18+
- @heroicons/react (for dropdown icons)
- TypeScript (optional but recommended)
- Tailwind CSS (for styling)

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Supports keyboard navigation and screen readers