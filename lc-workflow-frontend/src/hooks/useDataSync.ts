/**
 * Data Synchronization Hook
 * 
 * Provides functionality for manual refresh, real-time updates,
 * and data consistency verification.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api';
import { toastManager } from '@/lib/toastManager';
import { fileKeys, folderKeys, applicationKeys, customerKeys } from '@/hooks/useFiles';

// Types for data sync operations
interface CacheInvalidationRequest {
  scope: string;
  reason?: string;
  entity_id?: string;
  related_ids?: string[];
}

interface ManualRefreshRequest {
  scopes: string[];
  application_id?: string;
  force_full_refresh?: boolean;
}

interface VerificationRequest {
  scopes?: string[];
  application_id?: string;
  auto_fix?: boolean;
}

interface SSEConnectionRequest {
  subscribed_scopes?: string[];
  application_filters?: string[];
}

interface RealtimeUpdate {
  type: string;
  entity_id?: string;
  entity_type?: string;
  data: Record<string, any>;
  affected_scopes: string[];
  timestamp: string;
  user_id?: string;
}

interface SyncStatus {
  status: 'healthy' | 'warning' | 'critical' | 'error';
  total_issues: number;
  critical_issues: number;
  realtime_connections: number;
  last_verification: {
    file_consistency: {
      issues: number;
      duration: number;
      timestamp: string;
    };
    folder_consistency: {
      issues: number;
      duration: number;
      timestamp: string;
    };
  };
}

// Data sync API functions
const dataSyncApi = {
  invalidateCache: async (request: CacheInvalidationRequest) => {
    return apiClient.post('/data-sync/cache/invalidate', request);
  },

  manualRefresh: async (request: ManualRefreshRequest) => {
    return apiClient.post('/data-sync/cache/refresh', request);
  },

  runVerification: async (request: VerificationRequest) => {
    return apiClient.post('/data-sync/verification/run', request);
  },

  getSyncStatus: async (): Promise<SyncStatus> => {
    return apiClient.get('/data-sync/sync/status');
  },

  forceSystemRefresh: async () => {
    return apiClient.post('/data-sync/sync/force-refresh');
  },

  createRealtimeConnection: async (request: SSEConnectionRequest) => {
    return apiClient.post('/data-sync/realtime/connect', request);
  },

  getCacheHistory: async (scope?: string, limit: number = 100) => {
    const params = new URLSearchParams();
    if (scope) params.append('scope', scope);
    params.append('limit', limit.toString());
    return apiClient.get(`/data-sync/cache/history?${params.toString()}`);
  },

  getVerificationHistory: async (limit: number = 20) => {
    return apiClient.get(`/data-sync/verification/history?limit=${limit}`);
  }
};

// Manual refresh hook
export const useManualRefresh = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ManualRefreshRequest) => dataSyncApi.manualRefresh(request),
    onSuccess: (data, variables) => {
      // Invalidate relevant query keys based on scopes
      variables.scopes.forEach(scope => {
        switch (scope) {
          case 'files':
            queryClient.invalidateQueries({ queryKey: fileKeys.all });
            break;
          case 'folders':
            queryClient.invalidateQueries({ queryKey: folderKeys.all });
            break;
          case 'applications':
            queryClient.invalidateQueries({ queryKey: applicationKeys.all });
            break;
          case 'customers':
            queryClient.invalidateQueries({ queryKey: customerKeys.all });
            break;
        }
      });

      toastManager.success(
        `Manual refresh completed for ${variables.scopes.length} scope(s)`,
        { duration: 3000 }
      );
    },
    onError: (error: any) => {
      toastManager.error(
        `Manual refresh failed: ${error.response?.data?.detail || error.message}`,
        { duration: 5000 }
      );
    }
  });
};

// Cache invalidation hook
export const useCacheInvalidation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CacheInvalidationRequest) => dataSyncApi.invalidateCache(request),
    onSuccess: (data, variables) => {
      // Invalidate relevant query keys based on scope
      switch (variables.scope) {
        case 'files':
          queryClient.invalidateQueries({ queryKey: fileKeys.all });
          break;
        case 'folders':
          queryClient.invalidateQueries({ queryKey: folderKeys.all });
          break;
        case 'applications':
          queryClient.invalidateQueries({ queryKey: applicationKeys.all });
          break;
        case 'customers':
          queryClient.invalidateQueries({ queryKey: customerKeys.all });
          break;
      }

      toastManager.success(
        `Cache invalidated for ${variables.scope}`,
        { duration: 2000 }
      );
    },
    onError: (error: any) => {
      toastManager.error(
        `Cache invalidation failed: ${error.response?.data?.detail || error.message}`,
        { duration: 5000 }
      );
    }
  });
};

// Data verification hook
export const useDataVerification = () => {
  return useMutation({
    mutationFn: (request: VerificationRequest) => dataSyncApi.runVerification(request),
    onSuccess: (data) => {
      const { total_issues, critical_issues, auto_fixable_issues } = data;
      
      if (total_issues === 0) {
        toastManager.success('Data verification completed - no issues found', { duration: 3000 });
      } else {
        const message = `Verification found ${total_issues} issue(s)${critical_issues > 0 ? ` (${critical_issues} critical)` : ''}${auto_fixable_issues > 0 ? ` - ${auto_fixable_issues} auto-fixed` : ''}`;
        
        if (critical_issues > 0) {
          toastManager.error(message, { duration: 8000 });
        } else {
          toastManager.warning(message, { duration: 5000 });
        }
      }
    },
    onError: (error: any) => {
      toastManager.error(
        `Data verification failed: ${error.response?.data?.detail || error.message}`,
        { duration: 5000 }
      );
    }
  });
};

// System sync status hook
export const useSyncStatus = (refetchInterval: number = 30000) => {
  return useQuery({
    queryKey: ['sync-status'],
    queryFn: dataSyncApi.getSyncStatus,
    refetchInterval,
    staleTime: 10000, // 10 seconds
    onError: (error: any) => {
      console.error('Failed to fetch sync status:', error);
    }
  });
};

// Force system refresh hook
export const useForceSystemRefresh = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: dataSyncApi.forceSystemRefresh,
    onSuccess: () => {
      // Invalidate all queries
      queryClient.invalidateQueries();
      
      toastManager.success(
        'System refresh initiated - all data will be reloaded',
        { duration: 4000 }
      );
    },
    onError: (error: any) => {
      toastManager.error(
        `System refresh failed: ${error.response?.data?.detail || error.message}`,
        { duration: 5000 }
      );
    }
  });
};

// Real-time updates hook using Server-Sent Events
export const useRealtimeUpdates = (
  subscribed_scopes?: string[],
  application_filters?: string[],
  enabled: boolean = true
) => {
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<RealtimeUpdate | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const connectionIdRef = useRef<string | null>(null);

  const handleRealtimeUpdate = useCallback((update: RealtimeUpdate) => {
    setLastUpdate(update);

    // Invalidate relevant caches based on affected scopes
    update.affected_scopes.forEach(scope => {
      switch (scope) {
        case 'files':
          queryClient.invalidateQueries({ queryKey: fileKeys.all });
          break;
        case 'folders':
          queryClient.invalidateQueries({ queryKey: folderKeys.all });
          break;
        case 'applications':
          queryClient.invalidateQueries({ queryKey: applicationKeys.all });
          break;
        case 'customers':
          queryClient.invalidateQueries({ queryKey: customerKeys.all });
          break;
      }
    });

    // Show toast notifications for important updates
    switch (update.type) {
      case 'file_uploaded':
        toastManager.fileUploadSuccess(update.data.filename || 'File');
        break;
      case 'file_deleted':
        toastManager.info(`File deleted: ${update.data.filename || 'Unknown'}`, { duration: 2000 });
        break;
      case 'folder_created':
        toastManager.success(`Folder created: ${update.data.name || 'Unknown'}`, { duration: 2000 });
        break;
      case 'sync_required':
        toastManager.warning(`Data sync required: ${update.data.reason}`, { duration: 4000 });
        break;
    }
  }, [queryClient]);

  const connect = useCallback(async () => {
    if (!enabled || connectionStatus === 'connecting' || connectionStatus === 'connected') {
      return;
    }

    try {
      setConnectionStatus('connecting');

      // Create connection
      const connectionResponse = await dataSyncApi.createRealtimeConnection({
        subscribed_scopes,
        application_filters
      });

      connectionIdRef.current = connectionResponse.connection_id;

      // Create EventSource
      const eventSource = new EventSource(
        `/api/v1/data-sync/realtime/stream/${connectionResponse.connection_id}`,
        { withCredentials: true }
      );

      eventSource.onopen = () => {
        setConnectionStatus('connected');
        console.log('Real-time connection established');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'connected') {
            console.log('Real-time connection confirmed:', data.connection_id);
          } else if (data.type === 'ping') {
            // Handle ping messages
            console.debug('Real-time ping received');
          } else {
            // Handle actual updates
            handleRealtimeUpdate(data);
          }
        } catch (error) {
          console.error('Error parsing real-time update:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('Real-time connection error:', error);
        setConnectionStatus('error');
        
        // Attempt to reconnect after a delay
        setTimeout(() => {
          if (eventSourceRef.current === eventSource) {
            eventSource.close();
            eventSourceRef.current = null;
            connect();
          }
        }, 5000);
      };

      eventSourceRef.current = eventSource;

    } catch (error) {
      console.error('Failed to establish real-time connection:', error);
      setConnectionStatus('error');
    }
  }, [enabled, connectionStatus, subscribed_scopes, application_filters, handleRealtimeUpdate]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    connectionIdRef.current = null;
    setConnectionStatus('disconnected');
  }, []);

  // Auto-connect when enabled
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    connectionStatus,
    lastUpdate,
    connect,
    disconnect,
    connectionId: connectionIdRef.current
  };
};

// Convenience hooks for specific refresh scenarios
export const useRefreshFiles = () => {
  const manualRefresh = useManualRefresh();
  
  return useCallback((applicationId?: string) => {
    return manualRefresh.mutateAsync({
      scopes: ['files'],
      application_id: applicationId,
      force_full_refresh: false
    });
  }, [manualRefresh]);
};

export const useRefreshFolders = () => {
  const manualRefresh = useManualRefresh();
  
  return useCallback((applicationId?: string) => {
    return manualRefresh.mutateAsync({
      scopes: ['folders'],
      application_id: applicationId,
      force_full_refresh: false
    });
  }, [manualRefresh]);
};

export const useRefreshApplication = () => {
  const manualRefresh = useManualRefresh();
  
  return useCallback((applicationId: string) => {
    return manualRefresh.mutateAsync({
      scopes: ['files', 'folders', 'applications'],
      application_id: applicationId,
      force_full_refresh: true
    });
  }, [manualRefresh]);
};

// Quick verification hook for common scenarios
export const useQuickVerification = () => {
  const verification = useDataVerification();
  
  return useCallback((autoFix: boolean = false) => {
    return verification.mutateAsync({
      scopes: ['files', 'folders'],
      auto_fix: autoFix
    });
  }, [verification]);
};