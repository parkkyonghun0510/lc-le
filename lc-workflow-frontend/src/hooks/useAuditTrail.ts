/**
 * useAuditTrail Hook
 * 
 * React hook for managing audit trail data with filtering, pagination, and export.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { getAuditTrail, exportAuditTrailToCSV } from '@/lib/api/permissions';
import type {
  AuditTrailParams,
  AuditTrailFilters,
  PermissionAuditEntry,
} from '@/types/permissions';

/**
 * Hook for managing audit trail
 */
export function useAuditTrail(initialParams: AuditTrailParams = {}) {
  const [params, setParams] = useState<AuditTrailParams>({
    page: 1,
    size: 50,
    ...initialParams,
  });

  const queryClient = useQueryClient();

  // Fetch audit trail
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['audit-trail', params],
    queryFn: () => getAuditTrail(params),
    staleTime: 30 * 1000, // 30 seconds
  });

  // Update filters
  const setFilters = useCallback((filters: AuditTrailFilters) => {
    setParams(prev => ({
      ...prev,
      ...filters,
      page: 1, // Reset to first page when filters change
    }));
  }, []);

  // Update page
  const setPage = useCallback((page: number) => {
    setParams(prev => ({ ...prev, page }));
  }, []);

  // Update page size
  const setPageSize = useCallback((size: number) => {
    setParams(prev => ({ ...prev, size, page: 1 }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setParams({
      page: 1,
      size: params.size,
    });
  }, [params.size]);

  // Export to CSV
  const exportToCSV = useCallback(async () => {
    try {
      const filters: AuditTrailFilters = {
        action_type: params.action_type,
        entity_type: params.entity_type,
        user_id: params.user_id,
        target_user_id: params.target_user_id,
        start_date: params.start_date,
        end_date: params.end_date,
        search: params.search,
      };

      await exportAuditTrailToCSV(filters);
      return { success: true };
    } catch (error) {
      console.error('Failed to export audit trail:', error);
      return { success: false, error };
    }
  }, [params]);

  // Invalidate cache (for real-time updates)
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['audit-trail'] });
  }, [queryClient]);

  return {
    // Data
    entries: data?.items || [],
    total: data?.total || 0,
    page: data?.page || 1,
    size: data?.size || 50,
    pages: data?.pages || 0,

    // State
    isLoading,
    error,
    params,

    // Actions
    setFilters,
    setPage,
    setPageSize,
    clearFilters,
    exportToCSV,
    refetch,
    invalidate,
  };
}

/**
 * Hook for real-time audit trail updates
 * 
 * Polls for new entries at a specified interval
 */
export function useAuditTrailRealtime(
  params: AuditTrailParams = {},
  intervalMs: number = 30000 // 30 seconds
) {
  const result = useAuditTrail(params);

  // Set up polling
  useQuery({
    queryKey: ['audit-trail-realtime', params],
    queryFn: () => getAuditTrail(params),
    refetchInterval: intervalMs,
    refetchIntervalInBackground: false,
    enabled: true,
  });

  return result;
}

export default useAuditTrail;
