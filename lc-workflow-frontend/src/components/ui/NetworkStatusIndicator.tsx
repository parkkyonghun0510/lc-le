'use client';

import React, { useState, useEffect } from 'react';
import { 
  WifiIcon, 
  ExclamationTriangleIcon,
  SignalIcon,
  SignalSlashIcon
} from '@heroicons/react/24/outline';

interface NetworkStatus {
  isOnline: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface NetworkStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function NetworkStatusIndicator({
  className = '',
  showDetails = false,
  position = 'top-right'
}: NetworkStatusIndicatorProps) {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
  });
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      setNetworkStatus({
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
        saveData: connection?.saveData,
      });
    };

    updateNetworkStatus();

    // Listen for network status changes
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Listen for connection changes
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      
      if ((navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  const getConnectionQuality = () => {
    if (!networkStatus.isOnline) return 'offline';
    
    const effectiveType = networkStatus.effectiveType;
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'poor';
    if (effectiveType === '3g') return 'fair';
    if (effectiveType === '4g') return 'good';
    
    // Fallback to downlink speed if available
    if (networkStatus.downlink) {
      if (networkStatus.downlink < 0.5) return 'poor';
      if (networkStatus.downlink < 2) return 'fair';
      return 'good';
    }
    
    return 'unknown';
  };

  const connectionQuality = getConnectionQuality();

  const getStatusColor = () => {
    switch (connectionQuality) {
      case 'offline': return 'text-red-500 bg-red-100 dark:bg-red-900/20';
      case 'poor': return 'text-orange-500 bg-orange-100 dark:bg-orange-900/20';
      case 'fair': return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20';
      case 'good': return 'text-green-500 bg-green-100 dark:bg-green-900/20';
      default: return 'text-gray-500 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = () => {
    if (!networkStatus.isOnline) return SignalSlashIcon;
    
    switch (connectionQuality) {
      case 'poor': return ExclamationTriangleIcon;
      case 'fair': return SignalIcon;
      case 'good': return WifiIcon;
      default: return WifiIcon;
    }
  };

  const getStatusText = () => {
    if (!networkStatus.isOnline) return 'Offline';
    
    switch (connectionQuality) {
      case 'poor': return 'Poor Connection';
      case 'fair': return 'Fair Connection';
      case 'good': return 'Good Connection';
      default: return 'Online';
    }
  };

  const getTooltipContent = () => {
    if (!networkStatus.isOnline) {
      return 'You are currently offline. Some features may not work.';
    }

    const parts = [];
    if (networkStatus.effectiveType) {
      parts.push(`Connection: ${networkStatus.effectiveType.toUpperCase()}`);
    }
    if (networkStatus.downlink) {
      parts.push(`Speed: ${networkStatus.downlink.toFixed(1)} Mbps`);
    }
    if (networkStatus.rtt) {
      parts.push(`Latency: ${networkStatus.rtt}ms`);
    }
    if (networkStatus.saveData) {
      parts.push('Data Saver: On');
    }

    return parts.length > 0 ? parts.join('\n') : 'Network status available';
  };

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  const StatusIcon = getStatusIcon();

  if (!showDetails && networkStatus.isOnline && connectionQuality === 'good') {
    return null; // Don't show indicator for good connections unless details are requested
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-40 ${className}`}>
      <div
        className={`
          flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border
          ${getStatusColor()}
          transition-all duration-200 cursor-pointer
          ${showTooltip ? 'scale-105' : ''}
        `}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={getTooltipContent()}
      >
        <StatusIcon className="h-4 w-4" />
        
        {showDetails && (
          <span className="text-sm font-medium">
            {getStatusText()}
          </span>
        )}
        
        {/* Connection strength bars for visual indication */}
        {networkStatus.isOnline && (
          <div className="flex items-end gap-0.5 ml-1">
            <div className={`w-1 h-2 rounded-sm ${
              connectionQuality !== 'poor' ? 'bg-current' : 'bg-current opacity-30'
            }`} />
            <div className={`w-1 h-3 rounded-sm ${
              connectionQuality === 'fair' || connectionQuality === 'good' ? 'bg-current' : 'bg-current opacity-30'
            }`} />
            <div className={`w-1 h-4 rounded-sm ${
              connectionQuality === 'good' ? 'bg-current' : 'bg-current opacity-30'
            }`} />
          </div>
        )}
      </div>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg px-3 py-2 whitespace-pre-line shadow-lg z-50 max-w-xs">
          {getTooltipContent()}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-900 dark:border-b-gray-100" />
        </div>
      )}
    </div>
  );
}