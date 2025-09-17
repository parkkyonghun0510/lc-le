import { useState, useCallback } from 'react';

interface LocationItem {
  type: string;
  code: string | number;
  name_km: string;
  name_en: string;
  province_code?: string | number;
  district_code?: string | number;
  commune_code?: string | number;
}

interface AddressData {
  province?: LocationItem | null;
  district?: LocationItem | null;
  commune?: LocationItem | null;
  village?: LocationItem | null;
}

interface UseAddressPickerReturn {
  address: AddressData;
  handleAddressChange: (newAddress: AddressData) => void;
  getFullAddress: (language?: 'km' | 'en') => string;
  getAddressCodes: () => {
    province_code?: string;
    district_code?: string;
    commune_code?: string;
    village_code?: string;
  };
  isComplete: boolean;
  reset: () => void;
}

export const useAddressPicker = (initialAddress?: AddressData): UseAddressPickerReturn => {
  const [address, setAddress] = useState<AddressData>(initialAddress || {});

  const handleAddressChange = useCallback((newAddress: AddressData) => {
    setAddress(newAddress);
  }, []);

  const getFullAddress = useCallback((language: 'km' | 'en' = 'km') => {
    const parts: string[] = [];
    
    if (address.village) {
      parts.push(language === 'km' ? address.village.name_km : address.village.name_en);
    }
    if (address.commune) {
      parts.push(language === 'km' ? address.commune.name_km : address.commune.name_en);
    }
    if (address.district) {
      parts.push(language === 'km' ? address.district.name_km : address.district.name_en);
    }
    if (address.province) {
      parts.push(language === 'km' ? address.province.name_km : address.province.name_en);
    }

    return parts.join(', ');
  }, [address]);

  const getAddressCodes = useCallback(() => {
    return {
      province_code: address.province?.code?.toString(),
      district_code: address.district?.code?.toString(),
      commune_code: address.commune?.code?.toString(),
      village_code: address.village?.code?.toString(),
    };
  }, [address]);

  const isComplete = Boolean(
    address.province && address.district && address.commune && address.village
  );

  const reset = useCallback(() => {
    setAddress({});
  }, []);

  return {
    address,
    handleAddressChange,
    getFullAddress,
    getAddressCodes,
    isComplete,
    reset,
  };
};