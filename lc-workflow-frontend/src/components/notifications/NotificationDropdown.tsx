'use client';

import { useState } from 'react';
import { X, Settings, Check, AlertCircle, Info, Clock, User, Users, FileText, Shield, Wrench, Bell } from 'lucide-react';
import { NotificationSummary, NotificationType, NotificationPriority } from '@/types/notifications';
import NotificationItem from './NotificationItem';
import NotificationPreferences from './NotificationPreferences';

interface NotificationDropdownProps {
  onClose: () => void;
  summary?: NotificationSummary;
  isLoading: boolean;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
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
    default:
      return <Info className="h-4 w-4 text-gray-600" />;
  }
};

const getPriorityColor = (priority: NotificationPriority) => {
  switch (priority) {
    case NotificationPriority.URGENT:
      return 'border-l-red-500 bg-red-50';
    case NotificationPriority.HIGH:
      return 'border-l-orange-500 bg-orange-50';
    case NotificationPriority.NORMAL:
      return 'border-l-blue-500 bg-blue-50';
    case NotificationPriority.LOW:
      return 'border-l-gray-500 bg-gray-50';
    default:
      return 'border-l-gray-500 bg-gray-50';
  }
};

export default function NotificationDropdown({ onClose, summary, isLoading }: NotificationDropdownProps) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'preferences'>('notifications');

  if (isLoading) {
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

  const recentNotifications = summary?.recent_notifications || [];

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          {summary?.unread_count && summary.unread_count > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
              {summary.unread_count}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('preferences')}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Notification Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'notifications'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Notifications
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'preferences'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {activeTab === 'notifications' ? (
          <div className="p-4">
            {recentNotifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No notifications yet</p>
                <p className="text-sm text-gray-400">You'll see notifications here when they arrive</p>
              </div>
            ) : (
              <div className="space-y-2">
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
          <div className="p-4">
            <NotificationPreferences />
          </div>
        )}
      </div>

      {/* Footer */}
      {activeTab === 'notifications' && recentNotifications.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <button className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium">
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
