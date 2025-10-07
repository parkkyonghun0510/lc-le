'use client';

import { useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { useNotificationSummary } from '@/hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = '' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: summary, isLoading } = useNotificationSummary();

  const unreadCount = summary?.unread_count || 0;
  const hasUnread = unreadCount > 0;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all duration-200 group"
        aria-label={`Notifications ${hasUnread ? `(${unreadCount} unread)` : ''}`}
        title={`${unreadCount} unread notifications`}
      >
        <div className="relative">
          {hasUnread ? (
            <BellRing className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform duration-200" />
          ) : (
            <Bell className="h-6 w-6 group-hover:scale-110 transition-transform duration-200" />
          )}
          
          {hasUnread && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-semibold shadow-lg animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <NotificationDropdown
          onClose={() => setIsOpen(false)}
          summary={summary}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
