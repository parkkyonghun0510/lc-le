import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useState, useCallback, useEffect } from 'react';
// Simple debounce implementation to avoid lodash dependency
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } => {
  let timeout: NodeJS.Timeout;
  
  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
  
  debounced.cancel = () => {
    clearTimeout(timeout);
  };
  
  return debounced;
};

// Types for validation responses
export interface ValidationError {
  field: string;
  message: string;
  suggestions?: string[];
  value?: string;
  existing_id?: string | number;
  entity_type?: string;
}

export interface FieldAvailabilityResponse {
  available: boolean;
  field: string;
  message?: string;
}

export interface DuplicateValidationResponse {
  valid: boolean;
  errors: ValidationError[];
}

export interface DuplicateSuggestion {
  field: string;
  suggestions: string[];
}

// Validation service API calls
const validationApi = {
  checkFieldAvailability: async (field: string, value: string, excludeId?: string): Promise<FieldAvailabilityResponse> => {
    const params = new URLSearchParams({ field, value });
    if (excludeId) params.append('exclude_id', excludeId);
    return apiClient.get(`/validation/check-field-availability?${params}`);
  },

  validateDuplicates: async (data: Record<string, any>, modelType: string, excludeId?: string): Promise<DuplicateValidationResponse> => {
    const payload: { data: Record<string, any>; model_type: string; exclude_id?: string } = { data, model_type: modelType };
    if (excludeId) payload.exclude_id = excludeId;
    return apiClient.post('/validation/validate-duplicates', payload);
  },

  getDuplicateSuggestions: async (data: Record<string, any>, modelType: string): Promise<DuplicateSuggestion[]> => {
    return apiClient.post('/validation/get-duplicate-suggestions', { data, model_type: modelType });
  },

  // Quick check endpoints
  checkUsername: async (username: string, excludeId?: string): Promise<FieldAvailabilityResponse> => {
    const params = new URLSearchParams({ username });
    if (excludeId) params.append('exclude_id', excludeId);
    return apiClient.get(`/validation/check-username?${params}`);
  },

  checkEmail: async (email: string, excludeId?: string): Promise<FieldAvailabilityResponse> => {
    const params = new URLSearchParams({ email });
    if (excludeId) params.append('exclude_id', excludeId);
    return apiClient.get(`/validation/check-email?${params}`);
  },

  checkPhone: async (phone: string, excludeId?: string): Promise<FieldAvailabilityResponse> => {
    const params = new URLSearchParams({ phone });
    if (excludeId) params.append('exclude_id', excludeId);
    return apiClient.get(`/validation/check-phone?${params}`);
  },

  checkEmployeeId: async (employeeId: string, excludeId?: string): Promise<FieldAvailabilityResponse> => {
    const params = new URLSearchParams({ employee_id: employeeId });
    if (excludeId) params.append('exclude_id', excludeId);
    return apiClient.get(`/validation/check-employee-id?${params}`);
  },

  checkIdNumber: async (idNumber: string, excludeId?: string): Promise<FieldAvailabilityResponse> => {
    const params = new URLSearchParams({ id_number: idNumber });
    if (excludeId) params.append('exclude_id', excludeId);
    return apiClient.get(`/validation/check-id-number?${params}`);
  },
};

// Hook for real-time field validation with debouncing
export const useFieldValidation = (field: string, debounceMs: number = 500) => {
  const [value, setValue] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<FieldAvailabilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateField = useCallback(
    debounce(async (fieldValue: string, excludeId?: string) => {
      if (!fieldValue.trim()) {
        setValidationResult(null);
        setError(null);
        setIsValidating(false);
        return;
      }

      setIsValidating(true);
      setError(null);

      try {
        const result = await validationApi.checkFieldAvailability(field, fieldValue, excludeId);
        setValidationResult(result);
      } catch (err: any) {
        const errorData = err.response?.data;
        if (errorData?.field && errorData?.message) {
          // Handle structured validation error
          setError(`${errorData.message}${errorData.suggestions ? ` Suggestions: ${errorData.suggestions.join(', ')}` : ''}`);
        } else {
          setError(errorData?.detail || 'Validation failed');
        }
        setValidationResult(null);
      } finally {
        setIsValidating(false);
      }
    }, debounceMs),
    [field, debounceMs]
  );

  const validate = useCallback((fieldValue: string, excludeId?: string) => {
    setValue(fieldValue);
    validateField(fieldValue, excludeId);
  }, [validateField]);

  const reset = useCallback(() => {
    setValue('');
    setValidationResult(null);
    setError(null);
    setIsValidating(false);
    validateField.cancel();
  }, [validateField]);

  return {
    value,
    isValidating,
    validationResult,
    error,
    validate,
    reset,
    isAvailable: validationResult?.available,
    message: validationResult?.message || error,
  };
};

