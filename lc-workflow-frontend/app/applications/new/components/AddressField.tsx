import React, { useState } from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';
import AddressPickerModal from '@/components/AddressPickerModal';

interface AddressFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const AddressField: React.FC<AddressFieldProps> = ({
  label,
  name,
  value,
  onChange,
  placeholder = "ភូមិ ឃុំ ស្រុក ខេត្ត",
  required = false,
  disabled = false,
  className = ""
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddressSelect = (fullAddress: string, addressData?: any) => {
    // Create a synthetic event to match the expected onChange signature
    const syntheticEvent = {
      target: {
        name,
        value: fullAddress
      }
    } as React.ChangeEvent<HTMLInputElement>;

    onChange(syntheticEvent);
    
    // Store additional address data in a custom event if needed
    // You can access this in the parent component if you need the structured data
    if (addressData) {
      console.log('Selected address data:', addressData);
      // You could dispatch a custom event or use a callback prop for this data
    }
  };

  const openModal = () => {
    if (!disabled) {
      setIsModalOpen(true);
    }
  };
  

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPinIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        
        <input
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly
          onClick={openModal}
          className={`
            block w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm text-sm
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200
            ${disabled 
              ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed' 
              : 'bg-white dark:bg-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600'
            }
            ${value ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}
          `}
        />
        
        <button
          type="button"
          onClick={openModal}
          disabled={disabled}
          className={`
            absolute inset-y-0 right-0 pr-3 flex items-center transition-colors duration-200
            ${disabled 
              ? 'cursor-not-allowed' 
              : 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400'
            }
          `}
        >
          <svg 
            className="h-4 w-4 text-gray-400 dark:text-gray-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 9l-7 7-7-7" 
            />
          </svg>
        </button>
      </div>

      {/* Address Picker Modal */}
      <AddressPickerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddressSelect={handleAddressSelect}
        language="km"
        title="ជ្រើសរើសអាសយដ្ឋាន"
      />
    </div>
  );
};