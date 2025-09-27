'use client';

import { useState } from 'react';
import { Check, X, Clock } from 'lucide-react';
import { Notification } from '@/types/notifications';

interface NotificationItemProps {
  notification: Notification;
  icon: React.ReactNode;
  priorityColor: string;
}

export default function NotificationItem({ notification, icon, priorityColor }: NotificationItemProps) {
  const [isRead, setIsRead] = useState(notification.is_read);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleMarkAsRead = () => {
    if (!isRead) {
      setIsRead(true);
      // TODO: Call API to mark as read
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // TODO: Call API to dismiss notification
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
    <div className={`p-3 rounded-lg border-l-4 ${priorityColor} ${!isRead ? 'bg-white' : 'bg-gray-50'}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`text-sm font-medium ${!isRead ? 'text-gray-900' : 'text-gray-600'}`}>
              {notification.title}
            </h4>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-400 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {formatTimeAgo(notification.created_at)}
              </span>
            </div>
          </div>
          
          <p className={`text-sm mt-1 ${!isRead ? 'text-gray-700' : 'text-gray-500'}`}>
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
        </div>
        
        <div className="flex-shrink-0 flex items-center space-x-1">
          {!isRead && (
            <button
              onClick={handleMarkAsRead}
              className="p-1 text-gray-400 hover:text-green-600 transition-colors"
              title="Mark as read"
            >
              <Check className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
