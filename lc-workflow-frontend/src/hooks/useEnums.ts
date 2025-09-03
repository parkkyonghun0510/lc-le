import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface IDCardTypeOption {
  value: string;
  label: string;
  label_khmer: string;
}

export interface ProductTypeOption {
  value: string;
  label: string;
}

export const useIDCardTypes = () => {
  const query = useQuery<IDCardTypeOption[]>({
    queryKey: ['id-card-types'],
    queryFn: async () => {
      return apiClient.get<IDCardTypeOption[]>('/enums/id-card-types');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const getLabel = (idCardType: string | null | undefined): string | null => {
    // Handle null, undefined, or empty string cases
    if (!idCardType || typeof idCardType !== 'string' || idCardType.trim() === '') {
      return null;
    }

    // Handle loading or error states
    if (query.isLoading || query.isError || !query.data) {
      return null;
    }

    // Find the matching ID card type option
    const option = query.data.find(item => 
      item.value === idCardType || 
      item.value === idCardType.trim()
    );

    // Return the formatted label or null if not found
    if (option && option.label) {
      // Ensure consistent formatting: trim whitespace and capitalize properly
      return option.label.trim();
    }

    return null;
  };

  const getLabelKhmer = (idCardType: string | null | undefined): string | null => {
    // Handle null, undefined, or empty string cases
    if (!idCardType || typeof idCardType !== 'string' || idCardType.trim() === '') {
      return null;
    }

    // Handle loading or error states
    if (query.isLoading || query.isError || !query.data) {
      return null;
    }

    // Find the matching ID card type option
    const option = query.data.find(item => 
      item.value === idCardType || 
      item.value === idCardType.trim()
    );

    // Return the formatted Khmer label or null if not found
    if (option && option.label_khmer) {
      // Ensure consistent formatting: trim whitespace
      return option.label_khmer.trim();
    }

    return null;
  };

  return {
    ...query,
    getLabel,
    getLabelKhmer
  };
};

export const useProductTypes = () => {
  const query = useQuery<ProductTypeOption[]>({
    queryKey: ['product-types'],
    queryFn: async () => {
      return apiClient.get<ProductTypeOption[]>('/enums/product-types');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const getLabel = (productType: string | null | undefined): string | null => {
    // Handle null, undefined, or empty string cases
    if (!productType || typeof productType !== 'string' || productType.trim() === '') {
      return null;
    }

    // Handle loading or error states
    if (query.isLoading || query.isError || !query.data) {
      return null;
    }

    // Find the matching product type option
    const option = query.data.find(item => 
      item.value === productType || 
      item.value === productType.trim()
    );

    // Return the formatted label or null if not found
    if (option && option.label) {
      // Ensure consistent formatting: trim whitespace and capitalize properly
      return option.label.trim();
    }

    return null;
  };

  return {
    ...query,
    getLabel
  };
};