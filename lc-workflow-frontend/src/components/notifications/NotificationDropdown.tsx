'use client';

import { useState } from 'react';
import { X, Settings, Check, AlertCircle, Info, Clock, User, Users, FileText, Shield, Wrench, Bell, CheckCheck } from 'lucide-react';
import { NotificationSummary, NotificationType, NotificationPriority } from '@/types/notifications';
import NotificationItem from './NotificationItem';
import NotificationPreferences from './NotificationPreferences';
import { useMarkAllAsRead } from '@/hooks/useNotifications';
import { useRealTimeNotifications } from '@/hooks/useNotifications';

interface NotificationDropdownProps {
  onClose: () => void;
  summary?: NotificationSummary;
  isLoading: boolean;
}

const getNotificationIcon = (type: string) => {
  // Handle both enum types and dynamic API types
  switch (type) {
    // Predefined enum types
    case NotificationType.USER_WELCOME:
    case NotificationType.ONBOARDING_COMPLETE:
      return <User className="h-4 w-4 text-green-600" />;
    case NotificationType.STATUS_CHANGE:
    case NotificationType.ONBOARDING_REMINDER:
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    case NotificationType.MANAGER_TEAM_CHANGE:
    case NotificationType.BULK_OPERATION_COMPLETE:
      return <Users className="h-4 w-4 text-blue-600" />;
    case NotificationType.SYSTEM_MAINTENANCE:
      return <Wrench className="h-4 w-4 text-gray-600" />;
    case NotificationType.PASSWORD_EXPIRY:
    case NotificationType.ACCOUNT_LOCKED:
      return <Shield className="h-4 w-4 text-red-600" />;
    case NotificationType.OFFBOARDING_INITIATED:
      return <FileText className="h-4 w-4 text-orange-600" />;
    
    // Dynamic API types
    case 'system_test':
    case 'test_notification':
      return <Wrench className="h-4 w-4 text-blue-600" />;
    case 'test_redis_unavailable':
      return <AlertCircle className="h-4 w-4 text-orange-600" />;
    
    // Default fallback
    default:
      return <Info className="h-4 w-4 text-gray-600" />;
  }
};

const getPriorityColor = (priority: string) => {
  // Handle both enum priorities and dynamic API priorities
  switch (priority) {
    // Predefined enum priorities
    case NotificationPriority.URGENT:
    case 'urgent':
      return 'border-l-red-500 bg-red-50';
    case NotificationPriority.HIGH:
    case 'high':
      return 'border-l-orange-500 bg-orange-50';
    case NotificationPriority.NORMAL:
    case 'normal':
      return 'border-l-blue-500 bg-blue-50';
    case NotificationPriority.LOW:
    case 'low':
      return 'border-l-gray-500 bg-gray-50';
    default:
      return 'border-l-gray-500 bg-gray-50';
  }
};

export default function NotificationDropdown({ onClose, summary, isLoading }: NotificationDropdownProps) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'preferences'>('notifications');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Use API summary data for notifications
  const markAllAsRead = useMarkAllAsRead();
  const { isConnected } = useRealTimeNotifications();

  // Get notifications from API summary data
  const notifications = summary?.recent_notifications || [];

  // Filter notifications based on unread status if needed
  const filteredNotifications = showUnreadOnly
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const notificationsLoading = isLoading;

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead.mutateAsync();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  if (isLoading || notificationsLoading) {
    return (
      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
        <div className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  const recentNotifications = filteredNotifications.slice(0, 20); // Show last 20 notifications

  return (
    <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Bell className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
            {summary && summary.unread_count > 0 && (
              <p className="text-sm text-gray-600">
                {summary.unread_count} unread notification{summary.unread_count !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {recentNotifications.length > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={markAllAsRead.isPending}
              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 disabled:opacity-50"
              title="Mark all as read"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setActiveTab('preferences')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
            title="Notification Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-50">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'notifications'
              ? 'text-blue-600 bg-white border-b-2 border-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
            {summary && summary.unread_count > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {summary.unread_count}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'preferences'
              ? 'text-blue-600 bg-white border-b-2 border-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </div>
        </button>
      </div>

      {/* Filter Controls */}
      {activeTab === 'notifications' && (
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm text-gray-700 cursor-pointer group">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3 group-hover:border-blue-400 transition-colors"
              />
              <span className="group-hover:text-gray-900 transition-colors">Show unread only</span>
            </label>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-500">
                {summary ? `${summary.total_notifications} total` : `${filteredNotifications.length} total`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {activeTab === 'notifications' ? (
          <div className="p-6">
            {recentNotifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-8 w-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No notifications yet</h4>
                <p className="text-gray-500 mb-4">
                  {isConnected
                    ? "Real-time notifications will appear here when received"
                    : "Notifications are loaded from the server"
                  }
                </p>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Live updates enabled</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recentNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    icon={getNotificationIcon(notification.type)}
                    priorityColor={getPriorityColor(notification.priority)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6">
            <NotificationPreferences />
          </div>
        )}
      </div>

      {/* Footer */}
      {activeTab === 'notifications' && recentNotifications.length > 0 && (
        <div className="p-6 bg-gray-50 border-t border-gray-100">
          <button className="w-full py-3 px-4 text-center text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-semibold rounded-lg transition-all duration-200 border border-blue-200 hover:border-blue-300">
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
