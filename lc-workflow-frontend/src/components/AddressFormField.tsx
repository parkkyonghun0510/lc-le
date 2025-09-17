import React from 'react';
import AddressPicker from './AddressPicker';
import { useAddressPicker } from '../hooks/useAddressPicker';

interface AddressFormFieldProps {
  label?: string;
  name: string;
  value?: {
    province_code?: string | number;
    district_code?: string | number;
    commune_code?: string | number;
    village_code?: string | number;
  };
  onChange: (name: string, value: {
    province_code?: string;
    district_code?: string;
    commune_code?: string;
    village_code?: string;
    full_address_km?: string;
    full_address_en?: string;
  }) => void;
  language?: 'km' | 'en';
  required?: boolean;
  error?: string;
  className?: string;
}

const AddressFormField: React.FC<AddressFormFieldProps> = ({
  label,
  name,
  value,
  onChange,
  language = 'km',
  required = false,
  error,
  className = ''
}) => {
  const { handleAddressChange, getFullAddress, getAddressCodes } = useAddressPicker();

  const handleChange = (addressData: any) => {
    handleAddressChange(addressData);
    
    const codes = getAddressCodes();
    const fullAddressKm = getFullAddress('km');
    const fullAddressEn = getFullAddress('en');
    
    onChange(name, {
      ...codes,
      full_address_km: fullAddressKm,
      full_address_en: fullAddressEn
    });
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <AddressPicker
        onAddressChange={handleChange}
        initialAddress={value}
        language={language}
        className={error ? 'border-red-300' : ''}
      />
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default AddressFormField;