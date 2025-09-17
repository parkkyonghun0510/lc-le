import React, { useState, useEffect } from 'react';
import { XMarkIcon, MapPinIcon } from '@heroicons/react/24/outline';
import AddressPicker from './AddressPicker';
import { useAddressPicker } from '@/hooks/useAddressPicker';

interface AddressPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressSelect: (fullAddress: string, addressData?: any) => void;
  initialAddress?: {
    province_code?: string | number;
    district_code?: string | number;
    commune_code?: string | number;
    village_code?: string | number;
  };
  language?: 'km' | 'en';
  title?: string;
}

const AddressPickerModal: React.FC<AddressPickerModalProps> = ({
  isOpen,
  onClose,
  onAddressSelect,
  initialAddress,
  language = 'km',
  title
}) => {
  const {
    address,
    handleAddressChange,
    getFullAddress,
    getAddressCodes,
    isComplete,
    reset
  } = useAddressPicker();

  const [selectedLanguage, setSelectedLanguage] = useState<'km' | 'en'>(language);
  const [isAnimating, setIsAnimating] = useState(false);

  // Reset when modal opens and handle animation
  useEffect(() => {
    if (isOpen) {
      reset();
      setIsAnimating(true);
      // Small delay to trigger animation
      setTimeout(() => setIsAnimating(false), 50);
    }
  }, [isOpen, reset]);

  const handleConfirm = () => {
    if (isComplete) {
      const fullAddress = getFullAddress(selectedLanguage);
      const addressData = {
        ...getAddressCodes(),
        full_address_km: getFullAddress('km'),
        full_address_en: getFullAddress('en'),
        address_objects: address
      };

      onAddressSelect(fullAddress, addressData);
      onClose();
    }
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop with blur effect */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm transition-all duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'
          }`}
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
        <div className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 w-full max-w-sm sm:max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-hidden transform transition-all duration-300 ${isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
          }`}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <MapPinIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {title || (selectedLanguage === 'km' ? 'ជ្រើសរើសអាសយដ្ឋាន' : 'Select Address')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedLanguage === 'km' ? 'សូមជ្រើសរើសអាសយដ្ឋានរបស់អ្នក' : 'Please select your address'}
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-all duration-200 flex-shrink-0"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[65vh] sm:max-h-[60vh] overflow-y-auto">
            {/* Language Toggle */}
            {/* <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 mb-6">
              <button
                onClick={() => setSelectedLanguage('km')}
                className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${selectedLanguage === 'km'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                  }`}
              >
                ខ្មែរ
              </button>
              <button
                onClick={() => setSelectedLanguage('en')}
                className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${selectedLanguage === 'en'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                  }`}
              >
                English
              </button>
            </div> */}

            {/* Address Picker */}
            <AddressPicker
              onAddressChange={handleAddressChange}
              initialAddress={initialAddress}
              language={selectedLanguage}
              className="space-y-4"
            />

            {/* Selected Address Preview */}
            {(address.province || address.district || address.commune || address.village) && (
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-blue-100 dark:border-gray-600">
                <h4 className="font-medium text-gray-800 dark:text-white mb-2 flex items-center text-sm">
                  <MapPinIcon className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span className="truncate">
                    {selectedLanguage === 'km' ? 'អាសយដ្ឋានដែលបានជ្រើសរើស:' : 'Selected Address:'}
                  </span>
                </h4>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed break-words">
                  {getFullAddress(selectedLanguage) || (selectedLanguage === 'km' ? 'មិនទាន់បានជ្រើសរើស' : 'None selected')}
                </p>

                {isComplete && (
                  <div className="mt-3 flex items-center text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900 px-3 py-2 rounded-xl">
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="truncate">
                      {selectedLanguage === 'km' ? 'អាសយដ្ឋានពេញលេញ' : 'Complete address'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-800">
            <button
              onClick={handleCancel}
              className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 text-sm font-medium"
            >
              {selectedLanguage === 'km' ? 'បោះបង់' : 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isComplete}
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md text-sm font-medium disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {selectedLanguage === 'km' ? 'បញ្ជាក់' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressPickerModal;