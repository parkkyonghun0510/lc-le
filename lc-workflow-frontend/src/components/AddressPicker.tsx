import React, { useState, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

// Import location data
import provinces from '../location_map/province.json';
import districts from '../location_map/district.json';
import communes from '../location_map/commune.json';
import villages from '../location_map/vilige.json';

// Types for location data
interface LocationItem {
  type: string;
  code: string | number;
  name_km: string;
  name_en: string;
  province_code?: string | number;
  district_code?: string | number;
  commune_code?: string | number;
}

interface AddressPickerProps {
  onAddressChange: (address: {
    province?: LocationItem | null;
    district?: LocationItem | null;
    commune?: LocationItem | null;
    village?: LocationItem | null;
  }) => void;
  initialAddress?: {
    province_code?: string | number;
    district_code?: string | number;
    commune_code?: string | number;
    village_code?: string | number;
  };
  language?: 'km' | 'en';
  className?: string;
}

const AddressPicker: React.FC<AddressPickerProps> = ({
  onAddressChange,
  initialAddress,
  language = 'km',
  className = ''
}) => {
  const [selectedProvince, setSelectedProvince] = useState<LocationItem | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<LocationItem | null>(null);
  const [selectedCommune, setSelectedCommune] = useState<LocationItem | null>(null);
  const [selectedVillage, setSelectedVillage] = useState<LocationItem | null>(null);

  const [availableDistricts, setAvailableDistricts] = useState<LocationItem[]>([]);
  const [availableCommunes, setAvailableCommunes] = useState<LocationItem[]>([]);
  const [availableVillages, setAvailableVillages] = useState<LocationItem[]>([]);

  // Initialize with initial address if provided
  useEffect(() => {
    if (initialAddress) {
      if (initialAddress.province_code) {
        const province = provinces.find(p => p.code?.toString() === initialAddress.province_code?.toString());
        if (province) setSelectedProvince(province);
      }
      if (initialAddress.district_code) {
        const district = districts.find(d => d.code?.toString() === initialAddress.district_code?.toString());
        if (district) setSelectedDistrict(district);
      }
      if (initialAddress.commune_code) {
        const commune = communes.find(c => c.code?.toString() === initialAddress.commune_code?.toString());
        if (commune) setSelectedCommune(commune);
      }
      if (initialAddress.village_code) {
        const village = villages.find(v => v.code?.toString() === initialAddress.village_code?.toString());
        if (village) setSelectedVillage(village);
      }
    }
  }, [initialAddress]);

  // Update available districts when province changes
  useEffect(() => {
    if (selectedProvince) {
      const filteredDistricts = districts.filter(
        district => district.province_code?.toString() === selectedProvince.code?.toString()
      );
      setAvailableDistricts(filteredDistricts);
      setSelectedDistrict(null);
      setSelectedCommune(null);
      setSelectedVillage(null);
      setAvailableCommunes([]);
      setAvailableVillages([]);
    } else {
      setAvailableDistricts([]);
    }
  }, [selectedProvince]);

  // Update available communes when district changes
  useEffect(() => {
    if (selectedDistrict) {
      const filteredCommunes = communes.filter(
        commune => commune.district_code?.toString() === selectedDistrict.code?.toString()
      );
      setAvailableCommunes(filteredCommunes);
      setSelectedCommune(null);
      setSelectedVillage(null);
      setAvailableVillages([]);
    } else {
      setAvailableCommunes([]);
    }
  }, [selectedDistrict]);

  // Update available villages when commune changes
  useEffect(() => {
    if (selectedCommune) {
      const filteredVillages = villages.filter(
        village => village.commune_code?.toString() === selectedCommune.code?.toString()
      );
      setAvailableVillages(filteredVillages);
      setSelectedVillage(null);
    } else {
      setAvailableVillages([]);
    }
  }, [selectedCommune]);

  // Notify parent component of address changes
  useEffect(() => {
    onAddressChange({
      province: selectedProvince,
      district: selectedDistrict,
      commune: selectedCommune,
      village: selectedVillage
    });
  }, [selectedProvince, selectedDistrict, selectedCommune, selectedVillage, onAddressChange]);

  const getDisplayName = (item: LocationItem) => {
    return language === 'km' ? item.name_km : item.name_en;
  };

  const SelectDropdown: React.FC<{
    label: string;
    value: LocationItem | null;
    options: LocationItem[];
    onChange: (item: LocationItem | null) => void;
    placeholder: string;
    disabled?: boolean;
  }> = ({ label, value, options, onChange, placeholder, disabled = false }) => (
    <div className="flex flex-col space-y-1">
      <label className="text-sm font-medium text-gray-900 dark:text-white">{label}</label>
      <div className="relative">
        <select
          value={value?.code?.toString() || ''}
          onChange={(e) => {
            const selectedItem = options.find(item => item.code?.toString() === e.target.value);
            onChange(selectedItem || null);
          }}
          disabled={disabled || options.length === 0}
          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed appearance-none transition-all duration-200"
        >
          <option value="">{placeholder}</option>
          {options.map((item) => (
            <option key={item.code} value={item.code?.toString()}>
              {getDisplayName(item)}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
      </div>
    </div>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      <SelectDropdown
        label={language === 'km' ? 'ខេត្ត' : 'Province'}
        value={selectedProvince}
        options={provinces}
        onChange={setSelectedProvince}
        placeholder={language === 'km' ? 'ជ្រើសរើសខេត្ត' : 'Select Province'}
      />

      <SelectDropdown
        label={language === 'km' ? 'ស្រុក/ក្រុង' : 'District'}
        value={selectedDistrict}
        options={availableDistricts}
        onChange={setSelectedDistrict}
        placeholder={language === 'km' ? 'ជ្រើសរើសស្រុក/ក្រុង' : 'Select District'}
        disabled={!selectedProvince}
      />

      <SelectDropdown
        label={language === 'km' ? 'ឃុំ/សង្កាត់' : 'Commune'}
        value={selectedCommune}
        options={availableCommunes}
        onChange={setSelectedCommune}
        placeholder={language === 'km' ? 'ជ្រើសរើសឃុំ/សង្កាត់' : 'Select Commune'}
        disabled={!selectedDistrict}
      />

      <SelectDropdown
        label={language === 'km' ? 'ភូមិ' : 'Village'}
        value={selectedVillage}
        options={availableVillages}
        onChange={setSelectedVillage}
        placeholder={language === 'km' ? 'ជ្រើសរើសភូមិ' : 'Select Village'}
        disabled={!selectedCommune}
      />
    </div>
  );
};

export default AddressPicker;