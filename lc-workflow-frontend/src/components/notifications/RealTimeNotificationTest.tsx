'use client';

import { useState, useEffect } from 'react';
import { Bell, Wifi, WifiOff, AlertCircle, CheckCircle, Clock, X, Send, Zap } from 'lucide-react';
import { useWebSocketNotifications } from '@/hooks/useWebSocketNotifications';
import { useSendRealTimeNotification } from '@/hooks/useNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';

export default function RealTimeNotificationTest() {
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [testMessage, setTestMessage] = useState('Test real-time notification');
  
  const {
    isConnected,
    notifications,
    lastNotification,
    setLastNotification,
    connectionError,
    subscribePattern,
    unsubscribePattern,
    sendMessage
  } = useWebSocketNotifications();

  const sendRealTimeNotification = useSendRealTimeNotification();

  // Test sending a real-time notification
  const handleSendTestNotification = async () => {
    try {
      await sendRealTimeNotification.mutateAsync({
        user_id: 'test-user',
        notification_type: 'system_test',
        title: 'Real-time Test',
        message: testMessage,
        priority: 'normal',
        data: { test: true, timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  };

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

  const unreadCount = notifications.filter(n => !n.data?.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-6 w-6" />
              <span>Real-time Notifications Test</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                isConnected 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <h3 className="font-semibold text-green-900">Live Notifications</h3>
              <p className="text-2xl font-bold text-green-600">{notifications.length}</p>
              <p className="text-xs text-green-600">
                {unreadCount} unread
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-900">Last Notification</h3>
              <p className="text-sm text-purple-600">
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
                <h4 className="font-medium text-gray-900 mb-2">Connection Details</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>WebSocket Status:</strong> {isConnected ? 'Open' : 'Closed'}</p>
                  <p><strong>Connection Error:</strong> {connectionError || 'None'}</p>
                  <p><strong>Notifications Count:</strong> {notifications.length}</p>
                  <p><strong>Last Notification ID:</strong> {lastNotification?.id || 'None'}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Environment Variables</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>NEXT_PUBLIC_API_URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'Not set'}</p>
                  <p><strong>NEXT_PUBLIC_WS_URL:</strong> {process.env.NEXT_PUBLIC_WS_URL || 'Not set'}</p>
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
            {/* Send Test Notification */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Test message..."
              />
              <Button
                onClick={handleSendTestNotification}
                disabled={sendRealTimeNotification.isPending}
                className="flex items-center space-x-1"
              >
                <Send className="h-4 w-4" />
                <span>Send Test</span>
              </Button>
            </div>

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
          </div>
        </CardContent>
      </Card>

      {/* Live Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Live Notifications ({notifications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No live notifications yet</p>
              <p className="text-sm">Try sending a test notification or wait for real-time updates</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
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
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
