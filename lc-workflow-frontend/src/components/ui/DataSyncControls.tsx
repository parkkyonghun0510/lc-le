/**
 * Data Synchronization Controls Component
 * 
 * Provides UI controls for manual refresh, data verification,
 * and real-time update status.
 */

import React, { useState } from 'react';
import { 
  useManualRefresh, 
  useDataVerification, 
  useForceSystemRefresh,
  useSyncStatus,
  useRealtimeUpdates
} from '@/hooks/useDataSync';

interface DataSyncControlsProps {
  applicationId?: string;
  showAdvancedControls?: boolean;
  compact?: boolean;
  className?: string;
}

interface SyncStatusIndicatorProps {
  status: 'healthy' | 'warning' | 'critical' | 'error';
  issueCount?: number;
  className?: string;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ 
  status, 
  issueCount = 0, 
  className = '' 
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      case 'error': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'healthy': return 'Healthy';
      case 'warning': return `Warning (${issueCount} issues)`;
      case 'critical': return `Critical (${issueCount} issues)`;
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()} ${className}`}>
      <div className={`w-2 h-2 rounded-full mr-2 ${status === 'healthy' ? 'bg-green-500' : status === 'warning' ? 'bg-yellow-500' : status === 'critical' ? 'bg-red-500' : 'bg-gray-500'}`} />
      {getStatusText()}
    </div>
  );
};

interface RealtimeStatusProps {
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastUpdate?: any;
  className?: string;
}

const RealtimeStatus: React.FC<RealtimeStatusProps> = ({ 
  connectionStatus, 
  lastUpdate, 
  className = '' 
}) => {
  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'disconnected': return 'text-gray-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Live';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Offline';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`flex items-center text-xs ${className}`}>
      <div className={`w-2 h-2 rounded-full mr-2 ${connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'}`} />
      <span className={getConnectionColor()}>
        {getConnectionText()}
      </span>
      {lastUpdate && connectionStatus === 'connected' && (
        <span className="ml-2 text-gray-500">
          Last: {new Date(lastUpdate.timestamp).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

export const DataSyncControls: React.FC<DataSyncControlsProps> = ({
  applicationId,
  showAdvancedControls = false,
  compact = false,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  // Hooks
  const manualRefresh = useManualRefresh();
  const dataVerification = useDataVerification();
  const forceSystemRefresh = useForceSystemRefresh();
  const { data: syncStatus, isLoading: syncStatusLoading } = useSyncStatus();
  const { connectionStatus, lastUpdate } = useRealtimeUpdates(
    ['files', 'folders', 'applications'],
    applicationId ? [applicationId] : undefined,
    true
  );

  // Handlers
  const handleRefreshFiles = () => {
    manualRefresh.mutate({
      scopes: ['files'],
      application_id: applicationId,
      force_full_refresh: false
    });
  };

  const handleRefreshFolders = () => {
    manualRefresh.mutate({
      scopes: ['folders'],
      application_id: applicationId,
      force_full_refresh: false
    });
  };

  const handleRefreshAll = () => {
    const scopes = applicationId 
      ? ['files', 'folders', 'applications']
      : ['files', 'folders', 'applications', 'customers'];
    
    manualRefresh.mutate({
      scopes,
      application_id: applicationId,
      force_full_refresh: true
    });
  };

  const handleVerifyData = () => {
    dataVerification.mutate({
      scopes: ['files', 'folders'],
      application_id: applicationId,
      auto_fix: false
    });
  };

  const handleVerifyAndFix = () => {
    dataVerification.mutate({
      scopes: ['files', 'folders'],
      application_id: applicationId,
      auto_fix: true
    });
  };

  const handleForceSystemRefresh = () => {
    if (confirm('This will refresh all system data. Continue?')) {
      forceSystemRefresh.mutate();
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {/* Sync Status */}
        {syncStatus && (
          <SyncStatusIndicator 
            status={syncStatus.status} 
            issueCount={syncStatus.total_issues}
          />
        )}
        
        {/* Real-time Status */}
        <RealtimeStatus 
          connectionStatus={connectionStatus}
          lastUpdate={lastUpdate}
        />
        
        {/* Quick Refresh Button */}
        <button
          onClick={handleRefreshAll}
          disabled={manualRefresh.isPending}
          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
          title="Refresh all data"
        >
          {manualRefresh.isPending ? '⟳' : '↻'}
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Data Synchronization</h3>
        <div className="flex items-center space-x-3">
          {syncStatus && (
            <SyncStatusIndicator 
              status={syncStatus.status} 
              issueCount={syncStatus.total_issues}
            />
          )}
          <RealtimeStatus 
            connectionStatus={connectionStatus}
            lastUpdate={lastUpdate}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <button
          onClick={handleRefreshFiles}
          disabled={manualRefresh.isPending}
          className="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {manualRefresh.isPending ? 'Refreshing...' : 'Refresh Files'}
        </button>
        
        <button
          onClick={handleRefreshFolders}
          disabled={manualRefresh.isPending}
          className="px-3 py-2 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {manualRefresh.isPending ? 'Refreshing...' : 'Refresh Folders'}
        </button>
        
        <button
          onClick={handleRefreshAll}
          disabled={manualRefresh.isPending}
          className="px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {manualRefresh.isPending ? 'Refreshing...' : 'Refresh All'}
        </button>
        
        <button
          onClick={handleVerifyData}
          disabled={dataVerification.isPending}
          className="px-3 py-2 text-sm bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {dataVerification.isPending ? 'Verifying...' : 'Verify Data'}
        </button>
      </div>

      {/* Advanced Controls */}
      {showAdvancedControls && (
        <div className="border-t pt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-gray-600 hover:text-gray-800 mb-3"
          >
            {showDetails ? '▼' : '▶'} Advanced Controls
          </button>
          
          {showDetails && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button
                  onClick={handleVerifyAndFix}
                  disabled={dataVerification.isPending}
                  className="px-3 py-2 text-sm bg-orange-50 text-orange-700 rounded hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {dataVerification.isPending ? 'Processing...' : 'Verify & Auto-Fix'}
                </button>
                
                <button
                  onClick={handleForceSystemRefresh}
                  disabled={forceSystemRefresh.isPending}
                  className="px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {forceSystemRefresh.isPending ? 'Refreshing...' : 'Force System Refresh'}
                </button>
              </div>
              
              {/* Sync Status Details */}
              {syncStatus && syncStatus.total_issues > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Data Issues Detected</h4>
                  <div className="text-xs text-yellow-700 space-y-1">
                    <div>Total Issues: {syncStatus.total_issues}</div>
                    <div>Critical Issues: {syncStatus.critical_issues}</div>
                    <div>Real-time Connections: {syncStatus.realtime_connections}</div>
                  </div>
                </div>
              )}
              
              {/* Last Update Info */}
              {lastUpdate && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Last Real-time Update</h4>
                  <div className="text-xs text-blue-700 space-y-1">
                    <div>Type: {lastUpdate.type}</div>
                    <div>Entity: {lastUpdate.entity_type} ({lastUpdate.entity_id})</div>
                    <div>Time: {new Date(lastUpdate.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataSyncControls;