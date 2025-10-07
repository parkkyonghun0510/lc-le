'use client';

import { useState } from 'react';
import { Check, X, Clock } from 'lucide-react';
import { Notification } from '@/types/notifications';
import { useMarkNotificationAsRead, useDismissNotification } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  icon: React.ReactNode;
  priorityColor: string;
}

export default function NotificationItem({ notification, icon, priorityColor }: NotificationItemProps) {
  const [isRead, setIsRead] = useState(notification.is_read);
  const [isDismissed, setIsDismissed] = useState(notification.is_dismissed || false);
  
  const markAsRead = useMarkNotificationAsRead();
  const dismissNotification = useDismissNotification();

  const handleMarkAsRead = async () => {
    if (!isRead) {
      try {
        await markAsRead.mutateAsync(notification.id);
        setIsRead(true);
      } catch (error) {
        // Error is handled by the hook
      }
    }
  };

  const handleDismiss = async () => {
    try {
      await dismissNotification.mutateAsync(notification.id);
      setIsDismissed(true);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  if (isDismissed) {
    return null;
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className={`p-4 rounded-xl border-l-4 ${priorityColor} ${!isRead ? 'bg-white shadow-sm border border-gray-100' : 'bg-gray-50'} hover:shadow-md transition-all duration-200 group`}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 mt-1">
          <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
            {icon}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h4 className={`text-sm font-semibold leading-5 ${!isRead ? 'text-gray-900' : 'text-gray-600'}`}>
              {notification.title}
            </h4>
            <div className="flex items-center space-x-2 ml-2">
              <span className="text-xs text-gray-400 flex items-center bg-gray-100 px-2 py-1 rounded-full">
                <Clock className="h-3 w-3 mr-1" />
                {formatTimeAgo(notification.created_at)}
              </span>
            </div>
          </div>
          
          <p className={`text-sm leading-5 mb-3 ${!isRead ? 'text-gray-700' : 'text-gray-500'}`}>
            {notification.message}
          </p>
          
          {notification.data && Object.keys(notification.data).length > 0 && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-600 space-y-1">
                {Object.entries(notification.data).map(([key, value]) => (
                  <div key={key} className="flex items-center">
                    <span className="font-medium capitalize text-gray-700 min-w-0 flex-shrink-0 mr-2">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="text-gray-600 truncate">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-shrink-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {!isRead && (
            <button
              onClick={handleMarkAsRead}
              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
              title="Mark as read"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
