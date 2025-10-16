/**
 * Employee Code Management Hooks
 * 
 * Provides hooks for:
 * - Fetching next available employee code
 * - Checking employee code availability
 * - Generating batch employee codes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  NextCodeResponse, 
  CodeAvailabilityResponse, 
  GenerateCodesRequest, 
  GeneratedCodesResponse 
} from '@/types/models';
import { apiClient } from '@/lib/api';

/**
 * Hook to fetch the next available employee code
 * 
 * @param pattern - Optional code pattern to follow
 * @returns Query result with next code data
 */
export function useNextEmployeeCode(pattern?: string) {
  return useQuery<NextCodeResponse>({
    queryKey: ['next-employee-code', pattern],
    queryFn: () => {
      const endpoint = pattern 
        ? `/employees/next-code?pattern=${encodeURIComponent(pattern)}`
        : '/employees/next-code';
      return apiClient.get<NextCodeResponse>(endpoint);
    },
    staleTime: 30000, // 30 seconds - code suggestions stay fresh for half a minute
    retry: 2,
  });
}

/**
 * Hook to check if an employee code is available
 * 
 * @param code - Employee code to check
 * @param enabled - Whether the query should run
 * @returns Query result with availability data
 */
export function useCheckEmployeeCode(code: string, enabled: boolean = true) {
  return useQuery<CodeAvailabilityResponse>({
    queryKey: ['check-employee-code', code],
    queryFn: () => {
      return apiClient.get<CodeAvailabilityResponse>(`/employees/check-code/${encodeURIComponent(code)}`);
    },
    enabled: enabled && !!code && code.length > 0,
    staleTime: 10000, // 10 seconds - availability checks stay fresh briefly
    retry: 1,
  });
}

/**
 * Hook to generate a batch of employee codes
 * 
 * @returns Mutation for generating codes
 */
export function useGenerateEmployeeCodes() {
  const queryClient = useQueryClient();

  return useMutation<GeneratedCodesResponse, Error, GenerateCodesRequest>({
    mutationFn: (request: GenerateCodesRequest) => {
      return apiClient.post<GeneratedCodesResponse>('/employees/generate-codes', request);
    },
    onSuccess: () => {
      // Invalidate next code query since we've generated new codes
      queryClient.invalidateQueries({ queryKey: ['next-employee-code'] });
    },
  });
}