// Hook for comprehensive duplicate validation
export const useDuplicateValidation = () => {
  return useMutation({
    mutationFn: ({ data, modelType, excludeId }: { data: Record<string, any>; modelType: string; excludeId?: string }) =>
      validationApi.validateDuplicates(data, modelType, excludeId),
    onError: (error: any) => {
      console.error('Duplicate validation failed:', error);
    },
  });
};

// Hook for getting duplicate suggestions
export const useDuplicateSuggestions = () => {
  return useMutation({
    mutationFn: ({ data, modelType }: { data: Record<string, any>; modelType: string }) =>
      validationApi.getDuplicateSuggestions(data, modelType),
    onError: (error: any) => {
      console.error('Failed to get duplicate suggestions:', error);
    },
  });
};

// Specialized hooks for common validations
export const useUsernameValidation = (debounceMs: number = 500) => {
  const [username, setUsername] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<FieldAvailabilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateUsername = useCallback(
    debounce(async (usernameValue: string, excludeId?: string) => {
      if (!usernameValue.trim()) {
        setValidationResult(null);
        setError(null);
        setIsValidating(false);
        return;
      }

      setIsValidating(true);
      setError(null);

      try {
        const result = await validationApi.checkUsername(usernameValue, excludeId);
        setValidationResult(result);
      } catch (err: any) {
        const errorData = err.response?.data;
        if (errorData?.field && errorData?.message) {
          // Handle structured validation error
          setError(`${errorData.message}${errorData.suggestions ? ` Suggestions: ${errorData.suggestions.join(', ')}` : ''}`);
        } else {
          setError(errorData?.detail || 'Username validation failed');
        }
        setValidationResult(null);
      } finally {
        setIsValidating(false);
      }
    }, debounceMs),
    [debounceMs]
  );

  const validate = useCallback((usernameValue: string, excludeId?: string) => {
    setUsername(usernameValue);
    validateUsername(usernameValue, excludeId);
  }, [validateUsername]);

  const reset = useCallback(() => {
    setUsername('');
    setValidationResult(null);
    setError(null);
    setIsValidating(false);
    validateUsername.cancel();
  }, [validateUsername]);

  return {
    username,
    isValidating,
    validationResult,
    error,
    validate,
    reset,
    isAvailable: validationResult?.available,
    message: validationResult?.message || error,
  };
};

export const useEmailValidation = (debounceMs: number = 500) => {
  const [email, setEmail] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<FieldAvailabilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = useCallback(
    debounce(async (emailValue: string, excludeId?: string) => {
      if (!emailValue.trim()) {
        setValidationResult(null);
        setError(null);
        setIsValidating(false);
        return;
      }

      setIsValidating(true);
      setError(null);

      try {
        const result = await validationApi.checkEmail(emailValue, excludeId);
        setValidationResult(result);
      } catch (err: any) {
        const errorData = err.response?.data;
        if (errorData?.field && errorData?.message) {
          // Handle structured validation error
          setError(`${errorData.message}${errorData.suggestions ? ` Suggestions: ${errorData.suggestions.join(', ')}` : ''}`);
        } else {
          setError(errorData?.detail || 'Email validation failed');
        }
        setValidationResult(null);
      } finally {
        setIsValidating(false);
      }
    }, debounceMs),
    [debounceMs]
  );

  const validate = useCallback((emailValue: string, excludeId?: string) => {
    setEmail(emailValue);
    validateEmail(emailValue, excludeId);
  }, [validateEmail]);

  const reset = useCallback(() => {
    setEmail('');
    setValidationResult(null);
    setError(null);
    setIsValidating(false);
    validateEmail.cancel();
  }, [validateEmail]);

  return {
    email,
    isValidating,
    validationResult,
    error,
    validate,
    reset,
    isAvailable: validationResult?.available,
    message: validationResult?.message || error,
  };
};

export const usePhoneValidation = (debounceMs: number = 500) => {
  const [phone, setPhone] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<FieldAvailabilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validatePhone = useCallback(
    debounce(async (phoneValue: string, excludeId?: string) => {
      if (!phoneValue.trim()) {
        setValidationResult(null);
        setError(null);
        setIsValidating(false);
        return;
      }

      setIsValidating(true);
      setError(null);

      try {
        const result = await validationApi.checkPhone(phoneValue, excludeId);
        setValidationResult(result);
      } catch (err: any) {
        const errorData = err.response?.data;
        if (errorData?.field && errorData?.message) {
          // Handle structured validation error
          setError(`${errorData.message}${errorData.suggestions ? ` Suggestions: ${errorData.suggestions.join(', ')}` : ''}`);
        } else {
          setError(errorData?.detail || 'Phone validation failed');
        }
        setValidationResult(null);
      } finally {
        setIsValidating(false);
      }
    }, debounceMs),
    [debounceMs]
  );

  const validate = useCallback((phoneValue: string, excludeId?: string) => {
    setPhone(phoneValue);
    validatePhone(phoneValue, excludeId);
  }, [validatePhone]);

  const reset = useCallback(() => {
    setPhone('');
    setValidationResult(null);
    setError(null);
    setIsValidating(false);
    validatePhone.cancel();
  }, [validatePhone]);

  return {
    phone,
    isValidating,
    validationResult,
    error,
    validate,
    reset,
    isAvailable: validationResult?.available,
    message: validationResult?.message || error,
  };
};

