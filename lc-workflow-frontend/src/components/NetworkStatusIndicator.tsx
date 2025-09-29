'use client';

import React from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';

interface NetworkStatusIndicatorProps {
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  showDetails = false,
  compact = false,
  className = '',
}) => {
  const networkStatus = useNetworkStatus();

  const getStatusColor = () => {
    if (!networkStatus.isOnline) return 'bg-red-500';
    if (networkStatus.isSlowConnection) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!networkStatus.isOnline) return 'Offline';
    if (networkStatus.isSlowConnection) return 'Slow';
    return 'Online';
  };

  const getConnectionIcon = () => {
    if (!networkStatus.isOnline) return '🔴';
    if (networkStatus.isSlowConnection) return '🟡';
    return '🟢';
  };

  if (compact) {
    return (
      <Tooltip content={
        <div className="text-sm">
          <div>Status: {getStatusText()}</div>
          <div>Quality: {networkStatus.connectionQuality}</div>
          {networkStatus.effectiveType && <div>Type: {networkStatus.effectiveType}</div>}
          {networkStatus.rtt && <div>RTT: {networkStatus.rtt}ms</div>}
        </div>
      }>
        <div className={`flex items-center space-x-2 px-2 py-1 rounded ${className}`}>
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
      </Tooltip>
    );
  }

  if (showDetails) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getConnectionIcon()}</span>
            <span className="font-medium">Network Status</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={networkStatus.refreshStatus}
          >
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Status:</span> {getStatusText()}
          </div>
          <div>
            <span className="font-medium">Quality:</span> {networkStatus.connectionQuality}
          </div>

          {networkStatus.connectionType && (
            <div>
              <span className="font-medium">Type:</span> {networkStatus.connectionType}
            </div>
          )}

          {networkStatus.effectiveType && (
            <div>
              <span className="font-medium">Effective:</span> {networkStatus.effectiveType}
            </div>
          )}

          {networkStatus.downlink && (
            <div>
              <span className="font-medium">Downlink:</span> {networkStatus.downlink} Mbps
            </div>
          )}

          {networkStatus.rtt && (
            <div>
              <span className="font-medium">RTT:</span> {networkStatus.rtt}ms
            </div>
          )}

          {networkStatus.lastOnline && (
            <div>
              <span className="font-medium">Last Online:</span> {networkStatus.lastOnline.toLocaleTimeString()}
            </div>
          )}

          {networkStatus.lastOffline && (
            <div>
              <span className="font-medium">Last Offline:</span> {networkStatus.lastOffline.toLocaleTimeString()}
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${className}`}>
      <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
      <div className="flex flex-col">
        <span className="text-sm font-medium">{getStatusText()}</span>
        {networkStatus.connectionQuality !== 'unknown' && (
          <span className="text-xs text-gray-500">{networkStatus.connectionQuality}</span>
        )}
      </div>
    </div>
  );
};