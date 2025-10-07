'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Wifi, WifiOff, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import { useWebSocketNotifications } from '@/hooks/useWebSocketNotifications';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';

interface RealTimeNotificationBellProps {
  className?: string;
}

export default function RealTimeNotificationBell({ className = '' }: RealTimeNotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConnectionStatus, setShowConnectionStatus] = useState(false);
  
  const {
    isConnected,
    notifications,
    lastNotification,
    setLastNotification,
    connectionError,
    subscribePattern,
    unsubscribePattern
  } = useWebSocketNotifications();

  // Show Redis status in the UI
  const isRedisAvailable = !connectionError?.includes('Redis') && isConnected;

  // Pattern subscriptions are handled automatically by the WebSocket hook
  // No need for manual subscriptions here to avoid conflicts

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
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
        {/* Connection Status Indicator */}
        <div className="absolute -bottom-1 -right-1">
          {isConnected ? (
            <Wifi className="h-3 w-3 text-green-500" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-500" />
          )}
        </div>
      </Button>

      {/* Connection Status Tooltip */}
      {showConnectionStatus && (
        <div className="absolute top-full right-0 mt-2 p-2 bg-white border rounded shadow-lg z-50">
          <div className="flex items-center space-x-2 text-sm">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-green-600">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="text-red-600">Disconnected</span>
              </>
            )}
          </div>
          {connectionError && (
            <div className="text-xs text-red-500 mt-1">{connectionError}</div>
          )}
        </div>
      )}

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Real-time Notifications</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConnectionStatus(!showConnectionStatus)}
                  >
                    {isConnected ? (
                      <Wifi className="h-4 w-4 text-green-500" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-500" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                {isConnected && isRedisAvailable
                  ? 'Live notifications'
                  : isConnected
                    ? 'Connected (Redis unavailable - database-only mode)'
                    : 'Connection lost - notifications will be delivered when reconnected'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>
                    {isConnected && !isRedisAvailable
                      ? 'No notifications yet (Redis unavailable)'
                      : 'No notifications yet'
                    }
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {isConnected && !isRedisAvailable
                      ? 'Notifications are saved to database but real-time delivery is disabled'
                      : 'Notifications will appear here when received'
                    }
                  </p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b last:border-b-0 hover:bg-gray-50 ${
                        !notification.data?.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-1 rounded-full ${getPriorityColor(notification.priority)}`}>
                          {getPriorityIcon(notification.priority)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {notification.title}
                            </h4>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          {notification.sender && (
                            <p className="text-xs text-gray-500 mt-1">
                              From: {notification.sender.name} ({notification.sender.role})
                            </p>
                          )}
                          {notification.data && Object.keys(notification.data).length > 0 && (
                            <div className="mt-2 text-xs text-gray-500">
                              <details>
                                <summary className="cursor-pointer">Details</summary>
                                <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(notification.data, null, 2)}
                                </pre>
                              </details>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Last Notification Toast */}
      {lastNotification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right">
          <Card className={`w-80 ${getPriorityColor(lastNotification.priority)}`}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                {getPriorityIcon(lastNotification.priority)}
                <div className="flex-1">
                  <h4 className="font-medium">{lastNotification.title}</h4>
                  <p className="text-sm mt-1">{lastNotification.message}</p>
                  <p className="text-xs mt-1 opacity-75">
                    {formatDistanceToNow(new Date(lastNotification.timestamp), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLastNotification(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
