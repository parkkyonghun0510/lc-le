import React, { useState } from 'react';
import AddressPicker from './AddressPicker';
import { useAddressPicker } from '../hooks/useAddressPicker';

const AddressPickerExample: React.FC = () => {
  const [language, setLanguage] = useState<'km' | 'en'>('km');
  const {
    address,
    handleAddressChange,
    getFullAddress,
    getAddressCodes,
    isComplete,
    reset
  } = useAddressPicker();

  const handleSubmit = () => {
    if (isComplete) {
      const codes = getAddressCodes();
      const fullAddress = getFullAddress(language);
      
      console.log('Address Codes:', codes);
      console.log('Full Address:', fullAddress);
      
      // Here you would typically send this data to your API
      alert(`Address selected: ${fullAddress}`);
    } else {
      alert('Please complete all address fields');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {language === 'km' ? 'ជ្រើសរើសអាសយដ្ឋាន' : 'Select Address'}
        </h2>
        
        {/* Language Toggle */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setLanguage('km')}
            className={`px-3 py-1 rounded text-sm ${
              language === 'km'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ខ្មែរ
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 rounded text-sm ${
              language === 'en'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            English
          </button>
        </div>
      </div>

      <AddressPicker
        onAddressChange={handleAddressChange}
        language={language}
        className="mb-6"
      />

      {/* Display selected address */}
      {(address.province || address.district || address.commune || address.village) && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-2">
            {language === 'km' ? 'អាសយដ្ឋានដែលបានជ្រើសរើស:' : 'Selected Address:'}
          </h3>
          <p className="text-gray-600">{getFullAddress(language) || 'None selected'}</p>
          
          {isComplete && (
            <div className="mt-2 text-sm text-green-600">
              ✓ {language === 'km' ? 'អាសយដ្ឋានពេញលេញ' : 'Complete address'}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex space-x-3">
        <button
          onClick={handleSubmit}
          disabled={!isComplete}
          className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {language === 'km' ? 'បញ្ជាក់' : 'Confirm'}
        </button>
        
        <button
          onClick={reset}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          {language === 'km' ? 'កំណត់ឡើងវិញ' : 'Reset'}
        </button>
      </div>

      {/* Debug info (remove in production) */}
      <div className="mt-6 p-3 bg-gray-100 rounded text-xs">
        <details>
          <summary className="cursor-pointer font-semibold">Debug Info</summary>
          <pre className="mt-2 text-xs overflow-auto">
            {JSON.stringify({ address, codes: getAddressCodes() }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
};

export default AddressPickerExample;