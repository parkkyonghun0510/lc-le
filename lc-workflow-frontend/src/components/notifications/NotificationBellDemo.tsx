'use client';

import { useState } from 'react';
import { Bell, BellRing, Eye, EyeOff } from 'lucide-react';
import { useNotificationSummary } from '@/hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';

interface NotificationBellDemoProps {
  className?: string;
}

export default function NotificationBellDemo({ className = '' }: NotificationBellDemoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const { data: summary, isLoading, error } = useNotificationSummary();

  const unreadCount = summary?.unread_count || 0;
  const hasUnread = unreadCount > 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Debug Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">Notification Bell Demo</h3>
          <button
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Toggle debug info"
          >
            {showDebugInfo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="text-sm text-gray-500">
          {isLoading ? 'Loading...' : error ? 'Error' : 'Ready'}
        </div>
      </div>

      {/* Debug Information */}
      {showDebugInfo && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Debug Information</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
            <p><strong>Error:</strong> {error ? 'Yes' : 'No'}</p>
            <p><strong>Summary Data:</strong> {summary ? 'Available' : 'Not available'}</p>
            {summary && (
              <>
                <p><strong>Total Notifications:</strong> {summary.total_notifications}</p>
                <p><strong>Unread Count:</strong> {summary.unread_count}</p>
                <p><strong>Recent Notifications:</strong> {summary.recent_notifications?.length || 0}</p>
                <p><strong>By Type:</strong> {JSON.stringify(summary.by_type)}</p>
                <p><strong>By Priority:</strong> {JSON.stringify(summary.by_priority)}</p>
              </>
            )}
            {error && (
              <p><strong>Error Details:</strong> {JSON.stringify(error, null, 2)}</p>
            )}
          </div>
        </div>
      )}

      {/* Notification Bell */}
      <div className="flex items-center justify-center p-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Notifications"
          >
            {hasUnread ? (
              <BellRing className="h-6 w-6 text-blue-600" />
            ) : (
              <Bell className="h-6 w-6" />
            )}
            
            {hasUnread && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {isOpen && (
            <NotificationDropdown
              onClose={() => setIsOpen(false)}
              summary={summary}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>

      {/* What Users Will See */}
      <div className="p-4 bg-green-50 rounded-lg">
        <h4 className="font-medium text-green-900 mb-2">What Users Will See:</h4>
        <div className="text-sm text-green-800 space-y-2">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${hasUnread ? 'bg-red-500' : 'bg-gray-300'}`}></div>
            <span>
              <strong>Bell Icon:</strong> {hasUnread ? 'BellRing (animated)' : 'Bell (static)'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${hasUnread ? 'bg-red-500' : 'bg-gray-300'}`}></div>
            <span>
              <strong>Badge Count:</strong> {hasUnread ? `${unreadCount} unread notifications` : 'No badge'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>
              <strong>Dropdown Content:</strong> {summary?.recent_notifications?.length || 0} recent notifications
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>
              <strong>Connection Status:</strong> Real-time or API mode indicator
            </span>
          </div>
        </div>
      </div>

      {/* Notification Types Preview */}
      {summary?.recent_notifications && summary.recent_notifications.length > 0 && (
        <div className="p-4 bg-yellow-50 rounded-lg">
          <h4 className="font-medium text-yellow-900 mb-2">Notification Types Preview:</h4>
          <div className="space-y-2">
            {summary.recent_notifications.slice(0, 3).map((notification, index) => (
              <div key={notification.id} className="text-sm text-yellow-800 p-2 bg-white rounded border">
                <div className="flex items-center justify-between">
                  <span><strong>#{index + 1}:</strong> {notification.title}</span>
                  <span className="text-xs px-2 py-1 bg-yellow-200 rounded">
                    {notification.type}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Priority: {notification.priority} | Read: {notification.is_read ? 'Yes' : 'No'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
