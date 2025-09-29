'use client';

import React from 'react';
import AddressPickerExample from '@/components/AddressPickerExample';
import UserRegistrationForm from '@/components/UserRegistrationForm';

export default function AddressPickerDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Address Picker Demo
          </h1>
          <p className="text-gray-600">
            Cambodian administrative divisions picker with bilingual support
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Standalone Address Picker */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Standalone Address Picker
            </h2>
            <AddressPickerExample />
          </div>

          {/* Form Integration Example */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Form Integration Example
            </h2>
            <UserRegistrationForm />
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="max-w-4xl mx-auto mt-12 bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            How to Use the Address Picker
          </h3>
          
          <div className="space-y-4 text-gray-600">
            <div>
              <h4 className="font-medium text-gray-800">1. Basic Usage</h4>
              <p>Import and use the AddressPicker component with an onChange handler.</p>
              <pre className="bg-gray-100 p-2 rounded text-sm mt-2 overflow-x-auto">
{`import AddressPicker from '@/components/AddressPicker';

<AddressPicker
  onAddressChange={(address) => {
    // Handle address selection
    setSelectedAddress(address);
  }}
  language="km" // or "en"
  />`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium text-gray-800">2. Form Integration</h4>
              <p>Use AddressFormField for easy form integration with validation.</p>
              <pre className="bg-gray-100 p-2 rounded text-sm mt-2 overflow-x-auto">
{`import AddressFormField from '@/components/AddressFormField';

<AddressFormField
  label="Address"
  name="address"
  value={formData.address}
  onChange={handleAddressChange}
  required
  error={errors.address}
/>`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium text-gray-800">3. With Custom Hook</h4>
              <p>Use the useAddressPicker hook for advanced state management.</p>
              <pre className="bg-gray-100 p-2 rounded text-sm mt-2 overflow-x-auto">
{`import { useAddressPicker } from '@/hooks/useAddressPicker';

const { address, handleAddressChange, getFullAddress, isComplete } = useAddressPicker();`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}