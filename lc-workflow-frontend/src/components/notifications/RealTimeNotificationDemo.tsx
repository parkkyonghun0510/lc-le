'use client';

import { useState, useEffect } from 'react';
import { Bell, Wifi, WifiOff, AlertCircle, CheckCircle, Clock, Send, Zap, RefreshCw } from 'lucide-react';
import { useWebSocketNotifications } from '@/hooks/useWebSocketNotifications';
import { useNotificationSummary } from '@/hooks/useNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';

export default function RealTimeNotificationDemo() {
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [testMessage, setTestMessage] = useState('Test real-time notification');
  
  const {
    isConnected,
    notifications: realTimeNotifications,
    lastNotification,
    connectionError,
    subscribePattern,
    unsubscribePattern,
    sendMessage
  } = useWebSocketNotifications();

  const { data: summary, isLoading: summaryLoading } = useNotificationSummary();

  // Test WebSocket message sending
  const handleSendWebSocketMessage = () => {
    sendMessage({
      type: 'test_message',
      message: 'Hello from frontend!',
      timestamp: new Date().toISOString()
    });
  };

  // Test pattern subscription
  const handleSubscribeToPattern = () => {
    subscribePattern('test-pattern');
  };

  const handleUnsubscribeFromPattern = () => {
    unsubscribePattern('test-pattern');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'normal':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="h-4 w-4" />;
      case 'high':
        return <AlertCircle className="h-4 w-4" />;
      case 'normal':
        return <CheckCircle className="h-4 w-4" />;
      case 'low':
        return <Clock className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const realTimeUnreadCount = realTimeNotifications.filter(n => !n.data?.read).length;
  const apiUnreadCount = summary?.unread_count || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-6 w-6" />
              <span>Real-time Notifications Demo</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                isConnected 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                <span>{isConnected ? 'Real-time' : 'API Mode'}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDebugInfo(!showDebugInfo)}
              >
                {showDebugInfo ? 'Hide' : 'Show'} Debug
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900">Connection Status</h3>
              <p className="text-2xl font-bold text-blue-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </p>
              {connectionError && (
                <p className="text-xs text-red-600 mt-1">{connectionError}</p>
              )}
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-900">Real-time Notifications</h3>
              <p className="text-2xl font-bold text-green-600">{realTimeNotifications.length}</p>
              <p className="text-xs text-green-600">
                {realTimeUnreadCount} unread
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-900">API Notifications</h3>
              <p className="text-2xl font-bold text-purple-600">{summary?.total_notifications || 0}</p>
              <p className="text-xs text-purple-600">
                {apiUnreadCount} unread
              </p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold text-yellow-900">Last Real-time</h3>
              <p className="text-sm text-yellow-600">
                {lastNotification ? formatDistanceToNow(new Date(lastNotification.timestamp), { addSuffix: true }) : 'None'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Information */}
      {showDebugInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">WebSocket Connection</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Status:</strong> {isConnected ? 'Connected' : 'Disconnected'}</p>
                  <p><strong>Error:</strong> {connectionError || 'None'}</p>
                  <p><strong>Real-time Notifications:</strong> {realTimeNotifications.length}</p>
                  <p><strong>Last Notification ID:</strong> {lastNotification?.id || 'None'}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">API Data</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Total Notifications:</strong> {summary?.total_notifications || 0}</p>
                  <p><strong>Unread Count:</strong> {summary?.unread_count || 0}</p>
                  <p><strong>Recent Notifications:</strong> {summary?.recent_notifications?.length || 0}</p>
                  <p><strong>Loading:</strong> {summaryLoading ? 'Yes' : 'No'}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Environment</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'Not set'}</p>
                  <p><strong>WS URL:</strong> {process.env.NEXT_PUBLIC_WS_URL || 'Not set'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Test Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* WebSocket Message Test */}
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleSendWebSocketMessage}
                variant="outline"
                className="flex items-center space-x-1"
              >
                <Zap className="h-4 w-4" />
                <span>Send WS Message</span>
              </Button>
            </div>

            {/* Pattern Subscription Test */}
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleSubscribeToPattern}
                variant="outline"
                className="flex items-center space-x-1"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Subscribe to Test Pattern</span>
              </Button>
              <Button
                onClick={handleUnsubscribeFromPattern}
                variant="outline"
                className="flex items-center space-x-1"
              >
                <X className="h-4 w-4" />
                <span>Unsubscribe</span>
              </Button>
            </div>

            {/* Refresh API Data */}
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="flex items-center space-x-1"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh Page</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Real-time Notifications ({realTimeNotifications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {realTimeNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No real-time notifications yet</p>
              <p className="text-sm">
                {isConnected 
                  ? "WebSocket connected but no notifications received"
                  : "WebSocket disconnected - using API data only"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {realTimeNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border-l-4 ${getPriorityColor(notification.priority)} ${
                    !notification.data?.read ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getPriorityIcon(notification.priority)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-medium ${!notification.data?.read ? 'text-gray-900' : 'text-gray-600'}`}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-400 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      
                      <p className={`text-sm mt-1 ${!notification.data?.read ? 'text-gray-700' : 'text-gray-500'}`}>
                        {notification.message}
                      </p>
                      
                      {notification.data && Object.keys(notification.data).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          {Object.entries(notification.data).map(([key, value]) => (
                            <div key={key} className="flex">
                              <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                              <span className="ml-1">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="mt-2 text-xs text-gray-400">
                        <span className="px-2 py-1 bg-gray-100 rounded mr-2">
                          {notification.type}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 rounded">
                          {notification.priority}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded ml-2">
                          Real-time
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Notifications Summary */}
      <Card>
        <CardHeader>
          <CardTitle>API Notifications Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {summaryLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : summary ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900">Total</h4>
                  <p className="text-2xl font-bold text-blue-600">{summary.total_notifications}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <h4 className="font-semibold text-red-900">Unread</h4>
                  <p className="text-2xl font-bold text-red-600">{summary.unread_count}</p>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                <p><strong>By Type:</strong> {JSON.stringify(summary.by_type)}</p>
                <p><strong>By Priority:</strong> {JSON.stringify(summary.by_priority)}</p>
                <p><strong>Recent Count:</strong> {summary.recent_notifications?.length || 0}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No API data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
