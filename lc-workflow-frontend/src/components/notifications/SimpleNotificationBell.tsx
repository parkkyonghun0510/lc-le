'use client';

import { useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { useNotificationSummary } from '@/hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';

interface SimpleNotificationBellProps {
  className?: string;
}

export default function SimpleNotificationBell({ className = '' }: SimpleNotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: summary, isLoading, error } = useNotificationSummary();

  const unreadCount = summary?.unread_count || 0;
  const hasUnread = unreadCount > 0;

  // Debug logging
  console.log('🔔 SimpleNotificationBell:', {
    summary,
    unreadCount,
    hasUnread,
    isLoading,
    error
  });

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
        title={`${unreadCount} unread notifications`}
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

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute -bottom-8 left-0 text-xs text-gray-500 bg-white p-1 rounded shadow">
          {isLoading ? 'Loading...' : `${unreadCount} unread`}
        </div>
      )}
    </div>
  );
}