export const useEmployeeIdValidation = (debounceMs: number = 500) => {
  const [employeeId, setEmployeeId] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<FieldAvailabilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateEmployeeId = useCallback(
    debounce(async (employeeIdValue: string, excludeId?: string) => {
      if (!employeeIdValue.trim()) {
        setValidationResult(null);
        setError(null);
        setIsValidating(false);
        return;
      }

      setIsValidating(true);
      setError(null);

      try {
        const result = await validationApi.checkEmployeeId(employeeIdValue, excludeId);
        setValidationResult(result);
      } catch (err: any) {
        const errorData = err.response?.data;
        if (errorData?.field && errorData?.message) {
          // Handle structured validation error
          setError(`${errorData.message}${errorData.suggestions ? ` Suggestions: ${errorData.suggestions.join(', ')}` : ''}`);
        } else {
          setError(errorData?.detail || 'Employee ID validation failed');
        }
        setValidationResult(null);
      } finally {
        setIsValidating(false);
      }
    }, debounceMs),
    [debounceMs]
  );

  const validate = useCallback((employeeIdValue: string, excludeId?: string) => {
    setEmployeeId(employeeIdValue);
    validateEmployeeId(employeeIdValue, excludeId);
  }, [validateEmployeeId]);

  const reset = useCallback(() => {
    setEmployeeId('');
    setValidationResult(null);
    setError(null);
    setIsValidating(false);
    validateEmployeeId.cancel();
  }, [validateEmployeeId]);

  return {
    employeeId,
    isValidating,
    validationResult,
    error,
    validate,
    reset,
    isAvailable: validationResult?.available,
    message: validationResult?.message || error,
  };
};

export const useIdNumberValidation = (debounceMs: number = 500) => {
  const [idNumber, setIdNumber] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<FieldAvailabilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateIdNumber = useCallback(
    debounce(async (idNumberValue: string, excludeId?: string) => {
      if (!idNumberValue.trim()) {
        setValidationResult(null);
        setError(null);
        setIsValidating(false);
        return;
      }

      setIsValidating(true);
      setError(null);

      try {
        const result = await validationApi.checkIdNumber(idNumberValue, excludeId);
        setValidationResult(result);
      } catch (err: any) {
        const errorData = err.response?.data;
        if (errorData?.field && errorData?.message) {
          // Handle structured validation error
          setError(`${errorData.message}${errorData.suggestions ? ` Suggestions: ${errorData.suggestions.join(', ')}` : ''}`);
        } else {
          setError(errorData?.detail || 'ID Number validation failed');
        }
        setValidationResult(null);
      } finally {
        setIsValidating(false);
      }
    }, debounceMs),
    [debounceMs]
  );

  const validate = useCallback((idNumberValue: string, excludeId?: string) => {
    setIdNumber(idNumberValue);
    validateIdNumber(idNumberValue, excludeId);
  }, [validateIdNumber]);

  const reset = useCallback(() => {
    setIdNumber('');
    setValidationResult(null);
    setError(null);
    setIsValidating(false);
    validateIdNumber.cancel();
  }, [validateIdNumber]);

  return {
    idNumber,
    isValidating,
    validationResult,
    error,
    validate,
    reset,
    isAvailable: validationResult?.available,
    message: validationResult?.message || error,
  };
};

// Composite hook for form-level validation
export const useFormValidation = (modelType: string, excludeId?: string) => {
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const duplicateValidation = useDuplicateValidation();

  const validateForm = useCallback(async (formData: Record<string, any>) => {
    setIsValidating(true);
    setValidationErrors([]);

    try {
      const result = await duplicateValidation.mutateAsync({
        data: formData,
        modelType,
        excludeId,
      });

      if (!result.valid) {
        setValidationErrors(result.errors);
        return false;
      }

      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Validation failed';
      setValidationErrors([{ field: 'general', message: errorMessage }]);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [duplicateValidation, modelType, excludeId]);

  const clearErrors = useCallback(() => {
    setValidationErrors([]);
  }, []);

  const getFieldError = useCallback((fieldName: string) => {
    return validationErrors.find(error => error.field === fieldName);
  }, [validationErrors]);

  const hasErrors = validationErrors.length > 0;
  const generalError = validationErrors.find(error => error.field === 'general');

  return {
    validateForm,
    validationErrors,
    isValidating,
    clearErrors,
    getFieldError,
    hasErrors,
    generalError,
  };
};