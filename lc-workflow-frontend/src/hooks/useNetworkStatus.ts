import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

export interface NetworkStatus {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  lastOnline?: Date;
  lastOffline?: Date;
}

export interface NetworkStatusHook extends NetworkStatus {
  refreshStatus: () => void;
  isSlowConnection: boolean;
  isFastConnection: boolean;
  connectionQuality: 'unknown' | 'slow' | 'fast' | 'very-fast';
}

const getConnectionInfo = (): Partial<NetworkStatus> => {
  if (typeof navigator === 'undefined') return {};

  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

  if (!connection) return { isOnline: navigator.onLine };

  return {
    isOnline: navigator.onLine,
    connectionType: connection.type,
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData,
  };
};

const getConnectionQuality = (status: NetworkStatus): 'unknown' | 'slow' | 'fast' | 'very-fast' => {
  if (!status.isOnline) return 'unknown';

  const { effectiveType, downlink, rtt } = status;

  // Use effective type if available
  if (effectiveType) {
    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        return 'slow';
      case '3g':
        return 'fast';
      case '4g':
        return 'very-fast';
      default:
        return 'fast';
    }
  }

  // Fallback to downlink and RTT
  if (downlink !== undefined && rtt !== undefined) {
    if (downlink < 0.5 || rtt > 500) return 'slow';
    if (downlink > 5 && rtt < 100) return 'very-fast';
    return 'fast';
  }

  return 'unknown';
};

export const useNetworkStatus = (): NetworkStatusHook => {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastOnline: undefined,
    lastOffline: undefined,
    ...getConnectionInfo(),
  }));

  const updateStatus = useCallback((isOnline: boolean) => {
    const now = new Date();
    setStatus(prevStatus => {
      const newStatus: NetworkStatus = {
        ...prevStatus,
        isOnline,
        ...getConnectionInfo(),
        ...(isOnline
          ? { lastOnline: now }
          : { lastOffline: now }
        ),
      };

      // Log status changes
      if (isOnline && !prevStatus.isOnline) {
        logger.info('Network status changed to online', {
          category: 'network_status_online',
          timestamp: now.toISOString(),
          connectionInfo: {
            type: newStatus.connectionType,
            effectiveType: newStatus.effectiveType,
            downlink: newStatus.downlink,
            rtt: newStatus.rtt,
          },
        });
      } else if (!isOnline && prevStatus.isOnline) {
        logger.warn('Network status changed to offline', {
          category: 'network_status_offline',
          timestamp: now.toISOString(),
          lastOnline: prevStatus.lastOnline?.toISOString(),
        });
      }

      return newStatus;
    });
  }, []);

  const refreshStatus = useCallback(() => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    updateStatus(isOnline);
  }, [updateStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set up event listeners
    const handleOnline = () => updateStatus(true);
    const handleOffline = () => updateStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set up connection change listener if available
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', refreshStatus);
    }

    // Initial status update
    refreshStatus();

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', refreshStatus);
      }
    };
  }, [updateStatus, refreshStatus]);

  const connectionQuality = getConnectionQuality(status);

  return {
    ...status,
    refreshStatus,
    isSlowConnection: connectionQuality === 'slow',
    isFastConnection: connectionQuality === 'fast' || connectionQuality === 'very-fast',
    connectionQuality,
  };
};